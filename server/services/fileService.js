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

// Configuration constants
const FILES_DATA_FILE = 'files';

/**
 * Converts a stream to buffer
 * @param {Stream} stream - Readable stream
 * @returns {Promise<Buffer>} Buffer from stream
 */
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Uploads a file to local storage and saves metadata to local JSON
 * @param {Buffer|Object} fileBuffer - File buffer OR file object with buffer/stream
 * @param {string} fileName - Original filename
 * @param {string} mimeType - MIME type
 * @param {string} reportId - Associated report ID
 * @param {string} uploadedByIp - Uploader's IP address
 * @returns {Promise<File>} Created file record
 * @throws {Error} If upload or validation fails
 */
async function uploadFile(fileBuffer, fileName, mimeType, reportId, uploadedByIp = null) {
  try {
    // Validate upload parameters
    const validation = File.validateUploadParams(fileBuffer, fileName, mimeType, reportId);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Get existing files for the report to check limits
    const existingFiles = await getFilesByReportId(reportId);

    // Upload file to local storage
    const fileData = await localFileService.uploadFile(fileBuffer, fileName, mimeType, reportId);

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

    try {
      const file = File.create(fileRecordData, uploadedByIp);
      console.log('[FILE UPLOAD] File created successfully:', { id: file.id, reportId: file.reportId });

      // Validate business rules
      file.validateBusinessRules(existingFiles);
      console.log('[FILE UPLOAD] Business rules validated');

      // Save metadata to local JSON storage
      console.log('[FILE UPLOAD] Saving to JSON storage...');
      await saveFileToJson(file);
      console.log('[FILE UPLOAD] File metadata saved to JSON successfully');

      return file;
    } catch (error) {
      console.error('[FILE UPLOAD ERROR] Failed to create/save file:', error);
      console.error('[FILE UPLOAD ERROR] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }

    return file;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Retrieves file metadata by ID
 * @param {string} fileId - File ID
 * @returns {Promise<File|null>} File instance or null if not found
 */
async function getFileById(fileId) {
  try {
    const allFiles = await getAllFiles();
    return allFiles.find(file => file.id === fileId) || null;
  } catch (error) {
    console.error('Error retrieving file by ID:', error);
    throw error;
  }
}

/**
 * Retrieves all files associated with a report
 * @param {string} reportId - Report ID
 * @returns {Promise<Array<File>>} Array of File instances
 */
async function getFilesByReportId(reportId) {
  try {
    const allFiles = await getAllFiles();
    return allFiles.filter(file => file.reportId === reportId);
  } catch (error) {
    console.error('Error retrieving files by report ID:', error);
    throw error;
  }
}

/**
 * Updates file processing status
 * @param {string} fileId - File ID
 * @param {string} status - New processing status
 * @returns {Promise<File>} Updated file instance
 * @throws {Error} If file not found or status invalid
 */
async function updateFileProcessingStatus(fileId, status) {
  try {
    const allFiles = await getAllFiles();
    const fileIndex = allFiles.findIndex(file => file.id === fileId);

    if (fileIndex === -1) {
      throw new Error(`File with ID ${fileId} not found`);
    }

    const existingFile = allFiles[fileIndex];
    const updatedFile = existingFile.updateProcessingStatus(status);

    // Save to local JSON storage
    await updateFileInJson(updatedFile);

    return updatedFile;
  } catch (error) {
    console.error('Error updating file processing status:', error);
    throw error;
  }
}

/**
 * Retrieves all files from local JSON storage
 * @returns {Promise<Array<File>>} Array of File instances
 */
async function getAllFiles() {
  try {
    const filesData = await localJsonService.getAllRows(null, FILES_DATA_FILE);

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
  } catch (error) {
    console.error('Error retrieving all files:', error);
    throw error;
  }
}

/**
 * Saves a file record to local JSON storage
 * @param {File} file - File instance to save
 * @returns {Promise<void>}
 */
async function saveFileToJson(file) {
  try {
    await localJsonService.appendRow(null, FILES_DATA_FILE, file);
  } catch (error) {
    console.error('Error saving file to JSON:', error);
    throw error;
  }
}

/**
 * Updates a file record in local JSON storage
 * @param {File} file - Updated file instance
 * @returns {Promise<void>}
 */
async function updateFileInJson(file) {
  try {
    await localJsonService.updateRow(null, FILES_DATA_FILE, file.id, file);
  } catch (error) {
    console.error('Error updating file in JSON:', error);
    throw error;
  }
}

/**
 * Deletes a file and its associated data
 * @param {string} fileId - File ID to delete
 * @returns {Promise<boolean>} True if file was deleted, false if not found
 * @throws {Error} If deletion fails
 */
async function deleteFile(fileId) {
  try {
    // Get file information before deletion
    const file = await getFileById(fileId);
    if (!file) {
      return false;
    }

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
    await localJsonService.deleteRow(null, FILES_DATA_FILE, fileId);
    console.log(`[FILE DELETE] Deleted file metadata for ID: ${fileId}`);

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Validates file upload against business rules
 * @param {string} reportId - Report ID
 * @param {number} fileSize - File size in bytes
 * @param {string} mimeType - MIME type
 * @returns {Promise<Object>} Validation result with isValid and error message
 */
async function validateFileUpload(reportId, fileSize, mimeType) {
  try {
    // Check file size against configuration
    const maxFileSize = await configService.getConfig('system.maxFileSize') || File.getMaxFileSize();
    if (fileSize > maxFileSize) {
      return {
        isValid: false,
        error: `File size ${fileSize} bytes exceeds maximum allowed size of ${maxFileSize} bytes`
      };
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
    const existingFiles = await getFilesByReportId(reportId);
    const maxFilesPerReport = await configService.getConfig('system.maxFilesPerReport') || 10;

    if (existingFiles.length >= maxFilesPerReport) {
      return {
        isValid: false,
        error: `Maximum ${maxFilesPerReport} files allowed per report. Report already has ${existingFiles.length} files.`
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating file upload:', error);
    return {
      isValid: false,
      error: 'File validation failed due to server error'
    };
  }
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