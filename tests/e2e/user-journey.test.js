/**
 * End-to-End User Journey Tests for NJDSC School Compliance Portal
 *
 * Tests complete user workflows from public report submission to admin management
 */

const request = require('supertest');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs');
const path = require('path');

// Mock Google APIs to avoid actual API calls during testing
jest.mock('googleapis', () => ({
  google: {
    sheets: jest.fn(),
    drive: jest.fn(),
    gmail: jest.fn(),
    auth: {
      GoogleAuth: jest.fn(),
      JWT: jest.fn()
    }
  }
}));

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn()
  }
}));

const app = require('../../server/app');
const reportService = require('../../server/services/reportService');
const auditService = require('../../server/services/auditService');

describe('NJDSC School Compliance Portal - End-to-End User Journeys', () => {
  let server;
  let testReportId;
  let adminToken;

  beforeAll(async () => {
    // Start server for testing
    server = app.listen(3001);

    // Mock successful admin login to get token
    adminToken = 'mock-admin-jwt-token';
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('Public User Report Submission Journey', () => {
    test('should successfully submit a complete report with file upload', async () => {
      const reportData = {
        schoolName: 'Test Driving School Inc.',
        location: '123 Main St, Newark, NJ',
        violationDescription: 'Operating without proper license and insurance',
        phoneNumber: '(555) 123-4567',
        websiteUrl: 'https://testdrivingschool.com',
        socialMediaLinks: ['https://facebook.com/testschool'],
        additionalInfo: 'Multiple violations observed over several weeks',
        reporterName: 'John Citizen',
        reporterEmail: 'john.citizen@example.com',
        reporterPhone: '(555) 987-6543',
        files: [
          {
            name: 'violation_photo.jpg',
            type: 'image/jpeg',
            data: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AB//2Q=='
          }
        ]
      };

      const response = await request(app)
        .post('/api/reports')
        .send(reportData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.schoolName).toBe(reportData.schoolName);
      expect(response.body.data.status).toBe('Added');
      expect(response.body.data.uploadedFiles).toHaveLength(1);

      testReportId = response.body.data.id;
    });

    test('should prevent duplicate report submission', async () => {
      const duplicateReport = {
        schoolName: 'Test Driving School Inc.',
        violationDescription: 'Another violation at same school'
      };

      const response = await request(app)
        .post('/api/reports')
        .send(duplicateReport)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    test('should enforce rate limiting', async () => {
      const rapidReports = Array(6).fill().map((_, i) => ({
        schoolName: `Rapid Test School ${i}`,
        violationDescription: 'Rate limit test'
      }));

      // First 5 should succeed
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/reports')
          .send(rapidReports[i])
          .expect(201);
      }

      // 6th should be rate limited
      const response = await request(app)
        .post('/api/reports')
        .send(rapidReports[5])
        .expect(429);

      expect(response.body.error).toContain('rate limit');
    });

    test('should validate required fields', async () => {
      const invalidReport = {
        location: '123 Main St',
        violationDescription: 'Missing school name'
      };

      const response = await request(app)
        .post('/api/reports')
        .send(invalidReport)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('schoolName is required');
    });
  });

  describe('Admin Authentication Journey', () => {
    test('should authenticate admin user', async () => {
      const loginData = {
        username: 'admin',
        password: 'admin123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.role).toBe('admin');

      adminToken = response.body.data.token;
    });

    test('should reject invalid credentials', async () => {
      const invalidLogin = {
        username: 'admin',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidLogin)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    test('should protect admin routes', async () => {
      const response = await request(app)
        .get('/api/reports?admin=true')
        .expect(401);

      expect(response.body.error).toContain('Authentication required');
    });
  });

  describe('Admin Report Management Journey', () => {
    test('should retrieve all reports for admin', async () => {
      const response = await request(app)
        .get('/api/reports?admin=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);

      // Verify our test report is included
      const testReport = response.body.data.items.find(r => r.id === testReportId);
      expect(testReport).toBeDefined();
      expect(testReport.status).toBe('Added');
    });

    test('should update report status', async () => {
      const updateData = {
        status: 'Confirmed by NJDSC',
        adminNotes: 'Investigation initiated',
        mvcReferenceNumber: 'MVC-2025-001'
      };

      const response = await request(app)
        .put(`/api/reports/${testReportId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(updateData.status);
      expect(response.body.data.adminNotes).toBe(updateData.adminNotes);
      expect(response.body.data.mvcReferenceNumber).toBe(updateData.mvcReferenceNumber);
    });

    test('should perform bulk status updates', async () => {
      // Get a few report IDs for bulk update
      const reportsResponse = await request(app)
        .get('/api/reports?admin=true&limit=3')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const reportIds = reportsResponse.body.data.items.map(r => r.id);

      const bulkUpdateData = {
        reportIds,
        status: 'Under Investigation',
        adminNotes: 'Bulk investigation update'
      };

      const response = await request(app)
        .put('/api/reports/bulk-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bulkUpdateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(reportIds.length);
      expect(response.body.data.failed).toBe(0);
    });
  });

  describe('Email Communication Journey', () => {
    test('should send email to MVC', async () => {
      const emailData = {
        reportId: testReportId,
        templateId: 'mvc-notification',
        to: 'mvc@example.com',
        subject: 'Unlicensed Driving School Report - {{schoolName}}',
        body: 'Dear MVC,\n\nA report has been filed regarding {{schoolName}} at {{location}}.\n\nViolation: {{violationDescription}}\n\nReference: {{mvcReferenceNumber}}\n\nPlease investigate.\n\nRegards,\nNJDSC Compliance Team'
      };

      const response = await request(app)
        .post('/api/emails/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(emailData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Email sent successfully');
    });

    test('should retrieve email templates', async () => {
      const response = await request(app)
        .get('/api/emails/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Check for MVC notification template
      const mvcTemplate = response.body.data.find(t => t.id === 'mvc-notification');
      expect(mvcTemplate).toBeDefined();
    });
  });

  describe('Audit Logging Journey', () => {
    test('should log all admin actions', async () => {
      const response = await request(app)
        .get('/api/audit/logs?limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should include recent actions like status updates and email sends
      const recentLogs = response.body.data.filter(log =>
        log.targetId === testReportId ||
        log.action === 'EMAIL_SENT' ||
        log.action === 'STATUS_UPDATE'
      );

      expect(recentLogs.length).toBeGreaterThan(0);
    });

    test('should filter audit logs by action type', async () => {
      const response = await request(app)
        .get('/api/audit/logs?action=STATUS_UPDATE&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // All returned logs should be STATUS_UPDATE actions
      response.body.data.forEach(log => {
        expect(log.action).toBe('STATUS_UPDATE');
      });
    });
  });

  describe('Configuration Management Journey', () => {
    test('should retrieve current configuration', async () => {
      const response = await request(app)
        .get('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('maxFileSize');
      expect(response.body.data).toHaveProperty('allowedFileTypes');
      expect(response.body.data).toHaveProperty('requireAuthentication');
    });

    test('should update configuration settings', async () => {
      const newConfig = {
        maxFileSize: 20, // 20MB
        duplicateCheckEnabled: true,
        notificationsActive: true
      };

      const response = await request(app)
        .put('/api/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newConfig)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.maxFileSize).toBe(20);
      expect(response.body.data.duplicateCheckEnabled).toBe(true);
    });
  });

  describe('Data Integrity and Synchronization', () => {
    test('should maintain data consistency across operations', async () => {
      // Get report data
      const reportResponse = await request(app)
        .get(`/api/reports/${testReportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const report = reportResponse.body.data;

      // Get audit logs for this report
      const auditResponse = await request(app)
        .get(`/api/audit/logs?targetId=${testReportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const auditLogs = auditResponse.body.data;

      // Verify audit logs reflect the report's current state
      const statusUpdates = auditLogs.filter(log => log.action === 'STATUS_UPDATE');
      expect(statusUpdates.length).toBeGreaterThan(0);

      // Latest status update should match current report status
      const latestUpdate = statusUpdates[0]; // Assuming sorted by timestamp desc
      expect(latestUpdate.details.newStatus || latestUpdate.details.status).toBe(report.status);
    });

    test('should handle concurrent operations safely', async () => {
      // Simulate concurrent status updates
      const updatePromises = [
        request(app)
          .put(`/api/reports/${testReportId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'Reported to MVC', adminNotes: 'Concurrent test 1' }),
        request(app)
          .put(`/api/reports/${testReportId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'Under Investigation', adminNotes: 'Concurrent test 2' })
      ];

      const results = await Promise.allSettled(updatePromises);

      // At least one should succeed
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      expect(successful.length).toBeGreaterThan(0);

      // Verify final state is consistent
      const finalResponse = await request(app)
        .get(`/api/reports/${testReportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(['Reported to MVC', 'Under Investigation']).toContain(finalResponse.body.data.status);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid report IDs gracefully', async () => {
      const response = await request(app)
        .put('/api/reports/invalid-id/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Closed' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    test('should validate email data', async () => {
      const invalidEmail = {
        reportId: testReportId,
        to: 'invalid-email',
        subject: '',
        body: 'Test'
      };

      const response = await request(app)
        .post('/api/emails/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidEmail)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should handle network timeouts gracefully', async () => {
      // Mock a timeout scenario
      jest.setTimeout(1000);

      const response = await request(app)
        .get('/api/reports/stats')
        .timeout(500)
        .catch(err => err);

      // Should either succeed or fail gracefully
      if (response.status) {
        expect([200, 408, 504]).toContain(response.status);
      }
    });
  });
});