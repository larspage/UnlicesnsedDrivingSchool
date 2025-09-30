require('dotenv').config();

const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const credentials = JSON.parse(SERVICE_ACCOUNT_KEY);

console.log('Original private key (first 100 chars):');
console.log(credentials.private_key.substring(0, 100));

console.log('\nChecking for \\n characters:');
console.log('Contains \\n:', credentials.private_key.includes('\\n'));

// Fix the private key by replacing \\n with actual newlines
const fixedPrivateKey = credentials.private_key.replace(/\\n/g, '\n');

console.log('\nFixed private key (first 100 chars):');
console.log(fixedPrivateKey.substring(0, 100));

// Create the fixed credentials object
const fixedCredentials = {
  ...credentials,
  private_key: fixedPrivateKey
};

console.log('\nFixed service account JSON:');
console.log(JSON.stringify(fixedCredentials, null, 2).substring(0, 500) + '...');