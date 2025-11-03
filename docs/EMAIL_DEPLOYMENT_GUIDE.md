# Email Configuration Deployment Guide

## Overview

The email configurations have been added to your environment files. Your email templates and functionality are already properly configured in your application - you just need to set up the SMTP environment variables in your deployment.

## Changes Made

### 1. Development Environment (`.env`)
Added the following email configuration:
```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=treasurer@njdsc.org
SMTP_PASS=your-gmail-app-password
EMAIL_FROM=treasurer@njdsc.org
```

### 2. Production Environment (`.env.production`)
Updated production configuration with the same email settings.

## Existing Email Configuration

Your application already has all email templates configured in `data/config.json`:

- **Email Templates**: ✅ Configured with MVC notification templates
- **Email Service**: ✅ Ready to send when SMTP credentials are provided
- **Default Settings**: ✅ Already points to treasurer@njdsc.org

## Production Deployment Steps

### Step 1: Set Up Gmail App Password

1. **Enable 2-Factor Authentication** on treasurer@njdsc.org
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Copy the 16-character password

### Step 2: Update Production Environment

1. **SSH into your production server**:
   ```bash
   ssh root@your-server-ip
   ```

2. **Navigate to your project directory**:
   ```bash
   cd /var/www
   ```

3. **Edit the `.env` file**:
   ```bash
   nano .env
   ```

4. **Update the SMTP_PASS value** with your actual Gmail App Password:
   ```env
   SMTP_PASS=your-actual-16-character-app-password
   ```

5. **Save and exit** (Ctrl+X, Y, Enter)

### Step 3: Restart Application

```bash
# If using PM2
pm2 restart all

# If using systemd
sudo systemctl restart your-app-service

# If running directly
pm2 stop all && pm2 start ecosystem.config.js
```

### Step 4: Verify Email Configuration

1. **Check server logs** for email initialization:
   ```
   [APP STARTUP] Email service configured successfully
   ```

2. **Test email functionality** by:
   - Creating a test report through your application
   - Checking logs for successful email sending
   - Verifying email delivery to MVC

## Email Functionality Features

Once configured, your application will automatically:

1. **Send MVC Notifications**: When new reports are created
2. **Use Templates**: Pre-configured subject and body templates
3. **Include Variables**: Report details substituted into templates
4. **Handle Errors**: Graceful degradation if email fails

## Configuration Details

### Email Flow
```
Report Created → Email Template Applied → SMTP Server → MVC Email
```

### Template Variables
Your email templates support these variables:
- `[[School Name]]` - Name of reported school
- `[[Location]]` - School location
- `[[ViolationDescription]]` - Violation details
- `[[PhoneNumber]]` - Contact number
- `[[AdditionalInfo]]` - Additional information

### Email Addresses
- **From**: treasurer@njdsc.org
- **To**: mvc.blsdrivingschools@mvc.nj.gov
- **Subject**: "Unlicensed driving school [School Name]"

## Troubleshooting

### Common Issues

1. **"Email functionality will be disabled"**
   - ✅ **Fixed**: SMTP environment variables now added
   - **Action**: Update SMTP_PASS with actual app password

2. **Authentication Failed**
   - Verify Gmail App Password is correct
   - Ensure 2FA is enabled on treasurer@njdsc.org
   - Check that you're using App Password, not regular password

3. **Connection Timeout**
   - Verify SMTP_HOST: smtp.gmail.com
   - Check SMTP_PORT: 587
   - Ensure SMTP_SECURE=false

4. **Template Not Found**
   - ✅ **Already Configured**: Templates in data/config.json
   - No action needed

### Verification Commands

```bash
# Check if environment variables are loaded
node -e "require('dotenv').config(); console.log('SMTP_USER:', process.env.SMTP_USER);"

# Test email service manually
node -e "
const emailService = require('./server/services/emailService');
emailService.sendTestEmail('test@example.com')
  .then(() => console.log('Email test successful'))
  .catch(err => console.error('Email test failed:', err.message));
"
```

## Security Notes

- **Never commit** real Gmail app passwords to version control
- **Use environment variables** for all sensitive credentials
- **Rotate app passwords** periodically (every 6 months)
- **Monitor email usage** for unusual activity

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test with a simple email first before full deployment
4. Ensure Gmail account has necessary permissions

---

**Configuration Status**: ✅ **Ready for Production**
**Next Step**: Update SMTP_PASS with actual Gmail App Password