import { ScreenshotService } from '../screenshot';
import { Config } from '../../types';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

jest.mock('axios');
jest.mock('fs/promises');

const mockAxios = axios as jest.Mocked<typeof axios>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ScreenshotService - Enhanced Features', () => {
  let screenshotService: ScreenshotService;
  let mockConfig: Config['screenshots'];

  beforeEach(() => {
    screenshotService = ScreenshotService.getInstance();
    mockConfig = {
      theme: 'dracula',
      backgroundColor: 'rgba(30, 30, 30, 1)',
      windowTheme: 'none',
      padding: 32,
      language: 'javascript'
    };
    
    jest.clearAllMocks();
  });

  describe('generateCodeScreenshot with custom options', () => {
    const mockCode = 'console.log("Hello, World!");';
    const mockLanguage = 'javascript';
    const mockImageBuffer = Buffer.from('fake-image-data');

    beforeEach(() => {
      mockAxios.get.mockResolvedValue({ data: mockImageBuffer });
    });

    it('should apply custom theme', async () => {
      await screenshotService.generateCodeScreenshot(
        mockCode,
        mockLanguage,
        mockConfig,
        { theme: 'nord' }
      );

      const call = mockAxios.get.mock.calls[0];
      const url = call[0];
      expect(url).toContain('theme=nord');
    });

    it('should apply custom background color', async () => {
      await screenshotService.generateCodeScreenshot(
        mockCode,
        mockLanguage,
        mockConfig,
        { backgroundColor: '#1e1e1e' }
      );

      const call = mockAxios.get.mock.calls[0];
      const url = call[0];
      expect(url).toContain('backgroundColor=%231e1e1e');
    });

    it('should enable line numbers when specified', async () => {
      await screenshotService.generateCodeScreenshot(
        mockCode,
        mockLanguage,
        mockConfig,
        { lineNumbers: true }
      );

      const call = mockAxios.get.mock.calls[0];
      const url = call[0];
      expect(url).toContain('lineNumbers=true');
    });

    it('should hide window controls when specified', async () => {
      await screenshotService.generateCodeScreenshot(
        mockCode,
        mockLanguage,
        mockConfig,
        { windowControls: false }
      );

      const call = mockAxios.get.mock.calls[0];
      const url = call[0];
      expect(url).toContain('windowControls=false');
    });

    it('should apply custom font settings', async () => {
      await screenshotService.generateCodeScreenshot(
        mockCode,
        mockLanguage,
        mockConfig,
        { 
          fontSize: '16px',
          fontFamily: 'Monaco'
        }
      );

      const call = mockAxios.get.mock.calls[0];
      const url = call[0];
      expect(url).toContain('fontSize=16px');
      expect(url).toContain('fontFamily=Monaco');
    });

    it('should disable line wrap when specified', async () => {
      await screenshotService.generateCodeScreenshot(
        mockCode,
        mockLanguage,
        mockConfig,
        { lineWrap: false }
      );

      const call = mockAxios.get.mock.calls[0];
      const url = call[0];
      expect(url).toContain('widthAdjustment=true');
    });

    it('should apply custom width', async () => {
      await screenshotService.generateCodeScreenshot(
        mockCode,
        mockLanguage,
        mockConfig,
        { width: 800 }
      );

      const call = mockAxios.get.mock.calls[0];
      const url = call[0];
      expect(url).toContain('width=800');
    });

    it('should combine multiple custom options', async () => {
      await screenshotService.generateCodeScreenshot(
        mockCode,
        mockLanguage,
        mockConfig,
        { 
          theme: 'one-dark',
          backgroundColor: '#282c34',
          lineNumbers: true,
          fontSize: '12px',
          lineWrap: false,
          width: 1000
        }
      );

      const call = mockAxios.get.mock.calls[0];
      const url = call[0];
      expect(url).toContain('theme=one-dark');
      expect(url).toContain('backgroundColor=%23282c34');
      expect(url).toContain('lineNumbers=true');
      expect(url).toContain('fontSize=12px');
      expect(url).toContain('widthAdjustment=true');
      expect(url).toContain('width=1000');
    });
  });

  describe('readCodeFile with line ranges', () => {
    const testFilePath = '/test/file.js';
    const testContent = `line 1
line 2
line 3
line 4
line 5
line 6
line 7
line 8
line 9
line 10`;

    beforeEach(() => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(testContent);
    });

    it('should extract single line', async () => {
      const result = await screenshotService.readCodeFile(testFilePath, '5');
      expect(result.code).toBe('line 5');
    });

    it('should extract line range', async () => {
      const result = await screenshotService.readCodeFile(testFilePath, '3-7');
      expect(result.code).toBe('line 3\nline 4\nline 5\nline 6\nline 7');
    });

    it('should handle invalid line numbers gracefully', async () => {
      const result = await screenshotService.readCodeFile(testFilePath, '999');
      expect(result.code).toBe('');
    });

    it('should return full content when no range specified', async () => {
      const result = await screenshotService.readCodeFile(testFilePath);
      expect(result.code).toBe(testContent);
    });
  });

  describe('language detection', () => {
    beforeEach(() => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('code content');
    });

    const languageTests = [
      { ext: '.js', expected: 'javascript' },
      { ext: '.jsx', expected: 'javascript' },
      { ext: '.ts', expected: 'typescript' },
      { ext: '.tsx', expected: 'typescript' },
      { ext: '.py', expected: 'python' },
      { ext: '.go', expected: 'go' },
      { ext: '.rs', expected: 'rust' },
      { ext: '.rb', expected: 'ruby' },
      { ext: '.java', expected: 'java' },
      { ext: '.cpp', expected: 'cpp' },
      { ext: '.swift', expected: 'swift' },
      { ext: '.kt', expected: 'kotlin' },
      { ext: '.dart', expected: 'dart' },
      { ext: '.php', expected: 'php' },
      { ext: '.unknown', expected: 'text' }
    ];

    languageTests.forEach(({ ext, expected }) => {
      it(`should detect ${expected} for ${ext} files`, async () => {
        const result = await screenshotService.readCodeFile(`test${ext}`);
        expect(result.language).toBe(expected);
      });
    });
  });
});