/**
 * File Service Tests for NJDSC School Compliance Portal
 *
 * Tests for file service business logic and operations.
 */

const fileService = require('../../../server/services/fileService');
const File = require('../../../server/models/File');
const googleDriveService = require('../../../server/services/googleDriveService');
const googleSheetsService = require('../../../server/services/googleSheetsService');
const configService = require('../../../server/services/configService');

// Mock dependencies
jest.mock('../../../server/models/File');
jest.mock('../../../server/services/googleDriveService');
jest.mock('../../../server/services/googleSheetsService');
jest.mock('../../../server/services/configService');

describe('File Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test_spreadsheet_id';

    // Mock all the service functions
    fileService.getFilesByReportId = jest.fn();
    fileService.getAllFiles = jest.fn();
    fileService.validateFileUpload = jest.fn();
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
      fileService.getFilesByReportId.mockResolvedValue([]);
      googleDriveService.uploadFile.mockResolvedValue(mockDriveFile);
      File.create.mockReturnValue(mockFile);
      googleSheetsService.appendRow.mockResolvedValue(undefined);

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
      expect(fileService.getFilesByReportId).toHaveBeenCalledWith(mockReportId);
      expect(googleDriveService.uploadFile).toHaveBeenCalledWith(
        mockFileBuffer,
        mockFileName,
        mockMimeType
      );
      expect(File.create).toHaveBeenCalled();
      expect(mockFile.validateBusinessRules).toHaveBeenCalled();
      expect(googleSheetsService.appendRow).toHaveBeenCalled();
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

    it('should throw error when Google Drive upload fails', async () => {
      File.validateUploadParams.mockReturnValue({ isValid: true });
      fileService.getFilesByReportId.mockResolvedValue([]);
      googleDriveService.uploadFile.mockRejectedValue(new Error('Drive upload failed'));

      await expect(fileService.uploadFile(
        mockFileBuffer,
        mockFileName,
        mockMimeType,
        mockReportId
      )).rejects.toThrow('Drive upload failed');
    });

    it('should throw error when business rules validation fails', async () => {
      File.validateUploadParams.mockReturnValue({ isValid: true });
      fileService.getFilesByReportId.mockResolvedValue([]);
      googleDriveService.uploadFile.mockResolvedValue(mockDriveFile);
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
      const mockFile = { id: 'file_abc123', name: 'test.jpg' };
      fileService.getAllFiles.mockResolvedValue([mockFile]);

      const result = await fileService.getFileById('file_abc123');

      expect(fileService.getAllFiles).toHaveBeenCalled();
      expect(result).toBe(mockFile);
    });

    it('should return null when file not found', async () => {
      fileService.getAllFiles.mockResolvedValue([]);

      const result = await fileService.getFileById('file_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getFilesByReportId', () => {
    it('should return files for report', async () => {
      const mockFiles = [
        { id: 'file_1', reportId: 'rep_abc123' },
        { id: 'file_2', reportId: 'rep_abc123' },
        { id: 'file_3', reportId: 'rep_def456' }
      ];
      fileService.getAllFiles.mockResolvedValue(mockFiles);

      const result = await fileService.getFilesByReportId('rep_abc123');

      expect(fileService.getAllFiles).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].reportId).toBe('rep_abc123');
      expect(result[1].reportId).toBe('rep_abc123');
    });
  });

  describe('updateFileProcessingStatus', () => {
    it('should update file status successfully', async () => {
      const existingFile = {
        id: 'file_abc123',
        updateProcessingStatus: jest.fn().mockReturnValue({
          id: 'file_abc123',
          processingStatus: 'completed'
        })
      };
      const updatedFile = { id: 'file_abc123', processingStatus: 'completed' };

      fileService.getAllFiles.mockResolvedValue([existingFile]);
      existingFile.updateProcessingStatus.mockReturnValue(updatedFile);
      googleSheetsService.updateRow.mockResolvedValue(undefined);

      const result = await fileService.updateFileProcessingStatus('file_abc123', 'completed');

      expect(fileService.getAllFiles).toHaveBeenCalled();
      expect(existingFile.updateProcessingStatus).toHaveBeenCalledWith('completed');
      expect(googleSheetsService.updateRow).toHaveBeenCalled();
      expect(result).toBe(updatedFile);
    });

    it('should throw error when file not found', async () => {
      fileService.getAllFiles.mockResolvedValue([]);

      await expect(fileService.updateFileProcessingStatus('file_nonexistent', 'completed'))
        .rejects.toThrow('File with ID file_nonexistent not found');
    });
  });

  describe('validateFileUpload', () => {
    beforeEach(() => {
      fileService.getFilesByReportId.mockResolvedValue([]);
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
      const existingFiles = Array(10).fill({ reportId: 'rep_abc123' });
      fileService.getFilesByReportId.mockResolvedValue(existingFiles);
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