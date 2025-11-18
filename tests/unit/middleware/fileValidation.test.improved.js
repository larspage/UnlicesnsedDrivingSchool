/**
 * File Validation Middleware Tests - IMPROVED VERSION
 * 
 * This version follows the philosophy that negative tests should verify:
 * 1. That an error occurred (success: false)
 * 2. That meaningful error information is present
 * 3. NOT which specific error code was returned
 */

const {
  validateFileUpload,
  validateFileId,
  validateReportId,
  validateStatusUpdate,
  handleFileErrors
} = require('../../../server/middleware/fileValidation');

describe('File Validation Middleware - Improved Testing Philosophy', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('validateFileUpload', () => {
    beforeEach(() => {
      req.body = {};
      req.files = [];
    });

    test('should call next() for valid upload request - positive test', async () => {
      req.body.reportId = 'rep_abc123';
      req.files = [
        {
          buffer: Buffer.from('test file content'),
          originalname: 'test.jpg',
          size: 1024,
          mimetype: 'image/jpeg'
        }
      ];

      // Mock the fileService.validateFileUpload to return valid
      const fileService = require('../../../server/services/fileService');
      fileService.validateFileUpload = jest.fn().mockResolvedValue({ isValid: true });

      await validateFileUpload(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('should return 400 if reportId is missing - focus on error behavior', async () => {
      await validateFileUpload(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'reportId is required for file upload',
        details: { field: 'reportId' }
      });
      expect(next).not.toHaveBeenCalled();
      // Don't check specific error codes
    });

    test('should return 400 if reportId format is invalid - focus on error behavior', async () => {
      req.body.reportId = 'invalid_format';

      await validateFileUpload(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid reportId format. Must match pattern: rep_XXXXXX',
        details: { field: 'reportId' }
      });
      expect(next).not.toHaveBeenCalled();
      // Don't check specific error codes
    });

    test('should return 400 if no files are provided - focus on error behavior', async () => {
      req.body.reportId = 'rep_abc123';

      await validateFileUpload(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No files provided for upload',
        details: { field: 'files' }
      });
      expect(next).not.toHaveBeenCalled();
      // Don't check specific error codes
    });

    test('should return 400 if file validation fails - focus on error behavior', async () => {
      req.body.reportId = 'rep_abc123';
      req.files = [
        {
          buffer: Buffer.from('test file content'),
          originalname: 'test.jpg',
          size: 1024,
          mimetype: 'image/jpeg'
        }
      ];

      // Mock the fileService.validateFileUpload to return invalid
      const fileService = require('../../../server/services/fileService');
      fileService.validateFileUpload = jest.fn().mockResolvedValue({
        isValid: false,
        error: 'File too large'
      });

      await validateFileUpload(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'File "test.jpg": File too large',
        details: { file: 'test.jpg' }
      });
      expect(next).not.toHaveBeenCalled();
      // Don't check specific error codes
    });

    test('should handle validation errors gracefully - focus on error behavior', async () => {
      req.body.reportId = 'rep_abc123';
      req.files = [
        {
          buffer: Buffer.from('test file content'),
          originalname: 'test.jpg',
          size: 1024,
          mimetype: 'image/jpeg'
        }
      ];

      // Mock the fileService.validateFileUpload to throw an error
      const fileService = require('../../../server/services/fileService');
      fileService.validateFileUpload = jest.fn().mockRejectedValue(new Error('Validation error'));

      await validateFileUpload(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'File upload validation failed',
        details: 'Validation error'
      });
      expect(next).not.toHaveBeenCalled();
      // Don't check specific error codes
    });
  });

  describe('validateFileId', () => {
    test('should call next() for valid file ID - positive test', () => {
      req.params = { id: 'file_abc123' };

      validateFileId(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 400 if file ID is missing - focus on error behavior', () => {
      req.params = {};

      validateFileId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'File ID is required',
        details: { field: 'id' }
      });
      expect(next).not.toHaveBeenCalled();
      // Don't check specific error codes
    });

    test('should return 400 if file ID format is invalid - focus on error behavior', () => {
      req.params = { id: 'invalid_format' };

      validateFileId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid file ID format. Must match pattern: file_XXXXXX',
        details: { field: 'id' }
      });
      expect(next).not.toHaveBeenCalled();
      // Don't check specific error codes
    });
  });

  describe('validateReportId', () => {
    test('should call next() for valid report ID - positive test', () => {
      req.params = { reportId: 'rep_abc123' };

      validateReportId(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 400 if report ID is missing - focus on error behavior', () => {
      req.params = {};

      validateReportId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Report ID is required',
        details: { field: 'reportId' }
      });
      expect(next).not.toHaveBeenCalled();
      // Don't check specific error codes
    });

    test('should return 400 if report ID format is invalid - focus on error behavior', () => {
      req.params = { reportId: 'invalid_format' };

      validateReportId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid report ID format. Must match pattern: rep_XXXXXX',
        details: { field: 'reportId' }
      });
      expect(next).not.toHaveBeenCalled();
      // Don't check specific error codes
    });
  });

  describe('validateStatusUpdate', () => {
    test('should call next() for valid status - positive test', () => {
      req.body = { status: 'completed' };

      validateStatusUpdate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 400 if status is missing - focus on error behavior', () => {
      req.body = {};

      validateStatusUpdate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Status is required for update',
        details: { field: 'status' }
      });
      expect(next).not.toHaveBeenCalled();
      // Don't check specific error codes
    });

    test('should return 400 if status is invalid - focus on error behavior', () => {
      req.body = { status: 'invalid_status' };

      validateStatusUpdate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid status. Must be one of: pending, processing, completed, failed',
        details: { field: 'status' }
      });
      expect(next).not.toHaveBeenCalled();
      // Don't check specific error codes
    });
  });

  describe('handleFileErrors', () => {
    it('should handle LIMIT_FILE_SIZE error - focus on error transformation', () => {
      const error = { code: 'LIMIT_FILE_SIZE' };
      const next = jest.fn();

      handleFileErrors(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File too large. Maximum size is 10MB per file.',
          details: undefined
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle LIMIT_FILE_COUNT error - focus on error transformation', () => {
      const error = { code: 'LIMIT_FILE_COUNT' };
      const next = jest.fn();

      handleFileErrors(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Too many files. Maximum 10 files per upload.',
          details: undefined
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle LIMIT_UNEXPECTED_FILE error - focus on error transformation', () => {
      const error = { code: 'LIMIT_UNEXPECTED_FILE' };
      const next = jest.fn();

      handleFileErrors(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Unexpected file field in upload request.',
          details: undefined
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle validation errors - focus on error transformation', () => {
      const error = { message: 'validation failed' };
      const next = jest.fn();

      handleFileErrors(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File upload validation failed',
          details: { reason: 'validation failed' }
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle Google Drive API errors - focus on error transformation', () => {
      const error = { code: 403 };
      const next = jest.fn();

      handleFileErrors(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'File storage service temporarily unavailable. Please try again later.',
          details: undefined
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle rate limit errors - focus on error transformation', () => {
      const error = { code: 429 };
      const next = jest.fn();

      handleFileErrors(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'RATE_LIMIT_ERROR',
          message: 'File storage service rate limit exceeded. Please try again later.',
          details: undefined
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle generic errors - focus on error transformation', () => {
      const error = { message: 'Something went wrong' };
      const next = jest.fn();

      handleFileErrors(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'FILE_SYSTEM_ERROR',
          message: 'File operation failed',
          details: { message: 'Something went wrong' }
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});