import { ScreenshotService } from '../screenshot';
import { ShaderRenderer } from '../shader-renderer';
import { EmojiRenderer } from '../emoji-renderer';
import { ThemeLoader } from '../../themes/theme-loader';
import { Config } from '../../types';
import { ScreenshotError } from '../../utils/errors';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { createCanvas } from 'canvas';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('fs');
jest.mock('canvas');
jest.mock('../shader-renderer');
jest.mock('../emoji-renderer');
jest.mock('../../themes/theme-loader');

const mockFsPromises = fs as jest.Mocked<typeof fs>;
const mockFsSync = fsSync as jest.Mocked<typeof fsSync>;
const mockCreateCanvas = createCanvas as jest.MockedFunction<typeof createCanvas>;

// Mock theme loader with complete interface
const mockThemeLoader = {
  getTheme: jest.fn(),
  getAllThemes: jest.fn(), // Correct method name!
  loadCustomThemes: jest.fn(),
  registerTheme: jest.fn(),
  getThemeInfo: jest.fn(),
  getColorMapping: jest.fn(),
  getInstance: jest.fn(),
};

// Mock shader renderer with complete interface
const mockShaderRenderer = {
  renderShaderBackground: jest.fn(),
  getAvailableShaders: jest.fn(),
  getInstance: jest.fn(),
};

// Mock emoji renderer with complete interface
const mockEmojiRenderer = {
  parseEmojis: jest.fn(),
  renderTextWithEmojis: jest.fn(),
  measureTextWithEmojis: jest.fn(),
  getInstance: jest.fn(),
};

describe('ScreenshotService V2 (Canvas-based)', () => {
  let screenshotService: ScreenshotService;
  let mockCanvas: any;
  let mockContext: any;

  const mockConfig: Config['screenshots'] = {
    theme: 'dracula',
    backgroundColor: '#282a36',
    windowTheme: 'mac',
    padding: 32,
    language: 'auto',
  };

  const mockTheme = {
    name: 'Test Theme',
    variant: 'dark' as const,
    background: '#282a36',
    foreground: '#f8f8f2',
    comment: '#6272a4',
    string: '#f1fa8c',
    number: '#bd93f9',
    keyword: '#8be9fd',
    operator: '#ff79c6',
    function: '#50fa7b',
    variable: '#ffb86c',
    constant: '#bd93f9',
    type: '#8be9fd',
    class: '#50fa7b',
    property: '#50fa7b',
    attribute: '#f1fa8c',
    tag: '#ff79c6',
    regexp: '#f1fa8c',
    gradientFrom: '#44475a',
    gradientTo: '#282a36',
    shader: {
      name: 'halftone',
      colors: {
        primary: '#8be9fd',
        secondary: '#50fa7b',
        accent: '#ff79c6',
        background: '#282a36',
      },
      parameters: {
        intensity: 1.0,
        scale: 1.0,
      },
    },
  };

  beforeEach(() => {
    // Reset singletons
    (ScreenshotService as any).instance = null;
    (ShaderRenderer as any).instance = null;
    (EmojiRenderer as any).instance = null;
    (ThemeLoader as any).instance = null;

    // Mock canvas and context first
    mockContext = {
      fillStyle: '',
      font: '',
      textBaseline: '',
      fillRect: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn().mockReturnValue({ width: 100 }),
      createLinearGradient: jest.fn().mockReturnValue({
        addColorStop: jest.fn(),
      }),
      createImageData: jest.fn().mockReturnValue({
        data: new Uint8ClampedArray(400), // 10x10 image * 4 channels
      }),
      putImageData: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      quadraticCurveTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      arc: jest.fn(),
      drawImage: jest.fn(),
      imageSmoothingEnabled: true,
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    };

    mockCanvas = {
      getContext: jest.fn().mockReturnValue(mockContext),
      toBuffer: jest.fn().mockReturnValue(Buffer.from('fake-png-data')),
      width: 800,
      height: 600,
    };

    mockCreateCanvas.mockReturnValue(mockCanvas);

    // Setup theme loader mock
    mockThemeLoader.getTheme.mockReturnValue(mockTheme);
    mockThemeLoader.getAllThemes.mockReturnValue(['dracula', 'synthwave-84', 'github-dark', 'cyberpunk']);
    mockThemeLoader.loadCustomThemes.mockImplementation(() => {}); // Mock implementation
    mockThemeLoader.getThemeInfo.mockImplementation((name) => mockTheme);
    mockThemeLoader.getColorMapping.mockReturnValue({});
    mockThemeLoader.getInstance.mockReturnValue(mockThemeLoader);
    (ThemeLoader as any).getInstance = mockThemeLoader.getInstance;

    // Setup shader renderer mock
    mockShaderRenderer.renderShaderBackground.mockReturnValue(mockCanvas);
    mockShaderRenderer.getAvailableShaders.mockReturnValue(['halftone', 'disruptor', 'wave-gradient']);
    mockShaderRenderer.getInstance.mockReturnValue(mockShaderRenderer);
    (ShaderRenderer as any).getInstance = mockShaderRenderer.getInstance;

    // Setup emoji renderer mock
    mockEmojiRenderer.parseEmojis.mockReturnValue([]);
    mockEmojiRenderer.renderTextWithEmojis.mockResolvedValue(100);
    mockEmojiRenderer.measureTextWithEmojis.mockReturnValue(100);
    mockEmojiRenderer.getInstance.mockReturnValue(mockEmojiRenderer);
    (EmojiRenderer as any).getInstance = mockEmojiRenderer.getInstance;

    // Mock file system
    mockFsSync.existsSync.mockReturnValue(true);
    mockFsPromises.access.mockResolvedValue(undefined);
    mockFsPromises.readFile.mockResolvedValue('test code');
    mockFsPromises.mkdir.mockResolvedValue(undefined);
    mockFsPromises.writeFile.mockResolvedValue(undefined);

    screenshotService = ScreenshotService.getInstance();
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
    const testCode = `function hello() {
  console.log("Hello, World! 🚀");
  return true;
}`;

    it('should generate screenshot with default options', async () => {
      const result = await screenshotService.generateCodeScreenshot(
        testCode,
        'javascript',
        mockConfig
      );

      expect(result).toBeInstanceOf(Buffer);
      expect(mockCreateCanvas).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
      expect(mockCanvas.toBuffer).toHaveBeenCalledWith('image/png', expect.any(Object));
    });

    it('should handle syntax highlighting', async () => {
      await screenshotService.generateCodeScreenshot(
        testCode,
        'javascript',
        mockConfig
      );

      // Should set font and render text
      expect(mockContext.font).toBeTruthy();
      expect(mockContext.fillText).toHaveBeenCalled();
    });

    it('should apply theme colors', async () => {
      await screenshotService.generateCodeScreenshot(
        testCode,
        'javascript',
        { ...mockConfig, theme: 'synthwave-84' }
      );

      // Should set fill style for background and text
      expect(mockContext.fillStyle).toBeTruthy();
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should render window controls', async () => {
      await screenshotService.generateCodeScreenshot(
        testCode,
        'javascript',
        mockConfig,
        { windowControls: true }
      );

      // Should draw circles for window controls
      expect(mockContext.arc).toHaveBeenCalled();
    });

    it('should render line numbers when enabled', async () => {
      await screenshotService.generateCodeScreenshot(
        testCode,
        'javascript',
        mockConfig,
        { lineNumbers: true }
      );

      // Should render line numbers
      expect(mockContext.fillText).toHaveBeenCalledWith(
        expect.stringMatching(/^\s*\d+/),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should handle text wrapping', async () => {
      const longCode = `// This is a very long comment that should definitely wrap to multiple lines when rendered in the screenshot with a narrow width setting`;

      await screenshotService.generateCodeScreenshot(
        longCode,
        'javascript',
        mockConfig,
        { width: 300, lineWrap: true }
      );

      expect(mockContext.fillText).toHaveBeenCalled();
    });

    it('should handle custom options', async () => {
      const customOptions = {
        fontSize: 18,
        fontFamily: 'Monaco',
        padding: 40,
        width: 900,
        backgroundColor: '#1e1e1e',
      };

      await screenshotService.generateCodeScreenshot(
        testCode,
        'javascript',
        mockConfig,
        customOptions
      );

      expect(mockContext.font).toContain('18');
      expect(mockCreateCanvas).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should handle errors gracefully', async () => {
      mockCanvas.toBuffer.mockImplementation(() => {
        throw new Error('Canvas error');
      });

      await expect(
        screenshotService.generateCodeScreenshot(testCode, 'javascript', mockConfig)
      ).rejects.toThrow(ScreenshotError);
    });
  });

  describe('Shader Integration', () => {
    const testCode = 'console.log("shader test");';

    it('should render halftone shader', async () => {
      await screenshotService.generateCodeScreenshot(
        testCode,
        'javascript',
        mockConfig,
        { shader: 'halftone' }
      );

      expect(mockContext.createImageData).toHaveBeenCalled();
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should render disruptor shader', async () => {
      await screenshotService.generateCodeScreenshot(
        testCode,
        'javascript',
        mockConfig,
        { shader: 'disruptor' }
      );

      expect(mockContext.createImageData).toHaveBeenCalled();
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should render wave-gradient shader', async () => {
      await screenshotService.generateCodeScreenshot(
        testCode,
        'javascript',
        mockConfig,
        { shader: 'wave-gradient' }
      );

      expect(mockContext.createImageData).toHaveBeenCalled();
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should handle shader parameters', async () => {
      await screenshotService.generateCodeScreenshot(
        testCode,
        'javascript',
        mockConfig,
        {
          shader: 'halftone',
          shaderParams: { intensity: 1.5, scale: 2.0 }
        }
      );

      expect(mockContext.createImageData).toHaveBeenCalled();
    });

    it('should fallback to gradient for unknown shader', async () => {
      await screenshotService.generateCodeScreenshot(
        testCode,
        'javascript',
        mockConfig,
        { shader: 'unknown-shader' }
      );

      expect(mockContext.createLinearGradient).toHaveBeenCalled();
    });

    it('should render theme gradient when no shader specified', async () => {
      await screenshotService.generateCodeScreenshot(
        testCode,
        'javascript',
        mockConfig,
        { gradient: true }
      );

      expect(mockContext.createLinearGradient).toHaveBeenCalled();
    });
  });

  describe('Emoji Integration', () => {
    const emojiCode = `// 🚀 Emoji test
console.log("Testing: 📷 🎉 ✅");
const emoji = "🔥";`;

    it('should detect and render emojis', async () => {
      // Mock emoji renderer
      const mockEmojiRenderer = {
        parseEmojis: jest.fn().mockReturnValue([
          { emoji: '🚀', url: 'test.png', indices: [3, 5] }
        ]),
        renderTextWithEmojis: jest.fn().mockResolvedValue(100),
        measureTextWithEmojis: jest.fn().mockReturnValue(100),
      };

      (EmojiRenderer as any).getInstance = jest.fn().mockReturnValue(mockEmojiRenderer);

      await screenshotService.generateCodeScreenshot(
        emojiCode,
        'javascript',
        mockConfig
      );

      expect(mockEmojiRenderer.renderTextWithEmojis).toHaveBeenCalled();
    });

    it('should handle emoji rendering errors gracefully', async () => {
      const mockEmojiRenderer = {
        parseEmojis: jest.fn().mockReturnValue([]),
        renderTextWithEmojis: jest.fn().mockRejectedValue(new Error('Emoji error')),
        measureTextWithEmojis: jest.fn().mockReturnValue(100),
      };

      (EmojiRenderer as any).getInstance = jest.fn().mockReturnValue(mockEmojiRenderer);

      // Should not throw error, should fallback to text rendering
      await expect(
        screenshotService.generateCodeScreenshot(emojiCode, 'javascript', mockConfig)
      ).resolves.toBeInstanceOf(Buffer);
    });
  });

  describe('Theme Integration', () => {
    it('should load and apply different themes', async () => {
      const themes = ['dracula', 'synthwave-84', 'github-dark', 'cyberpunk'];
      
      for (const theme of themes) {
        await screenshotService.generateCodeScreenshot(
          'console.log("test");',
          'javascript',
          { ...mockConfig, theme }
        );

        expect(mockContext.fillStyle).toBeTruthy();
        expect(mockCanvas.toBuffer).toHaveBeenCalled();
      }
    });

    it('should fallback to default theme for unknown theme', async () => {
      await screenshotService.generateCodeScreenshot(
        'console.log("test");',
        'javascript',
        { ...mockConfig, theme: 'unknown-theme' }
      );

      expect(mockCanvas.toBuffer).toHaveBeenCalled();
    });

    it('should get available themes', () => {
      const themes = screenshotService.getAvailableThemes();
      expect(Array.isArray(themes)).toBe(true);
      expect(themes).toEqual(['dracula', 'synthwave-84', 'github-dark', 'cyberpunk']);
    });
  });

  describe('Language Detection and Highlighting', () => {
    const testCases = [
      { code: 'console.log("test");', language: 'javascript', expected: 'javascript' },
      { code: 'print("hello")', language: 'python', expected: 'python' },
      { code: 'puts "hello"', language: 'ruby', expected: 'ruby' },
      { code: 'fmt.Println("hello")', language: 'go', expected: 'go' },
      { code: 'println!("hello");', language: 'rust', expected: 'rust' },
      { code: '<?php echo "hello"; ?>', language: 'php', expected: 'php' },
    ];

    it.each(testCases)('should highlight $language correctly', async ({ code, language }) => {
      await screenshotService.generateCodeScreenshot(
        code,
        language,
        mockConfig
      );

      expect(mockContext.fillText).toHaveBeenCalled();
      expect(mockCanvas.toBuffer).toHaveBeenCalled();
    });

    it('should handle unknown languages', async () => {
      await screenshotService.generateCodeScreenshot(
        'unknown syntax here',
        'unknown-lang',
        mockConfig
      );

      expect(mockContext.fillText).toHaveBeenCalled();
    });
  });

  describe('File Operations', () => {
    describe('readCodeFile', () => {
      it('should read file and detect language from extension', async () => {
        mockFsPromises.readFile.mockResolvedValue('console.log("test");');
        
        // Mock a valid path within the allowed directory
        const testPath = process.cwd() + '/test/file.js';
        const result = await screenshotService.readCodeFile(testPath);

        expect(result.code).toBe('console.log("test");');
        expect(result.language).toBe('javascript');
      });

      it('should handle line ranges', async () => {
        const multiLineCode = 'line1\nline2\nline3\nline4\nline5';
        mockFsPromises.readFile.mockResolvedValue(multiLineCode);
        
        const testPath = process.cwd() + '/test/file.js';
        const result = await screenshotService.readCodeFile(testPath, '2-4');

        expect(result.code).toBe('line2\nline3\nline4');
      });

      it('should handle single line selection', async () => {
        const multiLineCode = 'line1\nline2\nline3';
        mockFsPromises.readFile.mockResolvedValue(multiLineCode);
        
        const testPath = process.cwd() + '/test/file.js';
        const result = await screenshotService.readCodeFile(testPath, '2');

        expect(result.code).toBe('line2');
      });

      it('should reject files outside allowed directory', async () => {
        await expect(
          screenshotService.readCodeFile('../../../etc/passwd')
        ).rejects.toThrow('Access denied');
      });

      it('should handle file not found', async () => {
        mockFsPromises.access.mockRejectedValue({ code: 'ENOENT' });
        
        const testPath = process.cwd() + '/nonexistent/file.js';
        await expect(
          screenshotService.readCodeFile(testPath)
        ).rejects.toThrow('File not found');
      });
    });

    describe('saveScreenshot', () => {
      it('should save screenshot to temp directory', async () => {
        const buffer = Buffer.from('fake-image-data');
        
        const filePath = await screenshotService.saveScreenshot(buffer);

        expect(filePath).toMatch(/screenshot-\d+\.png$/);
        expect(mockFsPromises.mkdir).toHaveBeenCalledWith(
          expect.stringContaining('.bip-temp'),
          { recursive: true }
        );
        expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
          expect.any(String),
          buffer
        );
      });

      it('should handle save errors', async () => {
        mockFsPromises.writeFile.mockRejectedValue(new Error('Disk full'));

        await expect(
          screenshotService.saveScreenshot(Buffer.from('test'))
        ).rejects.toThrow(ScreenshotError);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty code', async () => {
      await expect(
        screenshotService.generateCodeScreenshot('', 'javascript', mockConfig)
      ).resolves.toBeInstanceOf(Buffer);
    });

    it('should handle very long code', async () => {
      const longCode = 'a'.repeat(10000);
      
      await expect(
        screenshotService.generateCodeScreenshot(longCode, 'javascript', mockConfig)
      ).resolves.toBeInstanceOf(Buffer);
    });

    it('should handle special characters', async () => {
      const specialCode = 'console.log("Special: àáâãäåæçèéêë 中文 العربية");';
      
      await expect(
        screenshotService.generateCodeScreenshot(specialCode, 'javascript', mockConfig)
      ).resolves.toBeInstanceOf(Buffer);
    });

    it('should handle malformed HTML in highlighted code', async () => {
      const malformedCode = 'function test() { /* <script>alert("xss")</script> */ }';
      
      await expect(
        screenshotService.generateCodeScreenshot(malformedCode, 'javascript', mockConfig)
      ).resolves.toBeInstanceOf(Buffer);
    });

    it('should handle canvas creation failure', async () => {
      mockCreateCanvas.mockImplementation(() => {
        throw new Error('Canvas creation failed');
      });

      await expect(
        screenshotService.generateCodeScreenshot('test', 'javascript', mockConfig)
      ).rejects.toThrow(ScreenshotError);
    });

    it('should handle context creation failure', async () => {
      mockCanvas.getContext.mockReturnValue(null);

      await expect(
        screenshotService.generateCodeScreenshot('test', 'javascript', mockConfig)
      ).rejects.toThrow();
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large canvas dimensions', async () => {
      await screenshotService.generateCodeScreenshot(
        'test',
        'javascript',
        mockConfig,
        { width: 2000, fontSize: 24, padding: 100 }
      );

      expect(mockCreateCanvas).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should clean up resources', async () => {
      const buffer = await screenshotService.generateCodeScreenshot(
        'test',
        'javascript',
        mockConfig
      );

      expect(buffer).toBeInstanceOf(Buffer);
      // Verify that context save/restore calls are balanced
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });
  });
});