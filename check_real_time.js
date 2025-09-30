const https = require('https');

function getCurrentTimeFromAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'worldtimeapi.org',
      path: '/api/timezone/UTC',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const timeData = JSON.parse(data);
          resolve(timeData);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function checkTime() {
  try {
    console.log('=== System Time vs Real Time Comparison ===\n');
    
    // Get system time
    const systemTime = new Date();
    const systemUnix = Math.floor(systemTime.getTime() / 1000);
    
    console.log('System Time:');
    console.log('  ISO:', systemTime.toISOString());
    console.log('  Unix:', systemUnix);
    console.log('  Human readable:', systemTime.toString());
    
    // Get real time from API
    console.log('\nFetching real time from WorldTimeAPI...');
    const realTimeData = await getCurrentTimeFromAPI();
    const realTime = new Date(realTimeData.datetime);
    const realUnix = Math.floor(realTime.getTime() / 1000);
    
    console.log('\nReal Time (from WorldTimeAPI):');
    console.log('  ISO:', realTime.toISOString());
    console.log('  Unix:', realUnix);
    console.log('  Human readable:', realTime.toString());
    
    // Calculate difference
    const diffSeconds = systemUnix - realUnix;
    const diffDays = Math.floor(Math.abs(diffSeconds) / (24 * 60 * 60));
    const diffHours = Math.floor((Math.abs(diffSeconds) % (24 * 60 * 60)) / (60 * 60));
    const diffMinutes = Math.floor((Math.abs(diffSeconds) % (60 * 60)) / 60);
    
    console.log('\n=== Time Difference Analysis ===');
    console.log('Difference in seconds:', diffSeconds);
    console.log('System is', diffSeconds > 0 ? 'AHEAD' : 'BEHIND', 'by:');
    console.log(`  ${diffDays} days, ${diffHours} hours, ${diffMinutes} minutes`);
    
    if (Math.abs(diffSeconds) > 300) { // More than 5 minutes difference
      console.log('\n❌ SIGNIFICANT TIME DIFFERENCE DETECTED!');
      console.log('This explains the "Invalid JWT Signature" error.');
      console.log('Google rejects JWT tokens with timestamps too far from the current time.');
    } else {
      console.log('\n✅ System time is reasonably accurate.');
      console.log('The JWT signature issue might be caused by something else.');
    }
    
  } catch (error) {
    console.error('❌ Error checking time:', error.message);
    
    // Fallback: try a different time API
    console.log('\nTrying alternative time source...');
    try {
      const response = await fetch('http://worldclockapi.com/api/json/utc/now');
      const data = await response.json();
      console.log('Alternative time source:', data.currentDateTime);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError.message);
    }
  }
}

checkTime();