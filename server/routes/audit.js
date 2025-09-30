/**
 * Audit API Routes for NJDSC School Compliance Portal
 *
 * Provides REST endpoints for managing audit logs.
 * Requires admin authentication for all operations.
 */

const express = require('express');
const auditService = require('../services/auditService');
const router = express.Router();

// Admin authentication middleware (temporary - will be replaced in Phase 3)
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'njdsc-admin-2025';

function requireAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key'] || req.query.adminKey;

  if (!adminKey || adminKey !== ADMIN_KEY) {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'Valid admin authentication is required to access audit endpoints'
    });
  }

  next();
}

// Input validation middleware
function validateAuditLogInput(req, res, next) {
  const { action, adminUser, targetType, details } = req.body;

  if (!action || typeof action !== 'string' || action.trim().length === 0) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Audit action is required and must be a non-empty string'
    });
  }

  if (!adminUser || typeof adminUser !== 'string' || adminUser.trim().length === 0) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Admin user is required and must be a non-empty string'
    });
  }

  if (!targetType || typeof targetType !== 'string' || targetType.trim().length === 0) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Target type is required and must be a non-empty string'
    });
  }

  if (!details || typeof details !== 'string' || details.trim().length === 0) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Audit details are required and must be a non-empty string'
    });
  }

  // Validate action and targetType values
  const validActions = [
    'STATUS_UPDATE', 'BULK_STATUS_UPDATE', 'EMAIL_SENT', 'CONFIGURATION_UPDATE',
    'LOGIN', 'LOGOUT', 'REPORT_VIEW', 'ADMIN_NOTE_ADDED', 'MVC_REFERENCE_ADDED'
  ];

  const validTargetTypes = ['report', 'configuration', 'system', 'email', 'bulk'];

  if (!validActions.includes(action)) {
    return res.status(400).json({
      error: 'Invalid input',
      message: `Audit action must be one of: ${validActions.join(', ')}`
    });
  }

  if (!validTargetTypes.includes(targetType)) {
    return res.status(400).json({
      error: 'Invalid input',
      message: `Target type must be one of: ${validTargetTypes.join(', ')}`
    });
  }

  next();
}

/**
 * GET /api/audit
 * Retrieves audit logs with optional filtering
 * Requires admin authentication
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const filters = {};

    // Parse query parameters
    if (req.query.action) filters.action = req.query.action;
    if (req.query.adminUser) filters.adminUser = req.query.adminUser;
    if (req.query.targetType) filters.targetType = req.query.targetType;
    if (req.query.dateFrom) filters.dateFrom = req.query.dateFrom;
    if (req.query.dateTo) filters.dateTo = req.query.dateTo;
    if (req.query.searchTerm) filters.searchTerm = req.query.searchTerm;
    if (req.query.limit) filters.limit = parseInt(req.query.limit);

    const auditLogs = await auditService.getAuditLogs(filters);

    res.json({
      success: true,
      data: auditLogs,
      count: auditLogs.length,
      filters: filters,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error retrieving audit logs:', error);
    res.status(500).json({
      error: 'Audit log retrieval failed',
      message: 'Unable to retrieve audit logs. Please try again later.'
    });
  }
});

/**
 * GET /api/audit/:id
 * Retrieves a specific audit log entry by ID
 * Requires admin authentication
 */
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const auditLogs = await auditService.getAuditLogs();

    const auditLog = auditLogs.find(log => log.id === id);

    if (!auditLog) {
      return res.status(404).json({
        error: 'Audit log not found',
        message: `Audit log with ID "${id}" does not exist`
      });
    }

    res.json({
      success: true,
      data: auditLog,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error retrieving audit log:', error);
    res.status(500).json({
      error: 'Audit log retrieval failed',
      message: 'Unable to retrieve audit log. Please try again later.'
    });
  }
});

/**
 * GET /api/audit/target/:targetId
 * Retrieves audit logs for a specific target
 * Requires admin authentication
 */
router.get('/target/:targetId', requireAdmin, async (req, res) => {
  try {
    const { targetId } = req.params;
    const auditLogs = await auditService.getAuditLogsByTarget(targetId);

    res.json({
      success: true,
      data: auditLogs,
      count: auditLogs.length,
      targetId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error retrieving audit logs by target:', error);
    res.status(500).json({
      error: 'Audit log retrieval failed',
      message: 'Unable to retrieve audit logs for target. Please try again later.'
    });
  }
});

/**
 * GET /api/audit/user/:adminUser
 * Retrieves audit logs for a specific admin user
 * Requires admin authentication
 */
router.get('/user/:adminUser', requireAdmin, async (req, res) => {
  try {
    const { adminUser } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;

    const auditLogs = await auditService.getAuditLogsByAdminUser(adminUser, { limit });

    res.json({
      success: true,
      data: auditLogs,
      count: auditLogs.length,
      adminUser,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error retrieving audit logs by user:', error);
    res.status(500).json({
      error: 'Audit log retrieval failed',
      message: 'Unable to retrieve audit logs for user. Please try again later.'
    });
  }
});

/**
 * GET /api/audit/action/:action
 * Retrieves audit logs for a specific action type
 * Requires admin authentication
 */
router.get('/action/:action', requireAdmin, async (req, res) => {
  try {
    const { action } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;

    const auditLogs = await auditService.getAuditLogsByAction(action, { limit });

    res.json({
      success: true,
      data: auditLogs,
      count: auditLogs.length,
      action,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error retrieving audit logs by action:', error);
    res.status(500).json({
      error: 'Audit log retrieval failed',
      message: 'Unable to retrieve audit logs for action. Please try again later.'
    });
  }
});

/**
 * GET /api/audit/recent
 * Retrieves recent audit logs
 * Requires admin authentication
 */
router.get('/recent', requireAdmin, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const auditLogs = await auditService.getRecentAuditLogs(limit);

    res.json({
      success: true,
      data: auditLogs,
      count: auditLogs.length,
      limit,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error retrieving recent audit logs:', error);
    res.status(500).json({
      error: 'Audit log retrieval failed',
      message: 'Unable to retrieve recent audit logs. Please try again later.'
    });
  }
});

/**
 * GET /api/audit/stats
 * Retrieves audit log statistics
 * Requires admin authentication
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const options = {};

    if (req.query.startDate) options.startDate = req.query.startDate;
    if (req.query.endDate) options.endDate = req.query.endDate;

    const stats = await auditService.getAuditStatistics(options);

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error retrieving audit statistics:', error);
    res.status(500).json({
      error: 'Statistics retrieval failed',
      message: 'Unable to retrieve audit statistics. Please try again later.'
    });
  }
});

/**
 * POST /api/audit
 * Creates a new audit log entry
 * Requires admin authentication and valid input
 */
router.post('/', requireAdmin, validateAuditLogInput, async (req, res) => {
  try {
    const auditLogData = req.body;

    // Add IP address from request
    auditLogData.ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';

    const auditLog = await auditService.createAuditLog(auditLogData);

    res.status(201).json({
      success: true,
      data: auditLog,
      message: 'Audit log entry created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating audit log:', error);

    // Handle validation errors specifically
    if (error.message.includes('validation failed') || error.message.includes('Invalid') || error.message.includes('Missing')) {
      return res.status(400).json({
        error: 'Audit log validation failed',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Audit log creation failed',
      message: 'Unable to create audit log entry. Please try again later.'
    });
  }
});

/**
 * POST /api/audit/bulk
 * Creates multiple audit log entries
 * Requires admin authentication
 */
router.post('/bulk', requireAdmin, async (req, res) => {
  try {
    const { entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Entries must be a non-empty array'
      });
    }

    const createdEntries = [];

    for (const entryData of entries) {
      try {
        // Add IP address from request
        entryData.ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';

        const auditLog = await auditService.createAuditLog(entryData);
        createdEntries.push(auditLog);
      } catch (error) {
        console.error('Error creating audit log entry:', entryData, error);
        // Continue with other entries even if one fails
      }
    }

    res.status(201).json({
      success: true,
      data: createdEntries,
      count: createdEntries.length,
      requested: entries.length,
      message: `Successfully created ${createdEntries.length} of ${entries.length} audit log entries`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating bulk audit logs:', error);
    res.status(500).json({
      error: 'Bulk audit log creation failed',
      message: 'Unable to create audit log entries. Please try again later.'
    });
  }
});

module.exports = router;