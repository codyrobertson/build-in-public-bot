import { TwitterService } from '../twitter';
import { TwitterAuthService, TwitterAuthData } from '../twitter-auth';
import { TwitterAPIClient } from '../twitter-api';
import { TwitterError } from '../../utils/errors';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock dependencies
jest.mock('../twitter-auth');
jest.mock('../twitter-api');
jest.mock('fs/promises');

const mockFsPromises = fs as jest.Mocked<typeof fs>;
const MockTwitterAuthService = TwitterAuthService as jest.MockedClass<typeof TwitterAuthService>;
const MockTwitterAPIClient = TwitterAPIClient as jest.MockedClass<typeof TwitterAPIClient>;

describe('TwitterService', () => {
  let twitterService: TwitterService;
  let mockAuthService: jest.Mocked<TwitterAuthService>;
  let mockApiClient: jest.Mocked<TwitterAPIClient>;
  
  const mockAuthData: TwitterAuthData = {
    cookies: [
      { name: 'auth_token', value: 'test-token', domain: '.twitter.com' },
    ],
    localStorage: {
      'auth_data': JSON.stringify({ userId: '123456' }),
    },
    sessionStorage: {},
    authToken: 'test-token',
    ct0: 'test-csrf',
    username: 'testuser',
    savedAt: new Date().toISOString()
  };

  const mockHomePath = '/home/testuser/.bip';
  const mockAuthPath = path.join(mockHomePath, 'twitter-auth.json');

  beforeEach(async () => {
    // Reset singleton
    (TwitterService as any).instance = null;
    
    // Create mock instances
    mockAuthService = new MockTwitterAuthService() as jest.Mocked<TwitterAuthService>;
    mockApiClient = new MockTwitterAPIClient(mockAuthData) as jest.Mocked<TwitterAPIClient>;
    
    // Add getRateLimitStatus method to mock
    mockApiClient.getRateLimitStatus = jest.fn().mockResolvedValue({
      remaining: 100,
      limit: 200,
      reset: new Date()
    });
    
    // Setup mock returns
    MockTwitterAuthService.mockImplementation(() => mockAuthService);
    MockTwitterAPIClient.mockImplementation(() => mockApiClient);
    
    // Mock auth path
    jest.spyOn(TwitterService.prototype as any, 'getAuthDataPath').mockReturnValue(mockAuthPath);
    
    // Create service instance
    twitterService = await TwitterService.getInstance();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should create singleton instance', async () => {
      const instance1 = await TwitterService.getInstance();
      const instance2 = await TwitterService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('authenticate', () => {
    it('should authenticate with username and password', async () => {
      mockAuthService.authenticate.mockResolvedValue(mockAuthData);
      mockAuthService.saveAuthData.mockResolvedValue(undefined);
      
      // Mock the configService load and save methods
      const mockConfigService = {
        load: jest.fn().mockResolvedValue({ twitter: { username: '', sessionData: null } }),
        save: jest.fn().mockResolvedValue(undefined)
      };
      (twitterService as any).configService = mockConfigService;

      await twitterService.authenticate('testuser', 'password123');

      expect(mockAuthService.authenticate).toHaveBeenCalledWith('testuser', 'password123');
      expect(mockAuthService.saveAuthData).toHaveBeenCalledWith(mockAuthData, mockAuthPath);
      expect(MockTwitterAPIClient).toHaveBeenCalledWith(mockAuthData);
    });

    it('should handle authentication errors', async () => {
      mockAuthService.authenticate.mockRejectedValue(new Error('Invalid credentials'));

      await expect(twitterService.authenticate('testuser', 'wrong'))
        .rejects.toThrow(TwitterError);
    });

    it('should handle auth data save errors', async () => {
      mockAuthService.authenticate.mockResolvedValue(mockAuthData);
      mockAuthService.saveAuthData.mockRejectedValue(new Error('Write error'));

      await expect(twitterService.authenticate('testuser', 'password'))
        .rejects.toThrow(TwitterError);
    });
  });

  describe('loadSession', () => {
    it('should load existing session', async () => {
      // Mock the configService directly
      const mockConfigService = {
        load: jest.fn().mockResolvedValue({
          twitter: { sessionData: mockAuthPath }
        })
      };
      (twitterService as any).configService = mockConfigService;
      
      mockAuthService.loadAuthData.mockResolvedValue(mockAuthData);
      mockApiClient.getRateLimitStatus.mockResolvedValue({
        remaining: 100,
        limit: 200,
        reset: new Date()
      });

      const loaded = await twitterService.loadSession();

      expect(loaded).toBe(true);
      expect(mockAuthService.loadAuthData).toHaveBeenCalledWith(mockAuthPath);
      expect(MockTwitterAPIClient).toHaveBeenCalledWith(mockAuthData);
    });

    it('should return false if no session exists', async () => {
      // Mock config load to return no sessionData
      const mockConfig = {
        twitter: { sessionData: null }
      };
      (twitterService as any).configService = {
        load: jest.fn().mockResolvedValue(mockConfig)
      };

      const loaded = await twitterService.loadSession();

      expect(loaded).toBe(false);
      expect(MockTwitterAPIClient).not.toHaveBeenCalled();
    });

    it('should return false if session is invalid', async () => {
      // Mock the configService directly
      const mockConfigService = {
        load: jest.fn().mockResolvedValue({
          twitter: { sessionData: mockAuthPath }
        })
      };
      (twitterService as any).configService = mockConfigService;
      
      mockAuthService.loadAuthData.mockResolvedValue(mockAuthData);
      mockApiClient.getRateLimitStatus.mockRejectedValue(new Error('Invalid session'));

      const loaded = await twitterService.loadSession();

      expect(loaded).toBe(false);
    });

    it('should handle load errors gracefully', async () => {
      // Mock the configService directly
      const mockConfigService = {
        load: jest.fn().mockResolvedValue({
          twitter: { sessionData: mockAuthPath }
        })
      };
      (twitterService as any).configService = mockConfigService;
      
      mockAuthService.loadAuthData.mockRejectedValue(new Error('Read error'));

      const loaded = await twitterService.loadSession();
      
      expect(loaded).toBe(false);
    });
  });

  describe('post', () => {
    beforeEach(() => {
      // Setup authenticated state
      (twitterService as any).authData = mockAuthData;
      (twitterService as any).apiClient = mockApiClient;
    });

    it('should post text-only tweet', async () => {
      mockApiClient.postTweet.mockResolvedValue('tweet-id-123');

      const result = await twitterService.post('Hello Twitter!');

      expect(result).toEqual({
        id: 'tweet-id-123',
        url: 'https://twitter.com/testuser/status/tweet-id-123',
      });
      expect(mockApiClient.postTweet).toHaveBeenCalledWith('Hello Twitter!', undefined);
    });

    it('should post tweet with media', async () => {
      const mockImageBuffer = Buffer.from('fake-image');
      mockApiClient.uploadMedia.mockResolvedValue('media-id-456');
      mockApiClient.postTweet.mockResolvedValue('tweet-id-789');
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);
      mockFsPromises.unlink.mockResolvedValue(undefined);

      const result = await twitterService.post('Check this out!', mockImageBuffer);

      expect(result).toEqual({
        id: 'tweet-id-789',
        url: 'https://twitter.com/testuser/status/tweet-id-789',
      });
      expect(mockApiClient.uploadMedia).toHaveBeenCalledWith(expect.stringContaining('temp-'));
      expect(mockApiClient.postTweet).toHaveBeenCalledWith('Check this out!', ['media-id-456']);
    });

    it('should require authentication', async () => {
      (twitterService as any).apiClient = null;

      await expect(twitterService.post('Hello'))
        .rejects.toThrow('Not authenticated. Please run authenticate() first');
    });

    it('should handle post errors', async () => {
      mockApiClient.postTweet.mockRejectedValue(new Error('Rate limited'));

      await expect(twitterService.post('Hello'))
        .rejects.toThrow(TwitterError);
    });

    it('should handle media upload errors', async () => {
      const mockImageBuffer = Buffer.from('fake-image');
      mockApiClient.uploadMedia.mockRejectedValue(new Error('Upload failed'));
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);
      mockFsPromises.unlink.mockResolvedValue(undefined);

      await expect(twitterService.post('Hello', mockImageBuffer))
        .rejects.toThrow(TwitterError);
    });

    it('should validate tweet length', async () => {
      const longTweet = 'a'.repeat(281);

      await expect(twitterService.post(longTweet))
        .rejects.toThrow('Tweet exceeds 280 character limit');
    });

    it('should validate empty tweets', async () => {
      await expect(twitterService.post(''))
        .rejects.toThrow('Tweet text cannot be empty');
    });
  });

  describe('validateCredentials', () => {
    it('should validate loaded credentials', async () => {
      mockAuthService.loadAuthData.mockResolvedValue(mockAuthData);
      mockApiClient.getRateLimitStatus.mockResolvedValue({
        remaining: 100,
        limit: 200,
        reset: new Date()
      });

      const isValid = await twitterService.validateCredentials();

      expect(isValid).toBe(true);
    });

    it('should return false for invalid credentials', async () => {
      mockAuthService.loadAuthData.mockResolvedValue(mockAuthData);
      mockApiClient.getRateLimitStatus.mockRejectedValue(new Error('Invalid'));

      const isValid = await twitterService.validateCredentials();

      expect(isValid).toBe(false);
    });

    it('should return false if no credentials exist', async () => {
      mockAuthService.loadAuthData.mockResolvedValue(null);

      const isValid = await twitterService.validateCredentials();

      expect(isValid).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear auth data', async () => {
      (twitterService as any).authData = mockAuthData;
      (twitterService as any).apiClient = mockApiClient;
      mockFsPromises.unlink.mockResolvedValue(undefined);

      await twitterService.logout();

      expect(mockFsPromises.unlink).toHaveBeenCalledWith(mockAuthPath);
      expect((twitterService as any).authData).toBeNull();
      expect((twitterService as any).apiClient).toBeNull();
    });

    it('should handle file deletion errors gracefully', async () => {
      mockFsPromises.unlink.mockRejectedValue(new Error('File not found'));

      // Should not throw
      await twitterService.logout();

      expect((twitterService as any).authData).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when authenticated', () => {
      (twitterService as any).apiClient = mockApiClient;

      expect(twitterService.isAuthenticated()).toBe(true);
    });

    it('should return false when not authenticated', () => {
      (twitterService as any).apiClient = null;

      expect(twitterService.isAuthenticated()).toBe(false);
    });
  });

  describe('getUsername', () => {
    it('should return username from auth data', async () => {
      // Set authData on the service instance
      (twitterService as any).authData = {
        ...mockAuthData,
        username: 'testuser',
      };

      const username = twitterService.getUsername();

      expect(username).toBe('testuser');
    });

    it('should return null if no auth data', () => {
      (twitterService as any).authData = null;

      const username = twitterService.getUsername();

      expect(username).toBeNull();
    });

    it('should return null if username not in auth data', () => {
      const authDataWithoutUsername = { ...mockAuthData };
      delete (authDataWithoutUsername as any).username;
      (twitterService as any).authData = authDataWithoutUsername;

      const username = twitterService.getUsername();

      expect(username).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should wrap auth service errors', async () => {
      const authError = new Error('Auth failed');
      authError.name = 'TwitterAuthError';
      mockAuthService.authenticate.mockRejectedValue(authError);

      await expect(twitterService.authenticate('user', 'pass'))
        .rejects.toThrow(TwitterError);
    });

    it('should wrap API client errors', async () => {
      (twitterService as any).authData = mockAuthData;
      (twitterService as any).apiClient = mockApiClient;
      
      const apiError = new Error('API failed');
      apiError.name = 'TwitterAPIError';
      mockApiClient.postTweet.mockRejectedValue(apiError);

      await expect(twitterService.post('Hello'))
        .rejects.toThrow(TwitterError);
    });
  });
});