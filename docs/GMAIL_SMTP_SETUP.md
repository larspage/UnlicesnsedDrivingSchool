# Gmail SMTP Setup Guide

## How to Get Your SMTP Password for Gmail

Since we're using Gmail SMTP with `lawrence.farrell@gmail.com`, you'll need to create an **App Password** (not your regular Gmail password).

### Step-by-Step Instructions:

## 1. Enable Two-Factor Authentication
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click **"Security"** in the left sidebar
3. If not already enabled, turn on **"2-Step Verification"**
4. Follow the setup process (you'll need a phone number)

## 2. Generate App Password
1. In **Security** settings, look for **"App passwords"**
2. Click **"App passwords"**
3. Select **"Mail"** and **"Other (custom name)"**
4. Enter name: "NJDSC Portal" or "Email SMTP"
5. Click **"Generate"**
6. **Copy the 16-character password** (e.g., "abcd efgh ijkl mnop")

⚠️ **Important**: This is your SMTP password - keep it secure!

## 3. Use the App Password
Your SMTP password is the 16-character code generated above. This replaces your regular Gmail password in the `SMTP_PASS` environment variable.

## Configuration Values
- **SMTP_HOST**: smtp.gmail.com
- **SMTP_PORT**: 587
- **SMTP_USER**: lawrence.farrell@gmail.com
- **SMTP_PASS**: [Your 16-character App Password]
- **SMTP_SECURE**: false

## Troubleshooting

### "Authentication Failed"
- ✅ Verify you're using the App Password (not regular password)
- ✅ Ensure 2FA is enabled on the Gmail account
- ✅ Check that SMTP_USER matches the Gmail account

### "Connection Refused"
- ✅ Verify SMTP_HOST: smtp.gmail.com
- ✅ Check SMTP_PORT: 587
- ✅ Ensure SMTP_SECURE: false

### "Invalid Login"
- ✅ Double-check the App Password is exactly as generated
- ✅ Ensure no extra spaces in the password

## Security Notes
- **Never share** your App Password
- **Never commit** it to version control
- **Use environment variables** for production
- **Rotate passwords** periodically (every 6 months)

## Alternative: Using Your Regular Gmail Password
If you prefer to use your regular Gmail password instead of an App Password:

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. **Security** → **"Less secure app access"**
3. Turn on **"Allow less secure apps"**
4. Use your regular Gmail password as `SMTP_PASS`

⚠️ **Warning**: Less secure app access is being phased out by Google and may stop working. App passwords are the recommended method.

---

**Quick Summary**: Enable 2FA → Generate App Password → Use 16-character code as SMTP_PASS