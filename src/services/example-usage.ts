/**
 * Example Usage of the New Service Architecture
 * 
 * This file demonstrates how to use the service interfaces,
 * container, and health checking in practice.
 */

import { 
  getServiceContainer, 
  getHealthChecker, 
  performQuickHealthCheck,
  ServiceRegistry,
  IScreenshotService,
  ITwitterService,
  IAIService
} from './index';
import { logger } from '../utils/logger';

/**
 * Example 1: Using the Service Container
 */
export async function exampleServiceContainer() {
  try {
    // Get the global service container
    const container = await getServiceContainer();

    // Use services with type safety
    const themes = container.screenshot.getAvailableThemes();
    console.log('Available themes:', themes);

    // Generate a screenshot
    const code = 'console.log("Hello, World!");';
    const config = {
      theme: 'dracula',
      backgroundColor: '#282a36',
      windowTheme: 'mac' as const,
      padding: 32,
      language: 'auto' as const
    };

    const buffer = await container.screenshot.generateCodeScreenshot(code, 'javascript', config);
    console.log(`Screenshot generated: ${buffer.length} bytes`);

    // Check if Twitter is authenticated
    const isAuth = await container.twitter.isAuthenticated();
    console.log('Twitter authenticated:', isAuth);

  } catch (error) {
    logger.error('Service container example failed:', error);
  }
}

/**
 * Example 2: Using Health Checks
 */
export async function exampleHealthCheck() {
  try {
    // Quick health check
    const quickCheck = await performQuickHealthCheck();
    console.log('Quick health check:', quickCheck);

    // Comprehensive health check
    const healthChecker = await getHealthChecker();
    const fullReport = await healthChecker.checkServices();
    
    console.log('Full health report:');
    console.log(`Overall status: ${fullReport.overall.status}`);
    console.log(`Twitter: ${fullReport.services.twitter.status} - ${fullReport.services.twitter.message}`);
    console.log(`Screenshot: ${fullReport.services.screenshot.status} - ${fullReport.services.screenshot.message}`);
    console.log(`AI: ${fullReport.services.ai.status} - ${fullReport.services.ai.message}`);

  } catch (error) {
    logger.error('Health check example failed:', error);
  }
}

/**
 * Example 3: Using Service Registry for Testing
 */
export function exampleServiceRegistry() {
  // Create mock services for testing
  const mockScreenshotService: IScreenshotService = {
    generateCodeScreenshot: async () => Buffer.from('mock'),
    readCodeFile: async () => ({ code: 'mock', language: 'javascript' }),
    saveScreenshot: async () => '/tmp/mock.png',
    getAvailableThemes: () => ['mock-theme']
  };

  const mockTwitterService: ITwitterService = {
    authenticate: async () => {},
    isAuthenticated: async () => true,
    loadSession: async () => true,
    postTweet: async () => 'mock-tweet-id',
    uploadMedia: async () => 'mock-media-id',
    saveSession: async () => {}
  };

  // Register mock services
  ServiceRegistry.register('screenshot', mockScreenshotService);
  ServiceRegistry.register('twitter', mockTwitterService);

  // Use registered services
  const screenshot = ServiceRegistry.get<IScreenshotService>('screenshot');
  const twitter = ServiceRegistry.get<ITwitterService>('twitter');

  console.log('Mock services registered and retrieved successfully');
  console.log('Mock themes:', screenshot.getAvailableThemes());
}

/**
 * Example 4: Error Handling with Services
 */
export async function exampleErrorHandling() {
  try {
    const container = await getServiceContainer();

    // Try to generate content that might fail
    const config = await container.config.load();
    
    try {
      const tweet = await container.ai.generateTweet(
        { message: 'Test message' },
        config
      );
      console.log('Generated tweet:', tweet);
    } catch (aiError) {
      console.log('AI service failed, using fallback:', aiError);
      // Fallback to simple message
      console.log('Fallback: Test message #buildinpublic');
    }

  } catch (error) {
    logger.error('Error handling example failed:', error);
  }
}

/**
 * Example 5: Service Lifecycle Management
 */
export async function exampleServiceLifecycle() {
  try {
    // Create container
    const container = await getServiceContainer();
    console.log('Container initialized:', container.isInitialized());

    // Check service names
    console.log('Available services:', container.getServiceNames());

    // Perform health check
    const healthChecker = new (await import('./health')).HealthChecker(container);
    const quickCheck = await healthChecker.quickCheck();
    
    if (!quickCheck.healthy) {
      console.log('Service issues detected:', quickCheck.issues);
    } else {
      console.log('All services healthy');
    }

    // Cleanup (if needed)
    await container.dispose();
    console.log('Container disposed');

  } catch (error) {
    logger.error('Service lifecycle example failed:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('Running service architecture examples...\n');
  
  exampleServiceContainer()
    .then(() => console.log('\n✅ Service container example completed'))
    .then(() => exampleHealthCheck())
    .then(() => console.log('\n✅ Health check example completed'))
    .then(() => exampleServiceRegistry())
    .then(() => console.log('\n✅ Service registry example completed'))
    .then(() => exampleErrorHandling())
    .then(() => console.log('\n✅ Error handling example completed'))
    .then(() => exampleServiceLifecycle())
    .then(() => console.log('\n✅ Service lifecycle example completed'))
    .catch(error => console.error('Examples failed:', error));
}