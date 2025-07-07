/**
 * Service Health Check System
 * 
 * Monitors the health of all services and provides diagnostics
 * for troubleshooting and operational monitoring.
 */

import { ServiceHealth, HealthReport, IScreenshotService, ITwitterService, IAIService, IConfigService, IStorageService } from './interfaces';
import { ServiceContainer } from './container';
import { logger } from '../utils/logger';

export class HealthChecker {
  private container: ServiceContainer;

  constructor(container: ServiceContainer) {
    this.container = container;
  }

  /**
   * Perform comprehensive health check of all services
   */
  async checkServices(): Promise<HealthReport> {
    const startTime = Date.now();
    
    logger.debug('Starting service health check...');

    const [
      screenshotHealth,
      twitterHealth,
      aiHealth,
      configHealth,
      storageHealth
    ] = await Promise.allSettled([
      this.checkScreenshot(),
      this.checkTwitter(),
      this.checkAI(),
      this.checkConfig(),
      this.checkStorage()
    ]);

    const services = {
      screenshot: this.extractHealth(screenshotHealth),
      twitter: this.extractHealth(twitterHealth),
      ai: this.extractHealth(aiHealth),
      config: this.extractHealth(configHealth),
      storage: this.extractHealth(storageHealth)
    };

    const overall = this.calculateOverallHealth(services);
    const totalTime = Date.now() - startTime;

    const report: HealthReport = {
      overall: {
        ...overall,
        responseTime: totalTime
      },
      services,
      timestamp: new Date()
    };

    logger.debug(`Health check completed in ${totalTime}ms`, { report });
    return report;
  }

  /**
   * Check screenshot service health
   */
  async checkScreenshot(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test basic functionality
      const themes = this.container.screenshot.getAvailableThemes();
      
      if (!themes || themes.length === 0) {
        return {
          status: 'degraded',
          message: 'No themes available',
          lastChecked: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      // Test simple screenshot generation
      const simpleCode = 'console.log("health check");';
      const config = {
        theme: themes[0],
        backgroundColor: '#1e1e1e',
        windowTheme: 'none' as const,
        padding: 16,
        language: 'auto' as const
      };

      const buffer = await this.container.screenshot.generateCodeScreenshot(
        simpleCode, 
        'javascript', 
        config
      );

      if (!buffer || buffer.length === 0) {
        return {
          status: 'unhealthy',
          message: 'Screenshot generation failed',
          lastChecked: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      return {
        status: 'healthy',
        message: `Generated screenshot (${buffer.length} bytes)`,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `Screenshot service error: ${error.message}`,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check Twitter service health
   */
  async checkTwitter(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const isAuthenticated = await this.container.twitter.isAuthenticated();
      
      if (!isAuthenticated) {
        return {
          status: 'degraded',
          message: 'Not authenticated with Twitter',
          lastChecked: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      return {
        status: 'healthy',
        message: 'Twitter authentication valid',
        lastChecked: new Date(),
        responseTime: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `Twitter service error: ${error.message}`,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check AI service health
   */
  async checkAI(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test API key validation
      const hasValidKey = await this.container.ai.validateApiKey();
      
      if (!hasValidKey) {
        return {
          status: 'unhealthy',
          message: 'Invalid or missing API key',
          lastChecked: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      return {
        status: 'healthy',
        message: 'AI service ready',
        lastChecked: new Date(),
        responseTime: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `AI service error: ${error.message}`,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check config service health
   */
  async checkConfig(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const configExists = await this.container.config.exists();
      
      if (!configExists) {
        return {
          status: 'degraded',
          message: 'No configuration file found',
          lastChecked: new Date(),
          responseTime: Date.now() - startTime
        };
      }

      // Try to load config
      await this.container.config.load();

      return {
        status: 'healthy',
        message: 'Configuration loaded successfully',
        lastChecked: new Date(),
        responseTime: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `Config service error: ${error.message}`,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Check storage service health
   */
  async checkStorage(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test basic storage operations
      const history = await this.container.storage.getHistory();
      const drafts = await this.container.storage.getDrafts();

      return {
        status: 'healthy',
        message: `Storage accessible (${history.length} history, ${drafts.length} drafts)`,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `Storage service error: ${error.message}`,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Extract health from Promise.allSettled result
   */
  private extractHealth(result: PromiseSettledResult<ServiceHealth>): ServiceHealth {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        message: `Health check failed: ${result.reason}`,
        lastChecked: new Date()
      };
    }
  }

  /**
   * Calculate overall health based on individual service health
   */
  private calculateOverallHealth(services: HealthReport['services']): ServiceHealth {
    const statuses = Object.values(services).map(s => s.status);
    const unhealthyCount = statuses.filter(s => s === 'unhealthy').length;
    const degradedCount = statuses.filter(s => s === 'degraded').length;

    let status: ServiceHealth['status'];
    let message: string;

    if (unhealthyCount > 0) {
      status = 'unhealthy';
      message = `${unhealthyCount} service(s) unhealthy, ${degradedCount} degraded`;
    } else if (degradedCount > 0) {
      status = 'degraded';
      message = `${degradedCount} service(s) degraded`;
    } else {
      status = 'healthy';
      message = 'All services healthy';
    }

    return {
      status,
      message,
      lastChecked: new Date()
    };
  }

  /**
   * Quick health check - only checks critical services
   */
  async quickCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check config first (critical)
      const configExists = await this.container.config.exists();
      if (!configExists) {
        issues.push('No configuration found');
      }

      // Check AI service (critical for main functionality)
      try {
        const hasValidKey = await this.container.ai.validateApiKey();
        if (!hasValidKey) {
          issues.push('AI service not configured');
        }
      } catch (error) {
        issues.push('AI service unavailable');
      }

      return {
        healthy: issues.length === 0,
        issues
      };
    } catch (error) {
      issues.push(`Health check failed: ${error}`);
      return { healthy: false, issues };
    }
  }
}

/**
 * Global health checker instance
 */
let globalHealthChecker: HealthChecker | null = null;

/**
 * Get global health checker
 */
export async function getHealthChecker(): Promise<HealthChecker> {
  if (!globalHealthChecker) {
    const { getServiceContainer } = await import('./container');
    const container = await getServiceContainer();
    globalHealthChecker = new HealthChecker(container);
  }
  return globalHealthChecker;
}

/**
 * Perform a quick system health check
 */
export async function performQuickHealthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
  const checker = await getHealthChecker();
  return checker.quickCheck();
}