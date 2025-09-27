const fs = require('fs');
const crypto = require('crypto');

try {
  console.log('Testing private key directly from JSON file...');

  const credentials = JSON.parse(fs.readFileSync('docs/unlicesnseddrivingschooldev-73e6b6075bfd.json', 'utf8'));
  const privateKey = credentials.private_key;

  console.log('Private key length:', privateKey.length);
  console.log('Private key format check:');
  console.log('Starts with BEGIN:', privateKey.startsWith('-----BEGIN PRIVATE KEY-----'));
  console.log('Ends with END:', privateKey.endsWith('-----END PRIVATE KEY-----\n'));
  console.log('Last 50 chars:', privateKey.substring(privateKey.length - 50));

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