import { createCanvas, registerFont, Canvas } from 'canvas';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { Config } from '../types';
import { FileError, ScreenshotError } from '../utils/errors';
import { logger } from '../utils/logger';
import hljs from 'highlight.js';
import { ThemeLoader } from '../themes/theme-loader';
import { CodeTheme } from '../themes/theme.types';
import { ShaderRenderer, ShaderConfig } from './shader-renderer';

interface Dimensions {
  canvas: { width: number; height: number };
  window: { x: number; y: number; width: number; height: number };
  content: { x: number; y: number; width: number; height: number };
  scale: number;
}

interface RenderOptions {
  theme: string;
  backgroundColor?: string;
  fontFamily: string;
  fontSize: number;
  lineNumbers: boolean;
  windowControls: boolean;
  padding: number;
  width: number;
  language: string;
  lineWrap: boolean;
  gradient: boolean;
  shader?: string;
  shaderColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
  };
  shaderParams?: {
    intensity?: number;
    scale?: number;
  };
}

interface ParsedToken {
  type: string;
  text: string;
  isEmoji: boolean;
}

export class ScreenshotServiceV3 {
  private static instance: ScreenshotServiceV3;
  private themeLoader: ThemeLoader;
  private shaderRenderer: ShaderRenderer;

  private constructor() {
    this.loadFonts();
    this.themeLoader = ThemeLoader.getInstance();
    this.shaderRenderer = ShaderRenderer.getInstance();
    
    const customThemesPath = path.join(process.cwd(), '.bip-themes');
    this.themeLoader.loadCustomThemes(customThemesPath);
  }

  static getInstance(): ScreenshotServiceV3 {
    if (!ScreenshotServiceV3.instance) {
      ScreenshotServiceV3.instance = new ScreenshotServiceV3();
    }
    return ScreenshotServiceV3.instance;
  }

  private loadFonts() {
    try {
      // Load monospace fonts
      const monoFonts = [
        '/System/Library/Fonts/Menlo.ttc',
        '/System/Library/Fonts/Monaco.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
      ];

      for (const fontPath of monoFonts) {
        if (fsSync.existsSync(fontPath)) {
          registerFont(fontPath, { family: 'Monospace' });
          logger.debug(`Loaded mono font: ${fontPath}`);
          break;
        }
      }

      // Load emoji fonts
      const emojiFonts = [
        '/System/Library/Fonts/Apple Color Emoji.ttc',
        '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',
        '/System/Library/Fonts/Helvetica.ttc' // Fallback
      ];

      for (const fontPath of emojiFonts) {
        if (fsSync.existsSync(fontPath)) {
          registerFont(fontPath, { family: 'EmojiFont' });
          logger.debug(`Loaded emoji font: ${fontPath}`);
          break;
        }
      }
    } catch (error) {
      logger.warn('Could not load custom fonts, using default');
    }
  }

  async generateCodeScreenshot(
    code: string,
    language: string,
    config: Config['screenshots'],
    customOptions?: Partial<RenderOptions>
  ): Promise<Buffer> {
    try {
      logger.debug('Generating code screenshot with V3 renderer...');

      const options: RenderOptions = {
        theme: customOptions?.theme || config.theme || 'dracula',
        backgroundColor: customOptions?.backgroundColor || config.backgroundColor,
        fontFamily: customOptions?.fontFamily || 'Monospace',
        fontSize: parseInt(customOptions?.fontSize as any || '14'),
        lineNumbers: customOptions?.lineNumbers || false,
        windowControls: customOptions?.windowControls !== false,
        padding: customOptions?.padding || config.padding || 32,
        width: customOptions?.width || 680,
        language: language || config.language || 'javascript',
        lineWrap: customOptions?.lineWrap !== false,
        gradient: customOptions?.gradient !== false,
        shader: customOptions?.shader,
        shaderColors: customOptions?.shaderColors,
        shaderParams: customOptions?.shaderParams
      };

      return this.renderScreenshot(code, options);
    } catch (error: any) {
      throw new ScreenshotError(`Failed to generate code screenshot: ${error.message}`, error);
    }
  }

  private detectEmojis(text: string): boolean {
    // Comprehensive emoji detection
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F191}-\u{1F251}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F171}]|[\u{1F17E}-\u{1F17F}]|[\u{1F18E}]|[\u{3030}]|[\u{2B50}]|[\u{2B55}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{3297}]|[\u{3299}]|[\u{303D}]|[\u{00A9}]|[\u{00AE}]|[\u{2122}]|[\u{23F0}]|[\u{23F3}]|[\u{24C2}]|[\u{23E9}-\u{23EF}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{23F8}-\u{23FA}]/gu;
    return emojiRegex.test(text);
  }

  private highlightCodePreservingEmoji(code: string, language: string): Array<{ line: string; hasEmoji: boolean }> {
    // Split into lines first to preserve structure
    const lines = code.split('\n');
    const result: Array<{ line: string; hasEmoji: boolean }> = [];

    // For markdown, handle differently to preserve formatting
    if (language === 'markdown' || language === 'md') {
      lines.forEach(line => {
        result.push({
          line: this.highlightMarkdownLine(line),
          hasEmoji: this.detectEmojis(line)
        });
      });
      return result;
    }

    // For other languages, use hljs but preserve emojis
    try {
      const highlighted = hljs.highlight(code, { language }).value;
      const highlightedLines = highlighted.split('\n');
      
      highlightedLines.forEach((highlightedLine, index) => {
        const originalLine = lines[index] || '';
        result.push({
          line: highlightedLine,
          hasEmoji: this.detectEmojis(originalLine)
        });
      });
    } catch (error) {
      // Fallback to no highlighting
      lines.forEach(line => {
        result.push({
          line: line,
          hasEmoji: this.detectEmojis(line)
        });
      });
    }

    return result;
  }

  private highlightMarkdownLine(line: string): string {
    // Simple markdown highlighting that preserves emojis
    let highlighted = line;
    
    // Headers
    if (line.match(/^#{1,6}\s/)) {
      highlighted = `<span class="hljs-section">${line}</span>`;
    }
    // Bold
    else if (line.includes('**')) {
      highlighted = line.replace(/\*\*(.*?)\*\*/g, '<span class="hljs-strong">**$1**</span>');
    }
    // Code
    else if (line.includes('`')) {
      highlighted = line.replace(/`([^`]+)`/g, '<span class="hljs-code">`$1`</span>');
    }
    // Lists
    else if (line.match(/^[\s]*[-*+]\s/)) {
      highlighted = `<span class="hljs-bullet">${line}</span>`;
    }
    
    return highlighted;
  }

  private calculateDimensions(
    lineData: Array<{ text: string; width: number }>,
    options: RenderOptions
  ): Dimensions {
    const scale = 2; // Retina scale
    const outerPadding = 40; // Space for shadow
    const windowBarHeight = options.windowControls ? 36 : 0;
    const lineHeight = options.fontSize * 1.5;
    
    // Window dimensions
    const windowWidth = options.width;
    const windowHeight = lineData.length * lineHeight + (options.padding * 2) + windowBarHeight;
    
    // Canvas dimensions (includes outer padding)
    const canvasWidth = windowWidth + (outerPadding * 2);
    const canvasHeight = windowHeight + (outerPadding * 2);
    
    // Content area
    const contentX = outerPadding + options.padding + (options.lineNumbers ? 50 : 0);
    const contentY = outerPadding + windowBarHeight + options.padding;
    const contentWidth = windowWidth - (options.padding * 2) - (options.lineNumbers ? 50 : 0);
    
    return {
      canvas: {
        width: canvasWidth * scale,
        height: canvasHeight * scale
      },
      window: {
        x: outerPadding * scale,
        y: outerPadding * scale,
        width: windowWidth * scale,
        height: windowHeight * scale
      },
      content: {
        x: contentX * scale,
        y: contentY * scale,
        width: contentWidth * scale,
        height: (lineData.length * lineHeight) * scale
      },
      scale
    };
  }

  private wrapText(
    text: string, 
    ctx: any,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        
        // Check if single word is too long
        if (ctx.measureText(word).width > maxWidth) {
          // Break word at character level
          const chars = word.split('');
          let charLine = '';
          
          for (const char of chars) {
            const testCharLine = charLine + char;
            if (ctx.measureText(testCharLine).width > maxWidth && charLine) {
              lines.push(charLine);
              charLine = char;
            } else {
              charLine = testCharLine;
            }
          }
          
          currentLine = charLine;
        } else {
          currentLine = word;
        }
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines.length > 0 ? lines : [''];
  }

  private async renderScreenshot(
    code: string,
    options: RenderOptions
  ): Promise<Buffer> {
    // Get theme
    const syntaxTheme = this.themeLoader.getTheme(options.theme) || this.themeLoader.getTheme('dracula')!;
    const bgColor = options.backgroundColor || syntaxTheme.background;

    // Highlight code while preserving emojis
    const highlightedLines = this.highlightCodePreservingEmoji(code, options.language);

    // Create temporary canvas for text measurement
    const tempCanvas = createCanvas(100, 100);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${options.fontSize}px ${options.fontFamily}`;

    // Calculate wrapped lines
    const lineData: Array<{ text: string; width: number; hasEmoji: boolean; tokens: ParsedToken[] }> = [];
    const maxTextWidth = options.width - (options.padding * 2) - (options.lineNumbers ? 50 : 0);

    highlightedLines.forEach(({ line, hasEmoji }) => {
      if (options.lineWrap) {
        // Parse the highlighted line to get plain text for measurement
        const plainText = line.replace(/<[^>]+>/g, '');
        const wrappedPlainLines = this.wrapText(plainText, tempCtx, maxTextWidth);
        
        // For each wrapped line, preserve the highlighting
        wrappedPlainLines.forEach(wrappedLine => {
          lineData.push({
            text: wrappedLine,
            width: tempCtx.measureText(wrappedLine).width,
            hasEmoji,
            tokens: this.parseHighlightedLine(line) // Parse once
          });
        });
      } else {
        lineData.push({
          text: line,
          width: tempCtx.measureText(line.replace(/<[^>]+>/g, '')).width,
          hasEmoji,
          tokens: this.parseHighlightedLine(line)
        });
      }
    });

    // Calculate final dimensions
    const dims = this.calculateDimensions(lineData, options);
    logger.debug(`Canvas: ${dims.canvas.width}x${dims.canvas.height}`);
    logger.debug(`Lines: ${lineData.length}`);

    // Create canvas
    const canvas = createCanvas(dims.canvas.width, dims.canvas.height);
    const ctx = canvas.getContext('2d');
    
    // Enable high quality rendering
    ctx.imageSmoothingEnabled = true;
    (ctx as any).imageSmoothingQuality = 'high';

    // Step 1: Render background
    if (options.shader || syntaxTheme.shader?.name) {
      const shaderName = options.shader || syntaxTheme.shader?.name || 'halftone';
      const shaderConfig: Partial<ShaderConfig> = {
        name: shaderName,
        colors: options.shaderColors || syntaxTheme.shader?.colors,
        parameters: options.shaderParams || syntaxTheme.shader?.parameters
      };
      
      const shaderCanvas = this.shaderRenderer.renderShaderBackground(
        dims.canvas.width,
        dims.canvas.height,
        syntaxTheme,
        shaderName,
        shaderConfig
      );
      
      ctx.drawImage(shaderCanvas, 0, 0);
    } else if (options.gradient && syntaxTheme.gradientFrom && syntaxTheme.gradientTo) {
      const gradient = ctx.createLinearGradient(0, 0, 0, dims.canvas.height);
      gradient.addColorStop(0, syntaxTheme.gradientFrom);
      gradient.addColorStop(1, syntaxTheme.gradientTo);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, dims.canvas.width, dims.canvas.height);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, dims.canvas.width, dims.canvas.height);
    }

    // Step 2: Draw window with shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20 * dims.scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10 * dims.scale;
    
    ctx.fillStyle = bgColor;
    this.drawRoundedRect(
      ctx,
      dims.window.x,
      dims.window.y,
      dims.window.width,
      dims.window.height,
      12 * dims.scale
    );
    ctx.restore();

    // Step 3: Draw window controls
    if (options.windowControls) {
      this.drawWindowControls(ctx, dims.window, dims.scale);
    }

    // Step 4: Draw text
    ctx.font = `${options.fontSize * dims.scale}px ${options.fontFamily}`;
    ctx.textBaseline = 'top';

    lineData.forEach((line, index) => {
      const y = dims.content.y + (index * options.fontSize * 1.5 * dims.scale);
      
      // Draw line number
      if (options.lineNumbers) {
        ctx.fillStyle = syntaxTheme.lineNumber || syntaxTheme.comment;
        ctx.fillText(
          String(index + 1).padStart(3, ' '),
          dims.window.x + options.padding * dims.scale,
          y
        );
      }

      // Draw the line with proper emoji handling
      this.drawLineWithEmoji(ctx, line, dims.content.x, y, syntaxTheme, options.fontSize * dims.scale);
    });

    // Convert to buffer
    return canvas.toBuffer('image/png', {
      compressionLevel: 9,
      filters: Canvas.PNG_FILTER_NONE
    }) as Buffer;
  }

  private parseHighlightedLine(html: string): ParsedToken[] {
    const tokens: ParsedToken[] = [];
    let remaining = html;
    
    while (remaining.length > 0) {
      const spanMatch = remaining.match(/^<span class="hljs-([\w-]+)">/);
      
      if (spanMatch) {
        const spanType = spanMatch[1];
        const startIndex = spanMatch[0].length;
        const endIndex = remaining.indexOf('</span>', startIndex);
        
        if (endIndex !== -1) {
          const content = remaining.substring(startIndex, endIndex);
          // Don't parse nested spans, just get the text
          const plainContent = content.replace(/<[^>]+>/g, '');
          
          tokens.push({
            type: spanType,
            text: plainContent,
            isEmoji: this.detectEmojis(plainContent)
          });
          
          remaining = remaining.substring(endIndex + 7);
        } else {
          // Malformed, treat as text
          tokens.push({
            type: 'text',
            text: remaining,
            isEmoji: this.detectEmojis(remaining)
          });
          break;
        }
      } else {
        // Plain text until next tag
        const nextTag = remaining.indexOf('<');
        const text = nextTag === -1 ? remaining : remaining.substring(0, nextTag);
        
        if (text) {
          tokens.push({
            type: 'text',
            text: this.unescapeHtml(text),
            isEmoji: this.detectEmojis(text)
          });
        }
        
        remaining = nextTag === -1 ? '' : remaining.substring(nextTag);
      }
    }
    
    return tokens;
  }

  private drawLineWithEmoji(
    ctx: any,
    line: { text: string; hasEmoji: boolean; tokens: ParsedToken[] },
    x: number,
    y: number,
    theme: CodeTheme,
    fontSize: number
  ) {
    let currentX = x;
    
    // If we have tokens from parsing, use them
    if (line.tokens && line.tokens.length > 0) {
      line.tokens.forEach(token => {
        ctx.fillStyle = this.getTokenColor(token.type, theme);
        
        if (token.isEmoji) {
          // Draw with emoji font
          ctx.save();
          ctx.font = `${fontSize}px Apple Color Emoji, Segoe UI Emoji, ${ctx.font}`;
          ctx.fillText(token.text, currentX, y);
          ctx.restore();
        } else {
          ctx.fillText(token.text, currentX, y);
        }
        
        currentX += ctx.measureText(token.text).width;
      });
    } else {
      // Fallback to simple text drawing
      ctx.fillStyle = theme.foreground;
      if (line.hasEmoji) {
        ctx.save();
        ctx.font = `${fontSize}px Apple Color Emoji, Segoe UI Emoji, ${ctx.font}`;
        ctx.fillText(line.text, currentX, y);
        ctx.restore();
      } else {
        ctx.fillText(line.text, currentX, y);
      }
    }
  }

  private getTokenColor(tokenType: string, theme: CodeTheme): string {
    const colorMapping = this.themeLoader.getColorMapping(theme);
    return colorMapping[tokenType] || theme.foreground;
  }

  private unescapeHtml(html: string): string {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  private drawRoundedRect(
    ctx: any,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
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
    ctx.fill();
  }

  private drawWindowControls(ctx: any, window: Dimensions['window'], scale: number) {
    const y = window.y + (18 * scale);
    const radius = 6 * scale;
    const spacing = 20 * scale;
    const startX = window.x + (20 * scale);
    const barHeight = 36 * scale;

    // Window bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(window.x, window.y, window.width, barHeight);

    // Traffic lights
    const colors = ['#ff5f56', '#ffbd2e', '#27c93f'];
    colors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(startX + (spacing * i), y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Compatibility methods
  async readCodeFile(filePath: string, lineRange?: string): Promise<{ code: string; language: string }> {
    // Same implementation as V2
    try {
      const absolutePath = path.resolve(filePath);
      const allowedDir = path.resolve(process.cwd());
      
      if (!absolutePath.startsWith(allowedDir)) {
        throw new FileError(`Access denied: file outside allowed directory`);
      }
      
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
        '.js': 'javascript',
        '.ts': 'typescript',
        '.py': 'python',
        '.md': 'markdown',
        '.json': 'json',
        '.html': 'html',
        '.css': 'css'
      };

      const language = languageMap[ext] || 'text';
      return { code, language };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new FileError(`File not found: ${path.basename(filePath)}`);
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