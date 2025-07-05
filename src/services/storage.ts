import fs from 'fs/promises';
import path from 'path';
import { Tweet, Draft } from '../types';
import { ConfigService } from './config';
import { FileError, StorageError } from '../utils/errors';

export class StorageService {
  private static instance: StorageService;
  private historyPath: string;
  private draftsPath: string;
  private storagePath: string;

  private constructor() {
    const configDir = this.getStorageDir();
    this.historyPath = path.join(configDir, 'history.json');
    this.draftsPath = path.join(configDir, 'drafts.json');
    this.storagePath = path.join(configDir, 'storage.json');
  }

  private getStorageDir(): string {
    if (process.env.NODE_ENV === 'test' && process.env.TEST_HOME) {
      return path.join(process.env.TEST_HOME, '.bip');
    }
    const configService = ConfigService.getInstance();
    return configService.getConfigDir();
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async initialize(): Promise<void> {
    try {
      const configDir = this.getStorageDir();
      
      // Create directory if it doesn't exist
      await fs.mkdir(configDir, { recursive: true });
      
      // Initialize storage file if it doesn't exist
      try {
        await fs.access(this.storagePath);
      } catch {
        await fs.writeFile(this.storagePath, JSON.stringify({ tweets: [], drafts: [] }, null, 2), 'utf-8');
      }
    } catch (error) {
      throw new StorageError('Failed to initialize storage', error);
    }
  }

  async saveTweet(tweet: Tweet): Promise<void> {
    try {
      const history = await this.getHistory();
      history.unshift(tweet);
      
      // Keep only last 100 tweets
      if (history.length > 100) {
        history.splice(100);
      }

      await fs.writeFile(this.historyPath, JSON.stringify(history, null, 2));
    } catch (error) {
      throw new FileError('Failed to save tweet to history', error);
    }
  }

  async getTweets(limit?: number): Promise<Tweet[]> {
    return this.getHistory(limit);
  }

  async getHistory(limit?: number): Promise<Tweet[]> {
    try {
      const data = await fs.readFile(this.historyPath, 'utf-8');
      const history = JSON.parse(data);
      // Parse date strings to Date objects
      const tweets = history.map((tweet: any) => ({
        ...tweet,
        createdAt: new Date(tweet.createdAt)
      }));
      return limit ? tweets.slice(0, limit) : tweets;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw new FileError('Failed to read tweet history', error);
    }
  }

  async saveDraft(draft: Draft): Promise<void> {
    try {
      const drafts = await this.getDrafts();
      draft.id = `draft-${Date.now()}`;
      drafts.unshift(draft);
      
      // Keep only last 20 drafts
      if (drafts.length > 20) {
        drafts.splice(20);
      }

      await fs.writeFile(this.draftsPath, JSON.stringify(drafts, null, 2));
    } catch (error) {
      throw new FileError('Failed to save draft', error);
    }
  }

  async getDrafts(): Promise<Draft[]> {
    try {
      const data = await fs.readFile(this.draftsPath, 'utf-8');
      const drafts = JSON.parse(data);
      // Parse date strings to Date objects
      return drafts.map((draft: any) => ({
        ...draft,
        createdAt: new Date(draft.createdAt)
      }));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw new FileError('Failed to read drafts', error);
    }
  }

  async getDraft(id: string): Promise<Draft | null> {
    try {
      const drafts = await this.getDrafts();
      return drafts.find(d => 
        d.id === id || 
        d.id === `draft-${id}` ||
        d.id.endsWith(`-${id}`)
      ) || null;
    } catch (error) {
      throw new FileError('Failed to get draft', error);
    }
  }

  async deleteDraft(id: string): Promise<void> {
    try {
      const drafts = await this.getDrafts();
      const filtered = drafts.filter(d => d.id !== id);
      await fs.writeFile(this.draftsPath, JSON.stringify(filtered, null, 2));
    } catch (error) {
      throw new FileError('Failed to delete draft', error);
    }
  }

  async clear(type?: 'tweets' | 'drafts'): Promise<void> {
    try {
      if (!type || type === 'tweets') {
        await fs.writeFile(this.historyPath, JSON.stringify([], null, 2));
      }
      if (!type || type === 'drafts') {
        await fs.writeFile(this.draftsPath, JSON.stringify([], null, 2));
      }
      if (!type) {
        await fs.writeFile(this.storagePath, JSON.stringify({ tweets: [], drafts: [] }, null, 2), 'utf-8');
      }
    } catch (error) {
      throw new StorageError('Failed to clear storage', error);
    }
  }
}