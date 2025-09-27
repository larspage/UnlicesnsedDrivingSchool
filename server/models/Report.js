/**
 * Report Model for NJDSC School Compliance Portal
 *
 * Represents a school compliance report with validation, data transformation,
 * and business rule enforcement.
 */

const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');

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
      location: Joi.string().max(100).trim().allow(''),
      violationDescription: Joi.string().max(1000).allow(''),
      phoneNumber: Joi.string().pattern(/^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/).allow(''),
      websiteUrl: Joi.string().uri({ scheme: ['http', 'https'] }).max(500).allow(''),
      uploadedFiles: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        type: Joi.string().required(),
        size: Joi.number().integer().min(0).required(),
        url: Joi.string().uri().required(),
        thumbnailUrl: Joi.string().uri().optional()
      })).max(10).allow(null),
      socialMediaLinks: Joi.array().items(Joi.string().uri()).allow(null),
      additionalInfo: Joi.string().max(2000).allow(''),
      status: Joi.string().valid(...Object.values(REPORT_STATUS)).required(),
      lastReported: Joi.string().isoDate().required(),
      createdAt: Joi.string().isoDate().required(),
      updatedAt: Joi.string().isoDate().required(),
      reporterIp: Joi.string().ip({ version: ['ipv4', 'ipv6'] }).allow('', null).optional(),
      adminNotes: Joi.string().max(500).allow(''),
      mvcReferenceNumber: Joi.string().max(50).allow('')
    });

    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join('; ');
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
   * Converts the report to a Google Sheets row array
   * @returns {Array} Array of values for the sheet row
   */
  toSheetsRow() {
    return [
      this.id || '',
      this.schoolName || '',
      this.location || '',
      this.violationDescription || '',
      this.phoneNumber || '',
      this.websiteUrl || '',
      this.uploadedFiles ? JSON.stringify(this.uploadedFiles) : '',
      this.socialMediaLinks ? JSON.stringify(this.socialMediaLinks) : '',
      this.additionalInfo || '',
      this.status || '',
      this.lastReported || '',
      this.createdAt || '',
      this.updatedAt || '',
      this.reporterIp || '',
      this.adminNotes || '',
      this.mvcReferenceNumber || ''
    ];
  }

  /**
   * Creates a Report instance from a Google Sheets row array
   * @param {Array} row - Array of values from the sheet row
   * @returns {Report} New Report instance
   * @throws {Error} If row data is invalid
   */
  static fromSheetsRow(row) {
    if (!Array.isArray(row) || row.length < 16) {
      throw new Error('Invalid row data: must be an array with at least 16 elements');
    }

    // Safely parse JSON fields
    let uploadedFiles = null;
    let socialMediaLinks = null;

    try {
      uploadedFiles = row[6] ? JSON.parse(row[6]) : null;
    } catch (error) {
      console.warn('Failed to parse uploadedFiles JSON:', row[6]);
    }

    try {
      socialMediaLinks = row[7] ? JSON.parse(row[7]) : null;
    } catch (error) {
      console.warn('Failed to parse socialMediaLinks JSON:', row[7]);
    }

    const data = {
      id: row[0] || null,
      schoolName: row[1] || null,
      location: row[2] || null,
      violationDescription: row[3] || null,
      phoneNumber: row[4] || null,
      websiteUrl: row[5] || null,
      uploadedFiles,
      socialMediaLinks,
      additionalInfo: row[8] || null,
      status: row[9] || null,
      lastReported: row[10] || null,
      createdAt: row[11] || null,
      updatedAt: row[12] || null,
      reporterIp: row[13] || null,
      adminNotes: row[14] || null,
      mvcReferenceNumber: row[15] || null
    };

    // Filter out null values for required fields validation
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== null)
    );

    return new Report(cleanData);
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
    const updatedData = {
      ...this,
      ...updateData,
      id: this.id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

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