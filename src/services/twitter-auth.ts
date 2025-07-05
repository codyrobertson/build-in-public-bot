import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { logger } from '../utils/logger';
import { TwitterError } from '../utils/errors';
import fs from 'fs/promises';
import path from 'path';

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

  async authenticate(username: string, password: string): Promise<TwitterAuthData> {
    try {
      logger.startSpinner('Launching browser for Twitter authentication...');
      
      // Launch browser with stealth plugin to avoid detection
      this.browser = await puppeteer.launch({
        headless: false, // Set to true in production
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
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
        // In a real implementation, you'd handle this case
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
    if (this.page) {
      await this.page.close().catch(() => {});
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
    }
    this.page = null;
    this.browser = null;
  }

  async saveAuthData(authData: TwitterAuthData, filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    const dataToSave = {
      ...authData,
      savedAt: new Date().toISOString()
    };
    
    await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
  }

  async loadAuthData(filePath: string): Promise<TwitterAuthData | null> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  async launchBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }
}