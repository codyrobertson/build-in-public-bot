// Test the V2 screenshot service
const { ScreenshotServiceV2 } = require('./dist/services/screenshot-v2');
const fs = require('fs');

async function test() {
  const service = ScreenshotServiceV2.getInstance();
  
  const code = `🏗️ **PRAGMATIC ARCHITECTURE REVIEW**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 **SYSTEM CONTEXT**: CLI Tool with Server Mode + Editor Plugins  
📈 **CURRENT SCALE**: Single-user CLI, expanding to multi-user server  
🎯 **ARCHITECTURE VERDICT**: **DANGEROUS** - Critical security issues found

## 🔴 **CRITICAL ARCHITECTURAL ISSUES**

### 1. **Server Security Nightmare**
**File**: \`src/commands/server.ts:37-42\`  
**Issue**: CORS wildcard \`origin: '*'\` allows any website to access your server`;

  const config = {
    screenshots: {
      theme: 'cyberpunk',
      backgroundColor: '#0a0a0a',
      windowTheme: 'dark',
      padding: 32,
      language: 'markdown'
    }
  };

  const buffer = await service.generateCodeScreenshot(
    code,
    'markdown',
    config.screenshots,
    {
      shader: 'halftone',
      width: 800,
      padding: 40
    }
  );

  fs.writeFileSync('test-v2-output.png', buffer);
  console.log('Screenshot saved to test-v2-output.png');
}

test().catch(console.error);