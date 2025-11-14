/**
 * Email Service for NJDSC School Compliance Portal
 *
 * Handles email sending functionality using Nodemailer with SMTP.
 * Supports templated emails with variable substitution for MVC notifications and status updates.
 */

const nodemailer = require('nodemailer');
const configService = require('./configService');
const { success, failure, attempt, attemptAsync, isSuccess } = require('../utils/result');
const { validationError, notFoundError, databaseError, validateRequired, ERROR_CODES } = require('../utils/errorUtils');

// Environment variables
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;

// Validate required environment variables
if (!SMTP_HOST) {
  console.warn('SMTP_HOST environment variable not provided. Email functionality will be disabled.');
}

if (!SMTP_USER) {
  console.warn('SMTP_USER environment variable not provided. Email functionality will be disabled.');
}

if (!SMTP_PASS) {
  console.warn('SMTP_PASS environment variable not provided. Email functionality will be disabled.');
}

// Create transporter lazily
let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      throw new Error('Email service not configured. Missing SMTP credentials.');
    }

    transporter = nodemailer.createTransporter({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      },
      // Additional security options
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates in development
      }
    });
  }
  return transporter;
}

/**
 * Validates email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates email parameters
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @throws {Error} If validation fails
 */
function validateEmailParams(to, subject, body) {
  if (!to || typeof to !== 'string' || !isValidEmail(to)) {
    throw new Error('Invalid recipient email address');
  }

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    throw new Error('Invalid email subject: must be a non-empty string');
  }

  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    throw new Error('Invalid email body: must be a non-empty string');
  }
}

/**
 * Logs operation details for debugging and monitoring
 * @param {string} operation - Operation name
 * @param {Object} details - Additional details to log
 */
function logOperation(operation, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] EmailService.${operation}:`, details);
}

/**
 * Handles email sending errors
 * @param {Error} error - Error from email service
 * @param {string} operation - Operation that failed
 * @throws {Error} Processed error with context
 */
function handleEmailError(error, operation) {
  logOperation(operation, { error: error.message, code: error.code });

  if (error.code === 'EAUTH') {
    throw new Error('Email authentication failed. Check SMTP credentials.');
  } else if (error.code === 'ECONNREFUSED') {
    throw new Error('Cannot connect to email server. Check SMTP host and port.');
  } else if (error.code === 'ETIMEDOUT') {
    throw new Error('Email server connection timed out.');
  } else if (error.code === 'EENVELOPE') {
    throw new Error('Invalid email envelope. Check sender and recipient addresses.');
  } else {
    throw new Error(`Email error during ${operation}: ${error.message}`);
  }
}

/**
 * Substitutes variables in template text
 * @param {string} template - Template text with [[variable]] placeholders
 * @param {Object} variables - Variable key-value pairs
 * @returns {string} Text with variables substituted
 */
function substituteVariables(template, variables) {
  return template.replace(/\[\[(\w+)\]\]/g, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
}

/**
 * Sends an email using SMTP
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body (plain text)
 * @param {Object} [options] - Additional options
 * @param {string} [options.cc] - CC recipients
 * @param {string} [options.bcc] - BCC recipients
 * @param {string} [options.from] - Sender email address
 * @returns {Promise<Result<Object>>} Email result or error
 */
async function sendEmail(to, subject, body, options = {}) {
  return attemptAsync(async () => {
    // Structured input validation
    const toError = validateRequired(to, 'Recipient email', 'valid email address');
    if (toError) throw toError;

    if (typeof to !== 'string' || !isValidEmail(to)) {
      throw validationError('to', 'Recipient email must be a valid email address', to, 'email');
    }

    const subjectError = validateRequired(subject, 'Email subject', 'non-empty string');
    if (subjectError) throw subjectError;

    if (typeof subject !== 'string' || subject.trim().length === 0) {
      throw validationError('subject', 'Email subject must be a non-empty string', subject, 'string');
    }

    const bodyError = validateRequired(body, 'Email body', 'non-empty string');
    if (bodyError) throw bodyError;

    if (typeof body !== 'string' || body.trim().length === 0) {
      throw validationError('body', 'Email body must be a non-empty string', body, 'string');
    }

    const mailOptions = {
      from: options.from || EMAIL_FROM,
      to,
      subject,
      text: body
    };

    // Add optional fields
    if (options.cc) mailOptions.cc = options.cc;
    if (options.bcc) mailOptions.bcc = options.bcc;

    logOperation('sendEmail', {
      to,
      subject: subject.substring(0, 50) + (subject.length > 50 ? '...' : ''),
      hasOptions: !!options.cc || !!options.bcc || !!options.from
    });

    const info = await getTransporter().sendMail(mailOptions);

    logOperation('sendEmail', {
      success: true,
      messageId: info.messageId,
      response: info.response
    });

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
      to,
      subject,
      from: mailOptions.from
    };

  }, { operation: 'sendEmail', details: {
    to: to?.trim(),
    subject: subject?.trim(),
    hasBody: !!body?.trim(),
    hasOptions: !!options.cc || !!options.bcc || !!options.from
  } });
}

/**
 * Sends a templated email with variable substitution
 * @param {string} templateKey - Template key (e.g., 'mvc.notification')
 * @param {Object} variables - Variables for substitution
 * @param {string} recipient - Primary recipient email
 * @param {Object} [options] - Additional options
 * @returns {Promise<Result<Object>>} Email result or error
 */
async function sendTemplatedEmail(templateKey, variables, recipient, options = {}) {
  return attemptAsync(async () => {
    // Structured input validation
    const templateKeyError = validateRequired(templateKey, 'Template key', 'non-empty string');
    if (templateKeyError) throw templateKeyError;

    if (typeof templateKey !== 'string' || templateKey.trim().length === 0) {
      throw validationError('templateKey', 'Template key must be a non-empty string', templateKey, 'string');
    }

    const variablesError = validateRequired(variables, 'Template variables', 'object');
    if (variablesError) throw variablesError;

    if (typeof variables !== 'object' || variables === null) {
      throw validationError('variables', 'Template variables must be an object', variables, 'object');
    }

    const recipientError = validateRequired(recipient, 'Recipient email', 'valid email address');
    if (recipientError) throw recipientError;

    if (typeof recipient !== 'string' || !isValidEmail(recipient)) {
      throw validationError('recipient', 'Recipient must be a valid email address', recipient, 'email');
    }

    // Get template from configuration
    const subjectTemplateResult = await configService.getConfig(`email.templates.${templateKey}.subject`);
    if (!isSuccess(subjectTemplateResult)) {
      throw databaseError(`Failed to retrieve subject template for ${templateKey}`, subjectTemplateResult.error);
    }
    const subjectTemplate = subjectTemplateResult.data;

    const bodyTemplateResult = await configService.getConfig(`email.templates.${templateKey}.body`);
    if (!isSuccess(bodyTemplateResult)) {
      throw databaseError(`Failed to retrieve body template for ${templateKey}`, bodyTemplateResult.error);
    }
    const bodyTemplate = bodyTemplateResult.data;

    if (!subjectTemplate || !bodyTemplate) {
      throw notFoundError('Email template', templateKey, {
        subjectExists: !!subjectTemplate,
        bodyExists: !!bodyTemplate
      });
    }

    // Substitute variables
    const subject = substituteVariables(subjectTemplate, variables);
    const body = substituteVariables(bodyTemplate, variables);

    logOperation('sendTemplatedEmail', {
      templateKey,
      recipient,
      variableCount: Object.keys(variables).length
    });

    // Send the email
    const emailResult = await sendEmail(recipient, subject, body, options);
    if (!isSuccess(emailResult)) {
      throw emailResult.error;
    }

    return {
      ...emailResult.data,
      templateKey,
      variables
    };

  }, { operation: 'sendTemplatedEmail', details: {
    templateKey,
    recipient,
    variableCount: variables ? Object.keys(variables).length : 0,
    hasOptions: Object.keys(options || {}).length > 0
  } });
}

/**
 * Retrieves available email templates from configuration
 * @returns {Promise<Result<Object>>} Object with template keys and their subject/body or error
 */
async function getEmailTemplates() {
  return attemptAsync(async () => {
    logOperation('getEmailTemplates');

    const allConfigResult = await configService.getAllConfig();
    if (!isSuccess(allConfigResult)) {
      throw databaseError('Failed to retrieve configuration for email templates', allConfigResult.error);
    }
    const allConfig = allConfigResult.data;

    const templates = {};

    // Group template configurations by key
    for (const [configKey, value] of Object.entries(allConfig)) {
      if (configKey.startsWith('email.templates.')) {
        const parts = configKey.split('.');
        if (parts.length >= 4) {
          const templateKey = parts.slice(2, -1).join('.'); // e.g., 'mvc.notification'
          const templateType = parts[parts.length - 1]; // 'subject' or 'body'

          if (!templates[templateKey]) {
            templates[templateKey] = {};
          }

          templates[templateKey][templateType] = value;
        }
      }
    }

    logOperation('getEmailTemplates', {
      templateCount: Object.keys(templates).length
    });

    return templates;

  }, { operation: 'getEmailTemplates' });
}

/**
 * Tests the email configuration by sending a test email
 * @param {string} testRecipient - Email address to send test to
 * @returns {boolean} Success status
 */
async function sendTestEmail(testRecipient) {
  try {
    const subject = 'NJDSC Portal - Email Configuration Test';
    const body = `This is a test email from the NJDSC School Compliance Portal.

Email service configuration is working correctly.

Sent at: ${new Date().toISOString()}

If you received this email, the email service is properly configured.`;

    await sendEmail(testRecipient, subject, body);
    logOperation('sendTestEmail', { success: true, recipient: testRecipient });
    return true;

  } catch (error) {
    logOperation('sendTestEmail', { error: error.message, recipient: testRecipient });
    throw error;
  }
}

module.exports = {
  sendEmail,
  sendTemplatedEmail,
  getEmailTemplates,
  sendTestEmail,

  // Utility functions for testing
  validateEmailParams,
  substituteVariables,
};