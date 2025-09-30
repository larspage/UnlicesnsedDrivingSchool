require('dotenv').config();
const { google } = require('googleapis');

async function testGoogleAPIs() {
  try {
    const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
    
    console.log('=== Testing Google API Access ===\n');
    
    // Test 1: Basic service account authentication (no domain-wide delegation)
    console.log('Test 1: Basic service account authentication...');
    try {
      const auth1 = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      
      const authClient1 = await auth1.getClient();
      const token1 = await authClient1.getAccessToken();
      console.log('✅ Basic auth successful');
      console.log('   Token type:', typeof token1.token);
      console.log('   Token preview:', token1.token ? token1.token.substring(0, 20) + '...' : 'null');
      
      // Try to access Sheets API
      const sheets = google.sheets({ version: 'v4', auth: authClient1 });
      console.log('   Sheets API client created successfully');
      
    } catch (error) {
      console.log('❌ Basic auth failed:', error.message);
      console.log('   Error code:', error.code);
      console.log('   Error details:', error.details || 'none');
    }
    
    // Test 2: Check if APIs are enabled by trying to access a public spreadsheet
    console.log('\nTest 2: Testing Sheets API with public spreadsheet...');
    try {
      const auth2 = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      
      const sheets = google.sheets({ version: 'v4', auth: auth2 });
      
      // Try to access a public Google Sheets document
      const publicSpreadsheetId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'; // Google's sample sheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: publicSpreadsheetId,
        range: 'Class Data!A1:B2',
      });
      
      console.log('✅ Public spreadsheet access successful');
      console.log('   Data retrieved:', response.data.values ? response.data.values.length + ' rows' : 'no data');
      
    } catch (error) {
      console.log('❌ Public spreadsheet access failed:', error.message);
      console.log('   Error code:', error.code);
      
      if (error.message.includes('API has not been used')) {
        console.log('   🔍 This suggests the Sheets API is not enabled for your project');
      }
    }
    
    // Test 3: Check project and API status
    console.log('\nTest 3: Project information...');
    console.log('   Project ID:', credentials.project_id);
    console.log('   Service Account:', credentials.client_email);
    console.log('   Key ID:', credentials.private_key_id);
    
    // Test 4: Try with your actual spreadsheet
    console.log('\nTest 4: Testing with your actual spreadsheet...');
    try {
      const auth4 = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      
      const sheets = google.sheets({ version: 'v4', auth: auth4 });
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
      
      console.log('   Attempting to access spreadsheet:', spreadsheetId);
      
      const response = await sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
      });
      
      console.log('✅ Your spreadsheet access successful');
      console.log('   Spreadsheet title:', response.data.properties.title);
      console.log('   Sheet count:', response.data.sheets.length);
      
    } catch (error) {
      console.log('❌ Your spreadsheet access failed:', error.message);
      console.log('   Error code:', error.code);
      
      if (error.message.includes('does not have permission')) {
        console.log('   🔍 Service account needs to be granted access to this spreadsheet');
      }
    }
    
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
  }
}

testGoogleAPIs();