/**
 * Google Drive Service for NJDSC School Compliance Portal
 *
 * Handles file uploads, storage, and metadata management for school compliance reports.
 * Uses service account authentication for secure API access.
 */

const { google } = require('googleapis');
const path = require('path');

// Service account credentials from environment variables
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const GMAIL_USER = process.env.GOOGLE_GMAIL_USER;

// Validate required environment variables
if (!SERVICE_ACCOUNT_KEY) {
  throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required');
}

if (!DRIVE_FOLDER_ID) {
  throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable is required');
}

if (!GMAIL_USER) {
  throw new Error('GOOGLE_GMAIL_USER environment variable is required for domain-wide delegation');
}

// Parse service account credentials
let credentials;
try {
  credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
  
  // Fix private key formatting if needed (replace literal \n with actual newlines)
  if (credentials.private_key && credentials.private_key.includes('\\n')) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }
} catch (error) {
  throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.');
}

// Initialize Google Drive API client with domain-wide delegation
// This allows the service account to act as the user and access their Drive storage
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive'],
  subject: GMAIL_USER, // Act as this user to access their Drive storage
});

const drive = google.drive({ version: 'v3', auth });

// Supported file types
const SUPPORTED_MIME_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  videos: ['video/mp4', 'video/avi', 'video/mov'],
  documents: ['application/pdf'],
};

// All supported MIME types
const ALL_SUPPORTED_TYPES = [
  ...SUPPORTED_MIME_TYPES.images,
  ...SUPPORTED_MIME_TYPES.videos,
  ...SUPPORTED_MIME_TYPES.documents,
];

/**
 * Validates file parameters for upload operations
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original filename
 * @param {string} mimeType - MIME type
 * @param {string} reportId - Associated report ID
 * @throws {Error} If validation fails
 */
function validateFileParams(fileBuffer, fileName, mimeType, reportId) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error('Invalid fileBuffer: must be a Buffer');
  }

  if (!fileName || typeof fileName !== 'string' || fileName.trim().length === 0) {
    throw new Error('Invalid fileName: must be a non-empty string');
  }

  if (!mimeType || typeof mimeType !== 'string') {
    throw new Error('Invalid mimeType: must be a non-empty string');
  }

  if (!ALL_SUPPORTED_TYPES.includes(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}. Supported types: ${ALL_SUPPORTED_TYPES.join(', ')}`);
  }

  if (!reportId || typeof reportId !== 'string' || !/^rep_[a-zA-Z0-9]{6}$/.test(reportId)) {
    throw new Error('Invalid reportId: must match report ID format (rep_XXXXXX)');
  }
}

/**
 * Validates file ID parameter
 * @param {string} fileId - Google Drive file ID
 * @throws {Error} If validation fails
 */
function validateFileId(fileId) {
  if (!fileId || typeof fileId !== 'string' || fileId.trim().length === 0) {
    throw new Error('Invalid fileId: must be a non-empty string');
  }
}

/**
 * Generates a unique file ID for internal tracking
 * @returns {string} Unique file identifier
 */
function generateFileId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'file_';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Creates or gets a folder for the report within the main Drive folder
 * Supports both regular folders and Shared Drives
 * @param {string} reportId - Report ID to create folder for
 * @returns {string} Folder ID
 */
async function getOrCreateReportFolder(reportId) {
  try {
    // Check if folder already exists
    const query = `'${DRIVE_FOLDER_ID}' in parents and name = '${reportId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchResponse = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (searchResponse.data.files.length > 0) {
      return searchResponse.data.files[0].id;
    }

    // Create new folder
    const folderMetadata = {
      name: reportId,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [DRIVE_FOLDER_ID],
    };

    const createResponse = await drive.files.create({
      resource: folderMetadata,
      fields: 'id',
      supportsAllDrives: true,
    });

    return createResponse.data.id;

  } catch (error) {
    throw new Error(`Failed to create/get report folder: ${error.message}`);
  }
}

/**
 * Logs operation details for debugging and monitoring
 * @param {string} operation - Operation name
 * @param {Object} details - Additional details to log
 */
function logOperation(operation, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] GoogleDriveService.${operation}:`, details);
}

/**
 * Handles Google Drive API errors
 * @param {Error} error - Error from Google Drive API
 * @param {string} operation - Operation that failed
 * @throws {Error} Processed error with context
 */
function handleApiError(error, operation) {
  logOperation(operation, { error: error.message, code: error.code });

  if (error.code === 403) {
    throw new Error('Access denied to Google Drive. Check service account permissions.');
  } else if (error.code === 404) {
    throw new Error('File or folder not found in Google Drive.');
  } else if (error.code === 429) {
    throw new Error('Google Drive API rate limit exceeded. Please try again later.');
  } else if (error.code === 413) {
    throw new Error('File too large. Maximum file size is 10MB.');
  } else {
    throw new Error(`Google Drive API error during ${operation}: ${error.message}`);
  }
}

/**
 * Uploads a file to Google Drive in the designated report folder
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original filename
 * @param {string} mimeType - MIME type
 * @param {string} reportId - Associated report ID
 * @returns {Object} File metadata including Drive file ID and URLs
 */
async function uploadFile(fileBuffer, fileName, mimeType, reportId) {
  try {
    validateFileParams(fileBuffer, fileName, mimeType, reportId);

    logOperation('uploadFile', { fileName, mimeType, reportId, size: fileBuffer.length });

    // Get or create report folder
    const reportFolderId = await getOrCreateReportFolder(reportId);

    // Sanitize filename and ensure unique name with readable timestamp
    const sanitizedName = path.basename(fileName).replace(/[^a-zA-Z0-9.\-_]/g, '_');
    
    // Create readable timestamp in US Eastern Time: 2025-09-30_10-30-45
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
      .replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2_$4-$5-$6'); // Format: YYYY-MM-DD_HH-MM-SS
    
    const uniqueFileName = `${timestamp}_${sanitizedName}`;

    // Upload file metadata
    const fileMetadata = {
      name: uniqueFileName,
      parents: [reportFolderId],
    };

    // Upload file - convert Buffer to Stream for Google Drive API
    const { Readable } = require('stream');
    const stream = Readable.from(fileBuffer);
    
    const media = {
      mimeType,
      body: stream,
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id,name,size,createdTime,modifiedTime,webViewLink,webContentLink',
      supportsAllDrives: true,
    });

    const fileData = response.data;
    const fileId = fileData.id;

    logOperation('uploadFile', {
      success: true,
      driveFileId: fileId,
      fileName: uniqueFileName,
      size: fileBuffer.length
    });

    // Generate public URL
    const publicUrl = await generatePublicUrl(fileId);

    // Generate thumbnail URL for images
    let thumbnailUrl = null;
    if (SUPPORTED_MIME_TYPES.images.includes(mimeType)) {
      thumbnailUrl = await generateThumbnail(fileId);
    }

    return {
      id: generateFileId(),
      reportId,
      originalName: fileName,
      mimeType,
      size: fileBuffer.length,
      driveFileId: fileId,
      driveUrl: publicUrl,
      thumbnailUrl,
      uploadedAt: new Date().toISOString(),
      processingStatus: 'completed',
    };

  } catch (error) {
    handleApiError(error, 'uploadFile');
  }
}

/**
 * Generates a public shareable URL for a file
 * @param {string} fileId - Google Drive file ID
 * @returns {string} Public URL
 */
async function generatePublicUrl(fileId) {
  try {
    validateFileId(fileId);

    logOperation('generatePublicUrl', { fileId });

    // Make file publicly readable
    await drive.permissions.create({
      fileId,
      resource: {
        type: 'anyone',
        role: 'reader',
      },
      supportsAllDrives: true,
    });

    // Get file metadata to construct direct download URL
    const response = await drive.files.get({
      fileId,
      fields: 'webContentLink',
      supportsAllDrives: true,
    });

    const publicUrl = response.data.webContentLink;

    logOperation('generatePublicUrl', { success: true, fileId, publicUrl });

    return publicUrl;

  } catch (error) {
    handleApiError(error, 'generatePublicUrl');
  }
}

/**
 * Generates a thumbnail URL for image files
 * @param {string} fileId - Google Drive file ID
 * @returns {string|null} Thumbnail URL or null if not applicable
 */
async function generateThumbnail(fileId) {
  try {
    validateFileId(fileId);

    logOperation('generateThumbnail', { fileId });

    // Get file metadata to check if it's an image
    const response = await drive.files.get({
      fileId,
      fields: 'mimeType,thumbnailLink',
      supportsAllDrives: true,
    });

    const mimeType = response.data.mimeType;

    if (!SUPPORTED_MIME_TYPES.images.includes(mimeType)) {
      logOperation('generateThumbnail', { skipped: true, reason: 'Not an image file' });
      return null;
    }

    const thumbnailUrl = response.data.thumbnailLink;

    logOperation('generateThumbnail', { success: true, fileId, thumbnailUrl });

    return thumbnailUrl;

  } catch (error) {
    handleApiError(error, 'generateThumbnail');
  }
}

/**
 * Retrieves metadata for a file
 * @param {string} fileId - Google Drive file ID
 * @returns {Object} File metadata
 */
async function getFileMetadata(fileId) {
  try {
    validateFileId(fileId);

    logOperation('getFileMetadata', { fileId });

    const response = await drive.files.get({
      fileId,
      fields: 'id,name,size,mimeType,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink,parents',
      supportsAllDrives: true,
    });

    const fileData = response.data;

    // Get folder name (report ID) from parents
    let reportId = null;
    if (fileData.parents && fileData.parents.length > 0) {
      const parentResponse = await drive.files.get({
        fileId: fileData.parents[0],
        fields: 'name',
        supportsAllDrives: true,
      });
      reportId = parentResponse.data.name;
    }

    const metadata = {
      driveFileId: fileData.id,
      name: fileData.name,
      size: parseInt(fileData.size) || 0,
      mimeType: fileData.mimeType,
      createdTime: fileData.createdTime,
      modifiedTime: fileData.modifiedTime,
      webViewLink: fileData.webViewLink,
      webContentLink: fileData.webContentLink,
      thumbnailLink: fileData.thumbnailLink,
      reportId,
    };

    logOperation('getFileMetadata', { success: true, fileId });

    return metadata;

  } catch (error) {
    handleApiError(error, 'getFileMetadata');
  }
}

/**
 * Deletes a file from Google Drive
 * @param {string} fileId - Google Drive file ID
 * @returns {boolean} Success status
 */
async function deleteFile(fileId) {
  try {
    validateFileId(fileId);

    logOperation('deleteFile', { fileId });

    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });

    logOperation('deleteFile', { success: true, fileId });

    return true;

  } catch (error) {
    handleApiError(error, 'deleteFile');
  }
}

module.exports = {
  uploadFile,
  generatePublicUrl,
  generateThumbnail,
  getFileMetadata,
  deleteFile,

  // Utility functions
  validateFileParams,
  validateFileId,
  generateFileId,
  getOrCreateReportFolder,
};