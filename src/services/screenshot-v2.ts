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

export class ScreenshotServiceV2 {
  private static instance: ScreenshotServiceV2;
  private themeLoader: ThemeLoader;
  private shaderRenderer: ShaderRenderer;

  private constructor() {
    this.loadFonts();
    this.themeLoader = ThemeLoader.getInstance();
    this.shaderRenderer = ShaderRenderer.getInstance();
    
    const customThemesPath = path.join(process.cwd(), '.bip-themes');
    this.themeLoader.loadCustomThemes(customThemesPath);
  }

  static getInstance(): ScreenshotServiceV2 {
    if (!ScreenshotServiceV2.instance) {
      ScreenshotServiceV2.instance = new ScreenshotServiceV2();
    }
    return ScreenshotServiceV2.instance;
  }

  private loadFonts() {
    try {
      const fontPaths = [
        '/System/Library/Fonts/Menlo.ttc',
        '/System/Library/Fonts/Monaco.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
      ];

      for (const fontPath of fontPaths) {
        if (fsSync.existsSync(fontPath)) {
          registerFont(fontPath, { family: 'Monospace' });
          logger.debug(`Loaded font: ${fontPath}`);
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
      logger.debug('Generating code screenshot with V2 renderer...');

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

  private calculateDimensions(
    lines: string[],
    options: RenderOptions
  ): Dimensions {
    const scale = 2; // Retina scale
    const outerPadding = 40; // Space for shadow
    const windowBarHeight = options.windowControls ? 36 : 0;
    const lineHeight = options.fontSize * 1.5;
    
    // Content dimensions
    const contentWidth = options.width - (options.padding * 2) - (options.lineNumbers ? 60 : 0);
    const contentHeight = lines.length * lineHeight;
    
    // Window dimensions
    const windowWidth = options.width;
    const windowHeight = contentHeight + (options.padding * 2) + windowBarHeight;
    
    // Canvas dimensions (includes outer padding)
    const canvasWidth = windowWidth + (outerPadding * 2);
    const canvasHeight = windowHeight + (outerPadding * 2);
    
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
        x: (outerPadding + options.padding + (options.lineNumbers ? 60 : 0)) * scale,
        y: (outerPadding + windowBarHeight + options.padding) * scale,
        width: contentWidth * scale,
        height: contentHeight * scale
      },
      scale
    };
  }

  private async renderScreenshot(
    code: string,
    options: RenderOptions
  ): Promise<Buffer> {
    // Get theme
    const syntaxTheme = this.themeLoader.getTheme(options.theme) || this.themeLoader.getTheme('dracula')!;
    const bgColor = options.backgroundColor || syntaxTheme.background;

    // Syntax highlight the code
    const highlightedCode = this.highlightCode(code, options.language);
    let lines = highlightedCode.split('\n');

    // Pre-calculate dimensions to measure text
    const tempCanvas = createCanvas(100, 100);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${options.fontSize}px ${options.fontFamily}, monospace`;

    // Wrap lines if needed
    if (options.lineWrap) {
      const maxWidth = options.width - (options.padding * 2) - (options.lineNumbers ? 60 : 0);
      lines = this.wrapLines(lines, tempCtx, maxWidth);
    }

    // Calculate final dimensions
    const dims = this.calculateDimensions(lines, options);
    logger.debug(`Canvas dimensions: ${dims.canvas.width}x${dims.canvas.height}`);
    logger.debug(`Window position: ${dims.window.x},${dims.window.y} size: ${dims.window.width}x${dims.window.height}`);

    // Create canvas
    const canvas = createCanvas(dims.canvas.width, dims.canvas.height);
    const ctx = canvas.getContext('2d');
    
    // Enable high quality rendering
    ctx.imageSmoothingEnabled = true;
    (ctx as any).imageSmoothingQuality = 'high';

    // Step 1: Render background (shader or solid)
    if (options.shader || syntaxTheme.shader?.name) {
      const shaderName = options.shader || syntaxTheme.shader?.name || 'halftone';
      const shaderConfig: Partial<ShaderConfig> = {
        name: shaderName,
        colors: options.shaderColors || syntaxTheme.shader?.colors,
        parameters: options.shaderParams || syntaxTheme.shader?.parameters
      };
      
      logger.debug(`Rendering shader: ${shaderName}`);
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

    // Step 2: Draw window shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20 * dims.scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10 * dims.scale;
    
    // Step 3: Draw window background
    ctx.fillStyle = bgColor;
    this.drawRoundedRect(
      ctx,
      dims.window.x,
      dims.window.y,
      dims.window.width,
      dims.window.height,
      12 * dims.scale
    );
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Step 4: Draw window controls
    if (options.windowControls) {
      this.drawWindowControls(ctx, dims.window, dims.scale);
    }

    // Step 5: Set up text rendering
    ctx.font = `${options.fontSize * dims.scale}px ${options.fontFamily}, monospace`;
    ctx.textBaseline = 'top';
    (ctx as any).textRendering = 'optimizeLegibility';

    // Step 6: Draw code lines
    lines.forEach((line, index) => {
      const y = dims.content.y + (index * options.fontSize * 1.5 * dims.scale);
      
      // Draw line number if enabled
      if (options.lineNumbers) {
        ctx.fillStyle = syntaxTheme.lineNumber || syntaxTheme.comment;
        ctx.fillText(
          String(index + 1).padStart(3, ' '),
          dims.window.x + options.padding * dims.scale,
          y
        );
      }

      // Draw code line
      this.drawHighlightedLine(
        ctx,
        line,
        dims.content.x,
        y,
        syntaxTheme
      );
    });

    // Convert to buffer
    try {
      const buffer = canvas.toBuffer('image/png', {
        compressionLevel: 9,
        filters: Canvas.PNG_FILTER_NONE
      });
      
      return buffer as Buffer;
    } finally {
      // Clean up
      tempCanvas.getContext('2d').clearRect(0, 0, 100, 100);
    }
  }

  private highlightCode(code: string, language: string): string {
    try {
      const languageMap: Record<string, string> = {
        'js': 'javascript',
        'ts': 'typescript',
        'py': 'python',
        'rb': 'ruby',
        'yml': 'yaml',
        'sh': 'bash'
      };

      const lang = languageMap[language] || language;
      
      const result = hljs.getLanguage(lang) 
        ? hljs.highlight(code, { language: lang })
        : hljs.highlightAuto(code);
      
      return result.value;
    } catch (error) {
      logger.warn(`Failed to highlight code as ${language}, using plain text`);
      return code;
    }
  }

  private wrapLines(lines: string[], ctx: any, maxWidth: number): string[] {
    const wrappedLines: string[] = [];
    
    lines.forEach(line => {
      const plainText = line.replace(/<[^>]+>/g, '');
      if (ctx.measureText(plainText).width <= maxWidth) {
        wrappedLines.push(line);
        return;
      }
      
      // Wrap long lines
      const words = line.split(' ');
      let currentLine = '';
      
      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = ctx.measureText(testLine.replace(/<[^>]+>/g, '')).width;
        
        if (testWidth > maxWidth && currentLine) {
          wrappedLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      
      if (currentLine) {
        wrappedLines.push(currentLine);
      }
    });
    
    return wrappedLines;
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
    const tokens = this.parseHighlightedCode(line);
    let currentX = x;

    tokens.forEach(token => {
      ctx.fillStyle = this.getTokenColor(token.type, theme);
      ctx.fillText(token.text, currentX, y);
      currentX += ctx.measureText(token.text).width;
    });
  }

  private parseHighlightedCode(html: string): Array<{ type: string; text: string }> {
    const tokens: Array<{ type: string; text: string }> = [];
    let remaining = html;
    
    while (remaining.length > 0) {
      const spanMatch = remaining.match(/^<span class="hljs-([\w-]+)">/);
      
      if (spanMatch) {
        const spanType = spanMatch[1];
        const startIndex = spanMatch[0].length;
        let depth = 1;
        let endIndex = startIndex;
        
        while (depth > 0 && endIndex < remaining.length) {
          if (remaining.substring(endIndex).startsWith('<span')) {
            depth++;
            endIndex = remaining.indexOf('>', endIndex) + 1;
          } else if (remaining.substring(endIndex).startsWith('</span>')) {
            depth--;
            if (depth === 0) {
              const content = remaining.substring(startIndex, endIndex);
              const nestedTokens = this.parseHighlightedCode(content);
              nestedTokens.forEach(token => {
                tokens.push({ type: token.type === 'text' ? spanType : token.type, text: token.text });
              });
              remaining = remaining.substring(endIndex + 7);
              continue;
            }
            endIndex += 7;
          } else {
            endIndex++;
          }
        }
      } else {
        const nextTag = remaining.search(/<[^>]+>/);
        if (nextTag === -1) {
          if (remaining.length > 0) {
            tokens.push({ type: 'text', text: this.unescapeHtml(remaining) });
          }
          break;
        } else if (nextTag > 0) {
          tokens.push({ type: 'text', text: this.unescapeHtml(remaining.substring(0, nextTag)) });
          remaining = remaining.substring(nextTag);
        } else {
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

  // Same methods as original for compatibility
  async readCodeFile(
    filePath: string,
    lineRange?: string
  ): Promise<{ code: string; language: string }> {
    // Implementation same as original
    try {
      const absolutePath = path.resolve(filePath);
      const allowedDir = path.resolve(process.cwd());
      
      if (!absolutePath.startsWith(allowedDir)) {
        throw new FileError(`Access denied: file outside allowed directory`);
      }
      
      if (absolutePath.includes('..') || absolutePath.match(/\/etc\/|\/proc\/|\/sys\//)) {
        throw new FileError(`Access denied: suspicious file path`);
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
        // ... more mappings
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