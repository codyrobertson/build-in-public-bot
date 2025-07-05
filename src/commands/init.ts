import { logger } from '../utils/logger';
import { ConfigService } from '../services/config';
import { prompt, confirm } from '../utils/prompts';
import chalk from 'chalk';

export async function initCommand(): Promise<void> {
  logger.info('Welcome to Build-in-Public Bot! 🚀\n');
  
  const configService = ConfigService.getInstance();
  
  try {
    // Check if already initialized
    let existingConfig = null;
    let isNewInstall = false;
    try {
      existingConfig = await configService.load();
      const overwrite = await confirm(
        'Configuration already exists. Do you want to update it?'
      );
      if (!overwrite) {
        logger.info('Using existing configuration.');
        // Continue to check API keys and other setup
      } else {
        isNewInstall = true;
      }
    } catch {
      // Config doesn't exist, this is a new installation
      isNewInstall = true;
    }

    let username = existingConfig?.twitter?.username;
    
    if (isNewInstall) {
      console.log(chalk.bold('\n📝 Let\'s set up your build-in-public bot:\n'));

      // Get Twitter username
      username = await prompt('Twitter username (without @)', {
        default: username,
        validate: (input) => {
          if (!input) return 'Username is required';
          if (input.includes('@')) return 'Please enter username without @ symbol';
          return true;
        }
      });
    } else {
      console.log(chalk.bold('\n🔧 Checking your setup:\n'));
      console.log(chalk.green(`✅ Twitter username: @${username}`));
    }

    // Twitter posting method - only ask if new install or not configured
    let postingMethod = existingConfig?.twitter?.postingMethod;
    
    if (isNewInstall || !postingMethod) {
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
      
      const methodChoice = await prompt('Which method would you like to use? (1 or 2)', {
        validate: (input) => {
          if (!['1', '2'].includes(input)) {
            return 'Please enter 1 or 2';
          }
          return true;
        }
      });
      
      postingMethod = methodChoice === '1' ? 'browser' : 'api';
    } else {
      console.log(chalk.green(`✅ Twitter posting method: ${postingMethod}`));
    }
    
    if (postingMethod === 'browser') {
      // Browser automation setup
      if (isNewInstall || !existingConfig?.twitter?.postingMethod) {
        console.log(chalk.green('\n✅ Great choice! Browser automation is easy to set up.'));
        console.log(chalk.dim('When you post your first tweet, a Chrome window will open.'));
        console.log(chalk.dim('Just log in to Twitter once, and the bot will remember your session.\n'));
      }
    } else if (postingMethod === 'api') {
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
          console.log(chalk.cyan('TWITTER_API_KEY=***HIDDEN***'));
          console.log(chalk.cyan('TWITTER_API_KEY_SECRET=***HIDDEN***'));
          console.log(chalk.cyan('TWITTER_ACCESS_TOKEN=***HIDDEN***'));
          console.log(chalk.cyan('TWITTER_ACCESS_TOKEN_SECRET=***HIDDEN***'));
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
          console.log(chalk.cyan('export OPENROUTER_API_KEY="***HIDDEN***"'));
        }
      } else {
        console.log(chalk.dim('\nYou can add it later to your .env file:'));
        console.log(chalk.cyan('OPENROUTER_API_KEY=your-key-here'));
      }
    } else {
      console.log(chalk.green('✅ API key already configured'));
    }

    // Ask about style preferences (only for new installs)
    let useEmojis = true;
    let alwaysUseBuildinpublic = true;
    
    if (isNewInstall) {
      console.log(chalk.bold('\n✨ Style Preferences:\n'));
      
      useEmojis = await confirm('Do you want to use emojis in your tweets?', true);
      alwaysUseBuildinpublic = await confirm(
        'Always include #buildinpublic hashtag?', 
        true
      );
    }

    // Initialize or update configuration
    if (isNewInstall) {
      await configService.init();
    }
    
    // Update with user preferences
    const config = await configService.load();
    if (username) config.twitter.username = username;
    if (postingMethod) config.twitter.postingMethod = postingMethod;
    
    if (isNewInstall) {
      if (!useEmojis) {
        config.style.emojis.frequency = 'none';
      }
      
      if (!alwaysUseBuildinpublic) {
        config.style.hashtags.always = [];
      }
    }

    await configService.save(config);

    console.log(chalk.green('\n✅ Build-in-Public Bot setup complete!\n'));
    
    // Show status summary
    console.log(chalk.bold('Current Configuration:'));
    console.log(`  Twitter: @${config.twitter.username} (${config.twitter.postingMethod} mode)`);
    console.log(`  AI Key: ${process.env.OPENROUTER_API_KEY ? chalk.green('✓ Configured') : chalk.yellow('⚠ Not set')}`);
    console.log(`  Style: ${config.style.tone} tone, ${config.style.emojis.frequency} emojis`);
    
    console.log('\n' + chalk.bold('Next steps:'));
    if (!process.env.OPENROUTER_API_KEY) {
      console.log('  1. Set up your API key:', chalk.cyan('bip setup-api'));
      console.log('  2. Post your first tweet:', chalk.cyan('bip post "your update"'));
    } else {
      console.log('  1. Post your first tweet:', chalk.cyan('bip post "your update"'));
      console.log('  2. Share code screenshots:', chalk.cyan('bip code <file>'));
    }
    console.log('  3. Customize your style:', chalk.cyan('bip style'));
    console.log('  4. See all commands:', chalk.cyan('bip --help'));
  } catch (error) {
    logger.error('Failed to initialize configuration');
    throw error;
  }
}