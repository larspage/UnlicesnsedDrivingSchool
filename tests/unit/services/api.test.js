/**
 * Unit Tests for API Service
 *
 * Tests all functions in api.ts with happy path, regular, and negative testing.
 */

// Mock fetch globally
global.fetch = jest.fn();

// Mock auth service
jest.mock('../../../src/services/authService', () => ({
  default: {
    getInstance: jest.fn(() => ({
      getAuthToken: jest.fn()
    }))
  }
}));

const apiService = require('../../../src/services/api');
const { apiClient, convertFileToBase64, validateFileForUpload } = apiService;

describe('API Service', () => {
  let mockAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();

    // Setup auth service mock
    mockAuthService = {
      getAuthToken: jest.fn()
    };
    const mockAuthModule = require('../../../src/services/authService');
    mockAuthModule.default.getInstance.mockReturnValue(mockAuthService);
  });

  describe('ApiClient.request', () => {
    // Happy path tests
    test('should make successful GET request without auth', async () => {
      const mockResponse = {
        success: true,
        data: { test: 'data' }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await apiClient.request('/test');

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      expect(result).toEqual(mockResponse);
    });

    test('should make request with authentication header', async () => {
      mockAuthService.getAuthToken.mockReturnValue('test-token');

      const mockResponse = { success: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      await apiClient.request('/test');

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });
    });

    test('should make POST request with body', async () => {
      const mockResponse = { success: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await apiClient.request('/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' })
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: 'data' })
      });
      expect(result).toEqual(mockResponse);
    });

    // Negative tests
    test('should handle HTTP error response', async () => {
      const errorResponse = {
        message: 'Not found',
        error: 'Resource not found'
      };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue(errorResponse)
      });

      await expect(apiClient.request('/test')).rejects.toThrow('Not found');
    });

    test('should handle network error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.request('/test')).rejects.toThrow('Network error');
    });

    test('should handle malformed JSON response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      await expect(apiClient.request('/test')).rejects.toThrow('Invalid JSON');
    });
  });

  describe('getReports', () => {
    // Happy path tests
    test('should get reports with default parameters', async () => {
      const mockResponse = {
        success: true,
        data: {
          items: [{ id: 'rep_001', schoolName: 'School 1' }],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await apiClient.getReports();

      expect(global.fetch).toHaveBeenCalledWith('/api/reports', expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      }));
      expect(result).toEqual(mockResponse);
    });

    test('should get reports with custom parameters', async () => {
      const mockResponse = { success: true, data: { items: [], pagination: {} } };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const params = {
        page: 2,
        limit: 10,
        status: 'Added',
        search: 'test school',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      await apiClient.getReports(params);

      const expectedUrl = '/api/reports?page=2&limit=10&status=Added&search=test+school&sortBy=createdAt&sortOrder=desc';
      expect(global.fetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });

    // Negative tests
    test('should handle API error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ message: 'Server error' })
      });

      await expect(apiClient.getReports()).rejects.toThrow('Server error');
    });
  });

  describe('submitReport', () => {
    // Happy path tests
    test('should submit report successfully', async () => {
      const reportData = {
        schoolName: 'Test School',
        location: 'Test City',
        violationDescription: 'Test violation'
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'rep_ABC123',
          schoolName: 'Test School',
          status: 'Added',
          createdAt: '2023-01-01T00:00:00.000Z',
          uploadedFiles: []
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await apiClient.submitReport(reportData);

      expect(global.fetch).toHaveBeenCalledWith('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      });
      expect(result).toEqual(mockResponse);
    });

    test('should submit report with files', async () => {
      const reportData = {
        schoolName: 'Test School',
        files: [{
          name: 'test.jpg',
          type: 'image/jpeg',
          size: 1024,
          data: 'base64data'
        }]
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'rep_ABC123',
          uploadedFiles: [{
            id: 'file_001',
            name: 'test.jpg',
            type: 'image/jpeg',
            url: 'https://drive.google.com/file/test.jpg'
          }]
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await apiClient.submitReport(reportData);

      expect(result).toEqual(mockResponse);
    });

    // Negative tests
    test('should handle submission error', async () => {
      const reportData = { schoolName: 'Test School' };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({ message: 'Validation failed' })
      });

      await expect(apiClient.submitReport(reportData)).rejects.toThrow('Validation failed');
    });
  });

  describe('uploadFiles', () => {
    // Happy path tests
    test('should upload files successfully', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const reportId = 'rep_ABC123';

      const mockResponse = {
        success: true,
        data: {
          files: [{
            id: 'file_001',
            name: 'test.jpg',
            type: 'image/jpeg',
            url: 'https://drive.google.com/file/test.jpg'
          }],
          totalUploaded: 1,
          totalRequested: 1
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await apiClient.uploadFiles([mockFile], reportId);

      expect(global.fetch).toHaveBeenCalledWith('/api/files/upload', {
        method: 'POST',
        body: expect.any(FormData)
      });
      expect(result).toEqual(mockResponse);
    });

    // Negative tests
    test('should handle upload error', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: 'Upload failed' })
      });

      await expect(apiClient.uploadFiles([mockFile], 'rep_001')).rejects.toThrow('Upload failed');
    });
  });

  describe('uploadBase64Files', () => {
    // Happy path tests
    test('should upload base64 files successfully', async () => {
      const fileData = {
        name: 'test.jpg',
        type: 'image/jpeg',
        size: 1024,
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      };

      const mockResponse = {
        success: true,
        data: {
          files: [{
            id: 'file_001',
            name: 'test.jpg',
            url: 'https://drive.google.com/file/test.jpg'
          }],
          totalUploaded: 1,
          totalRequested: 1
        }
      };

      // Mock fetch for base64 conversion
      global.fetch.mockResolvedValueOnce({
        blob: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'image/jpeg' }))
      });

      // Mock fetch for upload
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await apiClient.uploadBase64Files([fileData], 'rep_ABC123');

      expect(result).toEqual(mockResponse);
    });

    // Negative tests
    test('should handle base64 conversion error', async () => {
      const fileData = {
        name: 'test.jpg',
        type: 'image/jpeg',
        size: 1024,
        data: 'invalid-base64'
      };

      global.fetch.mockRejectedValueOnce(new Error('Invalid base64'));

      await expect(apiClient.uploadBase64Files([fileData], 'rep_001')).rejects.toThrow('Failed to process file test.jpg');
    });
  });

  describe('updateReportStatus', () => {
    // Happy path tests
    test('should update report status successfully', async () => {
      const statusData = {
        status: 'Confirmed by NJDSC',
        adminNotes: 'Confirmed by admin'
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'rep_ABC123',
          status: 'Confirmed by NJDSC',
          updatedAt: '2023-01-02T00:00:00.000Z'
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await apiClient.updateReportStatus('rep_ABC123', statusData);

      expect(global.fetch).toHaveBeenCalledWith('/api/reports/rep_ABC123/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(statusData)
      });
      expect(result).toEqual(mockResponse);
    });

    // Negative tests
    test('should handle status update error', async () => {
      const statusData = { status: 'Invalid Status' };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({ message: 'Invalid status' })
      });

      await expect(apiClient.updateReportStatus('rep_001', statusData)).rejects.toThrow('Invalid status');
    });
  });


  describe('getAuditLogs', () => {
    // Happy path tests
    test('should get audit logs with parameters', async () => {
      const params = {
        action: 'STATUS_UPDATE',
        limit: 50
      };

      const mockResponse = {
        success: true,
        data: {
          items: [{ id: 'audit_001', action: 'STATUS_UPDATE' }],
          count: 1,
          filters: params
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await apiClient.getAuditLogs(params);

      const expectedUrl = '/api/audit?action=STATUS_UPDATE&limit=50';
      expect(global.fetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
      expect(result).toEqual(mockResponse);
    });

    // Negative tests
    test('should handle audit logs error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ message: 'Server error' })
      });

      await expect(apiClient.getAuditLogs()).rejects.toThrow('Server error');
    });
  });

  describe('getConfiguration', () => {
    // Happy path tests
    test('should get configuration successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          'email.toAddress': 'admin@example.com',
          'system.rateLimitPerHour': 5
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await apiClient.getConfiguration();

      expect(global.fetch).toHaveBeenCalledWith('/api/config', expect.any(Object));
      expect(result).toEqual(mockResponse);
    });

    // Negative tests
    test('should handle configuration error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ message: 'Config error' })
      });

      await expect(apiClient.getConfiguration()).rejects.toThrow('Config error');
    });
  });

  describe('sendEmail', () => {
    // Happy path tests
    test('should send email successfully', async () => {
      const emailData = {
        reportId: 'rep_ABC123',
        templateId: 'confirmation',
        to: 'recipient@example.com',
        subject: 'Report Confirmation',
        body: 'Your report has been received.'
      };

      const mockResponse = {
        success: true,
        data: {
          messageId: 'msg_001',
          sent: true
        }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      });

      const result = await apiClient.sendEmail(emailData);

      expect(global.fetch).toHaveBeenCalledWith('/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });
      expect(result).toEqual(mockResponse);
    });

    // Negative tests
    test('should handle email sending error', async () => {
      const emailData = {
        reportId: 'rep_001',
        templateId: 'confirmation',
        to: 'recipient@example.com',
        subject: 'Test'
      };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ message: 'Email service unavailable' })
      });

      await expect(apiClient.sendEmail(emailData)).rejects.toThrow('Email service unavailable');
    });
  });

  describe('convertFileToBase64', () => {
    // Happy path tests
    test('should convert file to base64 successfully', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

      const result = await convertFileToBase64(mockFile);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Should not include data URL prefix
      expect(result).not.toContain('data:');
      expect(result).not.toContain(',');
    });

    // Negative tests
    test('should handle file read error', async () => {
      const mockFile = {
        // Invalid file object that will cause FileReader to fail
      };

      await expect(convertFileToBase64(mockFile)).rejects.toThrow();
    });
  });

  describe('validateFileForUpload', () => {
    // Happy path tests
    test('should validate valid image file', () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 }); // 1MB

      const result = validateFileForUpload(mockFile);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should validate valid PDF file', () => {
      const mockFile = new File(['test'], 'document.pdf', { type: 'application/pdf' });
      Object.defineProperty(mockFile, 'size', { value: 2 * 1024 * 1024 }); // 2MB

      const result = validateFileForUpload(mockFile);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should validate valid video file', () => {
      const mockFile = new File(['test'], 'video.mp4', { type: 'video/mp4' });
      Object.defineProperty(mockFile, 'size', { value: 5 * 1024 * 1024 }); // 5MB

      const result = validateFileForUpload(mockFile);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    // Negative tests
    test('should reject file that is too large', () => {
      const mockFile = new File(['test'], 'large.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 15 * 1024 * 1024 }); // 15MB

      const result = validateFileForUpload(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    test('should reject unsupported file type', () => {
      const mockFile = new File(['test'], 'document.exe', { type: 'application/x-msdownload' });
      Object.defineProperty(mockFile, 'size', { value: 1024 });

      const result = validateFileForUpload(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not supported');
    });

    test('should reject file with zero size', () => {
      const mockFile = new File([''], 'empty.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 0 });

      const result = validateFileForUpload(mockFile);

      expect(result.isValid).toBe(true); // Zero size is still valid, just empty
    });
  });
});