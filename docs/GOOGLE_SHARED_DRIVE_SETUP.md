# Google Shared Drive Setup Guide

This guide explains how to set up a Google Shared Drive for the NJDSC School Compliance Portal to enable file uploads using a service account.

## Prerequisites

- Google Workspace account (Business Starter, Business Standard, Business Plus, or Enterprise)
- Admin access to Google Workspace Admin Console
- Service account already created (see GOOGLE_WORKSPACE_DEPLOYMENT.md)

## Why Shared Drive?

Service accounts cannot upload files to regular Google Drive folders because they have no storage quota. Shared Drives (formerly Team Drives) have their own storage quota and allow service accounts to upload files.

## Step 1: Create a Shared Drive

### Option A: Via Google Drive Web Interface

1. Go to [Google Drive](https://drive.google.com)
2. Click **Shared drives** in the left sidebar
3. Click **+ New** at the top
4. Enter a name: `NJDSC Reports` (or your preferred name)
5. Click **Create**

### Option B: Via Google Workspace Admin Console

1. Go to [Google Admin Console](https://admin.google.com)
2. Navigate to **Apps** → **Google Workspace** → **Drive and Docs**
3. Click **Shared drives settings**
4. Ensure "Allow users to create shared drives" is enabled
5. Follow Option A above

## Step 2: Add Service Account to Shared Drive

1. In Google Drive, click on your newly created Shared Drive
2. Click the **Manage members** icon (person with +)
3. In the "Add members" field, enter your service account email:
   ```
   your-service-account@your-project.iam.gserviceaccount.com
   ```
   (Find this in your `.env` file as part of `GOOGLE_SERVICE_ACCOUNT_KEY`)

4. Set the role to **Content Manager** or **Manager**:
   - **Content Manager**: Can add/edit/delete files and folders
   - **Manager**: Can also manage members and settings (recommended)

5. Click **Send**

## Step 3: Get the Shared Drive ID

### Method 1: From URL
1. Click on the Shared Drive in Google Drive
2. Look at the URL in your browser:
   ```
   https://drive.google.com/drive/folders/0AExampleSharedDriveID
   ```
3. Copy the ID after `/folders/` (starts with `0A`)

### Method 2: Using API
Run this script to list all Shared Drives:

```javascript
// list_shared_drives.js
require('dotenv').config();
const { google } = require('googleapis');

const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const credentials = JSON.parse(SERVICE_ACCOUNT_KEY);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

async function listSharedDrives() {
  const response = await drive.drives.list({
    fields: 'drives(id, name)',
  });
  
  console.log('Shared Drives:');
  response.data.drives.forEach(drive => {
    console.log(`  ${drive.name}: ${drive.id}`);
  });
}

listSharedDrives();
```

## Step 4: Update Environment Configuration

Update your `.env` file:

```env
# Replace with your Shared Drive ID
GOOGLE_DRIVE_FOLDER_ID=0AExampleSharedDriveID

# This should already be set
GOOGLE_GMAIL_USER=your-email@yourdomain.com
```

## Step 5: Update Code for Shared Drive Support

The code needs to use `supportsAllDrives=true` parameter for all Drive operations.

Update `server/services/googleDriveService.js`:

```javascript
// When creating folders
const createResponse = await drive.files.create({
  resource: folderMetadata,
  fields: 'id',
  supportsAllDrives: true,  // Add this
});

// When uploading files
const response = await drive.files.create({
  resource: fileMetadata,
  media,
  fields: 'id,name,size,createdTime,modifiedTime,webViewLink,webContentLink',
  supportsAllDrives: true,  // Add this
});

// When listing files
const searchResponse = await drive.files.list({
  q: query,
  fields: 'files(id, name)',
  supportsAllDrives: true,  // Add this
  includeItemsFromAllDrives: true,  // Add this
});

// When getting file metadata
const response = await drive.files.get({
  fileId,
  fields: 'id,name,size,mimeType,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink,parents',
  supportsAllDrives: true,  // Add this
});

// When deleting files
await drive.files.delete({
  fileId,
  supportsAllDrives: true,  // Add this
});

// When creating permissions
await drive.permissions.create({
  fileId,
  resource: {
    type: 'anyone',
    role: 'reader',
  },
  supportsAllDrives: true,  // Add this
});
```

## Step 6: Test the Setup

Run the test script:

```bash
node test_shared_drive_upload.js
```

This will:
1. Create a test folder in the Shared Drive
2. Upload a test file
3. Verify the upload was successful

## Troubleshooting

### Error: "Shared drive not found"
- Verify the Shared Drive ID is correct
- Ensure the service account has been added as a member
- Wait a few minutes after adding the service account

### Error: "Insufficient permissions"
- Ensure the service account has "Content Manager" or "Manager" role
- Check that the Shared Drive hasn't been restricted by admin policies

### Error: "Service Accounts do not have storage quota"
- You're still using a regular folder, not a Shared Drive
- Verify the folder ID starts with `0A` (Shared Drive IDs start with 0A)
- Regular folder IDs start with `1` and are longer

### Files not appearing
- Check that `supportsAllDrives=true` is added to all Drive API calls
- Verify `includeItemsFromAllDrives=true` is used in list operations

## Storage Limits

Shared Drive storage limits depend on your Google Workspace plan:
- **Business Starter**: 30 GB per user (pooled)
- **Business Standard**: 2 TB per user (pooled)
- **Business Plus**: 5 TB per user (pooled)
- **Enterprise**: As much as needed

The storage is pooled across all users in your organization.

## Best Practices

1. **Naming Convention**: Use clear names like "NJDSC Reports - Production"
2. **Access Control**: Only give service account the minimum required permissions
3. **Monitoring**: Regularly check storage usage in Admin Console
4. **Backup**: Consider periodic backups of important files
5. **Organization**: Create subfolders for different report types or time periods

## Next Steps

After setup is complete:
1. Test file uploads thoroughly
2. Update your deployment documentation
3. Train team members on accessing the Shared Drive
4. Set up monitoring for storage usage

## Related Documentation

- [GOOGLE_WORKSPACE_DEPLOYMENT.md](GOOGLE_WORKSPACE_DEPLOYMENT.md) - Full deployment guide
- [GOOGLE_SERVICE_ACCOUNT_SETUP.md](GOOGLE_SERVICE_ACCOUNT_SETUP.md) - Service account creation
- [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) - All environment variable details