/**
 * File Model for NJDSC School Compliance Portal
 *
 * Represents a file uploaded to the system with validation, URL generation,
 * and processing status tracking.
 */

const Joi = require('joi');

/**
 * Processing status enumeration for files
 * @enum {string}
 */
const PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Supported MIME types for file uploads
 * @enum {Object}
 */
const SUPPORTED_MIME_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  videos: ['video/mp4', 'video/avi', 'video/mov'],
  documents: ['application/pdf']
};

/**
 * All supported MIME types
 * @type {Array<string>}
 */
const ALL_SUPPORTED_TYPES = [
  ...SUPPORTED_MIME_TYPES.images,
  ...SUPPORTED_MIME_TYPES.videos,
  ...SUPPORTED_MIME_TYPES.documents
];

/**
 * Maximum file size in bytes (10MB)
 * @type {number}
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * File class representing an uploaded file
 */
class File {
  /**
   * Creates a new File instance with validation
   * @param {Object} data - File data
   * @param {string} data.id - Unique file identifier
   * @param {string} data.reportId - Associated report ID
   * @param {string} data.originalName - Original filename
   * @param {string} data.mimeType - MIME type
   * @param {number} data.size - File size in bytes
   * @param {string} data.driveFileId - Google Drive file ID
   * @param {string} data.driveUrl - Public access URL
   * @param {string} [data.thumbnailUrl] - Thumbnail URL for images
   * @param {string} data.uploadedAt - Upload timestamp
   * @param {string} [data.uploadedByIp] - Uploader's IP address
   * @param {string} data.processingStatus - Processing status
   */
  constructor(data) {
    // Validate input data
    const validatedData = File.validateData(data);

    // Assign validated properties
    this.id = validatedData.id;
    this.reportId = validatedData.reportId;
    this.originalName = validatedData.originalName;
    this.mimeType = validatedData.mimeType;
    this.size = validatedData.size;
    this.driveFileId = validatedData.driveFileId;
    this.driveUrl = validatedData.driveUrl;
    this.thumbnailUrl = validatedData.thumbnailUrl;
    this.uploadedAt = validatedData.uploadedAt;
    this.uploadedByIp = validatedData.uploadedByIp;
    this.processingStatus = validatedData.processingStatus;
  }

  /**
   * Generates a unique file ID
   * @returns {string} Unique file identifier
   */
  static generateId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'file_';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Validates file data using Joi schema
   * @param {Object} data - Data to validate
   * @returns {Object} Validated and sanitized data
   * @throws {Error} If validation fails
   */
  static validateData(data) {
    const schema = Joi.object({
      id: Joi.string().pattern(/^file_[a-zA-Z0-9]{6}$/).required(),
      reportId: Joi.string().pattern(/^rep_[a-zA-Z0-9]{6}$/).required(),
      originalName: Joi.string().max(255).trim().required(),
      mimeType: Joi.string().valid(...ALL_SUPPORTED_TYPES).required(),
      size: Joi.number().integer().min(0).max(MAX_FILE_SIZE).required(),
      driveFileId: Joi.string().required(),
      driveUrl: Joi.string().uri().required(),
      thumbnailUrl: Joi.string().uri().allow(''),
      uploadedAt: Joi.string().isoDate().required(),
      uploadedByIp: Joi.string().ip({ version: ['ipv4', 'ipv6'] }).allow('', null).optional(),
      processingStatus: Joi.string().valid(...Object.values(PROCESSING_STATUS)).required()
    });

    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join('; ');
      throw new Error(`File validation failed: ${errorMessages}`);
    }

    return value;
  }

  /**
   * Validates file upload parameters
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Original filename
   * @param {string} mimeType - MIME type
   * @param {string} reportId - Associated report ID
   * @throws {Error} If validation fails
   */
  static validateUploadParams(fileBuffer, fileName, mimeType, reportId) {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new Error('Invalid file buffer: must be a Buffer');
    }

    if (!fileName || typeof fileName !== 'string' || fileName.trim().length === 0) {
      throw new Error('Invalid filename: must be a non-empty string');
    }

    if (!mimeType || typeof mimeType !== 'string') {
      throw new Error('Invalid MIME type: must be a non-empty string');
    }

    if (!ALL_SUPPORTED_TYPES.includes(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}. Supported types: ${ALL_SUPPORTED_TYPES.join(', ')}`);
    }

    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${fileBuffer.length} bytes. Maximum size: ${MAX_FILE_SIZE} bytes (10MB)`);
    }

    if (!reportId || typeof reportId !== 'string' || !/^rep_[a-zA-Z0-9]{6}$/.test(reportId)) {
      throw new Error('Invalid report ID: must match report ID format (rep_XXXXXX)');
    }
  }

  /**
   * Validates business rules for the file
   * @param {Array} existingFiles - Array of existing files for the report
   * @throws {Error} If business rules are violated
   */
  validateBusinessRules(existingFiles = []) {
    // Check file count limit per report (10 files max)
    const reportFiles = existingFiles.filter(file => file.reportId === this.reportId);
    if (reportFiles.length >= 10) {
      throw new Error('Maximum 10 files allowed per report');
    }

    // Validate processing status
    if (!Object.values(PROCESSING_STATUS).includes(this.processingStatus)) {
      throw new Error(`Invalid processing status: ${this.processingStatus}`);
    }

    // Validate thumbnail URL is only present for images
    if (this.thumbnailUrl && !SUPPORTED_MIME_TYPES.images.includes(this.mimeType)) {
      throw new Error('Thumbnail URL is only allowed for image files');
    }
  }

  /**
   * Generates a public access URL for the file
   * @param {string} driveFileId - Google Drive file ID
   * @returns {string} Public URL
   */
  static generatePublicUrl(driveFileId) {
    if (!driveFileId || typeof driveFileId !== 'string') {
      throw new Error('Invalid Drive file ID');
    }
    return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
  }

  /**
   * Generates a thumbnail URL for image files
   * @param {string} driveFileId - Google Drive file ID
   * @returns {string|null} Thumbnail URL or null if not applicable
   */
  static generateThumbnailUrl(driveFileId) {
    if (!driveFileId || typeof driveFileId !== 'string') {
      throw new Error('Invalid Drive file ID');
    }
    return `https://drive.google.com/thumbnail?id=${driveFileId}&sz=s400`;
  }

  /**
   * Gets the file type category
   * @returns {string} File type category ('image', 'video', 'document')
   */
  getFileTypeCategory() {
    if (SUPPORTED_MIME_TYPES.images.includes(this.mimeType)) {
      return 'image';
    } else if (SUPPORTED_MIME_TYPES.videos.includes(this.mimeType)) {
      return 'video';
    } else if (SUPPORTED_MIME_TYPES.documents.includes(this.mimeType)) {
      return 'document';
    }
    return 'unknown';
  }

  /**
   * Checks if the file is an image
   * @returns {boolean} True if the file is an image
   */
  isImage() {
    return SUPPORTED_MIME_TYPES.images.includes(this.mimeType);
  }

  /**
   * Checks if the file is a video
   * @returns {boolean} True if the file is a video
   */
  isVideo() {
    return SUPPORTED_MIME_TYPES.videos.includes(this.mimeType);
  }

  /**
   * Checks if the file is a document
   * @returns {boolean} True if the file is a document
   */
  isDocument() {
    return SUPPORTED_MIME_TYPES.documents.includes(this.mimeType);
  }

  /**
   * Updates the processing status
   * @param {string} status - New processing status
   * @returns {File} Updated File instance
   */
  updateProcessingStatus(status) {
    if (!Object.values(PROCESSING_STATUS).includes(status)) {
      throw new Error(`Invalid processing status: ${status}`);
    }

    const updatedData = {
      ...this,
      processingStatus: status
    };

    return new File(updatedData);
  }

  /**
   * Converts the file to a Google Sheets row array
   * @returns {Array} Array of values for the sheet row
   */
  toSheetsRow() {
    return [
      this.id || '',
      this.reportId || '',
      this.originalName || '',
      this.mimeType || '',
      this.size || 0,
      this.driveFileId || '',
      this.driveUrl || '',
      this.thumbnailUrl || '',
      this.uploadedAt || '',
      this.uploadedByIp || '',
      this.processingStatus || ''
    ];
  }

  /**
   * Creates a File instance from a Google Sheets row array
   * @param {Array} row - Array of values from the sheet row
   * @returns {File} New File instance
   * @throws {Error} If row data is invalid
   */
  static fromSheetsRow(row) {
    if (!Array.isArray(row) || row.length < 11) {
      throw new Error('Invalid row data: must be an array with at least 11 elements');
    }

    const data = {
      id: row[0] || null,
      reportId: row[1] || null,
      originalName: row[2] || null,
      mimeType: row[3] || null,
      size: row[4] ? parseInt(row[4], 10) : null,
      driveFileId: row[5] || null,
      driveUrl: row[6] || null,
      thumbnailUrl: row[7] || null,
      uploadedAt: row[8] || null,
      uploadedByIp: row[9] || null,
      processingStatus: row[10] || null
    };

    // Filter out null values for required fields validation
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== null)
    );

    return new File(cleanData);
  }

  /**
   * Creates a new file record with generated ID and timestamps
   * @param {Object} data - Initial file data from upload
   * @param {string} [uploadedByIp] - Uploader's IP address
   * @returns {File} New File instance
   */
  static create(data, uploadedByIp = null) {
    const fileData = {
      ...data,
      id: File.generateId(),
      uploadedAt: new Date().toISOString(),
      uploadedByIp,
      processingStatus: PROCESSING_STATUS.PENDING
    };

    return new File(fileData);
  }

  /**
   * Gets the processing status enum values
   * @returns {Object} Status enumeration
   */
  static getProcessingStatusEnum() {
    return PROCESSING_STATUS;
  }

  /**
   * Gets supported MIME types
   * @returns {Object} Supported MIME types by category
   */
  static getSupportedMimeTypes() {
    return SUPPORTED_MIME_TYPES;
  }

  /**
   * Gets maximum file size
   * @returns {number} Maximum file size in bytes
   */
  static getMaxFileSize() {
    return MAX_FILE_SIZE;
  }
}

module.exports = File;