# Environment Variables Reference

Complete reference for all environment variables used in the NJDSC School Compliance Portal.

## Table of Contents
- [Server Configuration](#server-configuration)
- [Local Storage Configuration](#local-storage-configuration)
- [Security Configuration](#security-configuration)
- [File Upload Configuration](#file-upload-configuration)
- [Logging Configuration](#logging-configuration)
- [Environment-Specific Files](#environment-specific-files)

---

## Server Configuration

### PORT
- **Description**: Port number the server listens on
- **Type**: Number
- **Default**: 5000
- **Example**: `PORT=5000`
- **Required**: Yes

### NODE_ENV
- **Description**: Application environment
- **Type**: String
- **Values**: `development`, `production`, `test`
- **Default**: development
- **Example**: `NODE_ENV=production`
- **Required**: Yes

### FRONTEND_URL
- **Description**: URL where the frontend application is hosted
- **Type**: String (URL)
- **Example**: `FRONTEND_URL=https://compliance.njdsc.org`
- **Required**: Yes
- **Notes**: Used for CORS configuration and redirect URLs

---

## Local Storage Configuration

### DATA_DIR
- **Description**: Directory path for JSON data files
- **Type**: String (absolute path)
- **Default**: `/var/www/data`
- **Example**: `DATA_DIR=/var/www/data`
- **Required**: Yes
- **Setup**:
  - Create directory with proper permissions
  - Initialize with empty JSON files
  - Ensure web server cannot access directly

### UPLOADS_DIR
- **Description**: Directory path for uploaded files
- **Type**: String (absolute path)
- **Default**: `/var/www/uploads`
- **Example**: `UPLOADS_DIR=/var/www/uploads`
- **Required**: Yes
- **Setup**:
  - Create directory with proper permissions
  - Configure web server for public access
  - Organize files by report ID subdirectories

### UPLOADS_URL_BASE
- **Description**: Base URL for accessing uploaded files
- **Type**: String (URL)
- **Example**: `UPLOADS_URL_BASE=https://unlicenseddrivingschoolnj.com/uploads`
- **Required**: Yes
- **Notes**:
  - Must be publicly accessible
  - Used to generate file URLs in responses
  - Configure web server to serve files from UPLOADS_DIR

### BACKUP_DIR
- **Description**: Directory for automated backups
- **Type**: String (absolute path)
- **Default**: `/var/www/backups`
- **Example**: `BACKUP_DIR=/var/www/backups`
- **Required**: No
- **Setup**:
  - Create directory with secure permissions
  - Configure automated backup scripts
  - Consider off-server backup storage

### BACKUP_RETENTION_DAYS
- **Description**: Number of days to keep backups
- **Type**: Number
- **Default**: 30
- **Example**: `BACKUP_RETENTION_DAYS=30`
- **Required**: No

### BACKUP_SCHEDULE
- **Description**: Backup frequency schedule
- **Type**: String
- **Values**: `daily`, `weekly`, `hourly`
- **Default**: `daily`
- **Example**: `BACKUP_SCHEDULE=daily`
- **Required**: No

### GOOGLE_SERVICE_ACCOUNT_KEY
- **Description**: Google service account credentials for Gmail API (JSON format)
- **Type**: String (JSON)
- **Example**: `GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}`
- **Required**: Yes (for email notifications)
- **Notes**:
  - Download from Google Cloud Console → Service Accounts → Keys
  - Used only for Gmail API email sending
  - Never commit to version control

### SMTP_HOST
- **Description**: SMTP server hostname for email sending
- **Type**: String
- **Example**: `SMTP_HOST=smtp.gmail.com` or `SMTP_HOST=smtp.sendgrid.net`
- **Required**: Yes (for email notifications)
- **Notes**:
  - Common providers: smtp.gmail.com, smtp.sendgrid.net, smtp.mailgun.org
  - For Gmail: smtp.gmail.com
  - For SendGrid: smtp.sendgrid.net

### SMTP_PORT
- **Description**: SMTP server port
- **Type**: Number
- **Default**: 587 (for TLS) or 465 (for SSL)
- **Example**: `SMTP_PORT=587`
- **Required**: No
- **Notes**:
  - 587: TLS (recommended)
  - 465: SSL
  - 25: Plain (not recommended)

### SMTP_SECURE
- **Description**: Whether to use SSL/TLS encryption
- **Type**: Boolean string
- **Default**: false
- **Example**: `SMTP_SECURE=false`
- **Required**: No
- **Notes**:
  - false for TLS on port 587
  - true for SSL on port 465

### SMTP_USER
- **Description**: SMTP authentication username
- **Type**: String
- **Example**: `SMTP_USER=your-email@gmail.com` or `SMTP_USER=apikey`
- **Required**: Yes (for email notifications)
- **Notes**:
  - For Gmail: your full email address
  - For SendGrid: 'apikey'
  - For Mailgun: your SMTP username

### SMTP_PASS
- **Description**: SMTP authentication password
- **Type**: String
- **Example**: `SMTP_PASS=your-app-password` or `SMTP_PASS=your-sendgrid-api-key`
- **Required**: Yes (for email notifications)
- **Notes**:
  - For Gmail: use App Password (not regular password)
  - For SendGrid: your API key
  - Never commit to version control

### EMAIL_FROM
- **Description**: Default sender email address
- **Type**: String (email)
- **Default**: SMTP_USER value
- **Example**: `EMAIL_FROM=noreply@njdsc.org`
- **Required**: No
- **Notes**:
  - Must be authorized by your SMTP provider
  - Can be different from SMTP_USER

---

## Security Configuration

### JWT_SECRET
- **Description**: Secret key for signing JWT tokens
- **Type**: String
- **Example**: `JWT_SECRET=your-super-secret-random-string-here-min-32-chars`
- **Required**: Yes
- **How to Generate**:
  ```bash
  # Node.js
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  
  # OpenSSL
  openssl rand -hex 32
  ```
- **Security**:
  - Minimum 32 characters
  - Use cryptographically random string
  - Different for each environment
  - Never commit to version control
  - Rotate periodically

### ADMIN_API_KEY
- **Description**: API key for admin operations
- **Type**: String
- **Example**: `ADMIN_API_KEY=njdsc-admin-2025-secure-key`
- **Required**: No (if implementing admin features)
- **Security**: Same as JWT_SECRET

---

## Rate Limiting Configuration

### RATE_LIMIT_WINDOW_MS
- **Description**: Time window for rate limiting (milliseconds)
- **Type**: Number
- **Default**: 900000 (15 minutes)
- **Example**: `RATE_LIMIT_WINDOW_MS=900000`
- **Required**: No
- **Notes**: 
  - 900000 ms = 15 minutes
  - 3600000 ms = 1 hour

### RATE_LIMIT_MAX_REQUESTS
- **Description**: Maximum requests per window per IP
- **Type**: Number
- **Default**: 100
- **Example**: `RATE_LIMIT_MAX_REQUESTS=100`
- **Required**: No
- **Recommendations**:
  - Development: 1000
  - Production: 100
  - Adjust based on usage patterns

---

## File Upload Configuration

### MAX_FILE_SIZE
- **Description**: Maximum file size in bytes
- **Type**: Number
- **Default**: 10485760 (10 MB)
- **Example**: `MAX_FILE_SIZE=10485760`
- **Required**: No
- **Conversions**:
  - 1 MB = 1048576 bytes
  - 5 MB = 5242880 bytes
  - 10 MB = 10485760 bytes
  - 50 MB = 52428800 bytes

### ALLOWED_FILE_TYPES
- **Description**: Comma-separated list of allowed MIME types
- **Type**: String (comma-separated)
- **Default**: `image/jpeg,image/png,image/gif,application/pdf`
- **Example**: `ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf`
- **Required**: No
- **Common MIME Types**:
  - Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
  - Documents: `application/pdf`, `application/msword`
  - Videos: `video/mp4`, `video/avi`

---

## Logging Configuration

### LOG_LEVEL
- **Description**: Logging verbosity level
- **Type**: String
- **Values**: `error`, `warn`, `info`, `debug`
- **Default**: info
- **Example**: `LOG_LEVEL=info`
- **Required**: No
- **Recommendations**:
  - Production: `info` or `warn`
  - Development: `debug`
  - Testing: `error`

---

## Environment-Specific Files

### .env (Production)
```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://unlicenseddrivingschoolnj.com

# Local storage configuration
DATA_DIR=/var/www/data
UPLOADS_DIR=/var/www/uploads
UPLOADS_URL_BASE=https://unlicenseddrivingschoolnj.com/uploads

# Backup configuration
BACKUP_DIR=/var/www/backups
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE=daily

# Email service configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=treasurer@njdsc.org
SMTP_PASS=your-gmail-app-password
EMAIL_FROM=treasurer@njdsc.org

JWT_SECRET=production-secret-key-32-chars-minimum
ADMIN_API_KEY=production-admin-key

RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=5

MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4

LOG_LEVEL=info
```

### .env.development (Development)
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Local storage configuration
DATA_DIR=./data
UPLOADS_DIR=./uploads
UPLOADS_URL_BASE=http://localhost:5000/uploads

# Backup configuration (optional for development)
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=7
BACKUP_SCHEDULE=daily

# Email service configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=dev-treasurer@njdsc.org
SMTP_PASS=your-dev-gmail-app-password
EMAIL_FROM=dev-treasurer@njdsc.org

JWT_SECRET=development-secret-key
ADMIN_API_KEY=dev-admin-key

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4

LOG_LEVEL=debug
```

### .env.test (Testing)
```env
PORT=5001
NODE_ENV=test
FRONTEND_URL=http://localhost:3001

# Local storage configuration for testing
DATA_DIR=./test-data
UPLOADS_DIR=./test-uploads
UPLOADS_URL_BASE=http://localhost:5001/uploads

# No backups in testing
BACKUP_DIR=./test-backups
BACKUP_RETENTION_DAYS=1
BACKUP_SCHEDULE=daily

# Email service configuration for testing (optional - mocked in tests)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=test@example.com
SMTP_PASS=test-password
EMAIL_FROM=test@example.com

JWT_SECRET=test-secret-key
ADMIN_API_KEY=test-admin-key

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10000

MAX_FILE_SIZE=1048576
ALLOWED_FILE_TYPES=image/jpeg,image/png

LOG_LEVEL=error
```

---

## Validation

### Required Variables Checklist
- [ ] PORT
- [ ] NODE_ENV
- [ ] FRONTEND_URL
- [ ] DATA_DIR
- [ ] UPLOADS_DIR
- [ ] UPLOADS_URL_BASE
- [ ] SMTP_HOST
- [ ] SMTP_USER
- [ ] SMTP_PASS
- [ ] JWT_SECRET

### Validation Script
```bash
node -e "
require('dotenv').config();
const required = [
  'PORT',
  'NODE_ENV',
  'FRONTEND_URL',
  'DATA_DIR',
  'UPLOADS_DIR',
  'UPLOADS_URL_BASE',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'JWT_SECRET'
];
const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('Missing required variables:', missing.join(', '));
  process.exit(1);
}
console.log('✅ All required variables present');
"
```

---

## Security Best Practices

1. **Never commit .env files** to version control
2. **Use different keys** for each environment
3. **Rotate secrets regularly** (every 90 days)
4. **Use secrets management** in production (AWS Secrets Manager, Azure Key Vault, etc.)
5. **Limit access** to environment variables
6. **Audit changes** to environment configuration
7. **Backup securely** in encrypted storage

---

## Troubleshooting

### "Environment variable not found"
- Check .env file exists in project root
- Verify variable name spelling
- Ensure dotenv is loaded: `require('dotenv').config()`

### "Invalid JSON in GOOGLE_SERVICE_ACCOUNT_KEY"
- Verify JSON is valid (use JSON validator)
- Check for missing quotes or commas
- Ensure private_key has `\n` characters

### "Cannot connect to SMTP server"
- Verify SMTP_HOST and SMTP_PORT are correct
- Check SMTP_USER and SMTP_PASS credentials
- Confirm SMTP provider allows connections from your IP
- For Gmail: ensure App Password is used (not regular password)

---

## Related Documentation

- [deployment_guide.md](deployment_guide.md) - DigitalOcean droplet deployment
- [database_schema.md](database_schema.md) - JSON file schema specifications
- [STORAGE_CONFIGURATION.md](STORAGE_CONFIGURATION.md) - Local storage setup
- [.env.example](.env.example) - Template file

---

**Document Version:** 1.2
**Last Updated:** October 7, 2025