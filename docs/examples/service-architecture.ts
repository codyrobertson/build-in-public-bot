// Service Architecture - Dependency injection and health monitoring

import { ServiceContainer, IScreenshotService, ITwitterService } from './services';

export class BuildInPublicBot {
  constructor(private services: ServiceContainer) {}
  
  static async create(): Promise<BuildInPublicBot> {
    // 🏗️ Dependency injection with service container
    const container = await ServiceContainer.create();
    return new BuildInPublicBot(container);
  }
  
  async healthCheck(): Promise<HealthReport> {
    // 🔍 Comprehensive service monitoring
    return {
      overall: 'healthy',
      services: {
        screenshot: await this.services.screenshot.getStatus(),
        twitter: await this.services.twitter.isAuthenticated(),
        ai: await this.services.ai.validateApiKey(),
        config: await this.services.config.exists()
      },
      timestamp: new Date()
    };
  }
  
  async shareCode(filePath: string, options: ShareOptions): Promise<TweetResult> {
    // 📸 Generate beautiful code screenshot
    const { code, language } = await this.services.screenshot.readCodeFile(filePath);
    const image = await this.services.screenshot.generateCodeScreenshot(code, language, {
      theme: options.theme || 'dracula',
      shader: options.shader,
      emoji: true // 😀 Full emoji support with Twemoji
    });
    
    // 🤖 AI-enhanced content generation
    const content = await this.services.ai.generateTweet({
      message: options.message,
      context: { language, filename: filePath }
    });
    
    // 🐦 Smart Twitter posting
    return this.services.twitter.post(content, image);
  }
}