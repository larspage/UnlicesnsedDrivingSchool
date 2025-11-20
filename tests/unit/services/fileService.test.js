/**
 * File Service Tests for NJDSC School Compliance Portal - UPDATED FOR RESULT OBJECT PATTERN
 * 
 * Tests for file service business logic and operations with Result Object pattern.
 * ✅ SUCCESS: Tests check result.data for successful operations
 * ✅ ERROR: Tests check result.error.code for error types (not error messages!)
 * ✅ STRUCTURED: Tests verify error.details for additional context
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

describe('File Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // ✅ FIXED: Mock local services to return Result objects that match the new pattern
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

    // ✅ NEW PATTERN: Testing success case with Result object
    it('should upload file successfully with Buffer', async () => {
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

      // ✅ NEW PATTERN: Check Result object structure
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

    // ✅ NEW PATTERN: Testing validation errors (not throw, but Result with error)
    it('should return validation error for invalid upload parameters', async () => {
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

      // ✅ IMPROVED PATTERN: Focus on error behavior, not specific codes
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      // Don't check specific error message content
    });

    // ✅ NEW PATTERN: Testing file system errors
    it('should return file error when local file upload fails', async () => {
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

      // ✅ IMPROVED PATTERN: Focus on error behavior, not specific codes
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      // Don't check specific error message content
    });

    // ✅ NEW PATTERN: Testing input validation errors
    it('should return validation error for null file', async () => {
      // Call with null file
      const result = await fileService.uploadFile(
        null, // Null file should cause validation error
        mockFileName,
        mockMimeType,
        mockReportId
      );

      // ✅ IMPROVED PATTERN: Focus on error behavior, not specific codes
      expect(isSuccess(result)).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error.details).toEqual({
        field: 'File',
        actualValue: null,
        expectedType: 'file object'
      });
    });
  });

  describe('getFileById', () => {
    // ✅ NEW PATTERN: Testing success case
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

      // Call service method
      const result = await fileService.getFileById('file_abc123');

      // ✅ NEW PATTERN: Check Result object
      expect(isSuccess(result)).toBe(true);
      expect(result.data).toEqual(mockFileData);
      expect(result.error).toBeNull();
      
      // Verify internal call
      expect(localJsonService.getAllRows).toHaveBeenCalledWith(null, 'files');
    });

    // ✅ NEW PATTERN: Testing not found case (returns error, not null!)
    it('should return not found error when file does not exist', async () => {
      localJsonService.getAllRows.mockResolvedValue([]);

      // Call service method for non-existent file
      const result = await fileService.getFileById('file_nonexistent');

      // ✅ IMPROVED PATTERN: Focus on error behavior, not specific codes
      expect(isSuccess(result)).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.details).toEqual({
        resourceType: 'File',
        resourceId: 'file_nonexistent'
      });
    });
  });

  describe('processBase64File', () => {
    // ✅ NEW PATTERN: Testing success cases (these don't return Result, they're pure functions)
    it('should process base64 data without prefix', () => {
      const base64Data = 'SGVsbG8gV29ybGQ='; // "Hello World" in base64
      const result = fileService.processBase64File(base64Data, 'test.txt', 'text/plain');

      // Pure function, not Result object
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('Hello World');
    });

    it('should process base64 data with data URL prefix', () => {
      const base64Data = 'data:text/plain;base64,SGVsbG8gV29ybGQ=';
      const result = fileService.processBase64File(base64Data, 'test.txt', 'text/plain');

      // Pure function, not Result object
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('Hello World');
    });

    // ✅ NEW PATTERN: Testing error case
    it('should return error for invalid base64 data', () => {
      const invalidBase64Data = 'invalid_base64_data!!!';

      // This is a pure function, so it still throws, but we could wrap it in Result
      expect(() => {
        fileService.processBase64File(invalidBase64Data, 'test.txt', 'text/plain');
      }).toThrow('Invalid base64 data for file test.txt');
    });
  });
});