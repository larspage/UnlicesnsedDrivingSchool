/**
 * Report Service for NJDSC School Compliance Portal
 *
 * Provides business logic for report management including CRUD operations,
 * duplicate detection, status updates, and data validation.
 */

const Report = require('../models/Report');
const localJsonService = require('./localJsonService');
const configService = require('./configService');

// Configuration constants
const REPORTS_DATA_FILE = 'reports';

/**
 * Creates a new report with duplicate detection and validation
 * @param {Object} reportData - Report data from request
 * @param {string} reporterIp - Reporter's IP address
 * @returns {Promise<Report>} Created report
 * @throws {Error} If validation fails or duplicate found
 */
async function createReport(reportData, reporterIp = null) {
  try {
    // Get all existing reports for duplicate checking
    const existingReports = await getAllReports();

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
      const updatedReport = await updateReport(duplicateReport.id, updateData);
      return updatedReport;
    }

    // Create new report instance if no duplicate found
    const report = Report.create(reportData, reporterIp);

    // Validate business rules (duplicate detection, etc.)
    report.validateBusinessRules(existingReports);

    // Save to local JSON storage
    await saveReportToJson(report);

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
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'lastReported',
      sortOrder = 'desc',
      includeAdminFields = false
    } = options;

    // Get all reports from local JSON storage
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
 * Updates a report's status and admin fields (Admin only)
 * @param {string} reportId - Report ID
 * @param {Object} updateData - Update data object
 * @param {string} updateData.status - New status
 * @param {string} [updateData.adminNotes] - Admin notes
 * @param {string} [updateData.mvcReferenceNumber] - MVC reference number
 * @param {string} [updateData.updatedBy] - Who updated the report
 * @returns {Promise<Report>} Updated report
 * @throws {Error} If report not found or status invalid
 */
async function updateReportStatus(reportId, updateData) {
  const startTime = Date.now();

  try {
    console.log('[REPORT SERVICE] updateReportStatus called:', {
      reportId,
      updateData,
      timestamp: new Date().toISOString()
    });

    const { status, adminNotes, mvcReferenceNumber, updatedBy } = updateData;

    console.log('[REPORT SERVICE] Fetching all reports for update');
    const allReports = await getAllReports();
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
    await updateReportInJson(updatedReport);

    console.log('[REPORT SERVICE] Report status updated successfully:', {
      reportId,
      oldStatus: existingReport.status,
      newStatus: updatedReport.status,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });

    return updatedReport;
  } catch (error) {
    console.error('[REPORT SERVICE ERROR] Error updating report status:', {
      reportId,
      updateData,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Retrieves all reports from local JSON storage
 * @returns {Promise<Array<Report>>} Array of Report instances
 */
async function getAllReports() {
  try {
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
  } catch (error) {
    console.error('Error retrieving all reports:', error);
    throw error;
  }
}

/**
 * Saves a report to local JSON storage
 * @param {Report} report - Report instance to save
 * @returns {Promise<void>}
 */
async function saveReportToJson(report) {
  try {
    await localJsonService.appendRow(
      null, // spreadsheetId not needed
      REPORTS_DATA_FILE,
      report
    );
  } catch (error) {
    console.error('Error saving report to JSON:', error);
    throw error;
  }
}

/**
 * Updates a report in local JSON storage
 * @param {Report} report - Updated report instance
 * @returns {Promise<void>}
 */
async function updateReportInJson(report) {
  try {
    await localJsonService.updateRow(
      null, // spreadsheetId not needed
      REPORTS_DATA_FILE,
      report.id,
      report
    );
  } catch (error) {
    console.error('Error updating report in JSON:', error);
    throw error;
  }
}

/**
 * Updates a report with new data
 * @param {string} reportId - Report ID
 * @param {Object} updateData - Update data object
 * @returns {Promise<Report>} Updated report
 * @throws {Error} If report not found or validation fails
 */
async function updateReport(reportId, updateData) {
  try {
    console.log('[REPORT SERVICE] updateReport called:', {
      reportId,
      updateData,
      timestamp: new Date().toISOString()
    });

    const allReports = await getAllReports();
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
    await updateReportInJson(updatedReport);

    console.log('[REPORT SERVICE] Report updated successfully:', {
      reportId,
      updatedData: updateData,
      timestamp: new Date().toISOString()
    });

    return updatedReport;
  } catch (error) {
    console.error('[REPORT SERVICE ERROR] Error updating report:', {
      reportId,
      updateData,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      timestamp: new Date().toISOString()
    });
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
  updateReport,
  updateReportStatus,
  getAllReports,
  checkRateLimit,

  // Export for testing
  saveReportToJson,
  updateReportInJson
};