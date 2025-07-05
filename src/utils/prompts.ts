import readline from 'readline';
import chalk from 'chalk';

interface PromptOptions {
  default?: string;
  mask?: boolean;
  validate?: (input: string) => boolean | string;
}

export async function prompt(message: string, options: PromptOptions = {}): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const displayMessage = options.default 
      ? `${message} ${chalk.gray(`(${options.default})`)}: `
      : `${message}: `;

    rl.question(displayMessage, (answer) => {
      rl.close();
      const value = answer.trim() || options.default || '';
      
      if (options.validate) {
        const validation = options.validate(value);
        if (validation !== true) {
          console.log(chalk.red(validation || 'Invalid input'));
          resolve(prompt(message, options));
          return;
        }
      }
      
      resolve(value);
    });

    if (options.mask) {
      (rl as any)._writeToOutput = function _writeToOutput(stringToWrite: string) {
        if (stringToWrite.includes(displayMessage)) {
          (rl as any).output.write(stringToWrite);
        } else {
          (rl as any).output.write('*');
        }
      };
    }
  });
}

export async function confirm(message: string, defaultValue: boolean = false): Promise<boolean> {
  const defaultHint = defaultValue ? 'Y/n' : 'y/N';
  const answer = await prompt(`${message} ${chalk.gray(`(${defaultHint})`)}`, {
    default: defaultValue ? 'y' : 'n'
  });
  
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

export async function select<T extends string>(
  message: string, 
  choices: { value: T; label: string }[]
): Promise<T> {
  console.log(`\n${message}`);
  choices.forEach((choice, index) => {
    console.log(`  ${chalk.cyan(`${index + 1})`)} ${choice.label}`);
  });
  console.log();

  const answer = await prompt('Select an option', {
    validate: (input) => {
      const num = parseInt(input, 10);
      if (isNaN(num) || num < 1 || num > choices.length) {
        return `Please enter a number between 1 and ${choices.length}`;
      }
      return true;
    }
  });

  return choices[parseInt(answer, 10) - 1].value;
}