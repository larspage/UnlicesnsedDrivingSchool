// Result Object Pattern Implementation Example: API Client Refactoring
// This demonstrates how to refactor existing services to use the Result pattern

import { Result, ResultSuccess, ResultFailure } from '../types/result';
import { success, failure, attempt, isSuccess, unwrap, unwrapOr } from '../utils/resultUtils';
import { ERROR_CODES, isValidationError, isResourceError, isPermissionError } from '../constants/errorCodes';

// BEFORE: Old API Client (throwing errors, mixed error handling)
class OldApiClient {
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async getReports(params: any): Promise<Report[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/reports?${new URLSearchParams(params)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return data.data || data;
    } catch (error) {
      throw new Error(`Failed to fetch reports: ${error.message}`);
    }
  }

  async submitReport(reportData: any): Promise<Report> {
    try {
      const response = await fetch(`${this.baseURL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      throw new Error(`Failed to submit report: ${error.message}`);
    }
  }

  async updateReportStatus(id: string, statusData: any): Promise<Report> {
    try {
      const response = await fetch(`${this.baseURL}/api/reports/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      throw new Error(`Failed to update report status: ${error.message}`);
    }
  }
}

// AFTER: New API Client (using Result pattern)
class NewApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Get reports with Result pattern - no more unhandled promise rejections
   */
  async getReports(params: any): Promise<Result<Report[]>> {
    return attempt(async () => {
      const response = await fetch(`${this.baseURL}/api/reports?${new URLSearchParams(params)}`);
      
      if (!response.ok) {
        // Handle HTTP errors by throwing a categorized error
        throw await this.handleHttpError(response, 'getReports');
      }
      
      const data = await response.json();
      return data.data || data;
    }, { operation: 'getReports', details: { params } });
  }

  /**
   * Submit report with Result pattern - handles validation and server errors
   */
  async submitReport(reportData: any): Promise<Result<Report>> {
    return attempt(async () => {
      // Validate input first using Result pattern
      const validationResult = await this.validateReportData(reportData);
      if (!isSuccess(validationResult)) {
        return validationResult; // Propagate validation errors
      }

      const response = await fetch(`${this.baseURL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      
      if (!response.ok) {
        throw await this.handleHttpError(response, 'submitReport');
      }
      
      const data = await response.json();
      return data.data;
    }, { operation: 'submitReport', details: { hasData: !!reportData } });
  }

  /**
   * Update report status with Result pattern
   */
  async updateReportStatus(id: string, statusData: any): Promise<Result<Report>> {
    return attempt(async () => {
      // Validate inputs
      if (!id) {
        return failure(
          ERROR_CODES.VALIDATION_ERROR,
          'Report ID is required',
          new Error('Missing report ID'),
          { field: 'id' }
        );
      }

      const response = await fetch(`${this.baseURL}/api/reports/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusData)
      });
      
      if (!response.ok) {
        throw await this.handleHttpError(response, 'updateReportStatus');
      }
      
      const data = await response.json();
      return data.data;
    }, { operation: 'updateReportStatus', details: { id, statusData } });
  }

  /**
   * Helper method to handle HTTP errors and convert to Result pattern
   */
  private async handleHttpError(response: Response, operation: string): Promise<Error> {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // If we can't parse JSON, use status text
      errorData = { error: { message: response.statusText, code: `HTTP_${response.status}` } };
    }

    const { error } = errorData;
    const errorCode = this.mapHttpStatusToErrorCode(response.status, error?.code);
    const message = error?.message || `HTTP ${response.status}: ${response.statusText}`;

    return new Error(`[${operation}] ${errorCode}: ${message}`, {
      cause: { 
        originalError: error,
        httpStatus: response.status,
        operation,
        requestId: errorData.requestId 
      }
    });
  }

  /**
   * Map HTTP status codes to error codes
   */
  private mapHttpStatusToErrorCode(status: number, serverErrorCode?: string): string {
    // If server already provides an error code, use it
    if (serverErrorCode) {
      return serverErrorCode;
    }

    // Map status codes to error codes
    switch (status) {
      case 400:
      case 422:
        return ERROR_CODES.VALIDATION_ERROR;
      case 401:
        return ERROR_CODES.AUTHENTICATION_ERROR;
      case 403:
        return ERROR_CODES.AUTHORIZATION_ERROR;
      case 404:
        return ERROR_CODES.NOT_FOUND;
      case 409:
        return ERROR_CODES.CONFLICT;
      case 429:
        return ERROR_CODES.RATE_LIMIT_ERROR;
      case 500:
      case 502:
      case 503:
      case 504:
        return ERROR_CODES.SYSTEM_ERROR;
      default:
        return ERROR_CODES.SYSTEM_ERROR;
    }
  }

  /**
   * Validate report data using Result pattern
   */
  private async validateReportData(data: any): Promise<Result<any>> {
    if (!data || typeof data !== 'object') {
      return failure(
        ERROR_CODES.VALIDATION_ERROR,
        'Report data must be a valid object',
        new Error('Invalid report data type'),
        { field: 'data', type: typeof data }
      );
    }

    const requiredFields = ['schoolName', 'location', 'violationDescription'];
    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      return failure(
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        `Missing required fields: ${missingFields.join(', ')}`,
        new Error('Missing required fields'),
        { missingFields }
      );
    }

    // Additional validations
    if (data.schoolName && data.schoolName.length < 2) {
      return failure(
        ERROR_CODES.INVALID_FORMAT,
        'School name must be at least 2 characters long',
        new Error('School name too short'),
        { field: 'schoolName', length: data.schoolName.length }
      );
    }

    return success(data);
  }

  /**
   * Chain operations using Result pattern - update report then refresh data
   */
  async updateReportAndRefresh(id: string, statusData: any): Promise<Result<{ updated: Report, reports: Report[] }>> {
    // Chain two API calls using Result pattern
    const updateResult = await this.updateReportStatus(id, statusData);
    
    if (!isSuccess(updateResult)) {
      return updateResult; // Propagate the error
    }

    // Get updated reports list
    const refreshResult = await this.getReports({});
    if (!isSuccess(refreshResult)) {
      return failure(
        ERROR_CODES.DEPENDENCY_ERROR,
        'Report updated but failed to refresh reports',
        new Error('Dependency error in refresh'),
        { 
          updatedReport: updateResult.data,
          refreshError: refreshResult.error 
        }
      );
    }

    return success({
      updated: updateResult.data,
      reports: refreshResult.data
    });
  }
}

// Usage Examples with Result Pattern

/**
 * Example: Traditional error handling (BEFORE)
 */
async function oldExample() {
  const client = new OldApiClient('http://localhost:3000');
  
  try {
    const reports = await client.getReports({ status: 'active' });
    console.log('Reports:', reports);
  } catch (error) {
    // Need to handle different error types manually
    if (error.message.includes('401')) {
      console.log('Authentication required');
    } else if (error.message.includes('404')) {
      console.log('Reports not found');
    } else {
      console.log('Unknown error:', error.message);
    }
  }
}

/**
 * Example: Result pattern error handling (AFTER)
 */
async function newExample() {
  const client = new NewApiClient('http://localhost:3000');
  
  const result = await client.getReports({ status: 'active' });
  
  if (result.error) {
    // Handle different error types consistently
    if (isValidationError(result.error.code)) {
      console.log('Invalid parameters:', result.error.message);
    } else if (isResourceError(result.error.code)) {
      console.log('Resource not available:', result.error.message);
    } else if (isPermissionError(result.error.code)) {
      console.log('Permission denied:', result.error.message);
    } else {
      console.log('System error:', result.error.message);
    }
    return;
  }

  // Continue with successful result
  console.log('Reports:', result.data);
}

/**
 * Example: Composing operations with Result pattern
 */
async function complexExample() {
  const client = new NewApiClient('http://localhost:3000');
  
  // Submit a new report and handle the result
  const reportResult = await client.submitReport({
    schoolName: 'Example Driving School',
    location: '123 Main St, City, State',
    violationDescription: 'Operating without proper license',
    phoneNumber: '555-123-4567'
  });

  if (reportResult.error) {
    // Handle submission error
    if (isValidationError(reportResult.error.code)) {
      console.log('Please check your input:', reportResult.error.message);
    } else {
      console.log('Submission failed:', reportResult.error.message);
    }
    return;
  }

  // Success - now update the status
  const updateResult = await client.updateReportStatus(reportResult.data.id, {
    status: 'Under Investigation',
    notes: 'Initial review pending'
  });

  if (updateResult.error) {
    console.log('Update failed but report was created:', reportResult.data.id);
    return;
  }

  console.log('Report created and updated successfully:', updateResult.data.id);
}

// Testing with Result Pattern (More Reliable)

/**
 * Test example: Testing API responses with Result pattern
 */
async function testExample() {
  const client = new NewApiClient('http://localhost:3000');
  
  // Test 1: Successful API call
  const validResult = await client.submitReport({
    schoolName: 'Valid Driving School',
    location: '456 Oak St, City, State',
    violationDescription: 'Valid violation description'
  });

  console.assert(isSuccess(validResult), 'Valid report should succeed');
  console.assert(validResult.data?.id, 'Result should contain report ID');

  // Test 2: Validation error
  const invalidResult = await client.submitReport({
    schoolName: 'X', // Too short
    location: '',    // Empty
    violationDescription: 'Test'
  });

  console.assert(!isSuccess(invalidResult), 'Invalid report should fail');
  console.assert(invalidResult.error.code === ERROR_CODES.MISSING_REQUIRED_FIELD, 'Should be validation error');
  console.assert(invalidResult.error.details.missingFields?.length > 0, 'Should include missing fields');

  // Test 3: Network error
  const networkClient = new NewApiClient('http://nonexistent-server:3000');
  const networkResult = await networkClient.getReports({});
  
  console.assert(!isSuccess(networkResult), 'Network error should fail');
  console.assert(isSystemError(networkResult.error.code), 'Should be system error');
}

export { NewApiClient, newExample, complexExample, testExample };