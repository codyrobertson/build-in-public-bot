import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { Config } from '../types';
import { FileError, ScreenshotError } from '../utils/errors';
import { logger } from '../utils/logger';

export class ScreenshotService {
  private static instance: ScreenshotService;

  private constructor() {}

  static getInstance(): ScreenshotService {
    if (!ScreenshotService.instance) {
      ScreenshotService.instance = new ScreenshotService();
    }
    return ScreenshotService.instance;
  }

  async generateCodeScreenshot(
    code: string,
    language: string,
    config: Config['screenshots']
  ): Promise<Buffer> {
    try {
      logger.debug('Generating code screenshot...');

      // Using carbon.now.sh API
      const params = new URLSearchParams({
        code,
        language: language || config.language,
        theme: config.theme,
        paddingVertical: String(config.padding),
        paddingHorizontal: String(config.padding),
        backgroundColor: 'rgba(171, 184, 195, 1)',
        windowTheme: 'none',
        fontFamily: 'Fira Code',
        fontSize: '14px',
        lineHeight: '133%',
        dropShadow: 'true',
        dropShadowOffsetY: '20px',
        dropShadowBlurRadius: '68px',
        windowControls: 'true',
        widthAdjustment: 'true',
        lineNumbers: 'false',
        exportSize: '2x'
      });

      const response = await axios.get(
        `https://carbon.now.sh/api/image?${params.toString()}`,
        {
          responseType: 'arraybuffer',
          headers: {
            'Accept': 'image/png'
          }
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      throw new ScreenshotError('Failed to generate code screenshot', error);
    }
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