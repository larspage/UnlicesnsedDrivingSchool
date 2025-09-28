/**
 * Unit tests for validation utilities
 */

const {
  validateEmail,
  validatePhoneNumber,
  formatPhoneNumber,
  toE164PhoneNumber,
  validateUrl,
  normalizeUrl,
  validateIpAddress,
  sanitizeString,
  validateDuplicateReport,
  validateFileUpload,
  formatValidationError,
  createValidationResult,
  validateReportId,
  validateFileId,
  validateDriveFileId,
  validateSpreadsheetId,
  validateJsonString,
  safeJsonParse
} = require('../../../server/utils/validation');

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    test('should validate correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    test('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });
  });

  describe('validatePhoneNumber', () => {
    test('should validate correct phone numbers', () => {
      expect(validatePhoneNumber('5551234567')).toBe(true);
      expect(validatePhoneNumber('15551234567')).toBe(true);
      expect(validatePhoneNumber('(555) 123-4567')).toBe(true);
      expect(validatePhoneNumber('555-123-4567')).toBe(true);
    });

    test('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('123')).toBe(false);
      expect(validatePhoneNumber('abcdefghijk')).toBe(false);
      expect(validatePhoneNumber('')).toBe(false);
    });
  });

  describe('formatPhoneNumber', () => {
    test('should format phone numbers correctly', () => {
      expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
      expect(formatPhoneNumber('15551234567')).toBe('(555) 123-4567');
      expect(formatPhoneNumber('(555) 123-4567')).toBe('(555) 123-4567');
    });

    test('should return original for invalid numbers', () => {
      expect(formatPhoneNumber('123')).toBe('123');
      expect(formatPhoneNumber(null)).toBe(null);
    });
  });

  describe('toE164PhoneNumber', () => {
    test('should convert to E.164 format', () => {
      expect(toE164PhoneNumber('5551234567')).toBe('+15551234567');
      expect(toE164PhoneNumber('(555) 123-4567')).toBe('+15551234567');
    });

    test('should return original for invalid numbers', () => {
      expect(toE164PhoneNumber('123')).toBe('123');
    });
  });

  describe('validateUrl', () => {
    test('should validate correct URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://example.com/path')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('ftp://example.com')).toBe(false);
      expect(validateUrl('')).toBe(false);
    });
  });

  describe('normalizeUrl', () => {
    test('should add https to URLs without protocol', () => {
      expect(normalizeUrl('example.com')).toBe('https://example.com');
      expect(normalizeUrl('www.example.com')).toBe('https://www.example.com');
    });

    test('should leave valid URLs unchanged', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com');
      expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    });
  });

  describe('validateIpAddress', () => {
    test('should validate IPv4 addresses', () => {
      expect(validateIpAddress('192.168.1.1')).toBe(true);
      expect(validateIpAddress('127.0.0.1')).toBe(true);
    });

    test('should validate IPv6 addresses', () => {
      expect(validateIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    });

    test('should reject invalid IPs', () => {
      expect(validateIpAddress('256.1.1.1')).toBe(false);
      expect(validateIpAddress('not-an-ip')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    test('should trim and remove control characters', () => {
      expect(sanitizeString('  test  \x00\x01  ')).toBe('test');
    });

    test('should apply max length', () => {
      expect(sanitizeString('my extremely long string', { maxLength: 10 })).toBe('my extreme');
    });

    test('should allow HTML when specified', () => {
      expect(sanitizeString('<b>test</b>', { allowHtml: true })).toBe('<b>test</b>');
      expect(sanitizeString('<b>test</b>', { allowHtml: false })).toBe('test');
    });
  });

  describe('validateDuplicateReport', () => {
    test('should pass validation for unique school name', () => {
      const result = validateDuplicateReport('New School', [
        { schoolName: 'Existing School' }
      ]);

      expect(result.isValid).toBe(true);
    });

    test('should fail validation for duplicate school name', () => {
      const result = validateDuplicateReport('Existing School', [
        { schoolName: 'existing school' } // Case insensitive
      ]);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('validateFileUpload', () => {
    test('should validate correct file upload', () => {
      const buffer = Buffer.from('test');
      const result = validateFileUpload(buffer, 'test.jpg', 'image/jpeg', ['image/jpeg'], 1024);

      expect(result.isValid).toBe(true);
    });

    test('should reject invalid file type', () => {
      const buffer = Buffer.from('test');
      const result = validateFileUpload(buffer, 'test.exe', 'application/x-msdownload', ['image/jpeg'], 1024);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    test('should reject oversized file', () => {
      const buffer = Buffer.alloc(2048);
      const result = validateFileUpload(buffer, 'large.jpg', 'image/jpeg', ['image/jpeg'], 1024);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });
  });

  describe('formatValidationError', () => {
    test('should format Joi errors', () => {
      const mockError = {
        details: [
          { path: ['field1'], message: 'Field1 is required' },
          { path: ['field2'], message: 'Field2 must be a string' }
        ]
      };

      const formatted = formatValidationError(mockError);
      expect(formatted).toContain('Field1: Field1 is required');
      expect(formatted).toContain('Field2: Field2 must be a string');
    });
  });

  describe('createValidationResult', () => {
    test('should create valid result', () => {
      const result = createValidationResult(true, null, { data: 'test' });
      expect(result.isValid).toBe(true);
      expect(result.error).toBe(null);
      expect(result.data).toEqual({ data: 'test' });
    });

    test('should create invalid result', () => {
      const result = createValidationResult(false, 'Error message');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Error message');
      expect(result.data).toBe(null);
    });
  });

  describe('ID validation', () => {
    test('validateReportId should validate report IDs', () => {
      expect(validateReportId('rep_ABC123')).toBe(true);
      expect(validateReportId('rep_abc123')).toBe(true);
      expect(validateReportId('invalid')).toBe(false);
    });

    test('validateFileId should validate file IDs', () => {
      expect(validateFileId('file_ABC123')).toBe(true);
      expect(validateFileId('file_abc123')).toBe(true);
      expect(validateFileId('invalid')).toBe(false);
    });

    test('validateDriveFileId should validate Drive file IDs', () => {
      expect(validateDriveFileId('1ABC123DEF456')).toBe(true);
      expect(validateDriveFileId('short')).toBe(false);
    });

    test('validateSpreadsheetId should validate spreadsheet IDs', () => {
      expect(validateSpreadsheetId('1ABC123DEF456')).toBe(true);
      expect(validateSpreadsheetId('short')).toBe(false);
    });
  });

  describe('JSON utilities', () => {
    test('validateJsonString should validate JSON', () => {
      expect(validateJsonString('{"key":"value"}')).toBe(true);
      expect(validateJsonString('invalid')).toBe(false);
    });

    test('safeJsonParse should parse valid JSON', () => {
      expect(safeJsonParse('{"key":"value"}')).toEqual({ key: 'value' });
    });

    test('safeJsonParse should return default for invalid JSON', () => {
      expect(safeJsonParse('invalid', 'default')).toBe('default');
      expect(safeJsonParse('invalid')).toBe(null);
    });
  });
});