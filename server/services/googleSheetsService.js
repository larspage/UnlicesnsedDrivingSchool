/**
 * Google Sheets Service for NJDSC School Compliance Portal
 *
 * Handles CRUD operations for school compliance reports stored in Google Sheets.
 * Uses service account authentication for secure API access.
 */

const { google } = require('googleapis');

// Service account credentials from environment variables
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

// Validate required environment variables
if (!SERVICE_ACCOUNT_KEY) {
  throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required');
}

if (!SPREADSHEET_ID) {
  throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID environment variable is required');
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

// Reports sheet configuration
const REPORTS_SHEET_NAME = 'Reports';

// Column mapping for Reports table
const REPORT_COLUMNS = {
  id: 0,                    // Column A
  schoolName: 1,           // Column B
  location: 2,             // Column C
  violationDescription: 3, // Column D
  phoneNumber: 4,          // Column E
  websiteUrl: 5,           // Column F
  uploadedFiles: 6,        // Column G
  socialMediaLinks: 7,     // Column H
  additionalInfo: 8,       // Column I
  status: 9,               // Column J
  lastReported: 10,        // Column K
  createdAt: 11,           // Column L
  updatedAt: 12,           // Column M
  reporterIp: 13,          // Column N
  adminNotes: 14,          // Column O
  mvcReferenceNumber: 15   // Column P
};

/**
 * Validates input parameters for spreadsheet operations
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
 * Validates report data object
 * @param {Object} data - Report data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @throws {Error} If validation fails
 */
function validateReportData(data, isUpdate = false) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data: must be an object');
  }

  // Required fields for new reports
  if (!isUpdate) {
    if (!data.schoolName || typeof data.schoolName !== 'string' || data.schoolName.trim().length < 2) {
      throw new Error('Invalid schoolName: must be a string with at least 2 characters');
    }

    if (!data.status || typeof data.status !== 'string') {
      throw new Error('Invalid status: must be a non-empty string');
    }
  }

  // Field length validations
  if (data.schoolName && (typeof data.schoolName !== 'string' || data.schoolName.length > 255)) {
    throw new Error('Invalid schoolName: must be a string with maximum 255 characters');
  }

  if (data.location && (typeof data.location !== 'string' || data.location.length > 100)) {
    throw new Error('Invalid location: must be a string with maximum 100 characters');
  }

  if (data.violationDescription && (typeof data.violationDescription !== 'string' || data.violationDescription.length > 1000)) {
    throw new Error('Invalid violationDescription: must be a string with maximum 1000 characters');
  }

  if (data.additionalInfo && (typeof data.additionalInfo !== 'string' || data.additionalInfo.length > 2000)) {
    throw new Error('Invalid additionalInfo: must be a string with maximum 2000 characters');
  }

  if (data.adminNotes && (typeof data.adminNotes !== 'string' || data.adminNotes.length > 500)) {
    throw new Error('Invalid adminNotes: must be a string with maximum 500 characters');
  }

  if (data.mvcReferenceNumber && (typeof data.mvcReferenceNumber !== 'string' || data.mvcReferenceNumber.length > 50)) {
    throw new Error('Invalid mvcReferenceNumber: must be a string with maximum 50 characters');
  }
}

/**
 * Converts a report object to a Google Sheets row array
 * @param {Object} report - Report data object
 * @returns {Array} Array of values for the sheet row
 */
function reportToRow(report) {
  const row = new Array(16); // 16 columns (A to P)

  row[REPORT_COLUMNS.id] = report.id || '';
  row[REPORT_COLUMNS.schoolName] = report.schoolName || '';
  row[REPORT_COLUMNS.location] = report.location || '';
  row[REPORT_COLUMNS.violationDescription] = report.violationDescription || '';
  row[REPORT_COLUMNS.phoneNumber] = report.phoneNumber || '';
  row[REPORT_COLUMNS.websiteUrl] = report.websiteUrl || '';
  row[REPORT_COLUMNS.uploadedFiles] = report.uploadedFiles ? JSON.stringify(report.uploadedFiles) : '';
  row[REPORT_COLUMNS.socialMediaLinks] = report.socialMediaLinks ? JSON.stringify(report.socialMediaLinks) : '';
  row[REPORT_COLUMNS.additionalInfo] = report.additionalInfo || '';
  row[REPORT_COLUMNS.status] = report.status || '';
  row[REPORT_COLUMNS.lastReported] = report.lastReported || '';
  row[REPORT_COLUMNS.createdAt] = report.createdAt || '';
  row[REPORT_COLUMNS.updatedAt] = report.updatedAt || '';
  row[REPORT_COLUMNS.reporterIp] = report.reporterIp || '';
  row[REPORT_COLUMNS.adminNotes] = report.adminNotes || '';
  row[REPORT_COLUMNS.mvcReferenceNumber] = report.mvcReferenceNumber || '';

  return row;
}

/**
 * Converts a Google Sheets row array to a report object
 * @param {Array} row - Array of values from the sheet row
 * @returns {Object} Report data object
 */
function rowToReport(row) {
  if (!Array.isArray(row) || row.length < 16) {
    throw new Error('Invalid row data: must be an array with at least 16 elements');
  }

  const report = {
    id: row[REPORT_COLUMNS.id] || null,
    schoolName: row[REPORT_COLUMNS.schoolName] || null,
    location: row[REPORT_COLUMNS.location] || null,
    violationDescription: row[REPORT_COLUMNS.violationDescription] || null,
    phoneNumber: row[REPORT_COLUMNS.phoneNumber] || null,
    websiteUrl: row[REPORT_COLUMNS.websiteUrl] || null,
    uploadedFiles: row[REPORT_COLUMNS.uploadedFiles] ? safeJsonParse(row[REPORT_COLUMNS.uploadedFiles]) : null,
    socialMediaLinks: row[REPORT_COLUMNS.socialMediaLinks] ? safeJsonParse(row[REPORT_COLUMNS.socialMediaLinks]) : null,
    additionalInfo: row[REPORT_COLUMNS.additionalInfo] || null,
    status: row[REPORT_COLUMNS.status] || null,
    lastReported: row[REPORT_COLUMNS.lastReported] || null,
    createdAt: row[REPORT_COLUMNS.createdAt] || null,
    updatedAt: row[REPORT_COLUMNS.updatedAt] || null,
    reporterIp: row[REPORT_COLUMNS.reporterIp] || null,
    adminNotes: row[REPORT_COLUMNS.adminNotes] || null,
    mvcReferenceNumber: row[REPORT_COLUMNS.mvcReferenceNumber] || null,
  };

  return report;
}

/**
 * Safely parses JSON string, returns null on failure
 * @param {string} jsonString - JSON string to parse
 * @returns {*} Parsed object or null
 */
function safeJsonParse(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', jsonString, error.message);
    return null;
  }
}

/**
 * Logs operation details for debugging and monitoring
 * @param {string} operation - Operation name
 * @param {Object} details - Additional details to log
 */
function logOperation(operation, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] GoogleSheetsService.${operation}:`, details);
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
    throw new Error('Spreadsheet or sheet not found. Verify spreadsheet ID and sheet name.');
  } else if (error.code === 429) {
    throw new Error('Google Sheets API rate limit exceeded. Please try again later.');
  } else {
    throw new Error(`Google Sheets API error during ${operation}: ${error.message}`);
  }
}

/**
 * Appends a new row to the specified sheet
 * @param {string} spreadsheetId - Google Sheets spreadsheet ID
 * @param {string} sheetName - Name of the sheet to append to
 * @param {Object} data - Report data to append
 * @returns {Object} The appended report with generated ID and timestamps
 */
async function appendRow(spreadsheetId, sheetName, data) {
  try {
    validateSpreadsheetParams(spreadsheetId, sheetName);
    validateReportData(data, false);

    logOperation('appendRow', { spreadsheetId, sheetName, dataKeys: Object.keys(data) });

    // Generate unique ID if not provided
    if (!data.id) {
      data.id = generateReportId();
    }

    // Set timestamps
    const now = new Date().toISOString();
    data.createdAt = data.createdAt || now;
    data.updatedAt = data.updatedAt || now;
    data.lastReported = data.lastReported || now;

    // Convert to sheet row format
    const row = reportToRow(data);
    const range = `${sheetName}!A:A`; // Append to the end

    // Append the row
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [row],
      },
    });

    logOperation('appendRow', {
      success: true,
      updatedRange: response.data.updates.updatedRange,
      updatedRows: response.data.updates.updatedRows
    });

    return data; // Return the report object with generated fields

  } catch (error) {
    handleApiError(error, 'appendRow');
  }
}

/**
 * Generates a unique report ID
 * @returns {string} Unique report identifier
 */
function generateReportId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'rep_';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Retrieves all rows from the specified sheet
 * @param {string} spreadsheetId - Google Sheets spreadsheet ID
 * @param {string} sheetName - Name of the sheet to read from
 * @returns {Array} Array of report objects
 */
async function getAllRows(spreadsheetId, sheetName) {
  try {
    validateSpreadsheetParams(spreadsheetId, sheetName);

    logOperation('getAllRows', { spreadsheetId, sheetName });

    const range = `${sheetName}!A:P`; // Read all columns A to P

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    const reports = [];

    // Skip header row if it exists (assuming first row is headers)
    const dataRows = rows.length > 0 && rows[0][0] === 'id' ? rows.slice(1) : rows;

    for (const row of dataRows) {
      if (row.length > 0) { // Skip empty rows
        try {
          const report = rowToReport(row);
          if (report.id) { // Only include rows with valid IDs
            reports.push(report);
          }
        } catch (error) {
          console.warn('Skipping invalid row:', row, error.message);
        }
      }
    }

    logOperation('getAllRows', { rowCount: reports.length });

    return reports;

  } catch (error) {
    handleApiError(error, 'getAllRows');
  }
}

/**
 * Updates an existing row in the specified sheet
 * @param {string} spreadsheetId - Google Sheets spreadsheet ID
 * @param {string} sheetName - Name of the sheet to update
 * @param {string} rowId - ID of the report to update
 * @param {Object} data - Updated report data
 * @returns {Object} The updated report object
 */
async function updateRow(spreadsheetId, sheetName, rowId, data) {
  try {
    validateSpreadsheetParams(spreadsheetId, sheetName);
    if (!rowId || typeof rowId !== 'string') {
      throw new Error('Invalid rowId: must be a non-empty string');
    }
    validateReportData(data, true);

    logOperation('updateRow', { spreadsheetId, sheetName, rowId, dataKeys: Object.keys(data) });

    // Get all rows to find the one with matching ID
    const allRows = await getAllRows(spreadsheetId, sheetName);
    const rowIndex = allRows.findIndex(report => report.id === rowId);

    if (rowIndex === -1) {
      throw new Error(`Report with ID ${rowId} not found`);
    }

    // Get the existing report
    const existingReport = allRows[rowIndex];

    // Merge existing data with updates
    const updatedReport = {
      ...existingReport,
      ...data,
      id: rowId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
      // Preserve createdAt and lastReported unless explicitly updated
      createdAt: data.createdAt || existingReport.createdAt,
      lastReported: data.lastReported || existingReport.lastReported,
    };

    // Convert to row format
    const updatedRow = reportToRow(updatedReport);

    // Calculate the actual sheet row number (add 1 for header row, add 1 for 1-based indexing)
    const sheetRowNumber = rowIndex + 2; // +1 for header, +1 for 1-based
    const range = `${sheetName}!A${sheetRowNumber}:P${sheetRowNumber}`;

    // Update the row
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values: [updatedRow],
      },
    });

    logOperation('updateRow', {
      success: true,
      updatedRange: response.data.updatedRange,
      updatedRows: response.data.updatedRows
    });

    return updatedReport;

  } catch (error) {
    handleApiError(error, 'updateRow');
  }
}

/**
 * Ensures the specified sheet exists in the spreadsheet, creates it if it doesn't
 * @param {string} spreadsheetId - Google Sheets spreadsheet ID
 * @param {string} sheetName - Name of the sheet to ensure exists
 * @returns {Object} Sheet properties
 */
async function ensureSheetExists(spreadsheetId, sheetName) {
  try {
    validateSpreadsheetParams(spreadsheetId, sheetName);

    // Get spreadsheet metadata to check existing sheets
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const existingSheets = response.data.sheets || [];
    const sheetExists = existingSheets.some(sheet => sheet.properties.title === sheetName);

    if (sheetExists) {
      logOperation('ensureSheetExists', { spreadsheetId, sheetName, exists: true });
      return existingSheets.find(sheet => sheet.properties.title === sheetName).properties;
    }

    // Create the sheet if it doesn't exist
    logOperation('ensureSheetExists', { spreadsheetId, sheetName, exists: false, creating: true });

    const createResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          addSheet: {
            properties: {
              title: sheetName,
            },
          },
        }],
      },
    });

    const newSheet = createResponse.data.replies[0].addSheet.properties;
    logOperation('ensureSheetExists', { spreadsheetId, sheetName, created: true, sheetId: newSheet.sheetId });

    return newSheet;

  } catch (error) {
    handleApiError(error, 'ensureSheetExists');
  }
}

/**
 * Writes column headers to the first row of the specified sheet
 * @param {string} spreadsheetId - Google Sheets spreadsheet ID
 * @param {string} sheetName - Name of the sheet to initialize
 * @returns {Object} Response from the Google Sheets API
 */
async function writeHeaders(spreadsheetId, sheetName) {
  try {
    validateSpreadsheetParams(spreadsheetId, sheetName);

    logOperation('writeHeaders', { spreadsheetId, sheetName });

    // Ensure the sheet exists
    await ensureSheetExists(spreadsheetId, sheetName);

    // Define headers based on REPORT_COLUMNS mapping
    const headers = [
      'id',
      'schoolName',
      'location',
      'violationDescription',
      'phoneNumber',
      'websiteUrl',
      'uploadedFiles',
      'socialMediaLinks',
      'additionalInfo',
      'status',
      'lastReported',
      'createdAt',
      'updatedAt',
      'reporterIp',
      'adminNotes',
      'mvcReferenceNumber'
    ];

    const range = `${sheetName}!A1:P1`; // Headers in row 1, columns A to P

    // Write the headers
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values: [headers],
      },
    });

    logOperation('writeHeaders', {
      success: true,
      updatedRange: response.data.updatedRange,
      updatedRows: response.data.updatedRows
    });

    return response.data;

  } catch (error) {
    handleApiError(error, 'writeHeaders');
  }
}

/**
 * Finds rows matching the specified query criteria
 * @param {string} spreadsheetId - Google Sheets spreadsheet ID
 * @param {string} sheetName - Name of the sheet to search
 * @param {Object} query - Query object with filter criteria
 * @returns {Array} Array of matching report objects
 */
async function findRows(spreadsheetId, sheetName, query) {
  try {
    validateSpreadsheetParams(spreadsheetId, sheetName);
    if (!query || typeof query !== 'object') {
      throw new Error('Invalid query: must be an object');
    }

    logOperation('findRows', { spreadsheetId, sheetName, queryKeys: Object.keys(query) });

    // Get all rows
    const allRows = await getAllRows(spreadsheetId, sheetName);
    let filteredRows = allRows;

    // Apply filters
    if (query.id) {
      filteredRows = filteredRows.filter(report => report.id === query.id);
    }

    if (query.schoolName) {
      const searchTerm = query.schoolName.toLowerCase();
      filteredRows = filteredRows.filter(report =>
        report.schoolName && report.schoolName.toLowerCase().includes(searchTerm)
      );
    }

    if (query.location) {
      const searchTerm = query.location.toLowerCase();
      filteredRows = filteredRows.filter(report =>
        report.location && report.location.toLowerCase().includes(searchTerm)
      );
    }

    if (query.status) {
      filteredRows = filteredRows.filter(report => report.status === query.status);
    }

    if (query.violationDescription) {
      const searchTerm = query.violationDescription.toLowerCase();
      filteredRows = filteredRows.filter(report =>
        report.violationDescription && report.violationDescription.toLowerCase().includes(searchTerm)
      );
    }

    if (query.phoneNumber) {
      filteredRows = filteredRows.filter(report => report.phoneNumber === query.phoneNumber);
    }

    if (query.websiteUrl) {
      const searchTerm = query.websiteUrl.toLowerCase();
      filteredRows = filteredRows.filter(report =>
        report.websiteUrl && report.websiteUrl.toLowerCase().includes(searchTerm)
      );
    }

    if (query.reporterIp) {
      filteredRows = filteredRows.filter(report => report.reporterIp === query.reporterIp);
    }

    if (query.mvcReferenceNumber) {
      filteredRows = filteredRows.filter(report => report.mvcReferenceNumber === query.mvcReferenceNumber);
    }

    // Date range filters
    if (query.createdAfter) {
      const afterDate = new Date(query.createdAfter);
      filteredRows = filteredRows.filter(report =>
        report.createdAt && new Date(report.createdAt) >= afterDate
      );
    }

    if (query.createdBefore) {
      const beforeDate = new Date(query.createdBefore);
      filteredRows = filteredRows.filter(report =>
        report.createdAt && new Date(report.createdAt) <= beforeDate
      );
    }

    if (query.updatedAfter) {
      const afterDate = new Date(query.updatedAfter);
      filteredRows = filteredRows.filter(report =>
        report.updatedAt && new Date(report.updatedAt) >= afterDate
      );
    }

    if (query.updatedBefore) {
      const beforeDate = new Date(query.updatedBefore);
      filteredRows = filteredRows.filter(report =>
        report.updatedAt && new Date(report.updatedAt) <= beforeDate
      );
    }

    // Limit results if specified
    if (query.limit && typeof query.limit === 'number' && query.limit > 0) {
      filteredRows = filteredRows.slice(0, query.limit);
    }

    logOperation('findRows', { totalResults: filteredRows.length });

    return filteredRows;

  } catch (error) {
    handleApiError(error, 'findRows');
  }
}

module.exports = {
  appendRow,
  getAllRows,
  updateRow,
  findRows,
  writeHeaders,
  ensureSheetExists,

  // Utility functions
  validateSpreadsheetParams,
  validateReportData,
  reportToRow,
  rowToReport,
};