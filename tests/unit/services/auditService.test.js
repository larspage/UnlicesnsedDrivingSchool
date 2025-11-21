const auditService = require('../../../server/services/auditService');

// Mock the localJsonService dependency
jest.mock('../../../server/services/localJsonService', () => ({
  getAllRows: jest.fn(),
  appendRow: jest.fn()
}));

const localJsonService = require('../../../server/services/localJsonService');

describe('Audit Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache before each test
    auditService.clearCache();
  });

  describe('createAuditLog', () => {
    it('should create a valid audit log entry', async () => {
      const entryData = {
        action: 'STATUS_UPDATE',
        adminUser: 'admin@example.com',
        targetType: 'report',
        targetId: 'rep_123',
        details: 'Status changed to Confirmed',
        ipAddress: '192.168.1.1',
        changes: { status: { old: 'Added', new: 'Confirmed' } },
        metadata: { eventType: 'report_management' }
      };

      localJsonService.appendRow.mockResolvedValue();

      const result = await auditService.createAuditLog(entryData);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        action: 'STATUS_UPDATE',
        adminUser: 'admin@example.com',
        targetType: 'report',
        targetId: 'rep_123',
        details: 'Status changed to Confirmed',
        ipAddress: '192.168.1.1',
        changes: { status: { old: 'Added', new: 'Confirmed' } },
        metadata: { eventType: 'report_management' }
      });
      expect(result.data.id).toMatch(/^audit_\d+_[a-z0-9]+$/);
      expect(result.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(localJsonService.appendRow).toHaveBeenCalledWith(null, 'audit', expect.any(Object));
    });

    it('should return validation error for missing required fields', async () => {
      const result = await auditService.createAuditLog({});

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Missing required audit log fields');
    });

    it('should use default values for optional fields', async () => {
      const entryData = {
        action: 'LOGIN',
        targetType: 'system',
        details: 'User logged in'
      };

      localJsonService.appendRow.mockResolvedValue();

      const result = await auditService.createAuditLog(entryData);

      expect(result.success).toBe(true);
      expect(result.data.adminUser).toBe('system');
      expect(result.data.ipAddress).toBe('127.0.0.1');
      expect(result.data.changes).toBeNull();
      expect(result.data.metadata).toBeNull();
    });
  });

  describe('getAuditLogs', () => {
    it('should return cached logs when available and no filters', async () => {
      const mockLogs = [{ id: '1', action: 'LOGIN' }];
      auditService.setCachedAuditLogs(mockLogs);

      const result = await auditService.getAuditLogs();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockLogs);
      expect(localJsonService.getAllRows).not.toHaveBeenCalled();
    });

    it('should fetch from JSON when cache is empty', async () => {
      const mockLogs = [
        { id: '1', action: 'LOGIN', timestamp: '2025-01-01T00:00:00Z' },
        { id: '2', action: 'LOGOUT', timestamp: '2025-01-02T00:00:00Z' }
      ];
      localJsonService.getAllRows.mockResolvedValue(mockLogs);

      const result = await auditService.getAuditLogs();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockLogs);
      expect(localJsonService.getAllRows).toHaveBeenCalledWith(null, 'audit');
    });

    it('should filter by action', async () => {
      const mockLogs = [
        { id: '1', action: 'LOGIN', timestamp: '2025-01-01T00:00:00Z' },
        { id: '2', action: 'STATUS_UPDATE', timestamp: '2025-01-02T00:00:00Z' },
        { id: '3', action: 'LOGIN', timestamp: '2025-01-03T00:00:00Z' }
      ];
      localJsonService.getAllRows.mockResolvedValue({ success: true, data: mockLogs, error: null });

      const result = await auditService.getAuditLogs({ action: 'LOGIN' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data.every(log => log.action === 'LOGIN')).toBe(true);
    });

    it('should filter by admin user (case insensitive)', async () => {
      const mockLogs = [
        { id: '1', adminUser: 'admin@example.com', timestamp: '2025-01-01T00:00:00Z' },
        { id: '2', adminUser: 'user@example.com', timestamp: '2025-01-02T00:00:00Z' }
      ];
      localJsonService.getAllRows.mockResolvedValue({ success: true, data: mockLogs, error: null });

      const result = await auditService.getAuditLogs({ adminUser: 'ADMIN' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].adminUser).toBe('admin@example.com');
    });

    it('should filter by target type', async () => {
      const mockLogs = [
        { id: '1', targetType: 'report', timestamp: '2025-01-01T00:00:00Z' },
        { id: '2', targetType: 'config', timestamp: '2025-01-02T00:00:00Z' }
      ];
      localJsonService.getAllRows.mockResolvedValue({ success: true, data: mockLogs, error: null });

      const result = await auditService.getAuditLogs({ targetType: 'report' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].targetType).toBe('report');
    });

    it('should filter by date range', async () => {
      const mockLogs = [
        { id: '1', timestamp: '2025-01-01T00:00:00Z' },
        { id: '2', timestamp: '2025-01-15T00:00:00Z' },
        { id: '3', timestamp: '2025-01-31T00:00:00Z' }
      ];
      localJsonService.getAllRows.mockResolvedValue({ success: true, data: mockLogs, error: null });

      const result = await auditService.getAuditLogs({
        dateFrom: '2025-01-10T00:00:00Z',
        dateTo: '2025-01-20T00:00:00Z'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('2');
    });

    it('should search by term in details, admin user, and target ID', async () => {
      const mockLogs = [
        { id: '1', details: 'Status changed', adminUser: 'admin1', targetId: 'rep_123' },
        { id: '2', details: 'Login successful', adminUser: 'admin2', targetId: 'rep_456' },
        { id: '3', details: 'Password changed', adminUser: 'user1', targetId: 'rep_789' }
      ];
      localJsonService.getAllRows.mockResolvedValue({ success: true, data: mockLogs, error: null });

      const result = await auditService.getAuditLogs({ searchTerm: 'admin' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data.map(log => log.id)).toEqual(['1', '2']);
    });

    it('should apply limit', async () => {
      const mockLogs = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        timestamp: `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`
      }));
      localJsonService.getAllRows.mockResolvedValue(mockLogs);

      const result = await auditService.getAuditLogs({ limit: 3 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    it('should sort by timestamp descending', async () => {
      const mockLogs = [
        { id: '1', timestamp: '2025-01-01T00:00:00Z' },
        { id: '3', timestamp: '2025-01-03T00:00:00Z' },
        { id: '2', timestamp: '2025-01-02T00:00:00Z' }
      ];
      localJsonService.getAllRows.mockResolvedValue(mockLogs);

      const result = await auditService.getAuditLogs();

      expect(result.success).toBe(true);
      expect(result.data[0].id).toBe('3'); // Most recent first
      expect(result.data[1].id).toBe('2');
      expect(result.data[2].id).toBe('1');
    });
  });

  describe('getAuditLogsByTarget', () => {
    it('should return logs for specific target ID', async () => {
      const mockLogs = [
        { id: '1', targetId: 'rep_123' },
        { id: '2', targetId: 'rep_456' },
        { id: '3', targetId: 'rep_123' }
      ];
      localJsonService.getAllRows.mockResolvedValue(mockLogs);

      const result = await auditService.getAuditLogsByTarget('rep_123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data.every(log => log.targetId === 'rep_123')).toBe(true);
    });

    it('should return validation error for missing target ID', async () => {
      const result = await auditService.getAuditLogsByTarget();

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Target ID is required');
    });
  });

  describe('getAuditLogsByAdminUser', () => {
    it('should return logs for specific admin user', async () => {
      const mockLogs = [
        { id: '1', adminUser: 'admin@example.com' },
        { id: '2', adminUser: 'user@example.com' }
      ];
      localJsonService.getAllRows.mockResolvedValue(mockLogs);

      const result = await auditService.getAuditLogsByAdminUser('admin@example.com');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].adminUser).toBe('admin@example.com');
    });

    it('should return validation error for missing admin user', async () => {
      const result = await auditService.getAuditLogsByAdminUser();

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Admin user is required');
    });
  });

  describe('getAuditLogsByAction', () => {
    it('should return logs for specific action', async () => {
      const mockLogs = [
        { id: '1', action: 'LOGIN' },
        { id: '2', action: 'STATUS_UPDATE' },
        { id: '3', action: 'LOGIN' }
      ];
      localJsonService.getAllRows.mockResolvedValue(mockLogs);

      const result = await auditService.getAuditLogsByAction('LOGIN');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data.every(log => log.action === 'LOGIN')).toBe(true);
    });

    it('should return validation error for missing action', async () => {
      const result = await auditService.getAuditLogsByAction();

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Action is required');
    });
  });

  describe('getRecentAuditLogs', () => {
    it('should return recent logs with default limit', async () => {
      const mockLogs = Array.from({ length: 60 }, (_, i) => ({ id: `${i + 1}` }));
      localJsonService.getAllRows.mockResolvedValue({ success: true, data: mockLogs, error: null });

      const result = await auditService.getRecentAuditLogs();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(50); // Default limit
    });

    it('should return recent logs with custom limit', async () => {
      const mockLogs = Array.from({ length: 20 }, (_, i) => ({ id: `${i + 1}` }));
      localJsonService.getAllRows.mockResolvedValue({ success: true, data: mockLogs, error: null });

      const result = await auditService.getRecentAuditLogs(10);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(10);
    });
  });

  describe('getAuditStatistics', () => {
    it('should return comprehensive statistics', async () => {
      const mockLogs = [
        { action: 'LOGIN', adminUser: 'admin1', targetType: 'system', timestamp: '2025-01-01T00:00:00Z' },
        { action: 'STATUS_UPDATE', adminUser: 'admin1', targetType: 'report', timestamp: '2025-01-02T00:00:00Z' },
        { action: 'LOGIN', adminUser: 'admin2', targetType: 'system', timestamp: '2025-01-03T00:00:00Z' },
        { action: 'LOGOUT', adminUser: 'admin1', targetType: 'system', timestamp: '2025-01-04T00:00:00Z' }
      ];
      localJsonService.getAllRows.mockResolvedValue({ success: true, data: mockLogs, error: null });

      const result = await auditService.getAuditStatistics();

      expect(result.success).toBe(true);
      const stats = result.data;
      expect(stats.total).toBe(4);
      expect(stats.byAction.LOGIN).toBe(2);
      expect(stats.byAction.STATUS_UPDATE).toBe(1);
      expect(stats.byAction.LOGOUT).toBe(1);
      expect(stats.byAdminUser.admin1).toBe(3);
      expect(stats.byAdminUser.admin2).toBe(1);
      expect(stats.byTargetType.system).toBe(3);
      expect(stats.byTargetType.report).toBe(1);
      expect(stats.dateRange.start).toBe('2025-01-01T00:00:00Z');
      expect(stats.dateRange.end).toBe('2025-01-04T00:00:00Z');
    });

    it('should handle empty logs', async () => {
      localJsonService.getAllRows.mockResolvedValue([]);

      const result = await auditService.getAuditStatistics();

      expect(result.success).toBe(true);
      const stats = result.data;
      expect(stats.total).toBe(0);
      expect(stats.byAction).toEqual({});
      expect(stats.byAdminUser).toEqual({});
      expect(stats.byTargetType).toEqual({});
      expect(stats.dateRange.start).toBeNull();
      expect(stats.dateRange.end).toBeNull();
    });
  });

  describe('Authentication audit methods', () => {
    beforeEach(() => {
      localJsonService.appendRow.mockResolvedValue();
    });

    describe('logLogin', () => {
      it('should log successful login', async () => {
        const result = await auditService.logLogin('admin@example.com', '192.168.1.1');

        expect(result.success).toBe(true);
        expect(result.data.action).toBe('LOGIN');
        expect(result.data.adminUser).toBe('admin@example.com');
        expect(result.data.targetType).toBe('system');
        expect(result.data.details).toBe('User admin@example.com logged in');
        expect(result.data.ipAddress).toBe('192.168.1.1');
        expect(result.data.metadata.eventType).toBe('authentication');
      });
    });

    describe('logFailedLogin', () => {
      it('should log failed login attempt', async () => {
        const result = await auditService.logFailedLogin('admin@example.com', '192.168.1.1', 'Invalid password');

        expect(result.success).toBe(true);
        expect(result.data.action).toBe('LOGIN_FAILED');
        expect(result.data.adminUser).toBe('admin@example.com');
        expect(result.data.details).toBe('Failed login attempt for user admin@example.com: Invalid password');
        expect(result.data.metadata.failureReason).toBe('Invalid password');
      });
    });

    describe('logLogout', () => {
      it('should log logout event', async () => {
        const result = await auditService.logLogout('admin@example.com', '192.168.1.1');

        expect(result.success).toBe(true);
        expect(result.data.action).toBe('LOGOUT');
        expect(result.data.adminUser).toBe('admin@example.com');
        expect(result.data.details).toBe('User admin@example.com logged out');
      });
    });

    describe('logPasswordChange', () => {
      it('should log password change', async () => {
        const result = await auditService.logPasswordChange('admin@example.com', '192.168.1.1');

        expect(result.success).toBe(true);
        expect(result.data.action).toBe('PASSWORD_CHANGE');
        expect(result.data.adminUser).toBe('admin@example.com');
        expect(result.data.targetType).toBe('user');
        expect(result.data.targetId).toBe('admin@example.com');
        expect(result.data.details).toBe('User admin@example.com changed their password');
        expect(result.data.metadata.eventType).toBe('security');
      });
    });

    describe('logStatusUpdate', () => {
      it('should log status update with changes', async () => {
        const result = await auditService.logStatusUpdate('rep_123', 'Added', 'Confirmed', 'Admin review completed');

        expect(result.success).toBe(true);
        expect(result.data.action).toBe('STATUS_UPDATE');
        expect(result.data.targetType).toBe('report');
        expect(result.data.targetId).toBe('rep_123');
        expect(result.data.details).toBe('Report status changed from "Added" to "Confirmed"');
        expect(result.data.changes.status.old).toBe('Added');
        expect(result.data.changes.status.new).toBe('Confirmed');
        expect(result.data.metadata.adminNotes).toBe('Admin review completed');
        expect(result.data.metadata.eventType).toBe('report_management');
      });
    });
  });

  describe('Cache management', () => {
    it('should clear cache', () => {
      auditService.setCachedAuditLogs([{ id: '1' }]);
      expect(auditService.getCachedAuditLogs()).toBeTruthy();

      auditService.clearCache();
      expect(auditService.getCachedAuditLogs()).toBeNull();
    });

    it('should return null for expired cache', () => {
      const mockLogs = [{ id: '1' }];
      auditService.setCachedAuditLogs(mockLogs);

      // Mock Date.now to return time after TTL
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() + 11 * 60 * 1000); // 11 minutes later

      expect(auditService.getCachedAuditLogs()).toBeNull();

      Date.now = originalDateNow;
    });
  });

  describe('Error handling', () => {
    it('should handle JSON storage errors in getAuditLogs', async () => {
      localJsonService.getAllRows.mockResolvedValue({
        success: false,
        data: null,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Storage error',
          innerError: new Error('Storage error')
        }
      });

      const result = await auditService.getAuditLogs();

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Failed to retrieve audit logs from storage');
    });

    it('should handle JSON storage errors in createAuditLog', async () => {
      localJsonService.appendRow.mockResolvedValue({
        success: false,
        data: null,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Storage error',
          innerError: new Error('Storage error')
        }
      });

      const result = await auditService.createAuditLog({
        action: 'TEST',
        targetType: 'system',
        details: 'Test action'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Failed to save audit log entry');
    });
  });

  describe('Utility functions', () => {
    describe('validateSpreadsheetParams', () => {
      it('should pass validation for valid parameters', () => {
        expect(() => auditService.validateSpreadsheetParams('sheet123', 'Sheet1')).not.toThrow();
      });

      it('should throw error for invalid spreadsheetId', () => {
        expect(() => auditService.validateSpreadsheetParams('', 'Sheet1')).toThrow('Invalid spreadsheetId: must be a non-empty string');
        expect(() => auditService.validateSpreadsheetParams(null, 'Sheet1')).toThrow('Invalid spreadsheetId: must be a non-empty string');
        expect(() => auditService.validateSpreadsheetParams(123, 'Sheet1')).toThrow('Invalid spreadsheetId: must be a non-empty string');
      });

      it('should throw error for invalid sheetName', () => {
        expect(() => auditService.validateSpreadsheetParams('sheet123', '')).toThrow('Invalid sheetName: must be a non-empty string');
        expect(() => auditService.validateSpreadsheetParams('sheet123', null)).toThrow('Invalid sheetName: must be a non-empty string');
        expect(() => auditService.validateSpreadsheetParams('sheet123', 123)).toThrow('Invalid sheetName: must be a non-empty string');
      });
    });

    describe('handleApiError', () => {
      it('should handle 403 Forbidden error', () => {
        const error = { code: 403, message: 'Access denied' };
        expect(() => auditService.handleApiError(error, 'testOperation')).toThrow('Access denied to Google Sheets. Check service account permissions.');
      });

      it('should handle 404 Not Found error', () => {
        const error = { code: 404, message: 'Not found' };
        expect(() => auditService.handleApiError(error, 'testOperation')).toThrow('Audit spreadsheet or sheet not found. Verify spreadsheet ID and sheet name.');
      });

      it('should handle 429 Rate Limit error', () => {
        const error = { code: 429, message: 'Rate limit exceeded' };
        expect(() => auditService.handleApiError(error, 'testOperation')).toThrow('Google Sheets API rate limit exceeded. Please try again later.');
      });

      it('should handle generic API errors', () => {
        const error = { code: 500, message: 'Internal server error' };
        expect(() => auditService.handleApiError(error, 'testOperation')).toThrow('Google Sheets API error during testOperation: Internal server error');
      });
    });
  });

  describe('Date filtering in getAllAuditLogsFromJson', () => {
    beforeEach(() => {
      // Clear mocks
      jest.clearAllMocks();
    });

    it('should filter logs by startDate', async () => {
      const mockLogs = [
        { id: '1', timestamp: '2025-01-01T00:00:00Z', action: 'LOGIN' },
        { id: '2', timestamp: '2025-01-02T00:00:00Z', action: 'LOGOUT' },
        { id: '3', timestamp: '2025-01-03T00:00:00Z', action: 'LOGIN' }
      ];

      localJsonService.getAllRows.mockResolvedValue(mockLogs);

      // Import the internal function for testing
      const { getAllAuditLogsFromJson } = require('../../../server/services/auditService');

      const result = await getAllAuditLogsFromJson({ startDate: '2025-01-02T00:00:00Z' });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('3'); // Most recent first
      expect(result[1].id).toBe('2');
    });

    it('should filter logs by endDate', async () => {
      const mockLogs = [
        { id: '1', timestamp: '2025-01-01T00:00:00Z', action: 'LOGIN' },
        { id: '2', timestamp: '2025-01-02T00:00:00Z', action: 'LOGOUT' },
        { id: '3', timestamp: '2025-01-03T00:00:00Z', action: 'LOGIN' }
      ];

      localJsonService.getAllRows.mockResolvedValue(mockLogs);

      const { getAllAuditLogsFromJson } = require('../../../server/services/auditService');

      const result = await getAllAuditLogsFromJson({ endDate: '2025-01-02T00:00:00Z' });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('1');
    });

    it('should filter logs by both startDate and endDate', async () => {
      const mockLogs = [
        { id: '1', timestamp: '2025-01-01T00:00:00Z', action: 'LOGIN' },
        { id: '2', timestamp: '2025-01-02T00:00:00Z', action: 'LOGOUT' },
        { id: '3', timestamp: '2025-01-03T00:00:00Z', action: 'LOGIN' },
        { id: '4', timestamp: '2025-01-04T00:00:00Z', action: 'LOGOUT' }
      ];

      localJsonService.getAllRows.mockResolvedValue(mockLogs);

      const { getAllAuditLogsFromJson } = require('../../../server/services/auditService');

      const result = await getAllAuditLogsFromJson({
        startDate: '2025-01-02T00:00:00Z',
        endDate: '2025-01-03T00:00:00Z'
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('3');
      expect(result[1].id).toBe('2');
    });
  });
});