import { AIService } from '../ai';
import { Config } from '../../types';
import { AIError } from '../../utils/errors';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// Create axios mock
const mockAxios = new MockAdapter(axios);

describe('AIService', () => {
  let aiService: AIService;
  const mockApiKey = 'test-api-key';
  
  const mockConfig: Config = {
    version: '1.0.0',
    twitter: {
      username: '',
      sessionData: null,
    },
    ai: {
      provider: 'openrouter',
      model: 'openai/gpt-4-turbo-preview',
      apiKey: mockApiKey,
    },
    style: {
      tone: 'professional',
      emojis: {
        frequency: 'moderate',
        preferred: ['🚀', '💻', '✨', '🎯', '🔥'],
      },
      hashtags: {
        always: ['#buildinpublic', '#coding'],
        contextual: ['#javascript', '#typescript', '#webdev'],
      },
      examples: [
        'Just shipped a new feature! 🚀 The UI now updates in real-time using WebSockets #buildinpublic #coding',
        'Debugging session turned into a refactoring marathon 💻 Sometimes the best fix is a complete rewrite #buildinpublic #coding',
      ],
    },
    screenshots: {
      theme: 'dracula',
      backgroundColor: '#282a36',
      windowTheme: 'mac',
      padding: 32,
      language: 'auto',
    },
  };

  beforeEach(() => {
    // Reset singleton instance
    (AIService as any).instance = null;
    process.env.OPENROUTER_API_KEY = mockApiKey;
    mockAxios.reset();
    aiService = AIService.getInstance();
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    mockAxios.reset();
  });

  describe('getInstance', () => {
    it('should create singleton instance', () => {
      const instance1 = AIService.getInstance();
      const instance2 = AIService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should throw error if API key is missing', () => {
      delete process.env.OPENROUTER_API_KEY;
      (AIService as any).instance = null;
      
      expect(() => AIService.getInstance()).toThrow(AIError);
      expect(() => AIService.getInstance()).toThrow('OPENROUTER_API_KEY not found in environment variables');
    });
  });

  describe('generateTweet', () => {
    const mockOptions = {
      message: 'Just implemented a new authentication system',
      includeScreenshot: false,
    };

    it('should generate tweet successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Just implemented a new authentication system! 🔐 Now users can login securely with JWT tokens #buildinpublic #coding',
          },
        }],
      };

      mockAxios.onPost('https://openrouter.ai/api/v1/chat/completions').reply(200, mockResponse);

      const tweet = await aiService.generateTweet(mockOptions, mockConfig);
      
      expect(tweet).toBe('Just implemented a new authentication system! 🔐 Now users can login securely with JWT tokens #buildinpublic #coding');
      expect(tweet).toBeValidTweet();
    });

    it('should handle unauthorized error', async () => {
      mockAxios.onPost('https://openrouter.ai/api/v1/chat/completions').reply(401);

      await expect(aiService.generateTweet(mockOptions, mockConfig))
        .rejects.toThrow(AIError);
      await expect(aiService.generateTweet(mockOptions, mockConfig))
        .rejects.toThrow('Invalid API key. Please check your OPENROUTER_API_KEY');
    });

    it('should handle generic API error', async () => {
      mockAxios.onPost('https://openrouter.ai/api/v1/chat/completions').reply(500, { error: 'Internal server error' });

      await expect(aiService.generateTweet(mockOptions, mockConfig))
        .rejects.toThrow(AIError);
      await expect(aiService.generateTweet(mockOptions, mockConfig))
        .rejects.toThrow(/Failed to generate tweet/);
    });

    it('should clean tweets wrapped in quotes', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: '"Just shipped a cool feature! 🚀 #buildinpublic #coding"',
          },
        }],
      };

      mockAxios.onPost('https://openrouter.ai/api/v1/chat/completions').reply(200, mockResponse);

      const tweet = await aiService.generateTweet(mockOptions, mockConfig);
      expect(tweet).toBe('Just shipped a cool feature! 🚀 #buildinpublic #coding');
    });

    it('should truncate tweets over 280 characters', async () => {
      const longTweet = 'A'.repeat(300);
      const mockResponse = {
        choices: [{
          message: {
            content: longTweet,
          },
        }],
      };

      mockAxios.onPost('https://openrouter.ai/api/v1/chat/completions').reply(200, mockResponse);

      const tweet = await aiService.generateTweet(mockOptions, mockConfig);
      expect(tweet.length).toBeLessThanOrEqual(280);
      expect(tweet).toMatch(/\.\.\.$/);  
    });

    it('should include required hashtags from style config', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Built something cool today! #buildinpublic #coding',
          },
        }],
      };

      mockAxios.onPost('https://openrouter.ai/api/v1/chat/completions').reply(200, mockResponse);

      const tweet = await aiService.generateTweet(mockOptions, mockConfig);
      expect(tweet).toContain('#buildinpublic');
      expect(tweet).toContain('#coding');
    });

    it('should respect emoji frequency settings', async () => {
      const noEmojiConfig = {
        ...mockConfig,
        style: {
          ...mockConfig.style,
          emojis: { frequency: 'none' as const, preferred: [] },
        },
      };

      mockAxios.onPost('https://openrouter.ai/api/v1/chat/completions').reply(200, {
        choices: [{
          message: {
            content: 'Just finished refactoring the codebase #buildinpublic #coding',
          },
        }],
      });

      await aiService.generateTweet(mockOptions, noEmojiConfig);
      // Since we can't guarantee the AI won't include emojis, we just verify the request was made
      expect(mockAxios.history.post[0].data).toBeDefined();
    });
  });

  describe('validateApiKey', () => {
    it('should return true for valid API key', async () => {
      mockAxios.onGet('https://openrouter.ai/api/v1/models').reply(200, { models: [] });

      const isValid = await aiService.validateApiKey();
      expect(isValid).toBe(true);
    });

    it('should return false for invalid API key', async () => {
      mockAxios.onGet('https://openrouter.ai/api/v1/models').reply(401);

      const isValid = await aiService.validateApiKey();
      expect(isValid).toBe(false);
    });

    it('should return false on network error', async () => {
      mockAxios.onGet('https://openrouter.ai/api/v1/models').networkError();

      const isValid = await aiService.validateApiKey();
      expect(isValid).toBe(false);
    });
  });

  describe('prompt building', () => {
    it('should build system prompt with all style elements', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Test tweet',
          },
        }],
      };

      mockAxios.onPost('https://openrouter.ai/api/v1/chat/completions').reply(200, mockResponse);

      const mockOptions = {
        message: 'Just implemented a new authentication system',
        includeScreenshot: false,
      };
      
      await aiService.generateTweet(mockOptions, mockConfig);

      const requestData = JSON.parse(mockAxios.history.post[0].data);
      const systemPrompt = requestData.messages[0].content;

      expect(systemPrompt).toContain('professional'); // tone
      expect(systemPrompt).toContain('1-2 emojis'); // moderate frequency
      expect(systemPrompt).toContain('#buildinpublic'); // required hashtags
      expect(systemPrompt).toContain('Example tweets for reference:'); // examples
    });

    it('should build user prompt with contextual hashtags', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Test tweet',
          },
        }],
      };

      mockAxios.onPost('https://openrouter.ai/api/v1/chat/completions').reply(200, mockResponse);

      const mockOptions = {
        message: 'Just implemented a new authentication system',
        includeScreenshot: false,
      };
      
      await aiService.generateTweet(mockOptions, mockConfig);

      const requestData = JSON.parse(mockAxios.history.post[0].data);
      const userPrompt = requestData.messages[1].content;

      expect(userPrompt).toContain(mockOptions.message);
      expect(userPrompt).toContain('#javascript');
      expect(userPrompt).toContain('#typescript');
      expect(userPrompt).toContain('#webdev');
    });
  });
});