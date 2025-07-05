import { Command } from 'commander';
import chalk from 'chalk';
import { prompt } from '../utils/prompts';
import { logger } from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export const setupApiCommand = new Command('setup-api')
  .description('Set up or update your OpenRouter API key')
  .action(async () => {
    console.log(chalk.bold('\n🔑 API Key Setup\n'));
    
    // Check current status
    if (process.env.OPENROUTER_API_KEY) {
      const currentKey = process.env.OPENROUTER_API_KEY;
      const maskedKey = currentKey.slice(0, 8) + '...' + currentKey.slice(-4);
      console.log(chalk.green(`✅ Current API key: ${maskedKey}`));
      
      const update = await prompt('Do you want to update it? (y/n)', {
        validate: (input) => ['y', 'n', 'yes', 'no'].includes(input.toLowerCase())
      });
      
      if (update.toLowerCase() === 'n' || update.toLowerCase() === 'no') {
        return;
      }
    } else {
      console.log(chalk.yellow('⚠️  No API key currently configured'));
    }
    
    console.log(chalk.dim('\nTo get an API key:'));
    console.log(chalk.dim('1. Visit https://openrouter.ai'));
    console.log(chalk.dim('2. Sign up for a free account'));
    console.log(chalk.dim('3. Copy your API key from the dashboard\n'));
    
    const apiKey = await prompt('Paste your OpenRouter API key', {
      mask: true,
      validate: (input) => {
        if (!input) return 'API key is required';
        if (input.length < 20) return 'Invalid API key format';
        if (!input.startsWith('sk-')) return 'API key should start with "sk-"';
        return true;
      }
    });
    
    // Save to .env file
    const envPath = path.join(process.cwd(), '.env');
    
    try {
      let envContent = '';
      try {
        envContent = await fs.readFile(envPath, 'utf-8');
      } catch {
        // File doesn't exist, create it
        console.log(chalk.dim('Creating .env file...'));
      }
      
      if (envContent.includes('OPENROUTER_API_KEY')) {
        // Update existing
        envContent = envContent.replace(/OPENROUTER_API_KEY=.*/, `OPENROUTER_API_KEY=${apiKey}`);
        console.log(chalk.green('✅ Updated existing API key in .env file'));
      } else {
        // Add new
        envContent += `${envContent ? '\n' : ''}OPENROUTER_API_KEY=${apiKey}\n`;
        console.log(chalk.green('✅ Added API key to .env file'));
      }
      
      await fs.writeFile(envPath, envContent);
      process.env.OPENROUTER_API_KEY = apiKey;
      
      // Add .env to .gitignore if not already there
      try {
        const gitignorePath = path.join(process.cwd(), '.gitignore');
        let gitignoreContent = '';
        
        try {
          gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
        } catch {
          // No .gitignore file
        }
        
        if (!gitignoreContent.includes('.env')) {
          gitignoreContent += `${gitignoreContent ? '\n' : ''}# Environment variables\n.env\n`;
          await fs.writeFile(gitignorePath, gitignoreContent);
          console.log(chalk.dim('✓ Added .env to .gitignore'));
        }
      } catch {
        // Ignore .gitignore errors
      }
      
      console.log(chalk.green('\n✅ API key setup complete!'));
      console.log(chalk.dim('\nYou can now use AI-powered tweet generation.'));
      
    } catch (error) {
      logger.error('Failed to save API key to .env file');
      console.log(chalk.yellow('\n⚠️  Could not save to .env file automatically'));
      console.log(chalk.dim('\nAdd this to your .env file manually:'));
      console.log(chalk.cyan(`OPENROUTER_API_KEY=${apiKey}`));
      console.log(chalk.dim('\nOr add to your shell profile (~/.bashrc or ~/.zshrc):'));
      console.log(chalk.cyan(`export OPENROUTER_API_KEY="${apiKey}"`));
    }
  });