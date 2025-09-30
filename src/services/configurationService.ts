import AuditService from './auditService';
import { apiClient } from './api';

export interface ConfigurationSettings {
  // API Settings
  googleDriveFolderId: string;
  googleSheetsId: string;
  gmailUserId: string;

  // System Settings
  maxFileSize: number;
  allowedFileTypes: string[];
  requireAuthentication: boolean;

  // Notification Settings
  emailNotifications: boolean;
  autoEmailConfirmation: boolean;
  adminNotificationEmails: string[];

  // Security Settings
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;

  // Business Logic Settings
  duplicateCheckEnabled: boolean;
  autoStatusProgression: boolean;
  businessHoursOnly: boolean;

  // Metadata
  lastUpdated: string;
  updatedBy: string;
  version: string;
}

class ConfigurationService {
  private static instance: ConfigurationService;
  private auditService = AuditService.getInstance();
  private currentSettings: ConfigurationSettings | null = null;

  private readonly STORAGE_KEY = 'njdsc_configuration';
  private readonly CONFIG_VERSION = '1.0.0';

  private constructor() {
    this.loadConfiguration();
  }

  public static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  /**
   * Get default configuration settings
   */
  private getDefaultConfiguration(): ConfigurationSettings {
    return {
      // API Settings
      googleDriveFolderId: '',
      googleSheetsId: '',
      gmailUserId: '',

      // System Settings
      maxFileSize: 10,
      allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      requireAuthentication: true,

      // Notification Settings
      emailNotifications: true,
      autoEmailConfirmation: false,
      adminNotificationEmails: [],

      // Security Settings
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      passwordMinLength: 8,

      // Business Logic Settings
      duplicateCheckEnabled: true,
      autoStatusProgression: false,
      businessHoursOnly: false,

      // Metadata
      lastUpdated: new Date().toISOString(),
      updatedBy: 'system',
      version: this.CONFIG_VERSION
    };
  }

  /**
   * Load configuration from storage (keeping synchronous for compatibility)
   */
  public loadConfiguration(): ConfigurationSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);

        // Validate the loaded configuration
        if (this.validateConfiguration(parsedSettings)) {
          const loadedConfig: ConfigurationSettings = {
            ...this.getDefaultConfiguration(),
            ...parsedSettings
          };
          this.currentSettings = loadedConfig;
          console.log('Configuration loaded from storage:', this.currentSettings);
          return loadedConfig;
        } else {
          console.warn('Invalid configuration in storage, using defaults');
          const defaultConfig = this.getDefaultConfiguration();
          this.currentSettings = defaultConfig;
          this.saveConfiguration(defaultConfig);
          return defaultConfig;
        }
      } else {
        console.log('No configuration found in storage, using defaults');
        const defaultConfig = this.getDefaultConfiguration();
        this.currentSettings = defaultConfig;
        this.saveConfiguration(defaultConfig);
        return defaultConfig;
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      const defaultConfig = this.getDefaultConfiguration();
      this.currentSettings = defaultConfig;
      return defaultConfig;
    }
  }

  /**
   * Save configuration to storage and sync with API
   */
  public async saveConfiguration(settings: ConfigurationSettings, updatedBy: string = 'admin'): Promise<boolean> {
    try {
      // Validate settings before saving
      if (!this.validateConfiguration(settings)) {
        throw new Error('Invalid configuration settings');
      }

      // Add metadata
      const settingsWithMetadata: ConfigurationSettings = {
        ...settings,
        lastUpdated: new Date().toISOString(),
        updatedBy,
        version: this.CONFIG_VERSION
      };

      // Save to localStorage first
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settingsWithMetadata));

      // Update current settings
      this.currentSettings = settingsWithMetadata;

      // Try to sync with API (don't fail if API is unavailable)
      try {
        // Convert settings to API format (flatten the object)
        const apiSettings = {
          key: 'system_config',
          value: settingsWithMetadata,
          type: 'json',
          category: 'system',
          description: 'System configuration settings'
        };

        await apiClient.updateConfiguration(apiSettings);
        console.log('Configuration synced with API');
      } catch (apiError) {
        console.warn('Failed to sync configuration with API, but saved locally:', apiError);
      }

      // Log the configuration change
      this.auditService.logConfigurationUpdate(
        this.getConfigurationChanges(settings),
        `Configuration updated by ${updatedBy}`
      );

      console.log('Configuration saved successfully:', settingsWithMetadata);
      return true;
    } catch (error) {
      console.error('Error saving configuration:', error);
      return false;
    }
  }

  /**
   * Get current configuration settings
   */
  public getConfiguration(): ConfigurationSettings {
    if (!this.currentSettings) {
      this.currentSettings = this.loadConfiguration();
    }
    // At this point, currentSettings should never be null due to the assignment above
    // But to satisfy TypeScript, we'll ensure it
    return this.currentSettings ?? this.getDefaultConfiguration();
  }

  /**
   * Update specific configuration settings
   */
  public async updateConfiguration(updates: Partial<ConfigurationSettings>, updatedBy: string = 'admin'): Promise<boolean> {
    const currentConfig = this.getConfiguration();
    const newConfig = { ...currentConfig, ...updates };

    return this.saveConfiguration(newConfig, updatedBy);
  }

  /**
   * Reset configuration to defaults
   */
  public async resetToDefaults(updatedBy: string = 'admin'): Promise<boolean> {
    const defaultConfig = this.getDefaultConfiguration();
    defaultConfig.updatedBy = updatedBy;
    defaultConfig.lastUpdated = new Date().toISOString();

    return this.saveConfiguration(defaultConfig, updatedBy);
  }

  /**
   * Validate configuration settings
   */
  private validateConfiguration(settings: any): boolean {
    try {
      // Check required API settings
      if (!settings.googleDriveFolderId || typeof settings.googleDriveFolderId !== 'string') {
        return false;
      }

      if (!settings.googleSheetsId || typeof settings.googleSheetsId !== 'string') {
        return false;
      }

      if (!settings.gmailUserId || typeof settings.gmailUserId !== 'string') {
        return false;
      }

      // Validate numeric ranges
      if (settings.maxFileSize < 1 || settings.maxFileSize > 100) {
        return false;
      }

      if (settings.sessionTimeout < 5 || settings.sessionTimeout > 480) {
        return false;
      }

      if (settings.maxLoginAttempts < 1 || settings.maxLoginAttempts > 10) {
        return false;
      }

      if (settings.passwordMinLength < 6 || settings.passwordMinLength > 50) {
        return false;
      }

      // Validate arrays
      if (!Array.isArray(settings.allowedFileTypes) || settings.allowedFileTypes.length === 0) {
        return false;
      }

      if (!Array.isArray(settings.adminNotificationEmails)) {
        return false;
      }

      // Validate email addresses if provided
      if (settings.adminNotificationEmails.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const email of settings.adminNotificationEmails) {
          if (!emailRegex.test(email)) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Configuration validation error:', error);
      return false;
    }
  }

  /**
   * Get configuration changes for audit logging
   */
  private getConfigurationChanges(newSettings: ConfigurationSettings): Record<string, { old: any; new: any }> {
    if (!this.currentSettings) {
      return {};
    }

    const changes: Record<string, { old: any; new: any }> = {};

    // Compare each setting
    Object.keys(newSettings).forEach(key => {
      const currentValue = (this.currentSettings as any)[key];
      const newValue = (newSettings as any)[key];

      if (JSON.stringify(currentValue) !== JSON.stringify(newValue)) {
        changes[key] = { old: currentValue, new: newValue };
      }
    });

    return changes;
  }

  /**
   * Export configuration for backup
   */
  public exportConfiguration(): string {
    const config = this.getConfiguration();
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import configuration from backup
   */
  public async importConfiguration(configJson: string, updatedBy: string = 'admin'): Promise<boolean> {
    try {
      const importedConfig = JSON.parse(configJson);

      if (this.validateConfiguration(importedConfig)) {
        return this.saveConfiguration(importedConfig, updatedBy);
      } else {
        throw new Error('Invalid configuration format');
      }
    } catch (error) {
      console.error('Error importing configuration:', error);
      return false;
    }
  }

  /**
   * Get configuration summary for display
   */
  public getConfigurationSummary(): {
    apiConfigured: boolean;
    securityEnabled: boolean;
    notificationsActive: boolean;
    lastUpdated: string;
    version: string;
  } {
    const config = this.getConfiguration();

    return {
      apiConfigured: !!(config.googleDriveFolderId && config.googleSheetsId && config.gmailUserId),
      securityEnabled: config.requireAuthentication,
      notificationsActive: config.emailNotifications,
      lastUpdated: config.lastUpdated,
      version: config.version
    };
  }

  /**
   * Check if configuration needs migration (for future versions)
   */
  public needsMigration(): boolean {
    const config = this.getConfiguration();
    return config.version !== this.CONFIG_VERSION;
  }

  /**
   * Migrate configuration to new version (placeholder for future use)
   */
  public migrateConfiguration(): boolean {
    // This would handle migrations between configuration versions
    console.log('Configuration migration check - no migration needed');
    return true;
  }
}

export default ConfigurationService;