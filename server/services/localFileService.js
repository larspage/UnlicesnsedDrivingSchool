/**
 * Local File System Service for NJDSC School Compliance Portal
 *
 * Provides local directory-based file storage to replace Google Drive functionality.
 * Supports file upload, organization by report ID, and public access URLs.
 */

const fs = require('fs').promises;
const path = require('path');

// Helper function to get cuid2 since it's more secure than UUID
async function getCuid2() {
  const { createId } = await import('@paralleldrive/cuid2');
  return createId;
}

// Configuration
const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';
const UPLOADS_URL_BASE = process.env.UPLOADS_URL_BASE || 'http://localhost:5000/uploads';

/**
 * Ensures the uploads directory exists
 * @throws {Error} If directory cannot be created
 */
async function ensureUploadsDirectory() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Ensures a report-specific subdirectory exists
 * @param {string} reportId - Report ID
 * @returns {Promise<string>} Path to the report directory
 */
async function ensureReportDirectory(reportId) {
  const reportDir = path.join(UPLOADS_DIR, reportId);

  try {
    await fs.access(reportDir);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(reportDir, { recursive: true });
  }

  return reportDir;
}

/**
 * Generates a unique filename to avoid conflicts
 * @param {string} originalName - Original filename
 * @returns {Promise<string>} Unique filename
 */
async function generateUniqueFilename(originalName) {
  const extension = path.extname(originalName);
  const basename = path.basename(originalName, extension);
  const timestamp = Date.now();
  const cuid2 = await getCuid2();
  const randomId = cuid2().substring(0, 8);

  return `${basename}_${timestamp}_${randomId}${extension}`;
}

/**
 * Helper function to get uuidv4 synchronously for compatibility
 * @returns {string} UUID v4 string
 */
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Uploads a file to local storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} originalName - Original filename
 * @param {string} mimeType - MIME type
 * @param {string} reportId - Associated report ID
 * @returns {Promise<Object>} File metadata including local file path and URLs
 */
async function uploadFile(fileBuffer, originalName, mimeType, reportId) {
  try {
    await ensureUploadsDirectory();
    const reportDir = await ensureReportDirectory(reportId);

    const uniqueFilename = await generateUniqueFilename(originalName);
    const filePath = path.join(reportDir, uniqueFilename);

    // Write file to disk
    await fs.writeFile(filePath, fileBuffer);

    // Generate URLs (relative for local access, starting with /uploads/)
    const relativePath = path.relative(UPLOADS_DIR, filePath);
    const publicUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;

    // Generate thumbnail URL for images
    let thumbnailUrl = null;
    if (mimeType.startsWith('image/')) {
      thumbnailUrl = publicUrl; // For now, use same URL (could implement thumbnail generation later)
    }

    const cuid2 = await getCuid2();
    const fileId = cuid2();
    console.log(`Generated file ID: ${fileId} for file: ${originalName}`);

    const fileData = {
      id: fileId,
      reportId,
      originalName,
      filename: uniqueFilename,
      mimeType,
      size: fileBuffer.length,
      localPath: filePath,
      url: publicUrl,
      thumbnailUrl,
      uploadedAt: new Date().toISOString()
    };

    return fileData;
  } catch (error) {
    throw new Error(`Failed to upload file ${originalName}: ${error.message}`);
  }
}

/**
 * Gets file metadata by ID (simulated - would need a file registry)
 * @param {string} fileId - File ID
 * @returns {Promise<Object|null>} File metadata or null if not found
 */
async function getFileMetadata(fileId) {
  // In a real implementation, you'd maintain a file registry
  // For now, return null as this would require scanning directories
  console.warn('getFileMetadata not fully implemented for local storage');
  return null;
}

/**
 * Downloads a file by its local path
 * @param {string} filePath - Local file path
 * @returns {Promise<Object>} Response object with file stream
 */
async function downloadFile(filePath) {
  try {
    // Verify file exists and is within uploads directory
    const resolvedPath = path.resolve(filePath);
    const uploadsPath = path.resolve(UPLOADS_DIR);

    if (!resolvedPath.startsWith(uploadsPath)) {
      throw new Error('Access denied: file outside uploads directory');
    }

    await fs.access(resolvedPath);

    // Return file stream (would be used by Express response)
    return {
      stream: require('fs').createReadStream(resolvedPath),
      path: resolvedPath
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('File not found');
    }
    throw error;
  }
}

/**
 * Deletes a file by its local path
 * @param {string} filePath - Local file path
 * @returns {Promise<boolean>} True if file was deleted
 */
async function deleteFile(filePath) {
  try {
    const resolvedPath = path.resolve(filePath);
    const uploadsPath = path.resolve(UPLOADS_DIR);

    if (!resolvedPath.startsWith(uploadsPath)) {
      throw new Error('Access denied: file outside uploads directory');
    }

    await fs.unlink(resolvedPath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false; // File didn't exist
    }
    throw error;
  }
}

/**
 * Lists files in a report directory
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Array of file metadata objects
 */
async function listReportFiles(reportId) {
  try {
    const reportDir = path.join(UPLOADS_DIR, reportId);

    try {
      await fs.access(reportDir);
    } catch (error) {
      return []; // Directory doesn't exist
    }

    const files = await fs.readdir(reportDir);
    const fileMetadata = [];

    for (const filename of files) {
      const filePath = path.join(reportDir, filename);
      const stats = await fs.stat(filePath);

      if (stats.isFile()) {
        const relativePath = path.relative(UPLOADS_DIR, filePath);
        const publicUrl = `${UPLOADS_URL_BASE}/${relativePath.replace(/\\/g, '/')}`;

        fileMetadata.push({
          id: filename, // Use filename as ID for now
          reportId,
          filename,
          localPath: filePath,
          url: `/uploads/${relativePath.replace(/\\/g, '/')}`,
          size: stats.size,
          uploadedAt: stats.mtime.toISOString()
        });
      }
    }

    return fileMetadata;
  } catch (error) {
    console.error('Error listing report files:', error);
    return [];
  }
}

/**
 * Gets storage statistics
 * @returns {Promise<Object>} Storage statistics
 */
async function getStorageStats() {
  try {
    await ensureUploadsDirectory();

    let totalFiles = 0;
    let totalSize = 0;
    const reportDirs = [];

    try {
      const items = await fs.readdir(UPLOADS_DIR);

      for (const item of items) {
        const itemPath = path.join(UPLOADS_DIR, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          reportDirs.push(item);

          // Count files in this directory
          try {
            const files = await fs.readdir(itemPath);
            for (const file of files) {
              const filePath = path.join(itemPath, file);
              const fileStats = await fs.stat(filePath);
              if (fileStats.isFile()) {
                totalFiles++;
                totalSize += fileStats.size;
              }
            }
          } catch (error) {
            // Ignore errors reading subdirectories
          }
        }
      }
    } catch (error) {
      // Ignore errors reading uploads directory
    }

    return {
      totalFiles,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      reportCount: reportDirs.length,
      uploadsDir: UPLOADS_DIR,
      uploadsUrlBase: UPLOADS_URL_BASE
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      totalFiles: 0,
      totalSize: 0,
      totalSizeMB: '0.00',
      reportCount: 0,
      uploadsDir: UPLOADS_DIR,
      uploadsUrlBase: UPLOADS_URL_BASE
    };
  }
}

module.exports = {
  uploadFile,
  getFileMetadata,
  downloadFile,
  deleteFile,
  listReportFiles,
  getStorageStats,
  ensureUploadsDirectory,
  ensureReportDirectory,
  generateUniqueFilename
};