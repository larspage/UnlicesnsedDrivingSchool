# Local Storage Setup Guide

This guide explains how to set up local directory storage for the NJDSC School Compliance Portal on DigitalOcean droplets.

## Prerequisites

- DigitalOcean droplet with Ubuntu 22.04 LTS
- Root or sudo access to the server
- Nginx web server installed
- Application directory structure created

## Why Local Storage?

Local directory storage provides cost-effective, high-performance file storage with direct control over access and organization. Files are stored on the same server as the application, ensuring low latency and eliminating third-party service dependencies.

## Step 1: Create Storage Directories

```bash
# Create main application directory
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www

# Create data directory for JSON files
sudo mkdir -p /var/www/data

# Create uploads directory for files
sudo mkdir -p /var/www/uploads

# Set proper ownership and permissions
sudo chown -R www-data:www-data /var/www/data
sudo chown -R www-data:www-data /var/www/uploads
sudo chmod 755 /var/www/data
sudo chmod 755 /var/www/uploads
```

## Step 2: Configure Nginx for Public File Access

Add to your Nginx configuration (`/etc/nginx/sites-available/unlicenseddrivingschoolnj.com`):

```nginx
# Serve uploaded files publicly
location /uploads/ {
    alias /var/www/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    add_header X-Robots-Tag "noindex, nofollow";
}

# Protect data files (JSON) from direct access
location /data/ {
    deny all;
    return 403;
}
```

Test and reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Step 3: Update Environment Configuration

Update your `.env` file:

```env
# Local storage paths
DATA_DIR=/var/www/data
UPLOADS_DIR=/var/www/uploads

# File upload settings
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4

# Public URL for uploaded files
UPLOADS_URL_BASE=https://unlicenseddrivingschoolnj.com/uploads
```

## Step 4: Initialize Data Files

Create initial JSON data files:

```bash
# Create reports.json
echo '[]' | sudo tee /var/www/data/reports.json > /dev/null

# Create config.json with default settings
cat << EOF | sudo tee /var/www/data/config.json > /dev/null
{
  "email": {
    "toAddress": "mvc.blsdrivingschools@mvc.nj.gov",
    "fromAddress": "treasurer@njdsc.org"
  },
  "system": {
    "rateLimitPerHour": 5,
    "maxFileSize": 10485760
  }
}
EOF

# Create audit.json for admin actions
echo '[]' | sudo tee /var/www/data/audit.json > /dev/null

# Set proper permissions
sudo chown www-data:www-data /var/www/data/*.json
sudo chmod 644 /var/www/data/*.json
```

## Step 5: Test the Setup

Run test scripts to verify local storage:

```bash
# Test directory permissions
ls -la /var/www/uploads /var/www/data

# Test file creation
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

## Step 6: Set Up Backup Strategy

Create automated backup scripts:

```bash
# Create backup directory
sudo mkdir -p /var/www/backups

# Create backup script
cat << 'EOF' | sudo tee /var/www/backup.sh > /dev/null
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)

# Backup data files
tar -czf /var/www/backups/data_$DATE.tar.gz /var/www/data/

# Backup uploads (incremental)
rsync -av --delete /var/www/uploads/ /var/www/backups/uploads/

# Clean old backups (keep last 30 days)
find /var/www/backups/ -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

# Make executable and set up cron job
sudo chmod +x /var/www/backup.sh
(crontab -l ; echo "0 2 * * * /var/www/backup.sh") | crontab -
```

## Troubleshooting

### Permission Denied Errors
- **Cause**: Incorrect directory permissions
- **Solution**:
  ```bash
  sudo chown -R www-data:www-data /var/www/uploads
  sudo chmod 755 /var/www/uploads
  ```

### Files Not Accessible via Web
- **Cause**: Nginx configuration issue
- **Solution**:
  ```bash
  sudo nginx -t
  sudo systemctl reload nginx
  ```

### JSON File Corruption
- **Cause**: Concurrent writes or interrupted operations
- **Solution**:
  - Implement atomic writes in application code
  - Use file locking for critical operations
  - Restore from backup if needed

### Disk Space Issues
- **Cause**: Insufficient storage space
- **Solution**:
  ```bash
  df -h  # Check disk usage
  # Consider upgrading droplet or implementing cleanup
  ```

## Storage Limits

DigitalOcean droplet storage limits:
- **Basic Droplet**: 25-200 GB SSD storage
- **Bandwidth**: 1-5 TB/month included
- **File Size Limit**: Configurable (default: 10 MB)
- **Files per Report**: Configurable (default: 10 files)

## Best Practices

1. **Directory Structure**: Organize files by report ID for easy management
2. **File Naming**: Use timestamps and original names for uniqueness
3. **Permissions**: Use minimal permissions (755 for directories, 644 for files)
4. **Monitoring**: Regularly check disk usage and file counts
5. **Backup**: Implement automated daily backups with retention policy
6. **Security**: Protect data files from direct web access

## Next Steps

After setup is complete:
1. Test file uploads thoroughly
2. Update your deployment documentation
3. Set up monitoring for disk usage
4. Configure log rotation for application logs
5. Test backup and restore procedures

## Related Documentation

- [deployment_guide.md](deployment_guide.md) - DigitalOcean droplet deployment
- [database_schema.md](database_schema.md) - JSON file schema specifications
- [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) - All configuration options