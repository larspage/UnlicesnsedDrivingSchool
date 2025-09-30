// Type definitions for NJDSC School Compliance Portal

export interface Report {
  id: string;
  schoolName: string;
  location?: string;
  violationDescription?: string;
  phoneNumber?: string;
  websiteUrl?: string;
  uploadedFiles?: UploadedFile[];
  socialMediaLinks?: string[];
  additionalInfo?: string;
  status: ReportStatus;
  lastReported: string;
  createdAt: string;
  updatedAt: string;
  reporterIp?: string;
  adminNotes?: string;
  mvcReferenceNumber?: string;
  reporterName?: string;
  reporterPhone?: string;
  reporterSchool?: string;
  reporterEmail?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

export type ReportStatus = 'Added' | 'Confirmed by NJDSC' | 'Reported to MVC' | 'Under Investigation' | 'Closed';

export interface StatusUpdateData {
  status: ReportStatus;
  adminNotes?: string;
  mvcReferenceNumber?: string;
}

export interface AdminStats {
  totalReports: number;
  pendingReports: number;
  completedReports: number;
  totalFiles: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  adminUser: string;
  targetType: 'report' | 'configuration' | 'system' | 'email' | 'bulk';
  targetId?: string;
  details: string;
  ipAddress?: string;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
}

export type AuditAction =
  | 'STATUS_UPDATE'
  | 'BULK_STATUS_UPDATE'
  | 'EMAIL_SENT'
  | 'CONFIGURATION_UPDATE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'REPORT_VIEW'
  | 'ADMIN_NOTE_ADDED'
  | 'MVC_REFERENCE_ADDED';

export interface AuditLogFilters {
  action?: AuditAction;
  adminUser?: string;
  targetType?: AuditLogEntry['targetType'];
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
}