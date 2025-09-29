/**
 * Reports API routes for NJDSC School Compliance Portal
 *
 * Provides endpoints for report submission, retrieval, and management.
 */

const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');
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
        lastReported: report.lastReported
      },
      message: 'Report submitted successfully'
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
 * Update report status (Admin only - placeholder for future implementation)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

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

    // For now, return a placeholder response
    // TODO: Implement admin authentication and authorization
    res.json({
      success: true,
      data: {
        id,
        status,
        updatedAt: new Date().toISOString()
      },
      message: 'Status update functionality coming in Phase 4'
    });

  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update report status',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;