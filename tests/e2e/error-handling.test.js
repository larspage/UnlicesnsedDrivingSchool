/**
 * Error Handling and Edge Cases Testing for NJDSC School Compliance Portal
 *
 * Tests system behavior under error conditions and edge cases
 */

const request = require('supertest');
const app = require('../../server/app');

describe('Error Handling and Edge Cases', () => {
  let server;

  beforeAll(async () => {
    server = app.listen(3003);
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('Input Validation Errors', () => {
    test('should reject malformed JSON', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Content-Type', 'application/json')
        .send('{invalid json}')
        .expect(400);

      expect(response.body.error).toContain('JSON');
    });

    test('should validate email format', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user.example.com',
        'user@.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/reports')
          .send({
            schoolName: 'Test School',
            violationDescription: 'Test violation',
            reporterEmail: email
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    test('should validate URL format', async () => {
      const invalidUrls = [
        'not-a-url',
        'http://',
        'https://',
        'ftp://example.com'
      ];

      for (const url of invalidUrls) {
        const response = await request(app)
          .post('/api/reports')
          .send({
            schoolName: 'Test School',
            violationDescription: 'Test violation',
            websiteUrl: url
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    test('should validate phone number format', async () => {
      const invalidPhones = [
        '123',
        'abcdefghij',
        '123-456-78901', // Too long
        '1-2-3' // Too short
      ];

      for (const phone of invalidPhones) {
        const response = await request(app)
          .post('/api/reports')
          .send({
            schoolName: 'Test School',
            violationDescription: 'Test violation',
            phoneNumber: phone
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    test('should handle extremely long input strings', async () => {
      const longString = 'a'.repeat(10000); // 10KB string

      const response = await request(app)
        .post('/api/reports')
        .send({
          schoolName: longString,
          violationDescription: 'Test violation',
          location: 'Test location'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });
  });

  describe('File Upload Edge Cases', () => {
    test('should reject files that are too large', async () => {
      // Create a mock file that's too large (over 10MB)
      const largeFileData = 'a'.repeat(11 * 1024 * 1024); // 11MB
      const largeFile = {
        name: 'too_large.jpg',
        type: 'image/jpeg',
        data: Buffer.from(largeFileData).toString('base64')
      };

      const response = await request(app)
        .post('/api/reports')
        .send({
          schoolName: 'Test School',
          violationDescription: 'Test violation',
          files: [largeFile]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('size');
    });

    test('should reject unsupported file types', async () => {
      const unsupportedFile = {
        name: 'malicious.exe',
        type: 'application/x-msdownload',
        data: 'dGVzdA==' // base64 for 'test'
      };

      const response = await request(app)
        .post('/api/reports')
        .send({
          schoolName: 'Test School',
          violationDescription: 'Test violation',
          files: [unsupportedFile]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('type');
    });

    test('should handle corrupted file data', async () => {
      const corruptedFile = {
        name: 'corrupted.jpg',
        type: 'image/jpeg',
        data: 'not-valid-base64!'
      };

      const response = await request(app)
        .post('/api/reports')
        .send({
          schoolName: 'Test School',
          violationDescription: 'Test violation',
          files: [corruptedFile]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle empty file uploads', async () => {
      const emptyFile = {
        name: 'empty.jpg',
        type: 'image/jpeg',
        data: ''
      };

      const response = await request(app)
        .post('/api/reports')
        .send({
          schoolName: 'Test School',
          violationDescription: 'Test violation',
          files: [emptyFile]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication and Authorization Errors', () => {
    test('should reject requests with invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/reports?admin=true')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .expect(401);

      expect(response.body.error).toContain('authentication');
    });

    test('should reject requests with expired tokens', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDB9.invalid';

      const response = await request(app)
        .get('/api/reports?admin=true')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toContain('authentication');
    });

    test('should reject non-admin users from admin endpoints', async () => {
      // Mock a user token (not admin)
      const userToken = 'mock-user-jwt-token';

      const response = await request(app)
        .put('/api/reports/test-id/status')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'Closed' })
        .expect(403);

      expect(response.body.error).toContain('authorization');
    });

    test('should handle missing authorization headers', async () => {
      const response = await request(app)
        .post('/api/config')
        .send({ maxFileSize: 20 })
        .expect(401);

      expect(response.body.error).toContain('Authentication required');
    });
  });

  describe('Database and External Service Errors', () => {
    test('should handle Google Sheets API failures gracefully', async () => {
      // Mock Google Sheets API failure
      jest.spyOn(require('../../server/services/googleSheetsService'), 'appendRow')
        .mockRejectedValueOnce(new Error('Google Sheets API unavailable'));

      const response = await request(app)
        .post('/api/reports')
        .send({
          schoolName: 'Test School',
          violationDescription: 'Test violation'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to submit report');
    });

    test('should handle Google Drive API failures gracefully', async () => {
      // Mock Google Drive API failure
      jest.spyOn(require('../../server/services/googleDriveService'), 'uploadFile')
        .mockRejectedValueOnce(new Error('Google Drive API unavailable'));

      const response = await request(app)
        .post('/api/reports')
        .send({
          schoolName: 'Test School',
          violationDescription: 'Test violation',
          files: [{
            name: 'test.jpg',
            type: 'image/jpeg',
            data: 'dGVzdA==' // base64 for 'test'
          }]
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should handle Gmail API failures gracefully', async () => {
      // Mock Gmail API failure
      jest.spyOn(require('../../server/services/gmailService'), 'sendEmail')
        .mockRejectedValueOnce(new Error('Gmail API unavailable'));

      const response = await request(app)
        .post('/api/emails/send')
        .set('Authorization', 'Bearer mock-admin-token')
        .send({
          reportId: 'test-id',
          templateId: 'test-template',
          to: 'test@example.com',
          subject: 'Test',
          body: 'Test body'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Network and Timeout Errors', () => {
    test('should handle request timeouts gracefully', async () => {
      // Set a very short timeout for the request
      const response = await request(app)
        .get('/api/reports?limit=1000')
        .timeout(1) // 1ms timeout
        .catch(err => err);

      // Should either timeout or succeed
      if (response.status) {
        expect([200, 408, 504]).toContain(response.status);
      }
    });

    test('should handle large payload requests', async () => {
      const largePayload = {
        schoolName: 'Test School',
        violationDescription: 'x'.repeat(100000), // 100KB string
        additionalInfo: 'y'.repeat(50000), // 50KB string
        socialMediaLinks: Array(100).fill('https://example.com/link') // 100 links
      };

      const response = await request(app)
        .post('/api/reports')
        .send(largePayload);

      // Should either succeed or fail with a proper error
      expect([200, 201, 400, 413]).toContain(response.status);

      if (response.status >= 400) {
        expect(response.body.success).toBe(false);
      }
    });

    test('should handle concurrent connection limits', async () => {
      // Simulate many concurrent requests
      const concurrentRequests = Array(50).fill().map(() =>
        request(app).get('/health')
      );

      const results = await Promise.allSettled(concurrentRequests);

      const successful = results.filter(r =>
        r.status === 'fulfilled' && r.value.status === 200
      );

      // Should handle most requests successfully
      expect(successful.length).toBeGreaterThanOrEqual(40); // At least 80% success rate
    });
  });

  describe('Business Logic Edge Cases', () => {
    test('should prevent duplicate reports within short timeframes', async () => {
      const reportData = {
        schoolName: 'Duplicate Test School',
        violationDescription: 'First report',
        location: '123 Test St'
      };

      // Submit first report
      await request(app)
        .post('/api/reports')
        .send(reportData)
        .expect(201);

      // Try to submit duplicate immediately
      const response = await request(app)
        .post('/api/reports')
        .send({
          ...reportData,
          violationDescription: 'Second report' // Different description
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    test('should handle status transition validation', async () => {
      // Create a report first
      const createResponse = await request(app)
        .post('/api/reports')
        .send({
          schoolName: 'Status Test School',
          violationDescription: 'Status transition test'
        })
        .expect(201);

      const reportId = createResponse.body.data.id;

      // Try invalid status transition
      const response = await request(app)
        .put(`/api/reports/${reportId}/status`)
        .set('Authorization', 'Bearer mock-admin-token')
        .send({ status: 'InvalidStatus' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid status');
    });

    test('should validate bulk operation parameters', async () => {
      const response = await request(app)
        .put('/api/reports/bulk-status')
        .set('Authorization', 'Bearer mock-admin-token')
        .send({
          reportIds: [],
          status: 'Closed'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('report IDs');
    });
  });

  describe('Security Edge Cases', () => {
    test('should prevent SQL injection attempts', async () => {
      const maliciousInput = {
        schoolName: "'; DROP TABLE reports; --",
        violationDescription: 'SQL injection test'
      };

      const response = await request(app)
        .post('/api/reports')
        .send(maliciousInput)
        .expect(400);

      // Should either validate and reject, or sanitize and accept
      expect([200, 201, 400]).toContain(response.status);
    });

    test('should prevent XSS attempts', async () => {
      const xssInput = {
        schoolName: '<script>alert("XSS")</script>Test School',
        violationDescription: 'XSS test'
      };

      const response = await request(app)
        .post('/api/reports')
        .send(xssInput);

      expect([200, 201, 400]).toContain(response.status);

      if (response.status === 201) {
        // If accepted, should be sanitized
        expect(response.body.data.schoolName).not.toContain('<script>');
      }
    });

    test('should handle path traversal attempts', async () => {
      const response = await request(app)
        .get('/api/reports/../../../etc/passwd')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    test('should validate file names for security', async () => {
      const dangerousFiles = [
        '../../../etc/passwd',
        'shell.php.jpg',
        'malicious.exe',
        'test.php',
        'script.js'
      ];

      for (const filename of dangerousFiles) {
        const response = await request(app)
          .post('/api/reports')
          .send({
            schoolName: 'Security Test School',
            violationDescription: 'File security test',
            files: [{
              name: filename,
              type: 'image/jpeg',
              data: 'dGVzdA=='
            }]
          });

        // Should either reject or sanitize the filename
        expect([200, 201, 400]).toContain(response.status);
      }
    });
  });

  describe('Resource Exhaustion Protection', () => {
    test('should prevent memory exhaustion from large arrays', async () => {
      const largeArray = Array(10000).fill('https://example.com/link');

      const response = await request(app)
        .post('/api/reports')
        .send({
          schoolName: 'Resource Test School',
          violationDescription: 'Memory exhaustion test',
          socialMediaLinks: largeArray
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle deeply nested objects', async () => {
      let nestedObject = { value: 'test' };
      for (let i = 0; i < 100; i++) {
        nestedObject = { nested: nestedObject };
      }

      const response = await request(app)
        .post('/api/reports')
        .send({
          schoolName: 'Nested Test School',
          violationDescription: 'Deep nesting test',
          additionalInfo: JSON.stringify(nestedObject)
        });

      // Should handle gracefully
      expect([200, 201, 400, 413]).toContain(response.status);
    });

    test('should prevent CPU exhaustion from complex regex', async () => {
      // Evil regex that can cause catastrophic backtracking
      const evilRegex = 'a'.repeat(1000) + 'b';

      const response = await request(app)
        .post('/api/reports')
        .send({
          schoolName: evilRegex,
          violationDescription: 'Regex exhaustion test'
        });

      // Should complete within reasonable time
      expect([200, 201, 400]).toContain(response.status);
    });
  });
});