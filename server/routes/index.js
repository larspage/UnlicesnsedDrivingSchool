// API Routes
const express = require('express');
const router = express.Router();

// Health check (already handled in app.js)
// router.get('/health', (req, res) => {
//   res.json({ status: 'OK', timestamp: new Date().toISOString() });
// });

// Placeholder routes - will be expanded in later phases
router.get('/status', (req, res) => {
  res.json({
    message: 'NJDSC School Compliance Portal API',
    version: '1.0.0',
    status: 'development'
  });
});

// Reports routes (placeholder)
router.use('/reports', require('./reports'));

// Files routes (placeholder)
router.use('/files', require('./files'));

// Configuration routes (placeholder)
router.use('/config', require('./config'));

module.exports = router;