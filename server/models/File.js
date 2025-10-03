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
   * @param {string} data.localFilePath - Local file system path
   * @param {string} data.publicUrl - Public access URL
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
    this.localFilePath = validatedData.localFilePath;
    this.publicUrl = validatedData.publicUrl;
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
      localFilePath: Joi.string().required(),
      publicUrl: Joi.string().pattern(/^\/uploads\//).required(),
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
   * @returns {Object} Validation result with isValid and error message
   */
  static validateUploadParams(fileBuffer, fileName, mimeType, reportId) {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      return { isValid: false, error: 'Invalid file buffer: must be a Buffer' };
    }

    if (!fileName || typeof fileName !== 'string' || fileName.trim().length === 0) {
      return { isValid: false, error: 'Invalid filename: must be a non-empty string' };
    }

    if (!mimeType || typeof mimeType !== 'string') {
      return { isValid: false, error: 'Invalid MIME type: must be a non-empty string' };
    }

    if (!ALL_SUPPORTED_TYPES.includes(mimeType)) {
      return { isValid: false, error: `Unsupported file type: ${mimeType}. Supported types: ${ALL_SUPPORTED_TYPES.join(', ')}` };
    }

    if (fileBuffer.length > MAX_FILE_SIZE) {
      return { isValid: false, error: `File too large: ${fileBuffer.length} bytes. Maximum size: ${MAX_FILE_SIZE} bytes (10MB)` };
    }

    if (!reportId || typeof reportId !== 'string' || !/^rep_[a-zA-Z0-9]{6}$/.test(reportId)) {
      return { isValid: false, error: 'Invalid report ID: must match report ID format (rep_XXXXXX)' };
    }

    return { isValid: true };
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
   * @param {string} localFilePath - Local file path relative to uploads directory
   * @returns {string} Public URL
   */
  static generatePublicUrl(localFilePath) {
    if (!localFilePath || typeof localFilePath !== 'string') {
      throw new Error('Invalid local file path');
    }
    // If path already starts with uploads/, just add leading slash
    if (localFilePath.startsWith('uploads/')) {
      return `/${localFilePath}`;
    }
    // Remove any leading slashes and ensure it starts with /uploads/
    const cleanPath = localFilePath.replace(/^\/+/, '');
    return `/uploads/${cleanPath}`;
  }

  /**
   * Generates a thumbnail URL for image files
   * @param {string} localFilePath - Local file path relative to uploads directory
   * @returns {string|null} Thumbnail URL or null if not applicable
   */
  static generateThumbnailUrl(localFilePath) {
    if (!localFilePath || typeof localFilePath !== 'string') {
      throw new Error('Invalid local file path');
    }
    // For now, return the same URL as the main file (thumbnail generation not implemented yet)
    return File.generatePublicUrl(localFilePath);
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