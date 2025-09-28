/**
 * Validation Utilities for NJDSC School Compliance Portal
 *
 * Provides field-level validation, business rule validation,
 * input sanitization, and error formatting utilities.
 */

const Joi = require('joi');

/**
 * Validates an email address
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates a US phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // Check for valid US phone number patterns
  const usPhoneRegex = /^1?\d{10}$/;
  return usPhoneRegex.test(digitsOnly);
}

/**
 * Formats a phone number to standard US format
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number or original if invalid
 */
function formatPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return phone;
  }

  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    const number = digitsOnly.slice(1);
    return `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
  }

  return phone; // Return original if can't format
}

/**
 * Converts phone number to E.164 format
 * @param {string} phone - Phone number to convert
 * @returns {string} E.164 formatted number or original if invalid
 */
function toE164PhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return phone;
  }

  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }

  return phone; // Return original if can't convert
}

/**
 * Validates a URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

/**
 * Normalizes a URL by adding https:// if missing
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return url;
  }

  const trimmed = url.trim();

  if (!trimmed) {
    return trimmed;
  }

  // Add https:// if no protocol specified
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

/**
 * Validates an IP address (IPv4 or IPv6)
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid
 */
function validateIpAddress(ip) {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  if (ipv4Regex.test(ip)) {
    // Validate IPv4 ranges
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  return ipv6Regex.test(ip);
}

/**
 * Sanitizes a string by trimming and removing potentially harmful characters
 * @param {string} str - String to sanitize
 * @param {Object} options - Sanitization options
 * @param {boolean} options.allowHtml - Whether to allow HTML tags
 * @param {number} options.maxLength - Maximum length
 * @returns {string} Sanitized string
 */
function sanitizeString(str, options = {}) {
  if (!str || typeof str !== 'string') {
    return str;
  }

  let sanitized = str.trim();

  // Remove null bytes and other control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // Remove potentially dangerous characters if HTML not allowed
  if (!options.allowHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Apply max length if specified
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized.trim();
}

/**
 * Validates business rules for duplicate reports
 * @param {string} schoolName - School name to check
 * @param {Array} existingReports - Array of existing reports
 * @returns {Object} Validation result with isValid and error message
 */
function validateDuplicateReport(schoolName, existingReports) {
  if (!schoolName || typeof schoolName !== 'string') {
    return { isValid: false, error: 'School name is required' };
  }

  const normalizedName = schoolName.toLowerCase().trim();
  const duplicate = existingReports.find(report =>
    report.schoolName && report.schoolName.toLowerCase().trim() === normalizedName
  );

  if (duplicate) {
    return {
      isValid: false,
      error: `A report for "${schoolName}" already exists (ID: ${duplicate.id})`
    };
  }

  return { isValid: true };
}

/**
 * Validates file upload parameters
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original filename
 * @param {string} mimeType - MIME type
 * @param {Array} allowedTypes - Array of allowed MIME types
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {Object} Validation result with isValid and error message
 */
function validateFileUpload(fileBuffer, fileName, mimeType, allowedTypes = [], maxSize = 10 * 1024 * 1024) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    return { isValid: false, error: 'Invalid file buffer' };
  }

  if (!fileName || typeof fileName !== 'string' || fileName.trim().length === 0) {
    return { isValid: false, error: 'Invalid filename' };
  }

  if (!mimeType || typeof mimeType !== 'string') {
    return { isValid: false, error: 'Invalid MIME type' };
  }

  if (allowedTypes.length > 0 && !allowedTypes.includes(mimeType)) {
    return { isValid: false, error: `File type ${mimeType} not allowed. Allowed types: ${allowedTypes.join(', ')}` };
  }

  if (fileBuffer.length > maxSize) {
    return {
      isValid: false,
      error: `File size ${fileBuffer.length} bytes exceeds maximum ${maxSize} bytes`
    };
  }

  return { isValid: true };
}

/**
 * Formats validation errors from Joi
 * @param {Object} error - Joi validation error
 * @returns {string} Formatted error message
 */
function formatValidationError(error) {
  if (!error || !error.details || !Array.isArray(error.details)) {
    return 'Validation failed';
  }

  const messages = error.details.map(detail => {
    // Convert Joi field names to human-readable format
    let fieldName = detail.path.join('.');
    fieldName = fieldName.replace(/([A-Z])/g, ' $1').toLowerCase();
    fieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);

    return `${fieldName}: ${detail.message}`;
  });

  return messages.join('; ');
}

/**
 * Creates a standardized validation result object
 * @param {boolean} isValid - Whether validation passed
 * @param {string} error - Error message if validation failed
 * @param {*} data - Validated data if successful
 * @returns {Object} Standardized result
 */
function createValidationResult(isValid, error = null, data = null) {
  return {
    isValid,
    error,
    data
  };
}

/**
 * Validates a report ID format
 * @param {string} id - Report ID to validate
 * @returns {boolean} True if valid format
 */
function validateReportId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }

  const reportIdRegex = /^rep_[a-zA-Z0-9]{6}$/;
  return reportIdRegex.test(id);
}

/**
 * Validates a file ID format
 * @param {string} id - File ID to validate
 * @returns {boolean} True if valid format
 */
function validateFileId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }

  const fileIdRegex = /^file_[a-zA-Z0-9]{6}$/;
  return fileIdRegex.test(id);
}

/**
 * Validates a Google Drive file ID format
 * @param {string} id - Drive file ID to validate
 * @returns {boolean} True if valid format
 */
function validateDriveFileId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Google Drive file IDs are typically 28-33 characters long and contain alphanumeric characters
  return /^[a-zA-Z0-9_-]{10,50}$/.test(id);
}

/**
 * Validates a Google Sheets spreadsheet ID format
 * @param {string} id - Spreadsheet ID to validate
 * @returns {boolean} True if valid format
 */
function validateSpreadsheetId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Google Sheets IDs are similar to Drive IDs
  return validateDriveFileId(id);
}

/**
 * Sanitizes HTML content by removing dangerous tags and attributes
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') {
    return html;
  }

  // Remove script tags and their contents
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/ on\w+="[^"]*"/gi, '');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:[^"']*/gi, '');

  return sanitized;
}

/**
 * Validates JSON string
 * @param {string} jsonString - JSON string to validate
 * @returns {boolean} True if valid JSON
 */
function validateJsonString(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    return false;
  }

  try {
    JSON.parse(jsonString);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Safely parses JSON string with error handling
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed object or default value
 */
function safeJsonParse(jsonString, defaultValue = null) {
  if (!jsonString || typeof jsonString !== 'string') {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', jsonString, error.message);
    return defaultValue;
  }
}

module.exports = {
  // Field validation functions
  validateEmail,
  validatePhoneNumber,
  validateUrl,
  validateIpAddress,
  validateReportId,
  validateFileId,
  validateDriveFileId,
  validateSpreadsheetId,
  validateJsonString,

  // Formatting and conversion functions
  formatPhoneNumber,
  toE164PhoneNumber,
  normalizeUrl,

  // Sanitization functions
  sanitizeString,
  sanitizeHtml,

  // Business rule validation
  validateDuplicateReport,
  validateFileUpload,

  // Utility functions
  formatValidationError,
  createValidationResult,
  safeJsonParse
};