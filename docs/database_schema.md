# NJDSC School Compliance Portal - Database Schema

## 1. Overview

The NJDSC School Compliance Portal uses local JSON file storage on DigitalOcean droplets as its primary data store, with local file system storage for uploaded images. This document defines the schema for all data entities, including field definitions, data types, constraints, and relationships.

### 1.1 Data Storage Architecture
- **Primary Database:** Local JSON files on DigitalOcean droplet
- **File Storage:** Local directory structure on DigitalOcean droplet
- **Backup Strategy:** Automated file system backups and snapshots
- **Data Retention:** Indefinite (regulatory compliance)

### 1.2 Schema Versioning
- Schema changes require migration scripts
- Backward compatibility maintained
- Version tracking in configuration files

## 2. Reports JSON File

### 2.1 File Structure
**File Location:** `/var/www/data/reports.json`
**Format:** JSON Array of report objects
**Primary Key:** id (unique identifier)

### 2.2 JSON Schema

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "pattern": "^rep_[a-zA-Z0-9]{6}$",
        "description": "Unique report identifier"
      },
      "schoolName": {
        "type": "string",
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
        "description": "Contact phone number (E.164 format)"
      },
      "websiteUrl": {
        "type": "string",
        "format": "uri",
        "maxLength": 500,
        "description": "Website or primary social media URL"
      },
      "uploadedFiles": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {"type": "string"},
            "name": {"type": "string"},
            "type": {"type": "string"},
            "size": {"type": "number"},
            "url": {"type": "string", "format": "uri"},
            "uploadedAt": {"type": "string", "format": "date-time"}
          }
        },
        "description": "Array of uploaded file metadata"
      },
      "socialMediaLinks": {
        "type": "array",
        "items": {"type": "string", "format": "uri"},
        "description": "Discovered social media links"
      },
      "additionalInfo": {
        "type": "string",
        "maxLength": 2000,
        "description": "Auto-enriched information"
      },
      "status": {
        "type": "string",
        "enum": ["Added", "Confirmed by NJDSC", "Reported to MVC", "Under Investigation", "Closed"],
        "default": "Added",
        "description": "Current investigation status"
      },
      "lastReported": {
        "type": "string",
        "format": "date-time",
        "description": "Last report submission date"
      },
      "createdAt": {
        "type": "string",
        "format": "date-time",
        "description": "Initial report creation date"
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time",
        "description": "Last modification date"
      },
      "reporterIp": {
        "type": "string",
        "description": "Submitter's IP address"
      },
      "adminNotes": {
        "type": "string",
        "maxLength": 500,
        "description": "Internal administrative notes"
      },
      "mvcReferenceNumber": {
        "type": "string",
        "maxLength": 50,
        "description": "MVC case reference number"
      }
    },
    "required": ["id", "schoolName", "status", "lastReported", "createdAt", "updatedAt"]
  }
}
```

### 2.2 Status Enum Values
- **Added**: Initial status after submission and enrichment
- **Confirmed by NJDSC**: Verified by NJDSC staff
- **Reported to MVC**: Forwarded to Motor Vehicle Commission
- **Under Investigation**: Active MVC investigation
- **Closed**: Case resolved or dismissed

### 2.3 Data Validation Rules

#### School Name Validation
- Required field
- Minimum 2 characters, maximum 255 characters
- Trimmed whitespace
- Case-insensitive duplicate detection

#### Phone Number Validation
- Optional field
- Must match US phone number format
- Auto-formatting: (XXX) XXX-XXXX
- Storage: E.164 format (+15551234567)

#### URL Validation
- Optional field
- Must be valid HTTP/HTTPS URL
- Auto-normalization (add https:// if missing)
- Maximum 500 characters

#### File Array Validation
- JSON array of file objects
- Maximum 10 files per report
- Each file object:
  ```json
  {
    "id": "file_123",
    "name": "evidence.jpg",
    "type": "image/jpeg",
    "size": 2048000,
    "url": "/uploads/reports/rep_abc123/evidence.jpg",
    "uploadedAt": "2025-10-03T15:00:00.000Z"
  }
  ```

### 2.4 Indexes and Performance
- **Primary Index:** id field (unique, in-memory for fast lookup)
- **Search Index:** schoolName field (case-insensitive text search)
- **Filter Index:** status field (enum-based filtering)
- **Sort Index:** lastReported field (timestamp-based sorting)
- **IP Index:** reporterIp field (for rate limiting)

### 2.5 Data Relationships
- **One-to-Many:** Report → Files (via uploadedFiles array)
- **One-to-One:** Report → MVC Reference (future enhancement)

## 3. Configuration JSON File

### 3.1 File Structure
**File Location:** `/var/www/data/config.json`
**Format:** JSON object with configuration entries
**Primary Key:** key (unique identifier)

### 3.2 JSON Schema

```json
{
  "type": "object",
  "patternProperties": {
    ".*": {
      "type": "object",
      "properties": {
        "value": {
          "type": ["string", "number", "boolean", "object", "array"],
          "description": "Configuration value"
        },
        "type": {
          "type": "string",
          "enum": ["string", "number", "boolean", "json"],
          "default": "string",
          "description": "Data type of the value"
        },
        "category": {
          "type": "string",
          "enum": ["system", "email", "google", "storage"],
          "default": "system",
          "description": "Configuration category"
        },
        "description": {
          "type": "string",
          "maxLength": 500,
          "description": "Human-readable description"
        },
        "updatedAt": {
          "type": "string",
          "format": "date-time",
          "description": "Last update timestamp"
        },
        "updatedBy": {
          "type": "string",
          "description": "Admin who last updated"
        }
      },
      "required": ["value", "type", "category", "updatedAt"]
    }
  }
}
```

### 3.2 Configuration Categories

#### Email Configuration
```json
{
  "key": "email.toAddress",
  "value": "mvc.blsdrivingschools@mvc.nj.gov",
  "type": "string",
  "category": "email"
}
```

```json
{
  "key": "email.fromAddress",
  "value": "treasurer@njdsc.org",
  "type": "string",
  "category": "email"
}
```

```json
{
  "key": "email.subjectTemplate",
  "value": "Unlicensed driving school [[School Name]]",
  "type": "string",
  "category": "email"
}
```

```json
{
  "key": "email.bodyTemplate",
  "value": "Dear MVC,\n\nPlease investigate the following unlicensed driving school: [[School Name]]...",
  "type": "string",
  "category": "email"
}
```

#### Storage Configuration
```json
{
  "key": "storage.uploadsDir",
  "value": "/var/www/uploads",
  "type": "string",
  "category": "storage"
}
```

```json
{
  "key": "storage.maxFileSize",
  "value": 10485760,
  "type": "number",
  "category": "storage"
}
```

#### System Configuration
```json
{
  "key": "system.rateLimitPerHour",
  "value": "5",
  "type": "number",
  "category": "system"
}
```

```json
{
  "key": "system.maxFileSize",
  "value": "10485760",
  "type": "number",
  "category": "system"
}
```

## 4. Files Metadata (Integrated in Reports)

### 4.1 File Storage Structure
**Storage Location:** `/var/www/uploads/reports/{reportId}/`
**Metadata Storage:** Embedded in reports.json uploadedFiles array
**File Naming:** `{fileId}_{timestamp}_{originalName}`

### 4.2 File Metadata Schema

Files metadata is stored within each report's `uploadedFiles` array:

```json
{
  "uploadedFiles": [
    {
      "id": "file_abc123",
      "name": "evidence.jpg",
      "type": "image/jpeg",
      "size": 2048000,
      "url": "/uploads/reports/rep_xyz789/file_abc123_1633360000000_evidence.jpg",
      "uploadedAt": "2025-10-03T15:00:00.000Z",
      "reportId": "rep_xyz789",
      "uploadedByIp": "192.168.1.100",
      "processingStatus": "completed"
    }
  ]
}
```

### 4.3 File Processing Status
- **pending**: File uploaded, processing not started
- **processing**: File being processed (resizing, optimization)
- **completed**: Processing finished successfully
- **failed**: Processing failed

### 4.2 File Processing Status
- **pending**: File uploaded, processing not started
- **processing**: Thumbnail generation in progress
- **completed**: Processing finished successfully
- **failed**: Processing failed

### 4.3 Supported File Types
- **Images:** image/jpeg, image/png, image/gif, image/webp
- **Videos:** video/mp4, video/avi, video/mov
- **Documents:** application/pdf (future enhancement)

## 5. Audit Log JSON File

### 5.1 File Structure
**File Location:** `/var/www/data/audit.json`
**Format:** JSON Array of audit entries
**Primary Key:** id (unique identifier)

### 5.2 JSON Schema

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "pattern": "^audit_[a-zA-Z0-9]{8}$",
        "description": "Unique audit entry ID"
      },
      "timestamp": {
        "type": "string",
        "format": "date-time",
        "description": "Event timestamp"
      },
      "action": {
        "type": "string",
        "enum": ["report_created", "report_updated", "status_changed", "file_uploaded", "config_updated", "email_sent"],
        "description": "Action performed"
      },
      "entityType": {
        "type": "string",
        "enum": ["report", "file", "config"],
        "description": "Type of entity affected"
      },
      "entityId": {
        "type": "string",
        "maxLength": 100,
        "description": "ID of affected entity"
      },
      "userId": {
        "type": "string",
        "description": "User who performed action"
      },
      "userIp": {
        "type": "string",
        "description": "User's IP address"
      },
      "oldValue": {
        "type": ["string", "object", "null"],
        "description": "Previous value (JSON)"
      },
      "newValue": {
        "type": ["string", "object", "null"],
        "description": "New value (JSON)"
      },
      "details": {
        "type": "string",
        "maxLength": 1000,
        "description": "Additional context"
      }
    },
    "required": ["id", "timestamp", "action", "entityType", "entityId"]
  }
}
```

### 5.2 Audited Actions
- **report_created**: New report submitted
- **report_updated**: Report modified
- **status_changed**: Report status updated
- **file_uploaded**: File uploaded
- **config_updated**: Configuration changed
- **email_sent**: Email sent to MVC

## 6. Data Migration Strategy

### 6.1 Schema Changes
1. Create migration scripts to convert Google Sheets data to JSON format
2. Transform existing data with proper type conversion
3. Update application code to use JSON file storage
4. Validate data integrity and relationships
5. Switch to JSON storage in production

### 6.2 Data Backup
- Daily automated JSON file backups to DigitalOcean Spaces
- Weekly full file system snapshots
- Monthly archival backups with offsite storage
- Emergency restore procedures with data validation

### 6.3 Future Database Migration
- Path defined for migration to PostgreSQL/MySQL if needed
- JSON schema compatibility maintained
- Migration scripts prepared for relational database
- Performance benchmarks established for scaling

## 7. Data Privacy & Compliance

### 7.1 Personal Data Handling
- Reporter IP addresses stored for rate limiting
- No personal identification beyond IP
- Data retention policies defined
- GDPR/CCPA compliance considerations

### 7.2 Data Security
- File system permissions and access controls
- Server-level security with firewalls and intrusion detection
- Encrypted data storage with file system encryption
- HTTPS enforcement for all data transmission
- Regular security updates and patches

---

**Schema Version:** 2.0
**Last Updated:** October 3, 2025
**Next Review:** October 15, 2025