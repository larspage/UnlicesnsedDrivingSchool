/**
 * File System Utilities for NJDSC School Compliance Portal
 * 
 * Provides utilities for managing data directories and ensuring they exist.
 * Supports configurable data directory via DATA_DIR environment variable.
 */

const fs = require('fs');
const path = require('path');

/**
 * Get the data directory path
 * @returns {string} Absolute path to the data directory
 */
function getDataDir() {
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  return path.resolve(dataDir);
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dir - Directory path to ensure exists
 * @throws {Error} If directory cannot be created
 */
function ensureDir(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    // Add context to the error and rethrow
    err.message = `Failed to ensure directory ${dir}: ${err.message}`;
    throw err;
  }
}

module.exports = {
  getDataDir,
  ensureDir
};
