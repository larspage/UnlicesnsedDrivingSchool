/**
 * List all Shared Drives accessible to the service account
 * Use this to find your Shared Drive ID
 */

require('dotenv').config();
const { google } = require('googleapis');

const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const GMAIL_USER = process.env.GOOGLE_GMAIL_USER;

console.log('=== Listing Shared Drives ===\n');

if (!SERVICE_ACCOUNT_KEY) {
  console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY not found in .env');
  process.exit(1);
}

let credentials;
try {
  credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
  
  if (credentials.private_key && credentials.private_key.includes('\\n')) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }
  
  console.log('✓ Service account:', credentials.client_email);
  if (GMAIL_USER) {
    console.log('✓ Acting as user:', GMAIL_USER);
  }
  console.log();
} catch (error) {
  console.error('❌ Failed to parse credentials:', error.message);
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive'],
  subject: GMAIL_USER,
});

const drive = google.drive({ version: 'v3', auth });

async function listSharedDrives() {
  try {
    console.log('Fetching Shared Drives...\n');
    
    const response = await drive.drives.list({
      fields: 'drives(id, name, createdTime)',
    });
    
    if (!response.data.drives || response.data.drives.length === 0) {
      console.log('❌ No Shared Drives found');
      console.log('\nPossible reasons:');
      console.log('1. No Shared Drives have been created yet');
      console.log('2. Service account has not been added to any Shared Drives');
      console.log('3. You need Google Workspace (not free Gmail)');
      console.log('\nTo create a Shared Drive:');
      console.log('1. Go to https://drive.google.com');
      console.log('2. Click "Shared drives" in left sidebar');
      console.log('3. Click "+ New" to create one');
      console.log('4. Add service account as Manager');
      return;
    }
    
    console.log(`✅ Found ${response.data.drives.length} Shared Drive(s):\n`);
    
    response.data.drives.forEach((drive, index) => {
      console.log(`${index + 1}. ${drive.name}`);
      console.log(`   ID: ${drive.id}`);
      console.log(`   Created: ${drive.createdTime}`);
      console.log(`   URL: https://drive.google.com/drive/folders/${drive.id}`);
      console.log();
    });
    
    console.log('=== How to Use ===');
    console.log('1. Choose a Shared Drive from the list above');
    console.log('2. Copy its ID');
    console.log('3. Update your .env file:');
    console.log('   GOOGLE_DRIVE_FOLDER_ID=<paste-id-here>');
    console.log();
    console.log('4. Verify the service account is a member:');
    console.log('   - Open the Shared Drive in Google Drive');
    console.log('   - Click "Manage members"');
    console.log(`   - Ensure ${credentials.client_email} is listed`);
    console.log('   - Role should be "Content Manager" or "Manager"');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.code === 403) {
      console.error('\nPermission denied. Possible causes:');
      console.error('1. Drive API not enabled in Google Cloud Console');
      console.error('2. Service account lacks necessary permissions');
      console.error('3. Domain-wide delegation not configured');
    }
    
    throw error;
  }
}

listSharedDrives()
  .then(() => {
    console.log('\n✓ Done');
    process.exit(0);
  })
  .catch(() => {
    console.log('\n✗ Failed');
    process.exit(1);
  });