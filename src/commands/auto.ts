import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigService } from '../services/config';
import { handleError } from '../utils/errors';

const GIT_HOOK_TEMPLATE = `#!/bin/sh
# Build in Public Bot - Post-commit hook

# Only run if BIP_AUTO_TWEET is set to true
if [ "$BIP_AUTO_TWEET" = "true" ]; then
  # Run in background to not block git
  (
    # Wait a moment for the commit to be fully processed
    sleep 2
    
    # Generate and save a tweet draft about the commit
    npx build-in-public summary --save > /dev/null 2>&1
    
    echo "Build in Public Bot: Tweet draft saved for your commit!"
  ) &
fi
`;

export const autoCommand = new Command('auto')
  .description('Set up automatic tweet generation for git commits')
  .option('--enable', 'Enable auto-tweet generation')
  .option('--disable', 'Disable auto-tweet generation')
  .option('--status', 'Show current auto-tweet status')
  .action(async (options) => {
    try {
      const configService = ConfigService.getInstance();

      // Check git repository
      const gitDir = path.join(process.cwd(), '.git');
      try {
        await fs.access(gitDir);
      } catch {
        console.log(chalk.red('❌ Not a git repository'));
        console.log(chalk.dim('Run this command in the root of your git project'));
        return;
      }

      const hookPath = path.join(gitDir, 'hooks', 'post-commit');

      if (options.status) {
        // Check status
        let hookExists = false;
        let hookEnabled = false;

        try {
          await fs.access(hookPath);
          hookExists = true;
          const content = await fs.readFile(hookPath, 'utf-8');
          hookEnabled = content.includes('Build in Public Bot');
        } catch {
          // Hook doesn't exist
        }

        console.log(chalk.cyan('🤖 Auto-tweet Status:'));
        console.log(`  Hook installed: ${hookExists ? chalk.green('Yes') : chalk.red('No')}`);
        console.log(`  Hook active: ${hookEnabled ? chalk.green('Yes') : chalk.red('No')}`);
        console.log(`  Environment variable: ${process.env.BIP_AUTO_TWEET === 'true' ? chalk.green('Enabled') : chalk.yellow('Disabled')}`);
        
        if (hookExists && hookEnabled) {
          console.log('\n' + chalk.dim('To enable auto-tweets, set: export BIP_AUTO_TWEET=true'));
          console.log(chalk.dim('To disable temporarily: export BIP_AUTO_TWEET=false'));
        }

        return;
      }

      if (options.disable) {
        // Remove hook
        const spinner = ora('Disabling auto-tweet generation...').start();

        try {
          const content = await fs.readFile(hookPath, 'utf-8');
          if (content.includes('Build in Public Bot')) {
            // Remove our hook
            await fs.unlink(hookPath);
            spinner.succeed('Auto-tweet generation disabled');
          } else {
            spinner.warn('Auto-tweet hook was not installed');
          }
        } catch {
          spinner.warn('No git hook found');
        }

        return;
      }

      // Enable by default or if --enable is passed
      const spinner = ora('Setting up auto-tweet generation...').start();

      // Check if hook already exists
      let existingContent = '';
      try {
        existingContent = await fs.readFile(hookPath, 'utf-8');
        if (existingContent.includes('Build in Public Bot')) {
          spinner.succeed('Auto-tweet generation is already enabled');
          console.log(chalk.dim('\nSet BIP_AUTO_TWEET=true in your environment to activate'));
          return;
        }
      } catch {
        // Hook doesn't exist, we'll create it
      }

      // Create or append to hook
      if (existingContent) {
        // Append to existing hook
        const updatedContent = existingContent + '\n\n' + GIT_HOOK_TEMPLATE;
        await fs.writeFile(hookPath, updatedContent);
      } else {
        // Create new hook
        await fs.writeFile(hookPath, GIT_HOOK_TEMPLATE);
      }

      // Make hook executable
      await fs.chmod(hookPath, '755');

      spinner.succeed('Auto-tweet generation enabled!');

      console.log('\n' + chalk.green('✅ Git hook installed successfully'));
      console.log('\nTo activate auto-tweets:');
      console.log(chalk.white('  export BIP_AUTO_TWEET=true'));
      console.log('\nTo temporarily disable:');
      console.log(chalk.white('  export BIP_AUTO_TWEET=false'));
      console.log('\n' + chalk.dim('A tweet draft will be saved after each commit when enabled'));

      // Save preference in config
      await configService.update({
        autoTweet: { enabled: true }
      } as any);

    } catch (error) {
      handleError(error);
    }
  });