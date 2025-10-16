/**
 * Report Model for NJDSC School Compliance Portal
 *
 * Represents a school compliance report with validation, data transformation,
 * and business rule enforcement.
 */

const Joi = require('joi');

/**
 * Status enumeration for reports
 * @enum {string}
 */
const REPORT_STATUS = {
  ADDED: 'Added',
  CONFIRMED: 'Confirmed by NJDSC',
  REPORTED_TO_MVC: 'Reported to MVC',
  UNDER_INVESTIGATION: 'Under Investigation',
  CLOSED: 'Closed'
};

/**
 * Report class representing a school compliance report
 */
class Report {
  /**
   * Creates a new Report instance with validation
   * @param {Object} data - Report data
   * @param {string} data.id - Unique report identifier
   * @param {string} data.schoolName - Name of the driving school
   * @param {string} [data.location] - Town/city location
   * @param {string} [data.violationDescription] - Description of violation
   * @param {string} [data.phoneNumber] - Contact phone number
   * @param {string} [data.websiteUrl] - Website or social media URL
   * @param {Array} [data.uploadedFiles] - Array of file objects
   * @param {Array} [data.socialMediaLinks] - Array of social media links
   * @param {string} [data.additionalInfo] - Additional information
   * @param {string} data.status - Current status
   * @param {string} data.lastReported - Last report timestamp
   * @param {string} data.createdAt - Creation timestamp
   * @param {string} data.updatedAt - Last update timestamp
   * @param {string} [data.reporterIp] - Reporter's IP address
   * @param {string} [data.adminNotes] - Administrative notes
   * @param {string} [data.mvcReferenceNumber] - MVC reference number
   */
  constructor(data) {
    // Validate input data
    const validatedData = Report.validateData(data);

    // Assign validated properties
    this.id = validatedData.id;
    this.schoolName = validatedData.schoolName;
    this.location = validatedData.location;
    this.violationDescription = validatedData.violationDescription;
    this.phoneNumber = validatedData.phoneNumber;
    this.websiteUrl = validatedData.websiteUrl;
    this.uploadedFiles = validatedData.uploadedFiles;
    this.socialMediaLinks = validatedData.socialMediaLinks;
    this.additionalInfo = validatedData.additionalInfo;
    this.status = validatedData.status;
    this.lastReported = validatedData.lastReported;
    this.createdAt = validatedData.createdAt;
    this.updatedAt = validatedData.updatedAt;
    this.reporterIp = validatedData.reporterIp;
    this.adminNotes = validatedData.adminNotes;
    this.mvcReferenceNumber = validatedData.mvcReferenceNumber;
  }

  /**
   * Generates a unique report ID
   * @returns {string} Unique report identifier
   */
  static generateId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'rep_';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Validates report data using Joi schema
   * @param {Object} data - Data to validate
   * @param {boolean} [isUpdate=false] - Whether this is an update operation
   * @returns {Object} Validated and sanitized data
   * @throws {Error} If validation fails
   */
  static validateData(data, isUpdate = false) {
    const schema = Joi.object({
      id: isUpdate ? Joi.string().pattern(/^rep_[a-zA-Z0-9]{6}$/).required() : Joi.string().pattern(/^rep_[a-zA-Z0-9]{6}$/),
      schoolName: Joi.string().min(2).max(255).trim().required(),
      location: Joi.string().max(100).trim().allow('', null).optional(),
      violationDescription: Joi.string().max(1000).allow('', null).optional(),
      phoneNumber: Joi.string().pattern(/^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/).allow('', null).optional(),
      websiteUrl: Joi.string().uri({ scheme: ['http', 'https'] }).max(500).allow('', null).optional(),
      uploadedFiles: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        type: Joi.string().required(),
        size: Joi.number().integer().min(0).required(),
        url: Joi.string().uri().required(),
        thumbnailUrl: Joi.string().allow('', null).optional()
      })).max(10).allow(null).optional(),
      socialMediaLinks: Joi.array().items(Joi.string().uri()).allow(null).optional(),
      additionalInfo: Joi.string().max(2000).allow('', null).optional(),
      status: Joi.string().valid(...Object.values(REPORT_STATUS)).required(),
      lastReported: Joi.string().isoDate().required(),
      createdAt: Joi.string().isoDate().required(),
      updatedAt: Joi.string().isoDate().required(),
      reporterIp: Joi.string().ip({ version: ['ipv4', 'ipv6'] }).allow('', null).optional(),
      adminNotes: Joi.string().max(500).allow('', null).optional(),
      mvcReferenceNumber: Joi.string().max(50).allow('', null).optional(),
      // Reporter information fields (optional)
      reporterName: Joi.string().max(255).trim().allow('', null).optional(),
      reporterPhone: Joi.string().pattern(/^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/).allow('', null).optional(),
      reporterSchool: Joi.string().max(255).trim().allow('', null).optional(),
      reporterEmail: Joi.string().email().max(255).allow('', null).optional(),
      updatedBy: Joi.string().max(50).allow('', null).optional(),
      // Files field for frontend compatibility (will be processed separately)
      files: Joi.array().items(Joi.object({
        name: Joi.string().required(),
        type: Joi.string().required(),
        size: Joi.number().integer().min(0).required(),
        data: Joi.string().allow('').optional()
      })).max(10).allow(null).optional()
    });

    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join('; ');
      console.error('[REPORT VALIDATION ERROR] Validation failed:', {
        errorMessages,
        data: JSON.stringify(data, null, 2),
        timestamp: new Date().toISOString()
      });
      throw new Error(`Report validation failed: ${errorMessages}`);
    }

    return value;
  }

  /**
   * Validates business rules for the report
   * @param {Array} existingReports - Array of existing reports for duplicate checking
   * @throws {Error} If business rules are violated
   */
  validateBusinessRules(existingReports = []) {
    // Check for duplicate school names (case-insensitive)
    const duplicate = existingReports.find(report =>
      report.id !== this.id &&
      report.schoolName.toLowerCase() === this.schoolName.toLowerCase()
    );

    if (duplicate) {
      throw new Error(`Duplicate report found for school "${this.schoolName}". Existing report ID: ${duplicate.id}`);
    }

    // Validate status transitions if this is an update
    if (this.status && !Object.values(REPORT_STATUS).includes(this.status)) {
      throw new Error(`Invalid status: ${this.status}`);
    }

    // Validate file count limit
    if (this.uploadedFiles && this.uploadedFiles.length > 10) {
      throw new Error('Maximum 10 files allowed per report');
    }
  }


  /**
   * Creates a new report with generated ID and timestamps
   * @param {Object} data - Initial report data
   * @param {string} [reporterIp] - Reporter's IP address
   * @returns {Report} New Report instance
   */
  static create(data, reporterIp = null) {
    const now = new Date().toISOString();

    const reportData = {
      ...data,
      id: Report.generateId(),
      status: REPORT_STATUS.ADDED,
      createdAt: now,
      updatedAt: now,
      lastReported: now,
      reporterIp
    };

    return new Report(reportData);
  }

  /**
   * Updates the report with new data and timestamps
   * @param {Object} updateData - Data to update
   * @returns {Report} Updated Report instance
   */
  update(updateData) {
    console.log('🔍 Report.update called with:', JSON.stringify(updateData, null, 2));
    console.log('🔍 Current report data:', JSON.stringify({
      id: this.id,
      additionalInfo: this.additionalInfo,
      adminNotes: this.adminNotes,
      mvcReferenceNumber: this.mvcReferenceNumber
    }, null, 2));

    // Preprocess current data to convert null/undefined to empty strings for optional fields
    const cleanCurrentData = {
      ...this,
      additionalInfo: this.additionalInfo || '',
      adminNotes: this.adminNotes || '',
      mvcReferenceNumber: this.mvcReferenceNumber || '',
      location: this.location || '',
      violationDescription: this.violationDescription || '',
      phoneNumber: this.phoneNumber || '',
      websiteUrl: this.websiteUrl || '',
      reporterIp: this.reporterIp || '',
      reporterName: this.reporterName || '',
      reporterPhone: this.reporterPhone || '',
      reporterSchool: this.reporterSchool || '',
      reporterEmail: this.reporterEmail || ''
    };

    console.log('🔍 Clean current data:', JSON.stringify({
      additionalInfo: cleanCurrentData.additionalInfo,
      adminNotes: cleanCurrentData.adminNotes,
      mvcReferenceNumber: cleanCurrentData.mvcReferenceNumber
    }, null, 2));

    const updatedData = {
      ...cleanCurrentData,
      ...updateData,
      id: this.id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    console.log('🔍 Final updated data:', JSON.stringify({
      additionalInfo: updatedData.additionalInfo,
      adminNotes: updatedData.adminNotes,
      mvcReferenceNumber: updatedData.mvcReferenceNumber
    }, null, 2));

    return new Report(updatedData);
  }

  /**
   * Gets the report status enum values
   * @returns {Object} Status enumeration
   */
  static getStatusEnum() {
    return REPORT_STATUS;
  }
}

module.exports = Report;