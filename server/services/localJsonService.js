/**
 * Local JSON Storage Service for NJDSC School Compliance Portal
 *
 * Provides file-based JSON storage to replace Google Sheets functionality.
 * Supports CRUD operations with atomic writes and error handling.
 */

const fs = require('fs').promises;
const path = require('path');
const { attemptAsync, isSuccess } = require('../utils/result');
const { createError, ERROR_CODES } = require('../utils/errorUtils');
const { getDataDir } = require('../utils/fsUtils');

// Helper to log getDataDir usage for debugging
const getDataDirWithLog = () => {
  const dataDir = getDataDir();
  console.log('[LOCAL JSON SERVICE] getDataDir called:', {
    DATA_DIR: process.env.DATA_DIR,
    cwd: process.cwd(),
    resolvedDataDir: dataDir,
    timestamp: new Date().toISOString()
  });
  return dataDir;
};

/**
 * Ensures the data directory exists
 * @returns {Promise<void>}
 */
async function ensureDataDir() {
  const dataDir = getDataDirWithLog();
  
  try {
    await fs.access(dataDir);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(dataDir, { recursive: true });
  }
}

/**
 * Validates sheet name for safe file operations
 * @param {string} sheetName - Name of the sheet (used as filename)
 * @returns {boolean} - True if valid
 */
function isValidSheetName(sheetName) {
  if (!sheetName || typeof sheetName !== 'string') {
    return false;
  }
  
  // Remove any path separators and restrict to safe characters
  const safeName = sheetName.replace(/[/\\]/g, '').replace(/[<>:"/\\|?*]/g, '');
  
  // Check if it doesn't contain null bytes or control characters
  if (safeName.match(/[\x00-\x1f\x7f]/)) {
    return false;
  }
  
  // Ensure it's not too long (Windows limit)
  return safeName.length > 0 && safeName.length <= 255;
}

/**
 * Get file path for a sheet
 * @param {string} sheetName - Name of the sheet
 * @returns {string} - Full file path
 */
function getSheetFilePath(sheetName) {
  if (!isValidSheetName(sheetName)) {
    throw createError('VALIDATION_ERROR', 'Invalid sheet name', { field: 'sheetName', actualValue: sheetName });
  }
  
  return path.join(getDataDirWithLog(), `${sheetName}.json`);
}

/**
 * Read JSON file safely with error handling
 * @param {string} sheetName - Name of the sheet
 * @returns {Promise<Array>} - Array of data
 */
async function readJsonFile(sheetName) {
  return attemptAsync(async () => {
    if (!sheetName || typeof sheetName !== 'string' || sheetName.trim().length === 0) {
      throw createError('VALIDATION_ERROR', 'Sheet name is required and must be a non-empty string', { field: 'sheetName', actualValue: sheetName });
    }

    const filePath = getSheetFilePath(sheetName);
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return empty array
        return [];
      }
      throw error;
    }
  }, { operation: 'readJsonFile', details: { sheetName } });
}

/**
 * Write JSON file atomically with temporary file
 * @param {string} sheetName - Name of the sheet
 * @param {Array} data - Data to write
 * @returns {Promise<void>}
 */
async function writeJsonFile(sheetName, data) {
  return attemptAsync(async () => {
    if (!sheetName || typeof sheetName !== 'string' || sheetName.trim().length === 0) {
      throw createError('VALIDATION_ERROR', 'Sheet name is required and must be a non-empty string', { field: 'sheetName', actualValue: sheetName });
    }

    if (!Array.isArray(data)) {
      throw createError('VALIDATION_ERROR', 'Data must be an array', { field: 'data', actualType: typeof data });
    }

    const filePath = getSheetFilePath(sheetName);
    const tempFilePath = `${filePath}.tmp`;
    const jsonData = JSON.stringify(data, null, 2);
    
    // Write to temporary file first
    await fs.writeFile(tempFilePath, jsonData, 'utf8');
    
    // Atomic rename to final location
    await fs.rename(tempFilePath, filePath);
  }, { operation: 'writeJsonFile', details: { sheetName, dataCount: data.length } });
}

/**
 * Get all rows from a sheet
 * @param {string} spreadsheetId - Ignored (for compatibility)
 * @param {string} sheetName - Name of the sheet
 * @returns {Promise<Result<Array>>} Success with data or error
 */
async function getAllRows(spreadsheetId, sheetName) {
  return attemptAsync(async () => {
    const data = await readJsonFile(sheetName);
    return data;
  }, { operation: 'getAllRows', details: { sheetName } });
}

/**
 * Append a row to a sheet
 * @param {string} spreadsheetId - Ignored (for compatibility)
 * @param {string} sheetName - Name of the sheet
 * @param {Object} rowData - Data to append
 * @returns {Promise<Result<Object>>} Success with the added row or error
 */
async function appendRow(spreadsheetId, sheetName, rowData) {
  return attemptAsync(async () => {
    if (!rowData || typeof rowData !== 'object') {
      throw createError('VALIDATION_ERROR', 'Row data must be an object', { field: 'rowData', actualType: typeof rowData });
    }

    // Read existing data
    const existingData = await readJsonFile(sheetName);
    
    if (!Array.isArray(existingData)) {
      throw createError('SYSTEM_ERROR', 'Existing data is not an array', { sheetName });
    }
    
    // Add timestamp if not provided
    if (!rowData.createdAt) {
      rowData.createdAt = new Date().toISOString();
    }
    
    // Add to array
    existingData.push(rowData);
    
    // Write back
    await writeJsonFile(sheetName, existingData);
    
    return rowData;
  }, { operation: 'appendRow', details: { sheetName } });
}

/**
 * Update a row in a sheet by ID
 * @param {string} spreadsheetId - Ignored (for compatibility)
 * @param {string} sheetName - Name of the sheet
 * @param {string} rowId - ID of the row to update
 * @param {Object} updateData - Data to update
 * @returns {Promise<Result<Object>>} Success with the updated row or error
 */
async function updateRow(spreadsheetId, sheetName, rowId, updateData) {
  return attemptAsync(async () => {
    if (!rowId) {
      throw createError('VALIDATION_ERROR', 'Row ID is required', { field: 'rowId' });
    }

    if (!updateData || typeof updateData !== 'object') {
      throw createError('VALIDATION_ERROR', 'Update data must be an object', { field: 'updateData', actualType: typeof updateData });
    }

    // Read existing data
    const existingData = await readJsonFile(sheetName);
    
    if (!Array.isArray(existingData)) {
      throw createError('SYSTEM_ERROR', 'Existing data is not an array', { sheetName });
    }
    
    // Find row by ID
    const rowIndex = existingData.findIndex((row) => row.id === rowId);
    
    if (rowIndex === -1) {
      throw createError('NOT_FOUND', `Row with ID ${rowId} not found in ${sheetName}`, { sheetName, rowId });
    }
    
    // Update the row
    const updatedRow = {
      ...existingData[rowIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    existingData[rowIndex] = updatedRow;
    
    // Write back
    await writeJsonFile(sheetName, existingData);
    
    return updatedRow;
  }, { operation: 'updateRow', details: { sheetName, rowId } });
}

/**
 * Delete a row from a sheet by ID
 * @param {string} spreadsheetId - Ignored (for compatibility)
 * @param {string} sheetName - Name of the sheet
 * @param {string} rowId - ID of the row to delete
 * @returns {Promise<Result<boolean>>} Success with true or error
 */
async function deleteRow(spreadsheetId, sheetName, rowId) {
  return attemptAsync(async () => {
    if (!rowId) {
      throw createError('VALIDATION_ERROR', 'Row ID is required', { field: 'rowId' });
    }

    // Read existing data
    const existingData = await readJsonFile(sheetName);
    
    if (!Array.isArray(existingData)) {
      throw createError('SYSTEM_ERROR', 'Existing data is not an array', { sheetName });
    }
    
    // Find row by ID
    const rowIndex = existingData.findIndex((row) => row.id === rowId);
    
    if (rowIndex === -1) {
      throw createError('NOT_FOUND', `Row with ID ${rowId} not found in ${sheetName}`, { sheetName, rowId });
    }
    
    // Remove the row
    existingData.splice(rowIndex, 1);
    
    // Write back
    await writeJsonFile(sheetName, existingData);
    
    return true;
  }, { operation: 'deleteRow', details: { sheetName, rowId } });
}

/**
 * Find a row by ID
 * @param {string} spreadsheetId - Ignored (for compatibility)
 * @param {string} sheetName - Name of the sheet
 * @param {string} rowId - ID of the row to find
 * @returns {Promise<Result<Object|null>>} Success with the row or null if not found
 */
async function findRowById(spreadsheetId, sheetName, rowId) {
  return attemptAsync(async () => {
    if (!rowId) {
      throw createError('VALIDATION_ERROR', 'Row ID is required', { field: 'rowId' });
    }

    const data = await readJsonFile(sheetName);
    
    if (!Array.isArray(data)) {
      throw createError('SYSTEM_ERROR', 'Data is not an array', { sheetName });
    }
    
    return data.find(row => row.id === rowId) || null;
  }, { operation: 'findRowById', details: { sheetName, rowId } });
}

/**
 * Get rows matching a filter function
 * @param {string} spreadsheetId - Ignored (for compatibility)
 * @param {string} sheetName - Name of the sheet
 * @param {Function} filterFn - Filter function
 * @returns {Promise<Result<Array>>} Success with filtered data or error
 */
async function getRowsByFilter(spreadsheetId, sheetName, filterFn) {
  return attemptAsync(async () => {
    if (typeof filterFn !== 'function') {
      throw createError('VALIDATION_ERROR', 'Filter function is required', { field: 'filterFn', actualType: typeof filterFn });
    }

    const data = await readJsonFile(sheetName);
    
    if (!Array.isArray(data)) {
      throw createError('SYSTEM_ERROR', 'Data is not an array', { sheetName });
    }
    
    const rows = await readJsonFile(sheetName);
    return rows.filter(filterFn);
  }, { operation: 'getRowsByFilter', details: { sheetName } });
}

/**
 * Ensures a "sheet" (JSON file) exists
 * @param {string} spreadsheetId - Ignored (for compatibility)
 * @param {string} sheetName - Name of the JSON file (without .json extension)
 * @returns {Promise<Result<void>>} Success or error
 */
async function ensureSheetExists(spreadsheetId, sheetName) {
  return attemptAsync(async () => {
    if (!sheetName || typeof sheetName !== 'string' || sheetName.trim().length === 0) {
      throw createError('VALIDATION_ERROR', 'Sheet name is required and must be a non-empty string', { field: 'sheetName', actualValue: sheetName });
    }

    const filePath = path.join(getDataDir(), `${sheetName}.json`);

    try {
      await fs.access(filePath);
    } catch (error) {
      // File doesn't exist, create it with empty array
      await writeJsonFile(sheetName, []);
    }
  }, { operation: 'ensureSheetExists', details: { sheetName } });
}

module.exports = {
  ensureDataDirectory: ensureDataDir,
  getAllRows,
  appendRow,
  updateRow,
  deleteRow,
  findRowById,
  getRowsByFilter,
  ensureSheetExists,
  // Internal functions for testing
  readJsonFile,
  writeJsonFile,
  getSheetFilePath,
  isValidSheetName
};