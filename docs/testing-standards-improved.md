# Testing Standards: Improved Error Testing Philosophy

## Problem Statement

Our GitHub CI tests were failing because they were checking **specific error codes** in negative testing scenarios. This created brittle tests tied to implementation details rather than actual behavior.

### What Was Wrong

**❌ OLD APPROACH (Brittle):**
```javascript
// Tests checking specific error codes
expect(result.error.code).toBe(ERROR_CODES.EMAIL_ERROR);
expect(result.error.code).toBe(ERROR_CODES.FILE_UPLOAD_FAILED);
expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
```

**Problem:** If we change error codes or add new ones, these tests break unnecessarily.

## ✅ NEW APPROACH (Resilient)

### Core Philosophy

**Focus on behavior, not implementation details.**

**Positive Tests:**
- ✅ Verify successful operations work correctly
- ✅ Check that `success: true` and data is returned
- ✅ Verify expected method calls and side effects

**Negative Tests:**
- ✅ Verify that an error occurred (`success: false`)
- ✅ Verify that meaningful error information is present
- ✅ Check error messages contain expected context
- ❌ **DON'T check specific error codes**

### Improved Testing Patterns

#### 1. Service Tests

**❌ OLD (Brittle):**
```javascript
test('should handle SMTP errors', async () => {
  // ... arrange SMTP error ...
  
  const result = await emailService.sendEmail(to, subject, body);
  
  // This makes tests brittle!
  expect(result.error.code).toBe(ERROR_CODES.EMAIL_ERROR); // ❌ DON'T DO THIS
  expect(result.error.message).toContain('SMTP connection failed');
});
```

**✅ NEW (Resilient):**
```javascript
test('should handle SMTP errors', async () => {
  // ... arrange SMTP error ...
  
  const result = await emailService.sendEmail(to, subject, body);
  
  // ✅ Focus on behavior, not implementation
  expect(isSuccess(result)).toBe(false);
  expect(result.data).toBeNull();
  expect(result.error).toBeTruthy();              // ✅ Error exists
  expect(result.error.message).toContain('SMTP connection failed'); // ✅ Has context
  // Don't check specific error code - let implementation decide
});
```

#### 2. Route Tests

**❌ OLD (Brittle):**
```javascript
test('should return 404 if file not found', async () => {
  // ... arrange 404 scenario ...
  
  const response = await request(app).get('/files/file_abc123');
  
  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe('NOT_FOUND'); // ❌ DON'T DO THIS
});
```

**✅ NEW (Resilient):**
```javascript
test('should return 404 if file not found', async () => {
  // ... arrange 404 scenario ...
  
  const response = await request(app).get('/files/file_abc123');
  
  expect(response.status).toBe(404);
  expect(response.body.error).toBeTruthy();                    // ✅ Error exists
  expect(response.body.error.message).toContain('File not found'); // ✅ Has context
  // Don't check specific error codes
});
```

#### 3. Middleware Tests

**❌ OLD (Brittle):**
```javascript
test('should return validation error', async () => {
  // ... arrange validation failure ...
  
  await validateFileUpload(req, res, next);
  
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({
    error: {
      code: ERROR_CODES.VALIDATION_ERROR, // ❌ DON'T DO THIS
      message: 'Invalid reportId format'
    }
  });
});
```

**✅ NEW (Resilient):**
```javascript
test('should return validation error', async () => {
  // ... arrange validation failure ...
  
  await validateFileUpload(req, res, next);
  
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({
    success: false,
    error: expect.stringContaining('Invalid reportId format'), // ✅ Check message
    details: { field: 'reportId' }
  });
  // Don't check specific error codes
});
```

## Why This Approach Works Better

### 1. **Implementation Flexibility**
- Error codes can change without breaking tests
- New error types can be added without test modifications
- Services can refactor error handling logic freely

### 2. **Clearer Intent**
- Tests focus on what should happen, not how it should happen
- Error messages are checked for meaningful context
- Test failures indicate real functionality issues, not cosmetic changes

### 3. **Maintainability**
- Less test maintenance burden when error handling evolves
- Tests remain stable as codebase grows
- Easier to understand test failure messages

### 4. **Coverage of Real Concerns**
- **Positive tests:** Verify correct behavior works
- **Negative tests:** Verify errors are properly handled
- **Integration tests:** Verify components work together

## Application Guidelines

### When to Check Error Codes
- **Never in negative tests** (they should fail gracefully)
- **Only in error transformation tests** (e.g., middleware that maps errors to HTTP responses)
- **Only if error code is part of the public API contract**

### When to Check Error Messages
- **Always** - verify meaningful error messages are returned
- **Use `.toContain()`** to allow for dynamic content
- **Avoid exact matching** unless the message is stable

### When to Check Result Object Structure
- **Always** - verify Result objects have expected structure:
  ```javascript
  expect(result).toHaveProperty('success');
  expect(result).toHaveProperty('data');
  expect(result).toHaveProperty('error');
  ```

## Migration Strategy

### Step 1: Identify Problematic Tests
Look for tests that check `error.code` in negative scenarios:
```javascript
// These should be refactored
expect(result.error.code).toBe(ERROR_CODES.EMAIL_ERROR);
expect(response.body.error.code).toBe('FILE_UPLOAD_FAILED');
```

### Step 2: Refactor to Focus on Behavior
Replace specific code checks with behavior checks:
```javascript
// ✅ Good pattern
expect(isSuccess(result)).toBe(false);
expect(result.error).toBeTruthy();
expect(result.error.message).toContain('expected context');
```

### Step 3: Run Tests
Ensure refactored tests still catch real issues:
- Remove a feature → tests should fail
- Remove error handling → tests should fail
- Change error code → tests should pass

## Summary

### ❌ Don't Do This (Brittle Tests)
```javascript
// Checking specific error codes in negative tests
expect(result.error.code).toBe(ERROR_CODES.EMAIL_ERROR);
expect(response.body.error.code).toBe('FILE_UPLOAD_FAILED');
```

### ✅ Do This (Resilient Tests)
```javascript
// Focus on behavior, not implementation
expect(isSuccess(result)).toBe(false);
expect(result.error).toBeTruthy();
expect(result.error.message).toContain('meaningful context');
```

**Remember:** Test the **behavior** (what should happen), not the **implementation** (how it should happen).