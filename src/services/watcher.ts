import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '../utils/logger';

export interface FileChange {
  type: 'add' | 'change' | 'unlink';
  path: string;
  content?: string;
  timestamp: Date;
}

export class WatcherService extends EventEmitter {
  private static instance: WatcherService;
  private watcher: chokidar.FSWatcher | null = null;
  private ignoredPatterns = [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**',
    '**/*.log',
    '**/.DS_Store',
    '**/package-lock.json',
    '**/yarn.lock',
  ];

  private constructor() {
    super();
  }

  static getInstance(): WatcherService {
    if (!WatcherService.instance) {
      WatcherService.instance = new WatcherService();
    }
    return WatcherService.instance;
  }

  async start(watchPath: string = process.cwd()): Promise<void> {
    if (this.watcher) {
      await this.stop();
    }

    logger.info(`Starting file watcher on: ${watchPath}`);

    this.watcher = chokidar.watch(watchPath, {
      ignored: this.ignoredPatterns,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (filePath) => this.handleFileEvent('add', filePath))
      .on('change', (filePath) => this.handleFileEvent('change', filePath))
      .on('unlink', (filePath) => this.handleFileEvent('unlink', filePath))
      .on('error', (error) => logger.error('Watcher error:', error));

    // Wait for the watcher to be ready
    await new Promise<void>((resolve) => {
      this.watcher!.on('ready', () => {
        logger.info('File watcher is ready');
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      logger.info('File watcher stopped');
    }
  }

  private async handleFileEvent(
    type: 'add' | 'change' | 'unlink',
    filePath: string
  ): Promise<void> {
    try {
      const change: FileChange = {
        type,
        path: filePath,
        timestamp: new Date(),
      };

      // For add and change events, read the file content
      if (type !== 'unlink' && this.isCodeFile(filePath)) {
        try {
          change.content = await fs.readFile(filePath, 'utf-8');
        } catch (error) {
          logger.debug(`Could not read file ${filePath}:`, error);
        }
      }

      this.emit('fileChange', change);
    } catch (error) {
      logger.error(`Error handling file event for ${filePath}:`, error);
    }
  }

  private isCodeFile(filePath: string): boolean {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
      '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
      '.html', '.css', '.scss', '.sass', '.less', '.vue', '.svelte',
    ];

    const ext = path.extname(filePath).toLowerCase();
    return codeExtensions.includes(ext);
  }

  addIgnorePattern(pattern: string): void {
    this.ignoredPatterns.push(pattern);
    
    // If watcher is running, restart it to apply new pattern
    if (this.watcher) {
      const watchPath = this.watcher.options.cwd || process.cwd();
      this.stop().then(() => this.start(watchPath));
    }
  }

  removeIgnorePattern(pattern: string): void {
    const index = this.ignoredPatterns.indexOf(pattern);
    if (index > -1) {
      this.ignoredPatterns.splice(index, 1);
      
      // If watcher is running, restart it
      if (this.watcher) {
        const watchPath = this.watcher.options.cwd || process.cwd();
        this.stop().then(() => this.start(watchPath));
      }
    }
  }

  getIgnorePatterns(): string[] {
    return [...this.ignoredPatterns];
  }

  isWatching(): boolean {
    return this.watcher !== null;
  }
}