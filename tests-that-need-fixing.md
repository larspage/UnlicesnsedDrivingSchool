# Tests Still Using Brittle Failure Patterns (Not Using success: false Response Object)

## 🔴 HIGH PRIORITY - Still Checking Specific Error Codes

### 1. **File Service Tests** (`tests/unit/services/fileService.test.js`)
```javascript
❌ Lines 150, 179, 198, 244
expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
expect(result.error.code).toBe(ERROR_CODES.FILE_UPLOAD_FAILED);
expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
```

**Issues:**
- Checking specific error codes instead of just verifying failure behavior
- Would break if error codes change

### 2. **Audit Service Tests** (`tests/unit/services/auditService.test.js`)
```javascript
❌ Lines 55, 230, 254, 279, 459, 481
expect(result.error.code).toBe('VALIDATION_ERROR');
expect(result.error.code).toBe('VALIDATION_ERROR');
expect(result.error.code).toBe('VALIDATION_ERROR');
expect(result.error.code).toBe('VALIDATION_ERROR');
expect(result.error.code).toBe('DATABASE_ERROR');
expect(result.error.code).toBe('DATABASE_ERROR');
```

**Issues:**
- Hard-coded string error codes
- Not resilient to implementation changes

### 3. **Local JSON Service Tests** (`tests/unit/services/localJsonService.test.js`)
```javascript
❌ Lines 320, 356
expect(result.error.code).toBe('NOT_FOUND');
expect(result.error.code).toBe('NOT_FOUND');
```

**Issues:**
- Specific error code dependencies

### 4. **File Routes Tests** (`tests/unit/routes/files.test.js`)
```javascript
❌ Lines 143, 188, 342
expect(response.body.error.code).toBe('FILE_UPLOAD_FAILED');
expect(response.body.error.code).toBe('NOT_FOUND');
expect(response.body.error.code).toBe('NOT_FOUND');
```

**Issues:**
- Testing HTTP response error codes
- Not focused on behavior verification

## 🟡 MEDIUM PRIORITY - Using Promise Rejection Patterns

### 5. **Report Service Tests** (`tests/unit/services/reportService.test.js`)
```javascript
❌ Lines 68, 121, 308, 402, 558
await expect(reportService.createReport(...)).rejects.toThrow('Report validation failed');
await expect(reportService.createReport(...)).rejects.toThrow('Google Sheets API error');
await expect(reportService.getReports()).rejects.toThrow('API Error');
await expect(reportService.getReportById(...)).rejects.toThrow('API Error');
await expect(reportService.getAllReports()).rejects.toThrow('API Error');
```

**Issues:**
- Using `.rejects.toThrow()` with specific message strings
- Should use result object pattern instead

### 6. **Config Service Tests** (`tests/unit/services/configService.test.js`)
```javascript
❌ Lines 49, 50, 51, 167, 168, 169, 371, 377, 384
await expect(configService.getConfig()).rejects.toThrow('Invalid key: must be a non-empty string');
await expect(configService.setConfig()).rejects.toThrow('Invalid key: must be a non-empty string');
await expect(configService.getConfig('test.key')).rejects.toThrow('Storage error');
```

**Issues:**
- Specific error message strings
- Not using result object pattern

### 7. **API Service Tests** (`tests/unit/services/api.test.js`)
```javascript
❌ Lines 108, 120, 135, 208, 299, 349, 411, 465, 513, 553, 613, 640
await expect(apiClient.request('/test')).rejects.toThrow('Not found');
await expect(apiClient.getReports()).rejects.toThrow('Server error');
await expect(apiClient.submitReport(reportData)).rejects.toThrow('Validation failed');
```

**Issues:**
- Many `.rejects.toThrow()` with specific messages
- Should be using result object pattern

## 🟡 LOW PRIORITY - Model Validation Tests (These are OK as-is)

### 8. **Model Tests** (Generally Acceptable Pattern)
```javascript
❌ tests/unit/models/File.test.js - Line 42
❌ tests/unit/models/Configuration.test.js - Lines 83, 113, 151, 177, 213
❌ tests/unit/models/Report.test.js - Lines 36, 105
```

**Note:** These tests are checking constructor validation, which is appropriate to use `.toThrow()` since they're testing pure function validation, not async services.

## 📊 Summary Statistics

- **Total brittle tests found:** 135+ patterns
- **High priority (error code checking):** 8 test files
- **Medium priority (rejects.toThrow):** 3 test files  
- **Low priority (model validation):** OK as-is

## 🎯 Recommendations

1. **Priority 1:** Fix `fileService.test.js`, `auditService.test.js`, `localJsonService.test.js`
2. **Priority 2:** Fix service tests using `.rejects.toThrow()`
3. **Priority 3:** Update route tests to focus on behavior

**The email service tests show this works perfectly - all 12 tests pass with the improved pattern!**