/**
 * File Service for NJDSC School Compliance Portal
 *
 * Provides business logic for file management including upload to Google Drive,
 * metadata storage in Google Sheets, and file processing.
 */

const File = require('../models/File');
const googleDriveService = require('./googleDriveService');
const googleSheetsService = require('./googleSheetsService');
const configService = require('./configService');

// Configuration constants
const FILES_SHEET_NAME = 'Files';
const FILES_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

/**
 * Validates spreadsheet configuration
 * @throws {Error} If configuration is invalid
 */
function validateSpreadsheetConfig() {
  if (!FILES_SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID environment variable is required');
  }
}

/**
 * Uploads a file to Google Drive and saves metadata to Google Sheets
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original filename
 * @param {string} mimeType - MIME type
 * @param {string} reportId - Associated report ID
 * @param {string} uploadedByIp - Uploader's IP address
 * @returns {Promise<File>} Created file record
 * @throws {Error} If upload or validation fails
 */
async function uploadFile(fileBuffer, fileName, mimeType, reportId, uploadedByIp = null) {
  try {
    validateSpreadsheetConfig();

    // Validate upload parameters
    const validation = File.validateUploadParams(fileBuffer, fileName, mimeType, reportId);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Get existing files for the report to check limits
    const existingFiles = await getFilesByReportId(reportId);

    // Upload file to Google Drive
    const driveFile = await googleDriveService.uploadFile(fileBuffer, fileName, mimeType);

    // Generate URLs
    const driveUrl = File.generatePublicUrl(driveFile.id);
    const thumbnailUrl = driveFile.mimeType.startsWith('image/') ?
      File.generateThumbnailUrl(driveFile.id) : null;

    // Create file record
    const fileData = {
      reportId,
      originalName: fileName,
      mimeType,
      size: fileBuffer.length,
      driveFileId: driveFile.id,
      driveUrl,
      thumbnailUrl
    };

    const file = File.create(fileData, uploadedByIp);

    // Validate business rules
    file.validateBusinessRules(existingFiles);

    // Save metadata to Google Sheets
    await saveFileToSheets(file);

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
    validateSpreadsheetConfig();

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
    validateSpreadsheetConfig();

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
    validateSpreadsheetConfig();

    const allFiles = await getAllFiles();
    const fileIndex = allFiles.findIndex(file => file.id === fileId);

    if (fileIndex === -1) {
      throw new Error(`File with ID ${fileId} not found`);
    }

    const existingFile = allFiles[fileIndex];
    const updatedFile = existingFile.updateProcessingStatus(status);

    // Save to sheets
    await updateFileInSheets(updatedFile);

    return updatedFile;
  } catch (error) {
    console.error('Error updating file processing status:', error);
    throw error;
  }
}

/**
 * Retrieves all files from Google Sheets
 * @returns {Promise<Array<File>>} Array of File instances
 */
async function getAllFiles() {
  try {
    const files = await googleSheetsService.getAllRows(
      FILES_SPREADSHEET_ID,
      FILES_SHEET_NAME
    );

    return files;
  } catch (error) {
    console.error('Error retrieving all files:', error);
    throw error;
  }
}

/**
 * Saves a file record to Google Sheets
 * @param {File} file - File instance to save
 * @returns {Promise<void>}
 */
async function saveFileToSheets(file) {
  try {
    const rowData = file.toSheetsRow();

    await googleSheetsService.appendRow(
      FILES_SPREADSHEET_ID,
      FILES_SHEET_NAME,
      rowData
    );
  } catch (error) {
    console.error('Error saving file to sheets:', error);
    throw error;
  }
}

/**
 * Updates a file record in Google Sheets
 * @param {File} file - Updated file instance
 * @returns {Promise<void>}
 */
async function updateFileInSheets(file) {
  try {
    // Get all files to find the row index
    const allFiles = await getAllFiles();
    const fileIndex = allFiles.findIndex(f => f.id === file.id);

    if (fileIndex === -1) {
      throw new Error(`File ${file.id} not found in sheets`);
    }

    const rowData = file.toSheetsRow();
    const sheetRowNumber = fileIndex + 2; // +1 for header, +1 for 1-based

    await googleSheetsService.updateRow(
      FILES_SPREADSHEET_ID,
      FILES_SHEET_NAME,
      sheetRowNumber,
      rowData
    );
  } catch (error) {
    console.error('Error updating file in sheets:', error);
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

    return Buffer.from(cleanBase64, 'base64');
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

  // Export for testing
  saveFileToSheets,
  updateFileInSheets
};