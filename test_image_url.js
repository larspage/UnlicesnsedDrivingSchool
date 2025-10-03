const puppeteer = require('puppeteer');

async function testImageUrl() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to the image URL
    const imageUrl = 'http://localhost:5000/api/files/file_5Mv2ue/download';
    console.log('Testing image URL:', imageUrl);

    const response = await page.goto(imageUrl, { waitUntil: 'networkidle2' });

    console.log('Response status:', response.status());
    console.log('Response headers:', response.headers());

    if (response.ok()) {
      console.log('✅ Image URL is working!');
    } else {
      console.log('❌ Image URL failed with status:', response.status());
    }

    // Try to get the image as base64 to verify it's an image
    const imageBuffer = await response.buffer();
    console.log('Image size:', imageBuffer.length, 'bytes');

    // Check if it's a valid image by checking the first few bytes
    const signature = imageBuffer.slice(0, 4).toString('hex');
    console.log('File signature:', signature);

    if (signature.startsWith('ffd8')) {
      console.log('✅ Valid JPEG image detected');
    } else {
      console.log('❌ Not a valid JPEG image');
    }

  } catch (error) {
    console.error('Error testing image URL:', error);
  } finally {
    await browser.close();
  }
}

testImageUrl();