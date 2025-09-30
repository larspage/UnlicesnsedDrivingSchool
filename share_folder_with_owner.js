/**
 * Share the service account's folder with the actual Google account owner
 * This grants you access to view and manage the folders
 */

require('dotenv').config();
const { google } = require('googleapis');

const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const OWNER_EMAIL = process.env.GOOGLE_GMAIL_USER; // larryf@mrbrooks.biz

console.log('=== Sharing Folder with Owner ===\n');

if (!SERVICE_ACCOUNT_KEY || !FOLDER_ID || !OWNER_EMAIL) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

let credentials;
try {
  credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
  console.log('✓ Service account:', credentials.client_email);
  console.log('✓ Folder ID:', FOLDER_ID);
  console.log('✓ Sharing with:', OWNER_EMAIL);
  console.log();
} catch (error) {
  console.error('❌ Failed to parse credentials:', error.message);
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

async function shareFolderWithOwner() {
  try {
    console.log('Step 1: Verifying folder exists...');
    const folder = await drive.files.get({
      fileId: FOLDER_ID,
      fields: 'id,name,mimeType,owners',
    });
    
    console.log('✓ Folder found:');
    console.log(`  Name: ${folder.data.name}`);
    console.log(`  Type: ${folder.data.mimeType}`);
    console.log();

    console.log('Step 2: Granting access to your account...');
    const permission = {
      type: 'user',
      role: 'writer', // Can view, edit, and manage
      emailAddress: OWNER_EMAIL,
    };

    const response = await drive.permissions.create({
      fileId: FOLDER_ID,
      resource: permission,
      fields: 'id,emailAddress,role',
      sendNotificationEmail: true, // Send email notification
    });

    console.log('✅ SUCCESS! Folder shared with your account');
    console.log(`  Email: ${response.data.emailAddress}`);
    console.log(`  Role: ${response.data.role}`);
    console.log(`  Permission ID: ${response.data.id}`);
    console.log();

    console.log('=== Next Steps ===');
    console.log('1. Check your email for the sharing notification');
    console.log('2. Click the link in the email to access the folder');
    console.log('3. Or go directly to:');
    console.log(`   https://drive.google.com/drive/folders/${FOLDER_ID}`);
    console.log();
    console.log('You now have full access to view and manage all report folders!');

  } catch (error) {
    console.error('\n❌ Error sharing folder:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.code === 404) {
      console.error('\nThe folder does not exist or is not accessible.');
    } else if (error.code === 403) {
      console.error('\nPermission denied. The service account may not have permission to share.');
    }
    
    throw error;
  }
}

shareFolderWithOwner()
  .then(() => {
    console.log('\n✓ Sharing completed successfully');
    process.exit(0);
  })
  .catch(() => {
    console.log('\n✗ Sharing failed');
    process.exit(1);
  });