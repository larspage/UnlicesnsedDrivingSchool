require('dotenv').config({ path: '.env.development' });

const { writeHeaders, ensureSheetExists } = require('./server/services/googleSheetsService');
const { initializeDefaults } = require('./server/services/configService');

async function testConfigSetup() {
  try {
    console.log('Starting config sheet setup...');

    const configSpreadsheetId = process.env.GOOGLE_CONFIG_SPREADSHEET_ID;
    const configSheetName = 'Configuration';

    console.log(`Using config spreadsheet ID: ${configSpreadsheetId}`);
    console.log(`Using sheet name: ${configSheetName}`);

    // First, ensure the Configuration sheet exists and write headers
    console.log('Ensuring Configuration sheet exists...');
    await ensureSheetExists(configSpreadsheetId, configSheetName);

    console.log('Writing config headers...');
    const headers = ['key', 'value', 'type', 'category', 'description', 'updatedAt', 'updatedBy'];
    const range = `${configSheetName}!A1:G1`;

    // We'll need to use the sheets API directly for the config spreadsheet
    const { google } = require('googleapis');
    const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const credentials = JSON.parse(SERVICE_ACCOUNT_KEY);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: configSpreadsheetId,
      range,
      valueInputOption: 'RAW',
      resource: {
        values: [headers],
      },
    });

    console.log('Config headers written successfully:', response.data);

    // Now initialize default configurations
    console.log('Initializing default configurations...');
    await initializeDefaults({}, 'admin@njdsc.org');

    console.log('Config setup completed successfully!');

  } catch (error) {
    console.error('Error during config setup:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.response) {
      console.error('API response:', error.response.data);
    }
  }
}

// Run the test
testConfigSetup();