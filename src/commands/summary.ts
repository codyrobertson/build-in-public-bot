import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ContextAnalyzerService } from '../services/context-analyzer';
import { ConfigService } from '../services/config';
import { AIService } from '../services/ai';
import { StorageService } from '../services/storage';
import { handleError } from '../utils/errors';

export const summaryCommand = new Command('summary')
  .description('Generate a summary tweet of your recent coding session')
  .option('-s, --save', 'Save as draft instead of posting')
  .option('-c, --screenshot', 'Include a code screenshot from recent changes')
  .action(async (options) => {
    try {
      const spinner = ora('Analyzing your coding session...').start();

      // Initialize services
      const configService = ConfigService.getInstance();
      const config = await configService.load();
      
      const contextAnalyzer = ContextAnalyzerService.getInstance();
      const aiService = AIService.getInstance();
      const storageService = StorageService.getInstance();

      // Get current context
      const context = await contextAnalyzer.analyzeCurrentContext();
      
      spinner.text = 'Generating summary...';

      // Build a detailed summary message
      let summaryMessage = `Summary of work on ${context.projectName}`;
      
      if (context.recentChanges.length > 0) {
        const fileCount = new Set(context.recentChanges.map(c => c.path)).size;
        summaryMessage += `. Made changes to ${fileCount} files`;
      }

      if (context.uncommittedFiles.length > 0) {
        summaryMessage += `. ${context.uncommittedFiles.length} files modified`;
      }

      if (context.lastCommitMessage) {
        summaryMessage += `. Last commit: "${context.lastCommitMessage.split('\n')[0]}"`;
      }

      // Generate tweet
      const tweet = await aiService.generateTweet(
        { 
          message: summaryMessage, 
          includeScreenshot: options.screenshot 
        },
        config
      );

      spinner.succeed('Summary generated!');

      // Display the context
      console.log('\n' + chalk.cyan('📊 Session Summary:'));
      console.log(`  Project: ${chalk.white(context.projectName)}`);
      console.log(`  Branch: ${chalk.white(context.currentBranch)}`);
      if (context.language) {
        console.log(`  Language: ${chalk.white(context.language)}`);
      }
      if (context.framework) {
        console.log(`  Framework: ${chalk.white(context.framework)}`);
      }
      console.log(`  Recent changes: ${chalk.white(context.recentChanges.length)} files`);
      console.log(`  Uncommitted: ${chalk.white(context.uncommittedFiles.length)} files`);

      // Show recent files changed
      if (context.recentChanges.length > 0) {
        console.log('\n' + chalk.cyan('Recent files:'));
        context.recentChanges.slice(0, 5).forEach(change => {
          const icon = change.type === 'add' ? '✨' : change.type === 'change' ? '📝' : '🗑️';
          console.log(`  ${icon} ${chalk.dim(change.path)}`);
        });
        if (context.recentChanges.length > 5) {
          console.log(`  ${chalk.dim(`... and ${context.recentChanges.length - 5} more`)}`);
        }
      }

      // Display generated tweet
      console.log('\n' + chalk.green('📱 Generated Tweet:'));
      console.log(chalk.white(tweet));

      if (options.save) {
        // Save as draft
        await storageService.saveDraft({
          id: `summary-${Date.now()}`,
          text: tweet,
          createdAt: new Date(),
          includeScreenshot: options.screenshot
        });
        console.log('\n' + chalk.green('✅ Saved as draft'));
      } else {
        console.log('\n' + chalk.dim('Use "bip post" to tweet this or add --save to save as draft'));
      }

    } catch (error) {
      handleError(error);
    }
  });