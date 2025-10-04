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

      // Mock console.error to prevent CI from treating validation logs as errors
      const originalConsoleError = console.error;
      console.error = jest.fn();

      expect(() => new Report(invalidData)).toThrow();

      // Restore console.error
      console.error = originalConsoleError;
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