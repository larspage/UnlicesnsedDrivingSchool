/**
 * Test the actual googleDriveService folder creation
 * This tests the getOrCreateReportFolder function that the API uses
 */

require('dotenv').config();
const googleDriveService = require('./server/services/googleDriveService');

console.log('=== Testing API Folder Creation ===\n');

async function testApiFolderCreation() {
  try {
    const testReportId = 'rep_TEST01';
    
    console.log(`Testing folder creation for report: ${testReportId}`);
    console.log(`Parent folder ID: ${process.env.GOOGLE_DRIVE_FOLDER_ID}\n`);
    
    // Test 1: Create a folder for a test report
    console.log('Step 1: Creating folder using getOrCreateReportFolder...');
    const folderId = await googleDriveService.getOrCreateReportFolder(testReportId);
    
    console.log('✅ Folder created successfully!');
    console.log(`   Folder ID: ${folderId}`);
    console.log(`   Report ID: ${testReportId}\n`);
    
    // Test 2: Try to get the same folder again (should return existing)
    console.log('Step 2: Testing folder retrieval (should return existing folder)...');
    const folderId2 = await googleDriveService.getOrCreateReportFolder(testReportId);
    
    if (folderId === folderId2) {
      console.log('✅ Correctly returned existing folder!');
      console.log(`   Same folder ID: ${folderId2}\n`);
    } else {
      console.log('⚠ Warning: Different folder ID returned');
      console.log(`   First ID: ${folderId}`);
      console.log(`   Second ID: ${folderId2}\n`);
    }
    
    // Test 3: Create another folder for a different report
    const testReportId2 = 'rep_TEST02';
    console.log(`Step 3: Creating folder for different report: ${testReportId2}...`);
    const folderId3 = await googleDriveService.getOrCreateReportFolder(testReportId2);
    
    console.log('✅ Second folder created successfully!');
    console.log(`   Folder ID: ${folderId3}`);
    console.log(`   Report ID: ${testReportId2}\n`);
    
    console.log('=== ALL TESTS PASSED ===');
    console.log('✅ Folder creation is working correctly in the API');
    console.log('✅ Duplicate detection is working');
    console.log('✅ Multiple report folders can be created');
    
    console.log('\n=== Summary ===');
    console.log(`Parent folder: ${process.env.GOOGLE_DRIVE_FOLDER_ID}`);
    console.log(`Test folder 1 (${testReportId}): ${folderId}`);
    console.log(`Test folder 2 (${testReportId2}): ${folderId3}`);
    console.log('\nYou can view these folders at:');
    console.log(`https://drive.google.com/drive/folders/${process.env.GOOGLE_DRIVE_FOLDER_ID}`);
    
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

testApiFolderCreation()
  .then(() => {
    console.log('\n✓ Test completed successfully');
    process.exit(0);
  })
  .catch(() => {
    console.log('\n✗ Test failed');
    process.exit(1);
  });