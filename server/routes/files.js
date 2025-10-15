/**
 * Files API routes for NJDSC School Compliance Portal
 *
 * Provides endpoints for file upload, retrieval, and management.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileService = require('../services/fileService');
const {
  validateFileUpload,
  validateFileId,
  validateReportId,
  validateStatusUpdate,
  handleFileErrors
} = require('../middleware/fileValidation');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Define allowed MIME types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error(`Unsupported file type: ${file.mimetype}. Supported types: ${allowedTypes.join(', ')}`), false);
    }

    cb(null, true);
  }
});

/**
 * POST /api/files/upload
 * Upload files to Google Drive and save metadata to Google Sheets
 */
router.post('/upload', upload.array('files', 10), validateFileUpload, async (req, res) => {
  try {
    const { reportId } = req.body;
    const uploadedByIp = req.ip || req.connection.remoteAddress || 'unknown';

    // Validate required fields
    if (!reportId) {
      return res.status(400).json({
        success: false,
        error: 'reportId is required'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided'
      });
    }

    const uploadedFiles = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        const uploadedFile = await fileService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          reportId,
          uploadedByIp
        );

        uploadedFiles.push({
          id: uploadedFile.id,
          name: uploadedFile.originalName,
          type: uploadedFile.mimeType,
          size: uploadedFile.size,
          url: uploadedFile.driveUrl,
          thumbnailUrl: uploadedFile.thumbnailUrl,
          uploadedAt: uploadedFile.uploadedAt
        });
      } catch (fileError) {
        console.error(`Error uploading file ${file.originalname}:`, fileError);
        // Continue with other files if one fails
      }
    }

    if (uploadedFiles.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to upload any files'
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} of ${req.files.length} files`,
      data: {
        files: uploadedFiles,
        totalUploaded: uploadedFiles.length,
        totalRequested: req.files.length
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during file upload',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/files/:id
 * Get file information by ID
 */
router.get('/:id', validateFileId, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid file ID is required'
      });
    }

    const file = await fileService.getFileById(id);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: file.id,
        reportId: file.reportId,
        name: file.originalName,
        type: file.mimeType,
        size: file.size,
        url: file.driveUrl,
        thumbnailUrl: file.thumbnailUrl,
        uploadedAt: file.uploadedAt,
        uploadedByIp: file.uploadedByIp,
        processingStatus: file.processingStatus
      }
    });

  } catch (error) {
    console.error('Error retrieving file:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/files/:id/download
 * Download file from local storage or Google Drive to enable CORS for images
 */
router.get('/:id/download', validateFileId, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid file ID is required'
      });
    }

    // Get file metadata first
    const file = await fileService.getFileById(id);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Set appropriate headers for CORS and caching
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Check if file is stored locally or on Google Drive
    if (file.localFilePath) {
      // Local file - stream from local filesystem
      const localFileService = require('../services/localFileService');
      const fileStream = await localFileService.downloadFile(file.localFilePath);
      fileStream.stream.pipe(res);
    } else if (file.driveFileId) {
      // Google Drive file - fetch from Drive
      const googleDriveService = require('../services/googleDriveService');
      const driveResponse = await googleDriveService.downloadFile(file.driveFileId);
      driveResponse.data.pipe(res);
    } else {
      return res.status(404).json({
        success: false,
        error: 'File storage location not found'
      });
    }

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/files/report/:reportId
 * Get all files associated with a report
 */
router.get('/report/:reportId', validateReportId, async (req, res) => {
  try {
    const { reportId } = req.params;

    if (!reportId || typeof reportId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid report ID is required'
      });
    }

    const files = await fileService.getFilesByReportId(reportId);

    const formattedFiles = files.map(file => ({
      id: file.id,
      name: file.originalName,
      type: file.mimeType,
      size: file.size,
      url: file.driveUrl,
      thumbnailUrl: file.thumbnailUrl,
      uploadedAt: file.uploadedAt,
      uploadedByIp: file.uploadedByIp,
      processingStatus: file.processingStatus
    }));

    res.json({
      success: true,
      data: {
        files: formattedFiles,
        total: formattedFiles.length
      }
    });

  } catch (error) {
    console.error('Error retrieving files for report:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/files
 * Get all files (for admin/debugging purposes)
 */
router.get('/', async (req, res) => {
  try {
    const files = await fileService.getAllFiles();

    const formattedFiles = files.map(file => ({
      id: file.id,
      reportId: file.reportId,
      name: file.originalName,
      type: file.mimeType,
      size: file.size,
      url: file.driveUrl,
      thumbnailUrl: file.thumbnailUrl,
      uploadedAt: file.uploadedAt,
      uploadedByIp: file.uploadedByIp,
      processingStatus: file.processingStatus
    }));

    res.json({
      success: true,
      data: {
        files: formattedFiles,
        total: formattedFiles.length
      }
    });

  } catch (error) {
    console.error('Error retrieving all files:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/files/:id/status
 * Update file processing status (for internal use)
 */
router.put('/:id/status', validateFileId, validateStatusUpdate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid file ID is required'
      });
    }

    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required'
      });
    }

    const validStatuses = ['pending', 'processing', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updatedFile = await fileService.updateFileProcessingStatus(id, status);

    res.json({
      success: true,
      data: {
        id: updatedFile.id,
        processingStatus: updatedFile.processingStatus
      }
    });

  } catch (error) {
    console.error('Error updating file status:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/files/:id
 * Delete a file and its associated data (for testing cleanup)
 */
router.delete('/:id', validateFileId, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid file ID is required'
      });
    }

    const deleted = await fileService.deleteFile(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Error handling middleware for file routes
router.use((error, req, res, next) => {
  // Handle multer errors
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum file size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files. Maximum 10 files per upload.'
      });
    }
  }

  // Handle custom file filter errors
  if (error.message.includes('Unsupported file type')) {
    return res.status(400).json({
      success: false,
      error: 'validation failed'
    });
  }

  // Pass to general error handler
  next(error);
});

router.use(handleFileErrors);

module.exports = router;