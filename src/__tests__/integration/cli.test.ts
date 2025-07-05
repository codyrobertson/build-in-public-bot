import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Config } from '../../types';
import * as yaml from 'yaml';

const execAsync = promisify(exec);

describe('CLI Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;
  let originalHome: string;
  
  // Increase timeout for CLI tests
  jest.setTimeout(30000);

  beforeAll(() => {
    originalCwd = process.cwd();
    originalHome = process.env.HOME || '';
  });

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bip-test-'));
    process.chdir(testDir);
    
    // Set HOME to test directory to avoid affecting real config
    process.env.HOME = testDir;
  });

  afterEach(async () => {
    // Restore original directory and HOME
    process.chdir(originalCwd);
    process.env.HOME = originalHome;
    
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  const runCLI = async (command: string) => {
    const cliPath = path.join(originalCwd, 'dist', 'cli.js');
    return execAsync(`node ${cliPath} ${command}`);
  };

  describe('bip init', () => {
    it('should initialize configuration', async () => {
      const { stdout } = await runCLI('init');
      
      expect(stdout).toContain('Initializing Build in Public Bot');
      expect(stdout).toContain('Configuration created');
      
      // Verify config file was created
      const configPath = path.join(testDir, '.bip', 'config.yml');
      const configExists = await fs.access(configPath).then(() => true).catch(() => false);
      expect(configExists).toBe(true);
      
      // Verify config content
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = yaml.parse(configContent) as Config;
      expect(config.version).toBe('1.0.0');
      expect(config.style.tone).toBe('casual');
    });

    it('should not overwrite existing config', async () => {
      // Run init twice
      await runCLI('init');
      const { stdout } = await runCLI('init');
      
      expect(stdout).toContain('Configuration already exists');
    });
  });

  describe('bip style', () => {
    beforeEach(async () => {
      // Initialize config first
      await runCLI('init');
    });

    it('should update style configuration', async () => {
      const { stdout } = await runCLI('style --tone professional --emoji-frequency high');
      
      expect(stdout).toContain('Style configuration updated');
      
      // Verify style was updated
      const configPath = path.join(testDir, '.bip', 'config.yml');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = yaml.parse(configContent) as Config;
      expect(config.style.tone).toBe('professional');
      expect(config.style.emojis.frequency).toBe('high');
    });

    it('should validate tone options', async () => {
      try {
        await runCLI('style --tone invalid-tone');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.stderr).toContain('error');
      }
    });
  });

  describe('bip history', () => {
    beforeEach(async () => {
      await runCLI('init');
      
      // Create mock storage file
      const storagePath = path.join(testDir, '.bip', 'storage.json');
      const mockStorage = {
        tweets: [
          {
            id: '123',
            text: 'Test tweet #buildinpublic',
            createdAt: new Date().toISOString(),
            url: 'https://twitter.com/user/status/123',
          },
        ],
        drafts: [],
      };
      await fs.writeFile(storagePath, JSON.stringify(mockStorage));
    });

    it('should display tweet history', async () => {
      const { stdout } = await runCLI('history');
      
      expect(stdout).toContain('Tweet History');
      expect(stdout).toContain('Test tweet #buildinpublic');
      expect(stdout).toContain('https://twitter.com/user/status/123');
    });

    it('should handle empty history', async () => {
      // Clear storage
      const storagePath = path.join(testDir, '.bip', 'storage.json');
      await fs.writeFile(storagePath, JSON.stringify({ tweets: [], drafts: [] }));
      
      const { stdout } = await runCLI('history');
      
      expect(stdout).toContain('No tweets found');
    });

    it('should limit history results', async () => {
      // Create many tweets
      const storagePath = path.join(testDir, '.bip', 'storage.json');
      const tweets = Array.from({ length: 20 }, (_, i) => ({
        id: `tweet-${i}`,
        text: `Test tweet ${i}`,
        createdAt: new Date().toISOString(),
        url: `https://twitter.com/user/status/${i}`,
      }));
      await fs.writeFile(storagePath, JSON.stringify({ tweets, drafts: [] }));
      
      const { stdout } = await runCLI('history --limit 5');
      
      // Count tweet occurrences
      const tweetMatches = stdout.match(/Test tweet \d+/g) || [];
      expect(tweetMatches.length).toBe(5);
    });
  });

  describe('bip draft', () => {
    beforeEach(async () => {
      await runCLI('init');
    });

    it('should save draft', async () => {
      const { stdout } = await runCLI('draft --text "Working on a new feature"');
      
      expect(stdout).toContain('Draft saved');
      
      // Verify draft was saved
      const storagePath = path.join(testDir, '.bip', 'storage.json');
      const storage = JSON.parse(await fs.readFile(storagePath, 'utf-8'));
      expect(storage.drafts).toHaveLength(1);
      expect(storage.drafts[0].text).toBe('Working on a new feature');
    });

    it('should list drafts', async () => {
      // Save a draft first
      await runCLI('draft --text "Test draft"');
      
      const { stdout } = await runCLI('draft --list');
      
      expect(stdout).toContain('Drafts');
      expect(stdout).toContain('Test draft');
    });

    it('should load specific draft', async () => {
      // Save a draft
      await runCLI('draft --text "Test draft content"');
      
      // Get draft ID from storage
      const storagePath = path.join(testDir, '.bip', 'storage.json');
      const storage = JSON.parse(await fs.readFile(storagePath, 'utf-8'));
      const draftId = storage.drafts[0].id;
      
      const { stdout } = await runCLI(`draft --load ${draftId}`);
      
      expect(stdout).toContain('Test draft content');
    });

    it('should delete draft', async () => {
      // Save a draft
      await runCLI('draft --text "Draft to delete"');
      
      // Get draft ID
      const storagePath = path.join(testDir, '.bip', 'storage.json');
      let storage = JSON.parse(await fs.readFile(storagePath, 'utf-8'));
      const draftId = storage.drafts[0].id;
      
      // Delete draft
      const { stdout } = await runCLI(`draft --delete ${draftId}`);
      
      expect(stdout).toContain('Draft deleted');
      
      // Verify deletion
      storage = JSON.parse(await fs.readFile(storagePath, 'utf-8'));
      expect(storage.drafts).toHaveLength(0);
    });
  });

  describe('bip code', () => {
    beforeEach(async () => {
      await runCLI('init');
      
      // Set mock API key
      process.env.OPENROUTER_API_KEY = 'test-key';
    });

    afterEach(() => {
      delete process.env.OPENROUTER_API_KEY;
    });

    it('should validate code file exists', async () => {
      try {
        await runCLI('code --file non-existent.js');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.stderr).toContain('File not found');
      }
    });

    it('should handle code command with valid file', async () => {
      // Create test code file
      const codePath = path.join(testDir, 'test.js');
      await fs.writeFile(codePath, 'console.log("Hello World");');
      
      // This will fail due to missing API key validation, but we're testing the file handling
      try {
        await runCLI(`code --file ${codePath} --message "Just wrote hello world"`);
      } catch (error: any) {
        // We expect this to fail at the API level, not file reading
        expect(error.stderr).not.toContain('File not found');
      }
    });
  });

  describe('help commands', () => {
    it('should display help', async () => {
      const { stdout } = await runCLI('--help');
      
      expect(stdout).toContain('Build in Public Bot');
      expect(stdout).toContain('Commands:');
      expect(stdout).toContain('init');
      expect(stdout).toContain('post');
      expect(stdout).toContain('code');
      expect(stdout).toContain('style');
      expect(stdout).toContain('history');
      expect(stdout).toContain('draft');
    });

    it('should display command-specific help', async () => {
      const { stdout } = await runCLI('post --help');
      
      expect(stdout).toContain('Generate and post a build-in-public tweet');
      expect(stdout).toContain('--message');
      expect(stdout).toContain('--screenshot');
    });
  });

  describe('error handling', () => {
    it('should show error for unknown command', async () => {
      try {
        await runCLI('unknown-command');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.stderr).toContain('Unknown command');
      }
    });

    it('should handle missing required arguments', async () => {
      await runCLI('init'); // Initialize first
      
      try {
        await runCLI('post'); // Missing --message
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.stderr).toContain('required option');
      }
    });
  });
});