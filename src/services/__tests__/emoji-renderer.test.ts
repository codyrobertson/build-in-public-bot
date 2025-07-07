import { EmojiRenderer } from '../emoji-renderer';
import { loadImage } from 'canvas';
import * as fs from 'fs/promises';
import fetch from 'node-fetch';

// Mock dependencies
jest.mock('canvas');
jest.mock('fs/promises');
jest.mock('node-fetch');
jest.mock('twemoji-parser', () => ({
  parse: jest.fn(),
}));

const mockLoadImage = loadImage as jest.MockedFunction<typeof loadImage>;
const mockFsPromises = fs as jest.Mocked<typeof fs>;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockTwemojiParser = require('twemoji-parser');

describe('EmojiRenderer', () => {
  let emojiRenderer: EmojiRenderer;
  let mockCanvas: any;
  let mockContext: any;
  let mockImage: any;

  beforeEach(() => {
    // Reset singleton
    (EmojiRenderer as any).instance = null;

    // Mock canvas context
    mockContext = {
      font: '',
      fillText: jest.fn(),
      measureText: jest.fn().mockReturnValue({ width: 20 }),
      save: jest.fn(),
      restore: jest.fn(),
      imageSmoothingEnabled: true,
      drawImage: jest.fn(),
    };

    // Mock image
    mockImage = {
      width: 72,
      height: 72,
    };

    // Mock file system
    mockFsPromises.mkdir.mockResolvedValue(undefined);
    mockFsPromises.readFile.mockResolvedValue(Buffer.from('cached-emoji'));
    mockFsPromises.writeFile.mockResolvedValue(undefined);

    // Mock fetch
    const mockResponse = {
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
    };
    mockFetch.mockResolvedValue(mockResponse as any);

    // Mock loadImage
    mockLoadImage.mockResolvedValue(mockImage);

    // Mock twemoji parser
    mockTwemojiParser.parse.mockReturnValue([]);

    emojiRenderer = EmojiRenderer.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should create singleton instance', () => {
      const instance1 = EmojiRenderer.getInstance();
      const instance2 = EmojiRenderer.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('parseEmojis', () => {
    it('should parse text with emojis', () => {
      const mockParsedEmojis = [
        {
          url: 'https://twemoji.maxcdn.com/v/latest/svg/1f680.svg',
          indices: [0, 2],
          text: '🚀',
          type: 'emoji',
        },
        {
          url: 'https://twemoji.maxcdn.com/v/latest/svg/1f4f7.svg',
          indices: [3, 5],
          text: '📷',
          type: 'emoji',
        },
      ];

      mockTwemojiParser.parse.mockReturnValue(mockParsedEmojis);

      const result = emojiRenderer.parseEmojis('🚀 📷 test');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        emoji: '🚀',
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f680.png',
        indices: [0, 2],
      });
      expect(result[1]).toEqual({
        emoji: '📷',
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4f7.png',
        indices: [3, 5],
      });
    });

    it('should handle text without emojis', () => {
      mockTwemojiParser.parse.mockReturnValue([]);

      const result = emojiRenderer.parseEmojis('No emojis here');

      expect(result).toHaveLength(0);
    });

    it('should convert SVG URLs to PNG URLs', () => {
      const mockParsedEmojis = [
        {
          url: 'https://twemoji.maxcdn.com/v/latest/svg/1f525.svg',
          indices: [0, 2],
          text: '🔥',
          type: 'emoji',
        },
      ];

      mockTwemojiParser.parse.mockReturnValue(mockParsedEmojis);

      const result = emojiRenderer.parseEmojis('🔥');

      expect(result[0].url).toBe(
        'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f525.png'
      );
    });
  });

  describe('renderTextWithEmojis', () => {
    beforeEach(() => {
      // Setup emoji parsing
      mockTwemojiParser.parse.mockReturnValue([
        {
          url: 'https://twemoji.maxcdn.com/v/latest/svg/1f680.svg',
          indices: [6, 8],
          text: '🚀',
          type: 'emoji',
        },
      ]);
    });

    it('should render text with emojis', async () => {
      const text = 'Hello 🚀 World';
      const x = 10;
      const y = 20;
      const fontSize = 16;

      const width = await emojiRenderer.renderTextWithEmojis(
        mockContext,
        text,
        x,
        y,
        fontSize
      );

      expect(mockContext.fillText).toHaveBeenCalledWith('Hello ', x, y);
      expect(mockContext.drawImage).toHaveBeenCalledWith(
        mockImage,
        expect.any(Number), // x position
        expect.any(Number), // y position
        fontSize * 0.8,     // width
        fontSize * 0.8      // height
      );
      expect(mockContext.fillText).toHaveBeenCalledWith(' World', expect.any(Number), y);
      expect(width).toBeGreaterThan(0);
    });

    it('should render text without emojis normally', async () => {
      mockTwemojiParser.parse.mockReturnValue([]);

      const text = 'No emojis here';
      const x = 10;
      const y = 20;
      const fontSize = 16;

      const width = await emojiRenderer.renderTextWithEmojis(
        mockContext,
        text,
        x,
        y,
        fontSize
      );

      expect(mockContext.fillText).toHaveBeenCalledWith(text, x, y);
      expect(mockContext.drawImage).not.toHaveBeenCalled();
      expect(width).toBe(20); // mocked measureText width
    });

    it('should handle emoji loading failure gracefully', async () => {
      mockLoadImage.mockRejectedValue(new Error('Image load failed'));

      const text = 'Hello 🚀 World';
      const x = 10;
      const y = 20;
      const fontSize = 16;

      const width = await emojiRenderer.renderTextWithEmojis(
        mockContext,
        text,
        x,
        y,
        fontSize
      );

      // Should fallback to text rendering for emoji
      expect(mockContext.fillText).toHaveBeenCalledWith('Hello ', x, y);
      expect(mockContext.fillText).toHaveBeenCalledWith('🚀', expect.any(Number), y);
      expect(mockContext.fillText).toHaveBeenCalledWith(' World', expect.any(Number), y);
      expect(width).toBeGreaterThan(0);
    });

    it('should handle multiple consecutive emojis', async () => {
      mockTwemojiParser.parse.mockReturnValue([
        {
          url: 'https://twemoji.maxcdn.com/v/latest/svg/1f680.svg',
          indices: [0, 2],
          text: '🚀',
          type: 'emoji',
        },
        {
          url: 'https://twemoji.maxcdn.com/v/latest/svg/1f4f7.svg',
          indices: [2, 4],
          text: '📷',
          type: 'emoji',
        },
        {
          url: 'https://twemoji.maxcdn.com/v/latest/svg/1f525.svg',
          indices: [4, 6],
          text: '🔥',
          type: 'emoji',
        },
      ]);

      const text = '🚀📷🔥';
      const fontSize = 16;

      const width = await emojiRenderer.renderTextWithEmojis(
        mockContext,
        text,
        10,
        20,
        fontSize
      );

      expect(mockContext.drawImage).toHaveBeenCalledTimes(3);
      expect(width).toBeGreaterThan(0);
    });
  });

  describe('measureTextWithEmojis', () => {
    it('should measure text with emojis correctly', () => {
      mockTwemojiParser.parse.mockReturnValue([
        {
          url: 'https://twemoji.maxcdn.com/v/latest/svg/1f680.svg',
          indices: [6, 8],
          text: '🚀',
          type: 'emoji',
        },
      ]);

      mockContext.measureText.mockReturnValue({ width: 50 });

      const width = emojiRenderer.measureTextWithEmojis(
        mockContext,
        'Hello 🚀 World',
        16
      );

      // Should include text width (50 * 2 for "Hello " and " World") + emoji width (16 * 0.8)
      expect(width).toBe(100 + 16 * 0.8);
    });

    it('should measure text without emojis normally', () => {
      mockTwemojiParser.parse.mockReturnValue([]);
      mockContext.measureText.mockReturnValue({ width: 100 });

      const width = emojiRenderer.measureTextWithEmojis(
        mockContext,
        'No emojis here',
        16
      );

      expect(width).toBe(100);
    });

    it('should handle multiple emojis in measurement', () => {
      mockTwemojiParser.parse.mockReturnValue([
        {
          url: 'https://twemoji.maxcdn.com/v/latest/svg/1f680.svg',
          indices: [0, 2],
          text: '🚀',
          type: 'emoji',
        },
        {
          url: 'https://twemoji.maxcdn.com/v/latest/svg/1f4f7.svg',
          indices: [3, 5],
          text: '📷',
          type: 'emoji',
        },
      ]);

      mockContext.measureText.mockReturnValue({ width: 10 });

      const width = emojiRenderer.measureTextWithEmojis(
        mockContext,
        '🚀 📷',
        16
      );

      // Should include space width (10) + 2 emojis (16 * 0.8 * 2)
      expect(width).toBe(10 + 16 * 0.8 * 2);
    });
  });

  describe('Emoji Caching', () => {
    it('should cache downloaded emojis', async () => {
      mockFsPromises.readFile.mockRejectedValueOnce({ code: 'ENOENT' }); // Cache miss

      await emojiRenderer.renderTextWithEmojis(
        mockContext,
        'Test 🚀',
        10,
        20,
        16
      );

      expect(mockFetch).toHaveBeenCalled();
      expect(mockFsPromises.writeFile).toHaveBeenCalled();
      expect(mockLoadImage).toHaveBeenCalled();
    });

    it('should use cached emojis when available', async () => {
      // Cache hit
      mockFsPromises.readFile.mockResolvedValue(Buffer.from('cached-emoji'));

      await emojiRenderer.renderTextWithEmojis(
        mockContext,
        'Test 🚀',
        10,
        20,
        16
      );

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockFsPromises.readFile).toHaveBeenCalled();
      expect(mockLoadImage).toHaveBeenCalled();
    });

    it('should handle cache directory creation', async () => {
      const emojiRenderer = EmojiRenderer.getInstance();
      
      expect(mockFsPromises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.bip-temp/emoji-cache'),
        { recursive: true }
      );
    });

    it('should handle cache write failures gracefully', async () => {
      mockFsPromises.readFile.mockRejectedValueOnce({ code: 'ENOENT' });
      mockFsPromises.writeFile.mockRejectedValue(new Error('Disk full'));

      // Should still work without caching
      const width = await emojiRenderer.renderTextWithEmojis(
        mockContext,
        'Test 🚀',
        10,
        20,
        16
      );

      expect(width).toBeGreaterThan(0);
      expect(mockContext.drawImage).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network failures', async () => {
      mockFsPromises.readFile.mockRejectedValue({ code: 'ENOENT' });
      mockFetch.mockRejectedValue(new Error('Network error'));

      const width = await emojiRenderer.renderTextWithEmojis(
        mockContext,
        'Test 🚀',
        10,
        20,
        16
      );

      // Should fallback to text rendering
      expect(mockContext.fillText).toHaveBeenCalledWith('🚀', expect.any(Number), 20);
      expect(width).toBeGreaterThan(0);
    });

    it('should handle invalid emoji URLs', async () => {
      mockTwemojiParser.parse.mockReturnValue([
        {
          url: 'invalid-url',
          indices: [5, 7],
          text: '🚀',
          type: 'emoji',
        },
      ]);

      const width = await emojiRenderer.renderTextWithEmojis(
        mockContext,
        'Test 🚀',
        10,
        20,
        16
      );

      expect(width).toBeGreaterThan(0);
    });

    it('should handle malformed emoji data', async () => {
      mockTwemojiParser.parse.mockReturnValue([
        {
          url: 'https://twemoji.maxcdn.com/v/latest/svg/invalid.svg',
          indices: null, // Invalid indices
          text: '🚀',
          type: 'emoji',
        },
      ]);

      // Should not throw error
      await expect(
        emojiRenderer.renderTextWithEmojis(mockContext, 'Test 🚀', 10, 20, 16)
      ).resolves.toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should handle many emojis efficiently', async () => {
      const manyEmojis = Array.from({ length: 50 }, (_, i) => ({
        url: `https://twemoji.maxcdn.com/v/latest/svg/${i}.svg`,
        indices: [i * 2, i * 2 + 2],
        text: '🚀',
        type: 'emoji',
      }));

      mockTwemojiParser.parse.mockReturnValue(manyEmojis);

      const text = '🚀'.repeat(50);
      const width = await emojiRenderer.renderTextWithEmojis(
        mockContext,
        text,
        10,
        20,
        16
      );

      expect(width).toBeGreaterThan(0);
      expect(mockContext.drawImage).toHaveBeenCalledTimes(50);
    });

    it('should reuse cached images in memory', async () => {
      // First render
      await emojiRenderer.renderTextWithEmojis(
        mockContext,
        'Test 🚀',
        10,
        20,
        16
      );

      // Second render with same emoji
      await emojiRenderer.renderTextWithEmojis(
        mockContext,
        'Another 🚀',
        10,
        20,
        16
      );

      // Should only load the image once
      expect(mockLoadImage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text', async () => {
      const width = await emojiRenderer.renderTextWithEmojis(
        mockContext,
        '',
        10,
        20,
        16
      );

      expect(width).toBe(0);
      expect(mockContext.fillText).not.toHaveBeenCalled();
    });

    it('should handle text with only emojis', async () => {
      mockTwemojiParser.parse.mockReturnValue([
        {
          url: 'https://twemoji.maxcdn.com/v/latest/svg/1f680.svg',
          indices: [0, 2],
          text: '🚀',
          type: 'emoji',
        },
      ]);

      const width = await emojiRenderer.renderTextWithEmojis(
        mockContext,
        '🚀',
        10,
        20,
        16
      );

      expect(width).toBe(16 * 0.8); // Just the emoji width
      expect(mockContext.drawImage).toHaveBeenCalledTimes(1);
    });

    it('should handle very large font sizes', async () => {
      const width = await emojiRenderer.renderTextWithEmojis(
        mockContext,
        'Test 🚀',
        10,
        20,
        1000
      );

      expect(width).toBeGreaterThan(0);
      expect(mockContext.drawImage).toHaveBeenCalledWith(
        mockImage,
        expect.any(Number),
        expect.any(Number),
        800, // 1000 * 0.8
        800
      );
    });

    it('should handle zero font size', async () => {
      const width = await emojiRenderer.renderTextWithEmojis(
        mockContext,
        'Test 🚀',
        10,
        20,
        0
      );

      expect(width).toBeGreaterThan(0);
    });
  });
});