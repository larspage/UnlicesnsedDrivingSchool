require('dotenv').config();
const { google } = require('googleapis');

// Test the service account key
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

console.log('Testing service account key...');
console.log('Key length:', SERVICE_ACCOUNT_KEY ? SERVICE_ACCOUNT_KEY.length : 'undefined');

try {
  const credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
  console.log('✅ JSON parsing successful');
  console.log('Project ID:', credentials.project_id);
  console.log('Client Email:', credentials.client_email);
  console.log('Private Key ID:', credentials.private_key_id);
  console.log('Private Key starts with:', credentials.private_key.substring(0, 50) + '...');
  
  // Test Google Auth initialization
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  
  console.log('✅ Google Auth initialization successful');
  
  // Test getting access token
  auth.getAccessToken().then(token => {
    console.log('✅ Access token obtained successfully');
    console.log('Token starts with:', token.substring(0, 20) + '...');
  }).catch(error => {
    console.error('❌ Failed to get access token:', error.message);
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
}