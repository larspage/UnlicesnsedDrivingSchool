import { useState, useEffect } from 'react';
import ConfigurationService, { ConfigurationSettings } from '../services/configurationService';

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: ConfigurationSettings) => Promise<void>;
  isLoading?: boolean;
}

const ConfigurationModal = ({
  isOpen,
  onClose,
  onSave,
  isLoading = false
}: ConfigurationModalProps) => {
  const configurationService = ConfigurationService.getInstance();
  const [settings, setSettings] = useState<ConfigurationSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('api');

  // Load current settings when modal opens
  useEffect(() => {
    if (isOpen) {
      const currentConfig = configurationService.getConfiguration();
      setSettings(currentConfig);
      setErrors({});
      setActiveTab('api');
    }
  }, [isOpen, configurationService]);

  const handleInputChange = (field: keyof ConfigurationSettings, value: any) => {
    if (!settings) return;

    setSettings(prev => prev ? {
      ...prev,
      [field]: value
    } : null);

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleArrayInputChange = (field: keyof ConfigurationSettings, value: string) => {
    if (!settings) return;

    const arrayValue = value.split(',').map((item: string) => item.trim()).filter((item: string) => item.length > 0);
    handleInputChange(field, arrayValue);
  };

  const validateForm = (): boolean => {
    if (!settings) return false;

    const newErrors: Record<string, string> = {};

    // API Settings validation
    if (!settings.googleDriveFolderId.trim()) {
      newErrors.googleDriveFolderId = 'Google Drive Folder ID is required';
    }

    if (!settings.googleSheetsId.trim()) {
      newErrors.googleSheetsId = 'Google Sheets ID is required';
    }

    if (!settings.gmailUserId.trim()) {
      newErrors.gmailUserId = 'Gmail User ID is required';
    }

    // File settings validation
    if (settings.maxFileSize < 1 || settings.maxFileSize > 100) {
      newErrors.maxFileSize = 'Max file size must be between 1 and 100 MB';
    }

    if (settings.allowedFileTypes.length === 0) {
      newErrors.allowedFileTypes = 'At least one file type must be allowed';
    }

    // Security settings validation
    if (settings.sessionTimeout < 5 || settings.sessionTimeout > 480) {
      newErrors.sessionTimeout = 'Session timeout must be between 5 and 480 minutes';
    }

    if (settings.maxLoginAttempts < 1 || settings.maxLoginAttempts > 10) {
      newErrors.maxLoginAttempts = 'Max login attempts must be between 1 and 10';
    }

    if (settings.passwordMinLength < 6 || settings.passwordMinLength > 50) {
      newErrors.passwordMinLength = 'Password minimum length must be between 6 and 50';
    }

    // Email validation for admin notification emails
    if (settings.adminNotificationEmails.length > 0) {
      const invalidEmails = settings.adminNotificationEmails.filter((email: string) => !/\S+@\S+\.\S+/.test(email));
      if (invalidEmails.length > 0) {
        newErrors.adminNotificationEmails = 'One or more email addresses are invalid';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!settings || !validateForm()) {
      return;
    }

    try {
      await onSave(settings);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setErrors({ submit: 'Failed to save configuration. Please try again.' });
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!isOpen || !settings) {
    return null;
  }

  const tabs = [
    { id: 'api', label: 'API Settings', icon: '🔗' },
    { id: 'system', label: 'System Settings', icon: '⚙️' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'notifications', label: 'Notifications', icon: '📧' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">System Configuration</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage API settings, system preferences, and security configurations
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* API Settings Tab */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">API Configuration</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Drive Folder ID *
                  </label>
                  <input
                    type="text"
                    value={settings.googleDriveFolderId}
                    onChange={(e) => handleInputChange('googleDriveFolderId', e.target.value)}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.googleDriveFolderId ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.googleDriveFolderId && (
                    <p className="mt-1 text-sm text-red-600">{errors.googleDriveFolderId}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    The folder ID where uploaded files will be stored
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Sheets ID *
                  </label>
                  <input
                    type="text"
                    value={settings.googleSheetsId}
                    onChange={(e) => handleInputChange('googleSheetsId', e.target.value)}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.googleSheetsId ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.googleSheetsId && (
                    <p className="mt-1 text-sm text-red-600">{errors.googleSheetsId}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    The spreadsheet ID where reports will be stored
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gmail User ID *
                  </label>
                  <input
                    type="text"
                    value={settings.gmailUserId}
                    onChange={(e) => handleInputChange('gmailUserId', e.target.value)}
                    placeholder="me@domain.com or user@domain.com"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.gmailUserId ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.gmailUserId && (
                    <p className="mt-1 text-sm text-red-600">{errors.gmailUserId}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    Gmail account used for sending notifications
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* System Settings Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Settings</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum File Size (MB)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.maxFileSize}
                    onChange={(e) => handleInputChange('maxFileSize', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.maxFileSize ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.maxFileSize && (
                    <p className="mt-1 text-sm text-red-600">{errors.maxFileSize}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allowed File Types
                  </label>
                  <input
                    type="text"
                    value={settings.allowedFileTypes.join(', ')}
                    onChange={(e) => handleArrayInputChange('allowedFileTypes', e.target.value)}
                    placeholder="jpg, jpeg, png, pdf, doc, docx"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.allowedFileTypes ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.allowedFileTypes && (
                    <p className="mt-1 text-sm text-red-600">{errors.allowedFileTypes}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    Comma-separated list of allowed file extensions
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requireAuthentication"
                    checked={settings.requireAuthentication}
                    onChange={(e) => handleInputChange('requireAuthentication', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="requireAuthentication" className="ml-2 block text-sm text-gray-900">
                    Require Authentication
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="duplicateCheckEnabled"
                    checked={settings.duplicateCheckEnabled}
                    onChange={(e) => handleInputChange('duplicateCheckEnabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="duplicateCheckEnabled" className="ml-2 block text-sm text-gray-900">
                    Enable Duplicate School Check
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoStatusProgression"
                    checked={settings.autoStatusProgression}
                    onChange={(e) => handleInputChange('autoStatusProgression', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoStatusProgression" className="ml-2 block text-sm text-gray-900">
                    Auto Status Progression
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="businessHoursOnly"
                    checked={settings.businessHoursOnly}
                    onChange={(e) => handleInputChange('businessHoursOnly', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="businessHoursOnly" className="ml-2 block text-sm text-gray-900">
                    Business Hours Only
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.sessionTimeout ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.sessionTimeout && (
                    <p className="mt-1 text-sm text-red-600">{errors.sessionTimeout}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => handleInputChange('maxLoginAttempts', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.maxLoginAttempts ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.maxLoginAttempts && (
                    <p className="mt-1 text-sm text-red-600">{errors.maxLoginAttempts}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Min Length
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="50"
                    value={settings.passwordMinLength}
                    onChange={(e) => handleInputChange('passwordMinLength', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.passwordMinLength ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.passwordMinLength && (
                    <p className="mt-1 text-sm text-red-600">{errors.passwordMinLength}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>

              <div className="space-y-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="emailNotifications"
                    checked={settings.emailNotifications}
                    onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-900">
                    Enable Email Notifications
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoEmailConfirmation"
                    checked={settings.autoEmailConfirmation}
                    onChange={(e) => handleInputChange('autoEmailConfirmation', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoEmailConfirmation" className="ml-2 block text-sm text-gray-900">
                    Auto-send Confirmation Emails
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notification Emails
                  </label>
                  <input
                    type="text"
                    value={settings.adminNotificationEmails.join(', ')}
                    onChange={(e) => handleArrayInputChange('adminNotificationEmails', e.target.value)}
                    placeholder="admin1@example.com, admin2@example.com"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.adminNotificationEmails ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.adminNotificationEmails && (
                    <p className="mt-1 text-sm text-red-600">{errors.adminNotificationEmails}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    Comma-separated list of admin emails for notifications
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfigurationModal;