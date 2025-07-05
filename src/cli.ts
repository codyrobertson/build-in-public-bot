#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import { logger } from './utils/logger';
import { handleError } from './utils/errors';
import { initCommand } from './commands/init';
import { postCommand } from './commands/post';
import { codeCommand } from './commands/code';
import { styleCommand } from './commands/style';
import { historyCommand } from './commands/history';
import { draftCommand } from './commands/draft';
import { watchCommand } from './commands/watch';
import { summaryCommand } from './commands/summary';
import { autoCommand } from './commands/auto';

const packageJson = require('../package.json');

const program = new Command();

// Global error handling
process.on('unhandledRejection', (error) => {
  handleError(error);
});

process.on('uncaughtException', (error) => {
  handleError(error);
});

program
  .name('bip')
  .description('AI-powered CLI bot for automating build-in-public tweets')
  .version(packageJson.version)
  .option('-d, --debug', 'enable debug mode')
  .hook('preAction', (thisCommand) => {
    if (thisCommand.opts().debug) {
      process.env.DEBUG = 'true';
      logger.debug('Debug mode enabled');
    }
  });

// Initialize command
program
  .command('init')
  .description('Initialize build-in-public bot configuration')
  .action(async () => {
    try {
      await initCommand();
    } catch (error) {
      handleError(error);
    }
  });

// Post command
program
  .command('post <message>')
  .description('Generate and post a build-in-public tweet')
  .option('-n, --no-confirm', 'skip confirmation before posting')
  .action(async (message: string, options) => {
    try {
      await postCommand(message, options);
    } catch (error) {
      handleError(error);
    }
  });

// Code command
program
  .command('code <file> [caption]')
  .description('Post code screenshot with caption')
  .option('-l, --lines <range>', 'line range to capture (e.g., "1-10")')
  .option('-n, --no-confirm', 'skip confirmation before posting')
  .action(async (file: string, caption: string | undefined, options) => {
    try {
      await codeCommand(file, caption, options);
    } catch (error) {
      handleError(error);
    }
  });

// Style command
program
  .command('style')
  .description('Configure tweet style preferences')
  .option('-r, --reset', 'reset to default style')
  .action(async (options) => {
    try {
      await styleCommand(options);
    } catch (error) {
      handleError(error);
    }
  });

// History command
program
  .command('history')
  .description('View recent posts')
  .option('-l, --limit <number>', 'number of posts to show', '10')
  .action(async (options) => {
    try {
      await historyCommand(options);
    } catch (error) {
      handleError(error);
    }
  });

// Draft command
program
  .command('draft <message>')
  .description('Generate tweet without posting')
  .option('-s, --save', 'save draft for later')
  .action(async (message: string, options) => {
    try {
      await draftCommand(message, options);
    } catch (error) {
      handleError(error);
    }
  });

// Add watch command
program.addCommand(watchCommand);

// Add summary command
program.addCommand(summaryCommand);

// Add auto command
program.addCommand(autoCommand);

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}