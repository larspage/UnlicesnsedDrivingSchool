/**
 * Unit tests for Configuration model
 */

const Configuration = require('../../../server/models/Configuration');

describe('Configuration Model', () => {
  describe('constructor and validation', () => {
    test('should create a valid string configuration', () => {
      const data = {
        key: 'test.key',
        value: 'test value',
        type: 'string',
        category: 'system',
        updatedAt: '2025-09-26T21:25:00.000Z'
      };

      const config = new Configuration(data);

      expect(config.key).toBe('test.key');
      expect(config.value).toBe('test value');
      expect(config.type).toBe('string');
      expect(config.category).toBe('system');
    });

    test('should create a valid number configuration', () => {
      const data = {
        key: 'test.number',
        value: 42,
        type: 'number',
        category: 'system',
        updatedAt: '2025-09-26T21:25:00.000Z'
      };

      const config = new Configuration(data);

      expect(config.key).toBe('test.number');
      expect(config.value).toBe(42);
      expect(config.type).toBe('number');
    });

    test('should create a valid boolean configuration', () => {
      const data = {
        key: 'test.boolean',
        value: true,
        type: 'boolean',
        category: 'system',
        updatedAt: '2025-09-26T21:25:00.000Z'
      };

      const config = new Configuration(data);

      expect(config.key).toBe('test.boolean');
      expect(config.value).toBe(true);
      expect(config.type).toBe('boolean');
    });

    test('should create a valid JSON configuration', () => {
      const jsonValue = { setting: 'value', count: 5 };
      const data = {
        key: 'test.json',
        value: jsonValue,
        type: 'json',
        category: 'system',
        updatedAt: '2025-09-26T21:25:00.000Z'
      };

      const config = new Configuration(data);

      expect(config.key).toBe('test.json');
      expect(config.value).toEqual(jsonValue);
      expect(config.type).toBe('json');
    });

    test('should throw error for invalid data', () => {
      const invalidData = {
        key: '', // Invalid: empty key
        value: 'test',
        type: 'invalid_type',
        category: 'invalid_category'
      };

      expect(() => new Configuration(invalidData)).toThrow();
    });
  });

  describe('validateAndConvertValue', () => {
    test('should convert string values', () => {
      expect(Configuration.validateAndConvertValue('test', 'string')).toBe('test');
      expect(Configuration.validateAndConvertValue('  spaced  ', 'string')).toBe('spaced');
    });

    test('should convert number values', () => {
      expect(Configuration.validateAndConvertValue(42, 'number')).toBe(42);
      expect(Configuration.validateAndConvertValue('42', 'number')).toBe(42);
      expect(Configuration.validateAndConvertValue(3.14, 'number')).toBe(3.14);
    });

    test('should convert boolean values', () => {
      expect(Configuration.validateAndConvertValue(true, 'boolean')).toBe(true);
      expect(Configuration.validateAndConvertValue(false, 'boolean')).toBe(false);
      expect(Configuration.validateAndConvertValue('true', 'boolean')).toBe(true);
      expect(Configuration.validateAndConvertValue('false', 'boolean')).toBe(false);
    });

    test('should convert JSON values', () => {
      const obj = { key: 'value' };
      expect(Configuration.validateAndConvertValue(obj, 'json')).toEqual(obj);
      expect(Configuration.validateAndConvertValue('{"key":"value"}', 'json')).toEqual(obj);
    });

    test('should throw error for invalid conversions', () => {
      expect(() => Configuration.validateAndConvertValue('not a number', 'number')).toThrow();
      expect(() => Configuration.validateAndConvertValue('invalid', 'boolean')).toThrow();
      expect(() => Configuration.validateAndConvertValue('invalid json', 'json')).toThrow();
    });
  });

  describe('validateBusinessRules', () => {
    test('should pass validation for unique key', () => {
      const data = {
        key: 'unique.key',
        value: 'test',
        type: 'string',
        category: 'system',
        updatedAt: '2025-09-26T21:25:00.000Z'
      };

      const config = new Configuration(data);
      const existingConfigs = [
        { key: 'different.key', value: 'other' }
      ];

      expect(() => config.validateBusinessRules(existingConfigs)).not.toThrow();
    });

    test('should throw error for duplicate key', () => {
      const data = {
        key: 'duplicate.key',
        value: 'test',
        type: 'string',
        category: 'system',
        updatedAt: '2025-09-26T21:25:00.000Z'
      };

      const config = new Configuration(data);
      const existingConfigs = [
        { key: 'duplicate.key', value: 'existing' }
      ];

      expect(() => config.validateBusinessRules(existingConfigs)).toThrow('already exists');
    });
  });

  describe('category-specific validation', () => {
    test('should validate email configuration', () => {
      const emailConfig = new Configuration({
        key: 'email.toAddress',
        value: 'test@example.com',
        type: 'string',
        category: 'email',
        updatedAt: '2025-09-26T21:25:00.000Z'
      });

      expect(() => emailConfig.validateBusinessRules([])).not.toThrow();
    });

    test('should reject invalid email', () => {
      const invalidEmailConfig = new Configuration({
        key: 'email.toAddress',
        value: 'invalid-email',
        type: 'string',
        category: 'email',
        updatedAt: '2025-09-26T21:25:00.000Z'
      });

      expect(() => invalidEmailConfig.validateBusinessRules([])).toThrow('Invalid email address');
    });

    test('should validate Google configuration', () => {
      const googleConfig = new Configuration({
        key: 'google.sheets.spreadsheetId',
        value: '1ABC123DEF456789',
        type: 'string',
        category: 'google',
        updatedAt: '2025-09-26T21:25:00.000Z'
      });

      expect(() => googleConfig.validateBusinessRules([])).not.toThrow();
    });

    test('should validate system configuration', () => {
      const systemConfig = new Configuration({
        key: 'system.rateLimitPerHour',
        value: 10,
        type: 'number',
        category: 'system',
        updatedAt: '2025-09-26T21:25:00.000Z'
      });

      expect(() => systemConfig.validateBusinessRules([])).not.toThrow();
    });

    test('should reject invalid rate limit', () => {
      const invalidRateLimit = new Configuration({
        key: 'system.rateLimitPerHour',
        value: -1,
        type: 'number',
        category: 'system',
        updatedAt: '2025-09-26T21:25:00.000Z'
      });

      expect(() => invalidRateLimit.validateBusinessRules([])).toThrow('Rate limit must be between 0 and 1000');
    });
  });

  describe('value getters', () => {
    test('should return typed value', () => {
      const config = new Configuration({
        key: 'test',
        value: 42,
        type: 'number',
        category: 'system',
        updatedAt: '2025-09-26T21:25:00.000Z'
      });

      expect(config.getTypedValue()).toBe(42);
    });

    test('should return string representation', () => {
      const stringConfig = new Configuration({
        key: 'test.string',
        value: 'hello',
        type: 'string',
        category: 'system',
        updatedAt: '2025-09-26T21:25:00.000Z'
      });

      const numberConfig = new Configuration({
        key: 'test.number',
        value: 42,
        type: 'number',
        category: 'system',
        updatedAt: '2025-09-26T21:25:00.000Z'
      });

      const booleanConfig = new Configuration({
        key: 'test.boolean',
        value: true,
        type: 'boolean',
        category: 'system',
        updatedAt: '2025-09-26T21:25:00.000Z'
      });

      const jsonConfig = new Configuration({
        key: 'test.json',
        value: { key: 'value' },
        type: 'json',
        category: 'system',
        updatedAt: '2025-09-26T21:25:00.000Z'
      });

      expect(stringConfig.getStringValue()).toBe('hello');
      expect(numberConfig.getStringValue()).toBe('42');
      expect(booleanConfig.getStringValue()).toBe('true');
      expect(jsonConfig.getStringValue()).toBe('{"key":"value"}');
    });
  });


  describe('create and update', () => {
    test('should create configuration with timestamp', () => {
      const data = {
        key: 'new.key',
        value: 'new value',
        type: 'string',
        category: 'system'
      };

      const config = Configuration.create(data, 'admin@example.com');

      expect(config.key).toBe('new.key');
      expect(config.value).toBe('new value');
      expect(config.updatedAt).toBeDefined();
      expect(config.updatedBy).toBe('admin@example.com');
    });

    test('should update configuration with new timestamp', () => {
      const originalConfig = new Configuration({
        key: 'test.key',
        value: 'original',
        type: 'string',
        category: 'system',
        updatedAt: '2025-09-26T20:00:00.000Z',
        updatedBy: 'old@example.com'
      });

      const updatedConfig = originalConfig.update({
        value: 'updated'
      }, 'new@example.com');

      expect(updatedConfig.key).toBe('test.key');
      expect(updatedConfig.value).toBe('updated');
      expect(updatedConfig.updatedBy).toBe('new@example.com');
      expect(updatedConfig.updatedAt).not.toBe(originalConfig.updatedAt);
    });
  });

  describe('getters', () => {
    test('should return types enum', () => {
      const types = Configuration.getTypesEnum();
      expect(types.STRING).toBe('string');
      expect(types.NUMBER).toBe('number');
      expect(types.BOOLEAN).toBe('boolean');
      expect(types.JSON).toBe('json');
    });

    test('should return categories enum', () => {
      const categories = Configuration.getCategoriesEnum();
      expect(categories.EMAIL).toBe('email');
      expect(categories.GOOGLE).toBe('google');
      expect(categories.SYSTEM).toBe('system');
    });
  });
});