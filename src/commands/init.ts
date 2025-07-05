import { logger } from '../utils/logger';
import { ConfigService } from '../services/config';
import { prompt, confirm } from '../utils/prompts';
import chalk from 'chalk';

export async function initCommand(): Promise<void> {
  logger.info('Welcome to Build-in-Public Bot! 🚀\n');
  
  const configService = ConfigService.getInstance();
  
  try {
    // Check if already initialized
    try {
      await configService.load();
      const overwrite = await confirm(
        'Configuration already exists. Do you want to reinitialize?'
      );
      if (!overwrite) {
        logger.info('Initialization cancelled.');
        return;
      }
    } catch {
      // Config doesn't exist, continue with initialization
    }

    console.log(chalk.bold('\n📝 Let\'s set up your build-in-public bot:\n'));

    // Get Twitter username
    const username = await prompt('Twitter username (without @)', {
      validate: (input) => {
        if (!input) return 'Username is required';
        if (input.includes('@')) return 'Please enter username without @ symbol';
        return true;
      }
    });

    // Twitter posting method
    console.log(chalk.bold('\n🐦 Twitter Posting Method:\n'));
    console.log('This bot can post to Twitter in two ways:\n');
    console.log(chalk.cyan('1. Browser Automation') + ' (Recommended)');
    console.log('   - Uses Chrome to post like a human');
    console.log('   - No API keys needed');
    console.log('   - Works with personal accounts');
    console.log('   - Handles media uploads easily\n');
    
    console.log(chalk.cyan('2. Twitter API') + ' (Advanced)');
    console.log('   - Requires Twitter Developer account');
    console.log('   - Need to create an app and get API keys');
    console.log('   - Faster but more complex setup');
    console.log('   - Subject to API rate limits\n');
    
    const postingMethod = await prompt('Which method would you like to use? (1 or 2)', {
      validate: (input) => {
        if (!['1', '2'].includes(input)) {
          return 'Please enter 1 or 2';
        }
        return true;
      }
    });
    
    if (postingMethod === '1') {
      // Browser automation setup
      console.log(chalk.green('\n✅ Great choice! Browser automation is easy to set up.'));
      console.log(chalk.dim('When you post your first tweet, a Chrome window will open.'));
      console.log(chalk.dim('Just log in to Twitter once, and the bot will remember your session.\n'));
      
      // Save posting method preference
      const config = await configService.load();
      config.twitter.postingMethod = 'browser';
      await configService.save(config);
      
    } else {
      // API setup
      console.log(chalk.yellow('\n⚠️  Twitter API setup is more complex.'));
      console.log(chalk.dim('\nYou\'ll need:'));
      console.log(chalk.dim('1. A Twitter Developer account'));
      console.log(chalk.dim('2. Create an app at https://developer.twitter.com'));
      console.log(chalk.dim('3. Get your API keys and tokens\n'));
      
      const setupApiNow = await confirm('Do you have Twitter API credentials ready?', false);
      
      if (setupApiNow) {
        console.log(chalk.dim('\nEnter your Twitter API credentials:\n'));
        
        const apiKey = await prompt('API Key', {
          mask: true,
          validate: (input) => input.length > 0 || 'API Key is required'
        });
        
        const apiSecret = await prompt('API Key Secret', {
          mask: true,
          validate: (input) => input.length > 0 || 'API Key Secret is required'
        });
        
        const accessToken = await prompt('Access Token', {
          mask: true,
          validate: (input) => input.length > 0 || 'Access Token is required'
        });
        
        const accessSecret = await prompt('Access Token Secret', {
          mask: true,
          validate: (input) => input.length > 0 || 'Access Token Secret is required'
        });
        
        // Save to .env file
        const fs = await import('fs/promises');
        const path = await import('path');
        const envPath = path.join(process.cwd(), '.env');
        
        try {
          let envContent = '';
          try {
            envContent = await fs.readFile(envPath, 'utf-8');
          } catch {
            // File doesn't exist
          }
          
          // Add Twitter API credentials
          const twitterEnvVars = `
TWITTER_API_KEY=${apiKey}
TWITTER_API_KEY_SECRET=${apiSecret}
TWITTER_ACCESS_TOKEN=${accessToken}
TWITTER_ACCESS_TOKEN_SECRET=${accessSecret}
`;
          
          envContent += twitterEnvVars;
          await fs.writeFile(envPath, envContent);
          
          // Set for current session
          process.env.TWITTER_API_KEY = apiKey;
          process.env.TWITTER_API_KEY_SECRET = apiSecret;
          process.env.TWITTER_ACCESS_TOKEN = accessToken;
          process.env.TWITTER_ACCESS_TOKEN_SECRET = accessSecret;
          
          console.log(chalk.green('\n✅ Twitter API credentials saved!'));
        } catch (error) {
          console.log(chalk.yellow('\n⚠️  Could not save credentials to .env'));
          console.log(chalk.dim('Add these to your .env file manually:'));
          console.log(chalk.cyan(`TWITTER_API_KEY=${apiKey}`));
          console.log(chalk.cyan(`TWITTER_API_KEY_SECRET=${apiSecret}`));
          console.log(chalk.cyan(`TWITTER_ACCESS_TOKEN=${accessToken}`));
          console.log(chalk.cyan(`TWITTER_ACCESS_TOKEN_SECRET=${accessSecret}`));
        }
        
        // Save posting method preference
        const config = await configService.load();
        config.twitter.postingMethod = 'api';
        await configService.save(config);
        
      } else {
        console.log(chalk.dim('\nYou can set up Twitter API credentials later.'));
        console.log(chalk.dim('For now, the bot will use browser automation.\n'));
        
        // Default to browser automation
        const config = await configService.load();
        config.twitter.postingMethod = 'browser';
        await configService.save(config);
      }
    }

    // Ask about AI provider preference
    console.log(chalk.bold('\n🤖 AI Configuration:\n'));
    console.log('This bot uses OpenRouter with GPT-4 for generating tweets.');
    
    // Check if API key is already set
    if (!process.env.OPENROUTER_API_KEY) {
      console.log(chalk.yellow('\n⚠️  No OpenRouter API key detected'));
      
      const setupApiKey = await confirm('Would you like to set up your API key now?', true);
      
      if (setupApiKey) {
        console.log(chalk.dim('\n1. Sign up at https://openrouter.ai (free)'));
        console.log(chalk.dim('2. Copy your API key from the dashboard\n'));
        
        const apiKey = await prompt('Paste your OpenRouter API key', {
          mask: true,
          validate: (input) => {
            if (!input) return 'API key is required';
            if (input.length < 20) return 'Invalid API key format';
            return true;
          }
        });
        
        // Save to .env file
        const fs = await import('fs/promises');
        const path = await import('path');
        const envPath = path.join(process.cwd(), '.env');
        
        try {
          let envContent = '';
          try {
            envContent = await fs.readFile(envPath, 'utf-8');
          } catch {
            // File doesn't exist, create it
          }
          
          if (envContent.includes('OPENROUTER_API_KEY')) {
            // Update existing
            envContent = envContent.replace(/OPENROUTER_API_KEY=.*/, `OPENROUTER_API_KEY=${apiKey}`);
          } else {
            // Add new
            envContent += `${envContent ? '\n' : ''}OPENROUTER_API_KEY=${apiKey}\n`;
          }
          
          await fs.writeFile(envPath, envContent);
          process.env.OPENROUTER_API_KEY = apiKey;
          
          console.log(chalk.green('✅ API key saved to .env file'));
        } catch (error) {
          console.log(chalk.yellow('⚠️  Could not save to .env file'));
          console.log(chalk.dim('Add this to your environment manually:'));
          console.log(chalk.cyan(`export OPENROUTER_API_KEY="${apiKey}"`));
        }
      } else {
        console.log(chalk.dim('\nYou can add it later to your .env file:'));
        console.log(chalk.cyan('OPENROUTER_API_KEY=your-key-here'));
      }
    } else {
      console.log(chalk.green('✅ API key already configured'));
    }

    // Ask about style preferences
    console.log(chalk.bold('\n✨ Style Preferences:\n'));
    
    const useEmojis = await confirm('Do you want to use emojis in your tweets?', true);
    const alwaysUseBuildinpublic = await confirm(
      'Always include #buildinpublic hashtag?', 
      true
    );

    // Initialize configuration
    await configService.init();
    
    // Update with user preferences
    const config = await configService.load();
    config.twitter.username = username;
    
    if (!useEmojis) {
      config.style.emojis.frequency = 'none';
    }
    
    if (!alwaysUseBuildinpublic) {
      config.style.hashtags.always = [];
    }

    await configService.save(config);

    console.log(chalk.green('\n✅ Build-in-Public Bot initialized successfully!\n'));
    console.log('Next steps:');
    console.log('  1. Make sure OPENROUTER_API_KEY is set in your .env file');
    console.log('  2. Run', chalk.cyan('bip post "your update"'), 'to create your first tweet');
    console.log('  3. Use', chalk.cyan('bip style'), 'to customize your tweet style');
    console.log('  4. Use', chalk.cyan('bip code <file>'), 'to share code screenshots\n');
  } catch (error) {
    logger.error('Failed to initialize configuration');
    throw error;
  }
}