# NJDSC School Compliance Portal - Deployment Guide

## 1. Overview

This guide provides comprehensive instructions for deploying the NJDSC School Compliance Portal across development, staging, and production environments. The application consists of a React frontend and Node.js/Express backend, with Google Workspace integrations.

### 1.1 Architecture Summary
- **Frontend:** React + TypeScript, served by Nginx on DigitalOcean droplet
- **Backend:** Node.js + Express, running on DigitalOcean droplet
- **Database:** Local JSON files on DigitalOcean droplet
- **File Storage:** Local file system on DigitalOcean droplet
- **Email:** Gmail API
- **Domain:** unlicenseddrivingschoolnj.com

### 1.2 Deployment Environments
- **Development:** Local development with mock APIs
- **Staging:** Production-like environment with limited API access
- **Production:** Full production deployment with live APIs

---

## 2. Prerequisites

### 2.1 System Requirements
- Node.js 18+ and npm
- Git
- DigitalOcean account
- Domain registrar access (for production)
- SSH access to server

### 2.2 Google Cloud Console Setup (Gmail API Only)
1. Create a new Google Cloud Project: `njdsc-compliance-portal`
2. Enable required APIs:
   - Gmail API (for email notifications)
   - Google Custom Search API (for data enrichment)
3. Create service account credentials for Gmail API
4. Configure domain-wide delegation for service account
5. Configure OAuth consent screen for Gmail API

### 2.3 Repository Setup
```bash
# Clone the repository
git clone https://github.com/njdsc/compliance-portal.git
cd compliance-portal

# Install dependencies
npm install

# Set up environment files (see section 3)
```

---

## 3. Environment Configuration

### 3.1 Environment Files Structure
```
.env.development    # Development environment
.env.staging       # Staging environment
.env.production    # Production environment
```

### 3.2 Development Environment (.env.development)
```bash
# Application
NODE_ENV=development
PORT=3001

# Frontend
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME="NJDSC Compliance Portal (Dev)"

# Data Storage (Development)
DATA_DIR=./data
UPLOADS_DIR=./uploads

# Google APIs (Development - Gmail only)
GOOGLE_CLIENT_EMAIL=dev-service@njdsc-portal.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Authentication (Development)
AUTH0_DOMAIN=dev-njdsc.us.auth0.com
AUTH0_CLIENT_ID=abc123...
AUTH0_CLIENT_SECRET=def456...

# Email (Development)
GMAIL_FROM_ADDRESS=dev-treasurer@njdsc.org
MVC_EMAIL_TO=mvc.blsdrivingschools@mvc.nj.gov

# Security
JWT_SECRET=dev-jwt-secret-key-change-in-production
BCRYPT_ROUNDS=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # per window

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,video/mp4
```

### 3.3 Staging Environment (.env.staging)
```bash
# Application
NODE_ENV=staging
PORT=3001

# Frontend
VITE_API_URL=https://api-staging.unlicenseddrivingschoolnj.com/api
VITE_APP_NAME="NJDSC Compliance Portal (Staging)"

# Data Storage (Staging)
DATA_DIR=/var/www/data
UPLOADS_DIR=/var/www/uploads

# Google APIs (Staging - Gmail only)
GOOGLE_CLIENT_EMAIL=staging-service@njdsc-portal.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Authentication (Staging)
AUTH0_DOMAIN=staging-njdsc.us.auth0.com
AUTH0_CLIENT_ID=staging-abc123...
AUTH0_CLIENT_SECRET=staging-def456...

# Email (Staging)
GMAIL_FROM_ADDRESS=staging-treasurer@njdsc.org
MVC_EMAIL_TO=mvc.blsdrivingschools@mvc.nj.gov

# Security
JWT_SECRET=staging-jwt-secret-key-change-in-production
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=50   # More restrictive for staging

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,video/mp4
```

### 3.4 Production Environment (.env.production)
```bash
# Application
NODE_ENV=production
PORT=3001

# Frontend
VITE_API_URL=https://api.unlicenseddrivingschoolnj.com/api
VITE_APP_NAME="NJDSC School Compliance Portal"

# Data Storage (Production)
DATA_DIR=/var/www/data
UPLOADS_DIR=/var/www/uploads

# Google APIs (Production - Gmail only)
GOOGLE_CLIENT_EMAIL=prod-service@njdsc-portal.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Authentication (Production)
AUTH0_DOMAIN=njdsc.us.auth0.com
AUTH0_CLIENT_ID=prod-abc123...
AUTH0_CLIENT_SECRET=prod-def456...

# Email (Production)
GMAIL_FROM_ADDRESS=treasurer@njdsc.org
MVC_EMAIL_TO=mvc.blsdrivingschools@mvc.nj.gov

# Security
JWT_SECRET=prod-jwt-secret-key-rotated-regularly
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000  # 1 hour
RATE_LIMIT_MAX_REQUESTS=5     # 5 submissions per hour per IP

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,video/mp4

# Monitoring
SENTRY_DSN=https://abc123@sentry.io/123456
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
```

### 3.5 Google API Credentials Setup

#### Service Account Creation
1. Go to Google Cloud Console → IAM & Admin → Service Accounts
2. Create service account: `njdsc-compliance-portal`
3. Generate JSON key file
4. Extract `client_email` and `private_key` for environment variables

#### Gmail API Setup
1. Enable Gmail API in Google Cloud Console
2. Configure OAuth consent screen for NJDSC domain
3. Create OAuth 2.0 Client ID credentials
4. Set up domain-wide delegation for service account
5. Configure Gmail user permissions in Google Workspace admin

#### Gmail API Setup
1. Enable Gmail API in Google Cloud Console
2. Configure OAuth consent screen
3. Create credentials (OAuth 2.0 Client ID)
4. Domain-wide delegation for service account

---

## 4. Local Development Setup

### 4.1 Backend Development
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.development .env

# Edit .env with your local credentials

# Start development server
npm run dev

# Server will be available at http://localhost:3001
```

### 4.2 Frontend Development
```bash
# Navigate to frontend directory (if separate)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Frontend will be available at http://localhost:5173
```

### 4.3 Full Stack Development
```bash
# Start backend in one terminal
npm run dev:server

# Start frontend in another terminal
npm run dev:client

# Or use concurrently for both
npm run dev
```

### 4.4 Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

---

## 5. Build Process

### 5.1 Frontend Build
```bash
# Production build
npm run build

# Build artifacts will be in dist/ directory
# - dist/index.html
# - dist/assets/
# - dist/vite.svg
```

### 5.2 Backend Build
```bash
# For production deployment (if needed)
npm run build:server

# Creates optimized server build
```

### 5.3 Docker Build (Optional)
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
```

```bash
# Build Docker image
docker build -t njdsc-compliance-portal .

# Run container
docker run -p 3001:3001 njdsc-compliance-portal
```

---

## 6. Deployment Procedures

### 6.1 DigitalOcean Droplet Setup

#### Prerequisites
1. Create DigitalOcean account
2. Choose droplet size (recommended: 1GB RAM, 1 vCPU for starter)
3. Select Ubuntu 22.04 LTS as operating system
4. Add SSH keys for secure access
5. Choose datacenter region (preferably close to users)

#### Initial Server Setup
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt install nginx -y

# Install PM2 for process management
sudo npm install -g pm2

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

#### Application Deployment
```bash
# Create application directory
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www

# Clone repository
cd /var/www
git clone https://github.com/njdsc/compliance-portal.git
cd compliance-portal

# Install dependencies
npm install

# Create data and uploads directories
mkdir -p data uploads
chmod 755 uploads

# Copy environment file and configure
cp .env.example .env
nano .env  # Edit with production values

# Build application
npm run build

# Start application with PM2
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save
```

### 6.2 Netlify Deployment (Alternative)

#### Setup
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize project
netlify init

# Configure build settings in netlify.toml
```

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "https://api.unlicenseddrivingschoolnj.com/api/:splat"
  status = 200
```

### 6.3 Manual Deployment

#### Server Setup
```bash
# On production server
sudo apt update
sudo apt install nodejs npm nginx

# Clone repository
git clone https://github.com/njdsc/compliance-portal.git
cd compliance-portal

# Install PM2 for process management
npm install -g pm2

# Install dependencies
npm install

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

#### Nginx Configuration
```nginx
# /etc/nginx/sites-available/unlicenseddrivingschoolnj.com
server {
    listen 80;
    server_name unlicenseddrivingschoolnj.com www.unlicenseddrivingschoolnj.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name unlicenseddrivingschoolnj.com www.unlicenseddrivingschoolnj.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/unlicenseddrivingschoolnj.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/unlicenseddrivingschoolnj.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Serve static files (React app)
    location / {
        root /var/www/compliance-portal/dist;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Serve uploaded files publicly
    location /uploads/ {
        alias /var/www/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API proxy to Node.js application
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 7. Domain Configuration

### 7.1 DNS Setup
```
# A Records
unlicenseddrivingschoolnj.com     -> YOUR_SERVER_IP
www.unlicenseddrivingschoolnj.com -> YOUR_SERVER_IP

# Or for Vercel/Netlify
unlicenseddrivingschoolnj.com     -> CNAME to your-deployment-provider
www.unlicenseddrivingschoolnj.com -> CNAME to your-deployment-provider
```

### 7.2 SSL Certificate
```bash
# Install Certbot
sudo apt install snapd -y
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Get SSL certificate
sudo certbot --nginx -d unlicenseddrivingschoolnj.com -d www.unlicenseddrivingschoolnj.com

# Set up auto-renewal
sudo certbot renew --dry-run
```

### 7.3 CDN Setup (Optional)
- Configure Cloudflare or similar CDN
- Set up caching rules for static assets
- Configure SSL/TLS settings

---

## 8. Configuration Management

### 8.1 Environment Variable Management
- Use Vercel/Netlify environment variable management
- Never commit `.env` files to version control
- Rotate secrets regularly
- Use different credentials per environment

### 8.2 Google API Configuration
- Store credentials securely in environment variables
- Use different service accounts per environment
- Regularly rotate private keys
- Monitor API usage and quotas

### 8.3 Admin Configuration
The application supports runtime configuration changes through the admin panel:
- Email templates
- API settings
- System parameters
- Rate limiting rules

---

## 9. Monitoring & Maintenance

### 9.1 Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart njdsc-compliance-portal
```

### 9.2 Error Tracking
- Integrate Sentry for error tracking
- Set up alerts for critical errors
- Monitor API failures and timeouts

### 9.3 Performance Monitoring
- Google Analytics for user behavior
- Lighthouse CI for performance monitoring
- Server response time monitoring
- Database query performance

### 9.4 Backup Procedures
```bash
# Data files backup
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz /var/www/data/
cp backup_*.tar.gz /var/www/backups/

# Uploads backup (incremental)
rsync -av --delete /var/www/uploads/ /var/www/backups/uploads/

# Application logs
pm2 logs njdsc-compliance-portal --lines 1000 > /var/www/backups/logs_$(date +%Y%m%d).log

# Configuration backup
cp /var/www/compliance-portal/.env /var/www/backups/.env.$(date +%Y%m%d)

# Automated backup script
#!/bin/bash
# /var/www/backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /var/www/backups/data_$DATE.tar.gz /var/www/data/
find /var/www/backups/ -name "*.tar.gz" -mtime +30 -delete
```

### 9.5 Security Updates
```bash
# Update dependencies
npm audit
npm audit fix

# Update Node.js
# Follow Node.js LTS release schedule

# Security scanning
npm run security:scan
```

---

## 10. Troubleshooting

### 10.1 Common Issues

#### File System Permission Errors
```
Error: EACCES: permission denied
```
- Check directory permissions: `ls -la /var/www/`
- Fix permissions: `sudo chown -R www-data:www-data /var/www/uploads/`
- Ensure application user has write access

#### File Upload Failures
```
Error: File too large
```
- Check MAX_FILE_SIZE environment variable
- Verify disk space with `df -h`
- Check file type restrictions in ALLOWED_FILE_TYPES

#### JSON File Corruption
```
Error: Unexpected end of JSON input
```
- Check file integrity: `cat /var/www/data/reports.json | jq .`
- Restore from backup if needed
- Implement atomic writes in application code

#### Authentication Problems
```
Error: Invalid token
```
- Check JWT_SECRET environment variable
- Verify Auth0 configuration
- Check token expiration

### 10.2 Debug Mode
```bash
# Enable debug logging
DEBUG=* npm start

# Check environment variables
node -e "console.log(process.env)"

# Test API connectivity
curl -X GET http://localhost:3001/api/health
```

### 10.3 Rollback Procedures
```bash
# Git rollback
git log --oneline -10
git revert <commit-hash>
git push origin main

# PM2 rollback
pm2 list
pm2 stop njdsc-compliance-portal
pm2 delete njdsc-compliance-portal
pm2 start ecosystem.config.js

# Data rollback (JSON files)
# Restore from backup: tar -xzf /var/www/backups/data_*.tar.gz -C /var/www/
# Or use git to revert data changes if version controlled
```

---

## 11. Launch Checklist

### Pre-Launch
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Domain and SSL configured
- [ ] Data directories created and permissions set
- [ ] Gmail API properly configured
- [ ] Admin accounts created
- [ ] User documentation ready

### Launch Day
- [ ] Deploy to production
- [ ] Verify application accessibility
- [ ] Test critical user flows
- [ ] Monitor error rates
- [ ] Check Google Analytics
- [ ] Communicate launch to stakeholders

### Post-Launch
- [ ] Monitor for 24-48 hours
- [ ] Address any critical issues
- [ ] Collect user feedback
- [ ] Plan first maintenance window
- [ ] Schedule regular updates

---

**Deployment Guide Version:** 2.0
**Last Updated:** October 3, 2025
**Supported Platforms:** DigitalOcean Droplets, Self-hosted