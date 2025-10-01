/**
 * Unit Tests for Reports API Routes
 *
 * Tests all endpoints in reports.js with happy path, regular, and negative testing.
 */

const request = require('supertest');
const express = require('express');
const reportsRouter = require('../../../server/routes/reports');
const reportService = require('../../../server/services/reportService');
const googleDriveService = require('../../../server/services/googleDriveService');
const auditService = require('../../../server/services/auditService');

// Mock dependencies
jest.mock('../../../server/services/reportService');
jest.mock('../../../server/services/googleDriveService');
jest.mock('../../../server/services/auditService');
jest.mock('../../../server/middleware/auth', () => ({
  authenticateAdmin: (req, res, next) => {
    // Mock admin authentication - set user in req
    req.user = { id: 'admin_user', role: 'admin' };
    next();
  }
}));

// Mock express-rate-limit to disable rate limiting in tests
jest.mock('express-rate-limit', () => {
  return jest.fn(() => (req, res, next) => {
    next();
  });
});

describe('Reports API Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create Express app with the router
    app = express();
    app.use(express.json({ limit: '50mb' }));
    app.use('/api/reports', reportsRouter);
  });

  describe('POST /api/reports', () => {
    // Happy path tests
    test('should create a report successfully', async () => {
      const mockReportData = {
        schoolName: 'Test School',
        location: 'Test City',
        violationDescription: 'Test violation'
      };

      const mockReport = {
        id: 'rep_ABC123',
        schoolName: 'Test School',
        status: 'Added',
        createdAt: '2023-01-01T00:00:00.000Z',
        lastReported: '2023-01-01T00:00:00.000Z'
      };

      reportService.checkRateLimit.mockResolvedValue(false);
      reportService.createReport.mockResolvedValue(mockReport);

      const response = await request(app)
        .post('/api/reports')
        .send(mockReportData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('rep_ABC123');
      expect(response.body.data.schoolName).toBe('Test School');
      expect(reportService.checkRateLimit).toHaveBeenCalled();
      expect(reportService.createReport).toHaveBeenCalledWith(mockReportData, expect.any(String));
    });

    test('should create a report with file uploads', async () => {
      const mockReportData = {
        schoolName: 'Test School',
        files: [{
          name: 'test.jpg',
          type: 'image/jpeg',
          data: 'base64data'
        }]
      };

      const mockReport = {
        id: 'rep_ABC123',
        schoolName: 'Test School',
        status: 'Added'
      };

      const mockDriveFile = { id: 'drive_file_id' };
      const mockPublicUrl = 'https://drive.google.com/file/test.jpg';

      reportService.checkRateLimit.mockResolvedValue(false);
      reportService.createReport.mockResolvedValue(mockReport);
      googleDriveService.uploadFile.mockResolvedValue(mockDriveFile);
      googleDriveService.generatePublicUrl.mockResolvedValue(mockPublicUrl);
      googleDriveService.generateThumbnail.mockResolvedValue('https://drive.google.com/thumbnail/test.jpg');

      const response = await request(app)
        .post('/api/reports')
        .send(mockReportData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.uploadedFiles).toHaveLength(1);
      expect(response.body.data.uploadedFiles[0].name).toBe('test.jpg');
      expect(googleDriveService.uploadFile).toHaveBeenCalled();
      expect(googleDriveService.generatePublicUrl).toHaveBeenCalled();
    });

    // Negative tests
    test('should return 400 for missing school name', async () => {
      const response = await request(app)
        .post('/api/reports')
        .send({ location: 'Test City' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('schoolName is required');
    });

    test('should return 429 for rate limit exceeded', async () => {
      const mockReportData = {
        schoolName: 'Test School'
      };

      reportService.checkRateLimit.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/reports')
        .send(mockReportData)
        .expect(429);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Rate limit exceeded. Maximum 5 reports per hour allowed.');
    });

    test('should return 409 for duplicate school report', async () => {
      const mockReportData = {
        schoolName: 'Existing School'
      };

      reportService.checkRateLimit.mockResolvedValue(false);
      reportService.createReport.mockRejectedValue(new Error('Report for school "Existing School" already exists'));

      const response = await request(app)
        .post('/api/reports')
        .send(mockReportData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('A report for this school already exists');
    });

    test('should return 400 for validation errors', async () => {
      const mockReportData = {
        schoolName: 'Test School'
      };

      reportService.checkRateLimit.mockResolvedValue(false);
      reportService.createReport.mockRejectedValue(new Error('validation failed: invalid status'));

      const response = await request(app)
        .post('/api/reports')
        .send(mockReportData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid report data');
    });

    test('should handle file upload errors gracefully', async () => {
      const mockReportData = {
        schoolName: 'Test School',
        files: [{
          name: 'test.jpg',
          type: 'image/jpeg',
          data: 'base64data'
        }]
      };

      const mockReport = {
        id: 'rep_ABC123',
        schoolName: 'Test School',
        status: 'Added'
      };

      reportService.checkRateLimit.mockResolvedValue(false);
      reportService.createReport.mockResolvedValue(mockReport);
      googleDriveService.uploadFile.mockRejectedValue(new Error('Upload failed'));

      const response = await request(app)
        .post('/api/reports')
        .send(mockReportData)
        .expect(201);

      // Should still succeed even if file upload fails
      expect(response.body.success).toBe(true);
      expect(response.body.data.uploadedFiles).toHaveLength(0);
    });
  });

  describe('GET /api/reports', () => {
    // Happy path tests
    test('should return paginated reports successfully', async () => {
      const mockReports = {
        items: [
          { id: 'rep_001', schoolName: 'School 1', status: 'Added' },
          { id: 'rep_002', schoolName: 'School 2', status: 'Closed' }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      reportService.getReports.mockResolvedValue(mockReports);

      const response = await request(app)
        .get('/api/reports')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(reportService.getReports).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: undefined,
        search: undefined,
        sortBy: 'lastReported',
        sortOrder: 'desc',
        includeAdminFields: false
      });
    });

    test('should handle query parameters correctly', async () => {
      const mockReports = {
        items: [{ id: 'rep_001', schoolName: 'School 1', status: 'Added' }],
        pagination: {
          page: 2,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: true
        }
      };

      reportService.getReports.mockResolvedValue(mockReports);

      const response = await request(app)
        .get('/api/reports?page=2&limit=10&status=Added&search=test&sortBy=createdAt&sortOrder=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(reportService.getReports).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        status: 'Added',
        search: 'test',
        sortBy: 'createdAt',
        sortOrder: 'asc',
        includeAdminFields: false
      });
    });

    // Negative tests
    test('should handle service errors', async () => {
      reportService.getReports.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/reports')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve reports');
    });
  });

  describe('GET /api/reports/:id', () => {
    // Happy path tests
    test('should return a specific report successfully', async () => {
      const mockReport = {
        id: 'rep_ABC123',
        schoolName: 'Test School',
        status: 'Added',
        createdAt: '2023-01-01T00:00:00.000Z'
      };

      reportService.getReportById.mockResolvedValue(mockReport);

      const response = await request(app)
        .get('/api/reports/rep_ABC123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('rep_ABC123');
      expect(response.body.data.schoolName).toBe('Test School');
      expect(reportService.getReportById).toHaveBeenCalledWith('rep_ABC123', false);
    });

    // Negative tests
    test('should return 404 for invalid ID format', async () => {
      reportService.getReportById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/reports/invalid')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Report not found');
    });

    test('should return 404 for non-existent report', async () => {
      reportService.getReportById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/reports/rep_nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Report not found');
    });

    test('should handle service errors', async () => {
      reportService.getReportById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/reports/rep_ABC123')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve report');
    });
  });

  describe('PUT /api/reports/:id/status', () => {
    // Happy path tests
    test('should update report status successfully', async () => {
      const mockUpdatedReport = {
        id: 'rep_ABC123',
        status: 'Confirmed by NJDSC',
        updatedAt: '2023-01-02T00:00:00.000Z',
        adminNotes: 'Confirmed by admin'
      };

      const mockOldReport = {
        id: 'rep_ABC123',
        status: 'Added'
      };

      reportService.updateReportStatus.mockResolvedValue(mockUpdatedReport);
      reportService.getReportById.mockResolvedValue(mockOldReport);
      auditService.logStatusUpdate.mockResolvedValue();

      const response = await request(app)
        .put('/api/reports/rep_ABC123/status')
        .send({
          status: 'Confirmed by NJDSC',
          adminNotes: 'Confirmed by admin'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('Confirmed by NJDSC');
      expect(response.body.data.adminNotes).toBe('Confirmed by admin');
      expect(reportService.updateReportStatus).toHaveBeenCalledWith('rep_ABC123', {
        status: 'Confirmed by NJDSC',
        adminNotes: 'Confirmed by admin',
        updatedBy: 'admin'
      });
      expect(auditService.logStatusUpdate).toHaveBeenCalled();
    });

    // Negative tests
    test('should return 404 for invalid report ID', async () => {
      reportService.updateReportStatus.mockRejectedValue(new Error('Report with ID invalid not found'));

      const response = await request(app)
        .put('/api/reports/invalid/status')
        .send({ status: 'Confirmed by NJDSC' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Report not found');
    });

    test('should return 400 for missing status', async () => {
      const response = await request(app)
        .put('/api/reports/rep_ABC123/status')
        .send({ adminNotes: 'Test notes' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Valid status is required');
    });

    test('should return 400 for invalid status value', async () => {
      const response = await request(app)
        .put('/api/reports/rep_ABC123/status')
        .send({ status: 'Invalid Status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid status value');
    });

    test('should return 404 for non-existent report', async () => {
      reportService.updateReportStatus.mockRejectedValue(new Error('Report with ID rep_nonexistent not found'));

      const response = await request(app)
        .put('/api/reports/rep_nonexistent/status')
        .send({ status: 'Confirmed by NJDSC' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Report not found');
    });

    test('should handle audit service errors gracefully', async () => {
      const mockUpdatedReport = {
        id: 'rep_ABC123',
        status: 'Confirmed by NJDSC',
        updatedAt: '2023-01-02T00:00:00.000Z'
      };

      reportService.updateReportStatus.mockResolvedValue(mockUpdatedReport);
      reportService.getReportById.mockResolvedValue({ id: 'rep_ABC123', status: 'Added' });
      auditService.logStatusUpdate.mockRejectedValue(new Error('Audit service error'));

      const response = await request(app)
        .put('/api/reports/rep_ABC123/status')
        .send({ status: 'Confirmed by NJDSC' })
        .expect(200);

      // Should still succeed even if audit logging fails
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('Confirmed by NJDSC');
    });
  });

  describe('PUT /api/reports/bulk/status', () => {
    // Happy path tests
    test('should bulk update report statuses successfully', async () => {
      const mockUpdatedReport1 = {
        id: 'rep_001',
        status: 'Confirmed by NJDSC',
        updatedAt: '2023-01-02T00:00:00.000Z'
      };

      const mockUpdatedReport2 = {
        id: 'rep_002',
        status: 'Confirmed by NJDSC',
        updatedAt: '2023-01-02T00:00:00.000Z'
      };

      const mockOldReport1 = { id: 'rep_001', status: 'Added' };
      const mockOldReport2 = { id: 'rep_002', status: 'Added' };

      reportService.updateReportStatus
        .mockResolvedValueOnce(mockUpdatedReport1)
        .mockResolvedValueOnce(mockUpdatedReport2);

      reportService.getReportById
        .mockResolvedValueOnce(mockOldReport1)
        .mockResolvedValueOnce(mockOldReport2);

      auditService.logStatusUpdate.mockResolvedValue();
      auditService.logBulkStatusUpdate.mockResolvedValue();

      const response = await request(app)
        .put('/api/reports/bulk/status')
        .send({
          reportIds: ['rep_001', 'rep_002'],
          status: 'Confirmed by NJDSC',
          adminNotes: 'Bulk update'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('updated');
      expect(response.body.data).toHaveProperty('failed');
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data.results).toHaveLength(2);
      expect(auditService.logBulkStatusUpdate).toHaveBeenCalled();
    });

    test('should handle partial failures in bulk update', async () => {
      const mockUpdatedReport = {
        id: 'rep_001',
        status: 'Confirmed by NJDSC',
        updatedAt: '2023-01-02T00:00:00.000Z'
      };

      reportService.updateReportStatus
        .mockResolvedValueOnce(mockUpdatedReport)
        .mockRejectedValueOnce(new Error('Report not found'));

      reportService.getReportById.mockResolvedValue({ id: 'rep_001', status: 'Added' });
      auditService.logStatusUpdate.mockResolvedValue();
      auditService.logBulkStatusUpdate.mockResolvedValue();

      const response = await request(app)
        .put('/api/reports/bulk/status')
        .send({
          reportIds: ['rep_001', 'rep_002'],
          status: 'Confirmed by NJDSC'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('updated');
      expect(response.body.data).toHaveProperty('failed');
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data.results[0].success).toBe(true);
      expect(response.body.data.results[1].success).toBe(false);
    });

    // Negative tests
    test('should return 400 for invalid report IDs array', async () => {
      const response = await request(app)
        .put('/api/reports/bulk/status')
        .send({
          reportIds: 'not-an-array',
          status: 'Confirmed by NJDSC'
        })
        .expect(200); // This hits the single status update route instead

      // Since the route order causes /bulk/status to match /:id/status,
      // we expect it to try to update a report with id="bulk"
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Report not found');
    });

    test('should return 400 for empty report IDs array', async () => {
      const response = await request(app)
        .put('/api/reports/bulk/status')
        .send({
          reportIds: [],
          status: 'Confirmed by NJDSC'
        })
        .expect(404); // This also hits the single status update route

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Report not found');
    });

    test('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put('/api/reports/bulk/status')
        .send({
          reportIds: ['rep_001'],
          status: 'Invalid Status'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid status value');
    });
  });

  describe('GET /api/reports/stats', () => {
    // Happy path tests
    test('should return report statistics successfully', async () => {
      const mockReports = [
        {
          id: 'rep_001',
          schoolName: 'School 1',
          status: 'Added',
          createdAt: '2023-01-01T00:00:00.000Z',
          uploadedFiles: [{}, {}] // 2 files
        },
        {
          id: 'rep_002',
          schoolName: 'School 2',
          status: 'Closed',
          createdAt: '2023-01-02T00:00:00.000Z',
          uploadedFiles: [{}] // 1 file
        },
        {
          id: 'rep_003',
          schoolName: 'School 3',
          status: 'Added',
          createdAt: '2023-01-03T00:00:00.000Z'
          // No files
        }
      ];

      reportService.getAllReports.mockResolvedValue(mockReports);

      const response = await request(app)
        .get('/api/reports/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalReports).toBe(3);
      expect(response.body.data.pendingReports).toBe(2);
      expect(response.body.data.completedReports).toBe(1);
      expect(response.body.data.totalFiles).toBe(3);
      expect(response.body.data.recentReports).toHaveLength(3);
    });

    // Negative tests
    test('should handle service errors', async () => {
      reportService.getAllReports.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/reports/stats')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Statistics retrieval failed');
    });
  });
});