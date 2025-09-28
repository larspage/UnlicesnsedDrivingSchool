// Jest setup file for backend tests
process.env.NODE_ENV = 'test';

// Load environment variables for tests
require('dotenv').config({ path: '.env.development' });

// Add any global test setup here