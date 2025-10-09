# Storage Configuration Guide

This document explains how to configure file storage for the NJDSC School Compliance Portal using local directory storage on DigitalOcean droplets.

## Overview

The application uses local file system storage for cost-effective, reliable file management:
- **Local Directory Storage** (Primary implementation)
- **Public Access** via Nginx web server
- **Organized Structure** with report-specific subdirectories
- **No external service dependencies** for core functionality

## Local Directory Storage (Current Implementation)

### Why Local Storage?

Local directory storage provides cost-effective, high-performance file storage with direct control over access and organization. Files are stored on the same DigitalOcean droplet as the application, ensuring low latency and eliminating third-party service dependencies.

### Prerequisites

- DigitalOcean droplet with sufficient storage space
- Nginx web server configured
- Application user with proper directory permissions
- Backup strategy in place

### Setup Steps

#### 1. Create Storage Directories

```bash
# Create main storage directory
sudo mkdir -p /var/www/uploads

# Create data directory for JSON files
sudo mkdir -p /var/www/data

# Set proper ownership and permissions
sudo chown -R www-data:www-data /var/www/uploads
sudo chown -R www-data:www-data /var/www/data
sudo chmod 755 /var/www/uploads
sudo chmod 755 /var/www/data
```

#### 2. Configure Nginx for Public Access

Add to your Nginx configuration (`/etc/nginx/sites-available/unlicenseddrivingschoolnj.com`):

```nginx
# Serve uploaded files publicly
location /uploads/ {
    alias /var/www/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    add_header X-Robots-Tag "noindex, nofollow";
}
```

#### 3. Update Environment Configuration

Update `.env`:
```env
UPLOADS_DIR=/var/www/uploads
DATA_DIR=/var/www/data
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4
```

#### 4. Test Setup

```bash
# Test directory permissions
ls -la /var/www/uploads

# Test file creation
touch /var/www/uploads/test.txt && rm /var/www/uploads/test.txt

# Test Nginx configuration
sudo nginx -t && sudo systemctl reload nginx
```

Expected output:
```
✅ Directories created with correct permissions
✅ File operations working
✅ Nginx serving files correctly
```

### Directory Structure

```
/var/www/uploads/
├── reports/
│   ├── rep_abc123/
│   │   ├── file_xyz789_1633360000000_evidence.jpg
│   │   └── file_xyz790_1633360000001_document.pdf
│   └── rep_def456/
│       └── file_uvw101_1633360000002_video.mp4
└── temp/  # For temporary uploads during processing
```

### Storage Limits

| Resource | DigitalOcean Basic Droplet | Recommended |
|----------|---------------------------|-------------|
| Storage | 25-200 GB SSD | 50+ GB |
| Bandwidth | 1-5 TB/month | 2+ TB |
| File Size Limit | Configurable | 10 MB |
| Files per Report | Configurable | 10 files |

### Troubleshooting

#### Permission Denied Errors
- **Cause**: Incorrect directory permissions
- **Solution**:
  ```bash
  sudo chown -R www-data:www-data /var/www/uploads
  sudo chmod 755 /var/www/uploads
  ```

#### Files Not Accessible via Web
- **Cause**: Nginx configuration issue
- **Solution**:
  ```bash
  sudo nginx -t
  sudo systemctl reload nginx
  ```

#### Disk Space Issues
- **Cause**: Insufficient storage space
- **Solution**:
  ```bash
  df -h  # Check disk usage
  # Consider upgrading droplet or implementing cleanup
  ```

---

## Future Storage Options

### Why Consider External Storage?

**Advantages over local storage:**
- Scalable storage without server upgrades
- Built-in CDN and global distribution
- Automatic backups and redundancy
- Advanced image processing features
- Better performance for high-traffic sites

**Disadvantages:**
- Additional service costs
- Dependency on third-party services
- More complex configuration
- Potential vendor lock-in

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

1. **Keep local JSON files** for report metadata
2. **Store files** in external service (future enhancement)
3. **Save URLs** in Sheets alongside report data
4. **Use environment variable** to switch storage providers

### Configuration Structure

```env
# Local Storage Configuration
UPLOADS_DIR=/var/www/uploads
DATA_DIR=/var/www/data
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4

# File Organization
UPLOADS_URL_BASE=https://unlicenseddrivingschoolnj.com/uploads
CREATE_REPORT_SUBDIRS=true
FILE_NAMING_PATTERN={id}_{timestamp}_{originalName}

# Backup Configuration
BACKUP_DIR=/var/www/backups
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE=daily
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

To migrate from local storage to external storage (future enhancement):

1. **Phase 1**: Implement new storage service
2. **Phase 2**: Update upload code to use new service
3. **Phase 3**: Migrate existing files (optional)
4. **Phase 4**: Update all file URLs in Sheets

---

## Comparison Matrix

| Feature | Local Storage | AWS S3 | Cloudinary | DigitalOcean Spaces |
|---------|---------------|--------|------------|-------------------|
| Setup Complexity | Low | Medium | Easy | Low |
| Infrastructure Required | Yes | No | No | No |
| Storage Cost | Included in server | $0.023/GB/mo | Free tier + $0.01/GB | $0.01/GB/mo |
| Bandwidth Cost | Included in server | $0.09/GB | $0.10/GB | $0.01/GB |
| CDN | Manual config | Via CloudFront | Built-in | Via CDN |
| Image Optimization | Manual | Via Lambda | Automatic | Manual |
| Video Support | Yes | Yes | Yes | Yes |
| Access Control | File permissions | IAM/Bucket policies | API-based | Token-based |
| Backup | Manual | Automatic | Automatic | Manual |

---

## Recommendations

### For Cost-Effective Deployments (< 100 GB)
- **Use Local Storage** on DigitalOcean droplets
- Lowest cost option with full control
- Suitable for most small to medium applications
- Easy to set up and maintain

### For High-Traffic Sites (> 10,000 visits/month)
- **Consider DigitalOcean Spaces** with CDN
- Better performance for global users
- Automatic scaling and backups
- Still cost-effective compared to AWS/Cloudinary

### For Enterprise Deployments (> 1 TB)
- **Use AWS S3 or Cloudinary**
- Advanced features and global CDN
- Professional support and SLAs
- Consider cost vs. features trade-off

---

## Testing

### Test Local Storage Setup
```bash
# Test directory permissions
ls -la /var/www/uploads /var/www/data

# Test file creation and access
touch /var/www/uploads/test.txt
curl http://localhost/uploads/test.txt
rm /var/www/uploads/test.txt

# Test JSON file operations
node -e "
const fs = require('fs');
const data = {test: 'data'};
fs.writeFileSync('/var/www/data/test.json', JSON.stringify(data));
console.log('✅ JSON write successful');
const read = JSON.parse(fs.readFileSync('/var/www/data/test.json'));
console.log('✅ JSON read successful:', read);
fs.unlinkSync('/var/www/data/test.json');
"
```

### Verify Configuration
```bash
# Check all environment variables
node -e "
require('dotenv').config();
console.log('Storage Config:');
console.log('  Data Directory:', process.env.DATA_DIR);
console.log('  Uploads Directory:', process.env.UPLOADS_DIR);
console.log('  Uploads URL Base:', process.env.UPLOADS_URL_BASE);
console.log('  Gmail User:', process.env.GOOGLE_GMAIL_USER);
"
```

---

## Security Considerations

### Local File System
- Application user has controlled access to storage directories
- Files served publicly via Nginx with proper permissions
- Access controlled via file system permissions and web server config
- Server-level logging and monitoring

### External Storage
- Use IAM roles/policies for access control
- Enable encryption at rest
- Use signed URLs for temporary access
- Implement proper CORS policies
- Regular security audits

---

## Monitoring

### Local File System
- Monitor disk usage with `df -h` and `du -sh`
- Check file permissions regularly
- Monitor Nginx access logs for file requests
- Set up alerts for low disk space

### External Storage
- Monitor storage costs
- Track bandwidth usage
- Set up alerts for quota limits
- Review access logs

---

## Related Documentation

- [deployment_guide.md](deployment_guide.md) - DigitalOcean droplet deployment
- [database_schema.md](database_schema.md) - JSON file schema specifications
- [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) - All configuration options
- [system_architecture.md](system_architecture.md) - Overall system architecture