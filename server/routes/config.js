/**
 * Configuration API Routes for NJDSC School Compliance Portal
 *
 * Provides REST endpoints for managing system configuration.
 * Requires admin authentication for all operations.
 */

const express = require('express');
const configService = require('../services/configService');
const router = express.Router();

// Admin authentication middleware (temporary - will be replaced in Phase 3)
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'njdsc-admin-2025';

function requireAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key'] || req.query.adminKey;

  if (!adminKey || adminKey !== ADMIN_KEY) {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'Valid admin authentication is required to access configuration endpoints'
    });
  }

  next();
}

// Input validation middleware
function validateConfigInput(req, res, next) {
  const { key, value, type, category } = req.body;

  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Configuration key is required and must be a non-empty string'
    });
  }

  if (value === undefined) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Configuration value is required'
    });
  }

  if (!type || typeof type !== 'string') {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Configuration type is required and must be a string'
    });
  }

  if (!category || typeof category !== 'string') {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Configuration category is required and must be a string'
    });
  }

  // Validate type and category values
  const validTypes = ['string', 'number', 'boolean', 'json'];
  const validCategories = ['email', 'google', 'system'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: 'Invalid input',
      message: `Configuration type must be one of: ${validTypes.join(', ')}`
    });
  }

  if (!validCategories.includes(category)) {
    return res.status(400).json({
      error: 'Invalid input',
      message: `Configuration category must be one of: ${validCategories.join(', ')}`
    });
  }

  next();
}

/**
 * GET /api/config
 * Retrieves all configuration settings
 * Requires admin authentication
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const config = await configService.getAllConfig();

    res.json({
      success: true,
      data: config,
      count: Object.keys(config).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error retrieving configuration:', error);
    res.status(500).json({
      error: 'Configuration retrieval failed',
      message: 'Unable to retrieve system configuration. Please try again later.'
    });
  }
});

/**
 * GET /api/config/:key
 * Retrieves a specific configuration value by key
 * Requires admin authentication
 */
router.get('/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const value = await configService.getConfig(key);

    if (value === null) {
      return res.status(404).json({
        error: 'Configuration not found',
        message: `Configuration key "${key}" does not exist`
      });
    }

    res.json({
      success: true,
      data: {
        key,
        value
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error retrieving configuration:', error);
    res.status(500).json({
      error: 'Configuration retrieval failed',
      message: 'Unable to retrieve configuration value. Please try again later.'
    });
  }
});

/**
 * PUT /api/config
 * Updates or creates a configuration value
 * Requires admin authentication and valid input
 */
router.put('/', requireAdmin, validateConfigInput, async (req, res) => {
  try {
    const { key, value, type, category, description } = req.body;
    const updatedBy = req.headers['x-admin-user'] || 'admin';

    // Validate the configuration before saving
    configService.validateConfig(key, value, type);

    const config = await configService.setConfig(key, value, type, category, description, updatedBy);

    res.json({
      success: true,
      data: {
        key: config.key,
        value: config.getTypedValue(),
        type: config.type,
        category: config.category,
        description: config.description,
        updatedAt: config.updatedAt,
        updatedBy: config.updatedBy
      },
      message: `Configuration "${key}" has been ${config.updatedAt ? 'updated' : 'created'} successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating configuration:', error);

    // Handle validation errors specifically
    if (error.message.includes('validation failed') || error.message.includes('Invalid')) {
      return res.status(400).json({
        error: 'Configuration validation failed',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Configuration update failed',
      message: 'Unable to update configuration. Please try again later.'
    });
  }
});

/**
 * POST /api/config/validate
 * Validates configuration input without saving
 * Requires admin authentication
 */
router.post('/validate', requireAdmin, async (req, res) => {
  try {
    const { key, value, type } = req.body;

    if (!key || !type) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Key and type are required for validation'
      });
    }

    configService.validateConfig(key, value, type);

    res.json({
      success: true,
      message: 'Configuration input is valid',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(400).json({
      error: 'Configuration validation failed',
      message: error.message
    });
  }
});

module.exports = router;