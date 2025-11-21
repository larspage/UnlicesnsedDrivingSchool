// Jest setup file for backend tests
const os = require('os');
const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';

// Set DATA_DIR to a temporary directory for tests to avoid permission/missing-dir issues
if (!process.env.DATA_DIR) {
  const tmpDir = path.join(os.tmpdir(), 'njdsc-test-data-' + Date.now());
  process.env.DATA_DIR = tmpDir;
  
  // Create the directory if it doesn't exist
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
}

// Load environment variables for tests
require('dotenv').config({ path: '.env.development' });

// Add any global test setup here