import { AuditLogEntry, AuditAction, Report, ReportStatus, AuditLogFilters } from '../types';
import { apiClient } from './api';

class AuditService {
  private static instance: AuditService;
  private currentAdminUser: string = 'Admin User'; // In real app, this would come from auth context

  private constructor() {
    // No initialization needed - data comes from API
  }

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Log an admin action
   */
  public async logAction(
    action: AuditAction,
    targetType: AuditLogEntry['targetType'],
    targetId: string | undefined,
    details: string,
    changes?: Record<string, { old: any; new: any }>,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const entryData = {
        action,
        adminUser: this.currentAdminUser,
        targetType,
        targetId,
        details,
        changes,
        metadata
      };

      await apiClient.createAuditLog(entryData);
      console.log('Audit log entry created:', entryData);
    } catch (error) {
      console.error('Failed to create audit log entry:', error);
      // Don't throw - audit logging should not break the main functionality
    }
  }

  /**
   * Log a report status update
   */
  public logStatusUpdate(
    reportId: string,
    oldStatus: ReportStatus,
    newStatus: ReportStatus,
    adminNotes?: string
  ): void {
    const details = `Updated report status from "${oldStatus}" to "${newStatus}"${adminNotes ? `: ${adminNotes}` : ''}`;

    this.logAction(
      'STATUS_UPDATE',
      'report',
      reportId,
      details,
      {
        status: { old: oldStatus, new: newStatus },
        ...(adminNotes && { adminNotes: { old: '', new: adminNotes } })
      }
    );
  }

  /**
   * Log a bulk status update
   */
  public logBulkStatusUpdate(
    reportIds: string[],
    oldStatus: ReportStatus,
    newStatus: ReportStatus,
    adminNotes?: string
  ): void {
    const details = `Bulk updated ${reportIds.length} reports from "${oldStatus}" to "${newStatus}"${adminNotes ? `: ${adminNotes}` : ''}`;

    this.logAction(
      'BULK_STATUS_UPDATE',
      'bulk',
      undefined,
      details,
      {
        status: { old: oldStatus, new: newStatus },
        reportCount: { old: 0, new: reportIds.length },
        reportIds: { old: [], new: reportIds },
        ...(adminNotes && { adminNotes: { old: '', new: adminNotes } })
      }
    );
  }

  /**
   * Log an email being sent
   */
  public logEmailSent(
    reportId: string | undefined,
    template: string,
    recipient: string,
    subject: string
  ): void {
    const details = `Sent "${template}" email to ${recipient}: ${subject}`;

    this.logAction(
      'EMAIL_SENT',
      'email',
      reportId,
      details,
      undefined,
      {
        template,
        recipient,
        subject
      }
    );
  }

  /**
   * Log a configuration update
   */
  public logConfigurationUpdate(
    changes: Record<string, { old: any; new: any }>,
    description: string
  ): void {
    this.logAction(
      'CONFIGURATION_UPDATE',
      'configuration',
      undefined,
      description,
      changes
    );
  }

  /**
   * Log admin login
   */
  public logLogin(ipAddress?: string): void {
    this.logAction(
      'LOGIN',
      'system',
      undefined,
      'Admin user logged in',
      undefined,
      { ipAddress }
    );
  }

  /**
   * Log admin logout
   */
  public logLogout(): void {
    this.logAction(
      'LOGOUT',
      'system',
      undefined,
      'Admin user logged out'
    );
  }

  /**
   * Get all audit logs with optional filtering
   */
  public async getAuditLogs(filters?: AuditLogFilters): Promise<AuditLogEntry[]> {
    try {
      const response = await apiClient.getAuditLogs(filters || {});
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit logs for a specific report
   */
  public async getReportAuditLogs(reportId: string): Promise<AuditLogEntry[]> {
    try {
      const response = await apiClient.getAuditLogsByTarget(reportId);
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch report audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit action display information
   */
  public getActionDisplayInfo(action: AuditAction): { label: string; icon: string; color: string } {
    const actionMap: Record<AuditAction, { label: string; icon: string; color: string }> = {
      'STATUS_UPDATE': { label: 'Status Update', icon: '📋', color: 'blue' },
      'BULK_STATUS_UPDATE': { label: 'Bulk Update', icon: '📊', color: 'purple' },
      'EMAIL_SENT': { label: 'Email Sent', icon: '📧', color: 'green' },
      'CONFIGURATION_UPDATE': { label: 'Configuration', icon: '⚙️', color: 'orange' },
      'LOGIN': { label: 'Login', icon: '🔑', color: 'gray' },
      'LOGOUT': { label: 'Logout', icon: '🚪', color: 'gray' },
      'REPORT_VIEW': { label: 'Report Viewed', icon: '👁️', color: 'blue' },
      'ADMIN_NOTE_ADDED': { label: 'Note Added', icon: '📝', color: 'yellow' },
      'MVC_REFERENCE_ADDED': { label: 'MVC Reference', icon: '🏛️', color: 'red' }
    };

    return actionMap[action] || { label: action, icon: '📌', color: 'gray' };
  }

  /**
   * Format timestamp for display
   */
  public formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Set current admin user (for demonstration purposes)
   */
  public setCurrentAdminUser(user: string): void {
    this.currentAdminUser = user;
  }

  /**
   * Get client IP address (mock implementation)
   */
  private getClientIP(): string {
    // In a real application, this would be obtained from the server
    return `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
  }

  /**
   * Clear all audit logs (admin function) - Not supported with API backend
   */
  public clearAuditLogs(): void {
    console.warn('Clear audit logs not supported with API backend');
  }

  /**
   * Export audit logs as JSON - Not supported with API backend
   */
  public exportAuditLogs(): string {
    console.warn('Export audit logs not supported with API backend');
    return '[]';
  }
}

export default AuditService;