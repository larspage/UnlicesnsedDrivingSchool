# NJDSC School Compliance Portal - API Specification

## 1. Overview

The NJDSC School Compliance Portal API is a RESTful API that provides endpoints for report submission, data retrieval, file management, and administrative functions. All API endpoints return JSON responses and use standard HTTP status codes.

### 1.1 Base URL
```
https://api.unlicenseddrivingschoolnj.com/v1
```

### 1.2 Content Type
All requests and responses use JSON format:
```
Content-Type: application/json
```

### 1.3 Rate Limiting
- Public endpoints: 100 requests per hour per IP
- Authenticated endpoints: 1000 requests per hour per user
- File upload: 10 requests per hour per IP

## 2. Authentication

### 2.1 Authentication Methods
- **Bearer Token**: JWT tokens obtained from Auth0/Firebase Auth
- **API Key**: For server-to-server communications (future use)

### 2.2 Authorization Header
```
Authorization: Bearer <jwt_token>
```

### 2.3 Role-Based Access
- **Public**: No authentication required
- **Admin**: Requires admin role in JWT token

### 2.4 Authentication Errors
```json
{
  "error": "Unauthorized",
  "message": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

## 3. Common Response Formats

### 3.1 Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### 3.2 Error Response
```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### 3.3 Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## 4. Reports API

### 4.1 Submit Report
Create a new school compliance report.

**Endpoint:** `POST /api/reports`

**Authentication:** None (Public)

**Rate Limit:** 5 submissions per hour per IP

**Request Body:**
```json
{
  "schoolName": "ABC Driving School",
  "location": "Newark",
  "violationDescription": "Operating without proper license",
  "phoneNumber": "+1-555-123-4567",
  "websiteUrl": "https://abcdriving.com",
  "files": [
    {
      "name": "evidence.jpg",
      "type": "image/jpeg",
      "size": 2048000,
      "data": "base64-encoded-file-data"
    }
  ]
}
```

**Request Schema:**
```json
{
  "type": "object",
  "properties": {
    "schoolName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 255,
      "description": "Name of the driving school"
    },
    "location": {
      "type": "string",
      "maxLength": 100,
      "description": "Town/city where school was spotted"
    },
    "violationDescription": {
      "type": "string",
      "maxLength": 1000,
      "description": "Description of the violation"
    },
    "phoneNumber": {
      "type": "string",
      "pattern": "^\\+?1?[-.\\s]?\\(?([0-9]{3})\\)?[-.\\s]?([0-9]{3})[-.\\s]?([0-9]{4})$",
      "description": "Phone number in valid format"
    },
    "websiteUrl": {
      "type": "string",
      "format": "uri",
      "description": "Website or social media URL"
    },
    "files": {
      "type": "array",
      "maxItems": 10,
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "type": { "type": "string", "enum": ["image/jpeg", "image/png", "video/mp4"] },
          "size": { "type": "number", "maximum": 10485760 },
          "data": { "type": "string", "description": "Base64 encoded file data" }
        },
        "required": ["name", "type", "size", "data"]
      }
    }
  },
  "required": ["schoolName"]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "rep_123456",
    "schoolName": "ABC Driving School",
    "location": "Newark",
    "status": "Added",
    "createdAt": "2025-09-26T17:30:00Z",
    "lastReported": "2025-09-26T17:30:00Z"
  },
  "message": "Report submitted successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### 4.2 Get Reports
Retrieve paginated list of reports with optional filtering.

**Endpoint:** `GET /api/reports`

**Authentication:** None for public view, Admin for all reports

**Query Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 20, max: 100): Items per page
- `status` (string): Filter by status
- `search` (string): Search in school name or description
- `sortBy` (string, default: "lastReported"): Sort field
- `sortOrder` (string, default: "desc"): Sort order (asc/desc)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "rep_123456",
        "schoolName": "ABC Driving School",
        "location": "Newark",
        "violationDescription": "Operating without license",
        "phoneNumber": "+1-555-123-4567",
        "websiteUrl": "https://abcdriving.com",
        "uploadedFiles": [
          {
            "id": "file_789",
            "name": "evidence.jpg",
            "type": "image/jpeg",
            "url": "https://drive.google.com/file/d/123...",
            "thumbnailUrl": "https://drive.google.com/thumbnail/123..."
          }
        ],
        "socialMediaLinks": ["https://facebook.com/abcdrivingschool"],
        "additionalInfo": "Found additional locations in Newark and Jersey City",
        "status": "Confirmed by NJDSC",
        "lastReported": "2025-09-26T17:30:00Z",
        "createdAt": "2025-09-25T10:15:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 4.3 Update Report Status
Update the status of a report (Admin only).

**Endpoint:** `PUT /api/reports/{id}/status`

**Authentication:** Admin required

**Path Parameters:**
- `id` (string): Report ID

**Request Body:**
```json
{
  "status": "Reported to MVC",
  "notes": "Forwarded to MVC for investigation"
}
```

**Status Options:**
- "Added"
- "Confirmed by NJDSC"
- "Reported to MVC"
- "Under Investigation"
- "Closed"

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "rep_123456",
    "status": "Reported to MVC",
    "updatedAt": "2025-09-26T18:00:00Z"
  },
  "message": "Status updated successfully"
}
```

### 4.4 Send Report to MVC
Send report details to MVC via email (Admin only).

**Endpoint:** `POST /api/reports/{id}/send-mvc`

**Authentication:** Admin required

**Request Body:**
```json
{
  "customMessage": "Additional context for MVC review"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "emailId": "email_456",
    "sentAt": "2025-09-26T18:00:00Z",
    "recipient": "mvc.blsdrivingschools@mvc.nj.gov"
  },
  "message": "Report sent to MVC successfully"
}
```

## 5. Files API

### 5.1 Upload Files
Upload multiple media files for a report.

**Endpoint:** `POST /api/files/upload`

**Authentication:** None (Public)

**Rate Limit:** 10 uploads per hour per IP

**Content-Type:** `multipart/form-data`

**Form Data:**
- `files`: File data (max 10 files, 10MB each)
- `reportId`: Associated report ID (required)

**Supported File Types:**
- Images: JPEG, PNG, GIF, WebP
- Videos: MP4, AVI, MOV
- Documents: PDF

**Request Limits:**
- Maximum 10 files per upload
- Maximum 10MB per file
- Maximum 10 files per report

**Success Response (201):**
```json
{
  "success": true,
  "message": "Successfully uploaded 2 of 2 files",
  "data": {
    "files": [
      {
        "id": "file_abc123",
        "name": "evidence1.jpg",
        "type": "image/jpeg",
        "size": 2048000,
        "url": "https://drive.google.com/uc?export=download&id=drive123",
        "thumbnailUrl": "https://drive.google.com/thumbnail?id=drive123&sz=s400",
        "uploadedAt": "2025-09-26T17:30:00Z"
      },
      {
        "id": "file_def456",
        "name": "evidence2.png",
        "type": "image/png",
        "size": 1536000,
        "url": "https://drive.google.com/uc?export=download&id=drive456",
        "thumbnailUrl": "https://drive.google.com/thumbnail?id=drive456&sz=s400",
        "uploadedAt": "2025-09-26T17:30:01Z"
      }
    ],
    "totalUploaded": 2,
    "totalRequested": 2
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing reportId, invalid file format, or file too large
- `413 Payload Too Large`: File exceeds 10MB limit
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Upload failed or storage service error

### 5.2 Get File by ID
Get metadata for a specific file.

**Endpoint:** `GET /api/files/{id}`

**Authentication:** None (Public)

**Path Parameters:**
- `id` (string, required): File ID in format `file_XXXXXX`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "file_abc123",
    "reportId": "rep_xyz789",
    "name": "evidence.jpg",
    "type": "image/jpeg",
    "size": 2048000,
    "url": "https://drive.google.com/uc?export=download&id=drive123",
    "thumbnailUrl": "https://drive.google.com/thumbnail?id=drive123&sz=s400",
    "uploadedAt": "2025-09-26T17:30:00Z",
    "uploadedByIp": "192.168.1.100",
    "processingStatus": "completed"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file ID format
- `404 Not Found`: File not found
- `500 Internal Server Error`: Database or storage error

### 5.3 Get Files by Report ID
Get all files associated with a specific report.

**Endpoint:** `GET /api/files/report/{reportId}`

**Authentication:** None (Public)

**Path Parameters:**
- `reportId` (string, required): Report ID in format `rep_XXXXXX`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "file_abc123",
        "name": "evidence1.jpg",
        "type": "image/jpeg",
        "size": 2048000,
        "url": "https://drive.google.com/uc?export=download&id=drive123",
        "thumbnailUrl": "https://drive.google.com/thumbnail?id=drive123&sz=s400",
        "uploadedAt": "2025-09-26T17:30:00Z",
        "processingStatus": "completed"
      },
      {
        "id": "file_def456",
        "name": "evidence2.png",
        "type": "image/png",
        "size": 1536000,
        "url": "https://drive.google.com/uc?export=download&id=drive456",
        "thumbnailUrl": "https://drive.google.com/thumbnail?id=drive456&sz=s400",
        "uploadedAt": "2025-09-26T17:30:01Z",
        "processingStatus": "completed"
      }
    ],
    "total": 2
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid report ID format
- `404 Not Found`: Report not found or no files associated
- `500 Internal Server Error`: Database or storage error

### 5.4 Get All Files
Get all files in the system (Admin/Debugging).

**Endpoint:** `GET /api/files`

**Authentication:** None (Public)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "file_abc123",
        "reportId": "rep_xyz789",
        "name": "evidence.jpg",
        "type": "image/jpeg",
        "size": 2048000,
        "url": "https://drive.google.com/uc?export=download&id=drive123",
        "thumbnailUrl": "https://drive.google.com/thumbnail?id=drive123&sz=s400",
        "uploadedAt": "2025-09-26T17:30:00Z",
        "processingStatus": "completed"
      }
    ],
    "total": 1
  }
}
```

**Error Responses:**
- `500 Internal Server Error`: Database or storage error

### 5.5 Update File Processing Status
Update the processing status of a file (Internal use).

**Endpoint:** `PUT /api/files/{id}/status`

**Authentication:** None (Public)

**Path Parameters:**
- `id` (string, required): File ID in format `file_XXXXXX`

**Request Body:**
```json
{
  "status": "completed"
}
```

**Valid Status Values:**
- `pending`: File uploaded, processing not started
- `processing`: File is being processed
- `completed`: File processing completed successfully
- `failed`: File processing failed

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "file_abc123",
    "processingStatus": "completed"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file ID format or invalid status
- `404 Not Found`: File not found
- `500 Internal Server Error`: Database or storage error

### 5.6 File Validation Rules

**File Format Validation:**
- Supported MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/avi`, `video/mov`, `application/pdf`
- Maximum file size: 10MB per file
- Maximum files per upload: 10 files
- Maximum files per report: 10 files

**Business Rules:**
- Files must be associated with a valid report ID
- Thumbnail URLs are only generated for image files
- Processing status must be one of the valid enum values
- File names are sanitized and stored as provided by client

### 5.7 File Storage Architecture

**Google Drive Integration:**
- Files are uploaded to Google Drive for storage
- Public URLs are generated using Google's export/download API
- Thumbnail URLs are generated for image files using Google's thumbnail API

**Google Sheets Integration:**
- File metadata is stored in Google Sheets for tracking
- Processing status is updated in real-time
- File relationships with reports are maintained

**Error Handling:**
- Failed uploads are logged but don't prevent other files from uploading
- Storage service errors are handled gracefully with appropriate HTTP status codes
- Rate limiting prevents abuse of the upload service

## 6. Configuration API

### 6.1 Get All Configuration
Retrieve all system configuration settings (Admin only).

**Endpoint:** `GET /api/config`

**Authentication:** Admin required (X-Admin-Key header)

**Headers:**
```
X-Admin-Key: <admin_api_key>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "email.toAddress": "mvc.blsdrivingschools@mvc.nj.gov",
    "email.fromAddress": "treasurer@njdsc.org",
    "email.subjectTemplate": "Unlicensed driving school [[School Name]]",
    "email.bodyTemplate": "Dear MVC,\n\nPlease investigate the following unlicensed driving school...",
    "google.sheets.spreadsheetId": "1ABC...",
    "google.drive.folderId": "1XYZ...",
    "system.rateLimitPerHour": 5,
    "system.maxFileSize": 10485760
  },
  "count": 8,
  "timestamp": "2025-09-27T00:42:18.162Z"
}
```

**Error Responses:**
- `403 Forbidden`: Invalid or missing admin key
- `500 Internal Server Error`: Configuration retrieval failed

### 6.2 Get Single Configuration Value
Retrieve a specific configuration value by key (Admin only).

**Endpoint:** `GET /api/config/{key}`

**Authentication:** Admin required (X-Admin-Key header)

**Path Parameters:**
- `key` (string): Configuration key (e.g., "email.toAddress")

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "key": "email.toAddress",
    "value": "mvc.blsdrivingschools@mvc.nj.gov"
  },
  "timestamp": "2025-09-27T00:42:18.162Z"
}
```

**Error Responses:**
- `403 Forbidden`: Invalid or missing admin key
- `404 Not Found`: Configuration key not found
- `500 Internal Server Error`: Configuration retrieval failed

### 6.3 Update Configuration
Update or create a configuration value (Admin only).

**Endpoint:** `PUT /api/config`

**Authentication:** Admin required (X-Admin-Key header)

**Headers:**
```
X-Admin-Key: <admin_api_key>
X-Admin-User: <admin_username> (optional)
```

**Request Body:**
```json
{
  "key": "email.toAddress",
  "value": "new@mvc.nj.gov",
  "type": "string",
  "category": "email",
  "description": "Updated MVC email address"
}
```

**Request Schema:**
```json
{
  "type": "object",
  "properties": {
    "key": {
      "type": "string",
      "maxLength": 100,
      "description": "Configuration key"
    },
    "value": {
      "description": "Configuration value (any type)"
    },
    "type": {
      "type": "string",
      "enum": ["string", "number", "boolean", "json"],
      "description": "Data type of the value"
    },
    "category": {
      "type": "string",
      "enum": ["email", "google", "system"],
      "description": "Configuration category"
    },
    "description": {
      "type": "string",
      "maxLength": 500,
      "description": "Human-readable description"
    }
  },
  "required": ["key", "value", "type", "category"]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "key": "email.toAddress",
    "value": "new@mvc.nj.gov",
    "type": "string",
    "category": "email",
    "description": "Updated MVC email address",
    "updatedAt": "2025-09-27T00:42:18.162Z",
    "updatedBy": "admin"
  },
  "message": "Configuration \"email.toAddress\" has been updated successfully",
  "timestamp": "2025-09-27T00:42:18.162Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data or validation failed
- `403 Forbidden`: Invalid or missing admin key
- `500 Internal Server Error`: Configuration update failed

### 6.4 Validate Configuration
Validate configuration input without saving (Admin only).

**Endpoint:** `POST /api/config/validate`

**Authentication:** Admin required (X-Admin-Key header)

**Request Body:**
```json
{
  "key": "email.toAddress",
  "value": "test@mvc.nj.gov",
  "type": "string"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Configuration input is valid",
  "timestamp": "2025-09-27T00:42:18.162Z"
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed
- `403 Forbidden`: Invalid or missing admin key

## 7. Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `DUPLICATE_REPORT` | 409 | Report already exists for this school |
| `FILE_TOO_LARGE` | 413 | Uploaded file exceeds size limit |
| `UNSUPPORTED_FILE_TYPE` | 415 | File type not supported |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `AUTH_REQUIRED` | 401 | Authentication required |
| `INSUFFICIENT_PERMISSIONS` | 403 | Admin access required |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `EXTERNAL_API_ERROR` | 502 | Google API error |
| `INTERNAL_ERROR` | 500 | Internal server error |

## 8. Webhooks (Future)

### 8.1 Google Sheets Change Notification
```
POST /api/webhooks/sheets
```

Triggered when Google Sheets data changes.

### 8.2 File Processing Complete
```
POST /api/webhooks/file-processed
```

Triggered when file processing (thumbnail generation) completes.

## 9. Implementation Status

### Phase 1: Infrastructure & Foundation Setup ✅ COMPLETED
**Completion Date:** September 26, 2025

#### ✅ Implemented Components:
- **Express Server:** Basic server with middleware (CORS, security, rate limiting, compression)
- **API Structure:** RESTful route structure with organized endpoints
- **Error Handling:** Global error handling and standardized response formats
- **Validation:** Request validation middleware framework ready
- **Security:** Helmet, rate limiting, and input sanitization configured
- **Environment Config:** Environment-based configuration system
- **Health Checks:** Basic health check endpoint (`/health`)

#### 🔄 Placeholder Endpoints (Phase 1):
- `GET /api/status` - API status information
- `POST /api/reports` - Returns 501 (Not Implemented)
- `GET /api/reports` - Returns placeholder response

#### ✅ Implemented Endpoints (Phase 2, Task 4):
- `GET /api/config` - Retrieve all configuration settings (Admin only)
- `GET /api/config/{key}` - Retrieve single configuration value (Admin only)
- `PUT /api/config` - Update/create configuration value (Admin only)
- `POST /api/config/validate` - Validate configuration input (Admin only)

#### ✅ Implemented Endpoints (Phase 3, Files API):
- `POST /api/files/upload` - Upload multiple files with validation
- `GET /api/files/{id}` - Get file metadata by ID
- `GET /api/files/report/{reportId}` - Get all files for a report
- `GET /api/files` - Get all files (admin/debugging)
- `PUT /api/files/{id}/status` - Update file processing status

#### ✅ Implemented Endpoints (Phase 3, Reports API):
- `POST /api/reports` - Submit new report with file uploads and validation
- `GET /api/reports` - Retrieve reports with pagination, filtering, and search
- `GET /api/reports/{id}` - Get specific report by ID
- `PUT /api/reports/{id}/status` - Update report status (Admin only)
- `PUT /api/reports/bulk/status` - Bulk status updates (Admin only)
- `GET /api/reports/stats` - Get report statistics for dashboard

#### 🔄 Next Phase: Admin Features & Email Integration
- Enhanced email composition and MVC notifications
- Advanced admin dashboard features
- Audit logging and compliance tracking
- Production deployment and monitoring

---

**API Version:** 1.1
**Last Updated:** September 30, 2025
**Base URL:** https://api.unlicenseddrivingschoolnj.com/v1