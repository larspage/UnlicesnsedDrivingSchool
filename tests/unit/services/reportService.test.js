/**
 * Unit Tests for Report Service - IMPROVED VERSION
 * 
 * This version follows the philosophy that negative tests should verify:
 * 1. That an error occurred (success: false)
 * 2. That meaningful error information is present
 * 3. NOT which specific error code was returned
 * 
 * This makes tests more resilient to implementation changes.
 */

const reportService = require('../../../server/services/reportService');
const Report = require('../../../server/models/Report');
const localJsonService = require('../../../server/services/localJsonService');
const { isSuccess, isFailure } = require('../../../server/utils/result');

// Mock dependencies
jest.mock('../../../server/services/localJsonService');
jest.mock('../../../server/services/configService');

describe('Report Service - Improved Testing Philosophy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any existing data in the JSON files for clean tests
    localJsonService.writeJsonFile = jest.fn().mockResolvedValue();
  });

  describe('createReport', () => {
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
      localJsonService.getAllRows.mockResolvedValue({ success: true, data: mockExistingReports, error: null });
      // Mock appendRow to succeed
      localJsonService.appendRow.mockResolvedValue({ success: true, data: mockReport, error: null });

      const result = await reportService.createReport(mockReportData, mockReporterIp);

      // ✅ IMPROVED PATTERN: Check Result object for success
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Report);
      expect(result.data.schoolName).toBe('Test Driving School');
      expect(result.data.status).toBe('Added');
      expect(result.error).toBeNull();
      expect(localJsonService.getAllRows).toHaveBeenCalledWith(null, 'reports');
      expect(localJsonService.appendRow).toHaveBeenCalledWith(null, 'reports', expect.any(Object));
    });

    test('should return validation error for missing required fields - focus on error behavior, not codes', async () => {
      const mockReportData = {
        location: 'Test City'
        // missing schoolName - this should cause validation to fail
      };

      const result = await reportService.createReport(mockReportData);

      // ✅ IMPROVED PATTERN: Check for error behavior, not specific codes
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('School name is required');
      // Don't check specific error code
    });

    test('should update existing report for duplicate school name', async () => {
      const mockReportData = {
        schoolName: 'Existing School',
        location: 'Test City',
        violationDescription: 'Updated violation description'
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

      const mockUpdatedReport = new Report({
        id: 'rep_XYZ999',
        schoolName: 'Existing School',
        status: 'Added',
        updatedAt: new Date().toISOString(),
        lastReported: new Date().toISOString(),
        violationDescription: 'Updated violation description'
      });

      localJsonService.getAllRows.mockResolvedValue({ success: true, data: mockExistingReports, error: null });
      localJsonService.updateRow.mockResolvedValue({ success: true, data: mockUpdatedReport, error: null });

      const result = await reportService.createReport(mockReportData);

      // ✅ IMPROVED PATTERN: Check Result object for success
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Report);
      expect(result.data.schoolName).toBe('Existing School');
      expect(result.data.violationDescription).toContain('Updated violation description');
      expect(localJsonService.updateRow).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });

    test('should handle storage errors - focus on error occurrence', async () => {
      const mockReportData = {
        schoolName: 'Test School',
        location: 'Test City'
      };

      // Mock storage failure
      localJsonService.getAllRows.mockResolvedValue({
        success: false,
        data: null,
        error: {
          message: 'Storage error',
          innerError: new Error('Storage error')
        }
      });

      const result = await reportService.createReport(mockReportData);

      // ✅ IMPROVED PATTERN: Focus on error behavior, not specific codes
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Storage');
      // Don't check specific error code
    });
  });

  describe('getReports', () => {
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

      localJsonService.getAllRows.mockResolvedValue({ success: true, data: mockReports, error: null });

      const options = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      const result = await reportService.getReports(options);

      // ✅ IMPROVED PATTERN: Check Result object for success
      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(2);
      expect(result.data.pagination.page).toBe(1);
      expect(result.data.pagination.limit).toBe(10);
      expect(result.data.pagination.total).toBe(2);
      expect(result.data.pagination.totalPages).toBe(1);
      expect(result.data.pagination.hasNext).toBe(false);
      expect(result.data.pagination.hasPrev).toBe(false);
      expect(result.error).toBeNull();
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

      localJsonService.getAllRows.mockResolvedValue({ success: true, data: mockReports, error: null });

      const result = await reportService.getReports({ status: 'Added' });

      // ✅ IMPROVED PATTERN: Check Result object for success
      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].status).toBe('Added');
      expect(result.error).toBeNull();
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

      localJsonService.getAllRows.mockResolvedValue({ success: true, data: mockReports, error: null });

      const result = await reportService.getReports({ search: 'ABC' });

      // ✅ IMPROVED PATTERN: Check Result object for success
      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].schoolName).toBe('ABC Driving School');
      expect(result.error).toBeNull();
    });

    test('should handle storage errors in getReports - focus on error occurrence', async () => {
      localJsonService.getAllRows.mockResolvedValue({
        success: false,
        data: null,
        error: {
          message: 'Storage error',
          innerError: new Error('Storage error')
        }
      });

      const result = await reportService.getReports();

      // ✅ IMPROVED PATTERN: Focus on error behavior, not specific codes
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Storage');
      // Don't check specific error code
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

      localJsonService.getAllRows.mockResolvedValue({ success: true, data: [mockReport], error: null });

      const result = await reportService.getReports();

      // ✅ IMPROVED PATTERN: Check Result object for success
      expect(result.success).toBe(true);
      expect(result.data.items[0].reporterIp).toBeUndefined();
      expect(result.data.items[0].adminNotes).toBeUndefined();
      expect(result.data.items[0].mvcReferenceNumber).toBeUndefined();
      expect(result.data.items[0].schoolName).toBe('Test School'); // Public fields should remain
      expect(result.error).toBeNull();
    });
  });

  describe('getReportById', () => {
    test('should return report by ID successfully', async () => {
      const mockReport = new Report({
        id: 'rep_ABC123',
        schoolName: 'Test School',
        status: 'Added',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        lastReported: '2023-01-01T00:00:00.000Z'
      });

      localJsonService.getAllRows.mockResolvedValue({ success: true, data: [mockReport], error: null });

      const result = await reportService.getReportById('rep_ABC123');

      // ✅ IMPROVED PATTERN: Check Result object for success
      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();
      expect(result.data.id).toBe('rep_ABC123');
      expect(result.data.schoolName).toBe('Test School');
      expect(result.error).toBeNull();
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

      localJsonService.getAllRows.mockResolvedValue({ success: true, data: [mockReport], error: null });

      const result = await reportService.getReportById('rep_ABC123', true);

      // ✅ IMPROVED PATTERN: Check Result object for success
      expect(result.success).toBe(true);
      expect(result.data.reporterIp).toBe('192.168.1.1');
      expect(result.data.adminNotes).toBe('Admin note');
      expect(result.data.mvcReferenceNumber).toBe('MVC123');
      expect(result.error).toBeNull();
    });

    test('should return error for non-existent report - focus on error behavior, not codes', async () => {
      localJsonService.getAllRows.mockResolvedValue({ success: true, data: [], error: null });

      const result = await reportService.getReportById('rep_nonexistent');

      // ✅ IMPROVED PATTERN: Focus on error behavior, not specific codes
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      // Don't check specific error message content
    });

    test('should handle storage errors in getReportById - focus on error occurrence', async () => {
      localJsonService.getAllRows.mockResolvedValue({
        success: false,
        data: null,
        error: {
          message: 'Storage error',
          innerError: new Error('Storage error')
        }
      });

      const result = await reportService.getReportById('rep_test');

      // ✅ IMPROVED PATTERN: Focus on error behavior, not specific codes
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Storage');
      // Don't check specific error code
    });
  });

  describe('getAllReports', () => {
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

      localJsonService.getAllRows.mockResolvedValue({ success: true, data: mockReports, error: null });

      const result = await reportService.getAllReports();

      // ✅ IMPROVED PATTERN: Check Result object for success
      expect(isSuccess(result)).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].schoolName).toBe('School 1');
      expect(result.data[1].schoolName).toBe('School 2');
      expect(result.error).toBeNull();
      expect(localJsonService.getAllRows).toHaveBeenCalledWith(null, 'reports');
    });

    test('should handle storage errors in getAllReports - focus on error occurrence', async () => {
      localJsonService.getAllRows.mockResolvedValue({
        success: false,
        data: null,
        error: {
          message: 'Storage error',
          innerError: new Error('Storage error')
        }
      });

      const result = await reportService.getAllReports();

      // ✅ IMPROVED PATTERN: Focus on error behavior, not specific codes
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Storage');
      // Don't check specific error code
    });
  });
});