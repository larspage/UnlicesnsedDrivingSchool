// Result Object Pattern Types
// This module provides standardized Result object types for consistent error handling

export interface ResultError {
  code: string;        // Error category (e.g., 'VALIDATION_ERROR', 'NOT_FOUND', 'DATABASE_ERROR')
  message: string;     // Human-readable error message
  details?: any;       // Additional error context (optional)
  innerError: Error;   // Original error object for logging/debugging
}

export interface Result<T = any> {
  success: boolean;    // true if operation succeeded, false if failed
  data: T | null;      // The returned data on success; null on failure
  error: ResultError | null;  // Only populated on failure
}

export interface ResultSuccess<T> extends Result<T> {
  success: true;
  data: T;
  error: null;
}

export interface ResultFailure extends Result<null> {
  success: false;
  data: null;
  error: ResultError;
}

export type AnyResult = ResultSuccess<any> | ResultFailure;