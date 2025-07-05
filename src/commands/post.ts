import { logger } from '../utils/logger';
import { ConfigService } from '../services/config';
import { AIService } from '../services/ai';
import { StorageService } from '../services/storage';
import { TwitterService } from '../services/twitter';
import { confirm } from '../utils/prompts';
import chalk from 'chalk';
import { Tweet, Draft } from '../types';

export async function postCommand(message: string, options: any): Promise<void> {
  const configService = ConfigService.getInstance();
  const aiService = AIService.getInstance();
  const storageService = StorageService.getInstance();
  const twitterService = TwitterService.getInstance();

  try {
    // Load configuration
    const config = await configService.load();

    // Start generating tweet
    logger.startSpinner('Generating tweet with AI...');
    
    const generatedTweet = await aiService.generateTweet({ message, includeScreenshot: false }, config);
    
    logger.stopSpinner(true, 'Tweet generated!');

    // Display the generated tweet
    console.log('\n' + chalk.bold('Generated Tweet:'));
    console.log(chalk.cyan('─'.repeat(50)));
    console.log(generatedTweet);
    console.log(chalk.cyan('─'.repeat(50)));
    console.log(chalk.gray(`Character count: ${generatedTweet.length}/280\n`));

    // Ask for confirmation unless --no-confirm flag is used
    let shouldPost = options.confirm;
    if (shouldPost) {
      shouldPost = await confirm('Do you want to post this tweet?', true);
    }

    if (shouldPost) {
      try {
        // Post to Twitter
        logger.startSpinner('Posting to Twitter...');
        const tweetId = await twitterService.postTweet(generatedTweet);
        logger.stopSpinner(true, 'Posted to Twitter!');

        // Save to history
        const tweet: Tweet = {
          id: tweetId,
          text: generatedTweet,
          createdAt: new Date(),
          url: `https://twitter.com/${await twitterService.getUsername() || 'user'}/status/${tweetId}`
        };

        await storageService.saveTweet(tweet);
        
        logger.success('Tweet posted successfully! 🚀');
        
        if (twitterService.getUsername()) {
          logger.info(`View your tweet: https://twitter.com/${twitterService.getUsername()}/status/${tweetId}`);
        }
      } catch (error: any) {
        logger.stopSpinner(false, 'Failed to post to Twitter');
        
        // Save as draft on failure
        const draft: Draft = {
          id: `draft-${Date.now()}`,
          text: generatedTweet,
          createdAt: new Date(),
          includeScreenshot: false
        };
        await storageService.saveDraft(draft);
        
        logger.error(`Twitter posting failed: ${error.message}`);
        logger.info('Tweet saved as draft. You can retry later from "bip history".');
      }
    } else {
      // Save as draft
      const draft: Draft = {
        id: `draft-${Date.now()}`,
        text: generatedTweet,
        createdAt: new Date(),
        includeScreenshot: false
      };

      await storageService.saveDraft(draft);
      logger.info('Tweet saved as draft. Use "bip history" to view drafts.');
    }
  } catch (error) {
    logger.stopSpinner(false, 'Failed to generate tweet');
    throw error;
  }
}