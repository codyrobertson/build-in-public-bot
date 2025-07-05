const axios = require('axios');

async function testCarbonAPI() {
  console.log('Testing Carbon API...\n');
  
  const code = 'console.log("Hello, World!");';
  const params = new URLSearchParams({
    code: code,
    language: 'javascript',
    theme: 'dracula',
    backgroundColor: 'rgba(171, 184, 195, 1)',
    fontFamily: 'Fira Code',
    fontSize: '14px',
    windowControls: 'true',
    lineNumbers: 'false',
    exportSize: '2x'
  });

  const url = `https://carbon.now.sh/api/image?${params.toString()}`;
  console.log('API URL:', url);
  console.log('\nURL Length:', url.length);
  
  try {
    console.log('\nMaking request to Carbon API...');
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'image/png',
        'User-Agent': 'build-in-public-bot/1.0.0'
      },
      timeout: 30000
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    console.log('Response data length:', response.data.length);
    console.log('\n✅ Carbon API is working!');
    
  } catch (error) {
    console.error('\n❌ Carbon API Error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status text:', error.response.statusText);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received');
      console.error('Request:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
  }
}

testCarbonAPI();