import axios, { AxiosInstance } from 'axios';
import { ConfigService } from './config';
import { TwitterError } from '../utils/errors';
import { logger } from '../utils/logger';
import fs from 'fs/promises';

interface TwitterSession {
  cookies: string;
  csrfToken: string;
  authToken: string;
  username: string;
}

export class TwitterService {
  private static instance: TwitterService;
  private client: AxiosInstance;
  private session: TwitterSession | null = null;
  private configService: ConfigService;
  private rateLimit = {
    remaining: 50,
    limit: 50,
    reset: new Date(Date.now() + 15 * 60 * 1000)
  };

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.client = axios.create({
      baseURL: 'https://twitter.com',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      },
      timeout: 30000
    });
  }

  static getInstance(): TwitterService {
    if (!TwitterService.instance) {
      TwitterService.instance = new TwitterService();
    }
    return TwitterService.instance;
  }

  async authenticate(username: string, password: string): Promise<void> {
    try {
      logger.startSpinner('Authenticating with Twitter...');
      
      // In a production implementation, you would:
      // 1. Use puppeteer or playwright to automate browser login
      // 2. Navigate to Twitter login page
      // 3. Fill in username and password
      // 4. Extract cookies and tokens after successful login
      
      // For demonstration, we'll simulate the authentication process
      if (!username || !password) {
        throw new TwitterError('Username and password are required');
      }

      // Simulate API call for authentication
      logger.debug(`Authenticating user: ${username}`);
      
      // Create session with mock tokens (in production, these would be real tokens from Twitter)
      this.session = {
        cookies: `auth_token=mock_token_${Date.now()}; ct0=mock_csrf_${Date.now()}`,
        csrfToken: `mock_csrf_${Date.now()}`,
        authToken: `mock_auth_${Date.now()}`,
        username
      };

      // Save session to config
      const config = await this.configService.load();
      config.twitter.username = username;
      config.twitter.sessionData = JSON.stringify(this.session);
      await this.configService.save(config);

      logger.stopSpinner(true, 'Authentication successful!');
      logger.info(`Logged in as @${username}`);
      logger.warn('Note: This is a mock implementation. Real Twitter authentication requires browser automation.');
    } catch (error) {
      logger.stopSpinner(false, 'Authentication failed');
      throw new TwitterError('Failed to authenticate with Twitter', error);
    }
  }

  async loadSession(): Promise<boolean> {
    try {
      const config = await this.configService.load();
      if (!config.twitter.sessionData) {
        return false;
      }

      this.session = JSON.parse(config.twitter.sessionData);
      
      // Update client headers with session data
      if (this.session) {
        this.client.defaults.headers.common['Cookie'] = this.session.cookies;
        this.client.defaults.headers.common['x-csrf-token'] = this.session.csrfToken;
        this.client.defaults.headers.common['authorization'] = `Bearer ${this.session.authToken}`;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async postTweet(text: string, mediaIds?: string[]): Promise<string> {
    if (!this.session) {
      const loaded = await this.loadSession();
      if (!loaded) {
        throw new TwitterError('Not authenticated. Please run "bip init" first.');
      }
    }

    try {
      logger.debug('Posting tweet to Twitter...');
      logger.debug(`Tweet content: ${text}`);
      
      if (text.length > 280) {
        throw new TwitterError(`Tweet is too long: ${text.length} characters (max 280)`);
      }

      // In production, this would make a real API call to Twitter
      // Example of what the API call would look like:
      /*
      const response = await this.client.post('/api/v2/tweets', {
        text,
        media: mediaIds ? { media_ids: mediaIds } : undefined
      });
      return response.data.data.id;
      */

      // Mock implementation with simulated tweet ID
      const tweetId = Date.now().toString();
      
      logger.debug(`Tweet posted successfully with ID: ${tweetId}`);
      if (mediaIds && mediaIds.length > 0) {
        logger.debug(`Attached ${mediaIds.length} media item(s)`);
      }
      
      // Simulate rate limit tracking
      this.updateRateLimit();
      
      return tweetId;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new TwitterError('Session expired. Please re-authenticate.');
      }
      throw new TwitterError(`Failed to post tweet: ${error.message}`, error);
    }
  }

  async uploadMedia(filePath: string): Promise<string> {
    if (!this.session) {
      throw new TwitterError('Not authenticated. Please run "bip init" first.');
    }

    try {
      logger.debug(`Uploading media from: ${filePath}`);

      // Read file and get file info
      const mediaData = await fs.readFile(filePath);
      const stats = await fs.stat(filePath);
      
      // Validate file size (Twitter has limits)
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB for images
      if (stats.size > MAX_SIZE) {
        throw new TwitterError(`File too large: ${stats.size} bytes (max ${MAX_SIZE} bytes)`);
      }

      // In production, this would upload to Twitter's media endpoint
      // Example of what the API call would look like:
      /*
      const formData = new FormData();
      formData.append('media', mediaData);
      
      const response = await this.client.post('/api/v1.1/media/upload.json', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data.media_id_string;
      */

      // For now, log that we received the media data
      logger.debug(`Media data received: ${mediaData.length} bytes`);

      // Mock implementation with simulated media ID
      const mediaId = `media_${Date.now()}`;
      
      logger.debug(`Media uploaded successfully. ID: ${mediaId}`);
      logger.debug(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      return mediaId;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new TwitterError(`File not found: ${filePath}`);
      }
      throw new TwitterError(`Failed to upload media: ${error.message}`, error);
    }
  }

  async verifyCredentials(): Promise<boolean> {
    if (!this.session) {
      return false;
    }

    try {
      // In a real implementation, this would make an API call to verify the session
      // For now, we'll just check if we have session data
      return !!this.session.authToken;
    } catch (error) {
      return false;
    }
  }

  async getRateLimitStatus(): Promise<{
    remaining: number;
    limit: number;
    reset: Date;
  }> {
    return { ...this.rateLimit };
  }

  private updateRateLimit(): void {
    // Simulate rate limit consumption
    if (this.rateLimit.remaining > 0) {
      this.rateLimit.remaining--;
    }
    
    // Reset rate limit if time has passed
    if (new Date() > this.rateLimit.reset) {
      this.rateLimit.remaining = this.rateLimit.limit;
      this.rateLimit.reset = new Date(Date.now() + 15 * 60 * 1000);
    }
    
    logger.debug(`Rate limit: ${this.rateLimit.remaining}/${this.rateLimit.limit}`);
  }

  isAuthenticated(): boolean {
    return !!this.session;
  }

  getUsername(): string | null {
    return this.session?.username || null;
  }
}