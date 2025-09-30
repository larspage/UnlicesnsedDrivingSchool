/**
 * Test script to verify Google Drive folder creation
 * This will create a test subfolder in the configured Drive folder
 */

require('dotenv').config(); // Load from .env (default)
const { google } = require('googleapis');

// Get configuration from environment
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

console.log('=== Google Drive Folder Creation Test ===\n');

// Validate environment variables
if (!SERVICE_ACCOUNT_KEY) {
  console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY not found in .env.development');
  process.exit(1);
}

if (!DRIVE_FOLDER_ID) {
  console.error('❌ GOOGLE_DRIVE_FOLDER_ID not found in .env.development');
  process.exit(1);
}

console.log('✓ Environment variables loaded');
console.log(`✓ Parent folder ID: ${DRIVE_FOLDER_ID}\n`);

// Parse service account credentials
let credentials;
try {
  credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
  
  console.log('Checking private key format...');
  console.log('Private key starts with:', credentials.private_key.substring(0, 50));
  console.log('Contains literal \\n:', credentials.private_key.includes('\\n'));
  console.log('Contains actual newlines:', credentials.private_key.includes('\n'));
  
  // Fix the private key by replacing literal \n with actual newlines
  if (credentials.private_key && credentials.private_key.includes('\\n')) {
    console.log('⚠ Fixing private key formatting (replacing \\n with newlines)');
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    console.log('After fix, starts with:', credentials.private_key.substring(0, 50));
  }
  
  console.log('✓ Service account credentials parsed');
  console.log(`✓ Service account email: ${credentials.client_email}\n`);
} catch (error) {
  console.error('❌ Failed to parse service account credentials:', error.message);
  process.exit(1);
}

// Initialize Google Drive API
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

async function testFolderCreation() {
  try {
    // Generate a unique test folder name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const testFolderName = `test_folder_${timestamp}`;

    console.log(`Creating test folder: "${testFolderName}"`);
    console.log(`Parent folder ID: ${DRIVE_FOLDER_ID}\n`);

    // Step 1: Verify parent folder exists and we have access
    console.log('Step 1: Verifying parent folder access...');
    try {
      const parentFolder = await drive.files.get({
        fileId: DRIVE_FOLDER_ID,
        fields: 'id,name,mimeType,capabilities'
      });
      
      console.log('✓ Parent folder found:');
      console.log(`  - Name: ${parentFolder.data.name}`);
      console.log(`  - ID: ${parentFolder.data.id}`);
      console.log(`  - Type: ${parentFolder.data.mimeType}`);
      
      if (parentFolder.data.capabilities) {
        console.log(`  - Can create: ${parentFolder.data.capabilities.canAddChildren || 'unknown'}`);
      }
      console.log();
    } catch (error) {
      console.error('❌ Cannot access parent folder:', error.message);
      if (error.code === 404) {
        console.error('   The folder ID does not exist or is not accessible');
      } else if (error.code === 403) {
        console.error('   Permission denied. The service account may not have access to this folder');
      }
      throw error;
    }

    // Step 2: Check if test folder already exists
    console.log('Step 2: Checking for existing test folders...');
    const searchQuery = `'${DRIVE_FOLDER_ID}' in parents and name = '${testFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    
    const searchResponse = await drive.files.list({
      q: searchQuery,
      fields: 'files(id, name)',
    });

    if (searchResponse.data.files.length > 0) {
      console.log(`✓ Found existing folder with same name (ID: ${searchResponse.data.files[0].id})`);
      console.log('  Using existing folder for test\n');
      return searchResponse.data.files[0].id;
    } else {
      console.log('✓ No existing folder found, will create new one\n');
    }

    // Step 3: Create the folder
    console.log('Step 3: Creating new folder...');
    const folderMetadata = {
      name: testFolderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [DRIVE_FOLDER_ID],
    };

    const createResponse = await drive.files.create({
      resource: folderMetadata,
      fields: 'id,name,webViewLink,parents',
    });

    const newFolder = createResponse.data;
    console.log('✓ Folder created successfully!');
    console.log(`  - Folder ID: ${newFolder.id}`);
    console.log(`  - Folder Name: ${newFolder.name}`);
    console.log(`  - Parent: ${newFolder.parents ? newFolder.parents[0] : 'unknown'}`);
    console.log(`  - View Link: ${newFolder.webViewLink || 'N/A'}`);
    console.log();

    // Step 4: Verify the folder was created
    console.log('Step 4: Verifying folder creation...');
    const verifyResponse = await drive.files.get({
      fileId: newFolder.id,
      fields: 'id,name,mimeType,parents,createdTime',
    });

    console.log('✓ Folder verified:');
    console.log(`  - ID: ${verifyResponse.data.id}`);
    console.log(`  - Name: ${verifyResponse.data.name}`);
    console.log(`  - Type: ${verifyResponse.data.mimeType}`);
    console.log(`  - Created: ${verifyResponse.data.createdTime}`);
    console.log();

    console.log('=== TEST SUCCESSFUL ===');
    console.log('✓ Folder creation is working correctly');
    console.log(`✓ New folder ID: ${newFolder.id}`);
    console.log('\nYou can view the folder at:');
    console.log(newFolder.webViewLink || `https://drive.google.com/drive/folders/${newFolder.id}`);
    
    return newFolder.id;

  } catch (error) {
    console.error('\n=== TEST FAILED ===');
    console.error('❌ Error:', error.message);
    
    if (error.code) {
      console.error(`❌ Error code: ${error.code}`);
    }
    
    if (error.errors && error.errors.length > 0) {
      console.error('❌ Details:', error.errors[0].message);
    }
    
    console.error('\nPossible causes:');
    console.error('1. Service account does not have write access to the parent folder');
    console.error('2. Parent folder ID is incorrect');
    console.error('3. Service account credentials are invalid');
    console.error('4. API is not enabled for the project');
    
    throw error;
  }
}

// Run the test
testFolderCreation()
  .then(() => {
    console.log('\n✓ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed');
    process.exit(1);
  });