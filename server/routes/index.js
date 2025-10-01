// API Routes
const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');

// Health check (already handled in app.js)
// router.get('/health', (req, res) => {
//   res.json({ status: 'OK', timestamp: new Date().toISOString() });
// });

// Public status endpoint
router.get('/status', (req, res) => {
  res.json({
    message: 'NJDSC School Compliance Portal API',
    version: '1.0.0',
    status: 'development'
  });
});

// Authentication routes (public)
router.use('/auth', require('./auth'));

// Reports routes (public for submission, admin-only for management)
router.use('/reports', require('./reports'));

// Files routes (public for upload, admin-only for management)
router.use('/files', require('./files'));

// Configuration routes (admin-only)
router.use('/config', authenticateAdmin, require('./config'));

// Email routes (admin-only)
router.use('/emails', authenticateAdmin, require('./emails'));

// Audit routes (admin-only)
router.use('/audit', authenticateAdmin, require('./audit'));

module.exports = router;