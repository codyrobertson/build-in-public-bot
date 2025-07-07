// Quick Start Example - Your first tweet with Build in Public Bot

const { BuildInPublicBot } = require('build-in-public-bot');

async function shareProgress() {
  const bot = new BuildInPublicBot();
  
  // Initialize with your OpenRouter API key
  await bot.init({
    apiKey: process.env.OPENROUTER_API_KEY,
    style: {
      tone: 'casual',
      emojis: { frequency: 'medium' },
      hashtags: { always: ['#buildinpublic'] }
    }
  });
  
  // Generate and post AI-enhanced tweet
  await bot.post("Just implemented real-time notifications! 🚀");
  
  // Share code with automatic screenshot
  await bot.shareCode('./notifications.js', {
    message: "Here's how the magic happens",
    theme: 'synthwave-84',
    shader: 'wave-gradient'
  });
}