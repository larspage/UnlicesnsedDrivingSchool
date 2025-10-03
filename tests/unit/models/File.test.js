/**
 * Unit tests for File model
 */

const File = require('../../../server/models/File');

describe('File Model', () => {
  describe('constructor and validation', () => {
    test('should create a valid file', () => {
      const data = {
        id: 'file_ABC123',
        reportId: 'rep_DEF456',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        localFilePath: 'uploads/rep_DEF456/test.jpg',
        publicUrl: '/uploads/rep_DEF456/test.jpg',
        uploadedAt: '2025-09-26T21:25:00.000Z',
        processingStatus: 'completed'
      };

      const file = new File(data);

      expect(file.id).toBe('file_ABC123');
      expect(file.reportId).toBe('rep_DEF456');
      expect(file.originalName).toBe('test.jpg');
      expect(file.mimeType).toBe('image/jpeg');
      expect(file.localFilePath).toBe('uploads/rep_DEF456/test.jpg');
      expect(file.publicUrl).toBe('/uploads/rep_DEF456/test.jpg');
      expect(file.processingStatus).toBe('completed');
    });

    test('should throw error for invalid data', () => {
      const invalidData = {
        id: 'invalid_id',
        reportId: 'invalid_report',
        originalName: '',
        mimeType: 'invalid/type',
        size: -1
      };

      expect(() => new File(invalidData)).toThrow();
    });
  });

  describe('generateId', () => {
    test('should generate valid file ID format', () => {
      const id = File.generateId();
      expect(id).toMatch(/^file_[a-zA-Z0-9]{6}$/);
    });
  });

  describe('validateUploadParams', () => {
    test('should validate valid upload parameters', () => {
      const buffer = Buffer.from('test data');
      const result = File.validateUploadParams(buffer, 'test.jpg', 'image/jpeg', 'rep_ABC123');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject invalid file buffer', () => {
      const result = File.validateUploadParams('not a buffer', 'test.jpg', 'image/jpeg', 'rep_ABC123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file buffer');
    });

    test('should reject unsupported MIME type', () => {
      const buffer = Buffer.from('test data');
      const result = File.validateUploadParams(buffer, 'test.exe', 'application/x-msdownload', 'rep_ABC123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported file type');
    });

    test('should reject file too large', () => {
      const largeBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
      const result = File.validateUploadParams(largeBuffer, 'large.jpg', 'image/jpeg', 'rep_ABC123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too large');
    });
  });

  describe('create', () => {
    test('should create file with generated ID and timestamps', () => {
      const data = {
        reportId: 'rep_ABC123',
        originalName: 'upload.jpg',
        mimeType: 'image/jpeg',
        size: 2048000,
        localFilePath: 'uploads/rep_ABC123/upload.jpg',
        publicUrl: '/uploads/rep_ABC123/upload.jpg'
      };

      const file = File.create(data, '127.0.0.1');

      expect(file.id).toMatch(/^file_[a-zA-Z0-9]{6}$/);
      expect(file.reportId).toBe('rep_ABC123');
      expect(file.originalName).toBe('upload.jpg');
      expect(file.localFilePath).toBe('uploads/rep_ABC123/upload.jpg');
      expect(file.publicUrl).toBe('/uploads/rep_ABC123/upload.jpg');
      expect(file.processingStatus).toBe('pending');
      expect(file.uploadedAt).toBeDefined();
      expect(file.uploadedByIp).toBe('127.0.0.1');
    });
  });

  describe('URL generation', () => {
    test('should generate public URL', () => {
      const url = File.generatePublicUrl('uploads/rep_ABC123/test.jpg');
      expect(url).toBe('/uploads/rep_ABC123/test.jpg');
    });

    test('should generate thumbnail URL', () => {
      const url = File.generateThumbnailUrl('uploads/rep_ABC123/test.jpg');
      expect(url).toBe('/uploads/rep_ABC123/test.jpg');
    });
  });

  describe('file type methods', () => {
    test('should identify image files', () => {
      const imageFile = new File({
        id: 'file_ABC123',
        reportId: 'rep_DEF456',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        localFilePath: 'uploads/rep_DEF456/test.jpg',
        publicUrl: '/uploads/rep_DEF456/test.jpg',
        uploadedAt: '2025-09-26T21:25:00.000Z',
        processingStatus: 'completed'
      });

      expect(imageFile.isImage()).toBe(true);
      expect(imageFile.isVideo()).toBe(false);
      expect(imageFile.isDocument()).toBe(false);
      expect(imageFile.getFileTypeCategory()).toBe('image');
    });

    test('should identify video files', () => {
      const videoFile = new File({
        id: 'file_ABC123',
        reportId: 'rep_DEF456',
        originalName: 'test.mp4',
        mimeType: 'video/mp4',
        size: 1024000,
        localFilePath: 'uploads/rep_DEF456/test.mp4',
        publicUrl: '/uploads/rep_DEF456/test.mp4',
        uploadedAt: '2025-09-26T21:25:00.000Z',
        processingStatus: 'completed'
      });

      expect(videoFile.isImage()).toBe(false);
      expect(videoFile.isVideo()).toBe(true);
      expect(videoFile.isDocument()).toBe(false);
      expect(videoFile.getFileTypeCategory()).toBe('video');
    });
  });


  describe('updateProcessingStatus', () => {
    test('should update processing status', () => {
      const data = {
        id: 'file_ABC123',
        reportId: 'rep_DEF456',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        localFilePath: 'uploads/rep_DEF456/test.jpg',
        publicUrl: '/uploads/rep_DEF456/test.jpg',
        uploadedAt: '2025-09-26T21:25:00.000Z',
        processingStatus: 'pending'
      };

      const file = new File(data);
      const updatedFile = file.updateProcessingStatus('completed');

      expect(updatedFile.processingStatus).toBe('completed');
      expect(updatedFile.id).toBe(file.id);
    });

    test('should throw error for invalid status', () => {
      const file = new File({
        id: 'file_ABC123',
        reportId: 'rep_DEF456',
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        localFilePath: 'uploads/rep_DEF456/test.jpg',
        publicUrl: '/uploads/rep_DEF456/test.jpg',
        uploadedAt: '2025-09-26T21:25:00.000Z',
        processingStatus: 'pending'
      });

      expect(() => file.updateProcessingStatus('invalid')).toThrow('Invalid processing status');
    });
  });

  describe('getters', () => {
    test('should return supported MIME types', () => {
      const types = File.getSupportedMimeTypes();
      expect(types.images).toContain('image/jpeg');
      expect(types.videos).toContain('video/mp4');
      expect(types.documents).toContain('application/pdf');
    });

    test('should return processing status enum', () => {
      const statusEnum = File.getProcessingStatusEnum();
      expect(statusEnum.PENDING).toBe('pending');
      expect(statusEnum.COMPLETED).toBe('completed');
    });

    test('should return max file size', () => {
      const maxSize = File.getMaxFileSize();
      expect(maxSize).toBe(10 * 1024 * 1024); // 10MB
    });
  });
});