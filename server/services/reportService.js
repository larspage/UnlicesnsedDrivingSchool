/**
 * Report Service for NJDSC School Compliance Portal
 *
 * Provides business logic for report management including CRUD operations,
 * duplicate detection, status updates, and data validation.
 */

const Report = require('../models/Report');
const localJsonService = require('./localJsonService');
const configService = require('./configService');
const { success, failure, attempt, attemptAsync, isSuccess } = require('../utils/result');
const { createError, validationError, notFoundError, databaseError, validateRequired, ERROR_CODES } = require('../utils/errorUtils');

// Configuration constants
const REPORTS_DATA_FILE = 'reports';

/**
 * Creates a new report with duplicate detection and validation
 * @param {Object} reportData - Report data from request
 * @param {string} reporterIp - Reporter's IP address
 * @returns {Promise<Result<Report>>} Created report or error
 */
async function createReport(reportData, reporterIp = null) {
  return attemptAsync(async () => {
    // Structured input validation
    const dataError = validateRequired(reportData, 'Report data', 'valid object');
    if (dataError) throw dataError;

    const schoolNameError = validateRequired(reportData.schoolName, 'School name', 'non-empty string');
    if (schoolNameError) throw schoolNameError;

    if (typeof reportData.schoolName !== 'string') {
      throw validationError('schoolName', 'School name must be a string', reportData.schoolName, 'string');
    }

    // Get all existing reports for duplicate checking
    const existingReportsResult = await getAllReports();
    if (!isSuccess(existingReportsResult)) {
      throw existingReportsResult.error.innerError;
    }
    const existingReports = existingReportsResult.data;

    // Check for duplicate reports
    const duplicateReport = existingReports.find(existing =>
      existing.schoolName.toLowerCase() === reportData.schoolName.toLowerCase()
    );

    if (duplicateReport) {
      // Update existing report instead of creating new one
      console.log('Duplicate report found, updating existing report:', duplicateReport.id);

      // Prepare update data
      const updateData = {
        ...reportData,
        updatedAt: new Date().toISOString(),
        lastReported: new Date().toISOString(),
        updatedBy: 'system'
      };

      // Append violation description if provided
      if (reportData.violationDescription) {
        updateData.violationDescription = (duplicateReport.violationDescription || '') +
          '\n\n[Additional Report - ' + new Date().toISOString() + ']\n' +
          reportData.violationDescription;
      }

      // Add new files up to the limit of 10
      if (reportData.files && Array.isArray(reportData.files)) {
        const existingFiles = duplicateReport.uploadedFiles || [];
        const maxFiles = 10;
        const availableSlots = maxFiles - existingFiles.length;

        if (availableSlots > 0) {
          const newFiles = reportData.files.slice(0, availableSlots);
          updateData.uploadedFiles = [...existingFiles, ...newFiles];

          if (reportData.files.length > availableSlots) {
            console.warn(`Maximum of ${maxFiles} files reached. ${reportData.files.length - availableSlots} files were not added.`);
          }
        } else {
          console.warn('Maximum number of files (10) already reached for this report. New files were not added.');
        }
      }

      // Update the existing report
      const updateResult = await updateReport(duplicateReport.id, updateData);
      if (!isSuccess(updateResult)) {
        throw updateResult.error.innerError;
      }
      return updateResult.data;
    }

    // Create new report instance if no duplicate found
    const report = Report.create(reportData, reporterIp);

    // Validate business rules (duplicate detection, etc.)
    report.validateBusinessRules(existingReports);

    // Save to local JSON storage
    console.log('[REPORT SERVICE] Saving report to JSON storage:', report.id);
    const saveResult = await saveReportToJson(report);
    if (!isSuccess(saveResult)) {
      throw saveResult.error.innerError;
    }
    console.log('[REPORT SERVICE] Report saved to JSON storage successfully');

    return report;
  }, { operation: 'createReport', details: { hasData: !!reportData, reporterIp } });
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
 * @returns {Promise<Result<Object>>} Paginated results or error
 */
async function getReports(options = {}) {
  return attemptAsync(async () => {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'lastReported',
      sortOrder = 'desc',
      includeAdminFields = false
    } = options;

    // Structured pagination validation
    if (page < 1) {
      throw validationError('page', 'Page must be >= 1', { page, expectedMin: 1 });
    }
    if (limit < 1) {
      throw validationError('limit', 'Limit must be >= 1', { limit, expectedMin: 1 });
    }
    if (limit > 100) {
      throw validationError('limit', 'Limit must be <= 100', { limit, expectedMax: 100 });
    }

    // Get all reports from local JSON storage
    const allReportsResult = await getAllReports();
    if (!isSuccess(allReportsResult)) {
      throw allReportsResult.error.innerError;
    }
    const allReports = allReportsResult.data;

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
  }, { operation: 'getReports', details: { options } });
}

/**
 * Retrieves a single report by ID
 * @param {string} reportId - Report ID
 * @param {boolean} includeAdminFields - Include admin-only fields
 * @returns {Promise<Result<Report|null>>} Report instance or null if not found
 */
async function getReportById(reportId, includeAdminFields = false) {
  return attemptAsync(async () => {
    // Structured input validation
    const idError = validateRequired(reportId, 'Report ID', 'non-empty string');
    if (idError) throw idError;

    if (typeof reportId !== 'string') {
      throw validationError('reportId', 'Report ID must be a string', reportId, 'string');
    }

    const allReportsResult = await getAllReports();
    if (!isSuccess(allReportsResult)) {
      throw allReportsResult.error.innerError;
    }
    const allReports = allReportsResult.data;
    
    const report = allReports.find(r => r.id === reportId);

    if (!report) {
      throw notFoundError('Report', reportId);
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
  }, { operation: 'getReportById', details: { reportId, includeAdminFields } });
}

/**
 * Updates a report's status and admin fields (Admin only)
 * @param {string} reportId - Report ID
 * @param {Object} updateData - Update data object
 * @param {string} updateData.status - New status
 * @param {string} [updateData.adminNotes] - Admin notes
 * @param {string} [updateData.mvcReferenceNumber] - MVC reference number
 * @param {string} [updateData.updatedBy] - Who updated the report
 * @returns {Promise<Result<Report>>} Updated report or error
 */
async function updateReportStatus(reportId, updateData) {
  const startTime = Date.now();

  return attemptAsync(async () => {
    if (!reportId || typeof reportId !== 'string') {
      throw new Error('Report ID must be a non-empty string');
    }

    if (!updateData || typeof updateData !== 'object' || !updateData.status) {
      throw new Error('Update data must be an object with a status field');
    }

    console.log('[REPORT SERVICE] updateReportStatus called:', {
      reportId,
      updateData,
      timestamp: new Date().toISOString()
    });

    const { status, adminNotes, mvcReferenceNumber, updatedBy } = updateData;

    console.log('[REPORT SERVICE] Fetching all reports for update');
    const allReportsResult = await getAllReports();
    if (!isSuccess(allReportsResult)) {
      throw allReportsResult.error.innerError;
    }
    const allReports = allReportsResult.data;
    const reportIndex = allReports.findIndex(r => r.id === reportId);

    if (reportIndex === -1) {
      console.error('[REPORT SERVICE ERROR] Report not found:', {
        reportId,
        totalReports: allReports.length,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Report with ID ${reportId} not found`);
    }

    const existingReport = allReports[reportIndex];
    console.log('[REPORT SERVICE] Found existing report:', {
      reportId,
      currentStatus: existingReport.status,
      newStatus: status
    });

    // Create a Report instance from the existing data
    const reportInstance = new Report(existingReport);

    // Prepare update data
    const updatePayload = {
      status,
      adminNotes: adminNotes !== undefined ? adminNotes : existingReport.adminNotes,
      mvcReferenceNumber: mvcReferenceNumber !== undefined ? mvcReferenceNumber : existingReport.mvcReferenceNumber
    };

    console.log('[REPORT SERVICE] Updating report instance with payload:', updatePayload);
    const updatedReport = reportInstance.update(updatePayload);

    // Validate status transition
    console.log('[REPORT SERVICE] Validating business rules');
    updatedReport.validateBusinessRules(allReports);

    // Save to local JSON storage
    console.log('[REPORT SERVICE] Saving to local JSON storage');
    const saveResult = await updateReportInJson(updatedReport);
    if (!isSuccess(saveResult)) {
      throw saveResult.error.innerError;
    }

    console.log('[REPORT SERVICE] Report status updated successfully:', {
      reportId,
      oldStatus: existingReport.status,
      newStatus: updatedReport.status,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });

    return updatedReport;
  }, { operation: 'updateReportStatus', details: { reportId, hasStatus: !!updateData?.status } });
}

/**
 * Retrieves all reports from local JSON storage
 * @returns {Promise<Result<Array<Report>>>} Array of Report instances or error
 */
async function getAllReports() {
  return attemptAsync(async () => {
    const reportsData = await localJsonService.getAllRows(
      null, // spreadsheetId not needed
      REPORTS_DATA_FILE
    );

    // Convert plain objects to Report instances
    const reports = reportsData.map(data => {
      try {
        return new Report(data);
      } catch (error) {
        console.warn('Skipping invalid report data:', data, error.message);
        return null;
      }
    }).filter(report => report !== null);

    return reports;
  }, { operation: 'getAllReports' });
}

/**
 * Saves a report to local JSON storage
 * @param {Report} report - Report instance to save
 * @returns {Promise<Result<void>>} Success or error
 */
async function saveReportToJson(report) {
  return attemptAsync(async () => {
    if (!report || !report.id) {
      throw new Error('Invalid report: report and report.id are required');
    }

    console.log('[REPORT SERVICE] saveReportToJson called for report:', report.id);
    await localJsonService.appendRow(
      null, // spreadsheetId not needed
      REPORTS_DATA_FILE,
      report
    );
    console.log('[REPORT SERVICE] Report appended to JSON file successfully');
  }, { operation: 'saveReportToJson', details: { reportId: report?.id } });
}

/**
 * Updates a report in local JSON storage
 * @param {Report} report - Updated report instance
 * @returns {Promise<Result<void>>} Success or error
 */
async function updateReportInJson(report) {
  return attemptAsync(async () => {
    if (!report || !report.id) {
      throw new Error('Invalid report: report and report.id are required');
    }

    await localJsonService.updateRow(
      null, // spreadsheetId not needed
      REPORTS_DATA_FILE,
      report.id,
      report
    );
  }, { operation: 'updateReportInJson', details: { reportId: report.id } });
}

/**
 * Updates a report with new data
 * @param {string} reportId - Report ID
 * @param {Object} updateData - Update data object
 * @returns {Promise<Result<Report>>} Updated report or error
 */
async function updateReport(reportId, updateData) {
  return attemptAsync(async () => {
    if (!reportId || typeof reportId !== 'string') {
      throw new Error('Report ID must be a non-empty string');
    }

    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Update data must be a valid object');
    }

    console.log('[REPORT SERVICE] updateReport called:', {
      reportId,
      updateData,
      timestamp: new Date().toISOString()
    });

    const allReportsResult = await getAllReports();
    if (!isSuccess(allReportsResult)) {
      throw allReportsResult.error.innerError;
    }
    const allReports = allReportsResult.data;
    const reportIndex = allReports.findIndex(r => r.id === reportId);

    if (reportIndex === -1) {
      console.error('[REPORT SERVICE ERROR] Report not found:', {
        reportId,
        totalReports: allReports.length,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Report with ID ${reportId} not found`);
    }

    const existingReport = allReports[reportIndex];
    console.log('[REPORT SERVICE] Found existing report:', {
      reportId,
      currentData: existingReport
    });

    // Create a Report instance from the existing data
    const reportInstance = new Report(existingReport);

    console.log('[REPORT SERVICE] Updating report instance with data:', updateData);
    const updatedReport = reportInstance.update(updateData);

    // Validate business rules
    console.log('[REPORT SERVICE] Validating business rules');
    updatedReport.validateBusinessRules(allReports);

    // Save to local JSON storage
    console.log('[REPORT SERVICE] Saving to local JSON storage');
    const saveResult = await updateReportInJson(updatedReport);
    if (!isSuccess(saveResult)) {
      throw saveResult.error.innerError;
    }

    console.log('[REPORT SERVICE] Report updated successfully:', {
      reportId,
      updatedData: updateData,
      timestamp: new Date().toISOString()
    });

    return updatedReport;
  }, { operation: 'updateReport', details: { reportId, hasUpdateData: !!updateData } });
}

/**
 * Checks if a report submission would exceed rate limits
 * @param {string} reporterIp - Reporter's IP address
 * @returns {Promise<Result<boolean>>} True if rate limit exceeded or error
 */
async function checkRateLimit(reporterIp) {
  return attemptAsync(async () => {
    // Structured input validation
    const ipError = validateRequired(reporterIp, 'Reporter IP', 'non-empty string');
    if (ipError) throw ipError;

    if (typeof reporterIp !== 'string') {
      throw validationError('reporterIp', 'Reporter IP must be a string', reporterIp, 'string');
    }

    // Get rate limit configuration
    const configResult = await configService.getConfig('system.rateLimitPerHour');
    if (!isSuccess(configResult)) {
      throw databaseError('Failed to get rate limit configuration', configResult.error);
    }
    const rateLimitPerHour = configResult.data || 5;

    // For now, implement a simple in-memory check
    // In production, this should use Redis or similar
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get recent reports from this IP
    const allReportsResult = await getAllReports();
    if (!isSuccess(allReportsResult)) {
      throw allReportsResult.error.innerError;
    }
    const allReports = allReportsResult.data;
    const recentReports = allReports.filter(report =>
      report.reporterIp === reporterIp &&
      new Date(report.createdAt) > oneHourAgo
    );

    return recentReports.length >= rateLimitPerHour;
  }, { operation: 'checkRateLimit', details: { reporterIp } });
}

module.exports = {
  createReport,
  getReports,
  getReportById,
  updateReport,
  updateReportStatus,
  getAllReports,
  checkRateLimit,

  // Export for testing
  saveReportToJson,
  updateReportInJson
};