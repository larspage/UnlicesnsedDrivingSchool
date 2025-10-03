/**
 * Local JSON Storage Service for NJDSC School Compliance Portal
 *
 * Provides file-based JSON storage to replace Google Sheets functionality.
 * Supports CRUD operations with atomic writes and error handling.
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration
const DATA_DIR = process.env.DATA_DIR || './data';

/**
 * Ensures the data directory exists
 * @throws {Error} If directory cannot be created
 */
async function ensureDataDirectory() {
  try {
    await fs.access(DATA_DIR);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

/**
 * Reads JSON data from a file
 * @param {string} filename - Name of the JSON file (without .json extension)
 * @returns {Promise<Array>} Array of data objects
 * @throws {Error} If file cannot be read or parsed
 */
async function readJsonFile(filename) {
  const filePath = path.join(DATA_DIR, `${filename}.json`);

  try {
    await ensureDataDirectory();
    const data = await fs.readFile(filePath, 'utf8');
    
    // Handle empty or whitespace-only files
    const trimmedData = data.trim();
    if (!trimmedData) {
      return [];
    }
    
    return JSON.parse(trimmedData);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty array
      return [];
    }
    
    // Handle JSON parse errors (corrupted or empty files)
    if (error instanceof SyntaxError) {
      console.warn(`JSON parse error in ${filename}, returning empty array:`, error.message);
      return [];
    }
    
    throw new Error(`Failed to read JSON file ${filename}: ${error.message}`);
  }
}

/**
 * Writes JSON data to a file atomically
 * @param {string} filename - Name of the JSON file (without .json extension)
 * @param {Array} data - Array of data objects to write
 * @throws {Error} If file cannot be written
 */
async function writeJsonFile(filename, data) {
  const filePath = path.join(DATA_DIR, `${filename}.json`);
  const tempFilePath = `${filePath}.tmp`;

  try {
    await ensureDataDirectory();

    // Write to temporary file first
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(tempFilePath, jsonData, 'utf8');

    // Try atomic rename with retry logic for Windows file locking issues
    let retries = 3;
    let lastError;
    
    while (retries > 0) {
      try {
        // On Windows, try to delete the target file first if it exists
        if (process.platform === 'win32') {
          try {
            await fs.unlink(filePath);
          } catch (unlinkError) {
            // File might not exist, that's okay
            if (unlinkError.code !== 'ENOENT') {
              // If we can't delete it, wait a bit and retry
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }
        
        // Atomic move to final location
        await fs.rename(tempFilePath, filePath);
        return; // Success!
      } catch (error) {
        lastError = error;
        if (error.code === 'EPERM' || error.code === 'EBUSY') {
          // File is locked, wait and retry
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } else {
          // Different error, don't retry
          break;
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempFilePath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    throw new Error(`Failed to write JSON file ${filename}: ${error.message}`);
  }
}

/**
 * Gets all rows from a "sheet" (JSON file)
 * @param {string} spreadsheetId - Ignored (for compatibility)
 * @param {string} sheetName - Name of the JSON file (without .json extension)
 * @returns {Promise<Array>} Array of data objects
 */
async function getAllRows(spreadsheetId, sheetName) {
  return await readJsonFile(sheetName);
}

/**
 * Appends a row to a "sheet" (JSON file)
 * @param {string} spreadsheetId - Ignored (for compatibility)
 * @param {string} sheetName - Name of the JSON file (without .json extension)
 * @param {Object} data - Data object to append
 * @returns {Promise<Object>} The appended data object
 */
async function appendRow(spreadsheetId, sheetName, data) {
  const rows = await readJsonFile(sheetName);
  rows.push(data);
  await writeJsonFile(sheetName, rows);
  return data;
}

/**
 * Updates a row in a "sheet" (JSON file)
 * @param {string} spreadsheetId - Ignored (for compatibility)
 * @param {string} sheetName - Name of the JSON file (without .json extension)
 * @param {string} rowId - ID of the row to update
 * @param {Object} data - Updated data object
 * @returns {Promise<Object>} The updated data object
 * @throws {Error} If row not found
 */
async function updateRow(spreadsheetId, sheetName, rowId, data) {
  const rows = await readJsonFile(sheetName);
  const index = rows.findIndex(row => row.id === rowId);

  if (index === -1) {
    throw new Error(`Row with ID ${rowId} not found in ${sheetName}`);
  }

  rows[index] = { ...rows[index], ...data };
  await writeJsonFile(sheetName, rows);
  return rows[index];
}

/**
 * Deletes a row from a "sheet" (JSON file)
 * @param {string} spreadsheetId - Ignored (for compatibility)
 * @param {string} sheetName - Name of the JSON file (without .json extension)
 * @param {string} rowId - ID of the row to delete
 * @returns {Promise<boolean>} True if row was deleted
 */
async function deleteRow(spreadsheetId, sheetName, rowId) {
  const rows = await readJsonFile(sheetName);
  const initialLength = rows.length;
  const filteredRows = rows.filter(row => row.id !== rowId);

  if (filteredRows.length === initialLength) {
    return false; // Row not found
  }

  await writeJsonFile(sheetName, filteredRows);
  return true;
}

/**
 * Finds a row by ID in a "sheet" (JSON file)
 * @param {string} spreadsheetId - Ignored (for compatibility)
 * @param {string} sheetName - Name of the JSON file (without .json extension)
 * @param {string} rowId - ID of the row to find
 * @returns {Promise<Object|null>} The found row or null
 */
async function findRowById(spreadsheetId, sheetName, rowId) {
  const rows = await readJsonFile(sheetName);
  return rows.find(row => row.id === rowId) || null;
}

/**
 * Gets rows matching a filter function
 * @param {string} spreadsheetId - Ignored (for compatibility)
 * @param {string} sheetName - Name of the JSON file (without .json extension)
 * @param {Function} filterFn - Filter function
 * @returns {Promise<Array>} Array of matching rows
 */
async function getRowsByFilter(spreadsheetId, sheetName, filterFn) {
  const rows = await readJsonFile(sheetName);
  return rows.filter(filterFn);
}

/**
 * Ensures a "sheet" (JSON file) exists
 * @param {string} spreadsheetId - Ignored (for compatibility)
 * @param {string} sheetName - Name of the JSON file (without .json extension)
 * @returns {Promise<void>}
 */
async function ensureSheetExists(spreadsheetId, sheetName) {
  const filePath = path.join(DATA_DIR, `${sheetName}.json`);

  try {
    await fs.access(filePath);
  } catch (error) {
    // File doesn't exist, create it with empty array
    await writeJsonFile(sheetName, []);
  }
}

module.exports = {
  getAllRows,
  appendRow,
  updateRow,
  deleteRow,
  findRowById,
  getRowsByFilter,
  ensureSheetExists,
  readJsonFile,
  writeJsonFile,
  ensureDataDirectory
};