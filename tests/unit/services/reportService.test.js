/**
 * Unit Tests for Report Service
 *
 * Tests all functions in reportService.js with happy path, regular, and negative testing.
 */

const reportService = require('../../../server/services/reportService');
const Report = require('../../../server/models/Report');
const localJsonService = require('../../../server/services/localJsonService');

// Mock dependencies
jest.mock('../../../server/services/localJsonService');
jest.mock('../../../server/services/configService');

describe('Report Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any existing data in the JSON files for clean tests
    localJsonService.writeJsonFile = jest.fn().mockResolvedValue();
  });

  describe('createReport', () => {
    // Happy path tests
    test('should create a report successfully', async () => {
      const mockReportData = {
        schoolName: 'Test Driving School',
        location: 'Test City',
        violationDescription: 'Test violation'
      };
      const mockReporterIp = '192.168.1.1';

      const mockExistingReports = [];
      const mockReport = new Report({
        id: 'rep_ABC123',
        schoolName: 'Test Driving School',
        status: 'Added',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastReported: new Date().toISOString(),
        reporterIp: mockReporterIp
      });

      // Mock getAllReports to return empty array (no duplicates)
      localJsonService.getAllRows.mockResolvedValue(mockExistingReports);
      // Mock appendRow to succeed
      localJsonService.appendRow.mockResolvedValue();

      const result = await reportService.createReport(mockReportData, mockReporterIp);

      expect(result).toBeInstanceOf(Report);
      expect(result.schoolName).toBe('Test Driving School');
      expect(result.status).toBe('Added');
      expect(localJsonService.getAllRows).toHaveBeenCalledWith(null, 'reports');
      expect(localJsonService.appendRow).toHaveBeenCalledWith(null, 'reports', expect.any(Object));
    });

    // Negative tests
    test('should throw error for missing school name', async () => {
      // Mock console.error to prevent CI from treating error logs as failures
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const mockReportData = {
        location: 'Test City'
        // missing schoolName - this should cause validation to fail
      };

      await expect(reportService.createReport(mockReportData)).rejects.toThrow('Report validation failed');
      // The Report model validation requires schoolName, so this should fail

      console.error = originalConsoleError;
    });

    test('should throw error for duplicate school name', async () => {
      // Mock console.error to prevent CI from treating error logs as failures
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const mockReportData = {
        schoolName: 'Existing School',
        location: 'Test City'
      };

      const mockExistingReports = [
        new Report({
          id: 'rep_XYZ999',
          schoolName: 'Existing School',
          status: 'Added',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastReported: new Date().toISOString()
        })
      ];

      localJsonService.getAllRows.mockResolvedValue(mockExistingReports);

      await expect(reportService.createReport(mockReportData)).rejects.toThrow('Duplicate report found');

      console.error = originalConsoleError;
    });

    test('should handle Google Sheets API errors', async () => {
      // Mock console.error to prevent CI from treating error logs as failures
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const mockReportData = {
        schoolName: 'Test School',
        location: 'Test City'
      };

      localJsonService.getAllRows.mockRejectedValue(new Error('Google Sheets API error'));

      await expect(reportService.createReport(mockReportData)).rejects.toThrow('Google Sheets API error');

      console.error = originalConsoleError;
    });
  });

  describe('getReports', () => {
    // Happy path tests
    test('should return paginated reports successfully', async () => {
      const mockReports = [
        new Report({
          id: 'rep_0001AB',
          schoolName: 'School 1',
          status: 'Added',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          lastReported: '2023-01-01T00:00:00.000Z'
        }),
        new Report({
          id: 'rep_0002AB',
          schoolName: 'School 2',
          status: 'Closed',
          createdAt: '2023-01-02T00:00:00.000Z',
          updatedAt: '2023-01-02T00:00:00.000Z',
          lastReported: '2023-01-02T00:00:00.000Z'
        })
      ];

      localJsonService.getAllRows.mockResolvedValue(mockReports);

      const options = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      const result = await reportService.getReports(options);

      expect(result.items).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(false);
    });

    test('should filter reports by status', async () => {
      const mockReports = [
        new Report({
          id: 'rep_0001AB',
          schoolName: 'School 1',
          status: 'Added',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          lastReported: '2023-01-01T00:00:00.000Z'
        }),
        new Report({
          id: 'rep_0002AB',
          schoolName: 'School 2',
          status: 'Closed',
          createdAt: '2023-01-02T00:00:00.000Z',
          updatedAt: '2023-01-02T00:00:00.000Z',
          lastReported: '2023-01-02T00:00:00.000Z'
        })
      ];

      localJsonService.getAllRows.mockResolvedValue(mockReports);

      const result = await reportService.getReports({ status: 'Added' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe('Added');
    });

    test('should filter reports by search term', async () => {
      const mockReports = [
        new Report({
          id: 'rep_0001AB',
          schoolName: 'ABC Driving School',
          status: 'Added',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          lastReported: '2023-01-01T00:00:00.000Z'
        }),
        new Report({
          id: 'rep_0002AB',
          schoolName: 'XYZ Driving School',
          status: 'Added',
          createdAt: '2023-01-02T00:00:00.000Z',
          updatedAt: '2023-01-02T00:00:00.000Z',
          lastReported: '2023-01-02T00:00:00.000Z'
        })
      ];

      localJsonService.getAllRows.mockResolvedValue(mockReports);

      const result = await reportService.getReports({ search: 'ABC' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].schoolName).toBe('ABC Driving School');
    });

    test('should sort reports correctly', async () => {
      const mockReports = [
        new Report({
          id: 'rep_0001AB',
          schoolName: 'School A',
          status: 'Added',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          lastReported: '2023-01-01T00:00:00.000Z'
        }),
        new Report({
          id: 'rep_GHI789',
          schoolName: 'School B',
          status: 'Added',
          createdAt: '2023-01-02T00:00:00.000Z',
          updatedAt: '2023-01-02T00:00:00.000Z',
          lastReported: '2023-01-02T00:00:00.000Z'
        })
      ];

      localJsonService.getAllRows.mockResolvedValue(mockReports);

      // Test descending order (default)
      const resultDesc = await reportService.getReports({
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      expect(resultDesc.items[0].createdAt).toBe('2023-01-02T00:00:00.000Z');
      expect(resultDesc.items[1].createdAt).toBe('2023-01-01T00:00:00.000Z');

      // Test ascending order
      const resultAsc = await reportService.getReports({
        sortBy: 'createdAt',
        sortOrder: 'asc'
      });

      expect(resultAsc.items[0].createdAt).toBe('2023-01-01T00:00:00.000Z');
      expect(resultAsc.items[1].createdAt).toBe('2023-01-02T00:00:00.000Z');
    });

    test('should handle pagination correctly', async () => {
      const mockReports = Array.from({ length: 25 }, (_, i) =>
        new Report({
          id: `rep_${String(i).padStart(6, '0')}`,
          schoolName: `School ${i}`,
          status: 'Added',
          createdAt: new Date(2023, 0, i + 1).toISOString(),
          updatedAt: new Date(2023, 0, i + 1).toISOString(),
          lastReported: new Date(2023, 0, i + 1).toISOString()
        })
      );

      localJsonService.getAllRows.mockResolvedValue(mockReports);

      // Test page 1
      const result1 = await reportService.getReports({ page: 1, limit: 10 });
      expect(result1.items).toHaveLength(10);
      expect(result1.pagination.page).toBe(1);
      expect(result1.pagination.totalPages).toBe(3);
      expect(result1.pagination.hasNext).toBe(true);

      // Test page 2
      const result2 = await reportService.getReports({ page: 2, limit: 10 });
      expect(result2.items).toHaveLength(10);
      expect(result2.pagination.page).toBe(2);
      expect(result2.pagination.hasNext).toBe(true);

      // Test page 3
      const result3 = await reportService.getReports({ page: 3, limit: 10 });
      expect(result3.items).toHaveLength(5);
      expect(result3.pagination.page).toBe(3);
      expect(result3.pagination.hasNext).toBe(false);
    });

    // Negative tests
    test('should handle Google Sheets API errors', async () => {
      // Mock console.error to prevent CI from treating error logs as failures
      const originalConsoleError = console.error;
      console.error = jest.fn();

      localJsonService.getAllRows.mockRejectedValue(new Error('API Error'));

      await expect(reportService.getReports()).rejects.toThrow('API Error');

      console.error = originalConsoleError;
    });

    test('should remove sensitive fields for public access', async () => {
      const mockReport = new Report({
        id: 'rep_DEF456',
        schoolName: 'Test School',
        status: 'Added',
        reporterIp: '192.168.1.1',
        adminNotes: 'Admin note',
        mvcReferenceNumber: 'MVC123',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        lastReported: '2023-01-01T00:00:00.000Z'
      });

      localJsonService.getAllRows.mockResolvedValue([mockReport]);

      const result = await reportService.getReports();

      expect(result.items[0].reporterIp).toBeUndefined();
      expect(result.items[0].adminNotes).toBeUndefined();
      expect(result.items[0].mvcReferenceNumber).toBeUndefined();
      expect(result.items[0].schoolName).toBe('Test School'); // Public fields should remain
    });
  });

  describe('getReportById', () => {
    // Happy path tests
    test('should return report by ID successfully', async () => {
      const mockReport = new Report({
        id: 'rep_ABC123',
        schoolName: 'Test School',
        status: 'Added',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        lastReported: '2023-01-01T00:00:00.000Z'
      });

      localJsonService.getAllRows.mockResolvedValue([mockReport]);

      const result = await reportService.getReportById('rep_ABC123');

      expect(result).toBeTruthy();
      expect(result.id).toBe('rep_ABC123');
      expect(result.schoolName).toBe('Test School');
    });

    test('should return report with admin fields when requested', async () => {
      const mockReport = new Report({
        id: 'rep_ABC123',
        schoolName: 'Test School',
        status: 'Added',
        reporterIp: '192.168.1.1',
        adminNotes: 'Admin note',
        mvcReferenceNumber: 'MVC123',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        lastReported: '2023-01-01T00:00:00.000Z'
      });

      localJsonService.getAllRows.mockResolvedValue([mockReport]);

      const result = await reportService.getReportById('rep_ABC123', true);

      expect(result.reporterIp).toBe('192.168.1.1');
      expect(result.adminNotes).toBe('Admin note');
      expect(result.mvcReferenceNumber).toBe('MVC123');
    });

    // Negative tests
    test('should return null for non-existent report', async () => {
      // Mock console.error to prevent CI from treating error logs as failures
      const originalConsoleError = console.error;
      console.error = jest.fn();

      localJsonService.getAllRows.mockResolvedValue([]);

      const result = await reportService.getReportById('rep_nonexistent');

      expect(result).toBeNull();

      console.error = originalConsoleError;
    });

    test('should handle Google Sheets API errors', async () => {
      // Mock console.error to prevent CI from treating error logs as failures
      const originalConsoleError = console.error;
      console.error = jest.fn();

      localJsonService.getAllRows.mockRejectedValue(new Error('API Error'));

      await expect(reportService.getReportById('rep_test')).rejects.toThrow('API Error');

      console.error = originalConsoleError;
    });
  });

  describe('updateReportStatus', () => {
    // Happy path tests
    test('should update report status successfully', async () => {
      const mockExistingReport = new Report({
        id: 'rep_ABC123',
        schoolName: 'Test School',
        status: 'Added',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        lastReported: '2023-01-01T00:00:00.000Z'
      });

      const mockUpdatedReport = new Report({
        id: 'rep_ABC123',
        schoolName: 'Test School',
        status: 'Confirmed by NJDSC',
        adminNotes: 'Confirmed by admin',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString(),
        lastReported: '2023-01-01T00:00:00.000Z'
      });

      localJsonService.getAllRows.mockResolvedValue([mockExistingReport]);
      localJsonService.updateRow.mockResolvedValue({ success: true });

      const updateData = {
        status: 'Confirmed by NJDSC',
        adminNotes: 'Confirmed by admin'
      };

      const result = await reportService.updateReportStatus('rep_ABC123', updateData);

      expect(result.status).toBe('Confirmed by NJDSC');
      expect(result.adminNotes).toBe('Confirmed by admin');
      expect(localJsonService.updateRow).toHaveBeenCalledWith(null, 'reports', 'rep_ABC123', expect.any(Object));
    });

    // Negative tests
    test('should throw error for non-existent report', async () => {
      // Mock console.error to prevent CI from treating error logs as failures
      const originalConsoleError = console.error;
      console.error = jest.fn();

      localJsonService.getAllRows.mockResolvedValue([]);

      const updateData = {
        status: 'Confirmed by NJDSC'
      };

      await expect(reportService.updateReportStatus('rep_nonexistent', updateData))
        .rejects.toThrow('Report with ID rep_nonexistent not found');

      console.error = originalConsoleError;
    });

    test('should throw error for invalid status', async () => {
      // Mock console.error to prevent CI from treating error logs as failures
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const mockReport = new Report({
        id: 'rep_ABC123',
        schoolName: 'Test School',
        status: 'Added',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        lastReported: '2023-01-01T00:00:00.000Z'
      });

      localJsonService.getAllRows.mockResolvedValue([mockReport]);

      const updateData = {
        status: 'Invalid Status' // Invalid status should cause validation error
      };

      await expect(reportService.updateReportStatus('rep_ABC123', updateData))
        .rejects.toThrow('Report validation failed');
      // The Report model validation requires status to be one of the valid enum values

      console.error = originalConsoleError;
    });

    test('should handle Google Sheets API errors', async () => {
      // Mock console.error to prevent CI from treating error logs as failures
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const mockReport = new Report({
        id: 'rep_ABC123',
        schoolName: 'Test School',
        status: 'Added',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        lastReported: '2023-01-01T00:00:00.000Z'
      });

      localJsonService.getAllRows.mockResolvedValue([mockReport]);
      localJsonService.updateRow.mockRejectedValue(new Error('Update failed'));

      const updateData = {
        status: 'Confirmed by NJDSC'
      };

      await expect(reportService.updateReportStatus('rep_ABC123', updateData))
        .rejects.toThrow('Update failed');

      console.error = originalConsoleError;
    });
  });

  describe('getAllReports', () => {
    // Happy path tests
    test('should return all reports successfully', async () => {
      const mockReports = [
        new Report({
          id: 'rep_0001AB',
          schoolName: 'School 1',
          status: 'Added',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          lastReported: '2023-01-01T00:00:00.000Z'
        }),
        new Report({
          id: 'rep_0002AB',
          schoolName: 'School 2',
          status: 'Closed',
          createdAt: '2023-01-02T00:00:00.000Z',
          updatedAt: '2023-01-02T00:00:00.000Z',
          lastReported: '2023-01-02T00:00:00.000Z'
        })
      ];

      localJsonService.getAllRows.mockResolvedValue(mockReports);

      const result = await reportService.getAllReports();

      expect(result).toHaveLength(2);
      expect(result[0].schoolName).toBe('School 1');
      expect(result[1].schoolName).toBe('School 2');
      expect(localJsonService.getAllRows).toHaveBeenCalledWith(null, 'reports');
    });

    // Negative tests
    test('should handle Google Sheets API errors', async () => {
      // Mock console.error to prevent CI from treating error logs as failures
      const originalConsoleError = console.error;
      console.error = jest.fn();

      localJsonService.getAllRows.mockRejectedValue(new Error('API Error'));

      await expect(reportService.getAllReports()).rejects.toThrow('API Error');

      console.error = originalConsoleError;
    });
  });

  describe('checkRateLimit', () => {
    // Happy path tests
    test('should return false when under rate limit', async () => {
      const mockReporterIp = '192.168.1.1';
      const mockRecentReports = [
        new Report({
          id: 'rep_0001AB',
          schoolName: 'School 1',
          status: 'Added',
          reporterIp: mockReporterIp,
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          lastReported: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        })
      ];

      localJsonService.getAllRows.mockResolvedValue(mockRecentReports);

      const result = await reportService.checkRateLimit(mockReporterIp);

      expect(result).toBe(false); // Should not be rate limited
    });

    test('should return true when over rate limit', async () => {
      const mockReporterIp = '192.168.1.1';
      const now = new Date();

      // Create 6 reports within the last hour (exceeding limit of 5)
      const mockRecentReports = Array.from({ length: 6 }, (_, i) =>
        new Report({
          id: `rep_${String(i).padStart(6, '0')}`,
          schoolName: `School ${i}`,
          status: 'Added',
          reporterIp: mockReporterIp,
          createdAt: new Date(now.getTime() - (i * 10 * 60 * 1000)).toISOString(), // Within last hour
          updatedAt: new Date(now.getTime() - (i * 10 * 60 * 1000)).toISOString(),
          lastReported: new Date(now.getTime() - (i * 10 * 60 * 1000)).toISOString()
        })
      );

      localJsonService.getAllRows.mockResolvedValue(mockRecentReports);

      const result = await reportService.checkRateLimit(mockReporterIp);

      expect(result).toBe(true); // Should be rate limited
    });

    // Negative tests
    test('should return false when Google Sheets API fails', async () => {
      // Mock console.error to prevent CI from treating error logs as failures
      const originalConsoleError = console.error;
      console.error = jest.fn();

      localJsonService.getAllRows.mockRejectedValue(new Error('API Error'));

      const result = await reportService.checkRateLimit('192.168.1.1');

      expect(result).toBe(false); // Should allow submission if check fails

      console.error = originalConsoleError;
    });

    test('should handle empty reports array', async () => {
      localJsonService.getAllRows.mockResolvedValue([]);

      const result = await reportService.checkRateLimit('192.168.1.1');

      expect(result).toBe(false); // Should not be rate limited
    });
  });

});