require('dotenv').config();
const { google } = require('googleapis');

async function testPermissions() {
  try {
    const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
    
    console.log('=== Testing Different Scopes ===');
    
    // Test with minimal scope first
    const scopes = [
      ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      ['https://www.googleapis.com/auth/spreadsheets'],
      ['https://www.googleapis.com/auth/drive.readonly'],
      ['https://www.googleapis.com/auth/drive']
    ];
    
    for (const scope of scopes) {
      console.log(`\nTesting scope: ${scope[0]}`);
      
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: scope,
      });
      
      try {
        const token = await auth.getAccessToken();
        console.log('✅ Success with scope:', scope[0]);
        
        // Try to use the token to access Sheets API
        if (scope[0].includes('spreadsheets')) {
          const sheets = google.sheets({ version: 'v4', auth });
          try {
            const response = await sheets.spreadsheets.get({
              spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
            });
            console.log('✅ Successfully accessed spreadsheet:', response.data.properties.title);
          } catch (error) {
            console.log('❌ Failed to access spreadsheet:', error.message);
          }
        }
        
        break; // If we get here, authentication worked
      } catch (error) {
        console.log('❌ Failed with scope:', scope[0], '-', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPermissions();