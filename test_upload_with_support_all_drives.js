/**
 * Test upload with supportsAllDrives parameter
 * This parameter is sometimes needed for service account operations
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const GMAIL_USER = process.env.GOOGLE_GMAIL_USER;

console.log('=== Testing Upload with supportsAllDrives ===\n');

let credentials;
try {
  credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
  
  if (credentials.private_key && credentials.private_key.includes('\\n')) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }
  
  console.log('✓ Configuration loaded');
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

async function testUpload() {
  try {
    const imagePath = path.join(__dirname, 'public', 'school1.jpg');
    const fileBuffer = fs.readFileSync(imagePath);
    
    console.log('Uploading with supportsAllDrives=true...');
    
    const { Readable } = require('stream');
    const stream = Readable.from(fileBuffer);
    
    const fileMetadata = {
      name: `test_support_${Date.now()}.jpg`,
      parents: [DRIVE_FOLDER_ID],
    };
    
    const media = {
      mimeType: 'image/jpeg',
      body: stream,
    };
    
    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id,name,size,webViewLink',
      supportsAllDrives: true, // Try with this parameter
    });
    
    console.log('✅ SUCCESS!');
    console.log(`  File ID: ${response.data.id}`);
    console.log(`  View: ${response.data.webViewLink}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Error code:', error.code);
    
    console.log('\n=== DIAGNOSIS ===');
    console.log('The service account cannot upload files even with domain-wide delegation.');
    console.log('\nThis means one of the following:');
    console.log('1. Domain-wide delegation is not fully configured in Google Workspace Admin');
    console.log('2. The Drive API scope is not authorized for delegation');
    console.log('3. Your Google Workspace doesn\'t support this feature');
    console.log('\n=== ALTERNATIVE SOLUTION ===');
    console.log('Since folder creation works but file upload doesn\'t, we need to:');
    console.log('1. Have users authenticate with OAuth (not service account)');
    console.log('2. OR use a Shared Drive (Google Workspace feature)');
    console.log('3. OR store files elsewhere (like AWS S3, Azure Blob) and just track metadata in Drive');
    
    throw error;
  }
}

testUpload()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));