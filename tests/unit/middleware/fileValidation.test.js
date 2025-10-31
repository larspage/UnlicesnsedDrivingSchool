/**
 * File Validation Middleware Tests for NJDSC School Compliance Portal
 *
 * Tests for file validation and error handling middleware.
 */

const {
  validateFileUpload,
  validateFileId,
  validateReportId,
  validateStatusUpdate,
  handleFileErrors
} = require('../../../server/middleware/fileValidation');

describe('File Validation Middleware', () => {
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

    it('should call next() for valid upload request', async () => {
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

    it('should return 400 if reportId is missing', async () => {
      await validateFileUpload(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'reportId is required for file upload'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if reportId format is invalid', async () => {
      req.body.reportId = 'invalid_format';

      await validateFileUpload(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid reportId format. Must match pattern: rep_XXXXXX'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if no files are provided', async () => {
      req.body.reportId = 'rep_abc123';

      await validateFileUpload(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No files provided for upload'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if file validation fails', async () => {
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
        error: 'File "test.jpg": File too large'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', async () => {
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
        message: undefined
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateFileId', () => {
    it('should call next() for valid file ID', () => {
      req.params = { id: 'file_abc123' };

      validateFileId(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 if file ID is missing', () => {
      req.params = {};

      validateFileId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'File ID is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if file ID format is invalid', () => {
      req.params = { id: 'invalid_format' };

      validateFileId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid file ID format. Must match pattern: file_XXXXXX'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateReportId', () => {
    it('should call next() for valid report ID', () => {
      req.params = { reportId: 'rep_abc123' };

      validateReportId(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 if report ID is missing', () => {
      req.params = {};

      validateReportId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Report ID is required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if report ID format is invalid', () => {
      req.params = { reportId: 'invalid_format' };

      validateReportId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid report ID format. Must match pattern: rep_XXXXXX'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateStatusUpdate', () => {
    it('should call next() for valid status', () => {
      req.body = { status: 'completed' };

      validateStatusUpdate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 if status is missing', () => {
      req.body = {};

      validateStatusUpdate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Status is required for update'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if status is invalid', () => {
      req.body = { status: 'invalid_status' };

      validateStatusUpdate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid status. Must be one of: pending, processing, completed, failed'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('handleFileErrors', () => {
    it('should handle LIMIT_FILE_SIZE error', () => {
      const error = { code: 'LIMIT_FILE_SIZE' };
      const next = jest.fn();

      handleFileErrors(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'File too large. Maximum size is 10MB per file.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle LIMIT_FILE_COUNT error', () => {
      const error = { code: 'LIMIT_FILE_COUNT' };
      const next = jest.fn();

      handleFileErrors(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Too many files. Maximum 10 files per upload.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle LIMIT_UNEXPECTED_FILE error', () => {
      const error = { code: 'LIMIT_UNEXPECTED_FILE' };
      const next = jest.fn();

      handleFileErrors(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unexpected file field in upload request.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle validation errors', () => {
      const error = { message: 'validation failed' };
      const next = jest.fn();

      handleFileErrors(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'validation failed'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle Google Drive API errors', () => {
      const error = { code: 403 };
      const next = jest.fn();

      handleFileErrors(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'File storage service temporarily unavailable. Please try again later.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle rate limit errors', () => {
      const error = { code: 429 };
      const next = jest.fn();

      handleFileErrors(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'File storage service rate limit exceeded. Please try again later.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle generic errors', () => {
      const error = { message: 'Something went wrong' };
      const next = jest.fn();

      handleFileErrors(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'File operation failed',
        message: undefined
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});