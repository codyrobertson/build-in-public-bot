import { ConfigService } from './config';
import { TwitterError } from '../utils/errors';
import { logger } from '../utils/logger';
import { TwitterAuthService, TwitterAuthData } from './twitter-auth';
import { TwitterAPIClient } from './twitter-api';
import path from 'path';
import fs from 'fs/promises';

export class TwitterService {
  private static instance: TwitterService;
  private configService: ConfigService;
  private authService: TwitterAuthService;
  private apiClient: TwitterAPIClient | null = null;
  private authData: TwitterAuthData | null = null;

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.authService = new TwitterAuthService();
  }

  static getInstance(): TwitterService {
    if (!TwitterService.instance) {
      TwitterService.instance = new TwitterService();
    }
    return TwitterService.instance;
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

      // Load auth data from file
      const authData = await this.authService.loadAuthData(config.twitter.sessionData);
      if (!authData) {
        return false;
      }

      // Check if auth data is recent (less than 30 days old)
      if (authData.savedAt) {
        const savedDate = new Date(authData.savedAt);
        const daysSince = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 30) {
          logger.warn('Authentication data is older than 30 days. Re-authentication recommended.');
        }
      }

      this.authData = authData;
      this.apiClient = new TwitterAPIClient(authData);
      
      // Verify the session is still valid
      try {
        await this.apiClient.getRateLimitStatus();
        return true;
      } catch (error) {
        logger.warn('Session validation failed. Re-authentication required.');
        return false;
      }
    } catch (error) {
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
    if (!text || text.trim().length === 0) {
      throw new TwitterError('Tweet text cannot be empty');
    }

    if (text.length > 280) {
      throw new TwitterError('Tweet exceeds 280 character limit');
    }

    // Check posting method from config
    const config = await this.configService.load();
    const postingMethod = config.twitter.postingMethod || 'browser';
    
    if (postingMethod === 'browser') {
      // Use browser automation
      return this.postViaBrowser(text, media);
    } else {
      // Use API
      if (!this.apiClient) {
        throw new TwitterError('Not authenticated. Please run authenticate() first');
      }
      
      try {
        let mediaId: string | undefined;
        
        if (media) {
          // Save media to temporary file first
          const tempPath = path.join(process.cwd(), '.bip-temp', `temp-${Date.now()}.png`);
          await fs.mkdir(path.dirname(tempPath), { recursive: true });
          await fs.writeFile(tempPath, media);
          
          try {
            mediaId = await this.apiClient.uploadMedia(tempPath);
          } finally {
            // Clean up temp file
            await fs.unlink(tempPath).catch(() => {});
          }
        }

        const tweetId = await this.postTweet(text, mediaId ? [mediaId] : undefined);
        const username = this.getUsername() || 'user';
        
        return {
          id: tweetId,
          url: `https://twitter.com/${username}/status/${tweetId}`
        };
      } catch (error) {
        throw new TwitterError('Failed to post tweet', error);
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
      logger.info('Please log in to Twitter in the browser window.');
      
      // Get username from config
      const config = await this.configService.load();
      const username = config.twitter.username;
      
      // This will open browser and wait for manual login (headful mode for login)
      await this.authenticate(username, ''); // Empty password forces manual login
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
        // Save media to temp file
        const tempPath = path.join(process.cwd(), '.bip-temp', `temp-${Date.now()}.png`);
        await fs.mkdir(path.dirname(tempPath), { recursive: true });
        await fs.writeFile(tempPath, media);
        
        // Upload media
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.uploadFile(tempPath);
          // Wait for upload to complete
          await page.waitForTimeout(3000);
        }
        
        // Clean up temp file
        await fs.unlink(tempPath).catch(() => {});
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