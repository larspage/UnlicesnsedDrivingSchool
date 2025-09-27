require('dotenv').config({ path: '.env.development' });

const { writeHeaders } = require('./server/services/googleSheetsService');

async function testWriteHeaders() {
  try {
    console.log('Starting test to write column headers to Google Sheets...');

    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = 'Reports';

    console.log(`Using spreadsheet ID: ${spreadsheetId}`);
    console.log(`Using sheet name: ${sheetName}`);

    const result = await writeHeaders(spreadsheetId, sheetName);

    console.log('Success! Headers written to sheet.');
    console.log('Response:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error occurred while writing headers:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Log additional error details if available
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.response) {
      console.error('API response:', error.response.data);
    }
  }
}

// Run the test
testWriteHeaders();