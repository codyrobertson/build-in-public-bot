export class BipError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BipError';
  }
}

export class ConfigError extends BipError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

export class TwitterError extends BipError {
  constructor(message: string, details?: any) {
    super(message, 'TWITTER_ERROR', details);
    this.name = 'TwitterError';
  }
}

export class AIError extends BipError {
  constructor(message: string, details?: any) {
    super(message, 'AI_ERROR', details);
    this.name = 'AIError';
  }
}

export class FileError extends BipError {
  constructor(message: string, details?: any) {
    super(message, 'FILE_ERROR', details);
    this.name = 'FileError';
  }
}

export class ScreenshotError extends BipError {
  constructor(message: string, details?: any) {
    super(message, 'SCREENSHOT_ERROR', details);
    this.name = 'ScreenshotError';
  }
}

export class StorageError extends BipError {
  constructor(message: string, details?: any) {
    super(message, 'STORAGE_ERROR', details);
    this.name = 'StorageError';
  }
}

export function handleError(error: unknown): void {
  if (error instanceof BipError) {
    console.error(`Error: ${error.message}`);
    if (error.details && process.env.DEBUG === 'true') {
      console.error('Details:', error.details);
    }
    process.exit(1);
  } else if (error instanceof Error) {
    console.error(`Unexpected error: ${error.message}`);
    if (process.env.DEBUG === 'true') {
      console.error(error.stack);
    }
    process.exit(1);
  } else {
    console.error('An unknown error occurred');
    process.exit(1);
  }
}