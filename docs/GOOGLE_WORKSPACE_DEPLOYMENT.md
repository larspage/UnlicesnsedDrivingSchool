# Legacy: Google Workspace Deployment Guide (DEPRECATED)

**⚠️ DEPRECATED:** This guide is for legacy Google Workspace deployments. The application now uses DigitalOcean droplets with local storage.

**For current deployments, see:** [deployment_guide.md](deployment_guide.md)

---

Complete guide for deploying the NJDSC School Compliance Portal to a client's Google Workspace environment.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Google Cloud Project Setup](#google-cloud-project-setup)
3. [Service Account Creation](#service-account-creation)
4. [API Enablement](#api-enablement)
5. [Domain-Wide Delegation](#domain-wide-delegation)
6. [Google Sheets Setup](#google-sheets-setup)
7. [Shared Drive Setup](#shared-drive-setup)
8. [Environment Configuration](#environment-configuration)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Access
- **Google Workspace Admin** access (Super Admin role)
- **Google Cloud Console** access (Owner or Editor role)
- Access to the application server for configuration

### Required Google Workspace Plan
- Business Starter, Standard, Plus, or Enterprise
- Free Gmail accounts do NOT support Shared Drives

### Tools Needed
- Web browser
- Text editor
- Node.js installed (for testing)

---

## Google Cloud Project Setup

### Step 1: Create a New Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown at the top
3. Click **New Project**
4. Enter project details:
   - **Project name**: `njdsc-compliance-portal` (or client-specific name)
   - **Organization**: Select your organization
   - **Location**: Select appropriate folder
5. Click **Create**
6. Wait for project creation (takes ~30 seconds)
7. **IMPORTANT**: Note your **Project ID** (e.g., `njdsc-compliance-portal-123456`)

### Step 2: Enable Billing (if required)

1. In Cloud Console, go to **Billing**
2. Link a billing account (required for some API quotas)
3. Note: Basic API usage is typically free within quotas

---

## Service Account Creation

### Step 1: Create Service Account

1. In Cloud Console, go to **IAM & Admin** → **Service Accounts**
2. Click **+ Create Service Account**
3. Enter details:
   - **Service account name**: `njdsc-admin` (or descriptive name)
   - **Service account ID**: Will auto-generate (e.g., `njdsc-admin@project-id.iam.gserviceaccount.com`)
   - **Description**: "Service account for NJDSC Compliance Portal"
4. Click **Create and Continue**
5. Skip "Grant this service account access to project" (click **Continue**)
6. Skip "Grant users access to this service account" (click **Done**)

### Step 2: Create Service Account Key

1. Click on the newly created service account
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON** format
5. Click **Create**
6. **IMPORTANT**: A JSON file will download automatically
   - Save this file securely
   - Never commit this to version control
   - You'll need this for environment configuration

### Step 3: Note Service Account Email

From the downloaded JSON file, note the `client_email`:
```json
{
  "client_email": "njdsc-admin@project-id.iam.gserviceaccount.com"
}
```

You'll need this email address for several configuration steps.

---

## API Enablement

Enable the following APIs in your Google Cloud Project:

### Step 1: Enable Google Drive API

1. Go to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Click on it
4. Click **Enable**
5. Wait for enablement (~30 seconds)

### Step 2: Enable Google Sheets API

1. In API Library, search for "Google Sheets API"
2. Click on it
3. Click **Enable**

### Step 3: Enable Gmail API (if using email notifications)

1. In API Library, search for "Gmail API"
2. Click on it
3. Click **Enable**

### Verify APIs are Enabled

1. Go to **APIs & Services** → **Dashboard**
2. Verify you see:
   - Google Drive API
   - Google Sheets API
   - Gmail API (if applicable)

---

## Domain-Wide Delegation

This allows the service account to act on behalf of users in your domain.

### Step 1: Enable Domain-Wide Delegation

1. In Cloud Console, go to **IAM & Admin** → **Service Accounts**
2. Click on your service account
3. Click **Show Advanced Settings** (or **Edit**)
4. Check **Enable Google Workspace Domain-wide Delegation**
5. Enter a product name: "NJDSC Compliance Portal"
6. Click **Save**
7. **IMPORTANT**: Note the **Client ID** (numeric, e.g., `123456789012345678901`)

### Step 2: Authorize in Google Workspace Admin

1. Go to [Google Workspace Admin Console](https://admin.google.com)
2. Navigate to **Security** → **Access and data control** → **API Controls**
3. Click **Manage Domain Wide Delegation**
4. Click **Add new**
5. Enter the **Client ID** from Step 1
6. Add OAuth Scopes (one per line):
   ```
   https://www.googleapis.com/auth/drive
   https://www.googleapis.com/auth/spreadsheets
   https://www.googleapis.com/auth/gmail.send
   ```
7. Click **Authorize**

### Verify Domain-Wide Delegation

Run this test script:
```bash
node test_auth_detailed.js
```

You should see:
```
✅ Auth with subject successful
```

---

## Google Sheets Setup

### Step 1: Create Reports Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it: "NJDSC Reports Database"
4. Create a sheet named "Reports" (exactly this name)
5. Add headers in row 1:
   ```
   id | schoolName | location | violationDescription | phoneNumber | websiteUrl | status | reporterIp | createdAt | lastReported | reportCount | adminNotes | mvcReferenceNumber
   ```

### Step 2: Share with Service Account

1. Click **Share** button
2. Enter your service account email
3. Give **Editor** permissions
4. Uncheck "Notify people"
5. Click **Share**

### Step 3: Get Spreadsheet ID

From the URL:
```
https://docs.google.com/spreadsheets/d/1hhp0ekSjMHO-IDOrw17tH6LmWsQXOiyCEGgCLisTmcs/edit
```

The Spreadsheet ID is: `1hhp0ekSjMHO-IDOrw17tH6LmWsQXOiyCEGgCLisTmcs`

### Step 4: Create Configuration Spreadsheet (Optional)

1. Create another spreadsheet: "NJDSC Configuration"
2. Create a sheet named "Config"
3. Add headers:
   ```
   key | value | description
   ```
4. Share with service account (Editor permissions)
5. Note the Spreadsheet ID

---

## Shared Drive Setup

See [GOOGLE_SHARED_DRIVE_SETUP.md](GOOGLE_SHARED_DRIVE_SETUP.md) for detailed instructions.

### Quick Steps:

1. **Create Shared Drive**:
   - Go to Google Drive
   - Click "Shared drives" → "New"
   - Name it "NJDSC Reports"

2. **Add Service Account**:
   - Click "Manage members"
   - Add service account email
   - Set role to "Manager"

3. **Get Shared Drive ID**:
   - Click on the Shared Drive
   - Copy ID from URL (starts with `0A`)

---

## Environment Configuration

### Step 1: Prepare Service Account Key

1. Open the downloaded JSON key file
2. Copy the entire contents
3. Minify it to a single line (remove all newlines except in the private_key)
4. The private_key should keep its `\n` characters

### Step 2: Create .env File

Create a `.env` file in your project root:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Frontend Configuration
FRONTEND_URL=https://your-domain.com

# Google Service Account
# Paste the entire JSON key as a single line
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id",...}

# Google Sheets
GOOGLE_SHEETS_SPREADSHEET_ID=1hhp0ekSjMHO-IDOrw17tH6LmWsQXOiyCEGgCLisTmcs
GOOGLE_CONFIG_SPREADSHEET_ID=1u7Xc7jwCiWo4rPyhiYXXWRFk5prG0g8r74ipYijeqgA

# Google Drive (Shared Drive ID)
GOOGLE_DRIVE_FOLDER_ID=0AExampleSharedDriveID

# Gmail (for notifications)
GOOGLE_GMAIL_USER=admin@yourdomain.com

# JWT Configuration
JWT_SECRET=your-secure-random-string-here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Logging
LOG_LEVEL=info
```

### Step 3: Secure the .env File

```bash
# Set proper permissions (Linux/Mac)
chmod 600 .env

# Add to .gitignore
echo ".env" >> .gitignore
```

### Step 4: Validate Configuration

Run the validation script:
```bash
node test_google_apis.js
```

Expected output:
```
✅ Basic auth successful
✅ Public spreadsheet access successful
✅ Your spreadsheet access successful
```

---

## Testing

### Test 1: Authentication
```bash
node test_auth_detailed.js
```

### Test 2: Sheets Access
```bash
node test_sheets.js
```

### Test 3: Shared Drive Access
```bash
node test_shared_drive_upload.js
```

### Test 4: Full API Test
```bash
npm test
```

---

## Troubleshooting

### "Invalid JWT Signature"
- **Cause**: Private key formatting issue
- **Solution**: Ensure `\n` characters are preserved in private_key
- The code automatically fixes this, but verify the key is complete

### "File not found" (404)
- **Cause**: Incorrect Spreadsheet or Drive ID
- **Solution**: Double-check IDs in .env file

### "Access denied" (403)
- **Cause**: Service account not shared with resource
- **Solution**: Share Sheets/Drive with service account email

### "Service Accounts do not have storage quota"
- **Cause**: Using regular Drive folder instead of Shared Drive
- **Solution**: Use Shared Drive (ID starts with `0A`)

### "Domain-wide delegation not configured"
- **Cause**: OAuth scopes not authorized in Admin Console
- **Solution**: Follow Domain-Wide Delegation steps above

### APIs not enabled
- **Cause**: Required APIs not enabled in Cloud Console
- **Solution**: Enable Drive, Sheets, and Gmail APIs

---

## Security Best Practices

1. **Never commit service account keys** to version control
2. **Rotate keys periodically** (every 90 days recommended)
3. **Use environment-specific keys** (dev, staging, production)
4. **Limit service account permissions** to only what's needed
5. **Monitor API usage** in Cloud Console
6. **Enable audit logging** in Workspace Admin
7. **Use HTTPS only** for all API communications

---

## Deployment Checklist

- [ ] Google Cloud Project created
- [ ] Service Account created and key downloaded
- [ ] APIs enabled (Drive, Sheets, Gmail)
- [ ] Domain-Wide Delegation configured
- [ ] Spreadsheets created and shared
- [ ] Shared Drive created and service account added
- [ ] .env file configured with all values
- [ ] All test scripts pass
- [ ] Application deployed and tested
- [ ] Monitoring and logging configured
- [ ] Documentation provided to client

---

## Client Handoff

Provide the client with:

1. **This documentation**
2. **Service account email** (for their records)
3. **Spreadsheet URLs** (for data access)
4. **Shared Drive URL** (for file access)
5. **Admin access instructions** (how to manage users, view reports)
6. **Support contact information**

---

## Related Documentation

- [GOOGLE_SHARED_DRIVE_SETUP.md](GOOGLE_SHARED_DRIVE_SETUP.md) - Shared Drive details
- [GOOGLE_SERVICE_ACCOUNT_SETUP.md](GOOGLE_SERVICE_ACCOUNT_SETUP.md) - Service account details
- [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) - All environment variables explained
- [ALTERNATIVE_STORAGE.md](ALTERNATIVE_STORAGE.md) - AWS S3/Cloudinary setup (future)