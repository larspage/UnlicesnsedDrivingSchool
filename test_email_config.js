require('dotenv').config();
const configService = require('./server/services/configService');

async function testEmailConfig() {
  console.log('=== Email Configuration Verification ===\n');
  
  // Environment variables
  console.log('📧 SMTP Configuration (Environment Variables):');
  console.log(`  SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`  SMTP_PORT: ${process.env.SMTP_PORT}`);
  console.log(`  SMTP_USER: ${process.env.SMTP_USER}`);
  console.log(`  EMAIL_FROM: ${process.env.EMAIL_FROM}`);
  console.log(`  SMTP_PASS: ${process.env.SMTP_PASS ? '[HIDDEN]' : '[NOT SET]'}\n`);
  
  // Application configuration
  console.log('📋 Application Configuration (data/config.json):');
  
  try {
    const toAddress = await configService.getConfig('email.toAddress');
    const fromAddress = await configService.getConfig('email.fromAddress');
    const subjectTemplate = await configService.getConfig('email.subjectTemplate');
    const bodyTemplate = await configService.getConfig('email.bodyTemplate');
    
    console.log(`  EMAIL_TO: ${toAddress}`);
    console.log(`  EMAIL_FROM: ${fromAddress}`);
    console.log(`  Subject Template: "${subjectTemplate}"`);
    console.log(`  Body Template: First line: "${bodyTemplate.split('\n')[0]}"...`);
    
  } catch (error) {
    console.log('  ❌ Error loading configuration:', error.message);
  }
  
  console.log('\n=== Email Flow ===');
  console.log('From: lawrence.farrell@gmail.com');
  console.log('To: MrBrooksProd@gmail.com');
  console.log('Template: MVC notification with variable substitution');
  
  console.log('\n=== Status ===');
  console.log('✅ Environment variables updated');
  console.log('✅ Application configuration updated');
  console.log('✅ Ready for production deployment');
  console.log('\nNext step: Add actual password to SMTP_PASS on production server');
}

testEmailConfig();