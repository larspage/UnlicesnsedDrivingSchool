/**
 * File Validation Middleware for NJDSC School Compliance Portal
 *
 * Provides validation and error handling for file-related operations.
 */

const fileService = require('../services/fileService');

/**
 * Middleware to validate file upload requests
 */
async function validateFileUpload(req, res, next) {
  try {
    const { reportId } = req.body;

    // Check if reportId is provided
    if (!reportId) {
      return res.status(400).json({
        success: false,
        error: 'reportId is required for file upload'
      });
    }

    // Validate reportId format
    if (typeof reportId !== 'string' || !/^rep_[a-zA-Z0-9]{6}$/.test(reportId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reportId format. Must match pattern: rep_XXXXXX'
      });
    }

    // Validate that files are present
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided for upload'
      });
    }

    // Validate each file
    for (const file of req.files) {
      const validation = await fileService.validateFileUpload(
        reportId,
        file.size,
        file.mimetype
      );

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: `File "${file.originalname}": ${validation.error}`
        });
      }
    }

    next();
  } catch (error) {
    console.error('File upload validation error:', error.message || error);
    // Return 400 for validation-related errors, 500 for unexpected server errors
    const isValidationError = error.name === 'ValidationError' || 
                             (error.message && error.message.toLowerCase().includes('validation'));
    const statusCode = isValidationError ? 400 : 500;
    return res.status(statusCode).json({ 
      success: false, 
      error: 'File upload validation failed',
      ...(process.env.NODE_ENV === 'development' && statusCode === 500 ? { message: error.message } : {})
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
        error: 'File ID is required'
      });
    }

    if (typeof id !== 'string' || !/^file_[a-zA-Z0-9]{6}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file ID format. Must match pattern: file_XXXXXX'
      });
    }

    next();
  } catch (error) {
    console.error('File ID validation error:', error);
    res.status(500).json({
      success: false,
      error: 'File ID validation failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        error: 'Report ID is required'
      });
    }

    if (typeof reportId !== 'string' || !/^rep_[a-zA-Z0-9]{6}$/.test(reportId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report ID format. Must match pattern: rep_XXXXXX'
      });
    }

    next();
  } catch (error) {
    console.error('Report ID validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Report ID validation failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        error: 'Status is required for update'
      });
    }

    const validStatuses = ['pending', 'processing', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    next();
  } catch (error) {
    console.error('Status update validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Status update validation failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Error handling middleware for file operations
 */
function handleFileErrors(error, req, res, next) {
  console.error('File operation error:', error);

  // Handle specific error types
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large. Maximum size is 10MB per file.'
    });
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      error: 'Too many files. Maximum 10 files per upload.'
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected file field in upload request.'
    });
  }

  // Handle multer errors
  if (error.field) {
    return res.status(400).json({
      success: false,
      error: `Invalid field "${error.field}" in upload request.`
    });
  }

  // Handle custom validation errors
  if (error.message && error.message.includes('validation failed')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  // Handle Google Drive API errors
  if (error.code === 403 || error.code === 'Forbidden') {
    return res.status(503).json({
      success: false,
      error: 'File storage service temporarily unavailable. Please try again later.'
    });
  }

  if (error.code === 429 || error.code === 'Too Many Requests') {
    return res.status(429).json({
      success: false,
      error: 'File storage service rate limit exceeded. Please try again later.'
    });
  }

  // Default error handling
  res.status(500).json({
    success: false,
    error: 'File operation failed',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

module.exports = {
  validateFileUpload,
  validateFileId,
  validateReportId,
  validateStatusUpdate,
  handleFileErrors
};