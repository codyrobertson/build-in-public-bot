import { StorageService } from '../storage';
import { ConfigService } from '../config';
import { Tweet, Draft } from '../../types';
import { StorageError, FileError } from '../../utils/errors';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises
jest.mock('fs/promises');
const mockFsPromises = fs as jest.Mocked<typeof fs>;

describe('StorageService', () => {
  let storageService: StorageService;
  const mockHomePath = '/home/testuser/.bip';
  const mockStoragePath = path.join(mockHomePath, 'storage.json');
  const mockHistoryPath = path.join(mockHomePath, 'history.json');
  const mockDraftsPath = path.join(mockHomePath, 'drafts.json');

  const mockTweet: Tweet = {
    id: '123456789',
    text: 'Just shipped a new feature! 🚀 #buildinpublic',
    createdAt: new Date('2024-01-01T12:00:00Z'),
    url: 'https://twitter.com/testuser/status/123456789',
    mediaUrls: ['https://pbs.twimg.com/media/123.jpg'],
  };

  const mockDraft: Draft = {
    id: 'draft-1',
    text: 'Working on something cool...',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    includeScreenshot: true,
    screenshotPath: '/path/to/screenshot.png',
  };

  const mockStorageData = {
    tweets: [mockTweet],
    drafts: [mockDraft],
  };

  beforeEach(() => {
    // Reset singleton
    (StorageService as any).instance = null;
    storageService = StorageService.getInstance();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock config service to return test paths
    jest.spyOn(ConfigService.prototype, 'getConfigDir').mockReturnValue(mockHomePath);
    // Re-initialize to pick up mocked paths
    (StorageService as any).instance = null;
    storageService = StorageService.getInstance();
  });

  describe('getInstance', () => {
    it('should create singleton instance', () => {
      const instance1 = StorageService.getInstance();
      const instance2 = StorageService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should create storage directory and file if not exists', async () => {
      mockFsPromises.access.mockRejectedValue(new Error('Not found'));
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      await storageService.initialize();

      expect(mockFsPromises.mkdir).toHaveBeenCalledWith(mockHomePath, { recursive: true });
      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
        mockStoragePath,
        JSON.stringify({ tweets: [], drafts: [] }, null, 2),
        'utf-8'
      );
    });

    it('should not overwrite existing storage', async () => {
      mockFsPromises.access.mockResolvedValue(undefined);

      await storageService.initialize();

      expect(mockFsPromises.writeFile).not.toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockFsPromises.access.mockRejectedValue(new Error('Not found'));
      mockFsPromises.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(storageService.initialize()).rejects.toThrow(StorageError);
    });
  });

  describe('saveTweet', () => {
    beforeEach(() => {
      // Mock reading history.json, not storage.json
      mockFsPromises.readFile.mockImplementation((path) => {
        if (path === mockHistoryPath) {
          return Promise.resolve(JSON.stringify([mockTweet]));
        } else if (path === mockDraftsPath) {
          return Promise.resolve(JSON.stringify([mockDraft]));
        }
        return Promise.resolve(JSON.stringify(mockStorageData));
      });
      mockFsPromises.writeFile.mockResolvedValue(undefined);
    });

    it('should save new tweet', async () => {
      const newTweet: Tweet = {
        id: '987654321',
        text: 'Another update!',
        createdAt: new Date(),
        url: 'https://twitter.com/testuser/status/987654321',
      };

      await storageService.saveTweet(newTweet);

      const savedData = JSON.parse(mockFsPromises.writeFile.mock.calls[0][1] as string);
      expect(savedData).toHaveLength(2);
      expect(savedData[0]).toMatchObject({ id: '987654321' }); // Most recent first
      expect(savedData[1]).toMatchObject({ id: '123456789' });
    });

    it('should limit stored tweets to 100', async () => {
      const manyTweets = Array.from({ length: 100 }, (_, i) => ({
        ...mockTweet,
        id: `tweet-${i}`,
      }));
      
      mockFsPromises.readFile.mockImplementation((path) => {
        if (path === mockHistoryPath) {
          return Promise.resolve(JSON.stringify(manyTweets));
        }
        return Promise.resolve(JSON.stringify([]));
      });

      const newTweet: Tweet = {
        id: 'new-tweet',
        text: 'New tweet',
        createdAt: new Date(),
        url: 'https://twitter.com/testuser/status/new',
      };

      await storageService.saveTweet(newTweet);

      const savedData = JSON.parse(mockFsPromises.writeFile.mock.calls[0][1] as string);
      expect(savedData).toHaveLength(100);
      expect(savedData[0]).toMatchObject({ id: 'new-tweet' });
      expect(savedData.find((t: Tweet) => t.id === 'tweet-99')).toBeUndefined();
    });

    it('should handle storage errors', async () => {
      mockFsPromises.writeFile.mockRejectedValue(new Error('Disk full'));

      await expect(storageService.saveTweet(mockTweet)).rejects.toThrow(FileError);
    });
  });

  describe('getTweets', () => {
    it('should return all tweets', async () => {
      mockFsPromises.readFile.mockImplementation((path) => {
        if (path === mockHistoryPath) {
          return Promise.resolve(JSON.stringify([mockTweet]));
        }
        return Promise.resolve(JSON.stringify([]));
      });

      const tweets = await storageService.getTweets();

      expect(tweets).toHaveLength(1);
      expect(tweets[0]).toMatchObject({ id: '123456789' });
    });

    it('should return limited number of tweets', async () => {
      const manyTweets = Array.from({ length: 50 }, (_, i) => ({
        ...mockTweet,
        id: `tweet-${i}`,
      }));
      
      mockFsPromises.readFile.mockImplementation((path) => {
        if (path === mockHistoryPath) {
          return Promise.resolve(JSON.stringify(manyTweets));
        }
        return Promise.resolve(JSON.stringify([]));
      });

      const tweets = await storageService.getTweets(10);

      expect(tweets).toHaveLength(10);
    });

    it('should parse dates correctly', async () => {
      mockFsPromises.readFile.mockImplementation((path) => {
        if (path === mockHistoryPath) {
          return Promise.resolve(JSON.stringify([mockTweet]));
        }
        return Promise.resolve(JSON.stringify([]));
      });

      const tweets = await storageService.getTweets();

      expect(tweets[0].createdAt).toBeInstanceOf(Date);
      expect(tweets[0].createdAt.toISOString()).toBe('2024-01-01T12:00:00.000Z');
    });

    it('should handle read errors', async () => {
      mockFsPromises.readFile.mockRejectedValue(new Error('File not found'));

      await expect(storageService.getTweets()).rejects.toThrow(FileError);
    });
  });

  describe('saveDraft', () => {
    beforeEach(() => {
      mockFsPromises.readFile.mockImplementation((path) => {
        if (path === mockDraftsPath) {
          return Promise.resolve(JSON.stringify([mockDraft]));
        }
        return Promise.resolve(JSON.stringify([]));
      });
      mockFsPromises.writeFile.mockResolvedValue(undefined);
    });

    it('should save new draft', async () => {
      const newDraft: Draft = {
        id: 'draft-2',
        text: 'Another draft',
        createdAt: new Date(),
        includeScreenshot: false,
      };

      await storageService.saveDraft(newDraft);

      const savedData = JSON.parse(mockFsPromises.writeFile.mock.calls[0][1] as string);
      expect(savedData).toHaveLength(2);
      expect(savedData[0].id).toMatch(/^draft-\d+$/); // Generated ID
    });

    it('should always create new draft with generated ID', async () => {
      const newDraft: Draft = {
        ...mockDraft,
        text: 'Updated draft text',
      };

      await storageService.saveDraft(newDraft);

      const savedData = JSON.parse(mockFsPromises.writeFile.mock.calls[0][1] as string);
      expect(savedData).toHaveLength(2);
      expect(savedData[0].id).toMatch(/^draft-\d+$/); // New draft with generated ID
      expect(savedData[0].text).toBe('Updated draft text');
    });

    it('should limit drafts to 50', async () => {
      const manyDrafts = Array.from({ length: 50 }, (_, i) => ({
        ...mockDraft,
        id: `draft-${i}`,
      }));
      
      mockFsPromises.readFile.mockImplementation((path) => {
        if (path === mockDraftsPath) {
          return Promise.resolve(JSON.stringify(manyDrafts));
        }
        return Promise.resolve(JSON.stringify([]));
      });

      const newDraft: Draft = {
        id: 'new-draft',
        text: 'New draft',
        createdAt: new Date(),
        includeScreenshot: false,
      };

      await storageService.saveDraft(newDraft);

      const savedData = JSON.parse(mockFsPromises.writeFile.mock.calls[0][1] as string);
      expect(savedData).toHaveLength(20); // Service limits to 20 drafts
      expect(savedData[0].id).toMatch(/^draft-\d+$/);
    });
  });

  describe('getDrafts', () => {
    it('should return all drafts', async () => {
      mockFsPromises.readFile.mockImplementation((path) => {
        if (path === mockDraftsPath) {
          return Promise.resolve(JSON.stringify([mockDraft]));
        }
        return Promise.resolve(JSON.stringify([]));
      });

      const drafts = await storageService.getDrafts();

      expect(drafts).toHaveLength(1);
      expect(drafts[0]).toMatchObject({ id: 'draft-1' });
    });

    it('should return empty array if file not found', async () => {
      mockFsPromises.readFile.mockRejectedValue({ code: 'ENOENT' });

      const drafts = await storageService.getDrafts();

      expect(drafts).toEqual([]);
    });
  });

  describe('getDraft', () => {
    it('should return specific draft by id', async () => {
      mockFsPromises.readFile.mockImplementation((path) => {
        if (path === mockDraftsPath) {
          return Promise.resolve(JSON.stringify([mockDraft]));
        }
        return Promise.resolve(JSON.stringify([]));
      });

      const draft = await storageService.getDraft('draft-1');

      expect(draft).toMatchObject({ id: 'draft-1' });
    });

    it('should return null if draft not found', async () => {
      mockFsPromises.readFile.mockImplementation((path) => {
        if (path === mockDraftsPath) {
          return Promise.resolve(JSON.stringify([mockDraft]));
        }
        return Promise.resolve(JSON.stringify([]));
      });

      const draft = await storageService.getDraft('non-existent');

      expect(draft).toBeNull();
    });
  });

  describe('deleteDraft', () => {
    beforeEach(() => {
      mockFsPromises.readFile.mockImplementation((path) => {
        if (path === mockDraftsPath) {
          return Promise.resolve(JSON.stringify([mockDraft]));
        }
        return Promise.resolve(JSON.stringify([]));
      });
      mockFsPromises.writeFile.mockResolvedValue(undefined);
    });

    it('should delete draft by id', async () => {
      await storageService.deleteDraft('draft-1');

      const savedData = JSON.parse(mockFsPromises.writeFile.mock.calls[0][1] as string);
      expect(savedData).toHaveLength(0);
    });

    it('should handle non-existent draft deletion', async () => {
      await storageService.deleteDraft('non-existent');

      const savedData = JSON.parse(mockFsPromises.writeFile.mock.calls[0][1] as string);
      expect(savedData).toHaveLength(1); // Original draft still there
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      mockFsPromises.writeFile.mockResolvedValue(undefined);
    });

    it('should clear all data', async () => {
      await storageService.clear();

      // Should write to all three files when no type specified
      expect(mockFsPromises.writeFile).toHaveBeenCalledTimes(3);
      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
        mockHistoryPath,
        JSON.stringify([], null, 2)
      );
      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
        mockDraftsPath,
        JSON.stringify([], null, 2)
      );
      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
        mockStoragePath,
        JSON.stringify({ tweets: [], drafts: [] }, null, 2),
        'utf-8'
      );
    });

    it('should clear only tweets', async () => {
      await storageService.clear('tweets');

      // Should write empty array to history.json
      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
        mockHistoryPath,
        JSON.stringify([], null, 2)
      );
    });

    it('should clear only drafts', async () => {
      await storageService.clear('drafts');

      // Should write empty array to drafts.json
      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
        mockDraftsPath,
        JSON.stringify([], null, 2)
      );
    });
  });

});