require('dotenv').config();
const crypto = require('crypto');

function analyzeServiceAccountKey() {
  try {
    const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const credentials = JSON.parse(SERVICE_ACCOUNT_KEY);
    
    console.log('=== Service Account Key Analysis ===\n');
    
    // Check required fields
    const requiredFields = [
      'type', 'project_id', 'private_key_id', 'private_key', 
      'client_email', 'client_id', 'auth_uri', 'token_uri'
    ];
    
    console.log('Required fields check:');
    requiredFields.forEach(field => {
      const exists = credentials.hasOwnProperty(field);
      const value = credentials[field];
      console.log(`  ${field}: ${exists ? '✅' : '❌'} ${exists ? (value ? '(has value)' : '(empty)') : '(missing)'}`);
    });
    
    // Analyze private key
    console.log('\n=== Private Key Analysis ===');
    const privateKey = credentials.private_key;
    
    if (privateKey) {
      console.log('Private key length:', privateKey.length);
      console.log('Starts with:', privateKey.substring(0, 30) + '...');
      console.log('Ends with:', '...' + privateKey.substring(privateKey.length - 30));
      console.log('Contains BEGIN PRIVATE KEY:', privateKey.includes('-----BEGIN PRIVATE KEY-----'));
      console.log('Contains END PRIVATE KEY:', privateKey.includes('-----END PRIVATE KEY-----'));
      
      // Check for common formatting issues
      const hasProperLineBreaks = privateKey.includes('\n');
      const hasEscapedLineBreaks = privateKey.includes('\\n');
      
      console.log('Has actual line breaks (\\n):', hasProperLineBreaks);
      console.log('Has escaped line breaks (\\\\n):', hasEscapedLineBreaks);
      
      // Try to create a crypto key object to validate the private key
      try {
        const keyObject = crypto.createPrivateKey({
          key: privateKey,
          format: 'pem'
        });
        console.log('✅ Private key is valid PEM format');
        console.log('Key type:', keyObject.asymmetricKeyType);
        console.log('Key size:', keyObject.asymmetricKeySize);
      } catch (keyError) {
        console.log('❌ Private key validation failed:', keyError.message);
      }
    }
    
    // Check email format
    console.log('\n=== Email Validation ===');
    const clientEmail = credentials.client_email;
    if (clientEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = emailRegex.test(clientEmail);
      const isServiceAccount = clientEmail.includes('.iam.gserviceaccount.com');
      
      console.log('Client email:', clientEmail);
      console.log('Valid email format:', isValidEmail ? '✅' : '❌');
      console.log('Is service account email:', isServiceAccount ? '✅' : '❌');
    }
    
    // Check project ID
    console.log('\n=== Project Information ===');
    console.log('Project ID:', credentials.project_id);
    console.log('Private Key ID:', credentials.private_key_id);
    console.log('Client ID:', credentials.client_id);
    
    return true;
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    return false;
  }
}

analyzeServiceAccountKey();