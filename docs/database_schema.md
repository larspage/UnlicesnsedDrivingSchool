# NJDSC School Compliance Portal - Database Schema

## 1. Overview

The NJDSC School Compliance Portal uses Google Sheets as its primary data store, with Google Drive for file storage. This document defines the schema for all data entities, including column definitions, data types, constraints, and relationships.

### 1.1 Data Storage Architecture
- **Primary Database:** Google Sheets (NJDSC Workspace)
- **File Storage:** Google Drive (NJDSC Workspace)
- **Backup Strategy:** Automated daily exports
- **Data Retention:** Indefinite (regulatory compliance)

### 1.2 Schema Versioning
- Schema changes require migration scripts
- Backward compatibility maintained
- Version tracking in configuration

## 2. Reports Table (Google Sheets)

### 2.1 Table Structure
**Spreadsheet:** NJDSC_Compliance_Reports  
**Sheet Name:** Reports  
**Primary Key:** ID (Column A)

| Column | Field Name | Data Type | Required | Default | Validation | Description |
|--------|------------|-----------|----------|---------|------------|-------------|
| A | id | String | Yes | Auto-generated | `^rep_[a-zA-Z0-9]{6}$` | Unique report identifier |
| B | schoolName | String | Yes | - | Max 255 chars | Name of the driving school |
| C | location | String | No | - | Max 100 chars | Town/city where school was spotted |
| D | violationDescription | String | No | - | Max 1000 chars | Description of the violation |
| E | phoneNumber | String | No | - | Phone format | Contact phone number |
| F | websiteUrl | String | No | - | URL format | Website or primary social media URL |
| G | uploadedFiles | String | No | - | JSON Array | Array of file IDs/URLs |
| H | socialMediaLinks | String | No | Auto-populated | JSON Array | Discovered social media links |
| I | additionalInfo | String | No | Auto-populated | Max 2000 chars | Auto-enriched information |
| J | status | String | Yes | "Added" | Enum | Current investigation status |
| K | lastReported | DateTime | Yes | Current timestamp | ISO 8601 | Last report submission date |
| L | createdAt | DateTime | Yes | Current timestamp | ISO 8601 | Initial report creation date |
| M | updatedAt | DateTime | Yes | Current timestamp | ISO 8601 | Last modification date |
| N | reporterIp | String | No | - | IP format | Submitter's IP address |
| O | adminNotes | String | No | - | Max 500 chars | Internal administrative notes |
| P | mvcReferenceNumber | String | No | - | Max 50 chars | MVC case reference number |

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
    "url": "https://drive.google.com/...",
    "thumbnailUrl": "https://drive.google.com/..."
  }
  ```

### 2.4 Indexes and Performance
- **Primary Index:** ID column (unique)
- **Search Index:** School Name (case-insensitive)
- **Filter Index:** Status column
- **Sort Index:** Last Reported Date (descending)
- **IP Index:** Reporter IP for rate limiting

### 2.5 Data Relationships
- **One-to-Many:** Report → Files (via uploadedFiles array)
- **One-to-One:** Report → MVC Reference (future enhancement)

## 3. Configuration Table (Google Sheets)

### 3.1 Table Structure
**Spreadsheet:** NJDSC_Compliance_Config  
**Sheet Name:** Configuration  
**Primary Key:** Key (Column A)

| Column | Field Name | Data Type | Required | Default | Validation | Description |
|--------|------------|-----------|----------|---------|------------|-------------|
| A | key | String | Yes | - | Max 100 chars | Configuration key |
| B | value | String | Yes | - | Max 5000 chars | Configuration value |
| C | type | String | Yes | "string" | Enum | Data type (string, number, boolean, json) |
| D | category | String | Yes | "system" | Enum | Configuration category |
| E | description | String | No | - | Max 500 chars | Human-readable description |
| F | updatedAt | DateTime | Yes | Current timestamp | ISO 8601 | Last update timestamp |
| G | updatedBy | String | No | - | Email format | Admin who last updated |

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

#### Google API Configuration
```json
{
  "key": "google.sheets.spreadsheetId",
  "value": "1ABC123...",
  "type": "string",
  "category": "google"
}
```

```json
{
  "key": "google.drive.folderId",
  "value": "1XYZ456...",
  "type": "string",
  "category": "google"
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

## 4. Files Metadata Table (Google Sheets)

### 4.1 Table Structure
**Spreadsheet:** NJDSC_Compliance_Files  
**Sheet Name:** Files  
**Primary Key:** ID (Column A)

| Column | Field Name | Data Type | Required | Default | Validation | Description |
|--------|------------|-----------|----------|---------|------------|-------------|
| A | id | String | Yes | Auto-generated | `^file_[a-zA-Z0-9]{6}$` | Unique file identifier |
| B | reportId | String | Yes | - | Report ID format | Associated report ID |
| C | originalName | String | Yes | - | Max 255 chars | Original filename |
| D | mimeType | String | Yes | - | MIME type | File MIME type |
| E | size | Number | Yes | - | Max 10485760 | File size in bytes |
| F | driveFileId | String | Yes | - | Google Drive ID | Google Drive file ID |
| G | driveUrl | String | Yes | - | URL format | Public access URL |
| H | thumbnailUrl | String | No | - | URL format | Thumbnail URL (images only) |
| I | uploadedAt | DateTime | Yes | Current timestamp | ISO 8601 | Upload timestamp |
| J | uploadedByIp | String | No | - | IP format | Uploader's IP address |
| K | processingStatus | String | Yes | "pending" | Enum | File processing status |

### 4.2 File Processing Status
- **pending**: File uploaded, processing not started
- **processing**: Thumbnail generation in progress
- **completed**: Processing finished successfully
- **failed**: Processing failed

### 4.3 Supported File Types
- **Images:** image/jpeg, image/png, image/gif, image/webp
- **Videos:** video/mp4, video/avi, video/mov
- **Documents:** application/pdf (future enhancement)

## 5. Audit Log Table (Google Sheets)

### 5.1 Table Structure
**Spreadsheet:** NJDSC_Compliance_Audit  
**Sheet Name:** AuditLog  
**Primary Key:** ID (Column A)

| Column | Field Name | Data Type | Required | Default | Validation | Description |
|--------|------------|-----------|----------|---------|------------|-------------|
| A | id | String | Yes | Auto-generated | `^audit_[a-zA-Z0-9]{8}$` | Unique audit entry ID |
| B | timestamp | DateTime | Yes | Current timestamp | ISO 8601 | Event timestamp |
| C | action | String | Yes | - | Enum | Action performed |
| D | entityType | String | Yes | - | Enum | Type of entity affected |
| E | entityId | String | Yes | - | Max 100 chars | ID of affected entity |
| F | userId | String | No | - | Email format | User who performed action |
| G | userIp | String | No | - | IP format | User's IP address |
| H | oldValue | String | No | - | Max 5000 chars | Previous value (JSON) |
| I | newValue | String | No | - | Max 5000 chars | New value (JSON) |
| J | details | String | No | - | Max 1000 chars | Additional context |

### 5.2 Audited Actions
- **report_created**: New report submitted
- **report_updated**: Report modified
- **status_changed**: Report status updated
- **file_uploaded**: File uploaded
- **config_updated**: Configuration changed
- **email_sent**: Email sent to MVC

## 6. Data Migration Strategy

### 6.1 Schema Changes
1. Create new sheet with updated schema
2. Migrate existing data with transformation scripts
3. Update application code to use new schema
4. Validate data integrity
5. Switch to new schema in production

### 6.2 Data Backup
- Daily automated exports to JSON/CSV
- Weekly full spreadsheet backups
- Monthly archival snapshots
- Emergency restore procedures

### 6.3 Future Database Migration
- Path defined for migration to PostgreSQL/MySQL
- Schema compatibility maintained
- Migration scripts prepared
- Performance benchmarks established

## 7. Data Privacy & Compliance

### 7.1 Personal Data Handling
- Reporter IP addresses stored for rate limiting
- No personal identification beyond IP
- Data retention policies defined
- GDPR/CCPA compliance considerations

### 7.2 Data Security
- Google Workspace security settings
- Access restricted to NJDSC administrators
- Audit logging for all data access
- Encryption at rest and in transit

---

**Schema Version:** 1.0
**Last Updated:** September 26, 2025
**Next Review:** October 15, 2025