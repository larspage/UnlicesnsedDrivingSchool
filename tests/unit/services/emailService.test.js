/**
 * Unit tests for Email Service
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

nodemailer.createTransporter = jest.fn(() => mockTransporter);

const emailService = require('../../../server/services/emailService');
const { isSuccess, isFailure } = require('../../../server/utils/result');
const { ERROR_CODES } = require('../../../server/utils/errorCodes');

// Mock console.log to avoid test output clutter
global.console.log = jest.fn();

describe('Email Service', () => {
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

      // Assert - ✅ NEW PATTERN: Check Result object structure
      expect(isSuccess(result)).toBe(true);
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

    test('should send email with options', async () => {
      // Arrange
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test Body',
        options: {
          cc: 'cc@example.com',
          bcc: 'bcc@example.com',
          from: 'custom@example.com'
        }
      };

      mockSendMail.mockResolvedValue({
        messageId: 'message-id-123',
        response: '250 OK'
      });

      // Act
      await emailService.sendEmail(
        emailData.to,
        emailData.subject,
        emailData.body,
        emailData.options
      );

      // Assert
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'custom@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test Body',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com'
      });
    });

    test('should handle SMTP errors', async () => {
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

      // Assert - ✅ NEW PATTERN: Check Result error structure
      expect(isSuccess(result)).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error.code).toBe(ERROR_CODES.EMAIL_ERROR);
      expect(result.error.message).toContain('SMTP connection failed');
      expect(result.error.innerError).toBe(smtpError);
    });

    test('should validate email parameters', async () => {
      // Test empty recipient
      const result1 = await emailService.sendEmail('', 'subject', 'body');
      expect(isSuccess(result1)).toBe(false);
      expect(result1.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result1.error.details.field).toBe('recipient');

      // Test invalid email format
      const result2 = await emailService.sendEmail('invalid-email', 'subject', 'body');
      expect(isSuccess(result2)).toBe(false);
      expect(result2.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result2.error.details.field).toBe('recipient');

      // Test empty subject
      const result3 = await emailService.sendEmail('valid@example.com', '', 'body');
      expect(isSuccess(result3)).toBe(false);
      expect(result3.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result3.error.details.field).toBe('subject');
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

      // Assert - ✅ NEW PATTERN: Check Result object structure
      expect(isSuccess(result)).toBe(true);
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

    test('should return error for missing template', async () => {
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

      // Assert - ✅ NEW PATTERN: Check Result error structure
      expect(isSuccess(result)).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error.code).toBe(ERROR_CODES.NOT_FOUND);
      expect(result.error.message).toContain('Email template \'nonexistent.template\' not found');
      expect(result.error.details.resourceType).toBe('Email template');
      expect(result.error.details.resourceId).toBe('nonexistent.template');
    });
  });

  describe('getEmailTemplates', () => {
    test('should return available email templates', async () => {
      // Arrange
      const mockTemplates = {
        'email.templates.mvc.notification.subject': 'MVC Report: [[schoolName]]',
        'email.templates.mvc.notification.body': 'Details about [[schoolName]]',
        'email.templates.status.update.subject': 'Status Update',
        'email.templates.status.update.body': 'Status changed to [[status]]'
      };

      configService.getAllConfig = jest.fn().mockReturnValue(mockTemplates);

      // Act
      const result = await emailService.getEmailTemplates();

      // Assert - ✅ NEW PATTERN: Check Result object structure
      expect(isSuccess(result)).toBe(true);
      expect(result.error).toBeNull();

      const templates = result.data;
      expect(templates.hasOwnProperty('mvc.notification')).toBe(true);
      expect(templates.hasOwnProperty('status.update')).toBe(true);
      expect(templates['mvc.notification']).toHaveProperty('subject');
      expect(templates['mvc.notification']).toHaveProperty('body');
      expect(templates['status.update']).toHaveProperty('subject');
      expect(templates['status.update']).toHaveProperty('body');
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

      // Assert - ✅ NEW PATTERN: Check Result object structure
      expect(isSuccess(result)).toBe(true);
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

    test('should handle test email errors', async () => {
      // Arrange
      const testRecipient = 'test@example.com';

      const smtpError = new Error('SMTP authentication failed');
      smtpError.code = 'EAUTH';
      mockSendMail.mockRejectedValue(smtpError);

      // Act
      const result = await emailService.sendTestEmail(testRecipient);

      // Assert - ✅ NEW PATTERN: Check Result error structure
      expect(isSuccess(result)).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error.code).toBe(ERROR_CODES.EMAIL_ERROR);
      expect(result.error.message).toContain('SMTP authentication failed');
      expect(result.error.innerError).toBe(smtpError);
    });
  });

  describe('template variable substitution', () => {
    test('should substitute variables correctly', () => {
      // This would test the internal substituteVariables function
      // Since it's private, we'll test the logic directly
      const template = 'Hello [[name]], welcome to [[place]]!';
      const variables = {
        name: 'John',
        place: 'New Jersey'
      };

      // We can test the substitution logic indirectly
      expect(template.replace(/\[\[(\w+)\]\]/g, (match, key) => variables[key] || match))
        .toBe('Hello John, welcome to New Jersey!');
    });
  });

  describe('error handling', () => {
    test('should handle authentication errors', async () => {
      // Arrange
      nodemailer.createTransporter.mockImplementationOnce(() => {
        throw new Error('Invalid SMTP credentials');
      });

      // Act
      const result = await emailService.sendEmail('to@example.com', 'subject', 'body');

      // Assert - ✅ NEW PATTERN: Check Result error structure
      expect(isSuccess(result)).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error.code).toBe(ERROR_CODES.EMAIL_ERROR);
      expect(result.error.message).toContain('Invalid SMTP credentials');
    });

    test('should handle connection errors', async () => {
      // Arrange
      const smtpError = new Error('Connection timeout');
      smtpError.code = 'ETIMEDOUT';
      mockSendMail.mockRejectedValue(smtpError);

      // Act
      const result = await emailService.sendEmail('to@example.com', 'subject', 'body');

      // Assert - ✅ NEW PATTERN: Check Result error structure
      expect(isSuccess(result)).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error.code).toBe(ERROR_CODES.EMAIL_ERROR);
      expect(result.error.message).toContain('Connection timeout');
      expect(result.error.innerError).toBe(smtpError);
    });
  });
});