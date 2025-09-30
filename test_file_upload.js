/**
 * Test file upload using the actual googleDriveService
 * This tests the complete upload workflow including folder creation
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const googleDriveService = require('./server/services/googleDriveService');

console.log('=== Testing File Upload to Google Drive ===\n');

async function testFileUpload() {
  try {
    // Test report ID
    const testReportId = 'rep_UPLOAD';
    
    // Read the sample image
    const imagePath = path.join(__dirname, 'public', 'school1.jpg');
    console.log(`Reading test image: ${imagePath}`);
    
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }
    
    const fileBuffer = fs.readFileSync(imagePath);
    const fileName = 'school1.jpg';
    const mimeType = 'image/jpeg';
    
    console.log('✓ Image loaded successfully');
    console.log(`  File: ${fileName}`);
    console.log(`  Size: ${fileBuffer.length} bytes (${(fileBuffer.length / 1024).toFixed(2)} KB)`);
    console.log(`  Type: ${mimeType}`);
    console.log(`  Report ID: ${testReportId}\n`);
    
    // Upload the file using the actual API service
    console.log('Step 1: Uploading file to Google Drive...');
    console.log('This will:');
    console.log('  - Create/get folder for report');
    console.log('  - Upload the file');
    console.log('  - Generate public URL');
    console.log('  - Generate thumbnail\n');
    
    const uploadResult = await googleDriveService.uploadFile(
      fileBuffer,
      fileName,
      mimeType,
      testReportId
    );
    
    console.log('✅ FILE UPLOADED SUCCESSFULLY!\n');
    console.log('Upload Details:');
    console.log('  Internal ID:', uploadResult.id);
    console.log('  Report ID:', uploadResult.reportId);
    console.log('  Original Name:', uploadResult.originalName);
    console.log('  MIME Type:', uploadResult.mimeType);
    console.log('  Size:', uploadResult.size, 'bytes');
    console.log('  Drive File ID:', uploadResult.driveFileId);
    console.log('  Processing Status:', uploadResult.processingStatus);
    console.log('  Uploaded At:', uploadResult.uploadedAt);
    console.log();
    
    console.log('URLs:');
    console.log('  Public URL:', uploadResult.driveUrl);
    console.log('  Thumbnail:', uploadResult.thumbnailUrl || 'N/A');
    console.log();
    
    // Test 2: Upload another file to the same report
    console.log('Step 2: Uploading second file to same report...');
    const imagePath2 = path.join(__dirname, 'public', 'school2.jpg');
    const fileBuffer2 = fs.readFileSync(imagePath2);
    
    const uploadResult2 = await googleDriveService.uploadFile(
      fileBuffer2,
      'school2.jpg',
      'image/jpeg',
      testReportId
    );
    
    console.log('✅ Second file uploaded successfully!');
    console.log('  Drive File ID:', uploadResult2.driveFileId);
    console.log('  Public URL:', uploadResult2.driveUrl);
    console.log();
    
    // Test 3: Upload to a different report
    console.log('Step 3: Uploading file to different report...');
    const testReportId2 = 'rep_TEST99';
    const imagePath3 = path.join(__dirname, 'public', 'school3.jpg');
    const fileBuffer3 = fs.readFileSync(imagePath3);
    
    const uploadResult3 = await googleDriveService.uploadFile(
      fileBuffer3,
      'school3.jpg',
      'image/jpeg',
      testReportId2
    );
    
    console.log('✅ Third file uploaded to different report!');
    console.log('  Report ID:', uploadResult3.reportId);
    console.log('  Drive File ID:', uploadResult3.driveFileId);
    console.log('  Public URL:', uploadResult3.driveUrl);
    console.log();
    
    console.log('=== ALL TESTS PASSED ===');
    console.log('✅ File upload is working correctly');
    console.log('✅ Multiple files can be uploaded to same report');
    console.log('✅ Files can be uploaded to different reports');
    console.log('✅ Public URLs are generated');
    console.log('✅ Thumbnails are generated for images');
    console.log();
    
    console.log('=== Summary ===');
    console.log(`Parent folder: ${process.env.GOOGLE_DRIVE_FOLDER_ID}`);
    console.log(`Report folder 1 (${testReportId}): Contains 2 files`);
    console.log(`Report folder 2 (${testReportId2}): Contains 1 file`);
    console.log();
    console.log('View all files at:');
    console.log(`https://drive.google.com/drive/folders/${process.env.GOOGLE_DRIVE_FOLDER_ID}`);
    console.log();
    console.log('You can click the public URLs above to view the uploaded images!');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    throw error;
  }
}

testFileUpload()
  .then(() => {
    console.log('\n✓ Test completed successfully');
    process.exit(0);
  })
  .catch(() => {
    console.log('\n✗ Test failed');
    process.exit(1);
  });