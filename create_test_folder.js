/**
 * Simple test to create a folder in the service account's own Drive
 * This will create a folder that the service account automatically has access to
 */

require('dotenv').config();
const { google } = require('googleapis');

const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

console.log('=== Creating Test Folder in Service Account Drive ===\n');

if (!SERVICE_ACCOUNT_KEY) {
  console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY not found');
  process.exit(1);
}

let credentials;
try {
  credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
  console.log('✓ Service account:', credentials.client_email);
} catch (error) {
  console.error('❌ Failed to parse credentials:', error.message);
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

async function createTestFolder() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderName = `NJDSC_Reports_${timestamp}`;

    console.log(`\nCreating folder: "${folderName}"`);
    console.log('Location: Service account\'s Drive (no parent folder)\n');

    // Create folder without specifying a parent (will be in service account's root)
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    const response = await drive.files.create({
      resource: folderMetadata,
      fields: 'id,name,webViewLink',
    });

    const folder = response.data;
    
    console.log('✅ SUCCESS! Folder created:');
    console.log(`   Folder ID: ${folder.id}`);
    console.log(`   Folder Name: ${folder.name}`);
    console.log(`   View Link: ${folder.webViewLink || 'N/A'}`);
    
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Update your .env file with this folder ID:');
    console.log(`   GOOGLE_DRIVE_FOLDER_ID=${folder.id}`);
    console.log('\n2. To access this folder from your Google account:');
    console.log('   a. Go to Google Drive: https://drive.google.com');
    console.log('   b. Click "Shared with me" in the left sidebar');
    console.log('   c. You should see the folder there (if shared)');
    console.log('\n3. OR share the folder with your account:');
    console.log('   - The service account owns this folder');
    console.log('   - You can share it with yourself using the Drive API or manually');
    
    // Now let's create a test subfolder to verify it works
    console.log('\n=== Creating Test Subfolder ===');
    const subfolderName = 'test_report_rep_ABC123';
    
    const subfolderMetadata = {
      name: subfolderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [folder.id],
    };

    const subfolderResponse = await drive.files.create({
      resource: subfolderMetadata,
      fields: 'id,name,parents',
    });

    console.log('✅ Subfolder created successfully!');
    console.log(`   Subfolder ID: ${subfolderResponse.data.id}`);
    console.log(`   Subfolder Name: ${subfolderResponse.data.name}`);
    console.log(`   Parent: ${subfolderResponse.data.parents[0]}`);
    
    console.log('\n✅ FOLDER CREATION IS WORKING!');
    console.log('The issue with your API is likely:');
    console.log('1. Using an incorrect/inaccessible folder ID');
    console.log('2. Service account not having access to the specified folder');
    
    return folder.id;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    throw error;
  }
}

createTestFolder()
  .then((folderId) => {
    console.log(`\n✓ Use this folder ID: ${folderId}`);
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });