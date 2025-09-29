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

// Error handling middleware for file routes
router.use(handleFileErrors);

module.exports = router;