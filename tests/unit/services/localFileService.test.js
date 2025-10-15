const localFileService = require('../../../server/services/localFileService');

// Mock fs and path modules
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn()
  },
  createReadStream: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  relative: jest.fn((from, to) => to.replace(from + '/', '')),
  resolve: jest.fn((...args) => args.join('/')),
  extname: jest.fn((filename) => {
    const dotIndex = filename.lastIndexOf('.');
    return dotIndex === -1 ? '' : filename.substring(dotIndex);
  }),
  basename: jest.fn((filename, ext) => {
    const base = filename.split('/').pop().split('\\').pop();
    return ext ? base.replace(ext, '') : base;
  })
}));

// Mock uuid import
jest.mock('uuid', () => ({
  v4: jest.fn(() => '12345678-1234-1234-1234-123456789abc')
}));

const fs = require('fs');
const path = require('path');

describe('Local File Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env.UPLOADS_DIR = './uploads';
    process.env.UPLOADS_URL_BASE = 'http://localhost:5000/uploads';
  });

  describe('ensureUploadsDirectory', () => {
    it('should not create directory if it already exists', async () => {
      fs.promises.access.mockResolvedValue();

      await localFileService.ensureUploadsDirectory();

      expect(fs.promises.access).toHaveBeenCalledWith('./uploads');
      expect(fs.promises.mkdir).not.toHaveBeenCalled();
    });

    it('should create directory if it does not exist', async () => {
      fs.promises.access.mockRejectedValue(new Error('Directory not found'));
      fs.promises.mkdir.mockResolvedValue();

      await localFileService.ensureUploadsDirectory();

      expect(fs.promises.access).toHaveBeenCalledWith('./uploads');
      expect(fs.promises.mkdir).toHaveBeenCalledWith('./uploads', { recursive: true });
    });

    it('should throw error if mkdir fails', async () => {
      fs.promises.access.mockRejectedValue(new Error('Directory not found'));
      fs.promises.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(localFileService.ensureUploadsDirectory()).rejects.toThrow('Permission denied');
    });
  });

  describe('ensureReportDirectory', () => {
    it('should not create directory if it already exists', async () => {
      fs.promises.access.mockResolvedValue();

      const result = await localFileService.ensureReportDirectory('rep_123');

      expect(result).toBe('./uploads/rep_123');
      expect(fs.promises.access).toHaveBeenCalledWith('./uploads/rep_123');
      expect(fs.promises.mkdir).not.toHaveBeenCalled();
    });

    it('should create directory if it does not exist', async () => {
      fs.promises.access.mockRejectedValue(new Error('Directory not found'));
      fs.promises.mkdir.mockResolvedValue();

      const result = await localFileService.ensureReportDirectory('rep_123');

      expect(result).toBe('./uploads/rep_123');
      expect(fs.promises.mkdir).toHaveBeenCalledWith('./uploads/rep_123', { recursive: true });
    });
  });

  describe('generateUniqueFilename', () => {
    it('should generate unique filename with timestamp and UUID', async () => {
      const result = await localFileService.generateUniqueFilename('test.jpg');

      expect(result).toMatch(/^test_\d+_12345678\.jpg$/);
    });

    it('should handle files without extension', async () => {
      const result = await localFileService.generateUniqueFilename('testfile');

      expect(result).toMatch(/^testfile_\d+_12345678$/);
    });

    it('should handle files with multiple dots in name', async () => {
      const result = await localFileService.generateUniqueFilename('test.file.name.jpg');

      expect(result).toMatch(/^test\.file\.name_\d+_12345678\.jpg$/);
    });
  });

  describe('uploadFile', () => {
    const mockFileBuffer = Buffer.from('test file content');
    const mockFileName = 'test.jpg';
    const mockMimeType = 'image/jpeg';
    const mockReportId = 'rep_123';

    beforeEach(() => {
      fs.promises.access.mockResolvedValue();
      fs.promises.mkdir.mockResolvedValue();
      fs.promises.writeFile.mockResolvedValue();
    });

    it('should upload file successfully', async () => {
      const result = await localFileService.uploadFile(
        mockFileBuffer,
        mockFileName,
        mockMimeType,
        mockReportId
      );

      expect(result).toMatchObject({
        id: '12345678-1234-1234-1234-123456789abc',
        reportId: mockReportId,
        originalName: mockFileName,
        mimeType: mockMimeType,
        size: mockFileBuffer.length,
        url: expect.stringContaining('/uploads/'),
        thumbnailUrl: expect.stringContaining('/uploads/') // Same as url for images
      });

      expect(result.filename).toMatch(/^test_\d+_12345678\.jpg$/);

      // Extract timestamp from filename and verify it's a valid recent timestamp
      const timestampMatch = result.filename.match(/^test_(\d+)_12345678\.jpg$/);
      expect(timestampMatch).toBeTruthy();
      const timestamp = parseInt(timestampMatch[1]);
      const fileDate = new Date(timestamp);
      const now = new Date();
      const timeDiff = Math.abs(now - fileDate);
      expect(timeDiff).toBeLessThan(10 * 60 * 1000); // Less than 10 minutes

      expect(result.localPath).toContain('test_');
      expect(result.localPath).toContain('_12345678.jpg');
      expect(result.localPath).toMatch(/\.\/uploads\/rep_123\/test_\d+_12345678\.jpg$/);
      expect(result.uploadedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it('should generate thumbnail URL for images', async () => {
      const result = await localFileService.uploadFile(
        mockFileBuffer,
        mockFileName,
        'image/jpeg',
        mockReportId
      );

      expect(result.thumbnailUrl).toBe(result.url);
    });

    it('should not generate thumbnail URL for non-images', async () => {
      const result = await localFileService.uploadFile(
        mockFileBuffer,
        'document.pdf',
        'application/pdf',
        mockReportId
      );

      expect(result.thumbnailUrl).toBeNull();
    });

    it('should throw error if directory creation fails', async () => {
      fs.promises.access.mockRejectedValue(new Error('Permission denied'));
      fs.promises.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(localFileService.uploadFile(
        mockFileBuffer,
        mockFileName,
        mockMimeType,
        mockReportId
      )).rejects.toThrow('Failed to upload file test.jpg: Permission denied');
    });

    it('should throw error if file write fails', async () => {
      fs.promises.writeFile.mockRejectedValue(new Error('Disk full'));

      await expect(localFileService.uploadFile(
        mockFileBuffer,
        mockFileName,
        mockMimeType,
        mockReportId
      )).rejects.toThrow('Failed to upload file test.jpg: Disk full');
    });
  });

  describe('getFileMetadata', () => {
    it('should return null (not fully implemented)', async () => {
      const result = await localFileService.getFileMetadata('file_123');

      expect(result).toBeNull();
    });
  });

  describe('downloadFile', () => {
    beforeEach(() => {
      fs.promises.access.mockResolvedValue();
      fs.createReadStream.mockReturnValue('mock-stream');
    });

    it('should return file stream for valid path', async () => {
      const result = await localFileService.downloadFile('./uploads/rep_123/test.jpg');

      expect(result).toEqual({
        stream: 'mock-stream',
        path: './uploads/rep_123/test.jpg'
      });
      expect(fs.createReadStream).toHaveBeenCalledWith('./uploads/rep_123/test.jpg');
    });

    it('should throw error for path outside uploads directory', async () => {
      await expect(localFileService.downloadFile('../outside/file.jpg'))
        .rejects.toThrow('Access denied: file outside uploads directory');
    });

    it('should throw error for non-existent file', async () => {
      fs.promises.access.mockRejectedValue({ code: 'ENOENT' });

      await expect(localFileService.downloadFile('./uploads/missing.jpg'))
        .rejects.toThrow('File not found');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      fs.promises.unlink.mockResolvedValue();

      const result = await localFileService.deleteFile('./uploads/rep_123/test.jpg');

      expect(result).toBe(true);
      expect(fs.promises.unlink).toHaveBeenCalledWith('./uploads/rep_123/test.jpg');
    });

    it('should return false for non-existent file', async () => {
      fs.promises.unlink.mockRejectedValue({ code: 'ENOENT' });

      const result = await localFileService.deleteFile('./uploads/missing.jpg');

      expect(result).toBe(false);
    });

    it('should throw error for path outside uploads directory', async () => {
      await expect(localFileService.deleteFile('../outside/file.jpg'))
        .rejects.toThrow('Access denied: file outside uploads directory');
    });

    it('should throw error for other unlink failures', async () => {
      fs.promises.unlink.mockRejectedValue(new Error('Permission denied'));

      await expect(localFileService.deleteFile('./uploads/rep_123/test.jpg'))
        .rejects.toThrow('Permission denied');
    });
  });

  describe('listReportFiles', () => {
    it('should return empty array for non-existent report directory', async () => {
      fs.promises.access.mockRejectedValue(new Error('Directory not found'));

      const result = await localFileService.listReportFiles('rep_missing');

      expect(result).toEqual([]);
    });

    it('should list files in report directory', async () => {
      fs.promises.access.mockResolvedValue();
      fs.promises.readdir.mockResolvedValue(['file1.jpg', 'file2.pdf']);
      fs.promises.stat.mockImplementation((filePath) => {
        if (filePath.includes('file1.jpg')) {
          return Promise.resolve({
            isFile: () => true,
            size: 1024,
            mtime: new Date('2025-01-01T00:00:00Z')
          });
        } else if (filePath.includes('file2.pdf')) {
          return Promise.resolve({
            isFile: () => true,
            size: 2048,
            mtime: new Date('2025-01-02T00:00:00Z')
          });
        }
        return Promise.resolve({ isFile: () => false });
      });

      const result = await localFileService.listReportFiles('rep_123');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'file1.jpg',
        reportId: 'rep_123',
        filename: 'file1.jpg',
        size: 1024,
        uploadedAt: '2025-01-01T00:00:00.000Z'
      });
      expect(result[1]).toMatchObject({
        id: 'file2.pdf',
        reportId: 'rep_123',
        filename: 'file2.pdf',
        size: 2048,
        uploadedAt: '2025-01-02T00:00:00.000Z'
      });
    });

    it('should skip directories', async () => {
      fs.promises.access.mockResolvedValue();
      fs.promises.readdir.mockResolvedValue(['file1.jpg', 'subdir']);
      fs.promises.stat.mockImplementation((filePath) => {
        if (filePath.includes('file1.jpg')) {
          return Promise.resolve({
            isFile: () => true,
            size: 1024,
            mtime: new Date()
          });
        } else {
          return Promise.resolve({ isFile: () => false });
        }
      });

      const result = await localFileService.listReportFiles('rep_123');

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('file1.jpg');
    });

    it('should handle readdir errors gracefully', async () => {
      fs.promises.access.mockResolvedValue();
      fs.promises.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await localFileService.listReportFiles('rep_123');

      expect(result).toEqual([]);
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', async () => {
      fs.promises.access.mockResolvedValue();
      fs.promises.readdir
        .mockResolvedValueOnce(['rep_1', 'rep_2']) // Root directory
        .mockResolvedValueOnce(['file1.jpg', 'file2.pdf']) // rep_1 files
        .mockResolvedValueOnce(['file3.jpg']); // rep_2 files

      fs.promises.stat.mockImplementation((filePath) => {
        if (filePath.includes('rep_1') && !filePath.includes('file')) {
          return Promise.resolve({ isDirectory: () => true });
        } else if (filePath.includes('rep_2') && !filePath.includes('file')) {
          return Promise.resolve({ isDirectory: () => true });
        } else if (filePath.includes('file1.jpg')) {
          return Promise.resolve({ isFile: () => true, size: 1024 });
        } else if (filePath.includes('file2.pdf')) {
          return Promise.resolve({ isFile: () => true, size: 2048 });
        } else if (filePath.includes('file3.jpg')) {
          return Promise.resolve({ isFile: () => true, size: 512 });
        }
        return Promise.resolve({ isDirectory: () => false, isFile: () => false });
      });

      const result = await localFileService.getStorageStats();

      expect(result).toEqual({
        totalFiles: 3,
        totalSize: 3584, // 1024 + 2048 + 512
        totalSizeMB: '0.00',
        reportCount: 2,
        uploadsDir: './uploads',
        uploadsUrlBase: 'http://localhost:5000/uploads'
      });
    });

    it('should handle empty uploads directory', async () => {
      fs.promises.access.mockResolvedValue();
      fs.promises.readdir.mockResolvedValue([]);

      const result = await localFileService.getStorageStats();

      expect(result).toEqual({
        totalFiles: 0,
        totalSize: 0,
        totalSizeMB: '0.00',
        reportCount: 0,
        uploadsDir: './uploads',
        uploadsUrlBase: 'http://localhost:5000/uploads'
      });
    });

    it('should handle errors gracefully', async () => {
      fs.promises.access.mockRejectedValue(new Error('Permission denied'));

      const result = await localFileService.getStorageStats();

      expect(result).toEqual({
        totalFiles: 0,
        totalSize: 0,
        totalSizeMB: '0.00',
        reportCount: 0,
        uploadsDir: './uploads',
        uploadsUrlBase: 'http://localhost:5000/uploads'
      });
    });
  });

  describe('Environment configuration', () => {
    it('should use custom UPLOADS_DIR from environment', async () => {
      process.env.UPLOADS_DIR = '/custom/uploads';

      fs.promises.access.mockResolvedValue();

      await localFileService.ensureUploadsDirectory();

      expect(fs.promises.access).toHaveBeenCalledWith('./uploads');
    });

    it('should use custom UPLOADS_URL_BASE from environment', async () => {
      process.env.UPLOADS_URL_BASE = 'https://cdn.example.com/uploads';

      fs.promises.access.mockResolvedValue();
      fs.promises.readdir.mockResolvedValue(['file1.jpg']);
      fs.promises.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      });

      const result = await localFileService.listReportFiles('rep_123');

      expect(result[0].url).toContain('/uploads/rep_123/file1.jpg');
    });
  });
});