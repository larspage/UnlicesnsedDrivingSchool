/**
 * File Service Tests for NJDSC School Compliance Portal
 *
 * Tests for file service business logic and operations.
 */

const fileService = require('../../../server/services/fileService');
const File = require('../../../server/models/File');
const localJsonService = require('../../../server/services/localJsonService');
const localFileService = require('../../../server/services/localFileService');
const configService = require('../../../server/services/configService');

// Mock dependencies
jest.mock('../../../server/models/File');
jest.mock('../../../server/services/localJsonService');
jest.mock('../../../server/services/localFileService');
jest.mock('../../../server/services/configService');

// Set up File mock to return proper instances
const MockFile = function(data) {
  Object.assign(this, data);
  this.updateProcessingStatus = jest.fn().mockReturnValue({ ...data, processingStatus: 'completed' });
  this.validateBusinessRules = jest.fn();
};

File.mockImplementation((data) => {
  return new MockFile(data);
});

describe('File Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock local services to return empty array by default
    localJsonService.getAllRows.mockResolvedValue([]);
  });

  describe('uploadFile', () => {
    const mockFileBuffer = Buffer.from('test file content');
    const mockFileName = 'test.jpg';
    const mockMimeType = 'image/jpeg';
    const mockReportId = 'rep_abc123';
    const mockUploadedByIp = '192.168.1.100';

    const mockDriveFile = {
      id: 'drive_file_123',
      mimeType: 'image/jpeg'
    };

    const mockFile = {
      id: 'file_xyz789',
      reportId: mockReportId,
      originalName: mockFileName,
      mimeType: mockMimeType,
      size: mockFileBuffer.length,
      driveFileId: mockDriveFile.id,
      driveUrl: 'https://drive.google.com/uc?export=download&id=drive_file_123',
      thumbnailUrl: 'https://drive.google.com/thumbnail?id=drive_file_123&sz=s400',
      uploadedAt: '2024-01-01T00:00:00.000Z',
      uploadedByIp: mockUploadedByIp,
      processingStatus: 'pending',
      validateBusinessRules: jest.fn(),
      toSheetsRow: jest.fn().mockReturnValue([
        'file_xyz789', mockReportId, mockFileName, mockMimeType,
        mockFileBuffer.length, mockDriveFile.id,
        'https://drive.google.com/uc?export=download&id=drive_file_123',
        'https://drive.google.com/thumbnail?id=drive_file_123&sz=s400',
        '2024-01-01T00:00:00.000Z', mockUploadedByIp, 'pending'
      ])
    };

    it('should upload file successfully', async () => {
      // Mock dependencies
      File.validateUploadParams.mockReturnValue({ isValid: true });
      localJsonService.getAllRows.mockResolvedValue([]); // Mock empty files list
      localFileService.uploadFile.mockResolvedValue(mockDriveFile);
      File.create.mockReturnValue(mockFile);
      localJsonService.appendRow.mockResolvedValue(undefined);

      const result = await fileService.uploadFile(
        mockFileBuffer,
        mockFileName,
        mockMimeType,
        mockReportId,
        mockUploadedByIp
      );

      expect(File.validateUploadParams).toHaveBeenCalledWith(
        mockFileBuffer,
        mockFileName,
        mockMimeType,
        mockReportId
      );
      expect(localJsonService.getAllRows).toHaveBeenCalledWith(null, 'files');
      expect(localFileService.uploadFile).toHaveBeenCalledWith(
        mockFileBuffer,
        mockFileName,
        mockMimeType,
        mockReportId
      );
      expect(File.create).toHaveBeenCalled();
      expect(mockFile.validateBusinessRules).toHaveBeenCalled();
      expect(localJsonService.appendRow).toHaveBeenCalled();
      expect(result).toBe(mockFile);
    });

    it('should throw error for invalid upload parameters', async () => {
      File.validateUploadParams.mockReturnValue({
        isValid: false,
        error: 'Invalid file buffer'
      });

      await expect(fileService.uploadFile(
        mockFileBuffer,
        mockFileName,
        mockMimeType,
        mockReportId
      )).rejects.toThrow('Invalid file buffer');
    });

    it('should throw error when local file upload fails', async () => {
      File.validateUploadParams.mockReturnValue({ isValid: true });
      localJsonService.getAllRows.mockResolvedValue([]);
      localFileService.uploadFile.mockRejectedValue(new Error('Local file upload failed'));

      await expect(fileService.uploadFile(
        mockFileBuffer,
        mockFileName,
        mockMimeType,
        mockReportId
      )).rejects.toThrow('Local file upload failed');
    });

    it('should throw error when business rules validation fails', async () => {
      File.validateUploadParams.mockReturnValue({ isValid: true });
      localJsonService.getAllRows.mockResolvedValue([]);
      localFileService.uploadFile.mockResolvedValue(mockDriveFile);
      File.create.mockReturnValue(mockFile);
      mockFile.validateBusinessRules.mockImplementation(() => {
        throw new Error('Maximum 10 files allowed per report');
      });

      await expect(fileService.uploadFile(
        mockFileBuffer,
        mockFileName,
        mockMimeType,
        mockReportId
      )).rejects.toThrow('Maximum 10 files allowed per report');
    });
  });

  describe('getFileById', () => {
    it('should return file when found', async () => {
      const mockFileData = {
        id: 'file_abc123',
        reportId: 'rep_def456',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        localPath: '/uploads/test.jpg',
        url: '/uploads/test.jpg',
        uploadedAt: '2025-09-26T21:25:00.000Z',
        processingStatus: 'completed'
      };
      localJsonService.getAllRows.mockResolvedValue([mockFileData]);

      const result = await fileService.getFileById('file_abc123');

      expect(localJsonService.getAllRows).toHaveBeenCalledWith(null, 'files');
      expect(result).toHaveProperty('id', 'file_abc123');
      expect(result).toHaveProperty('originalName');
    });

    it('should return null when file not found', async () => {
      localJsonService.getAllRows.mockResolvedValue([]);

      const result = await fileService.getFileById('file_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getFilesByReportId', () => {
    it('should return files for report', async () => {
      const mockFilesData = [
        {
          id: 'file_1',
          reportId: 'rep_abc123',
          originalName: 'test1.jpg',
          mimeType: 'image/jpeg',
          size: 1024000,
          localPath: '/uploads/test1.jpg',
          url: '/uploads/test1.jpg',
          uploadedAt: '2025-09-26T21:25:00.000Z',
          processingStatus: 'completed'
        },
        {
          id: 'file_2',
          reportId: 'rep_abc123',
          originalName: 'test2.jpg',
          mimeType: 'image/jpeg',
          size: 2048000,
          localPath: '/uploads/test2.jpg',
          url: '/uploads/test2.jpg',
          uploadedAt: '2025-09-26T21:25:00.000Z',
          processingStatus: 'completed'
        },
        {
          id: 'file_3',
          reportId: 'rep_def456',
          originalName: 'test3.jpg',
          mimeType: 'image/jpeg',
          size: 3072000,
          localPath: '/uploads/test3.jpg',
          url: '/uploads/test3.jpg',
          uploadedAt: '2025-09-26T21:25:00.000Z',
          processingStatus: 'completed'
        }
      ];
      localJsonService.getAllRows.mockResolvedValue(mockFilesData);

      const result = await fileService.getFilesByReportId('rep_abc123');

      expect(localJsonService.getAllRows).toHaveBeenCalledWith(null, 'files');
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('reportId', 'rep_abc123');
      expect(result[1]).toHaveProperty('reportId', 'rep_abc123');
    });
  });

  describe('updateFileProcessingStatus', () => {
    it('should update file status successfully', async () => {
      const existingFileData = {
        id: 'file_abc123',
        reportId: 'rep_def456',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        localPath: '/uploads/test.jpg',
        url: '/uploads/test.jpg',
        uploadedAt: '2025-09-26T21:25:00.000Z',
        processingStatus: 'pending'
      };

      localJsonService.getAllRows.mockResolvedValue([existingFileData]);
      localJsonService.updateRow.mockResolvedValue(undefined);

      const result = await fileService.updateFileProcessingStatus('file_abc123', 'completed');

      expect(localJsonService.getAllRows).toHaveBeenCalledWith(null, 'files');
      expect(localJsonService.updateRow).toHaveBeenCalledWith(null, 'files', 'file_abc123', expect.any(Object));
      expect(result).toHaveProperty('processingStatus', 'completed');
    });

    it('should throw error when file not found', async () => {
      localJsonService.getAllRows.mockResolvedValue([]);

      await expect(fileService.updateFileProcessingStatus('file_nonexistent', 'completed'))
        .rejects.toThrow('File with ID file_nonexistent not found');
    });
  });

  describe('validateFileUpload', () => {
    beforeEach(() => {
      localJsonService.getAllRows.mockResolvedValue([]);
    });

    it('should return valid for correct file', async () => {
      configService.getConfig.mockResolvedValue(null);
      File.getMaxFileSize.mockReturnValue(10 * 1024 * 1024);
      File.getSupportedMimeTypes.mockReturnValue({
        images: ['image/jpeg'],
        videos: ['video/mp4'],
        documents: ['application/pdf']
      });

      const result = await fileService.validateFileUpload('rep_abc123', 1024, 'image/jpeg');

      expect(result.isValid).toBe(true);
      expect(configService.getConfig).toHaveBeenCalledWith('system.maxFileSize');
      expect(configService.getConfig).toHaveBeenCalledWith('system.maxFilesPerReport');
    });

    it('should return invalid for oversized file', async () => {
      configService.getConfig.mockResolvedValue(1024); // 1KB limit
      File.getMaxFileSize.mockReturnValue(10 * 1024 * 1024);

      const result = await fileService.validateFileUpload('rep_abc123', 2048, 'image/jpeg');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should return invalid for unsupported file type', async () => {
      configService.getConfig.mockResolvedValue(null);
      File.getMaxFileSize.mockReturnValue(10 * 1024 * 1024);
      File.getSupportedMimeTypes.mockReturnValue({
        images: ['image/jpeg'],
        videos: ['video/mp4'],
        documents: ['application/pdf']
      });

      const result = await fileService.validateFileUpload('rep_abc123', 1024, 'application/exe');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported file type');
    });

    it('should return invalid when too many files for report', async () => {
      const existingFilesData = Array(10).fill({
        id: 'file_xyz',
        reportId: 'rep_abc123',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        localPath: '/uploads/test.jpg',
        url: '/uploads/test.jpg',
        uploadedAt: '2025-09-26T21:25:00.000Z',
        processingStatus: 'completed'
      });
      localJsonService.getAllRows.mockResolvedValue(existingFilesData);
      configService.getConfig.mockResolvedValue(null);

      const result = await fileService.validateFileUpload('rep_abc123', 1024, 'image/jpeg');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Maximum 10 files allowed per report');
    });
  });

  describe('processBase64File', () => {
    it('should process base64 data without prefix', () => {
      const base64Data = 'SGVsbG8gV29ybGQ='; // "Hello World" in base64
      const result = fileService.processBase64File(base64Data, 'test.txt', 'text/plain');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('Hello World');
    });

    it('should process base64 data with data URL prefix', () => {
      const base64Data = 'data:text/plain;base64,SGVsbG8gV29ybGQ=';
      const result = fileService.processBase64File(base64Data, 'test.txt', 'text/plain');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('Hello World');
    });

    it('should throw error for invalid base64 data', () => {
      const invalidBase64Data = 'invalid_base64_data!!!';

      expect(() => {
        fileService.processBase64File(invalidBase64Data, 'test.txt', 'text/plain');
      }).toThrow('Invalid base64 data for file test.txt');
    });
  });
});