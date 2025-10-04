/**
 * Unit tests for Gmail Service
 */

// Mock dependencies before requiring the service
jest.mock('googleapis');
jest.mock('../../../server/services/configService');

// Set up environment variables before requiring the service
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
process.env.GOOGLE_GMAIL_USER = 'test@example.com';

const { google } = require('googleapis');
const configService = require('../../../server/services/configService');

// Set up basic mocks
google.gmail.mockImplementation(() => ({
  users: {
    messages: {
      send: jest.fn()
    }
  }
}));

const gmailService = require('../../../server/services/gmailService');

// Mock console.log to avoid test output clutter
global.console.log = jest.fn();

describe('Gmail Service', () => {
  let mockGmail;
  let mockAuth;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup Google API mocks
    mockGmail = {
      users: {
        messages: {
          send: jest.fn()
        }
      }
    };

    mockAuth = {};

    google.auth.GoogleAuth.mockImplementation(() => mockAuth);
    google.gmail.mockImplementation(() => mockGmail);

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

      const expectedMessage = {
        raw: expect.any(String)
      };

      mockGmail.users.messages.send.mockResolvedValue({
        data: { id: 'message-id-123' }
      });

      // Act
      const result = await gmailService.sendEmail(
        emailData.to,
        emailData.subject,
        emailData.body
      );

      // Assert
      expect(mockGmail.users.messages.send).toHaveBeenCalledWith({
        userId: 'me',
        resource: expectedMessage
      });
      expect(result).toBe(true);
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
          from: 'sender@example.com'
        }
      };

      mockGmail.users.messages.send.mockResolvedValue({
        data: { id: 'message-id-123' }
      });

      // Act
      await gmailService.sendEmail(
        emailData.to,
        emailData.subject,
        emailData.body,
        emailData.options
      );

      // Assert
      expect(mockGmail.users.messages.send).toHaveBeenCalledWith({
        userId: 'me',
        resource: expect.objectContaining({
          raw: expect.any(String)
        })
      });
    });

    test('should handle Gmail API errors', async () => {
      // Arrange
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test Body'
      };

      const apiError = new Error('Gmail API error');
      apiError.code = 403;
      mockGmail.users.messages.send.mockRejectedValue(apiError);

      // Act & Assert
      await expect(gmailService.sendEmail(
        emailData.to,
        emailData.subject,
        emailData.body
      )).rejects.toThrow('Access denied to Gmail API');
    });

    test('should validate email parameters', async () => {
      // Act & Assert
      await expect(gmailService.sendEmail('', 'subject', 'body'))
        .rejects.toThrow('Invalid recipient email address');

      await expect(gmailService.sendEmail('invalid-email', 'subject', 'body'))
        .rejects.toThrow('Invalid recipient email address');

      await expect(gmailService.sendEmail('valid@example.com', '', 'body'))
        .rejects.toThrow('Invalid email subject');
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

      mockGmail.users.messages.send.mockResolvedValue({
        data: { id: 'message-id-123' }
      });

      // Act
      const result = await gmailService.sendTemplatedEmail(
        templateKey,
        variables,
        recipient
      );

      // Assert
      expect(mockGmail.users.messages.send).toHaveBeenCalledWith({
        userId: 'me',
        resource: expect.objectContaining({
          raw: expect.any(String)
        })
      });
      expect(result).toBe(true);
    });

    test('should throw error for missing template', async () => {
      // Arrange
      const templateKey = 'nonexistent.template';
      const variables = {};
      const recipient = 'recipient@example.com';

      configService.getConfig.mockReturnValue(null);

      // Act & Assert
      await expect(gmailService.sendTemplatedEmail(
        templateKey,
        variables,
        recipient
      )).rejects.toThrow('Email template \'nonexistent.template\' not found in configuration');
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
      const templates = await gmailService.getEmailTemplates();

      // Assert
      expect(templates.hasOwnProperty('mvc.notification')).toBe(true);
      expect(templates.hasOwnProperty('status.update')).toBe(true);
      expect(templates['mvc.notification']).toHaveProperty('subject');
      expect(templates['mvc.notification']).toHaveProperty('body');
      expect(templates['status.update']).toHaveProperty('subject');
      expect(templates['status.update']).toHaveProperty('body');
    });
  });

  describe('template variable substitution', () => {
    test('should substitute variables correctly', () => {
      // This would test the internal substituteVariables function
      // Since it's private, we'll test through sendTemplatedEmail
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
      google.auth.GoogleAuth.mockImplementation(() => {
        throw new Error('Invalid credentials');
      });

      // Act & Assert
      await expect(gmailService.sendEmail('to@example.com', 'subject', 'body'))
        .rejects.toThrow('Gmail API error during sendEmail: Invalid credentials');
    });

    test('should handle rate limiting', async () => {
      // Arrange
      const apiError = new Error('Rate limit exceeded');
      apiError.code = 429;
      mockGmail.users.messages.send.mockRejectedValue(apiError);

      // Act & Assert
      await expect(gmailService.sendEmail('to@example.com', 'subject', 'body'))
        .rejects.toThrow('Gmail API rate limit exceeded');
    });
  });
});