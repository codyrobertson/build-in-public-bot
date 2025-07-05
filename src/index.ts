// Main exports for programmatic usage
export { AIService } from './services/ai';
export { TwitterService } from './services/twitter';
export { ScreenshotService } from './services/screenshot';
export { ConfigService } from './services/config';
export { StorageService } from './services/storage';
export { WatcherService } from './services/watcher';
export { ContextAnalyzerService } from './services/context-analyzer';

// Export types
export * from './types';
export * from './utils/errors';

// Export version
import { version } from '../package.json';
export { version };