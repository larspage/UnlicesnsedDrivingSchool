/**
 * Configuration Service for NJDSC School Compliance Portal
 *
 * Manages system configuration stored in Google Sheets with caching
 * and validation. Provides CRUD operations for configuration management.
 */

const localJsonService = require('./localJsonService');
const Configuration = require('../models/Configuration');

// Configuration constants
const CONFIG_DATA_FILE = 'config';

// Column mapping for Configuration table
const CONFIG_COLUMNS = {
  key: 0,           // Column A
  value: 1,         // Column B
  type: 2,          // Column C
  category: 3,      // Column D
  description: 4,   // Column E
  updatedAt: 5,     // Column F
  updatedBy: 6      // Column G
};

// In-memory cache for configuration
const configCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {*} value - Cached value
 * @property {number} timestamp - Cache timestamp
 */

/**
 * Validates spreadsheet parameters
 * @param {string} spreadsheetId - Google Sheets spreadsheet ID
 * @param {string} sheetName - Name of the sheet
 * @throws {Error} If validation fails
 */
function validateSpreadsheetParams(spreadsheetId, sheetName) {
  if (!spreadsheetId || typeof spreadsheetId !== 'string') {
    throw new Error('Invalid spreadsheetId: must be a non-empty string');
  }

  if (!sheetName || typeof sheetName !== 'string') {
    throw new Error('Invalid sheetName: must be a non-empty string');
  }
}

/**
 * Logs operation details for debugging and monitoring
 * @param {string} operation - Operation name
 * @param {Object} details - Additional details to log
 */
function logOperation(operation, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ConfigService.${operation}:`, details);
}

/**
 * Handles Google Sheets API errors
 * @param {Error} error - Error from Google Sheets API
 * @param {string} operation - Operation that failed
 * @throws {Error} Processed error with context
 */
function handleApiError(error, operation) {
  logOperation(operation, { error: error.message, code: error.code });

  if (error.code === 403) {
    throw new Error('Access denied to Google Sheets. Check service account permissions.');
  } else if (error.code === 404) {
    throw new Error('Configuration spreadsheet or sheet not found. Verify spreadsheet ID and sheet name.');
  } else if (error.code === 429) {
    throw new Error('Google Sheets API rate limit exceeded. Please try again later.');
  } else {
    throw new Error(`Google Sheets API error during ${operation}: ${error.message}`);
  }
}

/**
 * Converts a Configuration instance to a Google Sheets row array
 * @param {Configuration} config - Configuration instance
 * @returns {Array} Array of values for the sheet row
 */
function configToRow(config) {
  const row = new Array(7); // 7 columns (A to G)

  row[CONFIG_COLUMNS.key] = config.key || '';
  row[CONFIG_COLUMNS.value] = config.getStringValue() || '';
  row[CONFIG_COLUMNS.type] = config.type || '';
  row[CONFIG_COLUMNS.category] = config.category || '';
  row[CONFIG_COLUMNS.description] = config.description || '';
  row[CONFIG_COLUMNS.updatedAt] = config.updatedAt || '';
  row[CONFIG_COLUMNS.updatedBy] = config.updatedBy || '';

  return row;
}

/**
 * Converts a Google Sheets row array to a Configuration instance
 * @param {Array} row - Array of values from the sheet row
 * @returns {Configuration} Configuration instance
 * @throws {Error} If row data is invalid
 */
function rowToConfig(row) {
  if (!Array.isArray(row) || row.length < 7) {
    throw new Error('Invalid row data: must be an array with at least 7 elements');
  }

  const data = {
    key: row[CONFIG_COLUMNS.key] || null,
    value: row[CONFIG_COLUMNS.value] || null,
    type: row[CONFIG_COLUMNS.type] || null,
    category: row[CONFIG_COLUMNS.category] || null,
    description: row[CONFIG_COLUMNS.description] || null,
    updatedAt: row[CONFIG_COLUMNS.updatedAt] || null,
    updatedBy: row[CONFIG_COLUMNS.updatedBy] || null
  };

  // Filter out null values for required fields validation
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== null)
  );

  return new Configuration(cleanData);
}

/**
 * Gets cached configuration value if valid
 * @param {string} key - Configuration key
 * @returns {*} Cached value or null if not cached/expired
 */
function getCachedConfig(key) {
  const entry = configCache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL) {
    configCache.delete(key);
    return null;
  }

  return entry.value;
}

/**
 * Sets cached configuration value
 * @param {string} key - Configuration key
 * @param {*} value - Value to cache
 */
function setCachedConfig(key, value) {
  configCache.set(key, {
    value,
    timestamp: Date.now()
  });
}

/**
 * Clears all cached configuration
 */
function clearConfigCache() {
  configCache.clear();
}

/**
 * Retrieves all configuration from local JSON storage
 * @returns {Array<Configuration>} Array of Configuration instances
 */
async function getAllConfigFromJson() {
  try {
    logOperation('getAllConfigFromJson', { dataFile: CONFIG_DATA_FILE });

    const configsData = await localJsonService.getAllRows(null, CONFIG_DATA_FILE);
    const configs = [];

    for (const configData of configsData) {
      try {
        const config = new Configuration(configData);
        if (config.key) { // Only include rows with valid keys
          configs.push(config);
        }
      } catch (error) {
        console.warn('Skipping invalid config data:', configData, error.message);
      }
    }

    logOperation('getAllConfigFromJson', { configCount: configs.length });

    return configs;

  } catch (error) {
    logOperation('getAllConfigFromJson', { error: error.message });
    throw new Error(`Failed to retrieve configuration from JSON: ${error.message}`);
  }
}

/**
 * Updates or creates a configuration entry in local JSON storage
 * @param {Configuration} config - Configuration instance to save
 * @returns {Configuration} The saved configuration
 */
async function saveConfigToJson(config) {
  try {
    logOperation('saveConfigToJson', { key: config.key, type: config.type, category: config.category });

    // Get all existing configs to find if this key exists
    const allConfigs = await getAllConfigFromJson();
    const existingIndex = allConfigs.findIndex(c => c.key === config.key);

    if (existingIndex >= 0) {
      // Update existing config
      allConfigs[existingIndex] = config;
      logOperation('saveConfigToJson', { action: 'updated' });
    } else {
      // Add new config
      allConfigs.push(config);
      logOperation('saveConfigToJson', { action: 'created' });
    }

    // Save to JSON file
    await localJsonService.writeJsonFile(CONFIG_DATA_FILE, allConfigs);

    // Clear cache since config changed
    clearConfigCache();

    return config;

  } catch (error) {
    logOperation('saveConfigToJson', { error: error.message });
    throw new Error(`Failed to save configuration to JSON: ${error.message}`);
  }
}

/**
 * Retrieves a single configuration value by key
 * @param {string} key - Configuration key
 * @returns {*} Configuration value or null if not found
 * @throws {Error} If key is invalid
 */
async function getConfig(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('Invalid key: must be a non-empty string');
  }

  // Check cache first
  const cachedValue = getCachedConfig(key);
  if (cachedValue !== null) {
    logOperation('getConfig', { key, source: 'cache' });
    return cachedValue;
  }

  // Get from JSON
  const allConfigs = await getAllConfigFromJson();
  const config = allConfigs.find(c => c.key === key);

  if (!config) {
    logOperation('getConfig', { key, found: false });
    return null;
  }

  const value = config.getTypedValue();

  // Cache the value
  setCachedConfig(key, value);

  logOperation('getConfig', { key, found: true, type: config.type, source: 'sheets' });
  return value;
}

/**
 * Retrieves all configuration settings
 * @returns {Object} Object with all configuration key-value pairs
 */
async function getAllConfig() {
  logOperation('getAllConfig');

  const allConfigs = await getAllConfigFromJson();
  const configObject = {};

  for (const config of allConfigs) {
    configObject[config.key] = config.getTypedValue();
    // Cache individual values
    setCachedConfig(config.key, config.getTypedValue());
  }

  logOperation('getAllConfig', { totalConfigs: Object.keys(configObject).length });
  return configObject;
}

/**
 * Updates or creates a configuration value
 * @param {string} key - Configuration key
 * @param {*} value - Configuration value
 * @param {string} type - Data type (string, number, boolean, json)
 * @param {string} category - Configuration category (email, google, system)
 * @param {string} [description] - Human-readable description
 * @param {string} [updatedBy] - Admin who updated the config
 * @returns {Configuration} The updated configuration
 * @throws {Error} If validation fails
 */
async function setConfig(key, value, type, category, description = '', updatedBy = null) {
  if (!key || typeof key !== 'string') {
    throw new Error('Invalid key: must be a non-empty string');
  }

  // Validate the input using Configuration model
  const configData = {
    key,
    value,
    type,
    category,
    description,
    updatedAt: new Date().toISOString(),
    updatedBy
  };

  const config = Configuration.create(configData, updatedBy);

  // Save to JSON
  const savedConfig = await saveConfigToJson(config);

  logOperation('setConfig', {
    key,
    type,
    category,
    updatedBy,
    success: true
  });

  return savedConfig;
}

/**
 * Validates configuration input without saving
 * @param {string} key - Configuration key
 * @param {*} value - Configuration value
 * @param {string} type - Data type
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validateConfig(key, value, type) {
  try {
    // Create a temporary config to validate
    const tempConfig = new Configuration({
      key,
      value,
      type,
      category: 'system', // Temporary category for validation
      updatedAt: new Date().toISOString()
    });

    logOperation('validateConfig', { key, type, valid: true });
    return true;
  } catch (error) {
    logOperation('validateConfig', { key, type, valid: false, error: error.message });
    throw error;
  }
}

/**
 * Default configuration values for first-time setup
 */
const DEFAULT_CONFIGS = {
  // Email configuration
  'email.toAddress': {
    value: process.env.EMAIL_TO_ADDRESS || 'mvc.blsdrivingschools@mvc.nj.gov',
    type: 'string',
    category: 'email',
    description: 'Email address for MVC driving school complaints'
  },
  'email.fromAddress': {
    value: process.env.EMAIL_FROM_ADDRESS || 'treasurer@njdsc.org',
    type: 'string',
    category: 'email',
    description: 'Sender email address for MVC communications'
  },
  'email.subjectTemplate': {
    value: process.env.EMAIL_SUBJECT_TEMPLATE || 'Unlicensed driving school [[School Name]]',
    type: 'string',
    category: 'email',
    description: 'Email subject template for MVC reports'
  },
  'email.bodyTemplate': {
    value: process.env.EMAIL_BODY_TEMPLATE || 'Dear MVC,\n\nPlease investigate the following unlicensed driving school: [[School Name]] at [[Location]].\n\nViolation Description: [[ViolationDescription]]\n\nContact Information: [[PhoneNumber]]\n\nAdditional Information: [[AdditionalInfo]]\n\nReported via NJDSC Compliance Portal.\n\nSincerely,\nNJDSC Compliance Team',
    type: 'string',
    category: 'email',
    description: 'Email body template for MVC reports'
  },

  // Google API configuration
  'google.sheets.spreadsheetId': {
    value: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
    type: 'string',
    category: 'google',
    description: 'Google Sheets spreadsheet ID for storing reports'
  },
  'google.drive.folderId': {
    value: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
    type: 'string',
    category: 'google',
    description: 'Google Drive folder ID for storing uploaded files'
  },

  // System configuration
  'system.rateLimitPerHour': {
    value: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5,
    type: 'number',
    category: 'system',
    description: 'Maximum reports allowed per hour per IP address'
  },
  'system.maxFileSize': {
    value: parseInt(process.env.MAX_FILE_SIZE) || 10485760,
    type: 'number',
    category: 'system',
    description: 'Maximum file size for uploads in bytes (default: 10MB)'
  },
  'system.maxFilesPerReport': {
    value: 10,
    type: 'number',
    category: 'system',
    description: 'Maximum number of files allowed per report'
  },
  'system.sessionTimeout': {
    value: 3600000, // 1 hour in milliseconds
    type: 'number',
    category: 'system',
    description: 'Session timeout in milliseconds'
  }
};

/**
 * Initializes default configuration values if they don't exist
 * @param {Object} [customDefaults] - Custom default configuration object (optional)
 * @param {string} [updatedBy] - Admin initializing the config
 */
async function initializeDefaults(customDefaults = {}, updatedBy = null) {
  const defaults = { ...DEFAULT_CONFIGS, ...customDefaults };

  logOperation('initializeDefaults', { defaultKeys: Object.keys(defaults) });

  try {
    const existingConfigs = await getAllConfigFromJson();
    const existingKeys = new Set(existingConfigs.map(c => c.key));

    let initializedCount = 0;

    for (const [key, configDef] of Object.entries(defaults)) {
      if (!existingKeys.has(key)) {
        try {
          await setConfig(
            key,
            configDef.value,
            configDef.type,
            configDef.category,
            configDef.description,
            updatedBy
          );
          initializedCount++;
          logOperation('initializeDefaults', { key, action: 'created' });
        } catch (error) {
          console.warn(`Failed to initialize default config for ${key}:`, error.message);
        }
      }
    }

    logOperation('initializeDefaults', {
      totalDefaults: Object.keys(defaults).length,
      initializedCount,
      skippedCount: Object.keys(defaults).length - initializedCount
    });

  } catch (error) {
    console.error('Error during configuration initialization:', error);
    // Don't throw - allow app to continue even if config init fails
  }
}

/**
 * Ensures the configuration file exists with fallback mechanisms
 * @returns {Promise<void>}
 */
async function ensureConfigFile() {
  try {
    // Ensure data directory exists first
    if (typeof localJsonService.ensureDataDirectory === 'function') {
      await localJsonService.ensureDataDirectory();
    }

    // Preferred path: use ensureSheetExists if the localJsonService exposes it (keeps existing behavior)
    if (typeof localJsonService.ensureSheetExists === 'function') {
      await localJsonService.ensureSheetExists(null, CONFIG_DATA_FILE);
      return;
    }

    // Fallback path: try to read existing rows; if it fails or returns nothing, create an empty file
    if (typeof localJsonService.getAllRows === 'function') {
      try {
        const rows = await localJsonService.getAllRows(null, CONFIG_DATA_FILE);
        if (Array.isArray(rows)) {
          // file exists and is readable -> nothing more to do
          return;
        }
      } catch (err) {
        // swallow and fall through to attempt creation
      }
    }

    // Last-resort: create an empty config file using writeJsonFile (most localJsonService implementations provide this)
    if (typeof localJsonService.writeJsonFile === 'function') {
      await localJsonService.writeJsonFile(CONFIG_DATA_FILE, []);
      return;
    }

    // If we reach here, we couldn't ensure the file with available APIs
    throw new Error('No supported localJsonService methods to ensure config file');
  } catch (error) {
    // Try a rescue write before failing the whole flow - makes tests resilient
    console.error('Failed to ensure config file:', error.message);

    if (typeof localJsonService.writeJsonFile === 'function') {
      try {
        await localJsonService.writeJsonFile(CONFIG_DATA_FILE, []);
        console.warn('Created fallback empty config file');
        return;
      } catch (err) {
        console.error('Failed to create fallback config file:', err.message);
      }
    }

    // If fallback also failed, rethrow a Storage error to keep the existing API behavior
    throw new Error('Storage error');
  }
}

module.exports = {
  getConfig,
  getAllConfig,
  setConfig,
  validateConfig,
  initializeDefaults,
  clearConfigCache,
  ensureConfigFile,

  // Utility functions for testing
  getCachedConfig,
  setCachedConfig,
};