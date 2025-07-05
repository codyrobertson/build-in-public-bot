import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { logger } from '../utils/logger';
import { TwitterError } from '../utils/errors';
import fs from 'fs/promises';
import path from 'path';
import keytar from 'keytar';

puppeteer.use(StealthPlugin());

export interface TwitterAuthData {
  cookies: any[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  authToken?: string;
  ct0?: string;
  username: string;
  savedAt?: string;
}

export class TwitterAuthService {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async authenticate(username: string, password: string = ''): Promise<TwitterAuthData> {
    try {
      logger.startSpinner('Launching browser for Twitter authentication...');
      
      // Launch browser with stealth plugin to avoid detection
      this.browser = await puppeteer.launch({
        headless: false, // Always headful for authentication
        args: [
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Set viewport and user agent
      await this.page.setViewport({ width: 1280, height: 800 });
      
      logger.stopSpinner(true, 'Browser launched');
      logger.startSpinner('Navigating to Twitter login...');

      // Navigate to Twitter login
      await this.page.goto('https://twitter.com/i/flow/login', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      logger.stopSpinner(true, 'Loaded Twitter login page');

      if (password) {
        // Automated login with credentials
        // Wait for username input
        await this.page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 });
        
        logger.info('Entering username...');
        await this.page.type('input[autocomplete="username"]', username, { delay: 100 });
        
        // Click next button
        await this.page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if it asks for phone/email verification
        const phoneEmailInput = await this.page.$('input[data-testid="ocfEnterTextTextInput"]');
        if (phoneEmailInput) {
          logger.warn('Twitter is asking for phone/email verification');
          throw new TwitterError('Phone/email verification required. Please use an account that doesn\'t require this.');
        }

        // Wait for password input
        await this.page.waitForSelector('input[type="password"]', { timeout: 10000 });
        
        logger.info('Entering password...');
        await this.page.type('input[type="password"]', password, { delay: 100 });
        
        // Submit login
        await this.page.keyboard.press('Enter');
        
        logger.startSpinner('Logging in...');

        // Wait for successful login (home page)
        await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        
        // Check if we're logged in
        const homeTimeline = await this.page.$('[data-testid="primaryColumn"]');
        if (!homeTimeline) {
          throw new TwitterError('Login failed. Please check your credentials.');
        }

        logger.stopSpinner(true, 'Login successful!');
      } else {
        // Manual login - wait for user to complete login
        logger.info('Please log in to Twitter in the browser window.');
        logger.info('The bot will wait for you to complete the login process...');
        
        // Wait for successful login by checking for home timeline
        let loginComplete = false;
        let attempts = 0;
        const maxAttempts = 60; // Wait up to 5 minutes
        
        while (!loginComplete && attempts < maxAttempts) {
          try {
            const homeTimeline = await this.page.$('[data-testid="primaryColumn"]');
            if (homeTimeline) {
              loginComplete = true;
              logger.success('Login completed successfully!');
            } else {
              await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
              attempts++;
            }
          } catch {
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
          }
        }
        
        if (!loginComplete) {
          throw new TwitterError('Login timeout. Please try again.');
        }
      }

      // Extract authentication data
      const authData = await this.extractAuthData(username);
      
      // Close browser
      await this.cleanup();
      
      return authData;
    } catch (error: any) {
      await this.cleanup();
      logger.stopSpinner(false, 'Authentication failed');
      
      if (error instanceof TwitterError) {
        throw error;
      }
      
      throw new TwitterError(`Authentication failed: ${error.message}`, error);
    }
  }

  private async extractAuthData(username: string): Promise<TwitterAuthData> {
    if (!this.page) {
      throw new TwitterError('No active page');
    }

    logger.info('Extracting authentication data...');

    // Get cookies
    const cookies = await this.page.cookies();
    
    // Get localStorage
    const localStorageData = await this.page.evaluate(() => {
      const items: Record<string, string> = {};
      // @ts-ignore - window is available in browser context
      const storage = window.localStorage;
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          items[key] = storage.getItem(key) || '';
        }
      }
      return items;
    });

    // Get sessionStorage
    const sessionStorageData = await this.page.evaluate(() => {
      const items: Record<string, string> = {};
      // @ts-ignore - window is available in browser context
      const storage = window.sessionStorage;
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
          items[key] = storage.getItem(key) || '';
        }
      }
      return items;
    });

    // Extract auth token and CSRF token from cookies
    const authToken = cookies.find(c => c.name === 'auth_token')?.value;
    const ct0 = cookies.find(c => c.name === 'ct0')?.value;

    if (!authToken || !ct0) {
      throw new TwitterError('Failed to extract authentication tokens');
    }

    return {
      cookies,
      localStorage: localStorageData,
      sessionStorage: sessionStorageData,
      authToken,
      ct0,
      username
    };
  }

  private async cleanup(): Promise<void> {
    const errors: Error[] = [];
    
    if (this.page) {
      try {
        await this.page.close();
      } catch (error) {
        errors.push(new Error(`Failed to close page: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
      this.page = null;
    }
    
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        errors.push(new Error(`Failed to close browser: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
      this.browser = null;
    }
    
    if (errors.length > 0) {
      logger.warn(`Cleanup encountered ${errors.length} errors`);
    }
  }

  async saveAuthData(authData: TwitterAuthData, filePath: string): Promise<void> {
    try {
      // Store sensitive data in OS keychain
      await keytar.setPassword('build-in-public-bot', 'twitter-session', JSON.stringify({
        authToken: authData.authToken,
        ct0: authData.ct0,
        cookies: authData.cookies
      }));
      
      // Store non-sensitive metadata in file
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      const safeData = {
        username: authData.username,
        savedAt: new Date().toISOString(),
        hasSecureSession: true
      };
      
      await fs.writeFile(filePath, JSON.stringify(safeData, null, 2), 'utf-8');
    } catch (error) {
      throw new TwitterError('Failed to securely store authentication data', error);
    }
  }

  async loadAuthData(filePath: string): Promise<TwitterAuthData | null> {
    try {
      const fileData = await fs.readFile(filePath, 'utf-8');
      const metadata = JSON.parse(fileData);
      
      if (!metadata.hasSecureSession) {
        return null;
      }
      
      const secureData = await keytar.getPassword('build-in-public-bot', 'twitter-session');
      if (!secureData) {
        return null;
      }
      
      const sessionData = JSON.parse(secureData);
      return {
        ...sessionData,
        username: metadata.username,
        savedAt: metadata.savedAt
      };
    } catch (error) {
      return null;
    }
  }

  async launchBrowser(headless: boolean = false): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless,
        args: [
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run'
        ]
      });
    }
    return this.browser;
  }

  async authenticateManually(username: string): Promise<TwitterAuthData> {
    return this.authenticate(username, '');
  }
}