// Result Object Pattern Utilities for Node.js Server
const { ERROR_CODES } = require('./errorCodes');
// This module provides utility functions for creating and working with Result objects

/**
 * Creates a successful Result object
 */
function success(data) {
  return {
    success: true,
    data,
    error: null
  };
}

/**
 * Creates a failed Result object
 */
function failure(code, message, innerError, details) {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
      innerError
    }
  };
}

/**
 * Creates a Result object from a try-catch block
 */
function attempt(operation, context = { operation: 'unknown' }) {
  try {
    const data = operation();
    return success(data);
  } catch (error) {
    const typedError = error instanceof Error ? error : new Error(String(error));
    const errorCode = getErrorCode(typedError, context.operation);
    return failure(
      errorCode,
      typedError.message,
      typedError,
      { ...context.details, operation: context.operation }
    );
  }
}

/**
 * Creates a Result object from an async try-catch block
 */
async function attemptAsync(operation, context = { operation: 'unknown' }) {
  try {
    const data = await operation();
    return success(data);
  } catch (error) {
    const typedError = error instanceof Error ? error : new Error(String(error));
    
    // 🎯 CRITICAL FIX: Check if this is already a structured error from our error utilities
    if (error && typeof error === 'object' && error.code && typeof error.code === 'string') {
      // This is a structured error from our error utilities - preserve everything
      const innerError = error.innerError || error; // Use innerError if exists, otherwise use the structured error itself
      return failure(
        error.code,
        error.message,
        innerError,
        { ...error.details, ...context.details, operation: context.operation }
      );
    }
    
    // This is an unstructured error - use error code detection
    const errorCode = getErrorCode(typedError, context.operation);
    return failure(
      errorCode,
      typedError.message,
      typedError,
      { ...context.details, operation: context.operation }
    );
  }
}

/**
 * Determines the appropriate error code based on the error and context
 */
function getErrorCode(error, operation) {
  // 🎯 CRITICAL FIX: Check if error already has a structured error code
  if (error && typeof error === 'object' && error.code && typeof error.code === 'string') {
    return error.code; // Use the pre-existing error code from structured error objects
  }
  
  const errorMessage = error.message ? error.message.toLowerCase() : '';
  
  // Operation-specific error code mapping
  switch (operation.toLowerCase()) {
    case 'validation':
    case 'validate':
      return ERROR_CODES.VALIDATION_ERROR;
    
    case 'find':
    case 'get':
      if (errorMessage.includes('not found') || errorMessage.includes('no such file')) {
        return ERROR_CODES.NOT_FOUND;
      }
      return ERROR_CODES.DATABASE_ERROR;
    
    case 'create':
    case 'insert':
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        return ERROR_CODES.ALREADY_EXISTS;
      }
      return ERROR_CODES.DATABASE_ERROR;
    
    case 'update':
    case 'save':
      return ERROR_CODES.DATABASE_ERROR;
    
    case 'delete':
      return ERROR_CODES.DATABASE_ERROR;
    
    case 'auth':
    case 'login':
    case 'authenticate':
      if (errorMessage.includes('invalid') || errorMessage.includes('wrong')) {
        return ERROR_CODES.AUTHENTICATION_ERROR;
      }
      if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        return ERROR_CODES.AUTHORIZATION_ERROR;
      }
      return ERROR_CODES.AUTHENTICATION_ERROR;
    
    case 'file':
    case 'upload':
    case 'download':
      if (errorMessage.includes('not found') || errorMessage.includes('no such file')) {
        return ERROR_CODES.FILE_NOT_FOUND;
      }
      if (operation.toLowerCase() === 'upload' && (errorMessage.includes('permission') || errorMessage.includes('access denied') || errorMessage.includes('eacces'))) {
        return ERROR_CODES.FILE_UPLOAD_FAILED;
      }
      if (errorMessage.includes('permission') || errorMessage.includes('access denied')) {
        return ERROR_CODES.FILE_SYSTEM_ERROR;
      }
      return ERROR_CODES.FILE_SYSTEM_ERROR;
    
    case 'email':
    case 'send':
      return ERROR_CODES.EMAIL_ERROR;
    
    case 'config':
    case 'configuration':
      return ERROR_CODES.CONFIGURATION_ERROR;
    
    default:
      // Generic error code based on error message patterns
      if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        return ERROR_CODES.NETWORK_ERROR;
      }
      if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        return ERROR_CODES.AUTHORIZATION_ERROR;
      }
      if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
        return ERROR_CODES.VALIDATION_ERROR;
      }
      return ERROR_CODES.SYSTEM_ERROR;
  }
}

/**
 * Utility function to check if a Result is successful
 */
function isSuccess(result) {
  return result.success;
}

/**
 * Utility function to check if a Result is a failure
 */
function isFailure(result) {
  return !result.success;
}

/**
 * Utility function to unwrap a Result, throwing if it's a failure
 */
function unwrap(result) {
  if (!result.success) {
    throw new Error(`Unwrapping failed Result: ${result.error.message}`, {
      cause: result.error.innerError
    });
  }
  return result.data;
}

/**
 * Utility function to unwrap a Result with a fallback value
 */
function unwrapOr(result, fallback) {
  return result.success ? result.data : fallback;
}

/**
 * Maps a successful Result to a new value
 */
function map(result, fn) {
  if (!result.success) {
    return result;
  }
  return success(fn(result.data));
}

/**
 * Chains Result operations - if the first is successful, applies the second function
 */
function chain(result, fn) {
  if (!result.success) {
    return result;
  }
  return fn(result.data);
}

/**
 * Creates a Result that contains either the success value or the failure error
 */
function fromTry(operation) {
  return attempt(operation, { operation: 'fromTry' });
}

/**
 * Creates a Result that contains either the async success value or the failure error
 */
async function fromTryAsync(operation) {
  return attemptAsync(operation, { operation: 'fromTryAsync' });
}

/**
 * Validates input and returns a Result with validation error if invalid
 */
function validateInput(value, validator, errorMessage = 'Invalid input', details) {
  if (validator(value)) {
    return success(value);
  }
  return failure(
    ERROR_CODES.VALIDATION_ERROR,
    errorMessage,
    new Error(errorMessage),
    details
  );
}

/**
 * Translates a Result object to an HTTP response
 * This is the key function that decouples business logic from HTTP concerns
 */
function toHttpResponse(result, res) {
  if (result.error) {
    // Map error codes to HTTP status codes
    const statusCode = getHttpStatusCode(result.error.code);
    return res.status(statusCode).json({
      error: {
        code: result.error.code,
        message: result.error.message,
        details: result.error.details
      }
    });
  }
  
  // Success case
  return res.json({ data: result.data });
}

/**
 * HTTP status code mapping for Result error codes
 */
const HTTP_STATUS_MAP = {
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 400,
  [ERROR_CODES.INVALID_FORMAT]: 400,
  [ERROR_CODES.INVALID_INPUT]: 400,
  [ERROR_CODES.INVALID_OPERATION]: 400,
  [ERROR_CODES.CONFLICT]: 400,
  [ERROR_CODES.STATE_MISMATCH]: 400,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.FILE_NOT_FOUND]: 404,
  [ERROR_CODES.CONFIGURATION_MIGRATION_FAILED]: 404,
  [ERROR_CODES.ALREADY_EXISTS]: 409,
  [ERROR_CODES.FILE_TOO_LARGE]: 413,
  [ERROR_CODES.FILE_TYPE_NOT_SUPPORTED]: 415,
  [ERROR_CODES.AUTHENTICATION_ERROR]: 401,
  [ERROR_CODES.AUTHORIZATION_ERROR]: 403,
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 403,
  [ERROR_CODES.OPERATION_NOT_ALLOWED]: 403,
  [ERROR_CODES.RATE_LIMIT_ERROR]: 429,
  [ERROR_CODES.SERVICE_OVERLOADED]: 429,
  [ERROR_CODES.DATABASE_ERROR]: 500,
  [ERROR_CODES.FILE_SYSTEM_ERROR]: 500,
  [ERROR_CODES.NETWORK_ERROR]: 500,
  [ERROR_CODES.CONFIGURATION_ERROR]: 500,
  [ERROR_CODES.EMAIL_ERROR]: 500,
  [ERROR_CODES.SYSTEM_ERROR]: 500,
  [ERROR_CODES.DEPENDENCY_ERROR]: 500,
  [ERROR_CODES.BUSINESS_LOGIC_ERROR]: 500,
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 500,
  [ERROR_CODES.SERVICE_TIMEOUT]: 500,
  [ERROR_CODES.FILE_UPLOAD_FAILED]: 500,
  [ERROR_CODES.FILE_DOWNLOAD_FAILED]: 500,
  [ERROR_CODES.FILE_PROCESSING_FAILED]: 500,
  [ERROR_CODES.DATA_CORRUPTION]: 500,
  [ERROR_CODES.DATA_INCONSISTENCY]: 500,
  [ERROR_CODES.CONSTRAINT_VIOLATION]: 500,
  [ERROR_CODES.MISSING_CONFIGURATION]: 500,
  [ERROR_CODES.INVALID_CONFIGURATION]: 500
};

/**
 * Get HTTP status code for error code
 */
function getHttpStatusCode(errorCode) {
  return HTTP_STATUS_MAP[errorCode] || 500;
}

/**
 * Handle async route wrapper - automatically wraps route handlers with Result pattern
 */
function asyncRouteHandler(handler) {
  return async (req, res, next) => {
    try {
      const result = await handler(req, res, next);
      // If the handler returns a Result, translate it to HTTP response
      if (result && typeof result === 'object' && 'success' in result) {
        return toHttpResponse(result, res);
      }
      // If the handler returns data directly, treat as success
      return res.json({ data: result });
    } catch (error) {
      // Wrap any unhandled errors in a Result
      const result = failure(
        ERROR_CODES.SYSTEM_ERROR,
        'An unexpected error occurred',
        error,
        { operation: req.path, method: req.method }
      );
      return toHttpResponse(result, res);
    }
  };
}

/**
 * Create a result from a database operation with proper error handling
 */
function fromDatabaseOperation(operation, operationName) {
  return attempt(operation, { 
    operation: operationName,
    details: { type: 'database' }
  });
}

/**
 * Create a result from a file operation with proper error handling
 */
function fromFileOperation(operation, operationName) {
  return attempt(operation, { 
    operation: operationName,
    details: { type: 'file' }
  });
}

/**
 * Create a result from a configuration operation with proper error handling
 */
function fromConfigOperation(operation, operationName) {
  return attempt(operation, { 
    operation: operationName,
    details: { type: 'config' }
  });
}

module.exports = {
  success,
  failure,
  attempt,
  attemptAsync,
  isSuccess,
  isFailure,
  unwrap,
  unwrapOr,
  map,
  chain,
  fromTry,
  fromTryAsync,
  validateInput,
  toHttpResponse,
  getHttpStatusCode,
  asyncRouteHandler,
  fromDatabaseOperation,
  fromFileOperation,
  fromConfigOperation
};