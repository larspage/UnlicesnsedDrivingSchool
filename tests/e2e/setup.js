/**
 * E2E Test Setup for NJDSC School Compliance Portal
 *
 * Configures test environment and mocks for end-to-end testing
 */

// Mock Google APIs to prevent actual API calls during testing
jest.mock('googleapis', () => ({
  google: {
    sheets: jest.fn(() => ({
      spreadsheets: {
        values: {
          get: jest.fn(),
          append: jest.fn(),
          update: jest.fn()
        }
      }
    })),
    drive: jest.fn(() => ({
      files: {
        create: jest.fn(),
        get: jest.fn(),
        update: jest.fn()
      },
      permissions: {
        create: jest.fn()
      }
    })),
    gmail: jest.fn(() => ({
      users: {
        messages: {
          send: jest.fn()
        }
      }
    })),
    auth: {
      GoogleAuth: jest.fn(),
      JWT: jest.fn()
    }
  }
}));

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn()
  },
  createReadStream: jest.fn(),
  createWriteStream: jest.fn()
}));

// Mock multer for file uploads
jest.mock('multer', () => {
  const multer = () => ({
    single: jest.fn(() => (req, res, next) => next()),
    array: jest.fn(() => (req, res, next) => next()),
    fields: jest.fn(() => (req, res, next) => next())
  });
  multer.diskStorage = jest.fn();
  multer.memoryStorage = jest.fn();
  return multer;
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-e2e-testing';
process.env.GOOGLE_SHEETS_ID = 'test-spreadsheet-id';
process.env.GOOGLE_DRIVE_FOLDER_ID = 'test-drive-folder-id';
process.env.GMAIL_USER_ID = 'test@gmail.com';

// Mock database operations for testing
jest.mock('../../server/services/googleSheetsService', () => ({
  getAllRows: jest.fn(),
  appendRow: jest.fn(),
  updateRow: jest.fn(),
  findRows: jest.fn()
}));

jest.mock('../../server/services/googleDriveService', () => ({
  uploadFile: jest.fn(),
  generatePublicUrl: jest.fn(),
  generateThumbnail: jest.fn(),
  createFolder: jest.fn()
}));

jest.mock('../../server/services/gmailService', () => ({
  sendEmail: jest.fn()
}));

// Global test utilities
global.testUtils = {
  // Generate test report data
  generateTestReport: (overrides = {}) => ({
    schoolName: 'Test Driving School',
    location: '123 Test St, Test City, NJ',
    violationDescription: 'Operating without proper licensing',
    phoneNumber: '(555) 123-4567',
    websiteUrl: 'https://testschool.com',
    socialMediaLinks: ['https://facebook.com/testschool'],
    additionalInfo: 'Additional test information',
    reporterName: 'Test Reporter',
    reporterEmail: 'test@example.com',
    reporterPhone: '(555) 987-6543',
    ...overrides
  }),

  // Generate test admin credentials
  getTestAdminCredentials: () => ({
    username: 'admin',
    password: 'admin123'
  }),

  // Generate test JWT token (mock)
  generateTestToken: (user = { id: 'admin', role: 'admin' }) => {
    return 'mock-jwt-token-' + user.id;
  },

  // Clean up test data
  cleanupTestData: async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset database state if needed
    // This would be implemented based on the actual test database setup
  }
};

// Test timeout for E2E tests (longer than unit tests)
jest.setTimeout(30000);

// Setup and teardown
beforeAll(async () => {
  // Global setup for all E2E tests
  console.log('Setting up E2E test environment...');
});

afterAll(async () => {
  // Global cleanup for all E2E tests
  console.log('Cleaning up E2E test environment...');
});

beforeEach(async () => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(async () => {
  // Cleanup after each test
  await global.testUtils.cleanupTestData();
});