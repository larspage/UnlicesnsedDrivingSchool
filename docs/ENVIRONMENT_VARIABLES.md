# Environment Variables Reference

Complete reference for all environment variables used in the NJDSC School Compliance Portal.

## Table of Contents
- [Server Configuration](#server-configuration)
- [Google APIs Configuration](#google-apis-configuration)
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

## Google APIs Configuration

### GOOGLE_SERVICE_ACCOUNT_KEY
- **Description**: Complete JSON key for Google Cloud service account
- **Type**: JSON string (minified to single line)
- **Example**: 
  ```
  GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"njdsc-portal",...}
  ```
- **Required**: Yes
- **How to Get**:
  1. Go to Google Cloud Console
  2. Navigate to IAM & Admin → Service Accounts
  3. Create or select service account
  4. Go to Keys tab → Add Key → Create new key
  5. Choose JSON format
  6. Download and copy entire contents
- **Security**: 
  - Never commit to version control
  - Store securely (environment variables, secrets manager)
  - Rotate every 90 days
- **Format Notes**:
  - Must be valid JSON
  - Keep `\n` characters in private_key field
  - Remove all other newlines

### GOOGLE_CLIENT_ID
- **Description**: OAuth 2.0 Client ID (if using OAuth)
- **Type**: String
- **Example**: `GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com`
- **Required**: No (only if implementing OAuth)
- **How to Get**:
  1. Google Cloud Console → APIs & Services → Credentials
  2. Create OAuth 2.0 Client ID
  3. Application type: Web application
  4. Copy Client ID

### GOOGLE_CLIENT_SECRET
- **Description**: OAuth 2.0 Client Secret (if using OAuth)
- **Type**: String
- **Example**: `GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456`
- **Required**: No (only if implementing OAuth)
- **How to Get**: Same as Client ID, copy the secret

### GOOGLE_SHEETS_SPREADSHEET_ID
- **Description**: ID of the Google Sheets spreadsheet storing report data
- **Type**: String
- **Example**: `GOOGLE_SHEETS_SPREADSHEET_ID=1hhp0ekSjMHO-IDOrw17tH6LmWsQXOiyCEGgCLisTmcs`
- **Required**: Yes
- **How to Get**:
  1. Open your Google Sheets spreadsheet
  2. Look at the URL:
     ```
     https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
     ```
  3. Copy the ID between `/d/` and `/edit`
- **Setup**:
  1. Create spreadsheet with "Reports" sheet
  2. Share with service account email (Editor permissions)
  3. Add column headers (see GOOGLE_WORKSPACE_DEPLOYMENT.md)

### GOOGLE_CONFIG_SPREADSHEET_ID
- **Description**: ID of spreadsheet storing application configuration
- **Type**: String
- **Example**: `GOOGLE_CONFIG_SPREADSHEET_ID=1u7Xc7jwCiWo4rPyhiYXXWRFk5prG0g8r74ipYijeqgA`
- **Required**: No (optional feature)
- **How to Get**: Same as GOOGLE_SHEETS_SPREADSHEET_ID
- **Setup**:
  1. Create spreadsheet with "Config" sheet
  2. Share with service account
  3. Add columns: key, value, description

### GOOGLE_DRIVE_FOLDER_ID
- **Description**: ID of Google Shared Drive for file storage
- **Type**: String
- **Example**: `GOOGLE_DRIVE_FOLDER_ID=0AExampleSharedDriveID`
- **Required**: Yes
- **How to Get**:
  1. Create Shared Drive in Google Drive
  2. Add service account as Manager
  3. Click on Shared Drive
  4. Copy ID from URL:
     ```
     https://drive.google.com/drive/folders/[SHARED_DRIVE_ID]
     ```
- **Important**: 
  - Must be a Shared Drive (ID starts with `0A`)
  - Regular folder IDs will NOT work for file uploads
  - Service accounts cannot upload to regular folders

### GOOGLE_GMAIL_USER
- **Description**: Email address for domain-wide delegation and Gmail operations
- **Type**: String (email)
- **Example**: `GOOGLE_GMAIL_USER=admin@yourdomain.com`
- **Required**: Yes
- **Notes**:
  - Must be a user in your Google Workspace domain
  - Service account will act as this user
  - Used for sending emails and accessing user's Drive

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
FRONTEND_URL=https://compliance.njdsc.org

GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
GOOGLE_SHEETS_SPREADSHEET_ID=1hhp0ekSjMHO-IDOrw17tH6LmWsQXOiyCEGgCLisTmcs
GOOGLE_CONFIG_SPREADSHEET_ID=1u7Xc7jwCiWo4rPyhiYXXWRFk5prG0g8r74ipYijeqgA
GOOGLE_DRIVE_FOLDER_ID=0AExampleSharedDriveID
GOOGLE_GMAIL_USER=admin@yourdomain.com

JWT_SECRET=production-secret-key-32-chars-minimum
ADMIN_API_KEY=production-admin-key

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

LOG_LEVEL=info
```

### .env.development (Development)
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
GOOGLE_SHEETS_SPREADSHEET_ID=1hhp0ekSjMHO-IDOrw17tH6LmWsQXOiyCEGgCLisTmcs
GOOGLE_CONFIG_SPREADSHEET_ID=1u7Xc7jwCiWo4rPyhiYXXWRFk5prG0g8r74ipYijeqgA
GOOGLE_DRIVE_FOLDER_ID=0AExampleSharedDriveID
GOOGLE_GMAIL_USER=dev@yourdomain.com

JWT_SECRET=development-secret-key
ADMIN_API_KEY=dev-admin-key

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

LOG_LEVEL=debug
```

### .env.test (Testing)
```env
PORT=5001
NODE_ENV=test
FRONTEND_URL=http://localhost:3001

GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
GOOGLE_SHEETS_SPREADSHEET_ID=test-spreadsheet-id
GOOGLE_CONFIG_SPREADSHEET_ID=test-config-id
GOOGLE_DRIVE_FOLDER_ID=0ATestSharedDriveID
GOOGLE_GMAIL_USER=test@yourdomain.com

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
- [ ] GOOGLE_SERVICE_ACCOUNT_KEY
- [ ] GOOGLE_SHEETS_SPREADSHEET_ID
- [ ] GOOGLE_DRIVE_FOLDER_ID
- [ ] GOOGLE_GMAIL_USER
- [ ] JWT_SECRET

### Validation Script
```bash
node -e "
require('dotenv').config();
const required = [
  'PORT',
  'NODE_ENV',
  'FRONTEND_URL',
  'GOOGLE_SERVICE_ACCOUNT_KEY',
  'GOOGLE_SHEETS_SPREADSHEET_ID',
  'GOOGLE_DRIVE_FOLDER_ID',
  'GOOGLE_GMAIL_USER',
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

### "Cannot connect to Google APIs"
- Verify service account key is correct
- Check APIs are enabled in Cloud Console
- Confirm service account has necessary permissions

---

## Related Documentation

- [GOOGLE_WORKSPACE_DEPLOYMENT.md](GOOGLE_WORKSPACE_DEPLOYMENT.md) - Full deployment guide
- [GOOGLE_SHARED_DRIVE_SETUP.md](GOOGLE_SHARED_DRIVE_SETUP.md) - Shared Drive setup
- [.env.example](.env.example) - Template file