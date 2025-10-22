/**
 * Unit tests for reportProcessingService
 * Tests queue monitoring, file processing, and report appending
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const reportProcessingService = require('../../../server/services/reportProcessingService');
const localJsonService = require('../../../server/services/localJsonService');

// Mock dependencies
jest.mock('../../../server/services/localJsonService');
jest.mock('fs');
jest.mock('chokidar');

describe('reportProcessingService', () => {
  let mockWatcher;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWatcher = new EventEmitter();
    mockWatcher.close = jest.fn();
  });

  describe('startQueueMonitoring', () => {
    it('should initialize queue directory and start watching', async () => {
      localJsonService.ensureDataDirectory.mockResolvedValue(undefined);
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {});

      const chokidar = require('chokidar');
      chokidar.watch.mockReturnValue(mockWatcher);

      await reportProcessingService.startQueueMonitoring();

      expect(localJsonService.ensureDataDirectory).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('data/queue'),
        { recursive: true }
      );
      expect(chokidar.watch).toHaveBeenCalled();
    });

    it('should handle queue directory creation errors gracefully', async () => {
      localJsonService.ensureDataDirectory.mockResolvedValue(undefined);
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await reportProcessingService.startQueueMonitoring();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create queue directory'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should set up file add listener', async () => {
      localJsonService.ensureDataDirectory.mockResolvedValue(undefined);
      fs.existsSync.mockReturnValue(true);

      const chokidar = require('chokidar');
      chokidar.watch.mockReturnValue(mockWatcher);

      const onSpy = jest.spyOn(mockWatcher, 'on');

      await reportProcessingService.startQueueMonitoring();

      expect(onSpy).toHaveBeenCalledWith('add', expect.any(Function));
    });
  });

  describe('processQueuedReport', () => {
    it('should process valid JSON file and append to reports', async () => {
      const testFilePath = '/data/queue/report_2025-10-22T14-35-00-000Z.json';
      const testReport = {
        schoolName: 'Test School',
        status: 'Added',
        createdAt: new Date().toISOString()
      };

      fs.readFileSync.mockReturnValue(JSON.stringify(testReport));
      fs.unlinkSync.mockImplementation(() => {});
      localJsonService.appendReport.mockResolvedValue(undefined);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await reportProcessingService.processQueuedReport(testFilePath);

      expect(fs.readFileSync).toHaveBeenCalledWith(testFilePath, 'utf8');
      expect(localJsonService.appendReport).toHaveBeenCalledWith(testReport);
      expect(fs.unlinkSync).toHaveBeenCalledWith(testFilePath);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully processed queued report')
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle invalid JSON gracefully', async () => {
      const testFilePath = '/data/queue/invalid.json';

      fs.readFileSync.mockReturnValue('{ invalid json }');
      fs.unlinkSync.mockImplementation(() => {});

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await reportProcessingService.processQueuedReport(testFilePath);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse JSON'),
        expect.any(Error)
      );
      expect(fs.unlinkSync).toHaveBeenCalledWith(testFilePath);

      consoleErrorSpy.mockRestore();
    });

    it('should handle file read errors', async () => {
      const testFilePath = '/data/queue/missing.json';

      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await reportProcessingService.processQueuedReport(testFilePath);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error reading queued report file'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle append errors', async () => {
      const testFilePath = '/data/queue/report.json';
      const testReport = { schoolName: 'Test School' };

      fs.readFileSync.mockReturnValue(JSON.stringify(testReport));
      localJsonService.appendReport.mockRejectedValue(
        new Error('Database error')
      );

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await reportProcessingService.processQueuedReport(testFilePath);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error appending report to reports.json'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should skip non-JSON files', async () => {
      const testFilePath = '/data/queue/readme.txt';

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await reportProcessingService.processQueuedReport(testFilePath);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping non-JSON file')
      );
      expect(fs.readFileSync).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });
  });

  describe('stopQueueMonitoring', () => {
    it('should close the watcher', async () => {
      localJsonService.ensureDataDirectory.mockResolvedValue(undefined);
      fs.existsSync.mockReturnValue(true);

      const chokidar = require('chokidar');
      chokidar.watch.mockReturnValue(mockWatcher);

      await reportProcessingService.startQueueMonitoring();
      await reportProcessingService.stopQueueMonitoring();

      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('should handle stop when not started', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await reportProcessingService.stopQueueMonitoring();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Queue monitoring not active')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue statistics', async () => {
      const mockFiles = ['report1.json', 'report2.json', 'readme.txt'];
      fs.readdirSync.mockReturnValue(mockFiles);
      fs.statSync.mockReturnValue({ size: 1024 });

      const status = reportProcessingService.getQueueStatus();

      expect(status).toHaveProperty('queuePath');
      expect(status).toHaveProperty('fileCount');
      expect(status).toHaveProperty('totalSize');
      expect(status.fileCount).toBe(2); // Only JSON files
      expect(status.totalSize).toBe(2048); // 2 files * 1024 bytes
    });

    it('should handle missing queue directory', () => {
      fs.readdirSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const status = reportProcessingService.getQueueStatus();

      expect(status.fileCount).toBe(0);
      expect(status.totalSize).toBe(0);
    });
  });

  describe('Integration: File watcher events', () => {
    it('should process file when added to queue', async () => {
      localJsonService.ensureDataDirectory.mockResolvedValue(undefined);
      fs.existsSync.mockReturnValue(true);

      const chokidar = require('chokidar');
      chokidar.watch.mockReturnValue(mockWatcher);

      fs.readFileSync.mockReturnValue(
        JSON.stringify({ schoolName: 'Test School' })
      );
      fs.unlinkSync.mockImplementation(() => {});
      localJsonService.appendReport.mockResolvedValue(undefined);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await reportProcessingService.startQueueMonitoring();

      // Simulate file add event
      const addHandler = mockWatcher.listeners('add')[0];
      await addHandler('/data/queue/report.json');

      expect(localJsonService.appendReport).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Successfully processed queued report')
      );

      consoleLogSpy.mockRestore();
    });
  });
});
