// Complete Example: Proper Result Object Pattern Implementation
// This shows the correct way to use structured error objects with the ERROR_CODES system

const { success, failure, attempt, attemptAsync, isSuccess } = require('../server/utils/result');
const { createError, validationError, notFoundError, fileError, databaseError, authError, configError, validateRequired, validateStringLength, ERROR_CODES } = require('../server/utils/errorUtils');

/**
 * Example: Complete fileService.getFileById implementation
 * This demonstrates the proper Result Object pattern with structured errors
 */
async function getFileById(fileId) {
  return attemptAsync(async () => {
    // 1. Input validation using structured error utilities
    const validationError = validateRequired(fileId, 'File ID', 'non-empty string');
    if (validationError) {
      throw validationError; // This throws a structured error object with ERROR_CODES.VALIDATION_ERROR
    }
    
    // 2. Database/storage operations with Result pattern
    const allFilesResult = await getAllFiles(); // Returns Promise<Result<File[]>>
    if (!isSuccess(allFilesResult)) {
      // If getAllFiles fails, it returns Result with structured error
      throw allFilesResult.error; // Propagate the structured error
    }
    const allFiles = allFilesResult.data;
    
    // 3. Business logic with structured error handling
    const file = allFiles.find(f => f.id === fileId);
    if (!file) {
      throw notFoundError('File', fileId); // Throws structured error with ERROR_CODES.NOT_FOUND
    }
    
    return file; // Success case - return the data
  }, { operation: 'getFileById', details: { fileId, hasFileId: !!fileId } });
}

/**
 * Example: Complete fileService.uploadFile implementation
 * This shows comprehensive error handling with different error types
 */
async function uploadFile(file, fileName, mimeType, reportId, uploadedByIp = null) {
  return attemptAsync(async () => {
    // 1. Multiple input validations
    const fileError = validateRequired(file, 'File', 'file object');
    if (fileError) throw fileError;
    
    const nameError = validateRequired(fileName, 'File name', 'non-empty string');
    if (nameError) throw nameError;
    
    const typeError = validateRequired(mimeType, 'MIME type', 'non-empty string');
    if (typeError) throw typeError;
    
    const reportError = validateRequired(reportId, 'Report ID', 'non-empty string');
    if (reportError) throw reportError;
    
    // 2. Business logic validation
    const validation = File.validateUploadParams(fileBuffer, fileName, mimeType, reportId);
    if (!validation.isValid) {
      throw validationError('uploadParams', validation.error, { fileName, mimeType, reportId });
    }
    
    // 3. File system operations
    const existingFilesResult = await getFilesByReportId(reportId);
    if (!isSuccess(existingFilesResult)) {
      throw existingFilesResult.error;
    }
    
    // 4. Database operations
    const file = File.create(fileRecordData, uploadedByIp);
    const saveResult = await saveFileToJson(file);
    if (!isSuccess(saveResult)) {
      throw saveResult.error;
    }
    
    return file; // Success case
  }, { operation: 'uploadFile', details: { fileName, mimeType, reportId, hasIp: !!uploadedByIp } });
}

/**
 * Example: Result object usage in calling code
 */
async function exampleUsage() {
  try {
    // Calling a service method that returns Promise<Result<File>>
    const result = await getFileById('file-123');
    
    if (isSuccess(result)) {
      // Success case
      const file = result.data;
      console.log('File found:', file);
      
      // Now you can safely use the file object
      if (file.mimeType.startsWith('image/')) {
        console.log('Processing image file:', file.name);
      }
    } else {
      // Error case - use structured error information
      const error = result.error;
      
      switch (error.code) {
        case ERROR_CODES.VALIDATION_ERROR:
          console.log('Invalid input:', error.message);
          console.log('Validation details:', error.details);
          // Handle validation errors specifically
          break;
          
        case ERROR_CODES.NOT_FOUND:
          console.log('File not found:', error.message);
          console.log('Resource type:', error.details.resourceType);
          console.log('Resource ID:', error.details.resourceId);
          // Handle "not found" errors specifically
          break;
          
        case ERROR_CODES.DATABASE_ERROR:
          console.log('Database error:', error.message);
          console.log('Operation:', error.details.operation);
          // Handle database errors specifically
          break;
          
        default:
          console.log('Unknown error:', error.code, error.message);
          console.log('Error details:', error.details);
          console.log('Inner error:', error.innerError);
      }
    }
  } catch (error) {
    // This shouldn't happen if using the Result pattern correctly
    // But we still catch unexpected errors
    console.error('Unexpected error:', error);
  }
}

/**
 * Example: Service composition with Result pattern
 */
async function getReportFiles(reportId) {
  return attemptAsync(async () => {
    // Get all files for the report
    const filesResult = await getFilesByReportId(reportId);
    if (!isSuccess(filesResult)) {
      throw filesResult.error;
    }
    const files = filesResult.data;
    
    // Validate report exists by checking for files (if needed)
    if (files.length === 0) {
      throw notFoundError('Files for report', reportId);
    }
    
    // Process files
    const processedFiles = files.map(file => ({
      id: file.id,
      name: file.originalName,
      size: file.size,
      isImage: file.mimeType.startsWith('image/')
    }));
    
    return {
      reportId,
      fileCount: processedFiles.length,
      files: processedFiles,
      totalSize: processedFiles.reduce((sum, f) => sum + f.size, 0)
    };
  }, { operation: 'getReportFiles', details: { reportId } });
}

/**
 * Example: Error re-throwing with context
 */
async function exampleErrorReThrowing() {
  return attemptAsync(async () => {
    try {
      const result = await fileService.uploadFile(...uploadParams);
      if (!isSuccess(result)) {
        // If it's a validation error, we might want to add more context
        if (result.error.code === ERROR_CODES.VALIDATION_ERROR) {
          // Re-throw with additional context
          throw createError(
            ERROR_CODES.VALIDATION_ERROR,
            `File upload validation failed: ${result.error.message}`,
            { ...result.error.details, context: 'bulk_upload' },
            result.error.innerError
          );
        }
        // Otherwise, re-throw the original error
        throw result.error;
      }
      
      return result.data;
    } catch (error) {
      // If it's already a structured error, re-throw as-is
      if (error.code && error.details) {
        throw error;
      }
      
      // If it's a generic error, wrap it
      throw createError(
        ERROR_CODES.FILE_UPLOAD_FAILED,
        'File upload operation failed',
        { context: 'bulk_upload' },
        error
      );
    }
  }, { operation: 'bulkFileUpload' });
}

/**
 * Example: Proper error handling in route handlers
 */
function handleGetFileRequest(req, res) {
  const fileId = req.params.fileId;
  
  // Use the service method
  getFileById(fileId)
    .then(result => {
      if (isSuccess(result)) {
        // Success - return 200 with data
        res.status(200).json({
          success: true,
          data: result.data
        });
      } else {
        // Error - map error code to HTTP status
        const error = result.error;
        let httpStatus = 500; // Default to internal server error
        
        switch (error.code) {
          case ERROR_CODES.VALIDATION_ERROR:
            httpStatus = 400; // Bad Request
            break;
          case ERROR_CODES.NOT_FOUND:
            httpStatus = 404; // Not Found
            break;
          case ERROR_CODES.FILE_NOT_FOUND:
            httpStatus = 404; // Not Found
            break;
          case ERROR_CODES.DATABASE_ERROR:
            httpStatus = 500; // Internal Server Error
            break;
          case ERROR_CODES.AUTHORIZATION_ERROR:
            httpStatus = 403; // Forbidden
            break;
        }
        
        res.status(httpStatus).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        });
      }
    })
    .catch(error => {
      // Unexpected error handling
      console.error('Unexpected error in getFileById:', error);
      res.status(500).json({
        success: false,
        error: {
          code: ERROR_CODES.SYSTEM_ERROR,
          message: 'An unexpected error occurred',
          details: { originalError: error.message }
        }
      });
    });
}

/**
 * Key Benefits of This Pattern:
 * 
 * 1. **Structured Error Information**: Every error has:
 *    - code: Consistent error category (ERROR_CODES.*)
 *    - message: Human-readable error message
 *    - details: Context-specific information
 *    - innerError: Original error for debugging
 * 
 * 2. **Type Safety**: All methods return Promise<Result<T>>, making error handling explicit
 * 
 * 3. **Testability**: Tests can check error.code instead of error.message
 * 
 * 4. **Consistent Error Handling**: All services use the same error patterns
 * 
 * 5. **Enhanced Debugging**: innerError preserves original error context
 * 
 * 6. **HTTP Mapping**: Easy to map error codes to HTTP status codes
 */

module.exports = {
  getFileById,
  uploadFile,
  exampleUsage,
  getReportFiles,
  exampleErrorReThrowing,
  handleGetFileRequest
};