// Script to generate screenshots for README using Canvas-based service

const fs = require('fs').promises;
const path = require('path');

async function generateScreenshots() {
  console.log('🎨 Generating README screenshots...');
  
  // Ensure docs/images directory exists
  await fs.mkdir('docs/images', { recursive: true });
  
  // Import our services after build
  const { ScreenshotService } = require('./dist/services/screenshot');
  const screenshotService = ScreenshotService.getInstance();
  
  const examples = [
    {
      file: 'docs/examples/quick-start.js',
      output: 'docs/images/quick-start-example.png',
      theme: 'dracula',
      title: 'Quick Start Example'
    },
    {
      file: 'docs/examples/theme-showcase.ts', 
      output: 'docs/images/theme-showcase.png',
      theme: 'synthwave-84',
      shader: 'wave-gradient',
      title: 'Theme Showcase'
    },
    {
      file: 'docs/examples/service-architecture.ts',
      output: 'docs/images/service-architecture.png', 
      theme: 'cyberpunk',
      shader: 'disruptor',
      title: 'Service Architecture'
    },
    {
      file: 'docs/examples/config-example.yml',
      output: 'docs/images/config-example.png',
      theme: 'nord',
      title: 'Configuration Example'
    },
    {
      file: 'docs/examples/cli-commands.sh',
      output: 'docs/images/cli-commands.png', 
      theme: 'gruvbox-dark',
      shader: 'halftone',
      title: 'CLI Commands'
    }
  ];
  
  for (const example of examples) {
    try {
      console.log(`📸 Generating: ${example.title}`);
      
      // Read the code file using the service
      const { code, language } = await screenshotService.readCodeFile(example.file);
      
      // Configuration for screenshot
      const config = {
        theme: example.theme,
        backgroundColor: getThemeBackground(example.theme),
        windowTheme: 'mac',
        padding: 32,
        language: 'auto'
      };
      
      // Custom options with shader if specified
      const options = {
        windowControls: true,
        lineNumbers: false,
        width: 800,
        shader: example.shader,
        fontSize: 16
      };
      
      // Generate screenshot using Canvas-based service
      const buffer = await screenshotService.generateCodeScreenshot(code, language, config, options);
      
      // Save to docs/images/
      await fs.writeFile(example.output, buffer);
      console.log(`✅ Saved: ${example.output}`);
      
    } catch (error) {
      console.error(`❌ Failed to generate ${example.title}:`, error.message);
      
      // Fallback: create a simple placeholder
      try {
        const placeholderText = `# ${example.title}\n\nScreenshot generation failed.\nTheme: ${example.theme}${example.shader ? `\nShader: ${example.shader}` : ''}\n\nError: ${error.message}`;
        await fs.writeFile(example.output.replace('.png', '.txt'), placeholderText);
        console.log(`📝 Created error placeholder for: ${example.title}`);
      } catch (fallbackError) {
        console.error(`❌ Failed to create placeholder:`, fallbackError.message);
      }
    }
  }
  
  console.log('🎉 Screenshot generation complete!');
}

function getLanguageFromFile(filepath) {
  const ext = path.extname(filepath);
  const langMap = {
    '.js': 'javascript',
    '.ts': 'typescript', 
    '.sh': 'bash',
    '.yml': 'yaml',
    '.yaml': 'yaml'
  };
  return langMap[ext] || 'text';
}

function getThemeBackground(theme) {
  const backgrounds = {
    'dracula': '#282a36',
    'synthwave-84': '#2d1b69', 
    'cyberpunk': '#0a0a0a',
    'nord': '#2e3440',
    'gruvbox-dark': '#282828'
  };
  return backgrounds[theme] || '#1e1e1e';
}

// Run the generator
generateScreenshots().catch(console.error);