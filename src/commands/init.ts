import { logger } from '../utils/logger';
import { ConfigService } from '../services/config';
import { TwitterService } from '../services/twitter';
import { prompt, confirm } from '../utils/prompts';
import chalk from 'chalk';

export async function initCommand(): Promise<void> {
  logger.info('Welcome to Build-in-Public Bot! 🚀\n');
  
  const configService = ConfigService.getInstance();
  const twitterService = TwitterService.getInstance();
  
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

    // Twitter authentication
    console.log(chalk.bold('\n🐦 Twitter Authentication:\n'));
    console.log(chalk.yellow('Note: This bot uses unofficial Twitter API methods.'));
    console.log(chalk.yellow('For full functionality, browser automation will be required.\n'));
    
    const setupTwitter = await confirm('Would you like to set up Twitter authentication now?', false);
    
    if (setupTwitter) {
      const password = await prompt('Twitter password', { mask: true });
      
      try {
        await twitterService.authenticate(username, password);
        console.log(chalk.green('\n✅ Twitter authentication saved!'));
      } catch (error) {
        logger.warn('Twitter authentication failed. You can retry later with "bip init".');
      }
    } else {
      console.log(chalk.gray('\nYou can set up Twitter authentication later.'));
    }

    // Ask about AI provider preference
    console.log(chalk.bold('\n🤖 AI Configuration:\n'));
    console.log('This bot uses OpenRouter with GPT-4 for generating tweets.');
    console.log('Make sure you have set OPENROUTER_API_KEY in your .env file.\n');

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