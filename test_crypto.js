require('dotenv').config({ path: '.env.development' });
const crypto = require('crypto');

try {
  console.log('Testing private key with Node crypto...');

  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const privateKey = credentials.private_key;

  console.log('Private key length:', privateKey.length);
  console.log('Private key format check:');
  console.log('Starts with BEGIN:', privateKey.startsWith('-----BEGIN PRIVATE KEY-----'));
  console.log('Ends with END:', privateKey.endsWith('-----END PRIVATE KEY-----\n'));
  console.log('Last 50 chars:', privateKey.substring(privateKey.length - 50));
  console.log('Contains END marker:', privateKey.includes('-----END PRIVATE KEY-----'));

  // Try to create a signer
  const sign = crypto.createSign('RSA-SHA256');
  sign.update('test message');
  const signature = sign.sign(privateKey, 'base64');

  console.log('Crypto test successful! Signature created.');
  console.log('Signature length:', signature.length);

} catch (error) {
  console.error('Crypto test failed:', error.message);
  console.error('Error code:', error.code);
}