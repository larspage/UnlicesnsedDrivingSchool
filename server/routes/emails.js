/**
 * Email API routes for NJDSC School Compliance Portal
 *
 * Provides endpoints for sending emails (Admin only).
 */

const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const { authenticateAdmin } = require('../middleware/auth');

// Input validation middleware
function validateEmailInput(req, res, next) {
  const { reportId, templateId, to, subject, body } = req.body;

  if (!to || typeof to !== 'string' || !to.includes('@')) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Valid recipient email address is required'
    });
  }

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Email subject is required'
    });
  }

  if (!templateId || typeof templateId !== 'string') {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Email template ID is required'
    });
  }

  next();
}

/**
 * POST /api/emails/send
 * Send an email (Admin only)
 */
router.post('/send', authenticateAdmin, validateEmailInput, async (req, res) => {
  try {
    const { reportId, templateId, to, subject, body, attachments } = req.body;

    // Get email template content based on templateId
    let emailContent = body || '';
    if (!emailContent) {
      // Use default templates based on templateId
      switch (templateId) {
        case 'confirmation':
          emailContent = `
Dear Reporter,

Thank you for submitting your report about an unlicensed driving school. We have received your submission and will investigate the matter.

Report ID: ${reportId || 'N/A'}
Submission Date: ${new Date().toLocaleDateString()}

We will update you on the status of this investigation as it progresses.

Best regards,
NJDSC Compliance Team
          `.trim();
          break;

        case 'status_update':
          emailContent = `
Dear Reporter,

We wanted to provide you with an update on your report.

Report ID: ${reportId || 'N/A'}

Please check our website for the latest status information.

Best regards,
NJDSC Compliance Team
          `.trim();
          break;

        case 'closure':
          emailContent = `
Dear Reporter,

Your report has been investigated and resolved.

Report ID: ${reportId || 'N/A'}
Resolution Date: ${new Date().toLocaleDateString()}

Thank you for helping us maintain compliance in our driving schools.

Best regards,
NJDSC Compliance Team
          `.trim();
          break;

        default:
          emailContent = body || 'Default email content';
      }
    }

    // Send the email using email service
    const result = await emailService.sendEmail(
      to,
      subject,
      emailContent
    );

    // Log the email action to audit trail
    const auditService = require('../services/auditService');
    await auditService.logEmailSent(
      reportId,
      templateId,
      to,
      subject
    );

    res.json({
      success: true,
      data: {
        sent: result
      },
      message: `Email sent successfully to ${to}`
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;