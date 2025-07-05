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
// import twemoji from 'twemoji'; // TODO: Use for advanced emoji rendering"

export class ScreenshotService {
  private static instance: ScreenshotService;
  private themeLoader: ThemeLoader;
  private shaderRenderer: ShaderRenderer;

  private constructor() {
    this.loadFonts();
    this.themeLoader = ThemeLoader.getInstance();
    this.shaderRenderer = ShaderRenderer.getInstance();
    
    // Load custom themes if directory exists
    const customThemesPath = path.join(process.cwd(), '.bip-themes');
    this.themeLoader.loadCustomThemes(customThemesPath);
  }

  static getInstance(): ScreenshotService {
    if (!ScreenshotService.instance) {
      ScreenshotService.instance = new ScreenshotService();
    }
    return ScreenshotService.instance;
  }

  private loadFonts() {
    try {
      // Try to load system fonts with emoji support
      const fontPaths = [
        '/System/Library/Fonts/Menlo.ttc',
        '/System/Library/Fonts/Monaco.ttf',
        '/System/Library/Fonts/Apple Color Emoji.ttc', // macOS emoji font
        '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
        '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf' // Linux emoji font
      ];

      // Register monospace font
      for (const fontPath of fontPaths) {
        if (fsSync.existsSync(fontPath) && !fontPath.includes('Emoji')) {
          registerFont(fontPath, { family: 'Monospace' });
          break;
        }
      }
      
      // Register emoji font separately
      for (const fontPath of fontPaths) {
        if (fsSync.existsSync(fontPath) && fontPath.includes('Emoji')) {
          registerFont(fontPath, { family: 'EmojiFont' });
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
    customOptions?: {
      backgroundColor?: string;
      theme?: string;
      lineNumbers?: boolean;
      windowControls?: boolean;
      fontSize?: string;
      fontFamily?: string;
      lineWrap?: boolean;
      width?: number;
      padding?: number;
      gradient?: boolean;
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
  ): Promise<Buffer> {
    try {
      logger.debug('Generating code screenshot locally...');

      const options = {
        theme: customOptions?.theme || config.theme || 'dracula',
        backgroundColor: customOptions?.backgroundColor || config.backgroundColor,
        fontFamily: customOptions?.fontFamily || 'Monospace',
        fontSize: parseInt(customOptions?.fontSize || '14px'),
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

      return this.generateScreenshot(code, options);
    } catch (error: any) {
      throw new ScreenshotError(`Failed to generate code screenshot: ${error.message}`, error);
    }
  }

  private async generateScreenshot(
    code: string,
    options: {
      theme: string;
      backgroundColor?: string;
      fontFamily: string;
      fontSize: number;
      lineNumbers: boolean;
      windowControls: boolean;
      padding: number;
      width: number;
      language: string;
      lineWrap?: boolean;
      gradient?: boolean;
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
  ): Promise<Buffer> {
    const { theme, backgroundColor, fontFamily, fontSize, lineNumbers, windowControls, padding, width, language, lineWrap = true, gradient = true, shader, shaderColors, shaderParams } = options;

    // Get theme
    const syntaxTheme = this.themeLoader.getTheme(theme) || this.themeLoader.getTheme('dracula')!;
    const bgColor = backgroundColor || syntaxTheme.background;

    // Use device pixel ratio for high quality
    const scale = 2; // 2x for retina quality
    const scaledWidth = width * scale;
    const scaledFontSize = fontSize * scale;
    const scaledPadding = padding * scale;
    const scaledLineHeight = scaledFontSize * 1.5;
    const scaledWindowBarHeight = windowControls ? 36 * scale : 0;

    // Syntax highlight the code
    const highlightedCode = this.highlightCode(code, language);
    let lines = highlightedCode.split('\n');

    // Create temporary canvas to measure text width
    const tempCanvas = createCanvas(100, 100);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${scaledFontSize}px ${fontFamily}, monospace`;

    // Add outer padding (window shadow area)
    const outerPadding = 40 * scale;
    
    // Calculate inner window dimensions
    const innerWidth = scaledWidth - (outerPadding * 2);
    
    // Handle line wrapping if enabled - wrap to inner window width
    if (lineWrap) {
      const maxTextWidth = innerWidth - (scaledPadding * 2) - (lineNumbers ? 60 * scale : 0);
      lines = this.wrapLines(lines, tempCtx, maxTextWidth);
    }
    
    // Calculate height based on content
    const contentHeight = lines.length * scaledLineHeight;
    const totalInnerHeight = contentHeight + scaledPadding * 2 + scaledWindowBarHeight;
    const totalHeight = totalInnerHeight + (outerPadding * 2);

    // Create high-resolution canvas with full dimensions
    const canvas = createCanvas(scaledWidth, totalHeight);
    const ctx = canvas.getContext('2d');
    
    // Enable font smoothing
    ctx.imageSmoothingEnabled = true;
    (ctx as any).imageSmoothingQuality = 'high';

    // Draw background with shader or gradient support
    if (shader || syntaxTheme.shader?.name) {
      // Use shader background
      const shaderName = shader || syntaxTheme.shader?.name || 'halftone';
      const shaderConfig: Partial<ShaderConfig> = {
        name: shaderName,
        colors: shaderColors || syntaxTheme.shader?.colors,
        parameters: shaderParams || syntaxTheme.shader?.parameters
      };
      
      const shaderCanvas = this.shaderRenderer.renderShaderBackground(
        scaledWidth,
        totalHeight,
        syntaxTheme,
        shaderName,
        shaderConfig
      );
      
      ctx.drawImage(shaderCanvas, 0, 0);
    } else if (gradient && syntaxTheme.gradientFrom && syntaxTheme.gradientTo) {
      // Use gradient background
      const gradientBg = ctx.createLinearGradient(0, 0, scaledWidth, totalHeight);
      gradientBg.addColorStop(0, syntaxTheme.gradientFrom);
      gradientBg.addColorStop(1, syntaxTheme.gradientTo);
      ctx.fillStyle = gradientBg;
      ctx.fillRect(0, 0, scaledWidth, totalHeight);
    } else {
      // Use solid color background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, scaledWidth, totalHeight);
    }
    
    // Draw window background with rounded corners
    ctx.fillStyle = bgColor;
    this.drawRoundedRect(ctx, outerPadding, outerPadding, innerWidth, totalInnerHeight, 12 * scale);

    // Draw window controls
    if (windowControls) {
      this.drawWindowControls(ctx, innerWidth, scale, outerPadding);
    }

    // Set font with proper anti-aliasing and emoji support
    ctx.font = `${scaledFontSize}px ${fontFamily}, EmojiFont, Apple Color Emoji, Noto Color Emoji, monospace`;
    ctx.textBaseline = 'top';
    (ctx as any).textRendering = 'optimizeLegibility';
    (ctx as any).antialias = 'subpixel';

    // Draw code lines
    lines.forEach((line, index) => {
      const y = scaledWindowBarHeight + scaledPadding + index * scaledLineHeight;
      
      // Draw line number if enabled
      if (lineNumbers) {
        ctx.fillStyle = syntaxTheme.lineNumber || syntaxTheme.comment;
        ctx.fillText(
          String(index + 1).padStart(3, ' '),
          outerPadding + scaledPadding,
          y + outerPadding
        );
      }

      // Draw code line with emoji support
      this.drawHighlightedLine(
        ctx,
        line,
        lineNumbers ? outerPadding + scaledPadding + (50 * scale) : outerPadding + scaledPadding,
        y + outerPadding,
        syntaxTheme
      );
    });

    // Add subtle shadow/border
    this.drawBorder(ctx, scaledWidth, totalHeight, outerPadding, innerWidth, totalInnerHeight);

    // Convert to PNG buffer with high quality
    try {
      const buffer = canvas.toBuffer('image/png', {
        compressionLevel: 9,
        filters: Canvas.PNG_FILTER_NONE
      });
      
      return buffer as Buffer;
    } finally {
      // Clean up canvas resources
      tempCanvas.getContext('2d').clearRect(0, 0, 100, 100);
      canvas.getContext('2d').clearRect(0, 0, scaledWidth, totalHeight);
    }
  }

  private highlightCode(code: string, language: string): string {
    try {
      // Map language aliases
      const languageMap: Record<string, string> = {
        'js': 'javascript',
        'ts': 'typescript',
        'py': 'python',
        'rb': 'ruby',
        'yml': 'yaml',
        'sh': 'bash',
        'dockerfile': 'dockerfile'
      };

      const lang = languageMap[language] || language;
      
      // Try to highlight with the specified language
      const result = hljs.getLanguage(lang) 
        ? hljs.highlight(code, { language: lang })
        : hljs.highlightAuto(code);
      
      return result.value;
    } catch (error) {
      logger.warn(`Failed to highlight code as ${language}, using plain text: ${error}`);
      return code;
    }
  }

  private wrapLines(lines: string[], ctx: any, maxWidth: number): string[] {
    const wrappedLines: string[] = [];
    
    lines.forEach(line => {
      // If line is short enough, don't wrap
      const plainText = line.replace(/<[^>]+>/g, '');
      if (ctx.measureText(plainText).width <= maxWidth) {
        wrappedLines.push(line);
        return;
      }
      
      // Parse tokens and wrap
      const tokens = this.parseHighlightedCode(line);
      let currentLine: Array<{ type: string; text: string }> = [];
      let currentWidth = 0;
      
      tokens.forEach(token => {
        // Split on spaces but also check for very long tokens
        const chars = token.text.split('');
        let currentToken = '';
        
        chars.forEach(char => {
          const charWidth = ctx.measureText(char).width;
          
          if (currentWidth + charWidth > maxWidth && currentLine.length > 0) {
            // Push current token if it has content
            if (currentToken) {
              currentLine.push({ type: token.type, text: currentToken });
              currentToken = '';
            }
            // Start new line
            wrappedLines.push(this.tokensToHtml(currentLine));
            currentLine = [];
            currentWidth = 0;
          }
          
          currentToken += char;
          currentWidth += charWidth;
        });
        
        // Add remaining token
        if (currentToken) {
          currentLine.push({ type: token.type, text: currentToken });
        }
      });
      
      // Add remaining line
      if (currentLine.length > 0) {
        wrappedLines.push(this.tokensToHtml(currentLine));
      }
    });
    
    return wrappedLines;
  }

  private tokensToHtml(tokens: Array<{ type: string; text: string }>): string {
    return tokens.map(token => {
      if (token.type === 'text') {
        return token.text;
      }
      return `<span class="hljs-${token.type}">${this.escapeHtml(token.text)}</span>`;
    }).join('');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private drawWindowControls(ctx: any, width: number, scale: number = 1, xOffset: number = 0) {
    const y = 18 * scale;
    const radius = 6 * scale;
    const spacing = 20 * scale;
    const startX = xOffset + 20 * scale;
    const barHeight = 36 * scale;

    // Window bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(xOffset, xOffset, width, barHeight);

    // Red close button
    ctx.fillStyle = '#ff5f56';
    ctx.beginPath();
    ctx.arc(startX, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Yellow minimize button
    ctx.fillStyle = '#ffbd2e';
    ctx.beginPath();
    ctx.arc(startX + spacing, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Green maximize button
    ctx.fillStyle = '#27c93f';
    ctx.beginPath();
    ctx.arc(startX + spacing * 2, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawHighlightedLine(
    ctx: any,
    line: string,
    x: number,
    y: number,
    theme: CodeTheme
  ) {
    // Parse highlighted HTML-like output from highlight.js
    const tokens = this.parseHighlightedCode(line);
    let currentX = x;

    tokens.forEach(token => {
      ctx.fillStyle = this.getTokenColor(token.type, theme);
      
      // Handle emoji rendering specially
      if (this.containsEmoji(token.text)) {
        this.drawTextWithEmoji(ctx, token.text, currentX, y);
      } else {
        ctx.fillText(token.text, currentX, y);
      }
      
      currentX += ctx.measureText(token.text).width;
    });
  }

  private parseHighlightedCode(html: string): Array<{ type: string; text: string }> {
    const tokens: Array<{ type: string; text: string }> = [];
    
    // Handle nested spans by using a more robust parsing approach
    let remaining = html;
    
    while (remaining.length > 0) {
      // Try to find the next span tag
      const spanMatch = remaining.match(/^<span class="hljs-([\w-]+)">/);
      
      if (spanMatch) {
        // Found a span, find its closing tag
        const spanType = spanMatch[1];
        const startIndex = spanMatch[0].length;
        let depth = 1;
        let endIndex = startIndex;
        
        // Handle nested spans
        while (depth > 0 && endIndex < remaining.length) {
          if (remaining.substring(endIndex).startsWith('<span')) {
            depth++;
            endIndex = remaining.indexOf('>', endIndex) + 1;
          } else if (remaining.substring(endIndex).startsWith('</span>')) {
            depth--;
            if (depth === 0) {
              const content = remaining.substring(startIndex, endIndex);
              // Recursively parse nested content
              const nestedTokens = this.parseHighlightedCode(content);
              nestedTokens.forEach(token => {
                tokens.push({ type: token.type === 'text' ? spanType : token.type, text: token.text });
              });
              remaining = remaining.substring(endIndex + 7); // Skip </span>
              continue;
            }
            endIndex += 7;
          } else {
            endIndex++;
          }
        }
      } else {
        // No span found, get plain text until next tag
        const nextTag = remaining.search(/<[^>]+>/);
        if (nextTag === -1) {
          // No more tags, everything is plain text
          if (remaining.length > 0) {
            tokens.push({ type: 'text', text: this.unescapeHtml(remaining) });
          }
          break;
        } else if (nextTag > 0) {
          // Add plain text before the tag
          tokens.push({ type: 'text', text: this.unescapeHtml(remaining.substring(0, nextTag)) });
          remaining = remaining.substring(nextTag);
        } else {
          // Skip unknown tag
          const tagEnd = remaining.indexOf('>');
          remaining = remaining.substring(tagEnd + 1);
        }
      }
    }

    return tokens;
  }

  private unescapeHtml(html: string): string {
    return html
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  private getTokenColor(tokenType: string, theme: CodeTheme): string {
    const colorMapping = this.themeLoader.getColorMapping(theme);
    return colorMapping[tokenType] || theme.foreground;
  }

  private drawBorder(ctx: any, _width: number, _height: number, outerPadding: number, innerWidth: number, innerHeight: number) {
    const scale = 2;
    
    // Add subtle drop shadow effect
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10 * scale;
    
    // Draw window background to trigger shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.01)';
    this.drawRoundedRect(ctx, outerPadding, outerPadding, innerWidth, innerHeight, 12 * scale);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  
  private drawRoundedRect(ctx: any, x: number, y: number, width: number, height: number, radius: number) {
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
  
  private containsEmoji(text: string): boolean {
    // Check for emoji using Unicode ranges
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
    return emojiRegex.test(text);
  }
  
  private drawTextWithEmoji(ctx: any, text: string, x: number, y: number) {
    // For now, just draw the text normally - Canvas has improved emoji support
    // In future versions, we could use image-based emoji rendering
    ctx.fillText(text, x, y);
  }

  async readCodeFile(
    filePath: string,
    lineRange?: string
  ): Promise<{ code: string; language: string }> {
    try {
      const absolutePath = path.resolve(filePath);
      const allowedDir = path.resolve(process.cwd());
      
      // Security check: ensure file is within allowed directory
      if (!absolutePath.startsWith(allowedDir)) {
        throw new FileError(`Access denied: file outside allowed directory`);
      }
      
      // Additional validation for suspicious patterns
      if (absolutePath.includes('..') || absolutePath.match(/\/etc\/|\/proc\/|\/sys\//)) {
        throw new FileError(`Access denied: suspicious file path`);
      }
      
      // Check if file exists
      await fs.access(absolutePath);
      
      // Read file content
      const content = await fs.readFile(absolutePath, 'utf-8');
      const lines = content.split('\n');

      let code = content;
      
      // Apply line range if specified
      if (lineRange) {
        const [start, end] = lineRange.split('-').map(n => parseInt(n, 10));
        if (!isNaN(start) && !isNaN(end)) {
          code = lines.slice(start - 1, end).join('\n');
        } else if (!isNaN(start)) {
          code = lines[start - 1] || '';
        }
      }

      // Detect language from file extension
      const ext = path.extname(filePath).toLowerCase();
      const languageMap: Record<string, string> = {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.py': 'python',
        '.java': 'java',
        '.c': 'c',
        '.cpp': 'cpp',
        '.cs': 'csharp',
        '.go': 'go',
        '.rs': 'rust',
        '.php': 'php',
        '.rb': 'ruby',
        '.swift': 'swift',
        '.kt': 'kotlin',
        '.dart': 'dart',
        '.r': 'r',
        '.m': 'objectivec',
        '.mm': 'objectivec',
        '.scala': 'scala',
        '.clj': 'clojure',
        '.lua': 'lua',
        '.pl': 'perl',
        '.sh': 'shell',
        '.bash': 'shell',
        '.zsh': 'shell',
        '.fish': 'shell',
        '.ps1': 'powershell',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.json': 'json',
        '.xml': 'xml',
        '.html': 'html',
        '.css': 'css',
        '.scss': 'scss',
        '.sass': 'sass',
        '.less': 'less',
        '.sql': 'sql',
        '.md': 'markdown',
        '.mdx': 'markdown',
        '.vue': 'vue',
        '.svelte': 'svelte'
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