import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import hljs from 'highlight.js';
import axios from 'axios';
import * as toml from '@iarna/toml';
import { Config } from '../types';
import { FileError, ScreenshotError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ThemeLoader } from './theme-loader';
import { WasmRasterizer } from './wasm-rasterizer';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

export class ScreenshotService {
  private static instance: ScreenshotService;
  private themeLoader: ThemeLoader;
  private emojiCache = new Map<string, any>();
  private shaderConfigs: any = {};

  private constructor() {
    this.themeLoader = ThemeLoader.getInstance();
    this.loadShaderConfigsSync();
  }

  private loadShaderConfigsSync(): void {
    try {
      // Try multiple possible paths
      const possiblePaths = [
        path.join(__dirname, '../config/shaders.toml'),
        path.join(process.cwd(), 'src/config/shaders.toml'),
        path.join(process.cwd(), 'dist/config/shaders.toml')
      ];
      
      let configContent = '';
      let configPath = '';
      
      for (const testPath of possiblePaths) {
        try {
          configContent = fsSync.readFileSync(testPath, 'utf-8');
          configPath = testPath;
          break;
        } catch {
          // Try next path
        }
      }
      
      if (!configContent) {
        throw new Error('No shader config found in any expected location');
      }
      
      this.shaderConfigs = toml.parse(configContent);
      logger.debug(`Loaded ${Object.keys(this.shaderConfigs).length} shader configurations from ${configPath}`);
    } catch (error) {
      logger.warn('Failed to load shader configurations, using defaults');
      this.shaderConfigs = {};
    }
  }


  static getInstance(): ScreenshotService {
    if (!ScreenshotService.instance) {
      ScreenshotService.instance = new ScreenshotService();
    }
    return ScreenshotService.instance;
  }

  async generateCodeScreenshot(
    code: string,
    language: string,
    config: Config['screenshots'],
    customOptions: any = {}
  ): Promise<Buffer> {
    try {
      logger.debug('Generating layered Canvas screenshot...');

      // Load theme
      const theme = await this.themeLoader.getTheme(config.theme);
      
      // Configuration
      const fontSize = customOptions.fontSize || 16;
      const lineHeight = fontSize * 1.5;
      const outerPadding = 60; // Background padding
      const innerPadding = 40; // Code window padding
      const windowControlsHeight = customOptions.windowControls ? 50 : 0;
      
      // Process code
      const lines = code.split('\n');
      const highlightedCode = this.highlightCode(code, language);
      
      // Calculate code window dimensions
      const maxLineLength = Math.max(...lines.map(line => line.length), 20);
      const charWidth = fontSize * 0.6;
      const codeContentWidth = maxLineLength * charWidth;
      const codeWindowWidth = Math.round(Math.max(400, codeContentWidth + (innerPadding * 2)));
      const codeWindowHeight = Math.round((lines.length * lineHeight) + (innerPadding * 2) + windowControlsHeight);
      
      // Calculate total canvas dimensions - ENSURE INTEGER PIXELS TO PREVENT SCANLINES
      const totalWidth = Math.round(codeWindowWidth + (outerPadding * 2));
      const totalHeight = Math.round(codeWindowHeight + (outerPadding * 2));

      // Create code window layer with extra space for shadow - ENSURE INTEGER DIMENSIONS
      const shadowOffset = 30;
      const codeCanvas = createCanvas(
        Math.round(codeWindowWidth + shadowOffset * 2), 
        Math.round(codeWindowHeight + shadowOffset * 2)
      );
      const codeCtx = codeCanvas.getContext('2d');
      
      // Draw drop shadow
      const shadowX = shadowOffset + 5;
      const shadowY = shadowOffset + 8;
      const cornerRadius = 12;
      
      codeCtx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      this.drawRoundedRect(codeCtx, shadowX, shadowY, codeWindowWidth, codeWindowHeight, cornerRadius);
      codeCtx.fill();
      
      // Apply shadow blur (note: filter might not be supported in all Canvas implementations)
      try {
        (codeCtx as any).filter = 'blur(8px)';
        codeCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        this.drawRoundedRect(codeCtx, shadowX, shadowY, codeWindowWidth, codeWindowHeight, cornerRadius);
        codeCtx.fill();
        (codeCtx as any).filter = 'none';
      } catch {
        // Fallback if filter is not supported
        codeCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        this.drawRoundedRect(codeCtx, shadowX, shadowY, codeWindowWidth, codeWindowHeight, cornerRadius);
        codeCtx.fill();
      }
      
      // Draw code window background with rounded corners
      codeCtx.fillStyle = theme.background;
      this.drawRoundedRect(codeCtx, shadowOffset, shadowOffset, codeWindowWidth, codeWindowHeight, cornerRadius);
      codeCtx.fill();
      
      // Clip to rounded rectangle for content
      codeCtx.save();
      this.drawRoundedRect(codeCtx, shadowOffset, shadowOffset, codeWindowWidth, codeWindowHeight, cornerRadius);
      codeCtx.clip();

      // Draw window controls
      let contentStartY = innerPadding + shadowOffset;
      if (customOptions.windowControls) {
        this.drawWindowControls(codeCtx, codeWindowWidth, theme, shadowOffset);
        contentStartY += windowControlsHeight;
      }

      // Setup text rendering
      codeCtx.font = `${fontSize}px "SF Mono", Monaco, Consolas, monospace`;
      codeCtx.textBaseline = 'top';

      // Render code with Twemoji support
      await this.renderCodeWithTwemoji(codeCtx, highlightedCode, theme, innerPadding + shadowOffset, contentStartY, fontSize, lineHeight);

      codeCtx.restore(); // Restore clipping

      // Composite layers
      const finalCanvas = createCanvas(totalWidth, totalHeight);
      const finalCtx = finalCanvas.getContext('2d');
      
      // Disable anti-aliasing to prevent scanlines
      finalCtx.imageSmoothingEnabled = false;
      finalCtx.antialias = 'none';
      
      // Apply shader effect directly to final canvas (if specified)
      if (customOptions.shader) {
        if (customOptions.shader === 'cyberpunk') {
          // Cyberpunk uses intentional scanlines
          finalCtx.fillStyle = '#120458';
          finalCtx.fillRect(0, 0, totalWidth, totalHeight);
          await this.applyShaderEffect(finalCtx, customOptions.shader, totalWidth, totalHeight, theme);
        } else {
          // Extract theme colors for shader rendering
          const themeColors = this.extractThemeColors(theme);
          
          // Use WASM rasterizer with theme-aware colors for scanline-free shader rendering
          const backgroundRasterizer = new WasmRasterizer(totalWidth, totalHeight, themeColors);
          
          switch (customOptions.shader) {
            case 'wave-gradient':
              backgroundRasterizer.renderWaveGradient();
              break;
            case 'halftone':
              backgroundRasterizer.renderHalftone();
              break;
            case 'disruptor':
              backgroundRasterizer.renderDisruptor();
              break;
            case 'matrix':
              backgroundRasterizer.renderMatrix();
              break;
          }
          
          // Convert to PNG and load as image with crisp rendering
          const shaderPng = await backgroundRasterizer.toPNG();
          const shaderImg = await loadImage(shaderPng);
          
          // Ensure crisp rendering
          finalCtx.imageSmoothingEnabled = false;
          finalCtx.drawImage(shaderImg, 0, 0);
        }
      } else {
        // Default gradient background
        const gradient = finalCtx.createLinearGradient(0, 0, totalWidth, totalHeight);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        finalCtx.fillStyle = gradient;
        finalCtx.fillRect(0, 0, totalWidth, totalHeight);
      }
      
      // Draw code window centered (accounting for shadow) - use integer coordinates
      const codeX = Math.floor((totalWidth - (codeWindowWidth + shadowOffset * 2)) / 2);
      const codeY = Math.floor((totalHeight - (codeWindowHeight + shadowOffset * 2)) / 2);
      finalCtx.drawImage(codeCanvas, codeX, codeY);

      return finalCanvas.toBuffer('image/png');
    } catch (error) {
      logger.error('Screenshot generation failed:', error);
      throw new ScreenshotError('Failed to generate screenshot', error);
    }
  }

  private highlightCode(code: string, language: string): Array<{line: string, tokens: Array<{text: string, type?: string}>}> {
    try {
      let result;
      if (language === 'auto' || !language) {
        result = hljs.highlightAuto(code);
      } else {
        result = hljs.highlight(code, { language });
      }
      
      return this.parseHighlightedCode(result.value, code);
    } catch (error) {
      // Fallback to plain text
      return code.split('\n').map(line => ({
        line,
        tokens: [{ text: line }]
      }));
    }
  }

  private parseHighlightedCode(_html: string, originalCode: string): Array<{line: string, tokens: Array<{text: string, type?: string}>}> {
    const lines = originalCode.split('\n');
    
    // Simple approach: return lines with basic token info
    return lines.map(line => {
      const tokens: Array<{text: string, type?: string}> = [];
      
      // Basic keyword detection
      const words = line.split(/(\s+)/);
      for (const word of words) {
        if (this.isKeyword(word.trim())) {
          tokens.push({ text: word, type: 'keyword' });
        } else if (this.isString(word.trim())) {
          tokens.push({ text: word, type: 'string' });
        } else if (this.isNumber(word.trim())) {
          tokens.push({ text: word, type: 'number' });
        } else if (this.isComment(word.trim())) {
          tokens.push({ text: word, type: 'comment' });
        } else {
          tokens.push({ text: word });
        }
      }
      
      return { line, tokens };
    });
  }

  private isKeyword(word: string): boolean {
    const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'interface', 'type', 'import', 'export', 'async', 'await'];
    return keywords.includes(word);
  }

  private isString(word: string): boolean {
    return (word.startsWith('"') && word.endsWith('"')) || (word.startsWith("'") && word.endsWith("'")) || (word.startsWith('`') && word.endsWith('`'));
  }

  private isNumber(word: string): boolean {
    return /^\d+(\.\d+)?$/.test(word);
  }

  private isComment(word: string): boolean {
    return word.startsWith('//') || word.startsWith('/*') || word.startsWith('#');
  }

  private async renderTextWithTwemoji(
    ctx: any, 
    text: string, 
    x: number, 
    y: number, 
    color: string, 
    fontSize: number
  ): Promise<number> {
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
    let currentX = x;
    let lastIndex = 0;
    let match;

    // Find all emoji matches
    const matches = [];
    while ((match = emojiRegex.exec(text)) !== null) {
      matches.push({
        emoji: match[0],
        index: match.index,
        length: match[0].length
      });
    }

    if (matches.length === 0) {
      // No emojis, render as regular text
      ctx.fillStyle = color;
      ctx.fillText(text, currentX, y);
      return ctx.measureText(text).width;
    }

    // Render text with emojis
    for (const emojiMatch of matches) {
      // Render text before emoji
      if (emojiMatch.index > lastIndex) {
        const beforeText = text.substring(lastIndex, emojiMatch.index);
        ctx.fillStyle = color;
        ctx.fillText(beforeText, currentX, y);
        currentX += ctx.measureText(beforeText).width;
      }

      // Render Twemoji
      try {
        const emojiImage = await this.loadTwemoji(emojiMatch.emoji);
        const emojiSize = fontSize * 0.9;
        const emojiY = y + (fontSize * 0.05); // Slight vertical adjustment
        ctx.drawImage(emojiImage, currentX, emojiY, emojiSize, emojiSize);
        currentX += emojiSize + 2; // Add small spacing
      } catch (error) {
        // Fallback to text rendering
        ctx.fillStyle = color;
        ctx.fillText(emojiMatch.emoji, currentX, y);
        currentX += ctx.measureText(emojiMatch.emoji).width;
      }

      lastIndex = emojiMatch.index + emojiMatch.length;
    }

    // Render remaining text after last emoji
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      ctx.fillStyle = color;
      ctx.fillText(remainingText, currentX, y);
      currentX += ctx.measureText(remainingText).width;
    }

    return currentX - x;
  }

  private async loadTwemoji(emoji: string): Promise<any> {
    const codePoint = this.getEmojiCodePoint(emoji);
    
    if (this.emojiCache.has(codePoint)) {
      return this.emojiCache.get(codePoint);
    }

    // Try different Twemoji URLs and versions
    const urls = [
      `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codePoint}.png`,
      `https://twemoji.maxcdn.com/v/14.0.2/72x72/${codePoint}.png`,
      `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/${codePoint}.png`
    ];

    for (const url of urls) {
      try {
        const response = await axios.get(url, { 
          responseType: 'arraybuffer',
          timeout: 2000,
          validateStatus: (status) => status === 200
        });
        
        const image = await loadImage(Buffer.from(response.data));
        this.emojiCache.set(codePoint, image);
        
        logger.debug(`Successfully loaded Twemoji for ${emoji} from ${url}`);
        return image;
      } catch (error) {
        logger.debug(`Failed to load Twemoji from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        continue;
      }
    }

    // If all URLs fail, try fallback with simplified codepoint (for compound emojis)
    const simplifiedCodePoint = this.getSimplifiedEmojiCodePoint(emoji);
    if (simplifiedCodePoint !== codePoint) {
      for (const url of urls) {
        try {
          const fallbackUrl = url.replace(codePoint, simplifiedCodePoint);
          const response = await axios.get(fallbackUrl, { 
            responseType: 'arraybuffer',
            timeout: 2000,
            validateStatus: (status) => status === 200
          });
          
          const image = await loadImage(Buffer.from(response.data));
          this.emojiCache.set(codePoint, image);
          
          logger.debug(`Successfully loaded fallback Twemoji for ${emoji} (${simplifiedCodePoint})`);
          return image;
        } catch (error) {
          continue;
        }
      }
    }

    logger.warn(`Failed to load Twemoji for ${emoji} (${codePoint}) from all sources`);
    throw new Error(`Twemoji not found for ${emoji}`);
  }

  private getEmojiCodePoint(emoji: string): string {
    const codePoints = [...emoji].map(char => 
      char.codePointAt(0)?.toString(16).toLowerCase()
    ).filter(Boolean);
    
    return codePoints.join('-');
  }

  private getSimplifiedEmojiCodePoint(emoji: string): string {
    // Get the first significant codepoint, removing variation selectors and modifiers
    const codePoints = [...emoji]
      .map(char => char.codePointAt(0))
      .filter((cp): cp is number => cp !== undefined)
      .filter(cp => {
        // Remove variation selectors (FE0F, FE0E) and skin tone modifiers (1F3FB-1F3FF)
        return cp !== 0xFE0F && cp !== 0xFE0E && !(cp >= 0x1F3FB && cp <= 0x1F3FF);
      });
    
    // Return just the first codepoint for fallback
    return codePoints.length > 0 ? codePoints[0]!.toString(16).toLowerCase() : '';
  }

  private drawRoundedRect(ctx: any, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private drawWindowControls(ctx: any, width: number, theme: any, offsetX: number = 0): void {
    // Title bar background
    ctx.fillStyle = theme.windowControls?.background || '#2d2d2d';
    ctx.fillRect(offsetX, offsetX, width, 50);

    // Window buttons
    const buttonY = 20 + offsetX;
    const buttonRadius = 8;
    
    // Red (close)
    ctx.beginPath();
    ctx.arc(25 + offsetX, buttonY, buttonRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ff5f57';
    ctx.fill();

    // Yellow (minimize)  
    ctx.beginPath();
    ctx.arc(55 + offsetX, buttonY, buttonRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffbd2e';
    ctx.fill();

    // Green (maximize)
    ctx.beginPath();
    ctx.arc(85 + offsetX, buttonY, buttonRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#28ca42';
    ctx.fill();
  }

  private async renderCodeWithTwemoji(
    ctx: any, 
    highlightedCode: Array<{line: string, tokens: Array<{text: string, type?: string}>}>, 
    theme: any, 
    padding: number, 
    startY: number, 
    fontSize: number, 
    lineHeight: number
  ): Promise<void> {
    const colorMap = this.themeLoader.getColorMapping(theme);
    let currentY = startY;

    for (const { tokens } of highlightedCode) {
      let currentX = padding;
      
      for (const token of tokens) {
        // Get color for token type
        let color = theme.text;
        if (token.type) {
          color = colorMap[`hljs-${token.type}`] || theme.text;
        }
        
        // Render token with Twemoji support
        currentX += await this.renderTextWithTwemoji(ctx, token.text, currentX, currentY, color, fontSize);
      }
      
      currentY += lineHeight;
    }
  }

  private async applyShaderEffect(ctx: any, shaderName: string, width: number, height: number, _theme: any): Promise<void> {
    const shaderConfig = this.shaderConfigs[shaderName];
    if (!shaderConfig) {
      logger.warn(`Shader '${shaderName}' not found in config`);
      return;
    }

    // Use WASM rasterizer for scanline-free rendering
    const rasterizer = new WasmRasterizer(width, height);
    
    switch (shaderName) {
      case 'wave-gradient':
        rasterizer.renderWaveGradient();
        break;
      case 'halftone':
        rasterizer.renderHalftone();
        break;
      case 'disruptor':
        rasterizer.renderDisruptor();
        break;
      case 'matrix':
        rasterizer.renderMatrix();
        break;
      case 'cyberpunk':
        // Cyberpunk still uses the old method for intentional scanlines
        this.applyShaderWithImageData(ctx, shaderName, width, height, shaderConfig);
        return;
      default:
        logger.warn(`Unknown shader: ${shaderName}`);
        return;
    }

    // Convert pixels to PNG and load as image (avoids putImageData scanlines)
    const pngBuffer = await rasterizer.toPNG();
    const img = await loadImage(pngBuffer);
    
    // Clear original canvas and draw shader image
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);
  }

  private applyShaderWithImageData(ctx: any, shaderName: string, width: number, height: number, shaderConfig: any): void {
    // Create a temporary canvas for shader processing
    const shaderCanvas = createCanvas(width, height);
    const shaderCtx = shaderCanvas.getContext('2d');
    
    // Copy current canvas content to shader canvas
    shaderCtx.drawImage(ctx.canvas, 0, 0);
    
    // Get image data from shader canvas
    const imageData = shaderCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    if (shaderName === 'cyberpunk') {
      this.applyCyberpunk(data, width, height, shaderConfig);
    }

    // Put modified image data back to shader canvas
    shaderCtx.putImageData(imageData, 0, 0);
    
    // Clear original canvas and draw shader canvas to it
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(shaderCanvas, 0, 0);
  }


  private applyCyberpunk(data: Uint8ClampedArray, width: number, height: number, config: any): void {
    const lineSpacing = config.line_spacing || 3;
    const lineOpacity = config.line_opacity || 0.1;
    const glowColor = this.hexToRgb(config.glow_color || '#00ff88');
    const flickerIntensity = config.flicker_intensity || 0.05;
    
    for (let y = 0; y < height; y++) {
      const isLine = y % lineSpacing === 0;
      const flicker = Math.random() * flickerIntensity;
      
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        if (isLine) {
          // Add scanline effect
          const alpha = lineOpacity + flicker;
          data[idx] = Math.min(255, data[idx] * (1 - alpha) + glowColor.r * alpha);
          data[idx + 1] = Math.min(255, data[idx + 1] * (1 - alpha) + glowColor.g * alpha);
          data[idx + 2] = Math.min(255, data[idx + 2] * (1 - alpha) + glowColor.b * alpha);
        }
        
        // Add subtle green tint
        data[idx + 1] = Math.min(255, data[idx + 1] + 10);
      }
    }
  }


  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  private extractThemeColors(theme: any): ThemeColors {
    // Use explicit shader colors if defined in theme
    if (theme.shader?.colors) {
      return {
        primary: theme.shader.colors.primary,
        secondary: theme.shader.colors.secondary,
        accent: theme.shader.colors.accent,
        background: theme.background
      };
    }

    // Intelligently map theme syntax colors to shader colors based on theme name
    const themeName = theme.name?.toLowerCase() || '';
    
    if (themeName.includes('synthwave')) {
      return {
        primary: theme.keyword || '#ff79c6',      // Pink keywords
        secondary: theme.function || '#50fa7b',   // Green functions  
        accent: theme.string || '#f1fa8c',        // Yellow strings
        background: theme.background || '#2d1b69'
      };
    } else if (themeName.includes('cyberpunk')) {
      return {
        primary: theme.keyword || '#ff0080',      // Magenta keywords
        secondary: theme.function || '#00ff80',   // Green functions
        accent: theme.number || '#00ffff',        // Cyan numbers
        background: theme.background || '#0a0a0a'
      };
    } else if (themeName.includes('dracula')) {
      return {
        primary: theme.keyword || '#ff79c6',      // Pink keywords
        secondary: theme.variable || '#8be9fd',   // Cyan variables
        accent: theme.string || '#f1fa8c',        // Yellow strings
        background: theme.background || '#282a36'
      };
    } else if (themeName.includes('nord')) {
      return {
        primary: theme.keyword || '#81a1c1',      // Light blue keywords
        secondary: theme.function || '#88c0d0',   // Cyan functions
        accent: theme.string || '#a3be8c',        // Green strings
        background: theme.background || '#2e3440'
      };
    } else if (themeName.includes('gruvbox')) {
      return {
        primary: theme.keyword || '#fb4934',      // Red keywords
        secondary: theme.function || '#fabd2f',   // Yellow functions
        accent: theme.string || '#b8bb26',        // Green strings
        background: theme.background || '#282828'
      };
    }

    // Generic fallback using semantic syntax highlighting colors
    return {
      primary: theme.keyword || theme.text || '#ff6b6b',
      secondary: theme.function || theme.variable || '#4ecdc4',
      accent: theme.string || theme.number || '#45b7d1',
      background: theme.background || '#2a2a2a'
    };
  }


  async readCodeFile(filePath: string, lineRange?: string): Promise<{ code: string; language: string }> {
    try {
      const absolutePath = path.resolve(filePath);
      await fs.access(absolutePath);
      
      const content = await fs.readFile(absolutePath, 'utf-8');
      const lines = content.split('\n');

      let code = content;
      if (lineRange) {
        const [start, end] = lineRange.split('-').map(n => parseInt(n, 10));
        if (!isNaN(start) && !isNaN(end)) {
          code = lines.slice(start - 1, end).join('\n');
        } else if (!isNaN(start)) {
          code = lines[start - 1] || '';
        }
      }

      const ext = path.extname(filePath).toLowerCase();
      const languageMap: Record<string, string> = {
        '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
        '.py': 'python', '.java': 'java', '.c': 'c', '.cpp': 'cpp', '.cs': 'csharp',
        '.go': 'go', '.rs': 'rust', '.php': 'php', '.rb': 'ruby', '.swift': 'swift',
        '.kt': 'kotlin', '.dart': 'dart', '.r': 'r', '.m': 'objectivec', '.scala': 'scala',
        '.clj': 'clojure', '.lua': 'lua', '.pl': 'perl', '.sh': 'shell', '.bash': 'shell',
        '.zsh': 'shell', '.fish': 'shell', '.ps1': 'powershell', '.yaml': 'yaml',
        '.yml': 'yaml', '.json': 'json', '.xml': 'xml', '.html': 'html', '.css': 'css',
        '.scss': 'scss', '.sass': 'sass', '.less': 'less', '.sql': 'sql',
        '.md': 'markdown', '.mdx': 'markdown', '.vue': 'vue', '.svelte': 'svelte'
      };

      const language = languageMap[ext] || 'text';
      return { code, language };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new FileError(`File not found: ${filePath}`);
      }
      throw new FileError(`Failed to read code file: ${error.message}`, error);
    }
  }

  async saveScreenshot(buffer: Buffer): Promise<string> {
    try {
      const tempDir = path.join(process.cwd(), '.bip-temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      const filename = `screenshot-${Date.now()}.png`;
      const filepath = path.join(tempDir, filename);
      
      await fs.writeFile(filepath, buffer);
      return filepath;
    } catch (error) {
      throw new ScreenshotError('Failed to save screenshot', error);
    }
  }

  getAvailableThemes(): string[] {
    return this.themeLoader.getAllThemes();
  }
}