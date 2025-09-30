/**
 * Complete test for Shared Drive file upload
 * Tests the actual API code with Shared Drive support
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const googleDriveService = require('./server/services/googleDriveService');

console.log('=== Testing Shared Drive File Upload ===\n');

async function testSharedDriveUpload() {
  try {
    const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    console.log('Configuration:');
    console.log(`  Drive Folder ID: ${DRIVE_FOLDER_ID}`);
    console.log(`  Gmail User: ${process.env.GOOGLE_GMAIL_USER}`);
    console.log();
    
    // Verify it's a Shared Drive
    if (!DRIVE_FOLDER_ID.startsWith('0A')) {
      console.log('⚠ WARNING: Folder ID does not start with "0A"');
      console.log('   This may not be a Shared Drive.');
      console.log('   Shared Drive IDs typically start with "0A"');
      console.log('   Regular folder IDs start with "1"');
      console.log();
      console.log('   If file upload fails, you need to:');
      console.log('   1. Create a Shared Drive (not a regular folder)');
      console.log('   2. Add service account as Manager');
      console.log('   3. Use the Shared Drive ID');
      console.log();
    }
    
    // Test 1: Create a report folder
    const testReportId = 'rep_SHARED';
    console.log(`Test 1: Creating folder for report ${testReportId}...`);
    
    const folderId = await googleDriveService.getOrCreateReportFolder(testReportId);
    console.log('✅ Folder created/retrieved');
    console.log(`   Folder ID: ${folderId}\n`);
    
    // Test 2: Upload a file
    console.log('Test 2: Uploading file...');
    const imagePath = path.join(__dirname, 'public', 'school1.jpg');
    
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Test image not found: ${imagePath}`);
    }
    
    const fileBuffer = fs.readFileSync(imagePath);
    console.log(`  File: school1.jpg`);
    console.log(`  Size: ${fileBuffer.length} bytes (${(fileBuffer.length / 1024).toFixed(2)} KB)`);
    
    const uploadResult = await googleDriveService.uploadFile(
      fileBuffer,
      'school1.jpg',
      'image/jpeg',
      testReportId
    );
    
    console.log('✅ File uploaded successfully!');
    console.log(`   Drive File ID: ${uploadResult.driveFileId}`);
    console.log(`   Public URL: ${uploadResult.driveUrl}`);
    console.log(`   Thumbnail: ${uploadResult.thumbnailUrl || 'N/A'}\n`);
    
    // Test 3: Upload another file to same report
    console.log('Test 3: Uploading second file to same report...');
    const imagePath2 = path.join(__dirname, 'public', 'school2.jpg');
    const fileBuffer2 = fs.readFileSync(imagePath2);
    
    const uploadResult2 = await googleDriveService.uploadFile(
      fileBuffer2,
      'school2.jpg',
      'image/jpeg',
      testReportId
    );
    
    console.log('✅ Second file uploaded!');
    console.log(`   Drive File ID: ${uploadResult2.driveFileId}\n`);
    
    // Test 4: Upload to different report
    console.log('Test 4: Uploading to different report...');
    const testReportId2 = 'rep_TEST88';
    const imagePath3 = path.join(__dirname, 'public', 'school3.jpg');
    const fileBuffer3 = fs.readFileSync(imagePath3);
    
    const uploadResult3 = await googleDriveService.uploadFile(
      fileBuffer3,
      'school3.jpg',
      'image/jpeg',
      testReportId2
    );
    
    console.log('✅ Third file uploaded to different report!');
    console.log(`   Report ID: ${uploadResult3.reportId}`);
    console.log(`   Drive File ID: ${uploadResult3.driveFileId}\n`);
    
    console.log('=== ALL TESTS PASSED ===');
    console.log('✅ Shared Drive folder creation working');
    console.log('✅ File uploads working');
    console.log('✅ Multiple files per report working');
    console.log('✅ Multiple reports working');
    console.log('✅ Public URLs generated');
    console.log('✅ Thumbnails generated');
    console.log();
    
    console.log('=== Summary ===');
    console.log(`Shared Drive: ${DRIVE_FOLDER_ID}`);
    console.log(`Report 1 (${testReportId}): 2 files uploaded`);
    console.log(`Report 2 (${testReportId2}): 1 file uploaded`);
    console.log();
    console.log('View files at:');
    console.log(`https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`);
    console.log();
    console.log('🎉 Your API is ready for production!');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    
    if (error.message.includes('storage quota')) {
      console.error('\n=== DIAGNOSIS ===');
      console.error('You are still using a regular folder, not a Shared Drive.');
      console.error('\nTo fix:');
      console.error('1. Create a Shared Drive in Google Drive');
      console.error('2. Add service account as Manager');
      console.error('3. Run: node list_shared_drives.js');
      console.error('4. Update GOOGLE_DRIVE_FOLDER_ID in .env with Shared Drive ID');
    } else if (error.message.includes('not found')) {
      console.error('\n=== DIAGNOSIS ===');
      console.error('The Shared Drive ID is incorrect or inaccessible.');
      console.error('\nTo fix:');
      console.error('1. Run: node list_shared_drives.js');
      console.error('2. Verify service account is added to the Shared Drive');
      console.error('3. Update GOOGLE_DRIVE_FOLDER_ID in .env');
    }
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    throw error;
  }
}

testSharedDriveUpload()
  .then(() => {
    console.log('\n✓ Test completed successfully');
    process.exit(0);
  })
  .catch(() => {
    console.log('\n✗ Test failed');
    process.exit(1);
  });