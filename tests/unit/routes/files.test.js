/**
 * File Routes Tests for NJDSC School Compliance Portal
 *
 * Tests for file upload, retrieval, and management endpoints.
 */

// Set up environment variables before requiring any services
process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
  type: 'service_account',
  project_id: 'test-project',
  private_key_id: 'test-key-id',
  private_key: '-----BEGIN PRIVATE KEY-----\ntest-private-key\n-----END PRIVATE KEY-----\n',
  client_email: 'test@test-project.iam.gserviceaccount.com',
  client_id: 'test-client-id',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs'
});
process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test_spreadsheet_id';

const request = require('supertest');
const express = require('express');
const fileRoutes = require('../../../server/routes/files');
const fileService = require('../../../server/services/fileService');
const configService = require('../../../server/services/configService');
const googleSheetsService = require('../../../server/services/googleSheetsService');

// Mock the services
jest.mock('../../../server/services/fileService');
jest.mock('../../../server/services/configService');
jest.mock('../../../server/services/googleSheetsService');

const app = express();
app.use(express.json());
app.use('/files', fileRoutes);

describe('File Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock environment variables
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = 'test_spreadsheet_id';

    // Mock config service
    configService.getConfig.mockResolvedValue(null);

    // Mock google sheets service
    googleSheetsService.getAllRows.mockResolvedValue([]);
    googleSheetsService.appendRow.mockResolvedValue(undefined);
    googleSheetsService.updateRow.mockResolvedValue(undefined);

    // Mock file service functions
    fileService.validateFileUpload.mockResolvedValue({ isValid: true });
    fileService.getFileById.mockResolvedValue(null);
    fileService.getFilesByReportId.mockResolvedValue([]);
    fileService.getAllFiles.mockResolvedValue([]);
    fileService.updateFileProcessingStatus.mockResolvedValue({});
  });

  describe('POST /files/upload', () => {
    const mockFiles = [
      {
        buffer: Buffer.from('test file content'),
        originalname: 'test1.jpg',
        mimetype: 'image/jpeg',
        size: 1024
      },
      {
        buffer: Buffer.from('test file content 2'),
        originalname: 'test2.png',
        mimetype: 'image/png',
        size: 2048
      }
    ];

    const mockUploadedFiles = [
      {
        id: 'file_abc123',
        originalName: 'test1.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        driveFileId: 'drive123',
        driveUrl: 'https://drive.google.com/uc?export=download&id=drive123',
        thumbnailUrl: 'https://drive.google.com/thumbnail?id=drive123&sz=s400',
        uploadedAt: '2024-01-01T00:00:00.000Z',
        reportId: 'rep_xyz789',
        processingStatus: 'pending'
      },
      {
        id: 'file_def456',
        originalName: 'test2.png',
        mimeType: 'image/png',
        size: 2048,
        driveFileId: 'drive456',
        driveUrl: 'https://drive.google.com/uc?export=download&id=drive456',
        thumbnailUrl: 'https://drive.google.com/thumbnail?id=drive456&sz=s400',
        uploadedAt: '2024-01-01T00:00:01.000Z',
        reportId: 'rep_xyz789',
        processingStatus: 'pending'
      }
    ];

    it('should upload files successfully', async () => {
      fileService.uploadFile.mockResolvedValueOnce(mockUploadedFiles[0]);
      fileService.uploadFile.mockResolvedValueOnce(mockUploadedFiles[1]);

      const response = await request(app)
        .post('/files/upload')
        .field('reportId', 'rep_xyz789')
        .attach('files', mockFiles[0].buffer, 'test1.jpg')
        .attach('files', mockFiles[1].buffer, 'test2.png');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toHaveLength(2);
      expect(response.body.data.totalUploaded).toBe(2);
      expect(response.body.data.totalRequested).toBe(2);
    });

    it('should return 400 if reportId is missing', async () => {
      const response = await request(app)
        .post('/files/upload')
        .attach('files', mockFiles[0].buffer, 'test1.jpg');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('reportId is required');
    });

    it('should return 400 if no files are provided', async () => {
      const response = await request(app)
        .post('/files/upload')
        .field('reportId', 'rep_xyz789');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No files provided');
    });

    it('should return 400 if reportId format is invalid', async () => {
      const response = await request(app)
        .post('/files/upload')
        .field('reportId', 'invalid_format')
        .attach('files', mockFiles[0].buffer, 'test1.jpg');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid reportId format');
    });

    it('should handle upload errors gracefully', async () => {
      fileService.uploadFile.mockRejectedValue(new Error('Upload failed'));

      const response = await request(app)
        .post('/files/upload')
        .field('reportId', 'rep_xyz789')
        .attach('files', mockFiles[0].buffer, 'test1.jpg');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to upload any files');
    });
  });

  describe('GET /files/:id', () => {
    const mockFile = {
      id: 'file_abc123',
      originalName: 'test.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      driveFileId: 'drive123',
      driveUrl: 'https://drive.google.com/uc?export=download&id=drive123',
      thumbnailUrl: 'https://drive.google.com/thumbnail?id=drive123&sz=s400',
      uploadedAt: '2024-01-01T00:00:00.000Z',
      reportId: 'rep_xyz789',
      processingStatus: 'completed'
    };

    it('should get file by ID successfully', async () => {
      fileService.getFileById.mockResolvedValue(mockFile);

      const response = await request(app)
        .get('/files/file_abc123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('file_abc123');
      expect(response.body.data.name).toBe('test.jpg');
      expect(fileService.getFileById).toHaveBeenCalledWith('file_abc123');
    });

    it('should return 404 if file not found', async () => {
      fileService.getFileById.mockResolvedValue(null);

      const response = await request(app)
        .get('/files/file_abc123');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File not found');
    });

    it('should return 400 if file ID format is invalid', async () => {
      const response = await request(app)
        .get('/files/invalid_format');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid file ID format');
    });
  });

  describe('GET /files/report/:reportId', () => {
    const mockFiles = [
      {
        id: 'file_abc123',
        originalName: 'test1.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        driveFileId: 'drive123',
        driveUrl: 'https://drive.google.com/uc?export=download&id=drive123',
        thumbnailUrl: 'https://drive.google.com/thumbnail?id=drive123&sz=s400',
        uploadedAt: '2024-01-01T00:00:00.000Z',
        reportId: 'rep_xyz789',
        processingStatus: 'completed'
      },
      {
        id: 'file_def456',
        originalName: 'test2.png',
        mimeType: 'image/png',
        size: 2048,
        driveFileId: 'drive456',
        driveUrl: 'https://drive.google.com/uc?export=download&id=drive456',
        thumbnailUrl: 'https://drive.google.com/thumbnail?id=drive456&sz=s400',
        uploadedAt: '2024-01-01T00:00:01.000Z',
        reportId: 'rep_xyz789',
        processingStatus: 'completed'
      }
    ];

    it('should get files by report ID successfully', async () => {
      fileService.getFilesByReportId.mockResolvedValue(mockFiles);

      const response = await request(app)
        .get('/files/report/rep_xyz789');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(fileService.getFilesByReportId).toHaveBeenCalledWith('rep_xyz789');
    });

    it('should return 400 if report ID format is invalid', async () => {
      const response = await request(app)
        .get('/files/report/invalid_format');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid report ID format');
    });
  });

  describe('GET /files', () => {
    const mockFiles = [
      {
        id: 'file_abc123',
        originalName: 'test1.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        driveFileId: 'drive123',
        driveUrl: 'https://drive.google.com/uc?export=download&id=drive123',
        thumbnailUrl: 'https://drive.google.com/thumbnail?id=drive123&sz=s400',
        uploadedAt: '2024-01-01T00:00:00.000Z',
        reportId: 'rep_xyz789',
        processingStatus: 'completed'
      }
    ];

    it('should get all files successfully', async () => {
      fileService.getAllFiles.mockResolvedValue(mockFiles);

      const response = await request(app)
        .get('/files');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
      expect(fileService.getAllFiles).toHaveBeenCalled();
    });
  });

  describe('PUT /files/:id/status', () => {
    const mockUpdatedFile = {
      id: 'file_abc123',
      originalName: 'test.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
      driveFileId: 'drive123',
      driveUrl: 'https://drive.google.com/uc?export=download&id=drive123',
      thumbnailUrl: 'https://drive.google.com/thumbnail?id=drive123&sz=s400',
      uploadedAt: '2024-01-01T00:00:00.000Z',
      reportId: 'rep_xyz789',
      processingStatus: 'completed'
    };

    it('should update file status successfully', async () => {
      fileService.updateFileProcessingStatus.mockResolvedValue(mockUpdatedFile);

      const response = await request(app)
        .put('/files/file_abc123/status')
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.processingStatus).toBe('completed');
      expect(fileService.updateFileProcessingStatus).toHaveBeenCalledWith('file_abc123', 'completed');
    });

    it('should return 400 if status is missing', async () => {
      const response = await request(app)
        .put('/files/file_abc123/status')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Status is required');
    });

    it('should return 400 if status is invalid', async () => {
      const response = await request(app)
        .put('/files/file_abc123/status')
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid status');
    });

    it('should return 404 if file not found', async () => {
      fileService.updateFileProcessingStatus.mockRejectedValue(new Error('File with ID file_abc123 not found'));

      const response = await request(app)
        .put('/files/file_abc123/status')
        .send({ status: 'completed' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File not found');
    });
  });
});