import fs from 'fs/promises';
import path from 'path';
import { createCanvas } from 'canvas';
import hljs from 'highlight.js';
import { Config } from '../types';
import { FileError, ScreenshotError } from '../utils/errors';
import { logger } from '../utils/logger';
import { EmojiRenderer } from './emoji-renderer';
import { ShaderRenderer } from './shader-renderer';
import { ThemeLoader } from './theme-loader';

interface ParsedToken {
  text: string;
  className?: string;
  color?: string;
}

export class ScreenshotService {
  private static instance: ScreenshotService;
  private emojiRenderer: EmojiRenderer;
  private shaderRenderer: ShaderRenderer;
  private themeLoader: ThemeLoader;

  private constructor() {
    this.emojiRenderer = EmojiRenderer.getInstance();
    this.shaderRenderer = ShaderRenderer.getInstance();
    this.themeLoader = ThemeLoader.getInstance();
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
      logger.debug('Generating Canvas-based code screenshot...');

      // Load theme
      const theme = await this.themeLoader.getTheme(config.theme);
      
      // Highlight code
      let highlightedHtml: string;
      if (language === 'auto' || !language) {
        const result = hljs.highlightAuto(code);
        highlightedHtml = result.value;
        language = result.language || 'text';
      } else {
        try {
          highlightedHtml = hljs.highlight(code, { language }).value;
        } catch {
          highlightedHtml = hljs.highlightAuto(code).value;
        }
      }

      // Parse highlighted HTML into tokens
      const tokens = this.parseHighlightedHTML(highlightedHtml);

      // Calculate dimensions
      const fontSize = customOptions.fontSize || 16;
      const lineHeight = fontSize * 1.4;
      const padding = config.padding || 32;
      const maxWidth = customOptions.width || 800;

      // Estimate canvas size
      const lines = code.split('\n');
      const width = Math.min(maxWidth, Math.max(400, lines.reduce((max, line) => 
        Math.max(max, line.length * fontSize * 0.6), 0)) + padding * 2);
      const height = (lines.length * lineHeight) + (padding * 2) + 
        (customOptions.windowControls ? 40 : 0);

      // Create canvas
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Set background
      ctx.fillStyle = theme.background || config.backgroundColor || '#1e1e1e';
      ctx.fillRect(0, 0, width, height);

      // Draw window controls if requested
      let contentY = padding;
      if (customOptions.windowControls) {
        this.drawWindowControls(ctx, width, theme);
        contentY += 40;
      }

      // Set font
      ctx.font = `${fontSize}px 'Monaco', 'Menlo', 'Ubuntu Mono', monospace`;
      ctx.textBaseline = 'top';

      // Render code with syntax highlighting and emojis
      await this.renderCodeWithHighlighting(
        ctx, 
        tokens, 
        lines, 
        theme, 
        padding, 
        contentY, 
        fontSize, 
        lineHeight
      );

      // Apply shader effects if specified
      if (customOptions.shader) {
        await this.shaderRenderer.applyShader(
          ctx, 
          customOptions.shader, 
          width, 
          height, 
          theme
        );
      }

      return canvas.toBuffer('image/png');
    } catch (error) {
      logger.error('Canvas screenshot generation failed:', error);
      throw new ScreenshotError('Failed to generate Canvas-based screenshot', error);
    }
  }

  private parseHighlightedHTML(html: string): ParsedToken[] {
    const tokens: ParsedToken[] = [];
    let remaining = html;

    while (remaining.length > 0) {
      const nextTag = remaining.indexOf('<span class="hljs-');
      
      if (nextTag === -1) {
        // No more tags, add remaining text
        if (remaining.trim()) {
          tokens.push({ text: remaining });
        }
        break;
      } else if (nextTag === 0) {
        // Tag at start, parse it
        const endOfTag = remaining.indexOf('>');
        if (endOfTag === -1) break;
        
        const classMatch = remaining.match(/^<span class="hljs-([^"]+)">/);
        if (!classMatch) {
          remaining = remaining.substring(1);
          continue;
        }
        
        const className = classMatch[1];
        const closeTag = remaining.indexOf('</span>');
        if (closeTag === -1) break;
        
        const content = remaining.substring(endOfTag + 1, closeTag);
        tokens.push({ text: content, className });
        
        remaining = remaining.substring(closeTag + 7); // '</span>'.length
      } else {
        // Text before tag
        const beforeTag = remaining.substring(0, nextTag);
        if (beforeTag.trim()) {
          tokens.push({ text: beforeTag });
        }
        remaining = remaining.substring(nextTag);
      }
    }

    return tokens;
  }

  private drawWindowControls(ctx: any, width: number, theme: any): void {
    // Draw title bar
    ctx.fillStyle = theme.windowControls?.background || '#2d2d2d';
    ctx.fillRect(0, 0, width, 40);

    // Draw window control buttons
    const buttonY = 12;
    const buttonSize = 16;
    
    // Close button (red)
    ctx.beginPath();
    ctx.arc(20, buttonY + buttonSize/2, buttonSize/2, 0, 2 * Math.PI);
    ctx.fillStyle = '#ff5f57';
    ctx.fill();

    // Minimize button (yellow)
    ctx.beginPath();
    ctx.arc(45, buttonY + buttonSize/2, buttonSize/2, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffbd2e';
    ctx.fill();

    // Maximize button (green)
    ctx.beginPath();
    ctx.arc(70, buttonY + buttonSize/2, buttonSize/2, 0, 2 * Math.PI);
    ctx.fillStyle = '#28ca42';
    ctx.fill();
  }

  private async renderCodeWithHighlighting(
    ctx: any,
    tokens: ParsedToken[],
    lines: string[],
    theme: any,
    padding: number,
    startY: number,
    fontSize: number,
    lineHeight: number
  ): Promise<void> {
    let currentY = startY;
    const colorMapping = this.themeLoader.getColorMapping(theme);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let currentX = padding;

      // Get tokens for this line
      const lineTokens = this.getTokensForLine(tokens, line);

      if (lineTokens.length === 0) {
        // No highlighting, render as plain text with emojis
        await this.emojiRenderer.renderTextWithEmojis(
          ctx,
          line,
          currentX,
          currentY,
          fontSize,
          theme
        );
      } else {
        // Render each token with proper highlighting
        for (const token of lineTokens) {
          const color = token.className ? 
            colorMapping[`hljs-${token.className}`] || theme.text : 
            theme.text;

          ctx.fillStyle = color;
          
          // Render token with emoji support
          const tokenWidth = await this.emojiRenderer.renderTextWithEmojis(
            ctx,
            token.text,
            currentX,
            currentY,
            fontSize,
            { ...theme, text: color }
          );
          
          currentX += tokenWidth;
        }
      }

      currentY += lineHeight;
    }
  }

  private getTokensForLine(tokens: ParsedToken[], line: string): ParsedToken[] {
    // This is a simplified approach - in a full implementation, you'd need to 
    // properly map tokens to their line positions from the highlighted HTML
    const lineTokens: ParsedToken[] = [];

    // Find tokens that belong to this line
    for (const token of tokens) {
      if (token.text.includes('\n')) {
        // Multi-line token - split it
        const parts = token.text.split('\n');
        for (let i = 0; i < parts.length; i++) {
          if (parts[i].trim()) {
            lineTokens.push({
              text: parts[i],
              className: token.className,
              color: token.color
            });
          }
        }
      } else if (token.text.trim()) {
        lineTokens.push(token);
      }
    }

    // If no tokens found, create a single token for the entire line
    if (lineTokens.length === 0 && line.trim()) {
      lineTokens.push({ text: line });
    }

    return lineTokens;
  }

  getAvailableThemes(): string[] {
    return this.themeLoader.getAllThemes();
  }

  async readCodeFile(
    filePath: string,
    lineRange?: string
  ): Promise<{ code: string; language: string }> {
    try {
      const absolutePath = path.resolve(filePath);
      
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
}