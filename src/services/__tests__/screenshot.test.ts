import { ScreenshotService } from '../screenshot';
import { Config } from '../../types';
import { ScreenshotError } from '../../utils/errors';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import * as fs from 'fs/promises';

// Create axios mock
const mockAxios = new MockAdapter(axios);

// Mock fs/promises
jest.mock('fs/promises');
const mockFsPromises = fs as jest.Mocked<typeof fs>;

describe('ScreenshotService', () => {
  let screenshotService: ScreenshotService;
  
  const mockConfig: Config = {
    version: '1.0.0',
    twitter: {
      username: '',
      sessionData: null,
    },
    ai: {
      provider: 'openrouter',
      model: 'openai/gpt-4-turbo-preview',
      apiKey: '',
    },
    style: {
      tone: 'professional',
      emojis: {
        frequency: 'moderate',
        preferred: ['🚀'],
      },
      hashtags: {
        always: ['#buildinpublic'],
        contextual: [],
      },
      examples: [],
    },
    screenshots: {
      theme: 'dracula',
      backgroundColor: '#282a36',
      windowTheme: 'mac',
      padding: 32,
      language: 'auto',
    },
  };

  const mockCodeContent = `function hello() {
  console.log("Hello, World!");
}`;

  beforeEach(() => {
    // Reset singleton
    (ScreenshotService as any).instance = null;
    screenshotService = ScreenshotService.getInstance();
    mockAxios.reset();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should create singleton instance', () => {
      const instance1 = ScreenshotService.getInstance();
      const instance2 = ScreenshotService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('generateCodeScreenshot', () => {
    const mockImageData = Buffer.from('fake-image-data');

    it('should generate screenshot from code successfully', async () => {
      mockAxios.onGet(/carbon\.now\.sh/).reply(200, mockImageData, {
        'content-type': 'image/png',
      });

      const result = await screenshotService.generateCodeScreenshot(
        mockCodeContent,
        'javascript',
        mockConfig.screenshots
      );

      expect(result).toEqual(mockImageData);
      expect(mockAxios.history.get[0].url).toContain('carbon.now.sh');
    });

    it('should handle API errors', async () => {
      mockAxios.onGet(/carbon\.now\.sh/).reply(500, { error: 'Server error' });

      await expect(
        screenshotService.generateCodeScreenshot(mockCodeContent, 'javascript', mockConfig.screenshots)
      ).rejects.toThrow(ScreenshotError);
    });

    it('should use config theme settings', async () => {
      const customConfig = {
        ...mockConfig,
        screenshots: {
          theme: 'solarized-dark',
          backgroundColor: '#002b36',
          windowTheme: 'none',
          padding: 16,
          language: 'javascript',
        },
      };

      mockAxios.onGet(/carbon\.now\.sh/).reply(200, Buffer.from('image'));

      await screenshotService.generateCodeScreenshot('code', 'js', customConfig.screenshots);

      const url = mockAxios.history.get[0].url;
      expect(url).toContain('theme=solarized-dark');
      expect(url).toContain('backgroundColor=');
      expect(url).toContain('windowTheme=none');
    });
  });

  describe('readCodeFile', () => {
    const mockFilePath = '/path/to/test.js';

    beforeEach(() => {
      mockFsPromises.access.mockResolvedValue(undefined);
      mockFsPromises.readFile.mockResolvedValue(mockCodeContent);
    });

    it('should read file and detect language', async () => {
      const result = await screenshotService.readCodeFile(mockFilePath);

      expect(result.code).toBe(mockCodeContent);
      expect(result.language).toBe('javascript');
      expect(mockFsPromises.readFile).toHaveBeenCalledWith(expect.stringContaining('test.js'), 'utf-8');
    });

    it('should handle line range', async () => {
      const multiLineCode = `line1
line2
line3
line4
line5`;
      mockFsPromises.readFile.mockResolvedValue(multiLineCode);

      const result = await screenshotService.readCodeFile(mockFilePath, '2-4');

      expect(result.code).toBe('line2\nline3\nline4');
    });

    it('should handle single line selection', async () => {
      const multiLineCode = `line1
line2
line3`;
      mockFsPromises.readFile.mockResolvedValue(multiLineCode);

      const result = await screenshotService.readCodeFile(mockFilePath, '2');

      expect(result.code).toBe('line2');
    });

    it('should handle file not found', async () => {
      mockFsPromises.access.mockRejectedValue({ code: 'ENOENT' });

      await expect(screenshotService.readCodeFile(mockFilePath))
        .rejects.toThrow('File not found');
    });

    it('should detect various languages', async () => {
      const testCases = [
        { file: 'test.py', expected: 'python' },
        { file: 'test.ts', expected: 'typescript' },
        { file: 'test.java', expected: 'java' },
        { file: 'test.rb', expected: 'ruby' },
        { file: 'test.go', expected: 'go' },
        { file: 'test.rs', expected: 'rust' },
        { file: 'test.cpp', expected: 'cpp' },
        { file: 'test.jsx', expected: 'javascript' },
        { file: 'test.tsx', expected: 'typescript' },
        { file: 'test.vue', expected: 'vue' },
        { file: 'test.unknown', expected: 'text' },
      ];

      for (const { file, expected } of testCases) {
        const result = await screenshotService.readCodeFile(`/path/${file}`);
        expect(result.language).toBe(expected);
      }
    });
  });

  describe('saveScreenshot', () => {
    const mockImageData = Buffer.from('fake-image-data');

    it('should save screenshot to temp directory', async () => {
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const result = await screenshotService.saveScreenshot(mockImageData);

      expect(result).toMatch(/screenshot-\d+\.png$/);
      expect(mockFsPromises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.bip-temp'),
        { recursive: true }
      );
      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        mockImageData
      );
    });

    it('should handle write errors', async () => {
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockRejectedValue(new Error('Disk full'));

      await expect(screenshotService.saveScreenshot(mockImageData))
        .rejects.toThrow(ScreenshotError);
    });
  });
});