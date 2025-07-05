import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { WatcherService } from '../services/watcher';
import { ContextAnalyzerService } from '../services/context-analyzer';
import { ConfigService } from '../services/config';
import { AIService } from '../services/ai';
import { StorageService } from '../services/storage';
import { handleError } from '../utils/errors';
import { logger } from '../utils/logger';

export const watchCommand = new Command('watch')
  .description('Watch for code changes and suggest tweets')
  .option('-p, --path <path>', 'Path to watch', process.cwd())
  .option('-a, --auto', 'Automatically generate tweets for significant changes')
  .option('-i, --interval <minutes>', 'Minimum interval between auto-tweets', '30')
  .action(async (options) => {
    try {
      const spinner = ora('Starting code watcher...').start();

      // Initialize services
      const configService = ConfigService.getInstance();
      const config = await configService.load();
      
      const watcherService = WatcherService.getInstance();
      const contextAnalyzer = ContextAnalyzerService.getInstance();
      const aiService = AIService.getInstance();
      const storageService = StorageService.getInstance();

      let lastAutoTweetTime = 0;
      const minInterval = parseInt(options.interval) * 60 * 1000; // Convert to milliseconds

      // Set up file change handler
      watcherService.on('fileChange', async (change) => {
        contextAnalyzer.addFileChange(change);
        
        logger.info(`${chalk.dim(new Date().toLocaleTimeString())} ${chalk.yellow(change.type)} ${change.path}`);

        // Auto-generate tweet if enabled and enough time has passed
        if (options.auto && Date.now() - lastAutoTweetTime > minInterval) {
          const context = await contextAnalyzer.analyzeCurrentContext();
          
          // Only generate for significant changes
          if (context.recentChanges.length >= 5 || change.type === 'add') {
            try {
              const suggestion = await contextAnalyzer.generateTweetSuggestion(context);
              const tweet = await aiService.generateTweet(
                { message: suggestion, includeScreenshot: false },
                config
              );

              console.log('\n' + chalk.green('📝 Auto-generated tweet suggestion:'));
              console.log(chalk.white(tweet));
              console.log(chalk.dim('(Use "bip post" to tweet this)\n'));

              // Save as draft
              await storageService.saveDraft({
                id: `auto-${Date.now()}`,
                text: tweet,
                createdAt: new Date(),
                includeScreenshot: false
              });

              lastAutoTweetTime = Date.now();
            } catch (error) {
              logger.error('Failed to generate auto-tweet:', error);
            }
          }
        }
      });

      // Start watching
      await watcherService.start(options.path);
      
      spinner.succeed(chalk.green('Code watcher started!'));
      console.log(chalk.dim(`Watching: ${options.path}`));
      console.log(chalk.dim('Press Ctrl+C to stop\n'));

      // Show initial context
      const context = await contextAnalyzer.analyzeCurrentContext();
      console.log(chalk.cyan('Current context:'));
      console.log(`  Project: ${chalk.white(context.projectName)}`);
      console.log(`  Branch: ${chalk.white(context.currentBranch)}`);
      if (context.language) {
        console.log(`  Language: ${chalk.white(context.language)}`);
      }
      if (context.framework) {
        console.log(`  Framework: ${chalk.white(context.framework)}`);
      }
      console.log('');

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n' + chalk.yellow('Stopping watcher...'));
        await watcherService.stop();
        process.exit(0);
      });

      // Keep the process running
      await new Promise(() => {}); // This will run indefinitely

    } catch (error) {
      handleError(error);
    }
  });