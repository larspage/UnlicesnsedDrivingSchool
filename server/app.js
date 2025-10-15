const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const xss = require('express-xss-sanitizer');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting - relaxed for test environments
const testMode = process.env.NODE_ENV === 'test';
const limiter = rateLimit({
  windowMs: testMode ? 1000 : 15 * 60 * 1000, // 1s for testing, 15min production
  max: testMode ? 1000 : 100, // high limit for tests, 100 for production
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// XSS sanitization middleware
app.use(xss.xss());

// Static file serving for uploads
app.use('/uploads', express.static('./uploads'));

// Static file serving for frontend
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize configuration on startup
const configService = require('./services/configService');
configService.initializeDefaults().then(() => {
  console.log('Configuration initialized successfully');
}).catch((error) => {
  console.error('Failed to initialize configuration:', error.message);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes will be added here
app.use('/api', require('./routes'));

// Catch-all route for SPA routing - commented out for testing
// app.get('*', (req, res, next) => {
//   // Skip API routes
//   if (req.path.startsWith('/api')) {
//     return next();
//   }
//   res.sendFile(path.join(__dirname, 'dist', 'index.html'));
// });

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;