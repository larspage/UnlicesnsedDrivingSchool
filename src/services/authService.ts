/**
 * Frontend authentication service for NJDSC Admin Portal
 * Handles login, logout, token management, and authentication state
 */

interface AuthUser {
  id: string;
  username: string;
  role: string;
  lastLogin: string;
}

interface AuthResponse {
  user: AuthUser;
  token: string;
  expiresIn: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}

class AuthService {
  private static instance: AuthService;
  private tokenKey = 'njdsc_admin_token';
  private userKey = 'njdsc_admin_user';
  private tokenExpirationKey = 'njdsc_admin_token_expiration';

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.success && data.data) {
        // Store authentication data
        this.setToken(data.data.token);
        this.setUser(data.data.user);
        this.setTokenExpiration(data.data.expiresIn);

        return data.data;
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        // Call logout endpoint to log the action
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Always clear local storage
      this.clearAuthData();
    }
  }

  /**
   * Verify current authentication status
   */
  async verifyAuth(): Promise<AuthUser | null> {
    try {
      const token = this.getToken();
      if (!token) {
        return null;
      }

      // Check if token is expired
      if (this.isTokenExpired()) {
        this.clearAuthData();
        return null;
      }

      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success && data.data) {
        // Update stored user data
        this.setUser(data.data.user);
        return data.data.user;
      } else {
        // Token is invalid, clear auth data
        this.clearAuthData();
        return null;
      }
    } catch (error) {
      console.error('Auth verification error:', error);
      this.clearAuthData();
      return null;
    }
  }

  /**
   * Change current user's password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Password change failed');
      }

      if (!data.success) {
        throw new Error(data.message || 'Password change failed');
      }
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<AuthUser | null> {
    try {
      const token = this.getToken();
      if (!token) {
        return null;
      }

      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success && data.data) {
        return data.data.user;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      return null;
    }
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();

    if (!token || !user) {
      return false;
    }

    // Check if token is expired
    if (this.isTokenExpired()) {
      this.clearAuthData();
      return false;
    }

    return true;
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    if (!this.isAuthenticated()) {
      return null;
    }
    return this.getUser();
  }

  /**
   * Check if current user has admin role
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user ? user.role === 'admin' : false;
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // Private helper methods

  private getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private getUser(): AuthUser | null {
    const userJson = localStorage.getItem(this.userKey);
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        return null;
      }
    }
    return null;
  }

  private setUser(user: AuthUser): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  private setTokenExpiration(expiresIn: string): void {
    // Calculate expiration time (assuming expiresIn is like "24h")
    const expirationTime = this.parseExpirationTime(expiresIn);
    localStorage.setItem(this.tokenExpirationKey, expirationTime.toString());
  }

  private isTokenExpired(): boolean {
    const expirationStr = localStorage.getItem(this.tokenExpirationKey);
    if (!expirationStr) {
      return true;
    }

    const expirationTime = parseInt(expirationStr, 10);
    const now = Date.now();

    return now >= expirationTime;
  }

  private parseExpirationTime(expiresIn: string): number {
    // Parse strings like "24h", "1h", "30m", etc.
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Default to 1 hour if format is unexpected
      return Date.now() + (60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    let multiplier = 1000; // milliseconds

    switch (unit) {
      case 's':
        multiplier *= 1;
        break;
      case 'm':
        multiplier *= 60;
        break;
      case 'h':
        multiplier *= 60 * 60;
        break;
      case 'd':
        multiplier *= 24 * 60 * 60;
        break;
      default:
        multiplier *= 60 * 60; // default to hours
    }

    return Date.now() + (value * multiplier);
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.tokenExpirationKey);
  }
}

export { AuthService };
export type { AuthUser, AuthResponse, LoginCredentials };