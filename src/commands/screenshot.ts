import { logger } from '../utils/logger';
import { ConfigService } from '../services/config';
import { ScreenshotService } from '../services/screenshot';
import chalk from 'chalk';
import open from 'open';
import clipboardy from 'clipboardy';

export async function screenshotCommand(
  file: string, 
  options: any
): Promise<void> {
  const configService = ConfigService.getInstance();
  const screenshotService = ScreenshotService.getInstance();

  try {
    // List available themes if requested
    if (options.listThemes) {
      console.log('\n' + chalk.bold('Available Themes:'));
      const themes = screenshotService.getAvailableThemes();
      themes.forEach(theme => console.log(chalk.gray(`  • ${theme}`)));
      console.log(chalk.dim(`\n${themes.length} themes available. Use --info <theme> for details.`));
      console.log(chalk.dim('Custom themes can be added to .bip-themes/ directory.'));
      return;
    }

    // Show theme info if requested
    if (options.themeInfo) {
      const themeLoader = (screenshotService as any).themeLoader;
      const theme = themeLoader.getThemeInfo(options.themeInfo);
      if (!theme) {
        console.log(chalk.red(`Theme '${options.themeInfo}' not found.`));
        console.log(chalk.gray('Use --list to see available themes.'));
        return;
      }
      
      console.log('\n' + chalk.bold(`Theme: ${theme.name}`));
      if (theme.author) console.log(chalk.gray(`Author: ${theme.author}`));
      console.log(chalk.gray(`Variant: ${theme.variant}`));
      console.log('\n' + chalk.bold('Colors:'));
      console.log(chalk.hex(theme.background)(`  Background: ${theme.background} ███`));
      console.log(chalk.hex(theme.foreground)(`  Foreground: ${theme.foreground} ███`));
      console.log(chalk.hex(theme.comment)(`  Comment: ${theme.comment} ███`));
      console.log(chalk.hex(theme.string)(`  String: ${theme.string} ███`));
      console.log(chalk.hex(theme.keyword)(`  Keyword: ${theme.keyword} ███`));
      console.log(chalk.hex(theme.function)(`  Function: ${theme.function} ███`));
      console.log(chalk.hex(theme.type)(`  Type: ${theme.type} ███`));
      return;
    }

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
    console.log(chalk.gray(`Lines: ${code.split('\n').length}`));
    
    // Display options
    console.log('\n' + chalk.bold('Screenshot Options:'));
    console.log(chalk.gray(`Theme: ${options.theme || config.screenshots.theme}`));
    console.log(chalk.gray(`Background: ${options.bg || config.screenshots.backgroundColor}`));
    console.log(chalk.gray(`Line Numbers: ${options.lineNumbers ? 'Yes' : 'No'}`));
    console.log(chalk.gray(`Window Controls: ${options.window !== false ? 'Yes' : 'No'}`));
    console.log(chalk.gray(`Font Size: ${options.fontSize || '14px'}`));
    console.log(chalk.gray(`Font Family: ${options.font || 'Fira Code'}`));
    console.log(chalk.gray(`Line Wrap: ${options.wrap !== false ? 'Yes' : 'No'}`));
    if (options.width) {
      console.log(chalk.gray(`Width: ${options.width}px`));
    }
    console.log('');

    // Generate screenshot
    logger.startSpinner('Generating code screenshot...');
    const screenshotBuffer = await screenshotService.generateCodeScreenshot(
      code,
      language,
      config.screenshots,
      {
        backgroundColor: options.bg,
        theme: options.theme,
        lineNumbers: options.lineNumbers,
        windowControls: options.window !== false,
        fontSize: options.fontSize,
        fontFamily: options.font,
        lineWrap: options.wrap !== false,
        width: options.width ? parseInt(options.width, 10) : undefined,
        padding: options.padding ? parseInt(options.padding, 10) : undefined,
        gradient: options.gradient !== false,
        shader: options.shader,
        shaderParams: {
          intensity: options.shaderIntensity ? parseFloat(options.shaderIntensity) : undefined,
          scale: options.shaderScale ? parseFloat(options.shaderScale) : undefined
        }
      }
    );
    const screenshotPath = await screenshotService.saveScreenshot(screenshotBuffer);
    logger.stopSpinner(true, 'Screenshot generated!');

    // Display save location with camera emoji
    console.log(chalk.green('\n📷 Screenshot saved to:'));
    console.log(chalk.cyan(`   ${screenshotPath}`));
    
    // Copy to clipboard if requested
    if (options.copy || options.clipboard) {
      try {
        await clipboardy.write(screenshotPath);
        console.log(chalk.green('\n📋 Path copied to clipboard!'));
      } catch (error) {
        logger.warn('Failed to copy path to clipboard');
      }
    } else {
      // Show keyboard shortcut hint
      const shortcut = process.platform === 'darwin' ? 'Cmd+Shift+C' : 'Ctrl+Shift+C';
      console.log(chalk.gray(`\n💡 Tip: Use -c flag or press ${shortcut} to copy path to clipboard`));
    }

    // Open in default image viewer if requested
    if (options.open) {
      logger.info('Opening screenshot in default viewer...');
      await open(screenshotPath);
    }

  } catch (error) {
    logger.error('Failed to generate screenshot');
    throw error;
  }
}