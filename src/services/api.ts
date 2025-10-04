/**
 * API Service for NJDSC School Compliance Portal Frontend
 *
 * Provides HTTP client functionality for communicating with the backend API.
 */

/// <reference types="vite/client" />

import AuthService from './authService';

const API_BASE_URL = '/api';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<{
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {}

// Report types
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
  status: string;
  lastReported: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportSubmission {
  schoolName: string;
  location?: string;
  violationDescription?: string;
  phoneNumber?: string;
  websiteUrl?: string;
  reporterName?: string;
  reporterPhone?: string;
  reporterSchool?: string;
  reporterEmail?: string;
  files?: FileData[];
}

export interface FileData {
  name: string;
  type: string;
  size: number;
  data: string; // base64 encoded
}

// File types
export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

// HTTP Client
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const authService = AuthService.getInstance();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    // Add authentication header if user is authenticated
    const token = authService.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      headers,
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Reports API
  async getReports(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PaginatedResponse<Report>> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/reports${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async submitReport(reportData: ReportSubmission): Promise<ApiResponse<{
    id: string;
    schoolName: string;
    location?: string;
    status: string;
    createdAt: string;
    lastReported: string;
    uploadedFiles: UploadedFile[];
  }>> {
    return this.request('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  }

  // Files API
  async uploadFiles(files: File[], reportId: string): Promise<ApiResponse<{
    files: UploadedFile[];
    totalUploaded: number;
    totalRequested: number;
  }>> {
    const formData = new FormData();
    formData.append('reportId', reportId);

    // Add each file to the form data
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });

    const response = await fetch(`${this.baseURL}/files/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async uploadBase64Files(fileDataArray: FileData[], reportId: string): Promise<ApiResponse<{
    files: UploadedFile[];
    totalUploaded: number;
    totalRequested: number;
  }>> {
    // Convert base64 data to Blobs for form upload
    const formData = new FormData();
    formData.append('reportId', reportId);

    for (let i = 0; i < fileDataArray.length; i++) {
      const fileData = fileDataArray[i];

      try {
        // Convert base64 to blob
        const response = await fetch(`data:${fileData.type};base64,${fileData.data}`);
        const blob = await response.blob();

        // Create a File object from the blob
        const file = new File([blob], fileData.name, { type: fileData.type });
        formData.append('files', file);
      } catch (error) {
        console.error(`Error processing file ${fileData.name}:`, error);
        throw new Error(`Failed to process file ${fileData.name}`);
      }
    }

    const response = await fetch(`${this.baseURL}/files/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getFile(fileId: string): Promise<ApiResponse<UploadedFile>> {
    return this.request(`/files/${fileId}`);
  }

  async getFilesByReportId(reportId: string): Promise<ApiResponse<{
    files: UploadedFile[];
    total: number;
  }>> {
    return this.request(`/files/report/${reportId}`);
  }

  async getAllFiles(): Promise<ApiResponse<{
    files: UploadedFile[];
    total: number;
  }>> {
    return this.request('/files');
  }

  async updateFileStatus(fileId: string, status: 'pending' | 'processing' | 'completed' | 'failed'): Promise<ApiResponse<{
    id: string;
    processingStatus: string;
  }>> {
    return this.request(`/files/${fileId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Audit API
  async getAuditLogs(params: {
    action?: string;
    adminUser?: string;
    targetType?: string;
    dateFrom?: string;
    dateTo?: string;
    searchTerm?: string;
    limit?: number;
  } = {}): Promise<ApiResponse<{
    items: any[];
    count: number;
    filters: any;
  }>> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/audit${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async createAuditLog(auditData: {
    action: string;
    adminUser: string;
    targetType: string;
    targetId?: string;
    details: string;
    changes?: Record<string, { old: any; new: any }>;
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<any>> {
    return this.request('/audit', {
      method: 'POST',
      body: JSON.stringify(auditData),
    });
  }

  async getAuditLogsByTarget(targetId: string): Promise<ApiResponse<{
    items: any[];
    count: number;
    targetId: string;
  }>> {
    return this.request(`/audit/target/${targetId}`);
  }

  async getRecentAuditLogs(limit: number = 50): Promise<ApiResponse<{
    items: any[];
    count: number;
    limit: number;
  }>> {
    return this.request(`/audit/recent?limit=${limit}`);
  }

  // Configuration API
  async getConfiguration(): Promise<ApiResponse<Record<string, any>>> {
    return this.request('/config');
  }

  async getConfigurationValue(key: string): Promise<ApiResponse<{
    key: string;
    value: any;
  }>> {
    return this.request(`/config/${key}`);
  }

  async updateConfiguration(configData: {
    key: string;
    value: any;
    type: string;
    category: string;
    description?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/config', {
      method: 'PUT',
      body: JSON.stringify(configData),
    });
  }

  async validateConfiguration(configData: {
    key: string;
    value: any;
    type: string;
  }): Promise<ApiResponse<{ valid: boolean }>> {
    return this.request('/config/validate', {
      method: 'POST',
      body: JSON.stringify(configData),
    });
  }

  // Admin Reports API
  async updateReportStatus(reportId: string, statusData: {
    status: string;
    adminNotes?: string;
    mvcReferenceNumber?: string;
  }): Promise<ApiResponse<{
    id: string;
    status: string;
    updatedAt: string;
  }>> {
    return this.request(`/reports/${reportId}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    });
  }

  async bulkUpdateReportStatus(reportIds: string[], statusData: {
    status: string;
    adminNotes?: string;
  }): Promise<ApiResponse<{
    updated: number;
    failed: number;
    results: any[];
  }>> {
    return this.request('/reports/bulk/status', {
      method: 'PUT',
      body: JSON.stringify({
        reportIds,
        ...statusData
      }),
    });
  }

  async sendEmail(emailData: {
    reportId: string;
    templateId: string;
    to: string;
    subject: string;
    body?: string;
    attachments?: any[];
  }): Promise<ApiResponse<{
    messageId: string;
    sent: boolean;
  }>> {
    return this.request('/emails/send', {
      method: 'POST',
      body: JSON.stringify(emailData),
    });
  }
}

// Create and export API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Utility functions
export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const validateFileForUpload = (file: File): { isValid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/avi', 'video/mov',
    'application/pdf'
  ];

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (10MB)`
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not supported. Allowed types: images, videos, and PDFs`
    };
  }

  return { isValid: true };
};