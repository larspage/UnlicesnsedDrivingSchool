const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

async function debugStatusUpdate() {
  console.log('🚀 Starting Puppeteer debug for status update issue...');

  // Start the development server
  console.log('📡 Starting development server...');
  const serverProcess = spawn('npm', ['run', 'dev'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 10000));

  let browser;
  try {
    console.log('🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Enable console logging from browser
    page.on('console', msg => {
      if (msg.text().includes('Error') || msg.text().includes('error')) {
        console.log('🔴 BROWSER ERROR:', msg.text());
      }
    });

    // Enable network request/response logging
    page.on('response', response => {
      if (response.url().includes('/api/reports/') && response.url().includes('/status')) {
        console.log(`📡 API Response: ${response.status()} ${response.url()}`);
        if (response.status() >= 400) {
          response.text().then(text => {
            console.log('❌ API Error Response:', text);
          });
        }
      }
    });

    console.log('🔐 Navigating to login page...');
    await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });

    // Wait for login form
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });

    console.log('📝 Filling login form...');
    await page.type('input[type="text"]', 'admin');
    await page.type('input[type="password"]', 'admin123');

    console.log('🔓 Submitting login...');
    await page.click('button[type="submit"]');

    // Wait for navigation to admin page
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('✅ Logged in successfully');

    // Wait for reports table to load
    await page.waitForSelector('table', { timeout: 10000 });
    console.log('📊 Reports table loaded');

    // Find the first status dropdown
    const statusDropdowns = await page.$$('[data-testid="status-dropdown"]');
    if (statusDropdowns.length === 0) {
      // Try alternative selector
      const dropdowns = await page.$$('select, [role="combobox"]');
      console.log(`🔍 Found ${dropdowns.length} potential dropdowns`);

      if (dropdowns.length > 0) {
        console.log('🎯 Clicking first dropdown...');
        await dropdowns[0].click();

        // Wait a bit
        await page.waitForTimeout(1000);

        // Try to select "Confirmed by NJDSC"
        const options = await page.$$('option[value="Confirmed by NJDSC"]');
        if (options.length > 0) {
          console.log('📝 Selecting "Confirmed by NJDSC"...');
          await options[0].click();
        } else {
          console.log('❌ Could not find status option');
        }
      }
    } else {
      console.log('🎯 Clicking status dropdown...');
      await statusDropdowns[0].click();

      // Wait for dropdown options
      await page.waitForTimeout(1000);

      // Try to select an option
      const option = await page.$('[data-value="Confirmed by NJDSC"]');
      if (option) {
        console.log('📝 Selecting "Confirmed by NJDSC"...');
        await option.click();
      } else {
        console.log('❌ Could not find status option');
      }
    }

    // Wait to see if any errors occur
    await page.waitForTimeout(3000);

    console.log('🔍 Checking for error messages...');
    const errorElements = await page.$$('[class*="error"], [class*="Error"]');
    console.log(`⚠️ Found ${errorElements.length} error elements`);

    for (let error of errorElements) {
      const text = await error.evaluate(el => el.textContent);
      console.log('🚨 Error text:', text);
    }

    // Check network requests for any failed API calls
    const failedRequests = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        failedRequests.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method()
        });
      }
    });

    console.log('📊 Failed requests:', failedRequests);

  } catch (error) {
    console.error('❌ Puppeteer error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }

    // Kill the server
    serverProcess.kill();
    console.log('🛑 Server stopped');
  }
}

// Run the debug script
debugStatusUpdate().catch(console.error);