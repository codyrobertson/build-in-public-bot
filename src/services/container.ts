/**
 * Service Container for Dependency Injection
 * 
 * Provides a structured way to compose and access services with proper
 * dependency management and lifecycle control.
 */

import {
  IScreenshotService,
  ITwitterService,
  IAIService,
  IConfigService,
  IStorageService,
  IThemeService,
  IShaderRenderer,
  IEmojiRenderer,
  IWatcherService,
  IContextAnalyzer
} from './interfaces';
import { ServiceRegistry } from './registry';
import { logger } from '../utils/logger';

export class ServiceContainer {
  private services: Map<string, any> = new Map();
  private initialized = false;

  constructor(
    public screenshot: IScreenshotService,
    public twitter: ITwitterService,
    public ai: IAIService,
    public config: IConfigService,
    public storage: IStorageService,
    public theme: IThemeService,
    public shader: IShaderRenderer,
    public emoji: IEmojiRenderer,
    public watcher: IWatcherService,
    public contextAnalyzer: IContextAnalyzer
  ) {
    // Store services in map for dynamic access
    this.services.set('screenshot', screenshot);
    this.services.set('twitter', twitter);
    this.services.set('ai', ai);
    this.services.set('config', config);
    this.services.set('storage', storage);
    this.services.set('theme', theme);
    this.services.set('shader', shader);
    this.services.set('emoji', emoji);
    this.services.set('watcher', watcher);
    this.services.set('contextAnalyzer', contextAnalyzer);
  }

  /**
   * Create container with default service implementations
   */
  static async create(): Promise<ServiceContainer> {
    try {
      // Dynamic imports to avoid circular dependencies
      const { ScreenshotService } = await import('./screenshot');
      const { TwitterService } = await import('./twitter');
      const { AIService } = await import('./ai');
      const { ConfigService } = await import('./config');
      const { StorageService } = await import('./storage');
      const { ThemeLoader } = await import('../themes/theme-loader');
      const { ShaderRenderer } = await import('./shader-renderer');
      const { EmojiRenderer } = await import('./emoji-renderer');
      
      // Create placeholder services for optional ones
      const WatcherService = (await import('./watcher')).default || class { 
        async startWatching() {}
        async stopWatching() {}
        isWatching() { return false; }
      };
      
      const ContextAnalyzerService = (await import('./context-analyzer')).default || class {
        async analyzeFile() { return {}; }
        extractKeywords() { return []; }
        async generateSummary() { return ''; }
      };

      const container = new ServiceContainer(
        ScreenshotService.getInstance(),
        await TwitterService.getInstance(),
        AIService.getInstance(),
        ConfigService.getInstance(),
        StorageService.getInstance(),
        ThemeLoader.getInstance(),
        ShaderRenderer.getInstance(),
        EmojiRenderer.getInstance(),
        new WatcherService(),
        new ContextAnalyzerService()
      );

      await container.initialize();
      return container;
    } catch (error) {
      logger.error('Failed to create service container:', error);
      throw new Error(`Service container creation failed: ${error}`);
    }
  }

  /**
   * Create container from service registry
   */
  static createFromRegistry(): ServiceContainer {
    return new ServiceContainer(
      ServiceRegistry.get<IScreenshotService>('screenshot'),
      ServiceRegistry.get<ITwitterService>('twitter'),
      ServiceRegistry.get<IAIService>('ai'),
      ServiceRegistry.get<IConfigService>('config'),
      ServiceRegistry.get<IStorageService>('storage'),
      ServiceRegistry.get<IThemeService>('theme'),
      ServiceRegistry.get<IShaderRenderer>('shader'),
      ServiceRegistry.get<IEmojiRenderer>('emoji'),
      ServiceRegistry.get<IWatcherService>('watcher'),
      ServiceRegistry.get<IContextAnalyzer>('contextAnalyzer')
    );
  }

  /**
   * Initialize all services that need initialization
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.debug('Initializing service container...');

      // Initialize services that have initialization methods
      const initPromises: Promise<any>[] = [];

      // Config service typically needs to be initialized first
      if ('init' in this.config && typeof this.config.init === 'function') {
        try {
          await this.config.load(); // Load existing config if available
        } catch (error) {
          logger.debug('No existing config found, will create on first use');
        }
      }

      await Promise.all(initPromises);
      
      this.initialized = true;
      logger.debug('Service container initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize service container:', error);
      throw error;
    }
  }

  /**
   * Get service by name with type safety
   */
  getService<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }
    return service as T;
  }

  /**
   * Check if container is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get all service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Dispose of all services (cleanup)
   */
  async dispose(): Promise<void> {
    logger.debug('Disposing service container...');

    // Stop any running services
    if (this.watcher.isWatching()) {
      await this.watcher.stopWatching();
    }

    // Clear any caches or connections
    const disposePromises = Array.from(this.services.values())
      .filter(service => service && typeof service.dispose === 'function')
      .map(service => service.dispose());

    await Promise.all(disposePromises);
    
    this.services.clear();
    this.initialized = false;
    
    logger.debug('Service container disposed');
  }
}

// Global container instance
let globalContainer: ServiceContainer | null = null;

/**
 * Get or create the global service container
 */
export async function getServiceContainer(): Promise<ServiceContainer> {
  if (!globalContainer) {
    globalContainer = await ServiceContainer.create();
  }
  return globalContainer;
}

/**
 * Set the global service container (useful for testing)
 */
export function setServiceContainer(container: ServiceContainer): void {
  globalContainer = container;
}

/**
 * Clear the global service container
 */
export function clearServiceContainer(): void {
  globalContainer = null;
}