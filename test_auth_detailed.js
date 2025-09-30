require('dotenv').config();
const { google } = require('googleapis');

async function testAuth() {
  try {
    const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
    
    console.log('=== Service Account Details ===');
    console.log('Project ID:', credentials.project_id);
    console.log('Client Email:', credentials.client_email);
    console.log('Private Key ID:', credentials.private_key_id);
    console.log('Auth URI:', credentials.auth_uri);
    console.log('Token URI:', credentials.token_uri);
    
    console.log('\n=== Testing Authentication ===');
    
    // Test without subject (domain-wide delegation)
    console.log('Testing without subject...');
    const auth1 = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    try {
      const token1 = await auth1.getAccessToken();
      console.log('✅ Auth without subject successful');
      console.log('Token preview:', token1.substring(0, 20) + '...');
    } catch (error) {
      console.log('❌ Auth without subject failed:', error.message);
    }
    
    // Test with subject (domain-wide delegation)
    console.log('\nTesting with subject (domain-wide delegation)...');
    const auth2 = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      subject: process.env.GOOGLE_GMAIL_USER,
    });
    
    try {
      const token2 = await auth2.getAccessToken();
      console.log('✅ Auth with subject successful');
      console.log('Token preview:', token2.substring(0, 20) + '...');
    } catch (error) {
      console.log('❌ Auth with subject failed:', error.message);
    }
    
    // Test system time
    console.log('\n=== System Time Check ===');
    const now = new Date();
    console.log('Current system time:', now.toISOString());
    console.log('Unix timestamp:', Math.floor(now.getTime() / 1000));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuth();