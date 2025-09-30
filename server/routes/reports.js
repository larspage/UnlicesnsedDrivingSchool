/**
 * Reports API routes for NJDSC School Compliance Portal
 *
 * Provides endpoints for report submission, retrieval, and management.
 */

const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
const fileService = require('../services/fileService');
const googleDriveService = require('../services/googleDriveService');
const rateLimit = require('express-rate-limit');

// Rate limiting for report submissions
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 requests per hour
  message: 'Too many report submissions from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/reports
 * Submit a new school compliance report
 */
router.post('/', reportLimiter, async (req, res) => {
  try {
    const reportData = req.body;
    const reporterIp = req.ip || req.connection.remoteAddress || 'unknown';

    // Debug logging for incoming data
    console.log('=== REPORT SUBMISSION DEBUG ===');
    console.log('Request body keys:', Object.keys(reportData));
    console.log('School name:', reportData.schoolName);
    console.log('Files field exists:', !!reportData.files);
    console.log('Files field type:', typeof reportData.files);
    console.log('Files array length:', Array.isArray(reportData.files) ? reportData.files.length : 'not array');
    if (reportData.files && Array.isArray(reportData.files)) {
      console.log('Files details:', reportData.files.map(f => ({ name: f.name, type: f.type, size: f.size, hasData: !!f.data })));
    }
    console.log('================================');

    // Validate required fields
    if (!reportData.schoolName) {
      return res.status(400).json({
        success: false,
        error: 'schoolName is required'
      });
    }

    // Check rate limit
    const rateLimitExceeded = await reportService.checkRateLimit(reporterIp);
    if (rateLimitExceeded) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Maximum 5 reports per hour allowed.'
      });
    }

    // Create the report
    const report = await reportService.createReport(reportData, reporterIp);

    // Process files if included
    const uploadedFiles = [];
    if (reportData.files && Array.isArray(reportData.files) && reportData.files.length > 0) {
      console.log(`Processing ${reportData.files.length} files for report ${report.id}`);

      for (const fileData of reportData.files) {
        try {
          // Convert base64 to buffer
          const fileBuffer = Buffer.from(fileData.data, 'base64');

          // Upload directly to Google Drive (bypass file service sheet dependency)
          const driveFile = await googleDriveService.uploadFile(
            fileBuffer,
            fileData.name,
            fileData.type,
            report.id
          );

          // Generate public URL
          const publicUrl = await googleDriveService.generatePublicUrl(driveFile.id);

          // Generate thumbnail for images
          let thumbnailUrl = null;
          if (fileData.type.startsWith('image/')) {
            thumbnailUrl = await googleDriveService.generateThumbnail(driveFile.id);
          }

          uploadedFiles.push({
            id: driveFile.id,
            name: fileData.name,
            type: fileData.mimeType,
            size: fileBuffer.length,
            url: publicUrl,
            thumbnailUrl: thumbnailUrl,
            uploadedAt: new Date().toISOString()
          });

          console.log(`Successfully uploaded file: ${fileData.name} to Drive folder`);
        } catch (fileError) {
          console.error(`Error uploading file ${fileData.name}:`, fileError);
          // Continue with other files if one fails
        }
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: report.id,
        schoolName: report.schoolName,
        location: report.location,
        violationDescription: report.violationDescription,
        phoneNumber: report.phoneNumber,
        websiteUrl: report.websiteUrl,
        status: report.status,
        createdAt: report.createdAt,
        lastReported: report.lastReported,
        uploadedFiles: uploadedFiles
      },
      message: `Report submitted successfully${uploadedFiles.length > 0 ? ` with ${uploadedFiles.length} file(s)` : ''}`
    });

  } catch (error) {
    console.error('Error submitting report:', error);

    // Handle specific error types
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'A report for this school already exists',
        message: error.message
      });
    }

    if (error.message.includes('validation failed')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report data',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to submit report',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/reports
 * Get paginated list of reports with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = 'lastReported',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      status: status || undefined,
      search: search || undefined,
      sortBy: sortBy || 'lastReported',
      sortOrder: sortOrder || 'desc',
      includeAdminFields: false // Public endpoint, hide sensitive data
    };

    const result = await reportService.getReports(options);

    res.json({
      success: true,
      data: {
        items: result.items,
        pagination: result.pagination
      }
    });

  } catch (error) {
    console.error('Error retrieving reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve reports',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/reports/:id
 * Get a specific report by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid report ID is required'
      });
    }

    const report = await reportService.getReportById(id, false); // Public access

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Error retrieving report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve report',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/reports/:id/status
 * Update report status (Admin only)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, mvcReferenceNumber } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid report ID is required'
      });
    }

    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required'
      });
    }

    // Validate status values
    const validStatuses = ['Added', 'Confirmed by NJDSC', 'Reported to MVC', 'Under Investigation', 'Closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Update the report status
    const updatedReport = await reportService.updateReportStatus(id, {
      status,
      adminNotes,
      mvcReferenceNumber,
      updatedBy: 'admin' // TODO: Get from authenticated user
    });

    // Log the status update to audit trail
    const auditService = require('../services/auditService');
    const oldReport = await reportService.getReportById(id, true); // Get with admin fields

    if (oldReport) {
      await auditService.logStatusUpdate(
        id,
        oldReport.status,
        status,
        adminNotes
      );
    }

    res.json({
      success: true,
      data: {
        id: updatedReport.id,
        status: updatedReport.status,
        updatedAt: updatedReport.updatedAt,
        adminNotes: updatedReport.adminNotes,
        mvcReferenceNumber: updatedReport.mvcReferenceNumber
      },
      message: `Report status updated to "${status}"`
    });

  } catch (error) {
    console.error('Error updating report status:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update report status',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/reports/bulk/status
 * Bulk update report statuses (Admin only)
 */
router.put('/bulk/status', async (req, res) => {
  try {
    const { reportIds, status, adminNotes } = req.body;

    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid report IDs array is required'
      });
    }

    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required'
      });
    }

    // Validate status values
    const validStatuses = ['Added', 'Confirmed by NJDSC', 'Reported to MVC', 'Under Investigation', 'Closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Update each report status
    const results = [];
    const auditService = require('../services/auditService');

    for (const reportId of reportIds) {
      try {
        const updatedReport = await reportService.updateReportStatus(reportId, {
          status,
          adminNotes,
          updatedBy: 'admin'
        });

        results.push({
          reportId,
          success: true,
          updatedAt: updatedReport.updatedAt
        });

        // Log the status update to audit trail
        const oldReport = await reportService.getReportById(reportId, true);
        if (oldReport) {
          await auditService.logStatusUpdate(
            reportId,
            oldReport.status,
            status,
            adminNotes
          );
        }
      } catch (reportError) {
        console.error(`Error updating report ${reportId}:`, reportError);
        results.push({
          reportId,
          success: false,
          error: reportError.message
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    // Log the bulk status update
    await auditService.logBulkStatusUpdate(
      reportIds,
      'bulk', // We don't know the old status for bulk operations
      status,
      adminNotes
    );

    res.json({
      success: true,
      data: {
        updated: successful,
        failed,
        results
      },
      message: `Bulk update completed: ${successful} updated, ${failed} failed`
    });

  } catch (error) {
    console.error('Error in bulk status update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk status update',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/reports/stats
 * Get report statistics for dashboard overview
 */
router.get('/stats', async (req, res) => {
  try {
    const allReports = await reportService.getAllReports();

    // Calculate statistics
    const totalReports = allReports.length;
    const pendingReports = allReports.filter(r => r.status === 'Added').length;
    const completedReports = allReports.filter(r => r.status === 'Closed').length;

    // Calculate total files
    const totalFiles = allReports.reduce((acc, report) => {
      return acc + (report.uploadedFiles ? report.uploadedFiles.length : 0);
    }, 0);

    // Get recent reports (last 5)
    const recentReports = allReports
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        totalReports,
        pendingReports,
        completedReports,
        totalFiles,
        recentReports
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error retrieving report statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Statistics retrieval failed',
      message: 'Unable to retrieve report statistics. Please try again later.'
    });
  }
});

module.exports = router;