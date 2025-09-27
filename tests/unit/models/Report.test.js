/**
 * Unit tests for Report model
 */

const Report = require('../../../server/models/Report');

describe('Report Model', () => {
  describe('constructor and validation', () => {
    test('should create a valid report', () => {
      const data = {
        id: 'rep_ABC123',
        schoolName: 'Test School',
        status: 'Added',
        lastReported: '2025-09-26T21:25:00.000Z',
        createdAt: '2025-09-26T21:25:00.000Z',
        updatedAt: '2025-09-26T21:25:00.000Z'
      };

      const report = new Report(data);

      expect(report.id).toBe('rep_ABC123');
      expect(report.schoolName).toBe('Test School');
      expect(report.status).toBe('Added');
    });

    test('should throw error for invalid data', () => {
      const invalidData = {
        schoolName: '', // Invalid: empty string
        status: 'InvalidStatus'
      };

      expect(() => new Report(invalidData)).toThrow();
    });
  });

  describe('generateId', () => {
    test('should generate valid report ID format', () => {
      const id = Report.generateId();
      expect(id).toMatch(/^rep_[a-zA-Z0-9]{6}$/);
    });
  });

  describe('create', () => {
    test('should create report with generated ID and timestamps', () => {
      const data = {
        schoolName: 'New School',
        location: 'Test City'
      };

      const report = Report.create(data, '127.0.0.1');

      expect(report.id).toMatch(/^rep_[a-zA-Z0-9]{6}$/);
      expect(report.schoolName).toBe('New School');
      expect(report.location).toBe('Test City');
      expect(report.status).toBe('Added');
      expect(report.reporterIp).toBe('127.0.0.1');
      expect(report.createdAt).toBeDefined();
      expect(report.updatedAt).toBeDefined();
      expect(report.lastReported).toBeDefined();
    });
  });

  describe('toSheetsRow', () => {
    test('should convert report to sheets row array', () => {
      const data = {
        id: 'rep_ABC123',
        schoolName: 'Test School',
        location: 'Test City',
        status: 'Added',
        lastReported: '2025-09-26T21:25:00.000Z',
        createdAt: '2025-09-26T21:25:00.000Z',
        updatedAt: '2025-09-26T21:25:00.000Z'
      };

      const report = new Report(data);
      const row = report.toSheetsRow();

      expect(row).toHaveLength(16);
      expect(row[0]).toBe('rep_ABC123');
      expect(row[1]).toBe('Test School');
      expect(row[2]).toBe('Test City');
      expect(row[9]).toBe('Added');
    });
  });

  describe('fromSheetsRow', () => {
    test('should create report from sheets row array', () => {
      const row = [
        'rep_ABC123',
        'Test School',
        'Test City',
        'Violation description',
        '(555) 123-4567',
        'https://example.com',
        '[]', // uploadedFiles
        '[]', // socialMediaLinks
        'Additional info',
        'Added',
        '2025-09-26T21:25:00.000Z',
        '2025-09-26T21:25:00.000Z',
        '2025-09-26T21:25:00.000Z',
        '127.0.0.1',
        'Admin notes',
        'MVC123'
      ];

      const report = Report.fromSheetsRow(row);

      expect(report.id).toBe('rep_ABC123');
      expect(report.schoolName).toBe('Test School');
      expect(report.location).toBe('Test City');
      expect(report.status).toBe('Added');
    });
  });

  describe('validateBusinessRules', () => {
    test('should pass validation for unique school name', () => {
      const data = {
        id: 'rep_ABC123',
        schoolName: 'Unique School',
        status: 'Added',
        lastReported: '2025-09-26T21:25:00.000Z',
        createdAt: '2025-09-26T21:25:00.000Z',
        updatedAt: '2025-09-26T21:25:00.000Z'
      };

      const report = new Report(data);
      const existingReports = [
        { id: 'rep_DEF456', schoolName: 'Different School' }
      ];

      expect(() => report.validateBusinessRules(existingReports)).not.toThrow();
    });

    test('should throw error for duplicate school name', () => {
      const data = {
        id: 'rep_ABC123',
        schoolName: 'Duplicate School',
        status: 'Added',
        lastReported: '2025-09-26T21:25:00.000Z',
        createdAt: '2025-09-26T21:25:00.000Z',
        updatedAt: '2025-09-26T21:25:00.000Z'
      };

      const report = new Report(data);
      const existingReports = [
        { id: 'rep_DEF456', schoolName: 'duplicate school' } // Case insensitive
      ];

      expect(() => report.validateBusinessRules(existingReports)).toThrow('Duplicate report found');
    });
  });

  describe('getStatusEnum', () => {
    test('should return status enumeration', () => {
      const statusEnum = Report.getStatusEnum();
      expect(statusEnum).toHaveProperty('ADDED', 'Added');
      expect(statusEnum).toHaveProperty('CONFIRMED', 'Confirmed by NJDSC');
      expect(statusEnum).toHaveProperty('REPORTED_TO_MVC', 'Reported to MVC');
    });
  });
});