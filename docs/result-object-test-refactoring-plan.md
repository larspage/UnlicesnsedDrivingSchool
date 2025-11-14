# Test Refactoring Plan for Result Object Pattern

## Critical Issue: Tests Are Incompatible with Result Objects

**Current Problem**: All existing tests expect traditional error handling and direct return values, but services now return `Result<T>` objects with structured errors.

**Impact**: All tests will fail if we deploy the new Result Object pattern without updating tests first.

## Current Test Patterns (❌ WRONG)

### ❌ Current Pattern 1: Expecting Direct Returns
```javascript
it('should return file when found', async () => {
  const result = await fileService.getFileById('file_abc123');
  expect(result).toBe(mockFile); // WRONG - result is now Result object
});
```

### ❌ Current Pattern 2: Expecting Error Throws
```javascript
it('should throw error for invalid upload parameters', async () => {
  await expect(fileService.uploadFile(...))
    .rejects.toThrow('Invalid file buffer'); // WRONG - now returns Result with error
});
```

### ❌ Current Pattern 3: Expecting Null for Not Found
```javascript
it('should return null when file not found', async () => {
  const result = await fileService.getFileById('file_nonexistent');
  expect(result).toBeNull(); // WRONG - now returns Result with NOT_FOUND error
});
```

## ✅ New Test Patterns (CORRECT)

### ✅ Pattern 1: Checking Success Results
```javascript
it('should return file when found', async () => {
  const result = await fileService.getFileById('file_abc123');
  
  // Use isSuccess helper
  expect(isSuccess(result)).toBe(true);
  
  // Access data property
  expect(result.data).toBe(mockFile);
  
  // Verify no error
  expect(result.error).toBeNull();
});
```

### ✅ Pattern 2: Checking Error Results
```javascript
it('should return validation error for invalid input', async () => {
  const result = await fileService.uploadFile(null, 'test.jpg', 'image/jpeg', 'rep_123');
  
  // Check failure
  expect(isSuccess(result)).toBe(false);
  
  // Check error code (NOT error message!)
  expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  
  // Check structured details
  expect(result.error.details).toEqual({ field: 'File', actualValue: null });
  
  // Check message exists but don't depend on exact text
  expect(result.error.message).toContain('File is required');
});
```

### ✅ Pattern 3: Checking Not Found Errors
```javascript
it('should return not found error when file does not exist', async () => {
  const result = await fileService.getFileById('file_nonexistent');
  
  expect(isSuccess(result)).toBe(false);
  expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
  expect(result.error.details).toEqual({ 
    resourceType: 'File', 
    resourceId: 'file_nonexistent' 
  });
});
```

## Test File Updates Required

### 1. Test Imports
```javascript
// Add these imports to ALL test files
const { isSuccess, isFailure } = require('../../../server/utils/result');
const { ERROR_CODES } = require('../../../server/utils/errorCodes');
```

### 2. Success Test Pattern
```javascript
it('should handle successful operations', async () => {
  // Setup mocks
  mockDependencies();
  
  // Call service
  const result = await fileService.getFileById('file_abc123');
  
  // Assert success
  expect(isSuccess(result)).toBe(true);
  expect(isFailure(result)).toBe(false);
  expect(result.data).toBe(mockFile);
  expect(result.error).toBeNull();
});
```

### 3. Error Test Pattern
```javascript
it('should handle validation errors', async () => {
  // Setup mocks to cause validation error
  mockValidationFailure();
  
  // Call service
  const result = await fileService.uploadFile(...);
  
  // Assert error
  expect(isSuccess(result)).toBe(false);
  expect(isFailure(result)).toBe(true);
  expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  expect(result.error.details.field).toBe('File name');
});
```

### 4. Multiple Scenario Testing
```javascript
describe('uploadFile with different scenarios', () => {
  it('should succeed with valid input', async () => {
    const result = await uploadFile(mockFile);
    expect(isSuccess(result)).toBe(true);
    expect(result.data.id).toBe('file_123');
  });
  
  it('should fail with missing file', async () => {
    const result = await uploadFile(null);
    expect(isSuccess(result)).toBe(false);
    expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  });
  
  it('should fail with oversized file', async () => {
    const result = await uploadFile(oversizedFile);
    expect(isSuccess(result)).toBe(false);
    expect(result.error.code).toBe(ERROR_CODES.FILE_TOO_LARGE);
  });
});
```

## Specific Test File Refactoring

### tests/unit/services/fileService.test.js

#### OLD (❌):
```javascript
it('should return file when found', async () => {
  const result = await fileService.getFileById('file_abc123');
  expect(result).toBe(mockFile); // WRONG
});

it('should return null when file not found', async () => {
  const result = await fileService.getFileById('file_nonexistent');
  expect(result).toBeNull(); // WRONG
});

it('should throw error for invalid upload parameters', async () => {
  await expect(fileService.uploadFile(...))
    .rejects.toThrow('Invalid file buffer'); // WRONG
});
```

#### NEW (✅):
```javascript
it('should return file when found', async () => {
  const result = await fileService.getFileById('file_abc123');
  
  expect(isSuccess(result)).toBe(true);
  expect(result.data).toBe(mockFile);
  expect(result.error).toBeNull();
});

it('should return not found error when file does not exist', async () => {
  const result = await fileService.getFileById('file_nonexistent');
  
  expect(isSuccess(result)).toBe(false);
  expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
  expect(result.error.details).toEqual({
    resourceType: 'File',
    resourceId: 'file_nonexistent'
  });
});

it('should return validation error for invalid upload parameters', async () => {
  const result = await fileService.uploadFile(null, 'test.jpg', 'image/jpeg', 'rep_123');
  
  expect(isSuccess(result)).toBe(false);
  expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  expect(result.error.message).toContain('File is required');
});
```

## Test Strategy for Different Error Types

### Validation Errors
```javascript
// Test each validation rule separately
it('should fail for null file', async () => {
  const result = await uploadFile(null);
  expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  expect(result.error.details.field).toBe('File');
});

it('should fail for empty file name', async () => {
  const result = await uploadFile(buffer, '', 'image/jpeg', 'rep_123');
  expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  expect(result.error.details.field).toBe('File name');
});
```

### Business Logic Errors
```javascript
it('should fail for file size limit exceeded', async () => {
  const result = await uploadFile(largeFile);
  expect(result.error.code).toBe(ERROR_CODES.FILE_TOO_LARGE);
  expect(result.error.details.maxSize).toBe(10 * 1024 * 1024);
});
```

### System Errors
```javascript
it('should fail for file system errors', async () => {
  localFileService.uploadFile.mockRejectedValue(new Error('Permission denied'));
  
  const result = await uploadFile(...);
  expect(result.error.code).toBe(ERROR_CODES.FILE_UPLOAD_FAILED);
});
```

## Complete Test Refactoring Checklist

### Step 1: Add Required Imports
- [ ] Add `isSuccess`, `isFailure` imports
- [ ] Add `ERROR_CODES` import
- [ ] Update mock imports if needed

### Step 2: Update Success Tests
- [ ] Change `expect(result).toBe(expectedValue)` to `expect(result.data).toBe(expectedValue)`
- [ ] Add `expect(isSuccess(result)).toBe(true)`
- [ ] Add `expect(result.error).toBeNull()`

### Step 3: Update Error Tests
- [ ] Remove `.rejects.toThrow(...)` patterns
- [ ] Change to `expect(isSuccess(result)).toBe(false)`
- [ ] Add `expect(result.error.code).toBe(...)` assertions
- [ ] Add structured error details assertions

### Step 4: Update "Not Found" Tests
- [ ] Change from `expect(result).toBeNull()` to error assertion
- [ ] Add `expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND)`
- [ ] Add resource type and ID assertions

### Step 5: Update Mock Expectations
- [ ] Adjust mock function call counts
- [ ] Update test setup for Result objects

## Benefits of Updated Test Pattern

### ✅ Error Code Testing (Not Message Testing)
- Tests verify `error.code` values instead of error message text
- Tests are resilient to message changes
- Clear separation of error categories

### ✅ Structured Error Information
- Tests verify `error.details` for additional context
- Tests can access `error.innerError` for debugging
- Consistent error structure across all services

### ✅ Type Safety
- Tests enforce proper Result object handling
- Type checking works with proper Result structure
- Clear success/failure states

### ✅ Test Maintainability
- Tests don't break when error messages change
- Easy to add new error types
- Clear test descriptions based on error codes

## Files Requiring Updates

1. **tests/unit/services/fileService.test.js** - COMPLETE REFACTOR
2. **tests/unit/services/reportService.test.js** - COMPLETE REFACTOR
3. **tests/unit/services/configService.test.js** - COMPLETE REFACTOR
4. **tests/unit/services/authService.test.js** - COMPLETE REFACTOR
5. **tests/unit/routes/files.test.js** - COMPLETE REFACTOR
6. **tests/unit/routes/reports.test.js** - COMPLETE REFACTOR
7. **All other test files** - Update integration tests

## Implementation Priority

**CRITICAL**: Tests must be updated BEFORE deploying Result Object pattern
1. Update core service tests (fileService, reportService, configService)
2. Update route tests (files, reports)
3. Update client-side API tests
4. Update E2E tests to handle new error structure

**Next Step**: Begin systematic test refactoring starting with the most critical tests first.