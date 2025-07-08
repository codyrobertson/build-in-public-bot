#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
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
import { setupApiCommand } from './commands/setup-api';
import configCommand from './commands/config';
import screenshotCommand from './commands/screenshot';
import doctorCommand from './commands/doctor';
import completionCommand from './commands/completion';

const packageJson = require('../package.json');

const program = new Command();

// Global error handling
process.on('unhandledRejection', (error) => {
  handleError(error);
});

process.on('uncaughtException', (error) => {
  handleError(error);
});

// Enhanced program with global options
program
  .name('bip')
  .description('AI-powered CLI bot for automating build-in-public tweets')
  .version(packageJson.version, '-V, --version', 'output the version number')
  .option('-v, --verbose', 'verbose output')
  .option('-q, --quiet', 'quiet output (errors only)')
  .option('-d, --debug', 'enable debug mode')
  .option('--dry-run', 'show what would be done without executing')
  .option('--config <file>', 'use custom config file')
  .option('--no-color', 'disable colored output')
  .option('--json', 'output in JSON format where applicable')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    
    // Set debug mode
    if (opts.debug) {
      process.env.DEBUG = 'true';
      logger.debug('Debug mode enabled');
    }
    
    // Set verbosity
    if (opts.quiet) {
      process.env.LOG_LEVEL = 'error';
    } else if (opts.verbose) {
      process.env.LOG_LEVEL = 'debug';
    }
    
    // Disable colors if requested
    if (opts.noColor) {
      chalk.level = 0;
    }
  })
  .configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => cmd.name() + ' ' + cmd.usage()
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

// Add commands in standardized way
program.addCommand(watchCommand);
program.addCommand(summaryCommand);
program.addCommand(autoCommand);
program.addCommand(setupApiCommand);
program.addCommand(configCommand);
program.addCommand(screenshotCommand);
program.addCommand(doctorCommand);
program.addCommand(completionCommand);

// Add helpful examples to main help
program.addHelpText('after', `
Examples:
  $ bip init                      Initialize configuration
  $ bip post "Just fixed a bug"   Generate and post a tweet
  $ bip code app.js               Post code screenshot
  $ bip screenshot src/app.ts     Generate screenshot only
  $ bip config show               Show current configuration
  $ bip doctor                    Run health checks

For more help on a specific command:
  $ bip <command> --help
`);

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}