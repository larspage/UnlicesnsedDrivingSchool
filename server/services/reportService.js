/**
 * Report Service for NJDSC School Compliance Portal
 *
 * Provides business logic for report management including CRUD operations,
 * duplicate detection, status updates, and data validation.
 */

const Report = require('../models/Report');
const googleSheetsService = require('./googleSheetsService');
const configService = require('./configService');

// Configuration constants
const REPORTS_SHEET_NAME = 'Reports';
const REPORTS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

/**
 * Validates spreadsheet configuration
 * @throws {Error} If configuration is invalid
 */
function validateSpreadsheetConfig() {
  if (!REPORTS_SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID environment variable is required');
  }
}

/**
 * Creates a new report with duplicate detection and validation
 * @param {Object} reportData - Report data from request
 * @param {string} reporterIp - Reporter's IP address
 * @returns {Promise<Report>} Created report
 * @throws {Error} If validation fails or duplicate found
 */
async function createReport(reportData, reporterIp = null) {
  try {
    validateSpreadsheetConfig();

    // Get all existing reports for duplicate checking
    const existingReports = await getAllReports();

    // Create new report instance
    const report = Report.create(reportData, reporterIp);

    // Validate business rules (duplicate detection, etc.)
    report.validateBusinessRules(existingReports);

    // Save to Google Sheets
    await saveReportToSheets(report);

    return report;
  } catch (error) {
    console.error('Error creating report:', error);
    throw error;
  }
}

/**
 * Retrieves all reports with optional filtering and pagination
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.limit - Items per page
 * @param {string} options.status - Filter by status
 * @param {string} options.search - Search in school name or description
 * @param {string} options.sortBy - Sort field
 * @param {string} options.sortOrder - Sort order (asc/desc)
 * @param {boolean} options.includeAdminFields - Include admin-only fields
 * @returns {Promise<Object>} Paginated results
 */
async function getReports(options = {}) {
  try {
    validateSpreadsheetConfig();

    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'lastReported',
      sortOrder = 'desc',
      includeAdminFields = false
    } = options;

    // Get all reports from sheets
    const allReports = await getAllReports();

    // Apply filters
    let filteredReports = allReports;

    if (status) {
      filteredReports = filteredReports.filter(report => report.status === status);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredReports = filteredReports.filter(report =>
        report.schoolName.toLowerCase().includes(searchLower) ||
        (report.violationDescription && report.violationDescription.toLowerCase().includes(searchLower))
      );
    }

    // Sort reports
    filteredReports.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle date sorting
      if (sortBy.includes('At') || sortBy === 'lastReported') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const total = filteredReports.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReports = filteredReports.slice(startIndex, endIndex);

    // Remove sensitive fields for public access
    const sanitizedReports = paginatedReports.map(report => {
      const reportData = { ...report };

      if (!includeAdminFields) {
        delete reportData.reporterIp;
        delete reportData.adminNotes;
        delete reportData.mvcReferenceNumber;
      }

      return reportData;
    });

    return {
      items: sanitizedReports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: endIndex < total,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error('Error retrieving reports:', error);
    throw error;
  }
}

/**
 * Retrieves a single report by ID
 * @param {string} reportId - Report ID
 * @param {boolean} includeAdminFields - Include admin-only fields
 * @returns {Promise<Report|null>} Report instance or null if not found
 */
async function getReportById(reportId, includeAdminFields = false) {
  try {
    validateSpreadsheetConfig();

    const allReports = await getAllReports();
    const report = allReports.find(r => r.id === reportId);

    if (!report) {
      return null;
    }

    // Remove sensitive fields for public access
    if (!includeAdminFields) {
      const reportData = { ...report };
      delete reportData.reporterIp;
      delete reportData.adminNotes;
      delete reportData.mvcReferenceNumber;
      return reportData;
    }

    return report;
  } catch (error) {
    console.error('Error retrieving report by ID:', error);
    throw error;
  }
}

/**
 * Updates a report's status (Admin only)
 * @param {string} reportId - Report ID
 * @param {string} newStatus - New status
 * @param {string} adminNotes - Admin notes
 * @returns {Promise<Report>} Updated report
 * @throws {Error} If report not found or status invalid
 */
async function updateReportStatus(reportId, newStatus, adminNotes = '') {
  try {
    validateSpreadsheetConfig();

    const allReports = await getAllReports();
    const reportIndex = allReports.findIndex(r => r.id === reportId);

    if (reportIndex === -1) {
      throw new Error(`Report with ID ${reportId} not found`);
    }

    const existingReport = allReports[reportIndex];
    const updatedReport = existingReport.update({
      status: newStatus,
      adminNotes: adminNotes || existingReport.adminNotes
    });

    // Validate status transition
    updatedReport.validateBusinessRules(allReports);

    // Save to sheets
    await updateReportInSheets(updatedReport);

    return updatedReport;
  } catch (error) {
    console.error('Error updating report status:', error);
    throw error;
  }
}

/**
 * Retrieves all reports from Google Sheets
 * @returns {Promise<Array<Report>>} Array of Report instances
 */
async function getAllReports() {
  try {
    const reports = await googleSheetsService.getAllRows(
      REPORTS_SPREADSHEET_ID,
      REPORTS_SHEET_NAME
    );

    return reports;
  } catch (error) {
    console.error('Error retrieving all reports:', error);
    throw error;
  }
}

/**
 * Saves a report to Google Sheets
 * @param {Report} report - Report instance to save
 * @returns {Promise<void>}
 */
async function saveReportToSheets(report) {
  try {
    await googleSheetsService.appendRow(
      REPORTS_SPREADSHEET_ID,
      REPORTS_SHEET_NAME,
      report
    );
  } catch (error) {
    console.error('Error saving report to sheets:', error);
    throw error;
  }
}

/**
 * Updates a report in Google Sheets
 * @param {Report} report - Updated report instance
 * @returns {Promise<void>}
 */
async function updateReportInSheets(report) {
  try {
    await googleSheetsService.updateRow(
      REPORTS_SPREADSHEET_ID,
      REPORTS_SHEET_NAME,
      report.id,
      report
    );
  } catch (error) {
    console.error('Error updating report in sheets:', error);
    throw error;
  }
}

/**
 * Checks if a report submission would exceed rate limits
 * @param {string} reporterIp - Reporter's IP address
 * @returns {Promise<boolean>} True if rate limit exceeded
 */
async function checkRateLimit(reporterIp) {
  try {
    // Get rate limit configuration
    const rateLimitPerHour = await configService.getConfig('system.rateLimitPerHour') || 5;

    // For now, implement a simple in-memory check
    // In production, this should use Redis or similar
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get recent reports from this IP
    const allReports = await getAllReports();
    const recentReports = allReports.filter(report =>
      report.reporterIp === reporterIp &&
      new Date(report.createdAt) > oneHourAgo
    );

    return recentReports.length >= rateLimitPerHour;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // Allow submission if rate limit check fails
    return false;
  }
}

module.exports = {
  createReport,
  getReports,
  getReportById,
  updateReportStatus,
  getAllReports,
  checkRateLimit,

  // Export for testing
  saveReportToSheets,
  updateReportInSheets
};