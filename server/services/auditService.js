/**
 * Audit Service for NJDSC School Compliance Portal
 *
 * Manages audit logs stored in Google Sheets with caching
 * and provides CRUD operations for audit log management.
 */

const localJsonService = require('./localJsonService');

// Configuration constants
const AUDIT_DATA_FILE = 'audit';

// Column mapping for Audit Logs table
const AUDIT_COLUMNS = {
  id: 0,              // Column A
  timestamp: 1,       // Column B
  action: 2,          // Column C
  adminUser: 3,       // Column D
  targetType: 4,      // Column E
  targetId: 5,        // Column F
  details: 6,         // Column G
  ipAddress: 7,       // Column H
  changes: 8,         // Column I (JSON)
  metadata: 9         // Column J (JSON)
};

// In-memory cache for audit logs (limited to recent entries)
const auditCache = new Map();
const CACHE_SIZE_LIMIT = 1000; // Keep only the most recent 1000 entries in cache
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes TTL

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {Array} logs - Cached audit logs
 * @property {number} timestamp - Cache timestamp
 */

/**
 * Audit log entry structure
 * @typedef {Object} AuditLogEntry
 * @property {string} id - Unique identifier
 * @property {string} timestamp - ISO timestamp
 * @property {string} action - Action type
 * @property {string} adminUser - Admin user who performed action
 * @property {string} targetType - Type of target (report, config, etc.)
 * @property {string|null} targetId - ID of the target
 * @property {string} details - Human-readable description
 * @property {string} ipAddress - IP address of the admin
 * @property {Object|null} changes - Object describing what changed
 * @property {Object|null} metadata - Additional metadata
 */

/**
 * Validates spreadsheet parameters
 * @param {string} spreadsheetId - Google Sheets spreadsheet ID
 * @param {string} sheetName - Name of the sheet
 * @throws {Error} If validation fails
 */
function validateSpreadsheetParams(spreadsheetId, sheetName) {
  if (!spreadsheetId || typeof spreadsheetId !== 'string') {
    throw new Error('Invalid spreadsheetId: must be a non-empty string');
  }

  if (!sheetName || typeof sheetName !== 'string') {
    throw new Error('Invalid sheetName: must be a non-empty string');
  }
}

/**
 * Logs operation details for debugging and monitoring
 * @param {string} operation - Operation name
 * @param {Object} details - Additional details to log
 */
function logOperation(operation, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] AuditService.${operation}:`, details);
}

/**
 * Handles Google Sheets API errors
 * @param {Error} error - Error from Google Sheets API
 * @param {string} operation - Operation that failed
 * @throws {Error} Processed error with context
 */
function handleApiError(error, operation) {
  logOperation(operation, { error: error.message, code: error.code });

  if (error.code === 403) {
    throw new Error('Access denied to Google Sheets. Check service account permissions.');
  } else if (error.code === 404) {
    throw new Error('Audit spreadsheet or sheet not found. Verify spreadsheet ID and sheet name.');
  } else if (error.code === 429) {
    throw new Error('Google Sheets API rate limit exceeded. Please try again later.');
  } else {
    throw new Error(`Google Sheets API error during ${operation}: ${error.message}`);
  }
}

/**
 * Converts an audit log entry to a Google Sheets row array
 * @param {AuditLogEntry} entry - Audit log entry
 * @returns {Array} Array of values for the sheet row
 */
function auditLogToRow(entry) {
  const row = new Array(10); // 10 columns (A to J)

  row[AUDIT_COLUMNS.id] = entry.id || '';
  row[AUDIT_COLUMNS.timestamp] = entry.timestamp || '';
  row[AUDIT_COLUMNS.action] = entry.action || '';
  row[AUDIT_COLUMNS.adminUser] = entry.adminUser || '';
  row[AUDIT_COLUMNS.targetType] = entry.targetType || '';
  row[AUDIT_COLUMNS.targetId] = entry.targetId || '';
  row[AUDIT_COLUMNS.details] = entry.details || '';
  row[AUDIT_COLUMNS.ipAddress] = entry.ipAddress || '';
  row[AUDIT_COLUMNS.changes] = entry.changes ? JSON.stringify(entry.changes) : '';
  row[AUDIT_COLUMNS.metadata] = entry.metadata ? JSON.stringify(entry.metadata) : '';

  return row;
}

/**
 * Converts a Google Sheets row array to an audit log entry
 * @param {Array} row - Array of values from the sheet row
 * @returns {AuditLogEntry} Audit log entry
 * @throws {Error} If row data is invalid
 */
function rowToAuditLog(row) {
  if (!Array.isArray(row) || row.length < 10) {
    throw new Error('Invalid row data: must be an array with at least 10 elements');
  }

  let changes = null;
  let metadata = null;

  try {
    changes = row[AUDIT_COLUMNS.changes] ? JSON.parse(row[AUDIT_COLUMNS.changes]) : null;
  } catch (e) {
    console.warn('Failed to parse changes JSON:', row[AUDIT_COLUMNS.changes]);
  }

  try {
    metadata = row[AUDIT_COLUMNS.metadata] ? JSON.parse(row[AUDIT_COLUMNS.metadata]) : null;
  } catch (e) {
    console.warn('Failed to parse metadata JSON:', row[AUDIT_COLUMNS.metadata]);
  }

  return {
    id: row[AUDIT_COLUMNS.id] || '',
    timestamp: row[AUDIT_COLUMNS.timestamp] || '',
    action: row[AUDIT_COLUMNS.action] || '',
    adminUser: row[AUDIT_COLUMNS.adminUser] || '',
    targetType: row[AUDIT_COLUMNS.targetType] || '',
    targetId: row[AUDIT_COLUMNS.targetId] || null,
    details: row[AUDIT_COLUMNS.details] || '',
    ipAddress: row[AUDIT_COLUMNS.ipAddress] || '',
    changes,
    metadata
  };
}

/**
 * Gets cached audit logs if valid
 * @returns {Array|null} Cached logs or null if not cached/expired
 */
function getCachedAuditLogs() {
  const entry = auditCache.get('all_logs');
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL) {
    auditCache.delete('all_logs');
    return null;
  }

  return entry.logs;
}

/**
 * Sets cached audit logs
 * @param {Array} logs - Logs to cache
 */
function setCachedAuditLogs(logs) {
  // Keep only the most recent entries in cache
  const recentLogs = logs.slice(-CACHE_SIZE_LIMIT);

  auditCache.set('all_logs', {
    logs: recentLogs,
    timestamp: Date.now()
  });
}

/**
 * Clears audit log cache
 */
function clearAuditCache() {
  auditCache.clear();
}

/**
 * Retrieves all audit logs from local JSON storage
 * @param {Object} [options] - Options for filtering
 * @param {number} [options.limit] - Maximum number of logs to return
 * @param {string} [options.startDate] - Start date filter (ISO string)
 * @param {string} [options.endDate] - End date filter (ISO string)
 * @returns {Array<AuditLogEntry>} Array of audit log entries
 */
async function getAllAuditLogsFromJson(options = {}) {
  try {
    logOperation('getAllAuditLogsFromJson', { dataFile: AUDIT_DATA_FILE, options });

    const auditLogs = await localJsonService.getAllRows(null, AUDIT_DATA_FILE);

    // Apply filters
    let filteredLogs = auditLogs;

    if (options.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= options.startDate);
    }

    if (options.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= options.endDate);
    }

    // Sort by timestamp descending (most recent first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    if (options.limit && options.limit > 0) {
      filteredLogs = filteredLogs.slice(0, options.limit);
    }

    logOperation('getAllAuditLogsFromJson', { totalLogs: auditLogs.length, filteredLogs: filteredLogs.length });

    return filteredLogs;

  } catch (error) {
    logOperation('getAllAuditLogsFromJson', { error: error.message });
    throw new Error(`Failed to retrieve audit logs from JSON: ${error.message}`);
  }
}

/**
 * Saves an audit log entry to local JSON storage
 * @param {AuditLogEntry} entry - Audit log entry to save
 * @returns {AuditLogEntry} The saved audit log entry
 */
async function saveAuditLogToJson(entry) {
  try {
    logOperation('saveAuditLogToJson', { id: entry.id, action: entry.action, adminUser: entry.adminUser });

    await localJsonService.appendRow(null, AUDIT_DATA_FILE, entry);

    logOperation('saveAuditLogToJson', { action: 'created' });

    // Clear cache since logs changed
    clearAuditCache();

    return entry;

  } catch (error) {
    logOperation('saveAuditLogToJson', { error: error.message });
    throw new Error(`Failed to save audit log to JSON: ${error.message}`);
  }
}

/**
 * Retrieves audit logs with optional filtering
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.action] - Filter by action type
 * @param {string} [filters.adminUser] - Filter by admin user
 * @param {string} [filters.targetType] - Filter by target type
 * @param {string} [filters.dateFrom] - Filter by start date
 * @param {string} [filters.dateTo] - Filter by end date
 * @param {string} [filters.searchTerm] - Search term for details/admin user/target ID
 * @param {number} [filters.limit] - Maximum number of logs to return
 * @returns {Array<AuditLogEntry>} Filtered audit log entries
 */
async function getAuditLogs(filters = {}) {
  logOperation('getAuditLogs', { filters });

  // Check cache first (only for unfiltered requests)
  if (!filters || Object.keys(filters).length === 0) {
    const cachedLogs = getCachedAuditLogs();
    if (cachedLogs) {
      logOperation('getAuditLogs', { source: 'cache', count: cachedLogs.length });
      return cachedLogs;
    }
  }

  // Get from JSON
  const allLogs = await getAllAuditLogsFromJson({ limit: filters.limit });
  let filteredLogs = [...allLogs];

  // Apply filters
  if (filters.action) {
    filteredLogs = filteredLogs.filter(log => log.action === filters.action);
  }

  if (filters.adminUser) {
    filteredLogs = filteredLogs.filter(log =>
      log.adminUser.toLowerCase().includes(filters.adminUser.toLowerCase())
    );
  }

  if (filters.targetType) {
    filteredLogs = filteredLogs.filter(log => log.targetType === filters.targetType);
  }

  if (filters.dateFrom) {
    filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.dateFrom);
  }

  if (filters.dateTo) {
    filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.dateTo);
  }

  if (filters.searchTerm) {
    const searchLower = filters.searchTerm.toLowerCase();
    filteredLogs = filteredLogs.filter(log =>
      log.details.toLowerCase().includes(searchLower) ||
      log.adminUser.toLowerCase().includes(searchLower) ||
      (log.targetId && log.targetId.toLowerCase().includes(searchLower))
    );
  }

  // Cache unfiltered results
  if (!filters || Object.keys(filters).length === 0) {
    setCachedAuditLogs(filteredLogs);
  }

  logOperation('getAuditLogs', { totalLogs: allLogs.length, filteredLogs: filteredLogs.length, source: 'sheets' });
  return filteredLogs;
}

/**
 * Creates a new audit log entry
 * @param {Object} entryData - Audit log entry data
 * @param {string} entryData.action - Action type
 * @param {string} entryData.adminUser - Admin user who performed action
 * @param {string} entryData.targetType - Type of target
 * @param {string|null} [entryData.targetId] - ID of the target
 * @param {string} entryData.details - Human-readable description
 * @param {string} [entryData.ipAddress] - IP address of the admin
 * @param {Object|null} [entryData.changes] - Object describing what changed
 * @param {Object|null} [entryData.metadata] - Additional metadata
 * @returns {AuditLogEntry} The created audit log entry
 */
async function createAuditLog(entryData) {
  const entry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    adminUser: entryData.adminUser || 'system',
    ipAddress: entryData.ipAddress || '127.0.0.1',
    changes: entryData.changes || null,
    metadata: entryData.metadata || null,
    ...entryData
  };

  // Validate required fields
  if (!entry.action || !entry.targetType || !entry.details) {
    throw new Error('Missing required audit log fields: action, targetType, details');
  }

  const savedEntry = await saveAuditLogToJson(entry);

  logOperation('createAuditLog', {
    id: entry.id,
    action: entry.action,
    adminUser: entry.adminUser,
    success: true
  });

  return savedEntry;
}

/**
 * Gets audit logs for a specific target
 * @param {string} targetId - Target ID to filter by
 * @returns {Array<AuditLogEntry>} Audit logs for the target
 */
async function getAuditLogsByTarget(targetId) {
  if (!targetId) {
    throw new Error('Target ID is required');
  }

  const allLogs = await getAuditLogs();
  return allLogs.filter(log => log.targetId === targetId);
}

/**
 * Gets audit logs for a specific admin user
 * @param {string} adminUser - Admin user to filter by
 * @param {Object} [options] - Additional options
 * @param {number} [options.limit] - Maximum number of logs to return
 * @returns {Array<AuditLogEntry>} Audit logs for the admin user
 */
async function getAuditLogsByAdminUser(adminUser, options = {}) {
  if (!adminUser) {
    throw new Error('Admin user is required');
  }

  return getAuditLogs({ adminUser, ...options });
}

/**
 * Gets audit logs by action type
 * @param {string} action - Action type to filter by
 * @param {Object} [options] - Additional options
 * @param {number} [options.limit] - Maximum number of logs to return
 * @returns {Array<AuditLogEntry>} Audit logs for the action type
 */
async function getAuditLogsByAction(action, options = {}) {
  if (!action) {
    throw new Error('Action is required');
  }

  return getAuditLogs({ action, ...options });
}

/**
 * Gets recent audit logs
 * @param {number} [limit=50] - Maximum number of logs to return
 * @returns {Array<AuditLogEntry>} Recent audit logs
 */
async function getRecentAuditLogs(limit = 50) {
  return getAuditLogs({ limit });
}

/**
 * Clears all audit log cache
 */
function clearCache() {
  clearAuditCache();
}

/**
 * Gets audit log statistics
 * @param {Object} [options] - Options for statistics
 * @param {string} [options.startDate] - Start date for statistics
 * @param {string} [options.endDate] - End date for statistics
 * @returns {Object} Audit log statistics
 */
async function getAuditStatistics(options = {}) {
  const logs = await getAuditLogs(options);

  const stats = {
    total: logs.length,
    byAction: {},
    byAdminUser: {},
    byTargetType: {},
    dateRange: {
      start: options.startDate || (logs.length > 0 ? logs[logs.length - 1].timestamp : null),
      end: options.endDate || (logs.length > 0 ? logs[0].timestamp : null)
    }
  };

  // Count by action
  logs.forEach(log => {
    stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
  });

  // Count by admin user
  logs.forEach(log => {
    stats.byAdminUser[log.adminUser] = (stats.byAdminUser[log.adminUser] || 0) + 1;
  });

  // Count by target type
  logs.forEach(log => {
    stats.byTargetType[log.targetType] = (stats.byTargetType[log.targetType] || 0) + 1;
  });

  return stats;
}

/**
 * Logs a successful login event
 * @param {string} username - Username that logged in
 * @param {string} ipAddress - IP address of the login
 */
async function logLogin(username, ipAddress) {
  return createAuditLog({
    action: 'LOGIN',
    adminUser: username,
    targetType: 'system',
    targetId: null,
    details: `User ${username} logged in`,
    ipAddress,
    metadata: { eventType: 'authentication' }
  });
}

/**
 * Logs a failed login attempt
 * @param {string} username - Username that attempted login
 * @param {string} ipAddress - IP address of the attempt
 * @param {string} reason - Reason for failure
 */
async function logFailedLogin(username, ipAddress, reason) {
  return createAuditLog({
    action: 'LOGIN_FAILED',
    adminUser: username,
    targetType: 'system',
    targetId: null,
    details: `Failed login attempt for user ${username}: ${reason}`,
    ipAddress,
    metadata: { eventType: 'authentication', failureReason: reason }
  });
}

/**
 * Logs a logout event
 * @param {string} username - Username that logged out
 * @param {string} ipAddress - IP address of the logout
 */
async function logLogout(username, ipAddress) {
  return createAuditLog({
    action: 'LOGOUT',
    adminUser: username,
    targetType: 'system',
    targetId: null,
    details: `User ${username} logged out`,
    ipAddress,
    metadata: { eventType: 'authentication' }
  });
}

/**
 * Logs a password change event
 * @param {string} username - Username that changed password
 * @param {string} ipAddress - IP address of the change
 */
async function logPasswordChange(username, ipAddress) {
  return createAuditLog({
    action: 'PASSWORD_CHANGE',
    adminUser: username,
    targetType: 'user',
    targetId: username,
    details: `User ${username} changed their password`,
    ipAddress,
    metadata: { eventType: 'security' }
  });
}

/**
 * Logs a status update event
 * @param {string} reportId - ID of the report being updated
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @param {string} adminNotes - Admin notes
 */
async function logStatusUpdate(reportId, oldStatus, newStatus, adminNotes) {
  return createAuditLog({
    action: 'STATUS_UPDATE',
    adminUser: 'admin', // This should be passed from the authenticated user
    targetType: 'report',
    targetId: reportId,
    details: `Report status changed from "${oldStatus}" to "${newStatus}"`,
    ipAddress: 'system', // This should be passed from the request
    changes: {
      status: { old: oldStatus, new: newStatus }
    },
    metadata: {
      adminNotes: adminNotes || null,
      eventType: 'report_management'
    }
  });
}


module.exports = {
  getAuditLogs,
  createAuditLog,
  getAuditLogsByTarget,
  getAuditLogsByAdminUser,
  getAuditLogsByAction,
  getRecentAuditLogs,
  getAuditStatistics,
  clearCache,

  // Authentication audit methods
  logLogin,
  logFailedLogin,
  logLogout,
  logPasswordChange,
  logStatusUpdate,

  // Utility functions for testing
  getCachedAuditLogs,
  setCachedAuditLogs,
};