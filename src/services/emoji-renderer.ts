import { loadImage, Image } from 'canvas';
import * as twemojiParser from 'twemoji-parser';
import fetch from 'node-fetch';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

interface EmojiPosition {
  emoji: string;
  url: string;
  indices: [number, number];
}

export class EmojiRenderer {
  private static instance: EmojiRenderer;
  private emojiCache: Map<string, Image> = new Map();
  private cacheDir: string;

  private constructor() {
    this.cacheDir = path.join(process.cwd(), '.bip-temp', 'emoji-cache');
    this.ensureCacheDir();
  }

  static getInstance(): EmojiRenderer {
    if (!EmojiRenderer.instance) {
      EmojiRenderer.instance = new EmojiRenderer();
    }
    return EmojiRenderer.instance;
  }

  private async ensureCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      logger.warn('Failed to create emoji cache directory');
    }
  }

  /**
   * Parse text and find all emoji positions
   */
  parseEmojis(text: string): EmojiPosition[] {
    const parsed = twemojiParser.parse(text) as any[];
    return parsed.map((emoji: any) => {
      // Convert to jsdelivr CDN which is more reliable
      const codepoint = emoji.url.match(/\/([a-f0-9]+)\.svg$/)?.[1];
      const url = codepoint 
        ? `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoint}.png`
        : emoji.url;
      
      return {
        emoji: emoji.text,
        url,
        indices: emoji.indices as [number, number]
      };
    });
  }

  /**
   * Load emoji image from URL or cache
   */
  private async loadEmojiImage(url: string, emoji: string): Promise<Image | null> {
    try {
      // Check memory cache first
      if (this.emojiCache.has(url)) {
        return this.emojiCache.get(url)!;
      }

      // Check file cache
      const filename = `${emoji.codePointAt(0)?.toString(16)}.png`;
      const cachePath = path.join(this.cacheDir, filename);

      let imageBuffer: Buffer;

      try {
        // Try to load from cache
        imageBuffer = await fs.readFile(cachePath);
        logger.debug(`Loaded emoji from cache: ${emoji}`);
      } catch {
        // Download from Twemoji CDN
        logger.debug(`Downloading emoji: ${emoji} from ${url}`);
        const response = await fetch(url);
        imageBuffer = Buffer.from(await response.arrayBuffer());
        
        // Save to cache
        try {
          await fs.writeFile(cachePath, imageBuffer);
        } catch (error) {
          logger.warn(`Failed to cache emoji: ${emoji}`);
        }
      }

      const image = await loadImage(imageBuffer);
      this.emojiCache.set(url, image);
      return image;

    } catch (error) {
      logger.warn(`Failed to load emoji image for ${emoji}: ${error}`);
      return null;
    }
  }

  /**
   * Render text with emojis as images
   */
  async renderTextWithEmojis(
    ctx: any,
    text: string,
    x: number,
    y: number,
    fontSize: number
  ): Promise<number> {
    const emojis = this.parseEmojis(text);
    
    if (emojis.length === 0) {
      // No emojis, render normally
      ctx.fillText(text, x, y);
      return ctx.measureText(text).width;
    }

    // Load all emoji images in parallel
    const emojiImages = await Promise.all(
      emojis.map(e => this.loadEmojiImage(e.url, e.emoji))
    );

    let currentX = x;
    let lastIndex = 0;

    for (let i = 0; i < emojis.length; i++) {
      const emoji = emojis[i];
      const image = emojiImages[i];

      // Render text before emoji
      if (emoji.indices[0] > lastIndex) {
        const beforeText = text.substring(lastIndex, emoji.indices[0]);
        ctx.fillText(beforeText, currentX, y);
        currentX += ctx.measureText(beforeText).width;
      }

      // Render emoji as image
      if (image) {
        // Emoji should be about 80% of font size to match text height
        const emojiSize = fontSize * 0.8;
        // Since textBaseline is 'top', adjust Y position to center emoji
        const emojiY = y + (fontSize * 0.1); // Small offset down
        
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(image, currentX, emojiY, emojiSize, emojiSize);
        ctx.restore();
        
        // Advance by emoji width
        currentX += emojiSize;
        
        // Add spacing after emoji if next character is also an emoji
        const nextEmoji = i < emojis.length - 1 ? emojis[i + 1] : null;
        if (nextEmoji && nextEmoji.indices[0] === emoji.indices[1]) {
          // Next emoji is immediately after this one, add spacing
          currentX += fontSize * 0.2;
        }
      } else {
        // Fallback: render emoji as text
        ctx.fillText(emoji.emoji, currentX, y);
        currentX += ctx.measureText(emoji.emoji).width;
      }

      lastIndex = emoji.indices[1];
    }

    // Render remaining text after last emoji
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      ctx.fillText(remainingText, currentX, y);
      currentX += ctx.measureText(remainingText).width;
    }

    return currentX - x; // Return total width
  }

  /**
   * Measure text width including emojis
   */
  measureTextWithEmojis(ctx: any, text: string, fontSize: number): number {
    const emojis = this.parseEmojis(text);
    
    if (emojis.length === 0) {
      return ctx.measureText(text).width;
    }

    let totalWidth = 0;
    let lastIndex = 0;

    for (let i = 0; i < emojis.length; i++) {
      const emoji = emojis[i];
      
      // Measure text before emoji
      if (emoji.indices[0] > lastIndex) {
        const beforeText = text.substring(lastIndex, emoji.indices[0]);
        totalWidth += ctx.measureText(beforeText).width;
      }

      // Add emoji width (80% of font size)
      totalWidth += fontSize * 0.8;
      
      // Add spacing if next emoji is consecutive
      const nextEmoji = i < emojis.length - 1 ? emojis[i + 1] : null;
      if (nextEmoji && nextEmoji.indices[0] === emoji.indices[1]) {
        totalWidth += fontSize * 0.2;
      }
      
      lastIndex = emoji.indices[1];
    }

    // Measure remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      totalWidth += ctx.measureText(remainingText).width;
    }

    return totalWidth;
  }
}