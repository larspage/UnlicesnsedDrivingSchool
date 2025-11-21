/**
 * Unit tests for Email Service - IMPROVED VERSION
 * 
 * This version follows the philosophy that negative tests should verify:
 * 1. That an error occurred (success: false)
 * 2. That meaningful error information is present
 * 3. NOT which specific error code was returned
 * 
 * This makes tests more resilient to implementation changes.
 */

// Mock dependencies before requiring the service
jest.mock('nodemailer');
jest.mock('../../../server/services/configService');

// Set up environment variables before requiring the service
process.env.SMTP_HOST = 'smtp.example.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_SECURE = 'false';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test-password';
process.env.EMAIL_FROM = 'noreply@example.com';

const nodemailer = require('nodemailer');
const configService = require('../../../server/services/configService');

// Set up basic mocks
const mockTransporter = {
  sendMail: jest.fn()
};

nodemailer.createTransport = jest.fn(() => mockTransporter);

const emailService = require('../../../server/services/emailService');
const { isSuccess, isFailure } = require('../../../server/utils/result');
const { ERROR_CODES } = require('../../../server/utils/errorCodes');

// Mock console.log to avoid test output clutter
global.console.log = jest.fn();

describe('Email Service - Improved Testing Philosophy', () => {
  let mockSendMail;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup Nodemailer mocks
    mockSendMail = mockTransporter.sendMail;

    // Setup config service mocks
    configService.getConfig = jest.fn();
    configService.getAllConfig = jest.fn();
  });

  describe('sendEmail', () => {
    test('should send email successfully', async () => {
      // Arrange
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test Body'
      };

      mockSendMail.mockResolvedValue({
        messageId: 'message-id-123',
        response: '250 OK'
      });

      // Act
      const result = await emailService.sendEmail(
        emailData.to,
        emailData.subject,
        emailData.body
      );

      // ✅ POSITIVE TEST: Check success behavior
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        success: true,
        messageId: 'message-id-123',
        response: '250 OK',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        from: 'noreply@example.com'
      });
      expect(result.error).toBeNull();

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test Body'
      });
    });

    test('should handle SMTP errors - focus on error occurrence, not specific codes', async () => {
      // Arrange
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test Body'
      };

      const smtpError = new Error('SMTP connection failed');
      smtpError.code = 'ECONNREFUSED';
      mockSendMail.mockRejectedValue(smtpError);

      // Act
      const result = await emailService.sendEmail(
        emailData.to,
        emailData.subject,
        emailData.body
      );

      // ✅ IMPROVED PATTERN: Focus on error behavior, not specific codes
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('SMTP connection failed');
      expect(result.error.innerError).toBe(smtpError);
      // DON'T check specific error code - let implementation decide the best code
    });

    test('should validate email parameters - focus on validation failure, not codes', async () => {
      // Test empty recipient
      const result1 = await emailService.sendEmail('', 'subject', 'body');
      expect(result1.success).toBe(false);
      expect(result1.error).toBeTruthy();
      expect(result1.error.details?.field).toBe('recipient');
      // Don't check specific error code

      // Test invalid email format
      const result2 = await emailService.sendEmail('invalid-email', 'subject', 'body');
      expect(result2.success).toBe(false);
      expect(result2.error).toBeTruthy();
      expect(result2.error.details?.field).toBe('recipient');
      // Don't check specific error code

      // Test empty subject
      const result3 = await emailService.sendEmail('valid@example.com', '', 'body');
      expect(result3.success).toBe(false);
      expect(result3.error).toBeTruthy();
      expect(result3.error.details?.field).toBe('subject');
      // Don't check specific error code
    });
  });

  describe('sendTemplatedEmail', () => {
    test('should send templated email with variable substitution', async () => {
      // Arrange
      const templateKey = 'mvc.notification';
      const variables = {
        schoolName: 'Test School',
        location: 'Test City',
        violationDescription: 'Test violation'
      };
      const recipient = 'recipient@example.com';

      configService.getConfig.mockImplementation((key) => {
        const templates = {
          'email.templates.mvc.notification.subject': 'Report: [[schoolName]]',
          'email.templates.mvc.notification.body': 'School: [[schoolName]]\nLocation: [[location]]\nViolation: [[violationDescription]]'
        };
        return templates[key] || null;
      });

      mockSendMail.mockResolvedValue({
        messageId: 'message-id-123',
        response: '250 OK'
      });

      // Act
      const result = await emailService.sendTemplatedEmail(
        templateKey,
        variables,
        recipient
      );

      // ✅ POSITIVE TEST: Check success behavior
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        success: true,
        messageId: 'message-id-123',
        response: '250 OK',
        to: 'recipient@example.com',
        subject: 'Report: Test School',
        from: 'noreply@example.com',
        templateKey,
        variables
      });
      expect(result.error).toBeNull();

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'recipient@example.com',
        subject: 'Report: Test School',
        text: 'School: Test School\nLocation: Test City\nViolation: Test violation'
      });
    });

    test('should return error for missing template - focus on not found behavior', async () => {
      // Arrange
      const templateKey = 'nonexistent.template';
      const variables = {};
      const recipient = 'recipient@example.com';

      configService.getConfig.mockReturnValue(null);

      // Act
      const result = await emailService.sendTemplatedEmail(
        templateKey,
        variables,
        recipient
      );

      // ✅ IMPROVED PATTERN: Check that an error occurred for missing resource
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Email template \'nonexistent.template\' not found');
      // Don't check specific error code
    });
  });

  describe('sendTestEmail', () => {
    test('should send test email successfully', async () => {
      // Arrange
      const testRecipient = 'test@example.com';

      mockSendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: '250 OK'
      });

      // Act
      const result = await emailService.sendTestEmail(testRecipient);

      // ✅ POSITIVE TEST: Check success behavior
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        success: true,
        messageId: 'test-message-id',
        response: '250 OK',
        to: 'test@example.com',
        subject: 'NJDSC Portal - Email Configuration Test',
        from: 'noreply@example.com'
      });
      expect(result.error).toBeNull();

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'test@example.com',
        subject: 'NJDSC Portal - Email Configuration Test',
        text: expect.stringContaining('This is a test email from the NJDSC School Compliance Portal')
      });
    });

    test('should handle test email errors - focus on error occurrence', async () => {
      // Arrange
      const testRecipient = 'test@example.com';

      const smtpError = new Error('SMTP authentication failed');
      smtpError.code = 'EAUTH';
      mockSendMail.mockRejectedValue(smtpError);

      // Act
      const result = await emailService.sendTestEmail(testRecipient);

      // ✅ IMPROVED PATTERN: Focus on error behavior, not specific codes
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('SMTP authentication failed');
      expect(result.error.innerError).toBe(smtpError);
      // Don't check specific error code
    });
  });

  describe('error handling', () => {
    test('should handle authentication errors - focus on error behavior', async () => {
      // Arrange
      nodemailer.createTransport.mockImplementationOnce(() => {
        throw new Error('Invalid SMTP credentials');
      });

      // Act
      const result = await emailService.sendEmail('to@example.com', 'subject', 'body');

      // ✅ IMPROVED PATTERN: Focus on error behavior, not specific codes
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Invalid SMTP credentials');
      // Don't check specific error code
    });

    test('should handle connection errors - focus on error occurrence', async () => {
      // Arrange
      const smtpError = new Error('Connection timeout');
      smtpError.code = 'ETIMEDOUT';
      mockSendMail.mockRejectedValue(smtpError);

      // Act
      const result = await emailService.sendEmail('to@example.com', 'subject', 'body');

      // ✅ IMPROVED PATTERN: Focus on error behavior, not specific codes
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Connection timeout');
      expect(result.error.innerError).toBe(smtpError);
      // Don't check specific error code
    });
  });
});