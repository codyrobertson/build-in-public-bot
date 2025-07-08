import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigService } from '../services/config';
import { ScreenshotService } from '../services/screenshot';
import { StorageService } from '../services/storage';
import { handleError } from '../utils/errors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message: string;
  details?: string[];
}

export const doctorCommand = new Command('doctor')
  .description('Run health checks on your build-in-public bot setup')
  .option('--fix', 'Attempt to fix issues automatically')
  .option('--json', 'Output results in JSON format')
  .action(async (options) => {
    try {
      const checks: HealthCheck[] = [];
      
      if (!options.json) {
        console.log(chalk.cyan.bold('\n🩺 Running Build-in-Public Bot Health Checks...\n'));
      }

      // Configuration checks
      await runConfigChecks(checks, options);
      
      // Dependency checks
      await runDependencyChecks(checks, options);
      
      // Authentication checks
      await runAuthChecks(checks, options);
      
      // Directory and file checks
      await runFileSystemChecks(checks, options);
      
      // Service checks
      await runServiceChecks(checks, options);
      
      // Display results
      if (options.json) {
        console.log(JSON.stringify({ checks, summary: generateSummary(checks) }, null, 2));
      } else {
        displayResults(checks);
      }
      
      // Exit with error if any critical checks failed
      const failedCritical = checks.filter(c => c.status === 'fail');
      if (failedCritical.length > 0) {
        process.exit(1);
      }
    } catch (error) {
      handleError(error);
    }
  });

async function runConfigChecks(checks: HealthCheck[], options: any): Promise<void> {
  const spinner = options.json ? null : ora('Checking configuration...').start();
  
  try {
    const configService = ConfigService.getInstance();
    
    // Check if config exists
    try {
      await fs.access(configService.getConfigPath());
      
      // Validate config
      const validation = await configService.validate();
      
      if (validation.valid) {
        checks.push({
          name: 'Configuration',
          status: 'pass',
          message: 'Configuration is valid'
        });
      } else {
        checks.push({
          name: 'Configuration',
          status: 'fail',
          message: 'Configuration validation failed',
          details: validation.errors
        });
        
        if (options.fix) {
          if (spinner) {
          spinner.text = 'Attempting to fix configuration...';
        }
          // Run init command to fix
          checks.push({
            name: 'Configuration Fix',
            status: 'warn',
            message: 'Run "bip init" to fix configuration issues'
          });
        }
      }
    } catch (error) {
      checks.push({
        name: 'Configuration',
        status: 'fail',
        message: 'Configuration file not found',
        details: ['Run "bip init" to create configuration']
      });
    }
    
    spinner?.succeed();
  } catch (error) {
    spinner?.fail();
    checks.push({
      name: 'Configuration',
      status: 'fail',
      message: 'Failed to check configuration',
      details: [error instanceof Error ? error.message : 'Unknown error']
    });
  }
}

async function runDependencyChecks(checks: HealthCheck[], options: any): Promise<void> {
  const spinner = options.json ? null : ora('Checking dependencies...').start();
  
  try {
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    
    if (majorVersion >= 16) {
      checks.push({
        name: 'Node.js Version',
        status: 'pass',
        message: `Node.js ${nodeVersion} is supported`
      });
    } else {
      checks.push({
        name: 'Node.js Version',
        status: 'fail',
        message: `Node.js ${nodeVersion} is too old`,
        details: ['Requires Node.js 16.0.0 or higher']
      });
    }
    
    // Check Canvas dependencies
    try {
      require('canvas');
      checks.push({
        name: 'Canvas Dependencies',
        status: 'pass',
        message: 'Canvas module is properly installed'
      });
    } catch (error) {
      checks.push({
        name: 'Canvas Dependencies',
        status: 'fail',
        message: 'Canvas module not found or improperly installed',
        details: [
          'Canvas requires system dependencies.',
          'On macOS: brew install pkg-config cairo pango libpng jpeg giflib librsvg',
          'On Ubuntu: sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev'
        ]
      });
    }
    
    // Check for TypeScript
    try {
      await execAsync('npx tsc --version');
      checks.push({
        name: 'TypeScript',
        status: 'pass',
        message: 'TypeScript compiler is available'
      });
    } catch (error) {
      checks.push({
        name: 'TypeScript',
        status: 'warn',
        message: 'TypeScript compiler not found',
        details: ['Run "npm install" to install dependencies']
      });
    }
    
    spinner?.succeed();
  } catch (error) {
    spinner?.fail();
    checks.push({
      name: 'Dependencies',
      status: 'fail',
      message: 'Failed to check dependencies',
      details: [error instanceof Error ? error.message : 'Unknown error']
    });
  }
}

async function runAuthChecks(checks: HealthCheck[], options: any): Promise<void> {
  const spinner = options.json ? null : ora('Checking authentication...').start();
  
  try {
    const configService = ConfigService.getInstance();
    let config;
    
    try {
      config = await configService.load();
    } catch {
      checks.push({
        name: 'Authentication',
        status: 'skip',
        message: 'Skipped - configuration not available'
      });
      spinner?.succeed();
      return;
    }
    
    // Check AI API key
    if (config.ai?.apiKey) {
      checks.push({
        name: 'AI API Key',
        status: 'pass',
        message: 'AI API key is configured'
      });
    } else {
      checks.push({
        name: 'AI API Key',
        status: 'fail',
        message: 'AI API key is missing',
        details: ['Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable']
      });
    }
    
    // Check Twitter auth
    if (config.twitter?.sessionData) {
      checks.push({
        name: 'Twitter Authentication',
        status: 'pass',
        message: 'Twitter session data is present'
      });
    } else {
      checks.push({
        name: 'Twitter Authentication',
        status: 'warn',
        message: 'Twitter not authenticated',
        details: ['Run "bip setup browser" to authenticate with Twitter']
      });
    }
    
    spinner?.succeed();
  } catch (error) {
    spinner?.fail();
    checks.push({
      name: 'Authentication',
      status: 'fail',
      message: 'Failed to check authentication',
      details: [error instanceof Error ? error.message : 'Unknown error']
    });
  }
}

async function runFileSystemChecks(checks: HealthCheck[], options: any): Promise<void> {
  const spinner = options.json ? null : ora('Checking file system...').start();
  
  try {
    const configService = ConfigService.getInstance();
    
    // Check config directory
    try {
      await fs.access(configService.getConfigDir());
      checks.push({
        name: 'Config Directory',
        status: 'pass',
        message: `Config directory exists: ${configService.getConfigDir()}`
      });
    } catch {
      checks.push({
        name: 'Config Directory',
        status: 'fail',
        message: 'Config directory not found',
        details: [`Expected at: ${configService.getConfigDir()}`]
      });
      
      if (options.fix) {
        await fs.mkdir(configService.getConfigDir(), { recursive: true });
        checks.push({
          name: 'Config Directory Fix',
          status: 'pass',
          message: 'Created config directory'
        });
      }
    }
    
    // Check temp directory
    const tempDir = path.join(process.cwd(), '.bip-temp');
    try {
      await fs.access(tempDir);
      const stats = await fs.stat(tempDir);
      if (stats.isDirectory()) {
        checks.push({
          name: 'Temp Directory',
          status: 'pass',
          message: 'Temp directory exists'
        });
      }
    } catch {
      // It's okay if temp directory doesn't exist
      checks.push({
        name: 'Temp Directory',
        status: 'pass',
        message: 'Temp directory will be created when needed'
      });
    }
    
    spinner?.succeed();
  } catch (error) {
    spinner?.fail();
    checks.push({
      name: 'File System',
      status: 'fail',
      message: 'Failed to check file system',
      details: [error instanceof Error ? error.message : 'Unknown error']
    });
  }
}

async function runServiceChecks(checks: HealthCheck[], options: any): Promise<void> {
  const spinner = options.json ? null : ora('Checking services...').start();
  
  try {
    // Check if services can be instantiated
    const services = [
      { name: 'Screenshot Service', getInstance: () => ScreenshotService.getInstance() },
      { name: 'Storage Service', getInstance: () => StorageService.getInstance() },
      { name: 'Config Service', getInstance: () => ConfigService.getInstance() }
    ];
    
    for (const service of services) {
      try {
        service.getInstance();
        checks.push({
          name: service.name,
          status: 'pass',
          message: `${service.name} is functional`
        });
      } catch (error) {
        checks.push({
          name: service.name,
          status: 'fail',
          message: `${service.name} initialization failed`,
          details: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }
    
    spinner?.succeed();
  } catch (error) {
    spinner?.fail();
    checks.push({
      name: 'Services',
      status: 'fail',
      message: 'Failed to check services',
      details: [error instanceof Error ? error.message : 'Unknown error']
    });
  }
}

function displayResults(checks: HealthCheck[]): void {
  console.log(chalk.bold('\nHealth Check Results:\n'));
  
  for (const check of checks) {
    const icon = getStatusIcon(check.status);
    const color = getStatusColor(check.status);
    
    console.log(`${icon} ${color(check.name)}: ${check.message}`);
    
    if (check.details && check.details.length > 0) {
      for (const detail of check.details) {
        console.log(chalk.gray(`    → ${detail}`));
      }
    }
  }
  
  // Summary
  const summary = generateSummary(checks);
  console.log(chalk.bold('\nSummary:'));
  console.log(`  ${chalk.green(`✓ Passed: ${summary.passed}`)}`);
  console.log(`  ${chalk.yellow(`⚠ Warnings: ${summary.warnings}`)}`);
  console.log(`  ${chalk.red(`✗ Failed: ${summary.failed}`)}`);
  console.log(`  ${chalk.gray(`- Skipped: ${summary.skipped}`)}`);
  
  if (summary.failed > 0) {
    console.log(chalk.red('\n⚠️  Some checks failed. Please fix the issues above.'));
  } else if (summary.warnings > 0) {
    console.log(chalk.yellow('\n⚠️  Some warnings were found. Consider addressing them.'));
  } else {
    console.log(chalk.green('\n✅ All checks passed! Your bot is ready to use.'));
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'pass': return chalk.green('✓');
    case 'fail': return chalk.red('✗');
    case 'warn': return chalk.yellow('⚠');
    case 'skip': return chalk.gray('-');
    default: return ' ';
  }
}

function getStatusColor(status: string): (text: string) => string {
  switch (status) {
    case 'pass': return chalk.green;
    case 'fail': return chalk.red;
    case 'warn': return chalk.yellow;
    case 'skip': return chalk.gray;
    default: return chalk.white;
  }
}

function generateSummary(checks: HealthCheck[]): {
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
} {
  return {
    passed: checks.filter(c => c.status === 'pass').length,
    failed: checks.filter(c => c.status === 'fail').length,
    warnings: checks.filter(c => c.status === 'warn').length,
    skipped: checks.filter(c => c.status === 'skip').length
  };
}

export default doctorCommand;