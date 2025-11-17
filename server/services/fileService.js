/**
 * File Service for NJDSC School Compliance Portal
 *
 * Provides business logic for file management including upload to Google Drive,
 * metadata storage in Google Sheets, and file processing.
 */

const File = require('../models/File');
const localFileService = require('./localFileService');
const localJsonService = require('./localJsonService');
const configService = require('./configService');
const { Readable } = require('stream');
const { success, failure, attempt, attemptAsync, isSuccess } = require('../utils/result');
const { createError, validationError, notFoundError, fileError, databaseError, validateRequired, validateStringLength, ERROR_CODES } = require('../utils/errorUtils');

// Configuration constants
const FILES_DATA_FILE = 'files';

/**
 * Converts a readable stream to a Buffer
 * @param {Readable} stream - Readable stream
 * @returns {Promise<Buffer>} Buffer containing stream data
 */
async function streamToBuffer(stream) {
  try {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error converting stream to buffer:', error.message);
    throw new Error(`Failed to convert stream to buffer: ${error.message}`);
  }
}

/**
 * Uploads a file to local storage and saves metadata
 * @param {Buffer|Object} file - File buffer or multer-like file object with buffer/stream
 * @param {string} fileName - Original filename
 * @param {string} mimeType - MIME type
 * @param {string} reportId - Associated report ID
 * @param {string} uploadedByIp - Uploader's IP address
 * @returns {Promise<Result<File>>} Created file record or error
 */
async function uploadFile(file, fileName, mimeType, reportId, uploadedByIp = null) {
  return attemptAsync(async () => {
    // Structured input validation using error utilities
    const fileError = validateRequired(file, 'File', 'file object');
    if (fileError) throw fileError;
    
    const nameError = validateRequired(fileName, 'File name', 'non-empty string');
    if (nameError) throw nameError;
    
    const typeError = validateRequired(mimeType, 'MIME type', 'non-empty string');
    if (typeError) throw typeError;
    
    const reportError = validateRequired(reportId, 'Report ID', 'non-empty string');
    if (reportError) throw reportError;

    // Handle multer-like file object or plain buffer
    let fileBuffer;
    if (Buffer.isBuffer(file)) {
      // Plain buffer passed
      fileBuffer = file;
    } else if (file && file.buffer && Buffer.isBuffer(file.buffer)) {
      // Multer-like file object with buffer property
      fileBuffer = file.buffer;
      fileName = fileName || file.originalname;
      mimeType = mimeType || file.mimetype;
    } else if (file && file.stream && (file.stream instanceof Readable || typeof file.stream.pipe === 'function')) {
      // Multer-like file object with stream property
      console.log('[FILE UPLOAD] Converting stream to buffer');
      fileBuffer = await streamToBuffer(file.stream);
      fileName = fileName || file.originalname;
      mimeType = mimeType || file.mimetype;
    } else {
      throw validationError('file', 'Invalid file format: expected Buffer, file.buffer, or file.stream', file, 'Buffer or multer file object');
    }

    // Validate upload parameters using File model
    const validation = File.validateUploadParams(fileBuffer, fileName, mimeType, reportId);
    if (!validation.isValid) {
      throw validationError('uploadParams', validation.error, { fileName, mimeType, reportId });
    }

    // Get existing files for the report to check limits
    const existingFilesResult = await getFilesByReportId(reportId);
    if (!isSuccess(existingFilesResult)) {
      throw existingFilesResult.error;
    }
    const existingFiles = existingFilesResult.data;

    // Ensure uploads directory exists
    await localFileService.ensureUploadsDirectory();

    // Upload file to local storage
    let fileData;
    try {
      fileData = await localFileService.uploadFile(fileBuffer, fileName, mimeType, reportId);
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err);
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('access denied') || err.code === 'EACCES') {
        throw fileError('upload', 'Permission denied', { reportId, fileName, mimeType }, err);
      }
      // For any other upload failure, use FILE_UPLOAD_FAILED
      throw fileError('upload', msg, { reportId, fileName, mimeType }, err);
    }

    // Create file record with local storage data
    const fileRecordData = {
      reportId,
      originalName: fileName,
      mimeType,
      size: fileBuffer.length,
      localFilePath: fileData.localPath,
      publicUrl: fileData.url,
      thumbnailUrl: fileData.thumbnailUrl
    };

    console.log('[FILE UPLOAD] Creating file record with data:', fileRecordData);

    const file = File.create(fileRecordData, uploadedByIp);
    console.log('[FILE UPLOAD] File created successfully:', { id: file.id, reportId: file.reportId });

    // Validate business rules
    file.validateBusinessRules(existingFiles);
    console.log('[FILE UPLOAD] Business rules validated');

    // Save metadata to local JSON storage
    console.log('[FILE UPLOAD] Saving to JSON storage...');
    const saveResult = await saveFileToJson(file);
    if (!isSuccess(saveResult)) {
      throw saveResult.error;
    }
    console.log('[FILE UPLOAD] File metadata saved to JSON successfully');

    return file;
  }, { operation: 'uploadFile', details: { fileName, mimeType, reportId, hasIp: !!uploadedByIp } });
}

/**
 * Retrieves file metadata by ID
 * @param {string} fileId - File ID
 * @returns {Promise<Result<File|null>>} File instance or error
 */
async function getFileById(fileId) {
  return attemptAsync(async () => {
    // Use structured validation
    const validationError = validateRequired(fileId, 'File ID', 'non-empty string');
    if (validationError) {
      throw validationError;
    }

    const allFilesResult = await getAllFiles();
    if (!isSuccess(allFilesResult)) {
      throw allFilesResult.error;
    }
    const allFiles = allFilesResult.data;
    const file = allFiles.find(f => f.id === fileId) || null;
    
    if (!file) {
      throw notFoundError('File', fileId);
    }
    
    return file;
  }, { operation: 'getFileById', details: { fileId, hasFileId: !!fileId } });
}

/**
 * Retrieves all files associated with a report
 * @param {string} reportId - Report ID
 * @returns {Promise<Result<Array<File>>>} Array of File instances or error
 */
async function getFilesByReportId(reportId) {
  return attemptAsync(async () => {
    // Structured input validation
    const validationError = validateRequired(reportId, 'Report ID', 'non-empty string');
    if (validationError) throw validationError;

    if (typeof reportId !== 'string') {
      throw validationError('reportId', 'Report ID must be a string', reportId, 'string');
    }

    const allFilesResult = await getAllFiles();
    if (!isSuccess(allFilesResult)) {
      throw allFilesResult.error.innerError;
    }
    const allFiles = allFilesResult.data;
    return allFiles.filter(file => file.reportId === reportId);
  }, { operation: 'getFilesByReportId', details: { reportId, hasReportId: !!reportId } });
}

/**
 * Updates file processing status
 * @param {string} fileId - File ID
 * @param {string} status - New processing status
 * @returns {Promise<Result<File>>} Updated file instance or error
 */
async function updateFileProcessingStatus(fileId, status) {
  return attemptAsync(async () => {
    // Input validation
    const validationError = validateRequired(fileId, 'File ID', 'non-empty string');
    if (validationError) {
      throw validationError;
    }
    
    const statusError = validateRequired(status, 'Processing status', 'non-empty string');
    if (statusError) {
      throw statusError;
    }

    const allFilesResult = await getAllFiles();
    if (!isSuccess(allFilesResult)) {
      throw allFilesResult.error;
    }
    const allFiles = allFilesResult.data;
    
    const fileIndex = allFiles.findIndex(file => file.id === fileId);
    if (fileIndex === -1) {
      throw notFoundError('File', fileId);
    }

    const existingFile = allFiles[fileIndex];
    const updatedFile = existingFile.updateProcessingStatus(status);

    // Save to local JSON storage
    const saveResult = await updateFileInJson(updatedFile);
    if (!isSuccess(saveResult)) {
      throw saveResult.error;
    }

    return updatedFile;
  }, { operation: 'updateFileProcessingStatus', details: { fileId, status } });
}

/**
 * Retrieves all files from local JSON storage
 * @returns {Promise<Result<Array<File>>>} Array of File instances or error
 */
async function getAllFiles() {
  return attemptAsync(async () => {
    const filesDataResult = await localJsonService.getAllRows(null, FILES_DATA_FILE);
    if (!isSuccess(filesDataResult)) {
      throw filesDataResult.error;
    }
    const filesData = filesDataResult.data;

    // Convert plain objects to File instances
    const files = filesData.map(data => {
      try {
        return new File(data);
      } catch (error) {
        console.warn('Skipping invalid file data:', data, error.message);
        return null;
      }
    }).filter(file => file !== null);

    return files;
  }, { operation: 'getAllFiles' });
}

/**
 * Saves a file record to local JSON storage
 * @param {File} file - File instance to save
 * @returns {Promise<Result<void>>} Success or error
 */
async function saveFileToJson(file) {
  return attemptAsync(async () => {
    const validationError = validateRequired(file, 'File', 'File instance');
    if (validationError) {
      throw validationError;
    }
    
    const saveResult = await localJsonService.appendRow(null, FILES_DATA_FILE, file);
    if (!isSuccess(saveResult)) {
      throw saveResult.error;
    }
    return undefined; // Void return
  }, { operation: 'saveFileToJson', details: { fileId: file?.id } });
}

/**
 * Updates a file record in local JSON storage
 * @param {File} file - Updated file instance
 * @returns {Promise<Result<void>>} Success or error
 */
async function updateFileInJson(file) {
  return attemptAsync(async () => {
    const validationError = validateRequired(file, 'File', 'File instance');
    if (validationError) {
      throw validationError;
    }
    
    const validationError2 = validateRequired(file.id, 'File ID', 'non-empty string');
    if (validationError2) {
      throw validationError2;
    }
    
    const updateResult = await localJsonService.updateRow(null, FILES_DATA_FILE, file.id, file);
    if (!isSuccess(updateResult)) {
      throw updateResult.error;
    }
    return undefined; // Void return
  }, { operation: 'updateFileInJson', details: { fileId: file?.id } });
}

/**
 * Deletes a file and its associated data
 * @param {string} fileId - File ID to delete
 * @returns {Promise<Result<boolean>>} True if file was deleted, false if not found
 */
async function deleteFile(fileId) {
  return attemptAsync(async () => {
    // Get file information before deletion
    const fileResult = await getFileById(fileId);
    if (!isSuccess(fileResult)) {
      // If file not found, return false (not an error)
      if (fileResult.error.code === ERROR_CODES.NOT_FOUND) {
        return false;
      }
      throw fileResult.error;
    }
    const file = fileResult.data;

    // Delete from local file system if it exists
    if (file.localFilePath) {
      try {
        await localFileService.deleteFile(file.localFilePath);
        console.log(`[FILE DELETE] Deleted local file: ${file.localFilePath}`);
      } catch (error) {
        console.warn(`[FILE DELETE] Failed to delete local file ${file.localFilePath}:`, error.message);
        // Continue with metadata deletion even if local file deletion fails
      }
    }

    // Delete metadata from JSON storage
    const deleteResult = await localJsonService.deleteRow(null, FILES_DATA_FILE, fileId);
    if (!isSuccess(deleteResult)) {
      throw deleteResult.error;
    }
    console.log(`[FILE DELETE] Deleted file metadata for ID: ${fileId}`);

    return true;
  }, { operation: 'deleteFile', details: { fileId, hasFileId: !!fileId } });
}

/**
 * Validates file upload against business rules
 * @param {string} reportId - Report ID
 * @param {number} fileSize - File size in bytes
 * @param {string} mimeType - MIME type
 * @returns {Promise<Result<Object>>} Validation result or error
 */
async function validateFileUpload(reportId, fileSize, mimeType) {
  return attemptAsync(async () => {
    // Structured input validation
    const reportIdError = validateRequired(reportId, 'Report ID', 'non-empty string');
    if (reportIdError) throw reportIdError;

    if (typeof reportId !== 'string') {
      throw validationError('reportId', 'Report ID must be a string', reportId, 'string');
    }

    if (typeof fileSize !== 'number' || fileSize < 0) {
      throw validationError('fileSize', 'File size must be a non-negative number', fileSize, 'number >= 0');
    }

    if (!mimeType || typeof mimeType !== 'string') {
      throw new Error('MIME type is required and must be a string');
    }

    // Check file size against configuration
    const maxFileSizeResult = await configService.getConfig('system.maxFileSize');
    if (!isSuccess(maxFileSizeResult)) {
      // Fallback to model default if config service fails
      const maxFileSize = File.getMaxFileSize();
      console.warn('Config service failed, using fallback max file size:', maxFileSize);
      if (fileSize > maxFileSize) {
        return {
          isValid: false,
          error: `File size ${fileSize} bytes exceeds maximum allowed size of ${maxFileSize} bytes`
        };
      }
    } else {
      const maxFileSize = maxFileSizeResult.data || File.getMaxFileSize();
      if (fileSize > maxFileSize) {
        return {
          isValid: false,
          error: `File size ${fileSize} bytes exceeds maximum allowed size of ${maxFileSize} bytes`
        };
      }
    }

    // Check MIME type
    const supportedTypes = Object.values(File.getSupportedMimeTypes()).flat();
    if (!supportedTypes.includes(mimeType)) {
      return {
        isValid: false,
        error: `Unsupported file type: ${mimeType}. Supported types: ${supportedTypes.join(', ')}`
      };
    }

    // Check file count limit per report
    const existingFilesResult = await getFilesByReportId(reportId);
    if (!isSuccess(existingFilesResult)) {
      throw existingFilesResult.error;
    }
    const existingFiles = existingFilesResult.data;

    const maxFilesPerReportResult = await configService.getConfig('system.maxFilesPerReport');
    const maxFilesPerReport = (isSuccess(maxFilesPerReportResult) ? maxFilesPerReportResult.data : 10) || 10;

    if (existingFiles.length >= maxFilesPerReport) {
      return {
        isValid: false,
        error: `Maximum ${maxFilesPerReport} files allowed per report. Report already has ${existingFiles.length} files.`
      };
    }

    return { isValid: true };
  }, { operation: 'validateFileUpload', details: { reportId, fileSize, mimeType } });
}

/**
 * Processes base64 encoded file data for upload
 * @param {string} base64Data - Base64 encoded file data
 * @param {string} fileName - Original filename
 * @param {string} mimeType - MIME type
 * @returns {Buffer} File buffer
 * @throws {Error} If base64 data is invalid
 */
function processBase64File(base64Data, fileName, mimeType) {
  try {
    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Prefix = `data:${mimeType};base64,`;
    const cleanBase64 = base64Data.startsWith(base64Prefix) ?
      base64Data.slice(base64Prefix.length) : base64Data;

    // Validate base64 format
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
      throw new Error('Invalid base64 format');
    }

    const buffer = Buffer.from(cleanBase64, 'base64');

    // Additional validation: check if decoded length is reasonable
    // Base64 encoded data should be roughly 4/3 the size of the original
    const expectedMinLength = Math.floor(cleanBase64.replace(/=+$/, '').length * 3 / 4);
    const expectedMaxLength = Math.ceil(cleanBase64.length * 3 / 4);

    if (buffer.length < expectedMinLength - 10 || buffer.length > expectedMaxLength + 10) {
      throw new Error('Base64 data length validation failed');
    }

    return buffer;
  } catch (error) {
    throw new Error(`Invalid base64 data for file ${fileName}: ${error.message}`);
  }
}

module.exports = {
  uploadFile,
  getFileById,
  getFilesByReportId,
  updateFileProcessingStatus,
  getAllFiles,
  validateFileUpload,
  processBase64File,
  deleteFile,

  // Export for testing
  saveFileToJson,
  updateFileInJson
};