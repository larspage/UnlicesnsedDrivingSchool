const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticateAdmin } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for authentication endpoints - relaxed for test environments
const testMode = process.env.NODE_ENV === 'test';
const authLimiter = rateLimit({
  windowMs: testMode ? 1000 : 15 * 60 * 1000, // 1s for testing, 15min production
  max: testMode ? 1000 : 5, // high limit for tests, 5 for production
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/auth/login
 * Authenticate admin user and return JWT token
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Username and password are required'
      });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'Username and password must be strings'
      });
    }

    if (username.length < 3 || password.length < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'Please provide valid credentials'
      });
    }

    // Authenticate user
    const authResult = await authService.authenticate(username, password, ipAddress);

    res.json({
      success: true,
      data: authResult,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error.message);

    // Don't reveal specific error details for security
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: error.message.includes('Invalid username or password')
        ? 'Invalid username or password'
        : 'Login failed. Please try again.'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout admin user (client-side token removal)
 */
router.post('/logout', authenticateAdmin, async (req, res) => {
  try {
    const username = req.adminUser.username;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    // Log the logout action
    const auditService = require('../services/auditService');
    await auditService.logLogout(username, ipAddress);

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify JWT token and return current user info
 */
router.get('/verify', authenticateAdmin, async (req, res) => {
  try {
    const userProfile = await authService.getUserProfile(req.adminUser.username);

    res.json({
      success: true,
      data: {
        user: userProfile
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: 'Unable to verify authentication status'
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change admin password (requires current password)
 */
router.post('/change-password', authenticateAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const username = req.adminUser.username;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Missing fields',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Invalid password',
        message: 'New password must be at least 8 characters long'
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Same password',
        message: 'New password must be different from current password'
      });
    }

    // Change password
    const result = await authService.changePassword(username, currentPassword, newPassword, ipAddress);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Password change error:', error.message);

    if (error.message.includes('Current password is incorrect')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid current password',
        message: 'Current password is incorrect'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Password change failed',
      message: 'Unable to change password. Please try again.'
    });
  }
});

/**
 * GET /api/auth/profile
 * Get current user profile information
 */
router.get('/profile', authenticateAdmin, async (req, res) => {
  try {
    const userProfile = await authService.getUserProfile(req.adminUser.username);

    res.json({
      success: true,
      data: {
        user: userProfile
      }
    });

  } catch (error) {
    console.error('Profile retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Profile retrieval failed',
      message: 'Unable to retrieve user profile'
    });
  }
});

module.exports = router;