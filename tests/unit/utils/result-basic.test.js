/**
 * Simple test to verify Result Object pattern is working correctly
 */
const { attemptAsync, isSuccess, isFailure, success, failure } = require('../../../server/utils/result');
const { createError, validationError, notFoundError, ERROR_CODES } = require('../../../server/utils/errorUtils');

describe('Result Object Pattern - Basic Tests', () => {
  test('should work with successful operations', async () => {
    const result = await attemptAsync(async () => {
      return { data: 'test data' };
    }, { operation: 'test' });
    
    expect(isSuccess(result)).toBe(true);
    expect(isFailure(result)).toBe(false);
    expect(result.data).toEqual({ data: 'test data' });
    expect(result.error).toBeNull();
  });

  test('should work with error operations', async () => {
    const testError = createError('VALIDATION_ERROR', 'Test validation error', { field: 'test' });
    
    const result = await attemptAsync(async () => {
      throw testError;
    }, { operation: 'test' });
    
    expect(isSuccess(result)).toBe(false);
    expect(isFailure(result)).toBe(true);
    expect(result.data).toBeNull();
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.message).toBe('Test validation error');
    expect(result.error.details).toEqual({ field: 'test', operation: 'test' });
    expect(result.error.innerError).toBe(testError);
  });

  test('should handle validation errors correctly', async () => {
    const validationErr = validationError('Field', null, 'non-empty string');
    
    const result = await attemptAsync(async () => {
      throw validationErr;
    }, { operation: 'validationTest' });
    
    expect(isSuccess(result)).toBe(false);
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.details.field).toBe('Field');
  });

  test('should handle not found errors correctly', async () => {
    const notFoundErr = notFoundError('File', 'file_123');
    
    const result = await attemptAsync(async () => {
      throw notFoundErr;
    }, { operation: 'notFoundTest' });
    
    expect(isSuccess(result)).toBe(false);
    expect(result.error.code).toBe('NOT_FOUND');
    expect(result.error.details.resourceType).toBe('File');
    expect(result.error.details.resourceId).toBe('file_123');
  });

  test('should handle direct success/failure returns', () => {
    const successResult = success({ data: 'test' });
    const failureResult = failure(createError('SYSTEM_ERROR', 'System error'));
    
    expect(isSuccess(successResult)).toBe(true);
    expect(isSuccess(failureResult)).toBe(false);
    expect(isFailure(successResult)).toBe(false);
    expect(isFailure(failureResult)).toBe(true);
  });
});