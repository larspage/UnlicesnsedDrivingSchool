/**
 * File Validation Middleware for NJDSC School Compliance Portal
 *
 * Provides validation and error handling for file-related operations.
 */

const fileService = require('../services/fileService');
const { failure, toHttpResponse } = require('../utils/result');
const { ERROR_CODES } = require('../utils/errorCodes');

/**
 * Middleware to validate file upload requests
 */
async function validateFileUpload(req, res, next) {
  try {
    const { reportId } = req.body;

    // Check if reportId is provided
    if (!reportId) {
      console.log('[FILE VALIDATION] Missing reportId');
      return res.status(400).json({
        success: false,
        error: 'reportId is required for file upload',
        details: { field: 'reportId' }
      });
    }

    // Validate reportId format
    if (typeof reportId !== 'string' || !/^rep_[a-zA-Z0-9]{6}$/.test(reportId)) {
      console.log('[FILE VALIDATION] Invalid reportId format:', reportId);
      return res.status(400).json({
        success: false,
        error: 'Invalid reportId format. Must match pattern: rep_XXXXXX',
        details: { field: 'reportId' }
      });
    }

    // Validate that files are present
    if (!req.files || req.files.length === 0) {
      console.log('[FILE VALIDATION] No files provided');
      return res.status(400).json({
        success: false,
        error: 'No files provided for upload',
        details: { field: 'files' }
      });
    }

    // Validate each file
    for (const file of req.files) {
      // Check if file has buffer (multer-like file object)
      if (!file.buffer && !Buffer.isBuffer(file)) {
        console.log('[FILE VALIDATION] File missing buffer:', file.originalname);
        return res.status(400).json({
          success: false,
          error: `File "${file.originalname}": Missing file buffer`,
          details: { file: file.originalname }
        });
      }

      const validation = await fileService.validateFileUpload(
        reportId,
        file.size,
        file.mimetype
      );

      if (!validation.isValid) {
        console.log('[FILE VALIDATION] File validation failed:', file.originalname, validation.error);
        return res.status(400).json({
          success: false,
          error: `File "${file.originalname}": ${validation.error}`,
          details: { file: file.originalname }
        });
      }
    }

    next();
  } catch (error) {
    console.error('[FILE VALIDATION] Validation error:', error.message);
    return res.status(400).json({
      success: false,
      error: 'File upload validation failed',
      details: error.message
    });
  }
}

/**
 * Middleware to validate file ID parameter
 */
function validateFileId(req, res, next) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'File ID is required',
        details: { field: 'id' }
      });
    }

    if (typeof id !== 'string' || !/^file_[a-zA-Z0-9]{6}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file ID format. Must match pattern: file_XXXXXX',
        details: { field: 'id' }
      });
    }

    next();
  } catch (error) {
    console.error('File ID validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'File ID validation failed',
      details: error.message
    });
  }
}

/**
 * Middleware to validate report ID parameter
 */
function validateReportId(req, res, next) {
  try {
    const { reportId } = req.params;

    if (!reportId) {
      return res.status(400).json({
        success: false,
        error: 'Report ID is required',
        details: { field: 'reportId' }
      });
    }

    if (typeof reportId !== 'string' || !/^rep_[a-zA-Z0-9]{6}$/.test(reportId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report ID format. Must match pattern: rep_XXXXXX',
        details: { field: 'reportId' }
      });
    }

    next();
  } catch (error) {
    console.error('Report ID validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Report ID validation failed',
      details: error.message
    });
  }
}

/**
 * Middleware to validate file status update requests
 */
function validateStatusUpdate(req, res, next) {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required for update',
        details: { field: 'status' }
      });
    }

    const validStatuses = ['pending', 'processing', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        details: { field: 'status' }
      });
    }

    next();
  } catch (error) {
    console.error('Status update validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Status update validation failed',
      details: error.message
    });
  }
}

/**
 * Error handling middleware for file operations
 */
function handleFileErrors(error, req, res, next) {
	const isJest = !!process.env.JEST_WORKER_ID;
	if (process.env.NODE_ENV !== 'test' && !isJest) {
		console.error('File operation error:', error);
	}

	const code = (error && (error.code || error.status)) ? String(error.code || error.status) : '';

	if (code === 'LIMIT_FILE_SIZE') {
		return toHttpResponse(
			failure(ERROR_CODES.FILE_TOO_LARGE, 'File too large. Maximum size is 10MB per file.', error),
			res
		);
	}

	if (code === 'LIMIT_FILE_COUNT') {
		return toHttpResponse(
			failure(ERROR_CODES.VALIDATION_ERROR, 'Too many files. Maximum 10 files per upload.', error),
			res
		);
	}

	if (code === 'LIMIT_UNEXPECTED_FILE') {
		return toHttpResponse(
			failure(ERROR_CODES.VALIDATION_ERROR, 'Unexpected file field in upload request.', error),
			res
		);
	}

	if (error && error.field) {
		return toHttpResponse(
			failure(ERROR_CODES.VALIDATION_ERROR, `Invalid field "${error.field}" in upload request.`, error, { field: error.field }),
			res
		);
	}

	if (error && error.message && error.message.includes('validation failed')) {
		return toHttpResponse(
			failure(ERROR_CODES.VALIDATION_ERROR, 'File upload validation failed', error, { reason: error.message }),
			res
		);
	}

	if (code === '403' || code === 'Forbidden') {
		return toHttpResponse(
			failure(ERROR_CODES.SERVICE_UNAVAILABLE, 'File storage service temporarily unavailable. Please try again later.', error),
			res
		);
	}

	if (code === '429' || code === 'Too Many Requests') {
		return toHttpResponse(
			failure(ERROR_CODES.RATE_LIMIT_ERROR, 'File storage service rate limit exceeded. Please try again later.', error),
			res
		);
	}

	return toHttpResponse(
		failure(ERROR_CODES.FILE_SYSTEM_ERROR, 'File operation failed', error, { message: error && error.message }),
		res
	);
}

module.exports = {
  validateFileUpload,
  validateFileId,
  validateReportId,
  validateStatusUpdate,
  handleFileErrors
};