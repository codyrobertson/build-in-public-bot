import { loadImage } from 'canvas';
import axios from 'axios';
import { logger } from '../utils/logger';

interface EmojiMatch {
  char: string;
  codePoint: string;
  indices: [number, number];
}

export class EmojiRenderer {
  private static instance: EmojiRenderer;
  private emojiCache = new Map<string, any>();
  private readonly emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;

  private constructor() {}

  static getInstance(): EmojiRenderer {
    if (!EmojiRenderer.instance) {
      EmojiRenderer.instance = new EmojiRenderer();
    }
    return EmojiRenderer.instance;
  }

  async renderTextWithEmojis(
    ctx: any,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    theme?: any
  ): Promise<number> {
    const emojis = this.findEmojis(text);
    let currentX = x;

    if (emojis.length === 0) {
      // No emojis, render as regular text
      ctx.fillStyle = theme?.text || '#ffffff';
      ctx.fillText(text, currentX, y);
      return ctx.measureText(text).width;
    }

    let lastIndex = 0;

    for (const emoji of emojis) {
      // Render text before emoji
      if (emoji.indices[0] > lastIndex) {
        const beforeText = text.substring(lastIndex, emoji.indices[0]);
        ctx.fillStyle = theme?.text || '#ffffff';
        ctx.fillText(beforeText, currentX, y);
        currentX += ctx.measureText(beforeText).width;
      }

      // Render emoji
      try {
        const emojiImage = await this.loadEmojiImage(emoji.codePoint);
        const emojiSize = fontSize * 0.8;
        const emojiY = y + (fontSize * 0.1);
        
        ctx.drawImage(emojiImage, currentX, emojiY, emojiSize, emojiSize);
        currentX += emojiSize;

        // Add spacing between consecutive emojis
        const nextEmoji = emojis.find(e => e.indices[0] === emoji.indices[1]);
        if (nextEmoji) {
          currentX += fontSize * 0.2;
        }
      } catch (error) {
        logger.warn(`Failed to load emoji ${emoji.char}`);
        // Fallback to text rendering
        ctx.fillStyle = theme?.text || '#ffffff';
        ctx.fillText(emoji.char, currentX, y);
        currentX += ctx.measureText(emoji.char).width;
      }

      lastIndex = emoji.indices[1];
    }

    // Render remaining text after last emoji
    if (lastIndex < text.length) {
      const afterText = text.substring(lastIndex);
      ctx.fillStyle = theme?.text || '#ffffff';
      ctx.fillText(afterText, currentX, y);
      currentX += ctx.measureText(afterText).width;
    }

    return currentX - x;
  }

  private findEmojis(text: string): EmojiMatch[] {
    const matches: EmojiMatch[] = [];
    let match;

    while ((match = this.emojiRegex.exec(text)) !== null) {
      const char = match[0];
      const codePoint = this.getEmojiCodePoint(char);
      
      matches.push({
        char,
        codePoint,
        indices: [match.index, match.index + char.length]
      });
    }
    
    // Reset regex lastIndex to avoid issues with subsequent calls
    this.emojiRegex.lastIndex = 0;

    return matches;
  }

  private getEmojiCodePoint(emoji: string): string {
    const codePoints = [...emoji].map(char => 
      char.codePointAt(0)?.toString(16).toLowerCase().padStart(4, '0')
    ).filter(Boolean);
    
    return codePoints.join('-');
  }

  private async loadEmojiImage(codePoint: string): Promise<any> {
    if (this.emojiCache.has(codePoint)) {
      return this.emojiCache.get(codePoint);
    }

    try {
      // Use JsDelivr CDN for Twemoji images
      const url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codePoint}.png`;
      
      const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 5000
      });
      
      const image = await loadImage(Buffer.from(response.data));
      this.emojiCache.set(codePoint, image);
      
      return image;
    } catch (error) {
      logger.warn(`Failed to load emoji from CDN: ${codePoint}`);
      throw error;
    }
  }

  clearCache(): void {
    this.emojiCache.clear();
  }
}