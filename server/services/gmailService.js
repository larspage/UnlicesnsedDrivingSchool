/**
 * Gmail Service for NJDSC School Compliance Portal
 *
 * Handles email sending functionality using Gmail API with service account authentication.
 * Supports templated emails with variable substitution for MVC notifications and status updates.
 */

const { google } = require('googleapis');
const configService = require('./configService');

// Environment variables
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

// Validate required environment variables
if (!SERVICE_ACCOUNT_KEY) {
  throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required');
}

// Parse service account credentials
let credentials;
try {
  credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
} catch (error) {
  throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.');
}

// Initialize Google Gmail API client
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/gmail.send'],
});

const gmail = google.gmail({ version: 'v1', auth });

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
 * Creates a MIME message for Gmail API
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @param {Object} [options] - Additional options (cc, bcc, from)
 * @returns {string} Base64 encoded MIME message
 */
function createMimeMessage(to, subject, body, options = {}) {
  const { cc, bcc, from } = options;

  let headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body
  ];

  if (cc) {
    headers.splice(1, 0, `Cc: ${cc}`);
  }

  if (bcc) {
    headers.splice(cc ? 2 : 1, 0, `Bcc: ${bcc}`);
  }

  if (from) {
    headers.splice(0, 0, `From: ${from}`);
  }

  const message = headers.join('\r\n');
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Logs operation details for debugging and monitoring
 * @param {string} operation - Operation name
 * @param {Object} details - Additional details to log
 */
function logOperation(operation, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] GmailService.${operation}:`, details);
}

/**
 * Handles Gmail API errors
 * @param {Error} error - Error from Gmail API
 * @param {string} operation - Operation that failed
 * @throws {Error} Processed error with context
 */
function handleApiError(error, operation) {
  logOperation(operation, { error: error.message, code: error.code });

  if (error.code === 403) {
    throw new Error('Access denied to Gmail API. Check service account permissions.');
  } else if (error.code === 404) {
    throw new Error('Gmail API endpoint not found. Verify API configuration.');
  } else if (error.code === 429) {
    throw new Error('Gmail API rate limit exceeded. Please try again later.');
  } else if (error.code === 400) {
    throw new Error('Invalid request to Gmail API. Check email format and parameters.');
  } else {
    throw new Error(`Gmail API error during ${operation}: ${error.message}`);
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
 * Sends an email using Gmail API
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body (plain text)
 * @param {Object} [options] - Additional options
 * @param {string} [options.cc] - CC recipients
 * @param {string} [options.bcc] - BCC recipients
 * @param {string} [options.from] - Sender email address
 * @returns {boolean} Success status
 * @throws {Error} If sending fails
 */
async function sendEmail(to, subject, body, options = {}) {
  try {
    validateEmailParams(to, subject, body);

    logOperation('sendEmail', {
      to,
      subject: subject.substring(0, 50) + (subject.length > 50 ? '...' : ''),
      hasOptions: !!options.cc || !!options.bcc || !!options.from
    });

    const mimeMessage = createMimeMessage(to, subject, body, options);

    const response = await gmail.users.messages.send({
      userId: 'me',
      resource: {
        raw: mimeMessage
      }
    });

    logOperation('sendEmail', {
      success: true,
      messageId: response.data.id
    });

    return true;

  } catch (error) {
    handleApiError(error, 'sendEmail');
  }
}

/**
 * Sends a templated email with variable substitution
 * @param {string} templateKey - Template key (e.g., 'mvc.notification')
 * @param {Object} variables - Variables for substitution
 * @param {string} recipient - Primary recipient email
 * @param {Object} [options] - Additional options
 * @returns {boolean} Success status
 * @throws {Error} If template not found or sending fails
 */
async function sendTemplatedEmail(templateKey, variables, recipient, options = {}) {
  try {
    if (!templateKey || typeof templateKey !== 'string') {
      throw new Error('Invalid template key: must be a non-empty string');
    }

    if (!variables || typeof variables !== 'object') {
      throw new Error('Invalid variables: must be an object');
    }

    // Get template from configuration
    const subjectTemplate = await configService.getConfig(`email.templates.${templateKey}.subject`);
    const bodyTemplate = await configService.getConfig(`email.templates.${templateKey}.body`);

    if (!subjectTemplate || !bodyTemplate) {
      throw new Error(`Email template '${templateKey}' not found in configuration`);
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
    return await sendEmail(recipient, subject, body, options);

  } catch (error) {
    if (error.message.includes('template') || error.message.includes('variables')) {
      throw error; // Re-throw validation errors
    }
    handleApiError(error, 'sendTemplatedEmail');
  }
}

/**
 * Retrieves available email templates from configuration
 * @returns {Object} Object with template keys and their subject/body
 */
async function getEmailTemplates() {
  try {
    logOperation('getEmailTemplates');

    const allConfig = await configService.getAllConfig();
    const templates = {};

    // Group template configurations by key
    for (const [configKey, value] of Object.entries(allConfig)) {
      if (configKey.startsWith('email.templates.')) {
        const parts = configKey.split('.');
        if (parts.length >= 4) {
          const templateKey = parts[2]; // e.g., 'mvc.notification'
          const templateType = parts[3]; // 'subject' or 'body'

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

  } catch (error) {
    logOperation('getEmailTemplates', { error: error.message });
    throw new Error(`Failed to retrieve email templates: ${error.message}`);
  }
}

module.exports = {
  sendEmail,
  sendTemplatedEmail,
  getEmailTemplates,

  // Utility functions for testing
  validateEmailParams,
  createMimeMessage,
  substituteVariables,
};