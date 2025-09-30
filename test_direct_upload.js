/**
 * Test uploading directly to the user's folder (no subfolder)
 * This will help us understand if the issue is with subfolders or the upload itself
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const GMAIL_USER = process.env.GOOGLE_GMAIL_USER;

console.log('=== Testing Direct Upload to User Folder ===\n');

let credentials;
try {
  credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
  
  // Fix private key formatting if needed
  if (credentials.private_key && credentials.private_key.includes('\\n')) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }
  
  console.log('✓ Service account:', credentials.client_email);
  console.log('✓ Acting as user:', GMAIL_USER);
  console.log('✓ Target folder:', DRIVE_FOLDER_ID);
  console.log();
} catch (error) {
  console.error('❌ Failed to parse credentials:', error.message);
  process.exit(1);
}

// Use domain-wide delegation
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive'],
  subject: GMAIL_USER,
});

const drive = google.drive({ version: 'v3', auth });

async function testDirectUpload() {
  try {
    // Read test image
    const imagePath = path.join(__dirname, 'public', 'school1.jpg');
    const fileBuffer = fs.readFileSync(imagePath);
    
    console.log('File loaded:');
    console.log(`  Path: ${imagePath}`);
    console.log(`  Size: ${fileBuffer.length} bytes\n`);
    
    // Upload directly to the user's folder (no subfolder)
    console.log('Uploading file directly to user folder...');
    
    const { Readable } = require('stream');
    const stream = Readable.from(fileBuffer);
    
    const fileMetadata = {
      name: `test_direct_${Date.now()}.jpg`,
      parents: [DRIVE_FOLDER_ID], // Upload to user's folder
    };
    
    const media = {
      mimeType: 'image/jpeg',
      body: stream,
    };
    
    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id,name,size,webViewLink,parents',
    });
    
    console.log('✅ SUCCESS! File uploaded directly to user folder');
    console.log(`  File ID: ${response.data.id}`);
    console.log(`  File Name: ${response.data.name}`);
    console.log(`  Size: ${response.data.size} bytes`);
    console.log(`  Parent: ${response.data.parents[0]}`);
    console.log(`  View: ${response.data.webViewLink}`);
    console.log();
    
    console.log('This proves:');
    console.log('✓ Domain-wide delegation is working');
    console.log('✓ Service account can upload to user\'s Drive');
    console.log('✓ User\'s Drive has storage quota');
    console.log();
    console.log('The issue must be with how subfolders are created.');
    console.log('Subfolders need to be created in the user\'s context, not the service account\'s.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    throw error;
  }
}

testDirectUpload()
  .then(() => {
    console.log('\n✓ Test completed');
    process.exit(0);
  })
  .catch(() => {
    console.log('\n✗ Test failed');
    process.exit(1);
  });