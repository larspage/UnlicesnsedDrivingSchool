// Result Object Pattern Implementation Example: API Client Refactoring
// This demonstrates how to refactor existing services to use the Result pattern

// Import path adjustments for docs directory
// import { Result, ResultSuccess, ResultFailure } from '../src/types/result';
// import { success, failure, attempt, isSuccess, unwrap, unwrapOr } from '../src/utils/resultUtils';
// import { ERROR_CODES, isValidationError, isResourceError, isPermissionError } from '../src/constants/errorCodes';

// Simulated types for documentation purposes
interface Result<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
    innerError: Error;
  } | null;
}

interface Report {
  id: string;
  schoolName: string;
  location: string;
  violationDescription: string;
  status: string;
}

// BEFORE: Old API Client (throwing errors, mixed error handling)
class OldApiClient {
  constructor(private baseURL: string) {
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
  constructor(private baseURL: string) {}

  // Error codes (would be imported from constants)
  private ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    SYSTEM_ERROR: 'SYSTEM_ERROR',
    DEPENDENCY_ERROR: 'DEPENDENCY_ERROR'
  };

  /**
   * Get reports with Result pattern - no more unhandled promise rejections
   */
  async getReports(params: any): Promise<Result<Report[]>> {
    return this.attempt(async () => {
      const response = await fetch(`${this.baseURL}/api/reports?${new URLSearchParams(params)}`);
      
      if (!response.ok) {
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
    return this.attempt(async () => {
      // Validate input first using Result pattern
      const validationResult = this.validateReportData(reportData);
      if (!validationResult.success) {
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
    return this.attempt(async () => {
      // Validate inputs
      if (!id) {
        return this.failure(
          this.ERROR_CODES.VALIDATION_ERROR,
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
   * Chain operations using Result pattern - update report then refresh data
   */
  async updateReportAndRefresh(id: string, statusData: any): Promise<Result<{ updated: Report, reports: Report[] }>> {
    // Chain two API calls using Result pattern
    const updateResult = await this.updateReportStatus(id, statusData);
    
    if (!updateResult.success) {
      return updateResult; // Propagate the error
    }

    // Get updated reports list
    const refreshResult = await this.getReports({});
    if (!refreshResult.success) {
      return this.failure(
        this.ERROR_CODES.DEPENDENCY_ERROR,
        'Report updated but failed to refresh reports',
        new Error('Dependency error in refresh'),
        { 
          updatedReport: updateResult.data,
          refreshError: refreshResult.error 
        }
      );
    }

    return this.success({
      updated: updateResult.data,
      reports: refreshResult.data
    });
  }

  // Helper methods
  private success<T>(data: T): Result<T> {
    return { success: true, data, error: null };
  }

  private failure<T>(code: string, message: string, innerError: Error, details?: any): Result<T> {
    return {
      success: false,
      data: null,
      error: { code, message, details, innerError }
    };
  }

  private async attempt<T>(operation: () => Promise<T>, context: { operation: string; details?: any } = { operation: 'unknown' }): Promise<Result<T>> {
    try {
      const data = await operation();
      return this.success(data);
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      const errorCode = this.getErrorCode(typedError, context.operation);
      return this.failure(
        errorCode,
        typedError.message,
        typedError,
        { ...context.details, operation: context.operation }
      );
    }
  }

  private getErrorCode(error: Error, operation: string): string {
    const errorMessage = error.message.toLowerCase();
    
    switch (operation.toLowerCase()) {
      case 'validation':
      case 'validate':
        return this.ERROR_CODES.VALIDATION_ERROR;
      
      case 'find':
      case 'get':
        if (errorMessage.includes('not found') || errorMessage.includes('no such file')) {
          return this.ERROR_CODES.NOT_FOUND;
        }
        return this.ERROR_CODES.SYSTEM_ERROR;
      
      case 'auth':
      case 'login':
      case 'authenticate':
        if (errorMessage.includes('invalid') || errorMessage.includes('wrong')) {
          return this.ERROR_CODES.AUTHENTICATION_ERROR;
        }
        if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
          return this.ERROR_CODES.AUTHORIZATION_ERROR;
        }
        return this.ERROR_CODES.AUTHENTICATION_ERROR;
      
      default:
        return this.ERROR_CODES.SYSTEM_ERROR;
    }
  }

  private async handleHttpError(response: Response, operation: string): Promise<Error> {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (e) {
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

  private mapHttpStatusToErrorCode(status: number, serverErrorCode?: string): string {
    if (serverErrorCode) {
      return serverErrorCode;
    }

    switch (status) {
      case 400:
      case 422:
        return this.ERROR_CODES.VALIDATION_ERROR;
      case 401:
        return this.ERROR_CODES.AUTHENTICATION_ERROR;
      case 403:
        return this.ERROR_CODES.AUTHORIZATION_ERROR;
      case 404:
        return this.ERROR_CODES.NOT_FOUND;
      case 409:
        return this.ERROR_CODES.CONFLICT;
      case 429:
        return this.ERROR_CODES.RATE_LIMIT_ERROR;
      case 500:
      case 502:
      case 503:
      case 504:
        return this.ERROR_CODES.SYSTEM_ERROR;
      default:
        return this.ERROR_CODES.SYSTEM_ERROR;
    }
  }

  private validateReportData(data: any): Result<any> {
    if (!data || typeof data !== 'object') {
      return this.failure(
        this.ERROR_CODES.VALIDATION_ERROR,
        'Report data must be a valid object',
        new Error('Invalid report data type'),
        { field: 'data', type: typeof data }
      );
    }

    const requiredFields = ['schoolName', 'location', 'violationDescription'];
    const missingFields = requiredFields.filter(field => !data[field]);

    if (missingFields.length > 0) {
      return this.failure(
        this.ERROR_CODES.MISSING_REQUIRED_FIELD,
        `Missing required fields: ${missingFields.join(', ')}`,
        new Error('Missing required fields'),
        { missingFields }
      );
    }

    return this.success(data);
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
    const errorCode = result.error.code;
    if (errorCode === 'VALIDATION_ERROR') {
      console.log('Invalid parameters:', result.error.message);
    } else if (errorCode === 'NOT_FOUND') {
      console.log('Resource not available:', result.error.message);
    } else if (errorCode === 'AUTHENTICATION_ERROR') {
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
    if (reportResult.error.code === 'VALIDATION_ERROR') {
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

  console.assert(validResult.success, 'Valid report should succeed');
  console.assert(!!validResult.data?.id, 'Result should contain report ID');

  // Test 2: Validation error
  const invalidResult = await client.submitReport({
    schoolName: 'X', // Too short
    location: '',    // Empty
    violationDescription: 'Test'
  });

  console.assert(!invalidResult.success, 'Invalid report should fail');
  console.assert(invalidResult.error.code === 'MISSING_REQUIRED_FIELD', 'Should be validation error');
  console.assert(invalidResult.error.details.missingFields?.length > 0, 'Should include missing fields');

  // Test 3: Network error
  const networkClient = new NewApiClient('http://nonexistent-server:3000');
  const networkResult = await networkClient.getReports({});
  
  console.assert(!networkResult.success, 'Network error should fail');
  console.assert(networkResult.error.code === 'SYSTEM_ERROR', 'Should be system error');
}

export { NewApiClient, oldExample, newExample, complexExample, testExample };