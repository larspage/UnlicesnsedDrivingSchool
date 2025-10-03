/**
 * Configuration Model for NJDSC School Compliance Portal
 *
 * Represents a configuration key-value pair with type validation,
 * update tracking, and business rule enforcement.
 */

const Joi = require('joi');

/**
 * Configuration value types
 * @enum {string}
 */
const CONFIG_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  JSON: 'json'
};

/**
 * Configuration categories
 * @enum {string}
 */
const CONFIG_CATEGORIES = {
  EMAIL: 'email',
  GOOGLE: 'google',
  SYSTEM: 'system'
};

/**
 * Configuration class representing a key-value configuration entry
 */
class Configuration {
  /**
   * Creates a new Configuration instance with validation
   * @param {Object} data - Configuration data
   * @param {string} data.key - Configuration key
   * @param {*} data.value - Configuration value
   * @param {string} data.type - Data type
   * @param {string} data.category - Configuration category
   * @param {string} [data.description] - Human-readable description
   * @param {string} data.updatedAt - Last update timestamp
   * @param {string} [data.updatedBy] - Admin who last updated
   */
  constructor(data) {
    // Validate input data
    const validatedData = Configuration.validateData(data);

    // Assign validated properties
    this.key = validatedData.key;
    this.value = validatedData.value;
    this.type = validatedData.type;
    this.category = validatedData.category;
    this.description = validatedData.description;
    this.updatedAt = validatedData.updatedAt;
    this.updatedBy = validatedData.updatedBy;
  }

  /**
   * Validates configuration data using Joi schema
   * @param {Object} data - Data to validate
   * @returns {Object} Validated and sanitized data
   * @throws {Error} If validation fails
   */
  static validateData(data) {
    const schema = Joi.object({
      key: Joi.string().max(100).trim().required(),
      value: Joi.any().required(), // Will be validated by type
      type: Joi.string().valid(...Object.values(CONFIG_TYPES)).required(),
      category: Joi.string().valid(...Object.values(CONFIG_CATEGORIES)).required(),
      description: Joi.string().max(500).allow(''),
      updatedAt: Joi.string().isoDate().required(),
      updatedBy: Joi.string().email().allow('', null).optional()
    });

    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join('; ');
      throw new Error(`Configuration validation failed: ${errorMessages}`);
    }

    // Additional type-specific validation
    const typedValue = Configuration.validateAndConvertValue(value.value, value.type);
    value.value = typedValue;

    return value;
  }

  /**
   * Validates and converts a value based on its type
   * @param {*} value - Value to validate and convert
   * @param {string} type - Expected type
   * @returns {*} Converted value
   * @throws {Error} If validation fails
   */
  static validateAndConvertValue(value, type) {
    switch (type) {
      case CONFIG_TYPES.STRING:
        if (typeof value !== 'string') {
          throw new Error(`Value must be a string for type ${type}`);
        }
        if (value.length > 5000) {
          throw new Error('String value exceeds maximum length of 5000 characters');
        }
        return value.trim();

      case CONFIG_TYPES.NUMBER:
        const numValue = Number(value);
        if (isNaN(numValue)) {
          throw new Error(`Value must be a valid number for type ${type}`);
        }
        return numValue;

      case CONFIG_TYPES.BOOLEAN:
        if (typeof value === 'boolean') {
          return value;
        }
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase().trim();
          if (lowerValue === 'true') return true;
          if (lowerValue === 'false') return false;
        }
        throw new Error(`Value must be a boolean for type ${type}`);

      case CONFIG_TYPES.JSON:
        let parsedValue;
        if (typeof value === 'string') {
          try {
            parsedValue = JSON.parse(value);
          } catch (error) {
            throw new Error(`Value must be valid JSON for type ${type}`);
          }
        } else if (typeof value === 'object') {
          parsedValue = value;
        } else {
          throw new Error(`Value must be an object or valid JSON string for type ${type}`);
        }

        // Validate JSON string length
        const jsonString = JSON.stringify(parsedValue);
        if (jsonString.length > 5000) {
          throw new Error('JSON value exceeds maximum length of 5000 characters when serialized');
        }

        return parsedValue;

      default:
        throw new Error(`Unknown configuration type: ${type}`);
    }
  }

  /**
   * Validates business rules for the configuration
   * @param {Array} existingConfigs - Array of existing configurations
   * @throws {Error} If business rules are violated
   */
  validateBusinessRules(existingConfigs = []) {
    // Check for duplicate keys
    const duplicate = existingConfigs.find(config => config.key === this.key);
    if (duplicate) {
      throw new Error(`Configuration key "${this.key}" already exists`);
    }

    // Validate category
    if (!Object.values(CONFIG_CATEGORIES).includes(this.category)) {
      throw new Error(`Invalid category: ${this.category}`);
    }

    // Validate type
    if (!Object.values(CONFIG_TYPES).includes(this.type)) {
      throw new Error(`Invalid type: ${this.type}`);
    }

    // Category-specific validations
    this.validateCategoryRules();
  }

  /**
   * Validates category-specific business rules
   * @throws {Error} If category rules are violated
   */
  validateCategoryRules() {
    switch (this.category) {
      case CONFIG_CATEGORIES.EMAIL:
        this.validateEmailConfig();
        break;
      case CONFIG_CATEGORIES.GOOGLE:
        this.validateGoogleConfig();
        break;
      case CONFIG_CATEGORIES.SYSTEM:
        this.validateSystemConfig();
        break;
    }
  }

  /**
   * Validates email configuration rules
   * @throws {Error} If email config rules are violated
   */
  validateEmailConfig() {
    const emailKeys = ['email.toAddress', 'email.fromAddress', 'email.subjectTemplate', 'email.bodyTemplate'];

    if (!emailKeys.some(key => this.key.startsWith(key.split('.')[0] + '.'))) {
      // Allow any email.* keys but validate known ones
    }

    // Validate email addresses
    if (this.key.includes('Address') && this.type === CONFIG_TYPES.STRING) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.value)) {
        throw new Error(`Invalid email address for key "${this.key}": ${this.value}`);
      }
    }
  }

  /**
   * Validates Google configuration rules
   * @throws {Error} If Google config rules are violated
   */
  validateGoogleConfig() {
    const googleKeys = ['google.sheets.spreadsheetId', 'google.drive.folderId'];

    // Validate known Google config keys
    if (googleKeys.includes(this.key)) {
      if (this.type !== CONFIG_TYPES.STRING) {
        throw new Error(`Google configuration "${this.key}" must be of type string`);
      }

      // Basic validation for Google IDs
      if (this.key.includes('spreadsheetId') || this.key.includes('folderId')) {
        if (this.value.length < 10) {
          throw new Error(`Invalid Google ID for key "${this.key}": too short`);
        }
      }
    }
  }

  /**
   * Validates system configuration rules
   * @throws {Error} If system config rules are violated
   */
  validateSystemConfig() {
    const systemKeys = ['system.rateLimitPerHour', 'system.maxFileSize'];

    // Validate known system config keys
    if (systemKeys.includes(this.key)) {
      if (this.key.includes('rateLimit') && this.type === CONFIG_TYPES.NUMBER) {
        if (this.value < 0 || this.value > 1000) {
          throw new Error(`Rate limit must be between 0 and 1000 for key "${this.key}"`);
        }
      }

      if (this.key.includes('maxFileSize') && this.type === CONFIG_TYPES.NUMBER) {
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (this.value < 0 || this.value > maxSize) {
          throw new Error(`Max file size must be between 0 and ${maxSize} bytes for key "${this.key}"`);
        }
      }
    }
  }

  /**
   * Gets the typed value (parsed according to type)
   * @returns {*} Parsed value according to its type
   */
  getTypedValue() {
    return this.value;
  }

  /**
   * Gets the string representation of the value
   * @returns {string} String representation
   */
  getStringValue() {
    switch (this.type) {
      case CONFIG_TYPES.STRING:
        return this.value;
      case CONFIG_TYPES.NUMBER:
        return this.value.toString();
      case CONFIG_TYPES.BOOLEAN:
        return this.value.toString();
      case CONFIG_TYPES.JSON:
        return JSON.stringify(this.value);
      default:
        return String(this.value);
    }
  }


  /**
   * Creates a new configuration entry
   * @param {Object} data - Initial configuration data
   * @param {string} [updatedBy] - Admin who created the config
   * @returns {Configuration} New Configuration instance
   */
  static create(data, updatedBy = null) {
    const configData = {
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy
    };

    return new Configuration(configData);
  }

  /**
   * Updates the configuration with new data and timestamp
   * @param {Object} updateData - Data to update
   * @param {string} [updatedBy] - Admin who updated the config
   * @returns {Configuration} Updated Configuration instance
   */
  update(updateData, updatedBy = null) {
    const updatedConfigData = {
      ...this,
      ...updateData,
      key: this.key, // Ensure key doesn't change
      updatedAt: new Date().toISOString(),
      updatedBy
    };

    return new Configuration(updatedConfigData);
  }

  /**
   * Gets the configuration types enum
   * @returns {Object} Types enumeration
   */
  static getTypesEnum() {
    return CONFIG_TYPES;
  }

  /**
   * Gets the configuration categories enum
   * @returns {Object} Categories enumeration
   */
  static getCategoriesEnum() {
    return CONFIG_CATEGORIES;
  }
}

module.exports = Configuration;