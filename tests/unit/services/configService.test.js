const configService = require('../../../server/services/configService');
const Configuration = require('../../../server/models/Configuration');

// Mock the localJsonService dependency
jest.mock('../../../server/services/localJsonService', () => ({
  getAllRows: jest.fn(),
  writeJsonFile: jest.fn()
}));

// Mock the Configuration model
jest.mock('../../../server/models/Configuration', () => {
  const mockConfig = jest.fn().mockImplementation((data) => ({
    key: data.key,
    value: data.value,
    type: data.type,
    category: data.category,
    description: data.description,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
    getStringValue: jest.fn(() => JSON.stringify(data.value)),
    getTypedValue: jest.fn(() => {
      switch (data.type) {
        case 'number': return Number(data.value);
        case 'boolean': return data.value === 'true';
        case 'json': return JSON.parse(data.value);
        default: return data.value;
      }
    })
  }));

  mockConfig.create = jest.fn((data, updatedBy) => new mockConfig(data));

  return mockConfig;
});

const localJsonService = require('../../../server/services/localJsonService');

describe('Config Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache before each test
    configService.clearConfigCache();
  });

  describe('getConfig', () => {
    it('should throw error for invalid key', async () => {
      await expect(configService.getConfig()).rejects.toThrow('Invalid key: must be a non-empty string');
      await expect(configService.getConfig('')).rejects.toThrow('Invalid key: must be a non-empty string');
      await expect(configService.getConfig(123)).rejects.toThrow('Invalid key: must be a non-empty string');
    });

    it('should return cached value when available', async () => {
      configService.setCachedConfig('test.key', 'cached-value');

      const result = await configService.getConfig('test.key');

      expect(result).toBe('cached-value');
      expect(localJsonService.getAllRows).not.toHaveBeenCalled();
    });

    it('should return null when config not found', async () => {
      localJsonService.getAllRows.mockResolvedValue([]);

      const result = await configService.getConfig('nonexistent.key');

      expect(result).toBeNull();
    });

    it('should return typed value from JSON storage', async () => {
      const mockConfigs = [
        { key: 'test.string', value: 'hello', type: 'string' },
        { key: 'test.number', value: '42', type: 'number' },
        { key: 'test.boolean', value: 'true', type: 'boolean' },
        { key: 'test.json', value: '{"nested": "value"}', type: 'json' }
      ];
      localJsonService.getAllRows.mockResolvedValue(mockConfigs);

      const stringResult = await configService.getConfig('test.string');
      const numberResult = await configService.getConfig('test.number');
      const booleanResult = await configService.getConfig('test.boolean');
      const jsonResult = await configService.getConfig('test.json');

      expect(stringResult).toBe('hello');
      expect(numberResult).toBe(42);
      expect(booleanResult).toBe(true);
      expect(jsonResult).toEqual({ nested: 'value' });
    });

    it('should cache retrieved values', async () => {
      const mockConfigs = [{ key: 'test.key', value: 'test-value', type: 'string' }];
      localJsonService.getAllRows.mockResolvedValue(mockConfigs);

      // First call should fetch from JSON
      await configService.getConfig('test.key');
      expect(localJsonService.getAllRows).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await configService.getConfig('test.key');
      expect(localJsonService.getAllRows).toHaveBeenCalledTimes(1); // Still 1 call
    });
  });

  describe('getAllConfig', () => {
    it('should return all configurations as object', async () => {
      const mockConfigs = [
        { key: 'email.toAddress', value: 'test@mvc.nj.gov', type: 'string' },
        { key: 'system.rateLimit', value: '100', type: 'number' },
        { key: 'features.enabled', value: 'true', type: 'boolean' }
      ];
      localJsonService.getAllRows.mockResolvedValue(mockConfigs);

      const result = await configService.getAllConfig();

      expect(result).toEqual({
        'email.toAddress': 'test@mvc.nj.gov',
        'system.rateLimit': 100,
        'features.enabled': true
      });
    });

    it('should cache all individual values', async () => {
      const mockConfigs = [
        { key: 'test.key1', value: 'value1', type: 'string' },
        { key: 'test.key2', value: 'value2', type: 'string' }
      ];
      localJsonService.getAllRows.mockResolvedValue(mockConfigs);

      await configService.getAllConfig();

      // Verify both values are cached
      expect(configService.getCachedConfig('test.key1')).toBe('value1');
      expect(configService.getCachedConfig('test.key2')).toBe('value2');
    });

    it('should handle empty configuration', async () => {
      localJsonService.getAllRows.mockResolvedValue([]);

      const result = await configService.getAllConfig();

      expect(result).toEqual({});
    });

    it('should skip invalid configuration entries', async () => {
      const mockConfigs = [
        { key: 'valid.key', value: 'valid', type: 'string' },
        { key: '', value: 'invalid', type: 'string' }, // Invalid - no key
        null, // Invalid - null entry
        {} // Invalid - empty object
      ];
      localJsonService.getAllRows.mockResolvedValue(mockConfigs);

      const result = await configService.getAllConfig();

      expect(result).toEqual({ 'valid.key': 'valid' });
    });
  });

  describe('setConfig', () => {
    beforeEach(() => {
      localJsonService.getAllRows.mockResolvedValue([]);
      localJsonService.writeJsonFile.mockResolvedValue();
    });

    it('should throw error for invalid key', async () => {
      await expect(configService.setConfig()).rejects.toThrow('Invalid key: must be a non-empty string');
      await expect(configService.setConfig('')).rejects.toThrow('Invalid key: must be a non-empty string');
      await expect(configService.setConfig(123)).rejects.toThrow('Invalid key: must be a non-empty string');
    });

    it('should create new configuration', async () => {
      const result = await configService.setConfig(
        'test.newKey',
        'test-value',
        'string',
        'system',
        'Test description',
        'admin@example.com'
      );

      expect(result.key).toBe('test.newKey');
      expect(result.value).toBe('test-value');
      expect(result.type).toBe('string');
      expect(result.category).toBe('system');
      expect(result.description).toBe('Test description');
      expect(result.updatedBy).toBe('admin@example.com');
      expect(result.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      expect(localJsonService.writeJsonFile).toHaveBeenCalledWith('config', [result]);
    });

    it('should update existing configuration', async () => {
      const existingConfig = {
        key: 'test.existingKey',
        value: 'old-value',
        type: 'string',
        category: 'system',
        description: 'Old description',
        updatedAt: '2025-01-01T00:00:00Z',
        updatedBy: 'old-admin'
      };
      localJsonService.getAllRows.mockResolvedValue([existingConfig]);

      const result = await configService.setConfig(
        'test.existingKey',
        'new-value',
        'string',
        'system',
        'New description',
        'new-admin@example.com'
      );

      expect(result.key).toBe('test.existingKey');
      expect(result.value).toBe('new-value');
      expect(result.description).toBe('New description');
      expect(result.updatedBy).toBe('new-admin@example.com');

      // Verify the config array contains updated config
      const writeCall = localJsonService.writeJsonFile.mock.calls[0];
      expect(writeCall[0]).toBe('config');
      expect(writeCall[1]).toHaveLength(1);
      expect(writeCall[1][0].value).toBe('new-value');
    });

    it('should clear cache after setting config', async () => {
      configService.setCachedConfig('test.key', 'cached-value');

      await configService.setConfig('test.key', 'new-value', 'string', 'system');

      expect(configService.getCachedConfig('test.key')).toBeNull();
    });
  });

  describe('validateConfig', () => {
    it('should return true for valid configuration', () => {
      const result = configService.validateConfig('test.key', 'test-value', 'string');
      expect(result).toBe(true);
    });

    it('should throw error for invalid configuration', () => {
      // Mock Configuration constructor to throw error
      Configuration.mockImplementationOnce(() => {
        throw new Error('Invalid configuration');
      });

      expect(() => {
        configService.validateConfig('test.key', 'invalid-value', 'invalid-type');
      }).toThrow('Invalid configuration');
    });
  });

  describe('initializeDefaults', () => {
    beforeEach(() => {
      localJsonService.getAllRows.mockResolvedValue([]);
      localJsonService.writeJsonFile.mockResolvedValue();
    });

    it('should initialize default configurations', async () => {
      await configService.initializeDefaults();

      // Should have called setConfig for each default config
      expect(localJsonService.writeJsonFile).toHaveBeenCalled();
      const writeCalls = localJsonService.writeJsonFile.mock.calls;
      expect(writeCalls.length).toBeGreaterThan(0);

      // Verify some key defaults are initialized
      const configsWritten = writeCalls.flatMap(call => call[1]);
      const keys = configsWritten.map(config => config.key);

      expect(keys).toContain('email.toAddress');
      expect(keys).toContain('email.fromAddress');
      expect(keys).toContain('system.rateLimitPerHour');
      expect(keys).toContain('system.maxFileSize');
    });

    it('should update existing configurations with new values', async () => {
      const existingConfig = {
        key: 'email.toAddress',
        value: 'existing@mvc.nj.gov',
        type: 'string',
        category: 'email',
        description: 'Existing email',
        updatedAt: '2025-01-01T00:00:00Z',
        updatedBy: 'existing-admin'
      };
      localJsonService.getAllRows.mockResolvedValue([existingConfig]);

      await configService.initializeDefaults();

      // Should update the existing config with new values
      const writeCalls = localJsonService.writeJsonFile.mock.calls;
      const writtenKeys = writeCalls.flatMap(call => call[1]).map(config => config.key);

      // email.toAddress should be written since we're updating existing configs
      expect(writtenKeys).toContain('email.toAddress');

      // Verify the config was updated with new values
      const emailConfig = writeCalls.flatMap(call => call[1]).find(config => config.key === 'email.toAddress');
      expect(emailConfig).toBeDefined();
      expect(emailConfig.value).not.toBe('existing@mvc.nj.gov'); // Should be updated
    });

    it('should handle custom defaults', async () => {
      const customDefaults = {
        'custom.key': {
          value: 'custom-value',
          type: 'string',
          category: 'custom',
          description: 'Custom config'
        }
      };

      await configService.initializeDefaults(customDefaults);

      const writeCalls = localJsonService.writeJsonFile.mock.calls;
      const configsWritten = writeCalls.flatMap(call => call[1]);
      const customConfig = configsWritten.find(config => config.key === 'custom.key');

      expect(customConfig).toBeDefined();
      expect(customConfig.value).toBe('custom-value');
      expect(customConfig.category).toBe('custom');
    });

    it('should continue if individual config initialization fails', async () => {
      // Mock setConfig to fail for one config
      const originalSetConfig = configService.setConfig;
      configService.setConfig = jest.fn()
        .mockRejectedValueOnce(new Error('Failed to set config'))
        .mockResolvedValue({ key: 'success.key' });

      await configService.initializeDefaults({
        'fail.key': { value: 'fail', type: 'string', category: 'test', description: 'Fail' },
        'success.key': { value: 'success', type: 'string', category: 'test', description: 'Success' }
      });

      // Should have still created the successful config
      expect(localJsonService.writeJsonFile).toHaveBeenCalled();

      // Restore original function
      configService.setConfig = originalSetConfig;
    });
  });

  describe('Cache management', () => {
    it('should clear config cache', () => {
      configService.setCachedConfig('test.key', 'cached-value');
      expect(configService.getCachedConfig('test.key')).toBe('cached-value');

      configService.clearConfigCache();
      expect(configService.getCachedConfig('test.key')).toBeNull();
    });

    it('should return null for expired cache', () => {
      configService.setCachedConfig('test.key', 'cached-value');

      // Mock Date.now to return time after TTL (5 minutes + 1 second)
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() + (5 * 60 * 1000) + 1000);

      expect(configService.getCachedConfig('test.key')).toBeNull();

      Date.now = originalDateNow;
    });
  });

  describe('Error handling', () => {
    it('should handle JSON storage errors in getConfig', async () => {
      localJsonService.getAllRows.mockRejectedValue(new Error('Storage error'));

      await expect(configService.getConfig('test.key')).rejects.toThrow('Failed to retrieve configuration from JSON');
    });

    it('should handle JSON storage errors in getAllConfig', async () => {
      localJsonService.getAllRows.mockRejectedValue(new Error('Storage error'));

      await expect(configService.getAllConfig()).rejects.toThrow('Failed to retrieve configuration from JSON');
    });

    it('should handle JSON storage errors in setConfig', async () => {
      localJsonService.getAllRows.mockResolvedValue([]);
      localJsonService.writeJsonFile.mockRejectedValue(new Error('Storage error'));

      await expect(configService.setConfig('test.key', 'value', 'string', 'system')).rejects.toThrow('Failed to save configuration to JSON');
    });
  });

  describe('Configuration model integration', () => {
    it('should use Configuration.create for validation', async () => {
      const mockConfig = { key: 'test.key', value: 'test-value', type: 'string' };
      Configuration.create = jest.fn().mockReturnValue(mockConfig);

      await configService.setConfig('test.key', 'test-value', 'string', 'system');

      expect(Configuration.create).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test.key',
          value: 'test-value',
          type: 'string',
          category: 'system'
        }),
        null
      );
    });
  });
});