const axios = require('axios');
const fs = require('fs');

async function testCarbonExport() {
  console.log('Testing Carbon export URL approach...\n');
  
  const code = 'console.log("Hello, World!");';
  
  // Carbon.now.sh uses a different approach for exporting
  // We need to construct the URL differently
  const config = {
    backgroundColor: 'rgba(171,184,195,1)',
    theme: 'dracula',
    language: 'javascript',
    fontFamily: 'Fira Code',
    fontSize: '14px',
    lineHeight: '133%',
    windowControls: true,
    widthAdjustment: true,
    paddingVertical: '48px',
    paddingHorizontal: '32px',
    lineNumbers: false,
    firstLineNumber: 1,
    dropShadow: true,
    dropShadowOffsetY: '20px',
    dropShadowBlurRadius: '68px',
    windowTheme: 'none',
    exportSize: '2x'
  };

  // Encode the state for Carbon
  const state = {
    ...config,
    code: code
  };
  
  const encodedState = encodeURIComponent(JSON.stringify(state));
  
  // Try the embed URL approach
  const embedUrl = `https://carbon.now.sh/embed/${encodedState}`;
  console.log('Embed URL:', embedUrl.substring(0, 100) + '...');
  console.log('URL Length:', embedUrl.length);
  
  try {
    console.log('\nTrying embed endpoint...');
    const response = await axios.get(embedUrl, {
      headers: {
        'Accept': 'image/png',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 30000
    });
    
    console.log('Response status:', response.status);
    console.log('Response type:', response.headers['content-type']);
    
  } catch (error) {
    console.error('Embed approach failed:', error.message);
  }

  // Alternative: Use puppeteer to capture the screenshot
  console.log('\n\nAlternative approach: Use Puppeteer to capture Carbon screenshot');
  console.log('This would involve:');
  console.log('1. Opening carbon.now.sh in a headless browser');
  console.log('2. Pasting the code');
  console.log('3. Setting the options');
  console.log('4. Capturing the screenshot');
}

testCarbonExport();