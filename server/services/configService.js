/**
 * Configuration Service for NJDSC School Compliance Portal
 *
 * Manages system configuration stored in Google Sheets with caching
 * and validation. Provides CRUD operations for configuration management.
 */

const { google } = require('googleapis');
const Configuration = require('../models/Configuration');

// Environment variables
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const CONFIG_SPREADSHEET_ID = process.env.GOOGLE_CONFIG_SPREADSHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

// Validate required environment variables
if (!SERVICE_ACCOUNT_KEY) {
  throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required');
}

if (!CONFIG_SPREADSHEET_ID) {
  throw new Error('GOOGLE_CONFIG_SPREADSHEET_ID or GOOGLE_SHEETS_SPREADSHEET_ID environment variable is required');
}

// Parse service account credentials
let credentials;
try {
  credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
} catch (error) {
  throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.');
}

// Initialize Google Sheets API client
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Configuration sheet settings
const CONFIG_SHEET_NAME = 'Configuration';

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
 * Retrieves all configuration from Google Sheets
 * @returns {Array<Configuration>} Array of Configuration instances
 */
async function getAllConfigFromSheets() {
  try {
    validateSpreadsheetParams(CONFIG_SPREADSHEET_ID, CONFIG_SHEET_NAME);

    logOperation('getAllConfigFromSheets', { spreadsheetId: CONFIG_SPREADSHEET_ID, sheetName: CONFIG_SHEET_NAME });

    const range = `${CONFIG_SHEET_NAME}!A:G`; // Read all columns A to G

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG_SPREADSHEET_ID,
      range,
    });

    const rows = response.data.values || [];
    const configs = [];

    // Skip header row if it exists (assuming first row is headers)
    const dataRows = rows.length > 0 && rows[0][0] === 'key' ? rows.slice(1) : rows;

    for (const row of dataRows) {
      if (row.length > 0) { // Skip empty rows
        try {
          const config = rowToConfig(row);
          if (config.key) { // Only include rows with valid keys
            configs.push(config);
          }
        } catch (error) {
          console.warn('Skipping invalid config row:', row, error.message);
        }
      }
    }

    logOperation('getAllConfigFromSheets', { configCount: configs.length });

    return configs;

  } catch (error) {
    handleApiError(error, 'getAllConfigFromSheets');
  }
}

/**
 * Updates or creates a configuration entry in Google Sheets
 * @param {Configuration} config - Configuration instance to save
 * @returns {Configuration} The saved configuration
 */
async function saveConfigToSheets(config) {
  try {
    validateSpreadsheetParams(CONFIG_SPREADSHEET_ID, CONFIG_SHEET_NAME);

    logOperation('saveConfigToSheets', { key: config.key, type: config.type, category: config.category });

    // Get all existing configs to find if this key exists
    const allConfigs = await getAllConfigFromSheets();
    const existingIndex = allConfigs.findIndex(c => c.key === config.key);

    const row = configToRow(config);

    if (existingIndex >= 0) {
      // Update existing row
      const sheetRowNumber = existingIndex + 2; // +1 for header, +1 for 1-based
      const range = `${CONFIG_SHEET_NAME}!A${sheetRowNumber}:G${sheetRowNumber}`;

      await sheets.spreadsheets.values.update({
        spreadsheetId: CONFIG_SPREADSHEET_ID,
        range,
        valueInputOption: 'RAW',
        resource: {
          values: [row],
        },
      });

      logOperation('saveConfigToSheets', { action: 'updated', range });
    } else {
      // Append new row
      const range = `${CONFIG_SHEET_NAME}!A:A`; // Append to the end

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: CONFIG_SPREADSHEET_ID,
        range,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [row],
        },
      });

      logOperation('saveConfigToSheets', {
        action: 'created',
        updatedRange: response.data.updates.updatedRange
      });
    }

    // Clear cache since config changed
    clearConfigCache();

    return config;

  } catch (error) {
    handleApiError(error, 'saveConfigToSheets');
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

  // Get from sheets
  const allConfigs = await getAllConfigFromSheets();
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

  const allConfigs = await getAllConfigFromSheets();
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

  // Save to sheets
  const savedConfig = await saveConfigToSheets(config);

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
async function initializeDefaults(customDefaults = {}, updatedBy = 'system') {
  const defaults = { ...DEFAULT_CONFIGS, ...customDefaults };

  logOperation('initializeDefaults', { defaultKeys: Object.keys(defaults) });

  try {
    const existingConfigs = await getAllConfigFromSheets();
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

module.exports = {
  getConfig,
  getAllConfig,
  setConfig,
  validateConfig,
  initializeDefaults,
  clearConfigCache,

  // Utility functions for testing
  getCachedConfig,
  setCachedConfig,
};