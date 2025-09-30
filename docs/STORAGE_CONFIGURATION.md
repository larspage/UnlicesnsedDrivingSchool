# Storage Configuration Guide

This document explains how to configure file storage for the NJDSC School Compliance Portal, including both Google Shared Drive (Option 1) and alternative storage solutions (Option 2).

## Overview

The application supports two storage approaches:
1. **Google Shared Drive** (Current implementation)
2. **External Storage** (AWS S3, Cloudinary, etc.) - Configurable for future use

## Option 1: Google Shared Drive (Current)

### Why Shared Drive?

Service accounts cannot upload files to regular Google Drive folders because they lack storage quota. Shared Drives have their own storage quota and support service account uploads.

### Prerequisites

- Google Workspace account (Business Starter or higher)
- Admin access to create Shared Drives
- Service account already configured

### Setup Steps

#### 1. Create Shared Drive

**Via Google Drive:**
1. Go to [Google Drive](https://drive.google.com)
2. Click **Shared drives** in left sidebar
3. Click **+ New**
4. Name it: `NJDSC Reports`
5. Click **Create**

#### 2. Add Service Account

1. Click on your Shared Drive
2. Click **Manage members** (person icon with +)
3. Add service account email (from your `.env` file)
4. Set role to **Manager**
5. Click **Send**

#### 3. Get Shared Drive ID

**Method A - From URL:**
```
https://drive.google.com/drive/folders/0AExampleSharedDriveID
                                      ^^^^^^^^^^^^^^^^^^^^^^
                                      This is your Shared Drive ID
```

**Method B - Using Script:**
```bash
node list_shared_drives.js
```

#### 4. Update Configuration

Update `.env`:
```env
GOOGLE_DRIVE_FOLDER_ID=0AExampleSharedDriveID
```

**Important:** Shared Drive IDs start with `0A`. Regular folder IDs start with `1`.

#### 5. Test Setup

```bash
node test_shared_drive_upload.js
```

Expected output:
```
✅ Shared Drive folder creation working
✅ File uploads working
✅ Multiple files per report working
```

### Code Implementation

The `googleDriveService.js` has been updated to support Shared Drives with these parameters:

```javascript
// All Drive API calls now include:
supportsAllDrives: true
includeItemsFromAllDrives: true  // For list operations
```

### Storage Limits

| Plan | Storage per User | Pooled |
|------|-----------------|--------|
| Business Starter | 30 GB | Yes |
| Business Standard | 2 TB | Yes |
| Business Plus | 5 TB | Yes |
| Enterprise | Unlimited* | Yes |

*Subject to fair use policy

### Troubleshooting

#### "Service Accounts do not have storage quota"
- **Cause**: Using regular folder instead of Shared Drive
- **Solution**: 
  1. Verify folder ID starts with `0A`
  2. Create Shared Drive if needed
  3. Update `GOOGLE_DRIVE_FOLDER_ID`

#### "Shared drive not found" (404)
- **Cause**: Service account not added to Shared Drive
- **Solution**: Add service account as Manager

#### "Insufficient permissions" (403)
- **Cause**: Service account has wrong role
- **Solution**: Change role to "Content Manager" or "Manager"

---

## Option 2: External Storage (Future)

### Why External Storage?

**Advantages:**
- No Google Workspace required
- Better performance for file serving
- More control over access and security
- Easier CDN integration
- Lower costs at scale
- No storage quota concerns

**Disadvantages:**
- Additional service to manage
- Separate billing
- More complex initial setup

### Supported Providers

#### AWS S3
- Industry standard
- Highly scalable
- Integrated with AWS ecosystem
- Cost: ~$0.023/GB/month

#### Cloudinary
- Optimized for images/videos
- Built-in transformations
- Easy CDN integration
- Free tier: 25 GB storage, 25 GB bandwidth

#### Azure Blob Storage
- Good for Microsoft ecosystem
- Similar to S3
- Cost: ~$0.018/GB/month

### Implementation Approach

When implementing external storage:

1. **Keep Google Sheets** for report metadata
2. **Store files** in external service
3. **Save URLs** in Sheets alongside report data
4. **Use environment variable** to switch storage providers

### Configuration Structure

```env
# Storage Provider Selection
STORAGE_PROVIDER=google_drive  # or 's3', 'cloudinary', 'azure'

# Google Drive (current)
GOOGLE_DRIVE_FOLDER_ID=0AExampleSharedDriveID

# AWS S3 (future)
AWS_S3_BUCKET=njdsc-reports
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Cloudinary (future)
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Azure (future)
AZURE_STORAGE_ACCOUNT=njdscreports
AZURE_STORAGE_KEY=your-key
AZURE_CONTAINER=reports
```

### Code Structure for Multi-Provider Support

```javascript
// server/services/storageService.js (future)
const storageProvider = process.env.STORAGE_PROVIDER || 'google_drive';

const providers = {
  google_drive: require('./googleDriveService'),
  s3: require('./s3StorageService'),
  cloudinary: require('./cloudinaryService'),
  azure: require('./azureStorageService'),
};

module.exports = providers[storageProvider];
```

### Migration Path

To migrate from Google Drive to external storage:

1. **Phase 1**: Implement new storage service
2. **Phase 2**: Update upload code to use new service
3. **Phase 3**: Migrate existing files (optional)
4. **Phase 4**: Update all file URLs in Sheets

---

## Comparison Matrix

| Feature | Google Shared Drive | AWS S3 | Cloudinary |
|---------|-------------------|--------|------------|
| Setup Complexity | Medium | Medium | Easy |
| Google Workspace Required | Yes | No | No |
| Storage Quota | Plan-dependent | Unlimited | Unlimited |
| Cost (10GB) | Included | $0.23/mo | Free tier |
| CDN | Via Google | Via CloudFront | Built-in |
| Image Optimization | No | Manual | Automatic |
| Video Support | Yes | Yes | Yes |
| Access Control | Google permissions | IAM/Bucket policies | API-based |

---

## Recommendations

### For Small Deployments (< 100 GB)
- **Use Google Shared Drive** if you have Google Workspace
- Simple setup, integrated with existing Google services
- No additional costs

### For Medium Deployments (100 GB - 1 TB)
- **Consider Cloudinary** for image-heavy applications
- **Consider AWS S3** for general file storage
- Better performance and scalability

### For Large Deployments (> 1 TB)
- **Use AWS S3 or Azure Blob**
- Implement CDN for global distribution
- Consider lifecycle policies for cost optimization

---

## Testing

### Test Shared Drive Setup
```bash
# List available Shared Drives
node list_shared_drives.js

# Test folder creation
node test_api_folder_creation.js

# Test file upload
node test_shared_drive_upload.js
```

### Verify Configuration
```bash
# Check all environment variables
node -e "
require('dotenv').config();
console.log('Storage Config:');
console.log('  Provider:', process.env.STORAGE_PROVIDER || 'google_drive');
console.log('  Folder ID:', process.env.GOOGLE_DRIVE_FOLDER_ID);
console.log('  Gmail User:', process.env.GOOGLE_GMAIL_USER);
"
```

---

## Security Considerations

### Google Shared Drive
- Service account has full access to Shared Drive
- Files can be made public or private
- Access controlled via Google permissions
- Audit logs available in Admin Console

### External Storage
- Use IAM roles/policies for access control
- Enable encryption at rest
- Use signed URLs for temporary access
- Implement proper CORS policies
- Regular security audits

---

## Monitoring

### Google Shared Drive
- Monitor storage usage in Admin Console
- Check API quotas in Cloud Console
- Review audit logs for file access

### External Storage
- Monitor storage costs
- Track bandwidth usage
- Set up alerts for quota limits
- Review access logs

---

## Related Documentation

- [GOOGLE_SHARED_DRIVE_SETUP.md](GOOGLE_SHARED_DRIVE_SETUP.md) - Detailed Shared Drive setup
- [GOOGLE_WORKSPACE_DEPLOYMENT.md](GOOGLE_WORKSPACE_DEPLOYMENT.md) - Full deployment guide
- [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) - All configuration options
- [ALTERNATIVE_STORAGE.md](ALTERNATIVE_STORAGE.md) - External storage implementation (future)