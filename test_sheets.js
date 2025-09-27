require('dotenv').config({ path: '.env.development' });

console.log('GOOGLE_SERVICE_ACCOUNT_KEY:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

try {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  console.log('JSON parsed successfully');
  console.log('Type:', key.type);
} catch (error) {
  console.error('JSON parse error:', error.message);
}

const { getAllRows } = require('./server/services/googleSheetsService');

async function testSheetsAccess() {
  try {
    console.log('Testing Google Sheets access...');
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const sheetName = 'Reports';

    console.log(`Spreadsheet ID: ${spreadsheetId}`);
    console.log(`Sheet Name: ${sheetName}`);

    const rows = await getAllRows(spreadsheetId, sheetName);
    console.log(`Successfully retrieved ${rows.length} rows from Google Sheets`);
    console.log('Sample data:', rows.slice(0, 2)); // Show first 2 rows

  } catch (error) {
    console.error('Error accessing Google Sheets:', error.message);
  }
}

testSheetsAccess();