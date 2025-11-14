const { generateToken, hashPassword, verifyPassword } = require('../middleware/auth');
const auditService = require('./auditService');
const { success, failure, attempt, attemptAsync, isSuccess } = require('../utils/result');
const { validationError, notFoundError, databaseError, validateRequired, ERROR_CODES } = require('../utils/errorUtils');

/**
 * Authentication service for admin users
 * Manages user authentication, session handling, and basic user management
 */
class AuthService {
  constructor() {
    // In a real application, this would be stored in a database
    // For now, we'll use environment variables for the default admin user
    this.users = new Map();
    this.initializeDefaultAdmin();
  }

  /**
   * Initialize default admin user from environment variables
   */
  async initializeDefaultAdmin() {
    const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // Only create if user doesn't exist
    if (!this.users.has(defaultUsername)) {
      const hashedPassword = await hashPassword(defaultPassword);
      this.users.set(defaultUsername, {
        id: 'admin-001',
        username: defaultUsername,
        passwordHash: hashedPassword,
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLogin: null,
        isActive: true
      });

      console.log(`Default admin user initialized: ${defaultUsername}`);
    }
  }

  /**
   * Authenticate user with username and password
   * @param {string} username - Username
   * @param {string} password - Password
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<Result<Object>>} Authentication result or error
   */
  async authenticate(username, password, ipAddress) {
    return attemptAsync(async () => {
      // Structured input validation
      const usernameError = validateRequired(username, 'Username', 'non-empty string');
      if (usernameError) throw usernameError;

      if (typeof username !== 'string' || username.trim().length === 0) {
        throw validationError('username', 'Username must be a non-empty string', username, 'string');
      }

      const passwordError = validateRequired(password, 'Password', 'non-empty string');
      if (passwordError) throw passwordError;

      if (typeof password !== 'string' || password.length === 0) {
        throw validationError('password', 'Password must be a non-empty string', password, 'string');
      }

      const user = this.users.get(username);

      if (!user) {
        // Try to log failed login (don't fail auth if audit fails)
        try {
          await auditService.logFailedLogin(username, ipAddress || 'unknown', 'user_not_found');
        } catch (auditError) {
          console.warn('Failed to log failed login audit event:', auditError.message);
        }
        throw validationError('credentials', 'Invalid username or password', { username }, 'authentication_error');
      }

      if (!user.isActive) {
        // Try to log failed login (don't fail auth if audit fails)
        try {
          await auditService.logFailedLogin(username, ipAddress || 'unknown', 'user_inactive');
        } catch (auditError) {
          console.warn('Failed to log failed login audit event:', auditError.message);
        }
        throw validationError('account', 'Account is disabled', { username, isActive: user.isActive }, 'account_inactive');
      }

      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        // Try to log failed login (don't fail auth if audit fails)
        try {
          await auditService.logFailedLogin(username, ipAddress || 'unknown', 'invalid_password');
        } catch (auditError) {
          console.warn('Failed to log failed login audit event:', auditError.message);
        }
        throw validationError('credentials', 'Invalid username or password', { username }, 'authentication_error');
      }

      // Update last login
      user.lastLogin = new Date().toISOString();
      this.users.set(username, user);

      // Generate JWT token
      const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role
      });

      // Log successful login (don't fail auth if audit logging fails)
      try {
        await auditService.logLogin(user.username, ipAddress || 'unknown');
      } catch (auditError) {
        console.warn('Failed to log login audit event:', auditError.message);
      }

      return {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          lastLogin: user.lastLogin
        },
        token,
        expiresIn: '24h'
      };
    }, { operation: 'authenticate', details: { username: username?.trim(), hasPassword: !!password, hasIp: !!ipAddress } });
  }

  /**
   * Verify JWT token and return user info
   * @param {string} token - JWT token
   * @returns {Promise<Result<Object>>} User info or error
   */
  async verifyToken(token) {
    return attemptAsync(async () => {
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        throw new Error('Token is required and must be a non-empty string');
      }

      // This is handled by the auth middleware, but we can add additional validation here
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'njdsc-admin-secret-key-2025');

      const user = this.users.get(decoded.username);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return {
        id: user.id,
        username: user.username,
        role: user.role
      };
    }, { operation: 'verifyToken', details: { hasToken: !!token } });
  }

  /**
   * Change admin password
   * @param {string} username - Username
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<Result<Object>>} Password change result or error
   */
  async changePassword(username, currentPassword, newPassword, ipAddress) {
    return attemptAsync(async () => {
      // Input validation
      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        throw new Error('Username is required and must be a non-empty string');
      }

      if (!currentPassword || typeof currentPassword !== 'string' || currentPassword.length === 0) {
        throw new Error('Current password is required and must be a non-empty string');
      }

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length === 0) {
        throw new Error('New password is required and must be a non-empty string');
      }

      const user = this.users.get(username);

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidCurrentPassword = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValidCurrentPassword) {
        // Try to log failed password change (don't fail if audit fails)
        try {
          await auditService.logFailedPasswordChange(username, ipAddress || 'unknown', 'invalid_current_password');
        } catch (auditError) {
          console.warn('Failed to log failed password change audit event:', auditError.message);
        }
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);
      user.passwordHash = newPasswordHash;

      this.users.set(username, user);

      // Log password change (don't fail if audit fails)
      try {
        await auditService.logPasswordChange(username, ipAddress || 'unknown');
      } catch (auditError) {
        console.warn('Failed to log password change audit event:', auditError.message);
      }

      return { success: true, message: 'Password changed successfully' };
    }, { operation: 'changePassword', details: { username, hasCurrentPassword: !!currentPassword, hasNewPassword: !!newPassword, hasIp: !!ipAddress } });
  }

  /**
   * Get user profile information
   * @param {string} username - Username
   * @returns {Promise<Result<Object>>} User profile or error
   */
  async getUserProfile(username) {
    return attemptAsync(async () => {
      // Structured input validation
      const usernameError = validateRequired(username, 'Username', 'non-empty string');
      if (usernameError) throw usernameError;

      if (typeof username !== 'string' || username.trim().length === 0) {
        throw validationError('username', 'Username must be a non-empty string', username, 'string');
      }

      const user = this.users.get(username);

      if (!user) {
        throw notFoundError('User', username);
      }

      return {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        isActive: user.isActive
      };
    }, { operation: 'getUserProfile', details: { username: username?.trim() } });
  }

  /**
   * Check if user has admin role
   */
  hasAdminRole(username) {
    const user = this.users.get(username);
    return user && user.role === 'admin' && user.isActive;
  }

  /**
   * Get all active users (admin only)
   * @returns {Promise<Result<Array>>} All users or error
   */
  async getAllUsers() {
    return attemptAsync(async () => {
      const users = [];
      for (const [username, user] of this.users) {
        users.push({
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          isActive: user.isActive
        });
      }
      return users;
    }, { operation: 'getAllUsers' });
  }
}

// Export singleton instance
module.exports = new AuthService();