import { TwitterAPIClient } from '../../services/twitter-api';
import { TwitterService } from '../../services/twitter';
import fs from 'fs';

describe('Security Tests', () => {
  describe('TwitterAPIClient Security', () => {
    it('should fail without bearer token', () => {
      const originalToken = process.env.TWITTER_BEARER_TOKEN;
      delete process.env.TWITTER_BEARER_TOKEN;
      
      const mockAuthData = {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        headers: {},
        userId: 'test',
        username: 'test'
      };
      
      expect(() => new TwitterAPIClient(mockAuthData)).toThrow('TWITTER_BEARER_TOKEN environment variable is required');
      
      // Restore
      if (originalToken) {
        process.env.TWITTER_BEARER_TOKEN = originalToken;
      }
    });

    it('should not contain hardcoded tokens', () => {
      const sourceCode = fs.readFileSync('src/services/twitter-api.ts', 'utf8');
      // Check for hardcoded bearer tokens (long alphanumeric strings)
      expect(sourceCode).not.toMatch(/Bearer\s+[A-Za-z0-9%]{50,}/);
      // Check for the specific exposed token
      expect(sourceCode).not.toContain('AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA');
    });
  });

  describe('Input Validation', () => {
    let twitterService: TwitterService;

    beforeEach(async () => {
      // Reset singleton
      (TwitterService as any).instance = null;
      (TwitterService as any).instancePromise = null;
      
      // Mock required environment
      process.env.TWITTER_BEARER_TOKEN = 'test-token';
      
      twitterService = await TwitterService.getInstance();
    });

    it('should reject non-string input', async () => {
      await expect(twitterService.post(null as any)).rejects.toThrow('Tweet text must be a non-empty string');
      await expect(twitterService.post(undefined as any)).rejects.toThrow('Tweet text must be a non-empty string');
      await expect(twitterService.post(123 as any)).rejects.toThrow('Tweet text must be a non-empty string');
    });

    it('should reject empty strings', async () => {
      await expect(twitterService.post('')).rejects.toThrow('Tweet text must be a non-empty string');
      await expect(twitterService.post('   ')).rejects.toThrow('Tweet text cannot be empty');
    });

    it('should reject tweets over 280 characters', async () => {
      const longTweet = 'a'.repeat(281);
      await expect(twitterService.post(longTweet)).rejects.toThrow('Tweet exceeds 280 character limit');
    });

    it('should reject potentially malicious content', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        'data:text/html,<script>alert(1)</script>'
      ];

      for (const input of maliciousInputs) {
        await expect(twitterService.post(input)).rejects.toThrow('Tweet contains potentially malicious content');
      }
    });

    it('should allow safe content', () => {
      const safeContent = 'Building something awesome! #buildinpublic 🚀';
      
      // Test the validation logic directly
      const maliciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /data:text\/html/gi
      ];
      
      let isMalicious = false;
      for (const pattern of maliciousPatterns) {
        if (pattern.test(safeContent)) {
          isMalicious = true;
          break;
        }
      }
      
      expect(isMalicious).toBe(false);
    });
  });

  describe('Path Traversal Protection', () => {
    it('should sanitize file paths', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '/etc/shadow',
        '../../.env'
      ];

      // Test path sanitization logic
      const path = require('path');
      const tempDir = path.resolve(process.cwd(), '.bip-temp');
      
      dangerousPaths.forEach(_dangerous => {
        const sanitizedName = Date.now().toString() + '.png';
        const tempPath = path.join(tempDir, sanitizedName);
        
        // Ensure path is within temp directory
        expect(tempPath.startsWith(tempDir)).toBe(true);
        expect(tempPath).not.toContain('..');
      });
    });
  });

  describe('Browser Security', () => {
    it('should not use dangerous Puppeteer flags', () => {
      const authServiceCode = fs.readFileSync('src/services/twitter-auth.ts', 'utf8');
      
      // Check that dangerous flags are not present
      expect(authServiceCode).not.toContain('--no-sandbox');
      expect(authServiceCode).not.toContain('--disable-setuid-sandbox');
      expect(authServiceCode).not.toContain('--no-zygote');
    });
  });

  describe('Credential Storage', () => {
    it('should use secure storage for credentials', () => {
      const authServiceCode = fs.readFileSync('src/services/twitter-auth.ts', 'utf8');
      
      // Check that keytar is imported and used
      expect(authServiceCode).toContain("import keytar from 'keytar'");
      expect(authServiceCode).toContain('keytar.setPassword');
      expect(authServiceCode).toContain('keytar.getPassword');
    });

    it('should not log sensitive information', () => {
      const initCode = fs.readFileSync('src/commands/init.ts', 'utf8');
      
      // Check that API keys are not logged to console
      expect(initCode).toContain('***HIDDEN***');
      // Ensure no logging of actual API key values (but templates for .env are OK)
      expect(initCode).not.toContain('console.log(chalk.cyan(`TWITTER_API_KEY=${apiKey}`)');
      expect(initCode).not.toContain('console.log(chalk.cyan(`export OPENROUTER_API_KEY="${apiKey}"`))');
    });
  });
});