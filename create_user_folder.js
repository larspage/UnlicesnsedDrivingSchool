/**
 * Create a folder in the user's Drive (not service account's Drive)
 * This folder will have storage quota and can store files
 */

require('dotenv').config();
const { google } = require('googleapis');

const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const OWNER_EMAIL = process.env.GOOGLE_GMAIL_USER; // larryf@mrbrooks.biz

console.log('=== Creating Folder in User Drive ===\n');

if (!SERVICE_ACCOUNT_KEY || !OWNER_EMAIL) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

let credentials;
try {
  credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
  console.log('✓ Service account:', credentials.client_email);
  console.log('✓ Target user:', OWNER_EMAIL);
  console.log();
} catch (error) {
  console.error('❌ Failed to parse credentials:', error.message);
  process.exit(1);
}

// Use domain-wide delegation to act as the user
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive'],
  subject: OWNER_EMAIL, // Act as this user
});

const drive = google.drive({ version: 'v3', auth });

async function createUserFolder() {
  try {
    console.log('Creating folder in user\'s Drive (with storage quota)...');
    
    const folderName = 'NJDSC_Reports';
    
    // Check if folder already exists
    const searchResponse = await drive.files.list({
      q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
    });

    let folderId;
    if (searchResponse.data.files.length > 0) {
      folderId = searchResponse.data.files[0].id;
      console.log('✓ Folder already exists');
      console.log(`  Folder ID: ${folderId}`);
      console.log(`  Folder Name: ${folderName}`);
    } else {
      // Create new folder in user's Drive
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };

      const response = await drive.files.create({
        resource: folderMetadata,
        fields: 'id,name,webViewLink',
      });

      folderId = response.data.id;
      console.log('✅ Folder created successfully!');
      console.log(`  Folder ID: ${folderId}`);
      console.log(`  Folder Name: ${response.data.name}`);
      console.log(`  View Link: ${response.data.webViewLink}`);
    }
    
    console.log();
    console.log('=== IMPORTANT ===');
    console.log('Update your .env file with this folder ID:');
    console.log(`GOOGLE_DRIVE_FOLDER_ID=${folderId}`);
    console.log();
    console.log('This folder is in YOUR Drive and has storage quota.');
    console.log('Files uploaded by the service account will be stored here.');
    console.log();
    console.log('View the folder at:');
    console.log(`https://drive.google.com/drive/folders/${folderId}`);
    
    return folderId;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.message.includes('delegation')) {
      console.error('\n⚠ Domain-wide delegation is not set up.');
      console.error('This is required for the service account to act as a user.');
      console.error('\nAlternative: Create the folder manually in your Drive and share it with the service account.');
    }
    
    throw error;
  }
}

createUserFolder()
  .then((folderId) => {
    console.log(`\n✓ Folder ready: ${folderId}`);
    process.exit(0);
  })
  .catch(() => {
    console.log('\n✗ Failed to create folder');
    process.exit(1);
  });