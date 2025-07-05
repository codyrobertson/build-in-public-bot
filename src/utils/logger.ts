import chalk from 'chalk';
import ora, { Ora } from 'ora';

export class Logger {
  private spinner: Ora | null = null;

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  error(message: string, error?: any): void {
    console.error(chalk.red('✗'), message);
    if (error && process.env.DEBUG === 'true') {
      console.error(chalk.gray('[DEBUG]'), error);
    }
  }

  warn(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  }

  startSpinner(message: string): void {
    this.spinner = ora(message).start();
  }

  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  stopSpinner(success: boolean = true, message?: string): void {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(message);
      } else {
        this.spinner.fail(message);
      }
      this.spinner = null;
    }
  }

  log(message: string): void {
    console.log(message);
  }

  debug(message: string, data?: any): void {
    if (process.env.DEBUG === 'true') {
      console.log(chalk.gray('[DEBUG]'), message);
      if (data) {
        console.log(chalk.gray('[DEBUG]'), data);
      }
    }
  }
}

export const logger = new Logger();