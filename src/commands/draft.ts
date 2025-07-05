import { logger } from '../utils/logger';
import { ConfigService } from '../services/config';
import { AIService } from '../services/ai';
import { StorageService } from '../services/storage';
import chalk from 'chalk';
import { Draft } from '../types';

export async function draftCommand(message: string, options: any): Promise<void> {
  const configService = ConfigService.getInstance();
  const aiService = AIService.getInstance();
  const storageService = StorageService.getInstance();

  try {
    // Load configuration
    const config = await configService.load();

    // Start generating tweet
    logger.startSpinner('Generating draft tweet with AI...');
    
    const generatedTweet = await aiService.generateTweet({ message, includeScreenshot: false }, config);
    
    logger.stopSpinner(true, 'Draft generated!');

    // Display the generated tweet
    console.log('\n' + chalk.bold('Generated Draft:'));
    console.log(chalk.cyan('─'.repeat(50)));
    console.log(generatedTweet);
    console.log(chalk.cyan('─'.repeat(50)));
    console.log(chalk.gray(`Character count: ${generatedTweet.length}/280\n`));

    // Save draft if requested
    if (options.save) {
      const draft: Draft = {
        id: `draft-${Date.now()}`,
        text: generatedTweet,
        createdAt: new Date(),
        includeScreenshot: false
      };

      await storageService.saveDraft(draft);
      logger.success('Draft saved! Use "bip history" to view all drafts.');
    }
  } catch (error) {
    logger.stopSpinner(false, 'Failed to generate draft');
    throw error;
  }
}