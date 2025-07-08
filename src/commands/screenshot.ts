import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
import * as path from 'path';
const glob = require('glob');
import { ScreenshotService } from '../services/screenshot';
import { ConfigService } from '../services/config';
import { handleError } from '../utils/errors';

export const screenshotCommand = new Command('screenshot')
  .description('Generate code screenshots')
  .argument('[file]', 'File to screenshot')
  .option('-o, --output <path>', 'Output file path')
  .option('-t, --theme <theme>', 'Theme to use')
  .option('-s, --shader <shader>', 'Shader effect to apply')
  .option('-l, --lines <range>', 'Line range (e.g., "10-20")')
  .option('--glob <pattern>', 'Process multiple files with glob pattern')
  .option('--output-dir <dir>', 'Output directory for batch processing')
  .option('--list-themes', 'List available themes')
  .option('--list-shaders', 'List available shaders')
  .option('--width <width>', 'Screenshot width', '800')
  .option('--font-size <size>', 'Font size', '16')
  .option('--no-window-controls', 'Hide window controls')
  .option('--line-numbers', 'Show line numbers')
  .option('--padding <padding>', 'Outer padding', '60')
  .option('--dry-run', 'Show what would be done without creating files')
  .action(async (file?: string, options?: any) => {
    try {
      const configService = ConfigService.getInstance();
      const config = await configService.load();
      const screenshotService = ScreenshotService.getInstance();

      // Handle list options
      if (options.listThemes) {
        const themes = screenshotService.getAvailableThemes();
        console.log(chalk.cyan('Available themes:'));
        themes.forEach(theme => {
          console.log(`  - ${theme}`);
        });
        return;
      }

      if (options.listShaders) {
        const shaders = ['wave-gradient', 'halftone', 'disruptor', 'matrix', 'cyberpunk'];
        console.log(chalk.cyan('Available shaders:'));
        shaders.forEach(shader => {
          console.log(`  - ${shader}`);
        });
        return;
      }

      // Handle batch processing with glob
      if (options.glob) {
        await processBatch(options.glob, options, config, screenshotService);
        return;
      }

      // Single file processing
      if (!file) {
        console.error(chalk.red('Error: File path or --glob pattern required'));
        process.exit(1);
      }

      await processSingleFile(file, options, config, screenshotService);
    } catch (error) {
      handleError(error);
    }
  });

async function processSingleFile(
  file: string,
  options: any,
  config: any,
  screenshotService: ScreenshotService
): Promise<void> {
  const spinner = ora('Generating screenshot...').start();

  try {
    // Read code from file
    const { code, language } = await screenshotService.readCodeFile(file, options.lines);

    // Prepare screenshot config
    const screenshotConfig = {
      ...config.screenshots,
      theme: options.theme || config.screenshots.theme,
      padding: parseInt(options.padding) || config.screenshots.padding
    };

    // Prepare screenshot options
    const screenshotOptions = {
      windowControls: options.windowControls !== false,
      lineNumbers: options.lineNumbers || false,
      width: parseInt(options.width),
      fontSize: parseInt(options.fontSize),
      shader: options.shader
    };

    if (options.dryRun) {
      spinner.stop();
      console.log(chalk.yellow('Dry run - would generate:'));
      console.log(`  File: ${file}`);
      console.log(`  Theme: ${screenshotConfig.theme}`);
      console.log(`  Shader: ${options.shader || 'none'}`);
      console.log(`  Output: ${options.output || 'screenshot.png'}`);
      return;
    }

    // Generate screenshot
    const buffer = await screenshotService.generateCodeScreenshot(
      code,
      language,
      screenshotConfig,
      screenshotOptions
    );

    // Save screenshot
    const outputPath = options.output || `screenshot-${Date.now()}.png`;
    await fs.writeFile(outputPath, buffer);

    spinner.succeed(chalk.green(`Screenshot saved to ${outputPath}`));
  } catch (error) {
    spinner.fail(chalk.red('Failed to generate screenshot'));
    throw error;
  }
}

async function processBatch(
  pattern: string,
  options: any,
  config: any,
  screenshotService: ScreenshotService
): Promise<void> {
  const spinner = ora('Finding files...').start();

  try {
    // Find files matching pattern
    const files = await new Promise<string[]>((resolve, reject) => {
      glob(pattern, { ignore: ['node_modules/**', '.git/**'] }, (err: Error | null, matches: string[]) => {
        if (err) reject(err);
        else resolve(matches);
      });
    });
    
    if (files.length === 0) {
      spinner.fail(chalk.yellow('No files found matching pattern'));
      return;
    }

    spinner.succeed(chalk.green(`Found ${files.length} files`));

    // Create output directory if specified
    if (options.outputDir && !options.dryRun) {
      await fs.mkdir(options.outputDir, { recursive: true });
    }

    // Process each file
    let processed = 0;
    let failed = 0;

    for (const file of files) {
      const fileSpinner = ora(`Processing ${file}...`).start();

      try {
        // Read code from file
        const { code, language } = await screenshotService.readCodeFile(file);

        // Prepare screenshot config
        const screenshotConfig = {
          ...config.screenshots,
          theme: options.theme || config.screenshots.theme,
          padding: parseInt(options.padding) || config.screenshots.padding
        };

        // Prepare screenshot options
        const screenshotOptions = {
          windowControls: options.windowControls !== false,
          lineNumbers: options.lineNumbers || false,
          width: parseInt(options.width),
          fontSize: parseInt(options.fontSize),
          shader: options.shader
        };

        // Generate output filename
        const baseName = path.basename(file, path.extname(file));
        const outputName = `${baseName}-screenshot.png`;
        const outputPath = options.outputDir 
          ? path.join(options.outputDir, outputName)
          : outputName;

        if (options.dryRun) {
          fileSpinner.succeed(chalk.yellow(`[DRY RUN] Would create: ${outputPath}`));
          processed++;
          continue;
        }

        // Generate screenshot
        const buffer = await screenshotService.generateCodeScreenshot(
          code,
          language,
          screenshotConfig,
          screenshotOptions
        );

        // Save screenshot
        await fs.writeFile(outputPath, buffer);

        fileSpinner.succeed(chalk.green(`✓ ${file} → ${outputPath}`));
        processed++;
      } catch (error) {
        fileSpinner.fail(chalk.red(`✗ ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`));
        failed++;
      }
    }

    // Summary
    console.log('');
    console.log(chalk.cyan('Summary:'));
    console.log(`  Processed: ${chalk.green(processed)}`);
    if (failed > 0) {
      console.log(`  Failed: ${chalk.red(failed)}`);
    }
  } catch (error) {
    spinner.fail(chalk.red('Batch processing failed'));
    throw error;
  }
}

export default screenshotCommand;