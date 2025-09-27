require('dotenv').config({ path: '.env.development' });

try {
  console.log('Testing JSON parsing of service account key...');

  const keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  console.log('Key string length:', keyString.length);
  console.log('Key string starts with:', keyString.substring(0, 50));
  console.log('Key string ends with:', keyString.substring(keyString.length - 50));

  const credentials = JSON.parse(keyString);
  console.log('JSON parsing successful!');
  console.log('Type:', credentials.type);
  console.log('Project ID:', credentials.project_id);
  console.log('Client email:', credentials.client_email);

  console.log('Private key length:', credentials.private_key.length);
  console.log('Private key starts with:', credentials.private_key.substring(0, 50));
  console.log('Private key contains newlines:', credentials.private_key.includes('\n'));

  // Check if private key has proper format
  const lines = credentials.private_key.split('\n');
  console.log('Private key lines:', lines.length);
  console.log('First line:', lines[0]);
  console.log('Last line:', lines[lines.length - 1]);

} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}