/**
 * Files API routes for NJDSC School Compliance Portal
 *
 * Provides endpoints for file upload, retrieval, and management.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileService = require('../services/fileService');
const { toHttpResponse, failure } = require('../utils/result');
const { ERROR_CODES } = require('../utils/errorCodes');
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
    // Allowed MIME types for uploads
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      // Normalize to a validation error handled consistently downstream
      return cb(new Error('validation failed'));
    }

    cb(null, true);
  }
});

/**
 * POST /api/files/upload
 * Upload files to Google Drive and save metadata to Google Sheets
 */
router.post('/upload', upload.array('files', 10), validateFileUpload, async (req, res) => {
  const { reportId } = req.body;
  const uploadedByIp = req.ip || req.connection?.remoteAddress || 'unknown';

  if (!reportId) {
    return toHttpResponse(
      failure(ERROR_CODES.VALIDATION_ERROR, 'reportId is required', null, { field: 'reportId' }),
      res
    );
  }

  if (!req.files || req.files.length === 0) {
    return toHttpResponse(
      failure(ERROR_CODES.VALIDATION_ERROR, 'No files provided', null, { field: 'files' }),
      res
    );
  }

  const uploadedFiles = [];

  for (const file of req.files) {
    const result = await fileService.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      reportId,
      uploadedByIp
    );

    if (result && result.success) {
      const uploadedFile = result.data;
      uploadedFiles.push({
        id: uploadedFile.id,
        name: uploadedFile.originalName,
        type: uploadedFile.mimeType,
        size: uploadedFile.size,
        url: uploadedFile.publicUrl,
        thumbnailUrl: uploadedFile.thumbnailUrl,
        uploadedAt: uploadedFile.uploadedAt
      });
    } else {
      // Log the error but continue with other files
      console.error('File upload failed:', result?.error?.message || 'Unknown error');
    }
  }

  if (uploadedFiles.length === 0) {
    return toHttpResponse(
      failure(ERROR_CODES.FILE_UPLOAD_FAILED, 'Failed to upload any files', null, { count: 0 }),
      res
    );
  }

  return res.status(201).json({
    data: {
      files: uploadedFiles,
      totalUploaded: uploadedFiles.length,
      totalRequested: req.files.length
    }
  });
});

/**
 * GET /api/files/:id
 * Get file information by ID
 */

router.get('/:id', validateFileId, async (req, res) => {
  const { id } = req.params;
  if (!id || typeof id !== 'string') {
    return toHttpResponse(
      failure(ERROR_CODES.VALIDATION_ERROR, 'Valid file ID is required', null, { field: 'id' }),
      res
    );
  }

  const result = await fileService.getFileById(id);
  return toHttpResponse(result, res);
});

/**
 * GET /api/files/:id/download
 * Download file from local storage or Google Drive to enable CORS for images
 */
router.get('/:id/download', validateFileId, async (req, res) => {
  const { id } = req.params;

  if (!id || typeof id !== 'string') {
    return toHttpResponse(
      failure(ERROR_CODES.VALIDATION_ERROR, 'Valid file ID is required', null, { field: 'id' }),
      res
    );
  }

  // Get file metadata first
  const fileResult = await fileService.getFileById(id);
  if (!fileResult.success) {
    return toHttpResponse(fileResult, res);
  }
  const file = fileResult.data;

  // Set appropriate headers for CORS and caching
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (file.localFilePath) {
    const localFileService = require('../services/localFileService');
    const fileStream = await localFileService.downloadFile(file.localFilePath);
    return fileStream.stream.pipe(res);
  } else if (file.driveFileId) {
    const googleDriveService = require('../services/googleDriveService');
    const driveResponse = await googleDriveService.downloadFile(file.driveFileId);
    return driveResponse.data.pipe(res);
  }

  return toHttpResponse(
    failure(ERROR_CODES.FILE_NOT_FOUND, 'File storage location not found', null, { id }),
    res
  );
});

/**
 * GET /api/files/report/:reportId
 * Get all files associated with a report
 */
router.get('/report/:reportId', validateReportId, async (req, res) => {
  const { reportId } = req.params;

  if (!reportId || typeof reportId !== 'string') {
    return toHttpResponse(
      failure(ERROR_CODES.VALIDATION_ERROR, 'Valid report ID is required', null, { field: 'reportId' }),
      res
    );
  }

  const result = await fileService.getFilesByReportId(reportId);
  if (!result.success) {
    return toHttpResponse(result, res);
  }

  const files = result.data;
  const formattedFiles = files.map(file => ({
    id: file.id,
    name: file.originalName,
    type: file.mimeType,
    size: file.size,
    url: file.publicUrl,
    thumbnailUrl: file.thumbnailUrl,
    uploadedAt: file.uploadedAt,
    uploadedByIp: file.uploadedByIp,
    processingStatus: file.processingStatus
  }));

  return res.json({ data: { files: formattedFiles, total: formattedFiles.length } });
});

/**
 * GET /api/files
 * Get all files (for admin/debugging purposes)
 */
router.get('/', async (req, res) => {
  const result = await fileService.getAllFiles();
  if (!result.success) {
    return toHttpResponse(result, res);
  }
  const files = result.data;

  const formattedFiles = files.map(file => ({
    id: file.id,
    reportId: file.reportId,
    name: file.originalName,
    type: file.mimeType,
    size: file.size,
    url: file.publicUrl,
    thumbnailUrl: file.thumbnailUrl,
    uploadedAt: file.uploadedAt,
    uploadedByIp: file.uploadedByIp,
    processingStatus: file.processingStatus
  }));

  return res.json({ data: { files: formattedFiles, total: formattedFiles.length } });
});

/**
 * PUT /api/files/:id/status
 * Update file processing status (for internal use)
 */
router.put('/:id/status', validateFileId, validateStatusUpdate, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id || typeof id !== 'string') {
    return toHttpResponse(
      failure(ERROR_CODES.VALIDATION_ERROR, 'Valid file ID is required', null, { field: 'id' }),
      res
    );
  }

  if (!status || typeof status !== 'string') {
    return toHttpResponse(
      failure(ERROR_CODES.VALIDATION_ERROR, 'Valid status is required', null, { field: 'status' }),
      res
    );
  }

  const validStatuses = ['pending', 'processing', 'completed', 'failed'];
  if (!validStatuses.includes(status)) {
    return toHttpResponse(
      failure(ERROR_CODES.VALIDATION_ERROR, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, null, { field: 'status' }),
      res
    );
  }

  const result = await fileService.updateFileProcessingStatus(id, status);
  return toHttpResponse(result, res);
});

/**
 * DELETE /api/files/:id
 * Delete a file and its associated data (for testing cleanup)
 */
router.delete('/:id', validateFileId, async (req, res) => {
  const { id } = req.params;

  if (!id || typeof id !== 'string') {
    return toHttpResponse(
      failure(ERROR_CODES.VALIDATION_ERROR, 'Valid file ID is required', null, { field: 'id' }),
      res
    );
  }

  const result = await fileService.deleteFile(id);
  if (!result.success) {
    return toHttpResponse(result, res);
  }

  if (!result.data) {
    return toHttpResponse(
      failure(ERROR_CODES.NOT_FOUND, 'File not found', null, { id }),
      res
    );
  }

  return res.json({ data: { message: 'File deleted successfully' } });
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