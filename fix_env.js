const fs = require('fs');

// Read the JSON file
const credentials = JSON.parse(fs.readFileSync('docs/unlicesnseddrivingschooldev-73e6b6075bfd.json', 'utf8'));

// Convert to properly escaped JSON string for .env
const jsonString = JSON.stringify(credentials);

console.log('Properly escaped JSON string for .env:');
console.log(jsonString);

// Also show the private key part
console.log('\nPrivate key in escaped form:');
console.log(JSON.stringify(credentials.private_key));