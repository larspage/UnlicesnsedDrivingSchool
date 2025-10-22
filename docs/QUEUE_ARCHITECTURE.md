# Report Queue Processing Architecture

## Overview

The NJDSC School Compliance Portal implements a queue-based report processing system to prevent concurrent access conflicts and ensure reliable data persistence. This architecture decouples report submission from processing, allowing the system to handle high-volume submissions without contention.

## Architecture Design

### 1. Queue-Based Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client (Browser)                              │
│              POST /api/reports with files                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Express API Route Handler                           │
│  ├── Validate JSON request body                                 │
│  ├── Validate required fields (schoolName)                      │
│  ├── Check rate limiting                                        │
│  └── Create temporary queue file with datetime                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Queue Directory                                     │
│  /data/queue/                                                   │
│  ├── report_20251022_143500_abc123.json                         │
│  ├── report_20251022_143501_def456.json                         │
│  └── report_20251022_143502_ghi789.json                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         Report Processing Service (File Watcher)                │
│  ├── Monitor /data/queue for new files                          │
│  ├── Process one file at a time (sequential)                    │
│  ├── Parse JSON and validate data                               │
│  ├── Check for duplicates                                       │
│  ├── Create report in reports.json                              │
│  ├── Process file uploads to local storage                      │
│  └── Move processed file to archive                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Data Layer (Local Storage)                          │
│  ├── /data/reports.json (updated with new report)              │
│  ├── /data/queue/archive/ (processed files)                    │
│  └── /uploads/reports/{reportId}/ (uploaded files)             │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Key Components

#### 2.1 Queue Directory Structure
```
/data/
├── queue/
│   ├── report_20251022_143500_abc123.json
│   ├── report_20251022_143501_def456.json
│   └── archive/
│       ├── report_20251022_143400_old123.json
│       └── report_20251022_143401_old456.json
├── reports.json
├── config.json
└── audit.json
```

#### 2.2 Queue File Format
```json
{
  "queueId": "report_20251022_143500_abc123",
  "timestamp": "2025-10-22T14:35:00.000Z",
  "reportData": {
    "schoolName": "ABC Driving School",
    "location": "Newark",
    "violationDescription": "Operating without license",
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
  },
  "status": "pending",
  "createdAt": "2025-10-22T14:35:00.000Z"
}
```

### 3. Processing Guarantees

#### 3.1 Exclusive Write Access
- **Only the reportProcessing service** can modify `reports.json`
- All other processes read-only access to `reports.json`
- File locking prevents concurrent writes
- Atomic writes ensure data consistency

#### 3.2 Read-Only Access
- Frontend and API can read `reports.json` without locks
- No blocking on read operations
- Consistent snapshots of data
- Minimal performance impact

#### 3.3 Sequential Processing
- Queue files processed one at a time
- FIFO (First-In-First-Out) order
- No parallel processing of reports
- Prevents race conditions

## Implementation Details

### 1. API Route Changes (POST /api/reports)

**Before (Direct Processing):**
```javascript
// Old flow: Direct write to reports.json
const report = await reportService.createReport(reportData, reporterIp);
```

**After (Queue-Based):**
```javascript
// New flow: Write to queue, return immediately
const queueFile = await queueService.enqueueReport(reportData, reporterIp);
res.status(202).json({
  success: true,
  message: 'Report queued for processing',
  queueId: queueFile.queueId
});
```

### 2. Queue Service (server/services/queueService.js)

**Responsibilities:**
- Create queue directory if not exists
- Generate unique queue filenames with datetime
- Write report data to queue file
- Handle queue file errors
- Provide queue status monitoring

**Key Methods:**
```javascript
class QueueService {
  async ensureQueueDirectory()
  async enqueueReport(reportData, reporterIp)
  async getQueueStatus()
  async getQueueLength()
}
```

### 3. Report Processing Service (server/services/reportProcessingService.js)

**Responsibilities:**
- Monitor `/data/queue` directory for new files
- Process files sequentially (one at a time)
- Parse and validate queue file JSON
- Create report in `reports.json`
- Handle file uploads
- Move processed files to archive
- Log processing errors
- Implement retry logic for failed files

**Key Methods:**
```javascript
class ReportProcessingService {
  async startProcessing()
  async stopProcessing()
  async processQueueFile(filePath)
  async archiveProcessedFile(filePath)
  async handleProcessingError(filePath, error)
}
```

### 4. File Watcher Implementation

**Technology:** Node.js `fs.watch()` or `chokidar` library

**Behavior:**
- Watch `/data/queue` directory
- Trigger on file creation events
- Process files in order
- Handle file system errors gracefully
- Restart watcher on errors

## Data Flow

### 1. Report Submission Flow

```
1. User submits report form
   ↓
2. Frontend sends POST /api/reports with JSON body
   ↓
3. API validates JSON format and required fields
   ↓
4. API checks rate limiting
   ↓
5. API creates queue file: report_TIMESTAMP_ID.json
   ↓
6. API returns 202 Accepted with queueId
   ↓
7. User sees "Report queued for processing" message
```

### 2. Background Processing Flow

```
1. reportProcessingService detects new queue file
   ↓
2. Service reads and parses JSON
   ↓
3. Service validates report data
   ↓
4. Service checks for duplicates in reports.json
   ↓
5. Service creates new report object
   ↓
6. Service processes file uploads to local storage
   ↓
7. Service appends report to reports.json (atomic write)
   ↓
8. Service moves queue file to archive/
   ↓
9. Service logs successful processing
```

## Error Handling

### 1. Queue File Errors

**Invalid JSON:**
- Log error with file path
- Move to error directory
- Alert admin

**Missing Required Fields:**
- Log validation error
- Move to error directory
- Preserve original file for inspection

**File System Errors:**
- Retry with exponential backoff
- Log error details
- Alert admin if persistent

### 2. Processing Errors

**Duplicate Detection:**
- Log duplicate found
- Move to archive (not error)
- Update existing report's lastReported

**File Upload Errors:**
- Log file upload failure
- Continue with other files
- Mark report with partial upload status

**reports.json Write Errors:**
- Retry with file locking
- Log error with full context
- Alert admin if critical

## Configuration

### Environment Variables

```env
# Queue Configuration
QUEUE_DIR=/data/queue
QUEUE_ARCHIVE_DIR=/data/queue/archive
QUEUE_ERROR_DIR=/data/queue/errors
QUEUE_PROCESSING_ENABLED=true
QUEUE_PROCESS_INTERVAL=1000  # milliseconds
QUEUE_MAX_RETRIES=3
QUEUE_RETRY_DELAY=5000  # milliseconds
```

### Application Startup

```javascript
// In app.js or server startup
const reportProcessingService = require('./services/reportProcessingService');

(async () => {
  try {
    // Initialize queue directories
    await queueService.ensureQueueDirectory();
    
    // Start report processing service
    if (process.env.QUEUE_PROCESSING_ENABLED !== 'false') {
      await reportProcessingService.startProcessing();
      console.log('[STARTUP] Report processing service started');
    }
  } catch (error) {
    console.error('[STARTUP] Failed to initialize queue:', error);
    process.exit(1);
  }
})();
```

## Monitoring & Observability

### 1. Queue Metrics

- Queue length (number of pending files)
- Processing rate (files per minute)
- Average processing time per file
- Error rate (failed files / total files)
- Archive size (processed files)

### 2. Logging

**Queue Service Logs:**
```
[QUEUE] Enqueued report: report_20251022_143500_abc123
[QUEUE] Queue length: 5 pending files
```

**Processing Service Logs:**
```
[PROCESSING] Starting to process: report_20251022_143500_abc123
[PROCESSING] Report created: rep_xyz789
[PROCESSING] Archived: report_20251022_143500_abc123
[PROCESSING] Processing complete in 2.5s
```

### 3. Admin Dashboard

- Real-time queue status
- Processing history
- Error logs
- Performance metrics

## Benefits

### 1. Reliability
- No concurrent writes to `reports.json`
- Atomic operations prevent data corruption
- Failed files preserved for inspection
- Retry logic handles transient errors

### 2. Performance
- Non-blocking API responses (202 Accepted)
- Read operations never blocked
- Sequential processing prevents resource contention
- Scalable to high-volume submissions

### 3. Maintainability
- Clear separation of concerns
- Easy to monitor and debug
- Audit trail of all processing
- Simple error recovery

### 4. User Experience
- Immediate feedback (report queued)
- No timeout issues on slow uploads
- Transparent processing status
- Reliable data persistence

## Migration Path

### Phase 1: Implement Queue Infrastructure
- Create queue directory structure
- Implement QueueService
- Add queue endpoints to API

### Phase 2: Implement Processing Service
- Create ReportProcessingService
- Implement file watcher
- Add error handling and retry logic

### Phase 3: Update API Routes
- Modify POST /api/reports to use queue
- Update response format (202 Accepted)
- Add queue status endpoint

### Phase 4: Testing & Validation
- Unit tests for queue operations
- Integration tests for processing
- Load testing with high-volume submissions
- Error scenario testing

### Phase 5: Deployment
- Deploy to staging environment
- Monitor queue performance
- Validate data consistency
- Deploy to production

## Future Enhancements

1. **Priority Queue:** Support priority-based processing
2. **Batch Processing:** Process multiple files in parallel (with locking)
3. **Dead Letter Queue:** Separate handling for permanently failed files
4. **Metrics Export:** Prometheus/Grafana integration
5. **Webhook Notifications:** Notify external systems of processing status
6. **Database Migration:** Move from JSON to PostgreSQL with proper locking

---

**Document Version:** 1.0
**Last Updated:** October 22, 2025
**Status:** Design Phase - Ready for Implementation
