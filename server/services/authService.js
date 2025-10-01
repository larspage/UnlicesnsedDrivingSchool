const { generateToken, hashPassword, verifyPassword } = require('../middleware/auth');
const auditService = require('./auditService');

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
   */
  async authenticate(username, password, ipAddress) {
    try {
      const user = this.users.get(username);

      if (!user) {
        try {
          await auditService.logFailedLogin(username, ipAddress, 'user_not_found');
        } catch (auditError) {
          console.warn('Failed to log failed login audit event:', auditError.message);
        }
        throw new Error('Invalid username or password');
      }

      if (!user.isActive) {
        try {
          await auditService.logFailedLogin(username, ipAddress, 'user_inactive');
        } catch (auditError) {
          console.warn('Failed to log failed login audit event:', auditError.message);
        }
        throw new Error('Account is disabled');
      }

      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        try {
          await auditService.logFailedLogin(username, ipAddress, 'invalid_password');
        } catch (auditError) {
          console.warn('Failed to log failed login audit event:', auditError.message);
        }
        throw new Error('Invalid username or password');
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
        await auditService.logLogin(user.username, ipAddress);
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

    } catch (error) {
      console.error('Authentication error:', error.message);
      throw error;
    }
  }

  /**
   * Verify JWT token and return user info
   */
  async verifyToken(token) {
    try {
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

    } catch (error) {
      console.error('Token verification error:', error.message);
      throw error;
    }
  }

  /**
   * Change admin password
   */
  async changePassword(username, currentPassword, newPassword, ipAddress) {
    try {
      const user = this.users.get(username);

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidCurrentPassword = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValidCurrentPassword) {
        await auditService.logFailedPasswordChange(username, ipAddress, 'invalid_current_password');
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

      // Log password change
      await auditService.logPasswordChange(username, ipAddress);

      return { success: true, message: 'Password changed successfully' };

    } catch (error) {
      console.error('Password change error:', error.message);
      throw error;
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(username) {
    const user = this.users.get(username);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive
    };
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
   */
  async getAllUsers() {
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
  }
}

// Export singleton instance
module.exports = new AuthService();