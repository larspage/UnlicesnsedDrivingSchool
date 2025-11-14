/**
 * Error Creation Utilities for Server-side Result Object Pattern
 * 
 * These utilities help create structured error objects that follow the
 * consistent error format used throughout the application.
 */

const { ERROR_CODES } = require('./errorCodes');

/**
 * Creates a structured error object for the Result pattern
 * @param {string} errorCode - Error code from ERROR_CODES
 * @param {string} message - Human-readable error message
 * @param {Object} details - Additional error context (optional)
 * @param {Error} innerError - Original error object for debugging (optional)
 * @returns {Object} Structured error object
 */
function createError(errorCode, message, details = {}, innerError = null) {
  return {
    code: errorCode,
    message,
    details,
    innerError
  };
}

/**
 * Creates a validation error
 * @param {string} field - Field that failed validation
 * @param {string} message - Validation error message
 * @param {*} actualValue - The actual value that failed validation
 * @param {string} expected - Expected format/type (optional)
 * @param {Error} innerError - Original validation error (optional)
 * @returns {Object} Structured validation error
 */
function validationError(field, message, actualValue, expected = null, innerError = null) {
  const details = { field, actualValue };
  if (expected !== null) {
    details.expected = expected;
  }
  
  return createError(ERROR_CODES.VALIDATION_ERROR, message, details, innerError);
}

/**
 * Creates a "not found" error
 * @param {string} resourceType - Type of resource (e.g., 'user', 'config')
 * @param {string} resourceId - ID or identifier of the resource
 * @param {Error} innerError - Original error (optional)
 * @returns {Object} Structured not found error
 */
function notFoundError(resourceType, resourceId, innerError = null) {
  return createError(
    ERROR_CODES.NOT_FOUND,
    `${resourceType} with ID '${resourceId}' not found`,
    { resourceType, resourceId },
    innerError
  );
}

/**
 * Creates a file operation error
 * @param {string} operation - File operation (e.g., 'upload', 'delete')
 * @param {string} reason - Reason for failure
 * @param {Object} details - Additional file operation details
 * @param {Error} innerError - Original error (optional)
 * @returns {Object} Structured file operation error
 */
function fileError(operation, reason, details = {}, innerError = null) {
  let errorCode;
  switch (operation) {
    case 'upload':
      errorCode = ERROR_CODES.FILE_UPLOAD_FAILED;
      break;
    case 'delete':
      errorCode = ERROR_CODES.FILE_SYSTEM_ERROR;
      break;
    case 'notFound':
      errorCode = ERROR_CODES.FILE_NOT_FOUND;
      break;
    case 'tooLarge':
      errorCode = ERROR_CODES.FILE_TOO_LARGE;
      break;
    case 'typeNotSupported':
      errorCode = ERROR_CODES.FILE_TYPE_NOT_SUPPORTED;
      break;
    default:
      errorCode = ERROR_CODES.FILE_SYSTEM_ERROR;
  }
  
  return createError(errorCode, `File ${operation} failed: ${reason}`, { operation, ...details }, innerError);
}

/**
 * Creates a database/storage error
 * @param {string} operation - Database operation that failed
 * @param {string} reason - Reason for failure
 * @param {Object} details - Additional database context
 * @param {Error} innerError - Original error (optional)
 * @returns {Object} Structured database error
 */
function databaseError(operation, reason, details = {}, innerError = null) {
  return createError(
    ERROR_CODES.DATABASE_ERROR,
    `Database ${operation} failed: ${reason}`,
    { operation, ...details },
    innerError
  );
}

/**
 * Creates an authentication/authorization error
 * @param {string} type - 'authentication' or 'authorization'
 * @param {string} message - Error message
 * @param {Object} details - Additional context
 * @param {Error} innerError - Original error (optional)
 * @returns {Object} Structured auth error
 */
function authError(type, message, details = {}, innerError = null) {
  const errorCode = type === 'authentication' 
    ? ERROR_CODES.AUTHENTICATION_ERROR 
    : ERROR_CODES.AUTHORIZATION_ERROR;
    
  return createError(errorCode, message, { type, ...details }, innerError);
}

/**
 * Creates a configuration error
 * @param {string} configKey - Configuration key that failed
 * @param {string} reason - Reason for failure
 * @param {Object} details - Additional config context
 * @param {Error} innerError - Original error (optional)
 * @returns {Object} Structured configuration error
 */
function configError(configKey, reason, details = {}, innerError = null) {
  return createError(
    ERROR_CODES.CONFIGURATION_ERROR,
    `Configuration error for '${configKey}': ${reason}`,
    { configKey, ...details },
    innerError
  );
}

/**
 * Creates a system error
 * @param {string} operation - Operation that failed
 * @param {string} reason - Reason for failure
 * @param {Object} details - Additional system context
 * @param {Error} innerError - Original error (optional)
 * @returns {Object} Structured system error
 */
function systemError(operation, reason, details = {}, innerError = null) {
  return createError(
    ERROR_CODES.SYSTEM_ERROR,
    `System ${operation} failed: ${reason}`,
    { operation, ...details },
    innerError
  );
}

/**
 * Validates that a value exists and is not empty/null/undefined
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {string} expectedType - Expected type for error messages
 * @returns {Object} Validation error if invalid, null if valid
 */
function validateRequired(value, fieldName, expectedType = 'non-empty string') {
  if (value === null || value === undefined || value === '') {
    return validationError(
      fieldName,
      `${fieldName} is required`,
      value,
      expectedType
    );
  }
  
  if (typeof value !== 'string' && expectedType.includes('string')) {
    return validationError(
      fieldName,
      `${fieldName} must be a ${expectedType}`,
      value,
      expectedType
    );
  }
  
  return null;
}

/**
 * Validates that a string value meets minimum length requirements
 * @param {string} value - String value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @param {number} minLength - Minimum required length
 * @returns {Object} Validation error if invalid, null if valid
 */
function validateStringLength(value, fieldName, minLength = 1) {
  if (!value || typeof value !== 'string' || value.length < minLength) {
    return validationError(
      fieldName,
      `${fieldName} must be at least ${minLength} characters long`,
      value,
      `string with minimum ${minLength} characters`
    );
  }
  
  return null;
}

module.exports = {
  createError,
  validationError,
  notFoundError,
  fileError,
  databaseError,
  authError,
  configError,
  systemError,
  validateRequired,
  validateStringLength,
  ERROR_CODES
};