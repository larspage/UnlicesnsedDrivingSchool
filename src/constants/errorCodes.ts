// Error Code Constants for Result Object Pattern
// These constants standardize error codes across the entire application

// Main error codes object
export const ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_OPERATION: 'INVALID_OPERATION',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  STATE_MISMATCH: 'STATE_MISMATCH',
  
  // Permission errors
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // System errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  EMAIL_ERROR: 'EMAIL_ERROR',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  
  // Business logic errors
  DEPENDENCY_ERROR: 'DEPENDENCY_ERROR',
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  
  // Service-specific errors
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  SERVICE_TIMEOUT: 'SERVICE_TIMEOUT',
  SERVICE_OVERLOADED: 'SERVICE_OVERLOADED',
  
  // File operation errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TYPE_NOT_SUPPORTED: 'FILE_TYPE_NOT_SUPPORTED',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  FILE_DOWNLOAD_FAILED: 'FILE_DOWNLOAD_FAILED',
  FILE_PROCESSING_FAILED: 'FILE_PROCESSING_FAILED',
  
  // Data integrity errors
  DATA_CORRUPTION: 'DATA_CORRUPTION',
  DATA_INCONSISTENCY: 'DATA_INCONSISTENCY',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  
  // Configuration errors
  MISSING_CONFIGURATION: 'MISSING_CONFIGURATION',
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  CONFIGURATION_MIGRATION_FAILED: 'CONFIGURATION_MIGRATION_FAILED'
} as const;

// Type definition for error codes
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// HTTP Status code mapping for error codes
export const HTTP_STATUS_CODES: Record<string, number> = {
  // 400 Bad Request
  'VALIDATION_ERROR': 400,
  'MISSING_REQUIRED_FIELD': 400,
  'INVALID_FORMAT': 400,
  'INVALID_INPUT': 400,
  'INVALID_OPERATION': 400,
  'CONFLICT': 400,
  'STATE_MISMATCH': 400,
  
  // 401 Unauthorized
  'AUTHENTICATION_ERROR': 401,
  
  // 403 Forbidden
  'AUTHORIZATION_ERROR': 403,
  'INSUFFICIENT_PERMISSIONS': 403,
  'OPERATION_NOT_ALLOWED': 403,
  
  // 404 Not Found
  'NOT_FOUND': 404,
  'FILE_NOT_FOUND': 404,
  'CONFIGURATION_MIGRATION_FAILED': 404,
  
  // 409 Conflict
  'ALREADY_EXISTS': 409,
  
  // 413 Payload Too Large
  'FILE_TOO_LARGE': 413,
  
  // 415 Unsupported Media Type
  'FILE_TYPE_NOT_SUPPORTED': 415,
  
  // 429 Too Many Requests
  'RATE_LIMIT_ERROR': 429,
  'SERVICE_OVERLOADED': 429,
  
  // 500 Internal Server Error
  'DATABASE_ERROR': 500,
  'FILE_SYSTEM_ERROR': 500,
  'NETWORK_ERROR': 500,
  'CONFIGURATION_ERROR': 500,
  'EMAIL_ERROR': 500,
  'SYSTEM_ERROR': 500,
  'DEPENDENCY_ERROR': 500,
  'BUSINESS_LOGIC_ERROR': 500,
  'SERVICE_UNAVAILABLE': 500,
  'SERVICE_TIMEOUT': 500,
  'FILE_UPLOAD_FAILED': 500,
  'FILE_DOWNLOAD_FAILED': 500,
  'FILE_PROCESSING_FAILED': 500,
  'DATA_CORRUPTION': 500,
  'DATA_INCONSISTENCY': 500,
  'CONSTRAINT_VIOLATION': 500,
  'MISSING_CONFIGURATION': 500,
  'INVALID_CONFIGURATION': 500
} as const;

// User-friendly error message templates
export const ERROR_MESSAGES: Record<string, string> = {
  // Validation errors
  'VALIDATION_ERROR': 'The provided data is invalid. Please check your input and try again.',
  'MISSING_REQUIRED_FIELD': 'A required field is missing. Please provide all necessary information.',
  'INVALID_FORMAT': 'The data format is invalid. Please check the format and try again.',
  'INVALID_INPUT': 'The input provided is invalid. Please review and correct your input.',
  'INVALID_OPERATION': 'This operation is not allowed. Please check the current state and try again.',
  
  // Resource errors
  'NOT_FOUND': 'The requested resource was not found.',
  'ALREADY_EXISTS': 'The resource already exists.',
  'CONFLICT': 'A conflict occurred. The resource may have been modified by another process.',
  'STATE_MISMATCH': 'The current state does not allow this operation.',
  
  // Permission errors
  'AUTHENTICATION_ERROR': 'Authentication failed. Please check your credentials and try again.',
  'AUTHORIZATION_ERROR': 'You do not have permission to perform this action.',
  'INSUFFICIENT_PERMISSIONS': 'Your account does not have sufficient permissions for this operation.',
  
  // System errors
  'DATABASE_ERROR': 'A database error occurred. Please try again later.',
  'FILE_SYSTEM_ERROR': 'A file system error occurred. Please try again later.',
  'NETWORK_ERROR': 'A network error occurred. Please check your connection and try again.',
  'CONFIGURATION_ERROR': 'A configuration error occurred. Please contact support.',
  'RATE_LIMIT_ERROR': 'Too many requests. Please wait before trying again.',
  'EMAIL_ERROR': 'An email error occurred. Please try again later.',
  'SYSTEM_ERROR': 'An unexpected system error occurred. Please try again later.',
  
  // Business logic errors
  'DEPENDENCY_ERROR': 'A dependency error occurred. Please check the related data and try again.',
  'BUSINESS_LOGIC_ERROR': 'A business logic error occurred. Please check the operation and try again.',
  'OPERATION_NOT_ALLOWED': 'This operation is not allowed in the current context.',
  
  // Service errors
  'SERVICE_UNAVAILABLE': 'The service is temporarily unavailable. Please try again later.',
  'SERVICE_TIMEOUT': 'The service request timed out. Please try again.',
  'SERVICE_OVERLOADED': 'The service is currently overloaded. Please try again later.',
  
  // File errors
  'FILE_NOT_FOUND': 'The requested file was not found.',
  'FILE_TOO_LARGE': 'The file is too large. Please choose a smaller file.',
  'FILE_TYPE_NOT_SUPPORTED': 'This file type is not supported.',
  'FILE_UPLOAD_FAILED': 'The file upload failed. Please try again.',
  'FILE_DOWNLOAD_FAILED': 'The file download failed. Please try again.',
  'FILE_PROCESSING_FAILED': 'The file processing failed. Please try again.',
  
  // Data errors
  'DATA_CORRUPTION': 'Data corruption was detected. Please contact support.',
  'DATA_INCONSISTENCY': 'Data inconsistency was detected. Please contact support.',
  'CONSTRAINT_VIOLATION': 'A data constraint was violated. Please check your input.',
  
  // Configuration errors
  'MISSING_CONFIGURATION': 'A required configuration setting is missing.',
  'INVALID_CONFIGURATION': 'The configuration is invalid. Please check the settings.',
  'CONFIGURATION_MIGRATION_FAILED': 'Configuration migration failed. Please contact support.'
} as const;

// Utility function to get user-friendly error message
export function getErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || 'An unexpected error occurred. Please try again.';
}

// Utility function to get HTTP status code for error
export function getHttpStatusCode(errorCode: string): number {
  return HTTP_STATUS_CODES[errorCode] || 500;
}

// Utility functions to check error categories
export function isValidationError(errorCode: string): boolean {
  const validationErrors = [
    'VALIDATION_ERROR',
    'MISSING_REQUIRED_FIELD',
    'INVALID_FORMAT',
    'INVALID_INPUT',
    'INVALID_OPERATION'
  ];
  return validationErrors.includes(errorCode);
}

export function isResourceError(errorCode: string): boolean {
  const resourceErrors = [
    'NOT_FOUND',
    'ALREADY_EXISTS',
    'CONFLICT',
    'STATE_MISMATCH'
  ];
  return resourceErrors.includes(errorCode);
}

export function isPermissionError(errorCode: string): boolean {
  const permissionErrors = [
    'AUTHENTICATION_ERROR',
    'AUTHORIZATION_ERROR',
    'INSUFFICIENT_PERMISSIONS'
  ];
  return permissionErrors.includes(errorCode);
}

export function isSystemError(errorCode: string): boolean {
  const systemErrors = [
    'DATABASE_ERROR',
    'FILE_SYSTEM_ERROR',
    'NETWORK_ERROR',
    'CONFIGURATION_ERROR',
    'RATE_LIMIT_ERROR',
    'EMAIL_ERROR',
    'SYSTEM_ERROR'
  ];
  return systemErrors.includes(errorCode);
}

export function isFileError(errorCode: string): boolean {
  const fileErrors = [
    'FILE_NOT_FOUND',
    'FILE_TOO_LARGE',
    'FILE_TYPE_NOT_SUPPORTED',
    'FILE_UPLOAD_FAILED',
    'FILE_DOWNLOAD_FAILED',
    'FILE_PROCESSING_FAILED'
  ];
  return fileErrors.includes(errorCode);
}