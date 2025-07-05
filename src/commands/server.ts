import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { ScreenshotService } from '../services/screenshot';
import { TwitterService } from '../services/twitter';
import { AIService } from '../services/ai';
import { ConfigService } from '../services/config';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const DEFAULT_PORT = 3456;

interface ScreenshotRequest {
  code: string;
  language: string;
  theme?: string;
  options?: {
    lineNumbers?: boolean;
    fontSize?: string;
    windowControls?: boolean;
    backgroundColor?: string;
    width?: number;
  };
}

interface PostRequest extends ScreenshotRequest {
  caption: string;
}

export async function serverCommand(options: { port?: number }) {
  const port = options.port || DEFAULT_PORT;
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8080'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  const screenshotService = ScreenshotService.getInstance();
  const configService = ConfigService.getInstance();

  // Add security middleware
  app.use(express.json({ 
    limit: '1mb', // Reasonable limit for code screenshots
    verify: (req: any, _res: any, buf: Buffer) => {
      // Validate content type
      if (!req.is('application/json')) {
        throw new Error('Invalid content type');
      }
      
      // Basic malformed JSON detection
      try {
        JSON.parse(buf.toString());
      } catch (error) {
        throw new Error('Invalid JSON');
      }
    }
  }));
  
  // Add basic rate limiting
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  app.use((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 100;
    
    const current = requestCounts.get(ip);
    if (!current || now > current.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      next();
    } else if (current.count < maxRequests) {
      current.count++;
      next();
    } else {
      res.status(429).json({ error: 'Too many requests' });
    }
  });
  app.use(express.static(path.join(__dirname, '../../public')));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
    return;
  });

  // List themes
  app.get('/themes', (_req, res) => {
    const themes = screenshotService.getAvailableThemes();
    res.json({ themes });
    return;
  });

  // Generate screenshot
  app.post('/screenshot', async (req, res) => {
    try {
      const { code, language, theme, options } = req.body as ScreenshotRequest;
      
      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }

      const config = await configService.load();
      const screenshotBuffer = await screenshotService.generateCodeScreenshot(
        code,
        language || 'javascript',
        config.screenshots,
        {
          theme,
          lineNumbers: options?.lineNumbers,
          fontSize: options?.fontSize,
          windowControls: options?.windowControls,
          backgroundColor: options?.backgroundColor,
          width: options?.width
        }
      );

      const screenshotPath = await screenshotService.saveScreenshot(screenshotBuffer);
      
      return res.json({ 
        success: true, 
        path: screenshotPath,
        message: '📷 Screenshot generated successfully'
      });
    } catch (error: any) {
      logger.error('Screenshot generation failed:', error);
      
      // Never expose internal error details
      const safeError = error.name === 'ScreenshotError' 
        ? error.message 
        : 'Screenshot generation failed';
        
      return res.status(500).json({ 
        error: safeError,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Post to Twitter
  app.post('/post', async (req, res) => {
    try {
      const { code, language, caption, theme, options } = req.body as PostRequest;
      
      if (!code || !caption) {
        return res.status(400).json({ error: 'Code and caption are required' });
      }

      const config = await configService.load();
      const screenshotBuffer = await screenshotService.generateCodeScreenshot(
        code,
        language || 'javascript',
        config.screenshots,
        {
          theme,
          lineNumbers: options?.lineNumbers,
          fontSize: options?.fontSize,
          windowControls: options?.windowControls,
          backgroundColor: options?.backgroundColor,
          width: options?.width
        }
      );

      const screenshotPath = await screenshotService.saveScreenshot(screenshotBuffer);
      
      // Generate tweet if needed
      const aiService = AIService.getInstance();
      let finalCaption = caption;
      if (caption.includes('{{ai}}')) {
        finalCaption = await aiService.generateTweet(
          { message: caption.replace('{{ai}}', ''), includeScreenshot: true }, 
          config
        );
      }

      // Post to Twitter
      const twitterService = await TwitterService.getInstance();
      const mediaId = await twitterService.uploadMedia(screenshotPath);
      const tweet = await twitterService.postTweet(finalCaption, [mediaId]);
      
      return res.json({ 
        success: true, 
        tweetUrl: tweet,
        message: '🐦 Posted to Twitter successfully'
      });
    } catch (error: any) {
      logger.error('Post to Twitter failed:', error);
      
      // Never expose internal error details
      const safeError = error.message && error.message.includes('Twitter') 
        ? error.message 
        : 'Failed to post to Twitter';
        
      return res.status(500).json({ 
        error: safeError,
        timestamp: new Date().toISOString()
      });
    }
  });

  // WebSocket for real-time updates
  io.on('connection', (socket) => {
    logger.debug('Editor connected via WebSocket');
    
    socket.on('screenshot', async (data: ScreenshotRequest, callback) => {
      try {
        const config = await configService.load();
        const screenshotBuffer = await screenshotService.generateCodeScreenshot(
          data.code,
          data.language || 'javascript',
          config.screenshots,
          data.options
        );
        
        const screenshotPath = await screenshotService.saveScreenshot(screenshotBuffer);
        callback({ success: true, path: screenshotPath });
      } catch (error: any) {
        callback({ success: false, error: error.message });
      }
    });

    socket.on('disconnect', () => {
      logger.debug('Editor disconnected');
    });
  });

  // Write server info file for editors to discover
  const serverInfoPath = path.join(os.homedir(), '.bip-server.json');
  await fs.writeFile(serverInfoPath, JSON.stringify({
    port,
    pid: process.pid,
    startTime: new Date().toISOString()
  }));

  server.listen(port, () => {
    console.log(chalk.green(`\n🚀 Build in Public Bot Server running on port ${port}\n`));
    console.log(chalk.cyan('Endpoints:'));
    console.log(chalk.gray(`  GET  http://localhost:${port}/health      - Health check`));
    console.log(chalk.gray(`  GET  http://localhost:${port}/themes      - List themes`));
    console.log(chalk.gray(`  POST http://localhost:${port}/screenshot  - Generate screenshot`));
    console.log(chalk.gray(`  POST http://localhost:${port}/post        - Post to Twitter`));
    console.log(chalk.gray(`  WS   ws://localhost:${port}               - WebSocket connection\n`));
    console.log(chalk.yellow('Press Ctrl+C to stop the server'));
  });

  // Cleanup on exit
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\nShutting down server...'));
    try {
      await fs.unlink(serverInfoPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
    process.exit(0);
  });
}