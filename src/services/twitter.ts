import { ConfigService } from './config';
import { TwitterError } from '../utils/errors';
import { logger } from '../utils/logger';
import { TwitterAuthService, TwitterAuthData } from './twitter-auth';
import { TwitterAPIClient } from './twitter-api';
import path from 'path';
import fs from 'fs/promises';

export class TwitterService {
  private static instance: TwitterService | null = null;
  private static instancePromise: Promise<TwitterService> | null = null;
  private configService: ConfigService;
  private authService: TwitterAuthService;
  private apiClient: TwitterAPIClient | null = null;
  private authData: TwitterAuthData | null = null;

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.authService = new TwitterAuthService();
  }

  static async getInstance(): Promise<TwitterService> {
    if (TwitterService.instance) {
      return TwitterService.instance;
    }
    
    if (TwitterService.instancePromise) {
      return TwitterService.instancePromise;
    }
    
    TwitterService.instancePromise = TwitterService.createInstance();
    TwitterService.instance = await TwitterService.instancePromise;
    TwitterService.instancePromise = null;
    
    return TwitterService.instance;
  }
  
  private static async createInstance(): Promise<TwitterService> {
    const instance = new TwitterService();
    await instance.initialize();
    return instance;
  }
  
  private async initialize(): Promise<void> {
    // Initialization logic here
  }

  async authenticate(username: string, password: string): Promise<void> {
    try {
      // Authenticate with browser automation
      this.authData = await this.authService.authenticate(username, password);
      
      // Create API client with auth data
      this.apiClient = new TwitterAPIClient(this.authData);
      
      // Save auth data
      const authPath = this.getAuthDataPath();
      await this.authService.saveAuthData(this.authData, authPath);
      
      // Update config with username
      const config = await this.configService.load();
      config.twitter.username = username;
      config.twitter.sessionData = authPath; // Store path to auth data instead of data itself
      await this.configService.save(config);
      
      logger.success(`Successfully authenticated as @${username}`);
    } catch (error) {
      throw new TwitterError('Authentication failed', error);
    }
  }

  async loadSession(): Promise<boolean> {
    try {
      const config = await this.configService.load();
      if (!config.twitter.sessionData) {
        return false;
      }

      const authData = await this.authService.loadAuthData(config.twitter.sessionData);
      if (!authData) {
        return false;
      }

      // Comprehensive session validation
      if (authData.savedAt) {
        const savedDate = new Date(authData.savedAt);
        const daysSince = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSince > 7) { // More aggressive expiration
          logger.warn('Session expired (older than 7 days)');
          return false;
        }
      }

      // Validate required fields
      if (!authData.authToken || !authData.ct0 || !authData.cookies) {
        logger.warn('Session data incomplete');
        return false;
      }

      this.authData = authData;
      this.apiClient = new TwitterAPIClient(authData);
      
      // Test session with real API call
      try {
        const rateLimit = await this.apiClient.getRateLimitStatus();
        if (rateLimit.remaining === 0) {
          logger.warn('Session rate limited');
          return false;
        }
        return true;
      } catch (error) {
        logger.warn('Session validation failed');
        return false;
      }
    } catch (error) {
      logger.error('Session load failed', error);
      return false;
    }
  }

  async postTweet(text: string, mediaIds?: string[]): Promise<string> {
    if (!this.apiClient) {
      const loaded = await this.loadSession();
      if (!loaded) {
        throw new TwitterError('Not authenticated. Please run "bip init" first.');
      }
    }

    if (!this.apiClient) {
      throw new TwitterError('API client not initialized');
    }

    try {
      return await this.apiClient.postTweet(text, mediaIds);
    } catch (error: any) {
      // If authentication error, clear session
      if (error.message?.includes('Authentication expired')) {
        this.apiClient = null;
        this.authData = null;
      }
      throw error;
    }
  }

  async uploadMedia(filePath: string): Promise<string> {
    if (!this.apiClient) {
      const loaded = await this.loadSession();
      if (!loaded) {
        throw new TwitterError('Not authenticated. Please run "bip init" first.');
      }
    }

    if (!this.apiClient) {
      throw new TwitterError('API client not initialized');
    }

    return await this.apiClient.uploadMedia(filePath);
  }

  async verifyCredentials(): Promise<boolean> {
    if (!this.apiClient) {
      return false;
    }

    try {
      await this.apiClient.getRateLimitStatus();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getRateLimitStatus(): Promise<{
    remaining: number;
    limit: number;
    reset: Date;
  }> {
    if (!this.apiClient) {
      throw new TwitterError('Not authenticated');
    }

    return await this.apiClient.getRateLimitStatus();
  }

  isAuthenticated(): boolean {
    return !!this.apiClient;
  }

  getUsername(): string | null {
    return this.authData?.username || null;
  }

  async post(text: string, media?: Buffer): Promise<{ id: string; url: string }> {
    // Comprehensive input validation
    if (!text || typeof text !== 'string') {
      throw new TwitterError('Tweet text must be a non-empty string');
    }
    
    const sanitized = text.trim();
    if (sanitized.length === 0) {
      throw new TwitterError('Tweet text cannot be empty');
    }
    
    if (sanitized.length > 280) {
      throw new TwitterError('Tweet exceeds 280 character limit');
    }
    
    // Check for malicious content
    const maliciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi
    ];
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(sanitized)) {
        throw new TwitterError('Tweet contains potentially malicious content');
      }
    }

    // Check posting method from config
    const config = await this.configService.load();
    const postingMethod = config.twitter.postingMethod || 'browser';
    
    if (postingMethod === 'browser') {
      // Use browser automation
      return this.postViaBrowser(sanitized, media);
    } else {
      // Use API
      if (!this.apiClient) {
        throw new TwitterError('Not authenticated. Please run authenticate() first');
      }
      
      const tempFiles: string[] = [];
      
      try {
        let mediaId: string | undefined;
        
        if (media) {
          // Validate and sanitize file path
          const tempDir = path.resolve(process.cwd(), '.bip-temp');
          const sanitizedName = Date.now().toString() + '.png';
          const tempPath = path.join(tempDir, sanitizedName);
          
          // Ensure path is within temp directory
          if (!tempPath.startsWith(tempDir)) {
            throw new TwitterError('Invalid file path');
          }
          
          tempFiles.push(tempPath);
          
          await fs.mkdir(tempDir, { recursive: true });
          await fs.writeFile(tempPath, media);
          
          mediaId = await this.apiClient.uploadMedia(tempPath);
        }

        const tweetId = await this.postTweet(sanitized, mediaId ? [mediaId] : undefined);
        const username = this.getUsername() || 'user';
        
        return {
          id: tweetId,
          url: `https://twitter.com/${username}/status/${tweetId}`
        };
      } catch (error) {
        throw new TwitterError('Failed to post tweet', error);
      } finally {
        // Always cleanup temp files
        await Promise.all(tempFiles.map(async (file) => {
          try {
            await fs.unlink(file);
          } catch (error) {
            logger.warn(`Failed to cleanup temp file: ${file}`);
          }
        }));
      }
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const authPath = this.getAuthDataPath();
      const authData = await this.authService.loadAuthData(authPath);
      
      if (!authData) {
        return false;
      }

      const client = new TwitterAPIClient(authData);
      try {
        await client.getRateLimitStatus();
        return true;
      } catch {
        return false;
      }
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    this.authData = null;
    this.apiClient = null;
    
    try {
      const authPath = this.getAuthDataPath();
      const fs = await import('fs/promises');
      await fs.unlink(authPath);
    } catch {
      // Ignore error if file doesn't exist
    }
  }

  private getAuthDataPath(): string {
    const configDir = this.configService.getConfigDir();
    return path.join(configDir, 'twitter-auth.json');
  }

  private async postViaBrowser(text: string, media?: Buffer): Promise<{ id: string; url: string }> {
    logger.info('Using browser automation to post tweet...');
    
    // Check if we have a saved session
    const hasSession = await this.loadSession();
    
    if (!hasSession) {
      logger.info('No saved session found. Opening browser for login...');
      
      // Get username from config
      const config = await this.configService.load();
      const username = config.twitter.username;
      
      // Authenticate manually and save session
      const authData = await this.authService.authenticateManually(username);
      this.authData = authData;
      
      // Save auth data
      const authPath = this.getAuthDataPath();
      await this.authService.saveAuthData(authData, authPath);
      
      // Update config with session data
      config.twitter.sessionData = authPath;
      await this.configService.save(config);
    }
    
    // Post using browser automation (headless mode for posting)
    const browser = await this.authService.launchBrowser(true); // headless for posting
    const page = await browser.newPage();
    
    try {
      // Load saved cookies if available
      if (this.authData?.cookies) {
        await page.setCookie(...this.authData.cookies);
      }
      
      // Navigate to Twitter
      await page.goto('https://twitter.com/compose/tweet', { waitUntil: 'networkidle2' });
      
      // Wait for tweet compose box
      await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 });
      
      // Type the tweet
      await page.type('[data-testid="tweetTextarea_0"]', text);
      
      // Handle media if provided
      if (media) {
        // Validate and sanitize file path
        const tempDir = path.resolve(process.cwd(), '.bip-temp');
        const sanitizedName = Date.now().toString() + '.png';
        const tempPath = path.join(tempDir, sanitizedName);
        
        // Ensure path is within temp directory
        if (!tempPath.startsWith(tempDir)) {
          throw new TwitterError('Invalid file path');
        }
        
        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(tempPath, media);
        
        try {
          // Upload media
          const fileInput = await page.$('input[type="file"]');
          if (fileInput) {
            await fileInput.uploadFile(tempPath);
            // Wait for upload to complete
            await page.waitForTimeout(3000);
          }
        } finally {
          // Clean up temp file
          await fs.unlink(tempPath).catch(() => {});
        }
      }
      
      // Click tweet button
      await page.click('[data-testid="tweetButtonInline"]');
      
      // Wait for tweet to be posted
      await page.waitForTimeout(3000);
      
      // Get the tweet URL (approximate)
      const username = this.getUsername() || 'user';
      const tweetId = Date.now().toString(); // Approximate ID
      
      return {
        id: tweetId,
        url: `https://twitter.com/${username}/status/${tweetId}`
      };
      
    } catch (error) {
      throw new TwitterError('Failed to post tweet via browser', error);
    } finally {
      await browser.close();
    }
  }
}