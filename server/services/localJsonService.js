/**
 * Local JSON Storage Service for NJDSC School Compliance Portal
 *
 * Provides file-based JSON storage to replace Google Sheets functionality.
 * Supports CRUD operations with atomic writes and error handling.
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration - read dynamically to allow testing
const getDataDir = () => {
  const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
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
 * @throws {Error} If directory cannot be created
 */
async function ensureDataDirectory() {
  const dataDir = getDataDir();
  console.log('[LOCAL JSON SERVICE] ensureDataDirectory called:', {
    dataDir,
    timestamp: new Date().toISOString()
  });

  try {
    await fs.access(dataDir);
    console.log('[LOCAL JSON SERVICE] Data directory already exists:', dataDir);
  } catch (error) {
    console.log('[LOCAL JSON SERVICE] Data directory does not exist, creating:', dataDir);
    // Directory doesn't exist, create it
    await fs.mkdir(dataDir, { recursive: true });
    console.log('[LOCAL JSON SERVICE] Data directory created successfully:', dataDir);
  }
}

/**
 * Reads JSON data from a file
 * @param {string} filename - Name of the JSON file (without .json extension)
 * @returns {Promise<Array>} Array of data objects
 * @throws {Error} If file cannot be read or parsed
 */
async function readJsonFile(filename) {
  const filePath = path.join(getDataDir(), `${filename}.json`);

  // Retry logic for file access issues
  const maxRetries = 3;
  const baseDelay = 100;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await ensureDataDirectory();

      let data;
      try {
        data = await fs.readFile(filePath, 'utf8');
      } catch (readError) {
        if (readError.code === 'ENOENT') {
          // File doesn't exist, return empty array
          return [];
        }
        throw readError;
      }

      // Ensure data is a valid string
      if (data === undefined || data === null) {
        console.warn(`File ${filename} returned undefined or null data`);
        return [];
      }

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

      // If this is the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw new Error(`Failed to read JSON file ${filename} after ${maxRetries} attempts: ${error.message}`);
      }

      // Wait before retrying
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`File read attempt ${attempt + 1} failed for ${filename}, retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Writes JSON data to a file atomically
 * @param {string} filename - Name of the JSON file (without .json extension)
 * @param {Array} data - Array of data objects to write
 * @throws {Error} If file cannot be written
 */
async function writeJsonFile(filename, data) {
  const dataDir = getDataDir();
  const filePath = path.join(dataDir, `${filename}.json`);
  const tempFilePath = `${filePath}.tmp`;

  console.log('[LOCAL JSON SERVICE] writeJsonFile called:', {
    filename,
    dataDir,
    filePath,
    tempFilePath,
    dataLength: Array.isArray(data) ? data.length : 'not array',
    timestamp: new Date().toISOString()
  });

  try {
    const jsonData = JSON.stringify(data, null, 2);

    // Ensure directory exists right before writing - use direct mkdir to avoid TOCTOU race
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    console.log('[LOCAL JSON SERVICE] Directory ensured:', dir);

    // Write temp file with retry logic
    let writeAttempts = 0;
    const maxWriteAttempts = 3;

    while (writeAttempts < maxWriteAttempts) {
      try {
        console.log('[LOCAL JSON SERVICE] Writing temp file (attempt %d):', writeAttempts + 1, tempFilePath);
        await fs.writeFile(tempFilePath, jsonData, 'utf8');
        console.log('[LOCAL JSON SERVICE] Temp file written successfully');

        // Verify temp file exists and has content
        const stats = await fs.stat(tempFilePath);
        if (stats.size === 0) {
          throw new Error('Temp file is empty after write');
        }
        console.log('[LOCAL JSON SERVICE] Temp file verified (size: %d bytes)', stats.size);
        break; // Success, exit retry loop

      } catch (writeError) {
        writeAttempts++;
        console.error('[LOCAL JSON SERVICE] Temp file write failed (attempt %d):', writeAttempts, writeError.message);

        if (writeAttempts >= maxWriteAttempts) {
          throw new Error(`Failed to write temp file after ${maxWriteAttempts} attempts: ${writeError.message}`);
        }

        // Ensure directory still exists before retry
        await fs.mkdir(dir, { recursive: true });
        // Wait before retry
        await new Promise(r => setTimeout(r, 100));
      }
    }

    // Attempt atomic rename with retries
    let renameAttempts = 0;
    const maxRenameAttempts = 2; // One initial attempt + one retry as per requirements
    let lastError;
    
    while (renameAttempts < maxRenameAttempts) {
      try {
        console.log('[LOCAL JSON SERVICE] Attempting atomic rename:', {
          tempFilePath,
          filePath,
          attempt: renameAttempts + 1,
          platform: process.platform,
          timestamp: new Date().toISOString()
        });

        // Verify temp file still exists before rename
        let tempFileExists = false;
        try {
          await fs.stat(tempFilePath);
          tempFileExists = true;
          console.log('[LOCAL JSON SERVICE] Temp file exists before rename');
        } catch (statError) {
          console.error('[LOCAL JSON SERVICE] Temp file missing before rename:', {
            error: statError.message,
            code: statError.code
          });
        }

        // If temp file missing, recreate it
        if (!tempFileExists) {
          console.log('[LOCAL JSON SERVICE] Recreating missing temp file before rename');
          await fs.mkdir(dir, { recursive: true }); // Ensure dir exists
          await fs.writeFile(tempFilePath, jsonData, 'utf8');
          console.log('[LOCAL JSON SERVICE] Temp file recreated before rename');
        }

        // On Windows: try unlinking target first to avoid EPERM
        if (process.platform === 'win32') {
          try {
            await fs.unlink(filePath);
            console.log('[LOCAL JSON SERVICE] Successfully unlinked target file on Windows');
          } catch (e) {
            if (e.code !== 'ENOENT') {
              console.log('[LOCAL JSON SERVICE] Failed to unlink target file on Windows:', e.message);
              // if can't delete, wait then retry
              await new Promise(r => setTimeout(r, 100));
            }
          }
        }

        await fs.rename(tempFilePath, filePath);
        console.log('[LOCAL JSON SERVICE] Atomic rename successful');

        // Verify final file exists
        await fs.access(filePath);
        console.log('[LOCAL JSON SERVICE] Final file verified to exist');
        return; // success

      } catch (error) {
        console.error('[LOCAL JSON SERVICE] Atomic rename failed:', {
          error: error.message,
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
          path: error.path,
          attempt: renameAttempts + 1,
          timestamp: new Date().toISOString()
        });
        lastError = error;
        renameAttempts++;

        // If ENOENT and temp file is missing, recreate and retry once
        if (error.code === 'ENOENT' && renameAttempts < maxRenameAttempts) {
          try {
            // Check if temp file exists
            let tempFileExists = false;
            try {
              await fs.stat(tempFilePath);
              tempFileExists = true;
            } catch (statError) {
              // Temp file doesn't exist
            }

            if (!tempFileExists) {
              console.log('[LOCAL JSON SERVICE] ENOENT error and temp file missing, recreating for retry');
              await fs.mkdir(dir, { recursive: true }); // Ensure dir exists
              await fs.writeFile(tempFilePath, jsonData, 'utf8');
              console.log('[LOCAL JSON SERVICE] Temp file recreated after ENOENT failure');
              continue; // Retry rename
            } else {
              // Temp file exists but rename failed with ENOENT - directory might be missing
              console.log('[LOCAL JSON SERVICE] ENOENT error but temp file exists, ensuring directory');
              await fs.mkdir(dir, { recursive: true });
              await new Promise(r => setTimeout(r, 200));
              continue; // Retry rename
            }
          } catch (recreateErr) {
            console.error('[LOCAL JSON SERVICE] Failed to recreate temp file after ENOENT:', {
              error: recreateErr.message,
              code: recreateErr.code
            });
            lastError = recreateErr;
            break;
          }
        }

        // For EPERM/EBUSY, retry once with delay
        if ((error.code === 'EPERM' || error.code === 'EBUSY') && renameAttempts < maxRenameAttempts) {
          console.log('[LOCAL JSON SERVICE] Permission/busy error, retrying after delay...');
          await new Promise(r => setTimeout(r, 200));
          continue;
        }

        // Don't retry for other errors
        break;
      }
    }

    throw lastError;
  } catch (error) {
    console.error('[LOCAL JSON SERVICE] writeJsonFile failed completely:', {
      filename,
      filePath,
      tempFilePath,
      error: {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        path: error.path,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    });

    // cleanup temp file if it exists
    try {
      await fs.unlink(tempFilePath);
      console.log('[LOCAL JSON SERVICE] Temp file cleaned up after error');
    } catch (cleanupError) {
      console.log('[LOCAL JSON SERVICE] Temp file cleanup failed (may not exist):', cleanupError.message);
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
  const filePath = path.join(getDataDir(), `${sheetName}.json`);

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