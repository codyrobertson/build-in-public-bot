import { logger } from '../utils/logger';
import { ConfigService } from '../services/config';
import { AIService } from '../services/ai';
import { ScreenshotService } from '../services/screenshot';
import { StorageService } from '../services/storage';
import { TwitterService } from '../services/twitter';
import { confirm, prompt } from '../utils/prompts';
import chalk from 'chalk';
import { Tweet, Draft } from '../types';

export async function codeCommand(
  file: string, 
  caption: string | undefined, 
  options: any
): Promise<void> {
  const configService = ConfigService.getInstance();
  const aiService = AIService.getInstance();
  const screenshotService = ScreenshotService.getInstance();
  const storageService = StorageService.getInstance();
  const twitterService = TwitterService.getInstance();

  try {
    // Load configuration
    const config = await configService.load();

    // Read the code file
    logger.startSpinner('Reading code file...');
    const { code, language } = await screenshotService.readCodeFile(
      file, 
      options.lines
    );
    logger.stopSpinner(true, 'Code file read successfully!');

    // Display code preview
    console.log('\n' + chalk.bold('Code Preview:'));
    console.log(chalk.gray('─'.repeat(50)));
    const preview = code.split('\n').slice(0, 10).join('\n');
    console.log(preview);
    if (code.split('\n').length > 10) {
      console.log(chalk.gray('... (truncated)'));
    }
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.gray(`Language: ${language}`));
    console.log(chalk.gray(`Lines: ${code.split('\n').length}\n`));

    // Get or generate caption
    let tweetText = caption;
    if (!tweetText) {
      const generateCaption = await confirm(
        'No caption provided. Would you like AI to generate one?',
        true
      );

      if (generateCaption) {
        logger.startSpinner('Generating caption with AI...');
        
        const codeContext = `I'm sharing a ${language} code snippet that shows: ${code.substring(0, 200)}...`;
        tweetText = await aiService.generateTweet(
          { message: codeContext, includeScreenshot: false },
          config
        );
        
        logger.stopSpinner(true, 'Caption generated!');
      } else {
        tweetText = await prompt('Enter caption for the code screenshot');
      }
    }

    // Display the tweet
    console.log('\n' + chalk.bold('Tweet Preview:'));
    console.log(chalk.cyan('─'.repeat(50)));
    console.log(tweetText);
    console.log(chalk.gray('\n[Code screenshot will be attached]'));
    console.log(chalk.cyan('─'.repeat(50)));
    console.log(chalk.gray(`Character count: ${tweetText.length}/280\n`));

    // Ask for confirmation unless --no-confirm flag is used
    let shouldPost = options.confirm;
    if (shouldPost) {
      shouldPost = await confirm('Do you want to post this tweet?', true);
    }

    if (shouldPost) {
      // Generate screenshot
      logger.startSpinner('Generating code screenshot...');
      const screenshotBuffer = await screenshotService.generateCodeScreenshot(
        code,
        language,
        config.screenshots
      );
      const screenshotPath = await screenshotService.saveScreenshot(screenshotBuffer);
      logger.stopSpinner(true, 'Screenshot generated!');

      try {
        // Upload media to Twitter
        logger.startSpinner('Uploading screenshot to Twitter...');
        const mediaId = await twitterService.uploadMedia(screenshotPath);
        logger.stopSpinner(true, 'Screenshot uploaded!');

        // Post tweet with media
        logger.startSpinner('Posting tweet...');
        const tweetId = await twitterService.postTweet(tweetText, [mediaId]);
        logger.stopSpinner(true, 'Posted to Twitter!');

        // Save to history
        const tweet: Tweet = {
          id: tweetId,
          text: tweetText,
          createdAt: new Date(),
          url: `https://twitter.com/${await twitterService.getUsername() || 'user'}/status/${tweetId}`,
          mediaUrls: [screenshotPath]
        };

        await storageService.saveTweet(tweet);
        
        logger.success('Tweet with code screenshot posted successfully! 🚀');
        
        if (twitterService.getUsername()) {
          logger.info(`View your tweet: https://twitter.com/${twitterService.getUsername()}/status/${tweetId}`);
        }
      } catch (error: any) {
        logger.stopSpinner(false, 'Failed to post to Twitter');
        
        // Save as draft on failure
        const draft: Draft = {
          id: `draft-${Date.now()}`,
          text: tweetText,
          createdAt: new Date(),
          includeScreenshot: true,
          screenshotPath: screenshotPath
        };
        await storageService.saveDraft(draft);
        
        logger.error(`Twitter posting failed: ${error.message}`);
        logger.info('Tweet saved as draft with screenshot.');
      }
    } else {
      logger.info('Tweet cancelled.');
    }
  } catch (error) {
    logger.stopSpinner(false, 'Failed to create code screenshot');
    throw error;
  }
}