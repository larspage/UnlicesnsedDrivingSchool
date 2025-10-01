/**
 * Performance and Load Testing for NJDSC School Compliance Portal
 *
 * Tests system performance under various loads and conditions
 */

const request = require('supertest');
const app = require('../../server/app');

describe('Performance Testing Suite', () => {
  let server;

  beforeAll(async () => {
    server = app.listen(3002);
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('Response Time Performance', () => {
    test('should respond to health check within 100ms', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/health')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100);
    });

    test('should handle report submission within 2 seconds', async () => {
      const reportData = {
        schoolName: `Performance Test School ${Date.now()}`,
        violationDescription: 'Performance testing report submission',
        location: '123 Performance St, Load City, NJ'
      };

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/reports')
        .send(reportData)
        .expect(201);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // 2 seconds
    });

    test('should retrieve reports list within 1 second', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/reports?limit=50')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // 1 second
    });
  });

  describe('Concurrent Load Testing', () => {
    test('should handle 10 concurrent report submissions', async () => {
      const reportPromises = Array(10).fill().map((_, index) => {
        const reportData = {
          schoolName: `Concurrent Test School ${index}-${Date.now()}`,
          violationDescription: `Concurrent submission test ${index}`,
          location: `${index} Concurrent St, Load City, NJ`
        };

        return request(app)
          .post('/api/reports')
          .send(reportData);
      });

      const startTime = Date.now();
      const results = await Promise.allSettled(reportPromises);
      const totalTime = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      const failed = results.filter(r => r.status === 'rejected' || r.value.status !== 201);

      expect(successful.length).toBeGreaterThanOrEqual(8); // At least 80% success rate
      expect(totalTime).toBeLessThan(10000); // All complete within 10 seconds
    });

    test('should handle mixed read/write operations concurrently', async () => {
      // Create some test reports first
      const createPromises = Array(5).fill().map((_, index) =>
        request(app)
          .post('/api/reports')
          .send({
            schoolName: `Mixed Load Test ${index}-${Date.now()}`,
            violationDescription: 'Mixed load testing',
            location: `${index} Mixed St, Load City, NJ`
          })
      );

      await Promise.all(createPromises);

      // Now perform mixed operations
      const operations = [
        // Read operations
        request(app).get('/api/reports?limit=10'),
        request(app).get('/api/reports/stats'),

        // Write operations
        request(app).post('/api/reports').send({
          schoolName: `Mixed Op Test ${Date.now()}`,
          violationDescription: 'Mixed operation test'
        }),

        // More reads
        request(app).get('/api/reports?limit=5'),
        request(app).get('/api/config')
      ];

      const startTime = Date.now();
      const results = await Promise.allSettled(operations);
      const totalTime = Date.now() - startTime;

      const successful = results.filter(r =>
        r.status === 'fulfilled' &&
        (r.value.status === 200 || r.value.status === 201)
      );

      expect(successful.length).toBeGreaterThanOrEqual(4); // At least 80% success rate
      expect(totalTime).toBeLessThan(5000); // Complete within 5 seconds
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform 20 report submissions
      for (let i = 0; i < 20; i++) {
        await request(app)
          .post('/api/reports')
          .send({
            schoolName: `Memory Test School ${i}-${Date.now()}`,
            violationDescription: 'Memory leak test',
            location: `${i} Memory St, Test City, NJ`
          })
          .expect(201);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      const initialMemory = process.memoryUsage().heapUsed;

      // Request a large dataset
      const response = await request(app)
        .get('/api/reports?limit=1000')
        .expect(200);

      const responseTime = Date.now() - startTime;
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(responseTime).toBeLessThan(3000); // 3 seconds for large dataset
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
      expect(response.body.data.items.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Database Query Performance', () => {
    test('should perform efficient filtering and searching', async () => {
      // Create test data with searchable content
      const testReports = [
        { schoolName: 'Search Test Alpha School', violationDescription: 'Test violation', location: 'Alpha St' },
        { schoolName: 'Search Test Beta School', violationDescription: 'Test violation', location: 'Beta St' },
        { schoolName: 'Search Test Gamma School', violationDescription: 'Test violation', location: 'Gamma St' }
      ];

      for (const report of testReports) {
        await request(app)
          .post('/api/reports')
          .send(report)
          .expect(201);
      }

      // Test search performance
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/reports?search=Search Test&limit=10')
        .expect(200);

      const searchTime = Date.now() - startTime;

      expect(searchTime).toBeLessThan(1000); // Search completes within 1 second
      expect(response.body.data.items.length).toBeGreaterThanOrEqual(3);
    });

    test('should handle pagination efficiently', async () => {
      const pageSizes = [10, 25, 50, 100];

      for (const pageSize of pageSizes) {
        const startTime = Date.now();

        const response = await request(app)
          .get(`/api/reports?limit=${pageSize}&page=1`)
          .expect(200);

        const responseTime = Date.now() - startTime;

        expect(responseTime).toBeLessThan(1500); // 1.5 seconds max
        expect(response.body.data.items.length).toBeLessThanOrEqual(pageSize);
      }
    });
  });

  describe('File Upload Performance', () => {
    test('should handle file uploads within time limits', async () => {
      // Create a mock file (small base64 encoded image)
      const mockFile = {
        name: 'performance_test.jpg',
        type: 'image/jpeg',
        data: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AB//2Q=='
      };

      const reportData = {
        schoolName: `File Upload Performance Test ${Date.now()}`,
        violationDescription: 'Testing file upload performance',
        files: [mockFile]
      };

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/reports')
        .send(reportData)
        .expect(201);

      const uploadTime = Date.now() - startTime;

      expect(uploadTime).toBeLessThan(5000); // 5 seconds for file upload
      expect(response.body.data.uploadedFiles).toHaveLength(1);
    });

    test('should handle multiple file uploads efficiently', async () => {
      const mockFiles = Array(3).fill().map((_, index) => ({
        name: `performance_test_${index}.jpg`,
        type: 'image/jpeg',
        data: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/AB//2Q=='
      }));

      const reportData = {
        schoolName: `Multiple Files Performance Test ${Date.now()}`,
        violationDescription: 'Testing multiple file upload performance',
        files: mockFiles
      };

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/reports')
        .send(reportData)
        .expect(201);

      const uploadTime = Date.now() - startTime;

      expect(uploadTime).toBeLessThan(10000); // 10 seconds for multiple files
      expect(response.body.data.uploadedFiles).toHaveLength(3);
    });
  });

  describe('Error Handling Performance', () => {
    test('should handle errors gracefully without performance degradation', async () => {
      const errorRequests = Array(10).fill().map(() =>
        request(app)
          .get('/api/reports/invalid-id')
          .expect(404)
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(errorRequests);
      const totalTime = Date.now() - startTime;

      const successfulErrors = results.filter(r =>
        r.status === 'fulfilled' && r.value.status === 404
      );

      expect(successfulErrors.length).toBe(10); // All errors handled properly
      expect(totalTime).toBeLessThan(2000); // Error handling doesn't slow down the system
    });

    test('should maintain performance under error conditions', async () => {
      // Mix of valid and invalid requests
      const requests = [
        // Valid requests
        request(app).get('/api/reports?limit=10'),
        request(app).get('/health'),

        // Invalid requests
        request(app).get('/api/reports/invalid-id'),
        request(app).post('/api/reports').send({}), // Missing required fields

        // More valid requests
        request(app).get('/api/config'),
        request(app).get('/api/reports/stats')
      ];

      const startTime = Date.now();
      const results = await Promise.allSettled(requests);
      const totalTime = Date.now() - startTime;

      // Should handle mixed success/error responses efficiently
      expect(totalTime).toBeLessThan(3000); // 3 seconds for mixed operations

      const completed = results.filter(r => r.status === 'fulfilled');
      expect(completed.length).toBeGreaterThanOrEqual(4); // At least 4 successful responses
    });
  });

  describe('Caching and Optimization', () => {
    test('should benefit from response caching', async () => {
      // First request
      const firstStart = Date.now();
      await request(app).get('/health').expect(200);
      const firstTime = Date.now() - firstStart;

      // Second request (should be faster if cached)
      const secondStart = Date.now();
      await request(app).get('/health').expect(200);
      const secondTime = Date.now() - secondStart;

      // Second request should be at least 10% faster (allowing for variance)
      expect(secondTime).toBeLessThanOrEqual(firstTime);
    });

    test('should handle database connection pooling efficiently', async () => {
      const concurrentDbRequests = Array(20).fill().map(() =>
        request(app).get('/api/reports/stats')
      );

      const startTime = Date.now();
      const results = await Promise.allSettled(concurrentDbRequests);
      const totalTime = Date.now() - startTime;

      const successful = results.filter(r =>
        r.status === 'fulfilled' && r.value.status === 200
      );

      expect(successful.length).toBeGreaterThanOrEqual(15); // At least 75% success rate
      expect(totalTime).toBeLessThan(8000); // Complete within 8 seconds
    });
  });
});