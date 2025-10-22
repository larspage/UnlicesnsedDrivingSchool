const express = require('express');
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));

// Test route with the fixed validation
app.post('/test', (req, res) => {
  console.log('=== REQUEST RECEIVED ===');
  console.log('Content-Type:', req.get('content-type'));
  console.log('req.is("json"):', req.is('json'));
  console.log('typeof req.body:', typeof req.body);
  console.log('Array.isArray(req.body):', Array.isArray(req.body));
  console.log('req.body keys:', Object.keys(req.body));
  console.log('========================');

  // Fixed validation logic
  if (!req.is('json')) {
    console.log('❌ FAILED: Content-type is not JSON');
    return res.status(400).json({
      success: false,
      error: 'Invalid request body format. JSON expected.'
    });
  }
  
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    console.log('❌ FAILED: Body is not a valid object');
    return res.status(400).json({
      success: false,
      error: 'Invalid request body format. JSON expected.'
    });
  }

  console.log('✅ PASSED: Request validation successful');
  res.json({
    success: true,
    message: 'Request validated successfully',
    receivedData: {
      schoolName: req.body.schoolName,
      filesCount: req.body.files ? req.body.files.length : 0
    }
  });
});

const PORT = 3333;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('\nTest with curl:');
  console.log(`curl -X POST http://localhost:${PORT}/test -H "Content-Type: application/json" -d "{\\"schoolName\\":\\"Test School\\",\\"files\\":[]}"`)
});