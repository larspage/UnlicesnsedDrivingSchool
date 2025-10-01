const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// JWT secret - in production this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'njdsc-admin-secret-key-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Middleware to authenticate admin users using JWT tokens
 */
const authenticateAdmin = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please provide a valid authentication token'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Add user info to request
    req.adminUser = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Please provide a valid authentication token'
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Middleware to check if user has admin role
 */
const requireAdminRole = (req, res, next) => {
  if (!req.adminUser) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.adminUser.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
      message: 'Admin role required for this operation'
    });
  }

  next();
};

/**
 * Generate JWT token for authenticated user
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Hash password using bcrypt
 */
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Verify password against hash
 */
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

module.exports = {
  authenticateAdmin,
  requireAdminRole,
  generateToken,
  hashPassword,
  verifyPassword,
  JWT_SECRET,
  JWT_EXPIRES_IN
};