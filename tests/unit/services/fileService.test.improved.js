/**
 * File Service Tests - IMPROVED VERSION
 * 
 * This version follows the philosophy that negative tests should verify:
 * 1. That an error occurred (success: false) 
 * 2. That meaningful error information is present
 * 3. NOT which specific error code was returned
 * 
 * This makes tests more resilient to implementation changes.
 */

const fileService = require('../../../server/services/fileService');
const File = require('../../../server/models/File');
const localJsonService = require('../../../server/services/localJsonService');
const localFileService = require('../../../server/services/localFileService');
const configService = require('../../../server/services/configService');
const { isSuccess, isFailure } = require('../../../server/utils/result');
const { ERROR_CODES } = require('../../../server/utils/errorCodes');

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

describe('File Service - Improved Testing Philosophy', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock local services to return proper Result objects
    const emptyResult = { success: true, data: [], error: null };
    localJsonService.getAllRows.mockResolvedValue(emptyResult);
    localJsonService.appendRow.mockResolvedValue(emptyResult);
    localJsonService.updateRow.mockResolvedValue(emptyResult);
    localJsonService.deleteRow.mockResolvedValue({ success: true, data: true, error: null });
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

    // Multer-like file object with buffer
    const mockMulterFile = {
      buffer: mockFileBuffer,
      originalname: mockFileName,
      mimetype: mockMimeType,
      size: mockFileBuffer.length
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

    test('should upload file successfully with Buffer - positive test', async () => {
      // Mock dependencies with proper Result objects
      File.validateUploadParams.mockReturnValue({ isValid: true });
      localFileService.ensureUploadsDirectory.mockResolvedValue(undefined);
      localFileService.uploadFile.mockResolvedValue(mockDriveFile);
      File.create.mockReturnValue(mockFile);

      // Call service method
      const result = await fileService.uploadFile(
        mockFileBuffer,
        mockFileName,
        mockMimeType,
        mockReportId,
        mockUploadedByIp
      );

      // ✅ POSITIVE TEST: Check success behavior
      expect(isSuccess(result)).toBe(true);
      expect(isFailure(result)).toBe(false);
      expect(result.data).toBe(mockFile);
      expect(result.error).toBeNull();

      // Verify internal calls
      expect(File.validateUploadParams).toHaveBeenCalledWith(
        mockFileBuffer,
        mockFileName,
        mockMimeType,
        mockReportId
      );
      expect(localFileService.ensureUploadsDirectory).toHaveBeenCalled();
      expect(localFileService.uploadFile).toHaveBeenCalledWith(
        mockFileBuffer,
        mockFileName,
        mockMimeType,
        mockReportId
      );
      expect(File.create).toHaveBeenCalled();
      expect(mockFile.validateBusinessRules).toHaveBeenCalled();
    });

    test('should return validation error for invalid upload parameters - focus on error behavior', async () => {
      // Mock validation to fail
      File.validateUploadParams.mockReturnValue({
        isValid: false,
        error: 'Invalid file buffer'
      });

      // Call service method
      const result = await fileService.uploadFile(
        mockFileBuffer,
        mockFileName,
        mockMimeType,
        mockReportId
      );

      // ✅ IMPROVED PATTERN: Check error Result object (NOT specific error codes!)
      expect(isSuccess(result)).toBe(false);
      expect(isFailure(result)).toBe(true);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Invalid file buffer');
      expect(result.error.details).toEqual({
        fileName: mockFileName,
        mimeType: mockMimeType,
        reportId: mockReportId
      });
      // DON'T check specific error code - let implementation decide
    });

    test('should return file error when local file upload fails - focus on error occurrence', async () => {
      // Mock validation to pass
      File.validateUploadParams.mockReturnValue({ isValid: true });
      localJsonService.getAllRows.mockResolvedValue([]);
      localFileService.ensureUploadsDirectory.mockResolvedValue(undefined);
      
      // Mock file system failure
      const systemError = new Error('Permission denied');
      localFileService.uploadFile.mockRejectedValue(systemError);

      // Call service method
      const result = await fileService.uploadFile(
        mockFileBuffer,
        mockFileName,
        mockMimeType,
        mockReportId
      );

      // ✅ IMPROVED PATTERN: Check for error behavior, not specific error code
      expect(isSuccess(result)).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Permission denied');
      // Don't check specific error code
    });

    test('should return validation error for null file - focus on validation failure', async () => {
      // Call with null file
      const result = await fileService.uploadFile(
        null, // Null file should cause validation error
        mockFileName,
        mockMimeType,
        mockReportId
      );

      // ✅ IMPROVED PATTERN: Check for structured validation error, not specific code
      expect(isSuccess(result)).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error.details).toEqual({
        field: 'File',
        actualValue: null,
        expectedType: 'file object'
      });
      // Don't check specific error code
    });
  });

  describe('getFileById', () => {
    test('should return file when found - positive test', async () => {
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

      // Call service method
      const result = await fileService.getFileById('file_abc123');

      // ✅ POSITIVE TEST: Check Result object
      expect(isSuccess(result)).toBe(true);
      expect(result.data).toEqual(mockFileData);
      expect(result.error).toBeNull();
      
      // Verify internal call
      expect(localJsonService.getAllRows).toHaveBeenCalledWith(null, 'files');
    });

    test('should return error when file does not exist - focus on error behavior', async () => {
      localJsonService.getAllRows.mockResolvedValue([]);

      // Call service method for non-existent file
      const result = await fileService.getFileById('file_nonexistent');

      // ✅ IMPROVED PATTERN: Check for error behavior (NOT specific error code!)
      expect(isSuccess(result)).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('File file_nonexistent not found');
      // Don't check specific error code
    });
  });

  describe('processBase64File', () => {
    test('should process base64 data without prefix - positive test', () => {
      const base64Data = 'SGVsbG8gV29ybGQ='; // "Hello World" in base64
      const result = fileService.processBase64File(base64Data, 'test.txt', 'text/plain');

      // Pure function, not Result object
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('Hello World');
    });

    test('should process base64 data with data URL prefix - positive test', () => {
      const base64Data = 'data:text/plain;base64,SGVsbG8gV29ybGQ=';
      const result = fileService.processBase64File(base64Data, 'test.txt', 'text/plain');

      // Pure function, not Result object
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('Hello World');
    });

    test('should return error for invalid base64 data - focus on error behavior', () => {
      const invalidBase64Data = 'invalid_base64_data!!!';

      // This is a pure function, so it still throws, but that's expected behavior
      expect(() => {
        fileService.processBase64File(invalidBase64Data, 'test.txt', 'text/plain');
      }).toThrow('Invalid base64 data for file test.txt');
    });
  });
});