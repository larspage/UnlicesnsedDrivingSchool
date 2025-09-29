/**
 * API Service Tests for NJDSC School Compliance Portal Frontend
 *
 * Tests for frontend API client functionality.
 */

import { apiClient, validateFileForUpload, convertFileToBase64 } from '../../../src/services/api';

// Mock fetch globally
global.fetch = jest.fn();

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('apiClient', () => {
    describe('uploadFiles', () => {
      const mockFiles = [
        new File(['content1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['content2'], 'test2.png', { type: 'image/png' })
      ];

      it('should upload files successfully', async () => {
        const mockResponse = {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              files: [
                {
                  id: 'file_abc123',
                  name: 'test1.jpg',
                  type: 'image/jpeg',
                  size: 7,
                  url: 'https://example.com/file1',
                  uploadedAt: '2024-01-01T00:00:00Z'
                }
              ],
              totalUploaded: 1,
              totalRequested: 1
            }
          })
        };

        fetch.mockResolvedValue(mockResponse);

        const result = await apiClient.uploadFiles(mockFiles, 'rep_xyz789');

        expect(fetch).toHaveBeenCalledWith('/api/files/upload', {
          method: 'POST',
          body: expect.any(FormData)
        });
        expect(result.success).toBe(true);
        expect(result.data.files).toHaveLength(1);
      });

      it('should handle upload errors', async () => {
        const mockResponse = {
          ok: false,
          status: 400,
          json: async () => ({
            error: 'Invalid report ID'
          })
        };

        fetch.mockResolvedValue(mockResponse);

        await expect(apiClient.uploadFiles(mockFiles, 'invalid_report_id'))
          .rejects.toThrow('Invalid report ID');
      });

      it('should handle network errors', async () => {
        fetch.mockRejectedValue(new Error('Network error'));

        await expect(apiClient.uploadFiles(mockFiles, 'rep_xyz789'))
          .rejects.toThrow('Network error');
      });
    });

    describe('uploadBase64Files', () => {
      const mockFileData = [
        {
          name: 'test1.jpg',
          type: 'image/jpeg',
          size: 100,
          data: 'base64data123'
        }
      ];

      it('should upload base64 files successfully', async () => {
        const mockResponse = {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              files: [
                {
                  id: 'file_abc123',
                  name: 'test1.jpg',
                  type: 'image/jpeg',
                  size: 100,
                  url: 'https://example.com/file1',
                  uploadedAt: '2024-01-01T00:00:00Z'
                }
              ],
              totalUploaded: 1,
              totalRequested: 1
            }
          })
        };

        // Mock fetch for blob conversion
        global.fetch = jest.fn()
          .mockResolvedValueOnce({
            blob: async () => new Blob(['content'], { type: 'image/jpeg' })
          })
          .mockResolvedValueOnce(mockResponse);

        const result = await apiClient.uploadBase64Files(mockFileData, 'rep_xyz789');

        expect(result.success).toBe(true);
        expect(result.data.files).toHaveLength(1);
      });

      it('should handle base64 processing errors', async () => {
        const invalidFileData = [
          {
            name: 'test1.jpg',
            type: 'image/jpeg',
            size: 100,
            data: 'invalid_base64_data'
          }
        ];

        // Mock fetch to fail blob conversion
        global.fetch = jest.fn().mockRejectedValue(new Error('Invalid base64'));

        await expect(apiClient.uploadBase64Files(invalidFileData, 'rep_xyz789'))
          .rejects.toThrow('Failed to process file test1.jpg');
      });
    });

    describe('getFile', () => {
      it('should get file by ID successfully', async () => {
        const mockResponse = {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'file_abc123',
              name: 'test.jpg',
              type: 'image/jpeg',
              url: 'https://example.com/file1'
            }
          })
        };

        fetch.mockResolvedValue(mockResponse);

        const result = await apiClient.getFile('file_abc123');

        expect(fetch).toHaveBeenCalledWith('/api/files/file_abc123', {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        expect(result.success).toBe(true);
        expect(result.data.id).toBe('file_abc123');
      });
    });

    describe('getFilesByReportId', () => {
      it('should get files by report ID successfully', async () => {
        const mockResponse = {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              files: [
                {
                  id: 'file_abc123',
                  name: 'test.jpg',
                  type: 'image/jpeg'
                }
              ],
              total: 1
            }
          })
        };

        fetch.mockResolvedValue(mockResponse);

        const result = await apiClient.getFilesByReportId('rep_xyz789');

        expect(fetch).toHaveBeenCalledWith('/api/files/report/rep_xyz789', {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        expect(result.success).toBe(true);
        expect(result.data.files).toHaveLength(1);
      });
    });

    describe('updateFileStatus', () => {
      it('should update file status successfully', async () => {
        const mockResponse = {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'file_abc123',
              processingStatus: 'completed'
            }
          })
        };

        fetch.mockResolvedValue(mockResponse);

        const result = await apiClient.updateFileStatus('file_abc123', 'completed');

        expect(fetch).toHaveBeenCalledWith('/api/files/file_abc123/status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'completed' })
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('validateFileForUpload', () => {
    it('should validate correct file', () => {
      const mockFile = new File(['content'], 'test.jpg', {
        type: 'image/jpeg',
        size: 1024
      });

      const result = validateFileForUpload(mockFile);

      expect(result.isValid).toBe(true);
    });

    it('should reject oversized file', () => {
      const mockFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg'
      });

      const result = validateFileForUpload(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should reject unsupported file type', () => {
      const mockFile = new File(['content'], 'test.exe', {
        type: 'application/x-msdownload'
      });

      const result = validateFileForUpload(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not supported');
    });
  });

  describe('convertFileToBase64', () => {
    it('should convert file to base64', async () => {
      const mockFile = new File(['Hello World'], 'test.txt', { type: 'text/plain' });

      // Mock FileReader
      const mockReader = {
        onload: null,
        onerror: null,
        result: 'data:text/plain;base64,SGVsbG8gV29ybGQ=',
        readAsDataURL: function() {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: this.result } });
            }
          }, 0);
        }
      };

      global.FileReader = jest.fn(() => mockReader);

      const result = await convertFileToBase64(mockFile);

      expect(result).toBe('SGVsbG8gV29ybGQ=');
    });

    it('should handle FileReader errors', async () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      // Mock FileReader with error
      const mockReader = {
        onload: null,
        onerror: null,
        readAsDataURL: function() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error('Read failed'));
            }
          }, 0);
        }
      };

      global.FileReader = jest.fn(() => mockReader);

      await expect(convertFileToBase64(mockFile)).rejects.toThrow('Read failed');
    });
  });
});