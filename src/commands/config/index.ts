import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigService } from '../../services/config';
import { handleError } from '../../utils/errors';
import * as fs from 'fs/promises';
import * as yaml from 'yaml';

export const configCommand = new Command('config')
  .description('Manage configuration')
  .option('--json', 'Output in JSON format')
  .action(async () => {
    // Show help if no subcommand
    configCommand.outputHelp();
  });

// Config show subcommand
configCommand
  .command('show')
  .description('Show current configuration')
  .option('--reveal-secrets', 'Show sensitive values (API keys, etc.)')
  .action(async (options) => {
    try {
      const configService = ConfigService.getInstance();
      const config = await configService.load();
      
      // Create a display-safe config
      const displayConfig = JSON.parse(JSON.stringify(config));
      
      if (!options.revealSecrets) {
        // Mask sensitive values
        if (displayConfig.ai?.apiKey) {
          displayConfig.ai.apiKey = displayConfig.ai.apiKey.substring(0, 8) + '...';
        }
        if (displayConfig.twitter?.sessionData) {
          displayConfig.twitter.sessionData = '[HIDDEN]';
        }
      }
      
      if (options.parent.json) {
        console.log(JSON.stringify(displayConfig, null, 2));
      } else {
        console.log(chalk.cyan('Current Configuration:'));
        console.log(yaml.stringify(displayConfig));
      }
    } catch (error) {
      handleError(error);
    }
  });

// Config get subcommand
configCommand
  .command('get <key>')
  .description('Get a specific configuration value')
  .action(async (key: string) => {
    try {
      const configService = ConfigService.getInstance();
      const config = await configService.load();
      
      // Navigate the config object using dot notation
      const value = key.split('.').reduce((obj: any, prop) => obj?.[prop], config);
      
      if (value === undefined) {
        console.error(chalk.red(`Configuration key '${key}' not found`));
        process.exit(1);
      }
      
      if ((configCommand.opts() as any).json) {
        console.log(JSON.stringify(value));
      } else {
        console.log(value);
      }
    } catch (error) {
      handleError(error);
    }
  });

// Config set subcommand
configCommand
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action(async (key: string, value: string) => {
    try {
      const configService = ConfigService.getInstance();
      const config = await configService.load();
      
      // Parse value if it looks like JSON
      let parsedValue: any = value;
      if (value.startsWith('{') || value.startsWith('[') || value === 'true' || value === 'false') {
        try {
          parsedValue = JSON.parse(value);
        } catch {
          // Keep as string if JSON parsing fails
        }
      } else if (!isNaN(Number(value))) {
        parsedValue = Number(value);
      }
      
      // Navigate and set the value using dot notation
      const keys = key.split('.');
      const lastKey = keys.pop()!;
      const target = keys.reduce((obj: any, prop) => {
        if (!obj[prop]) obj[prop] = {};
        return obj[prop];
      }, config);
      
      target[lastKey] = parsedValue;
      
      // Save the updated config
      await configService.save(config);
      
      console.log(chalk.green(`✓ Set ${key} = ${JSON.stringify(parsedValue)}`));
    } catch (error) {
      handleError(error);
    }
  });

// Config validate subcommand
configCommand
  .command('validate')
  .description('Validate current configuration')
  .action(async () => {
    try {
      const configService = ConfigService.getInstance();
      const validation = await configService.validate();
      
      if (validation.valid) {
        console.log(chalk.green('✓ Configuration is valid'));
      } else {
        console.log(chalk.red('✗ Configuration validation failed:'));
        validation.errors.forEach(error => {
          console.log(chalk.yellow(`  - ${error}`));
        });
        process.exit(1);
      }
    } catch (error) {
      handleError(error);
    }
  });

// Config export subcommand
configCommand
  .command('export [file]')
  .description('Export configuration to file')
  .option('--format <format>', 'Output format (yaml, json)', 'yaml')
  .action(async (file?: string, options?: any) => {
    try {
      const configService = ConfigService.getInstance();
      const config = await configService.load();
      
      let output: string;
      if (options.format === 'json') {
        output = JSON.stringify(config, null, 2);
      } else {
        output = yaml.stringify(config);
      }
      
      if (file) {
        await fs.writeFile(file, output);
        console.log(chalk.green(`✓ Configuration exported to ${file}`));
      } else {
        console.log(output);
      }
    } catch (error) {
      handleError(error);
    }
  });

// Config import subcommand
configCommand
  .command('import <file>')
  .description('Import configuration from file')
  .option('--merge', 'Merge with existing config instead of replacing')
  .action(async (file: string, options) => {
    try {
      const configService = ConfigService.getInstance();
      const fileContent = await fs.readFile(file, 'utf-8');
      
      let importedConfig: any;
      if (file.endsWith('.json')) {
        importedConfig = JSON.parse(fileContent);
      } else {
        importedConfig = yaml.parse(fileContent);
      }
      
      if (options.merge) {
        const currentConfig = await configService.load();
        // Deep merge the configs
        const mergedConfig = deepMerge(currentConfig, importedConfig);
        await configService.save(mergedConfig);
        console.log(chalk.green('✓ Configuration merged successfully'));
      } else {
        await configService.save(importedConfig);
        console.log(chalk.green('✓ Configuration imported successfully'));
      }
    } catch (error) {
      handleError(error);
    }
  });

// Config reset subcommand
configCommand
  .command('reset')
  .description('Reset configuration to defaults')
  .option('--force', 'Skip confirmation')
  .action(async (options) => {
    try {
      if (!options.force) {
        console.log(chalk.yellow('⚠️  This will reset all configuration to defaults.'));
        console.log(chalk.yellow('   Use --force to skip this confirmation.'));
        process.exit(1);
      }
      
      const configService = ConfigService.getInstance();
      await configService.reset();
      console.log(chalk.green('✓ Configuration reset to defaults'));
    } catch (error) {
      handleError(error);
    }
  });

// Helper function for deep merging objects
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  
  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

export default configCommand;