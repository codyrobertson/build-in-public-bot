jest.mock('os');

import { ConfigService } from '../config';
import { Config } from '../../types';
import { ConfigError } from '../../utils/errors';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';

// Mock the entire fs/promises module
jest.mock('fs/promises');
const mockFsPromises = fs as jest.Mocked<typeof fs>;


describe('ConfigService', () => {
  let configService: ConfigService;
  const mockHomePath = '/home/testuser/.bip';
  const mockConfigPath = path.join(mockHomePath, 'config.yml');

  const mockConfig: Config = {
    version: '1.0.0',
    twitter: {
      username: 'testuser',
      sessionData: null,
    },
    ai: {
      provider: 'openrouter',
      model: 'openai/gpt-4-turbo-preview',
      apiKey: '',
    },
    style: {
      tone: 'casual',
      emojis: {
        frequency: 'moderate',
        preferred: ['🚀', '💻', '✨'],
      },
      hashtags: {
        always: ['#buildinpublic'],
        contextual: ['#coding'],
      },
      examples: ['Test tweet example'],
    },
    screenshots: {
      theme: 'dracula',
      backgroundColor: '#282a36',
      windowTheme: 'mac',
      padding: 32,
      language: 'auto',
    },
  };

  beforeEach(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.TEST_HOME = '/home/testuser';
    
    // Reset singleton
    (ConfigService as any).instance = null;
    
    configService = ConfigService.getInstance();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should create singleton instance', () => {
      const instance1 = ConfigService.getInstance();
      const instance2 = ConfigService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should create config directory and file if not exists', async () => {
      mockFsPromises.access.mockRejectedValue({ code: 'ENOENT' });
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      await configService.init();

      expect(mockFsPromises.mkdir).toHaveBeenCalledWith(mockHomePath, { recursive: true });
      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('version:'),
        'utf-8'
      );
    });

    it('should throw error if config already exists', async () => {
      mockFsPromises.access.mockResolvedValue(undefined);

      await expect(configService.init()).rejects.toThrow(
        'Configuration already exists. Use "bip style" to modify settings.'
      );
    });

    it('should handle initialization errors', async () => {
      mockFsPromises.access.mockRejectedValue({ code: 'ENOENT' });
      mockFsPromises.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(configService.init()).rejects.toThrow(ConfigError);
    });
  });

  describe('load', () => {
    it('should load config from file', async () => {
      const yamlContent = yaml.stringify(mockConfig);
      mockFsPromises.readFile.mockResolvedValue(yamlContent);

      const config = await configService.load();

      expect(config).toEqual(mockConfig);
      expect(mockFsPromises.readFile).toHaveBeenCalledWith(mockConfigPath, 'utf-8');
    });

    it('should load config with empty API key', async () => {
      const configWithoutKey = { ...mockConfig, ai: { ...mockConfig.ai, apiKey: '' } };
      const yamlContent = yaml.stringify(configWithoutKey);
      mockFsPromises.readFile.mockResolvedValue(yamlContent);

      const config = await configService.load();

      expect(config.ai.apiKey).toBe('');
    });

    it('should handle invalid YAML', async () => {
      mockFsPromises.readFile.mockResolvedValue('invalid: yaml: content:');

      await expect(configService.load()).rejects.toThrow(ConfigError);
    });

    it('should handle missing config file', async () => {
      mockFsPromises.readFile.mockRejectedValue({ code: 'ENOENT' });

      await expect(configService.load()).rejects.toThrow('Configuration not found. Run "bip init" first.');
    });
  });

  describe('save', () => {
    it('should save config to file', async () => {
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      await configService.save(mockConfig);

      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('version: 1.0.0'),
        'utf-8'
      );
    });

    it('should save config with API key', async () => {
      const configWithKey = { ...mockConfig, ai: { ...mockConfig.ai, apiKey: 'test-key' } };
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      await configService.save(configWithKey);

      // Verify API key is saved in file
      const savedYaml = mockFsPromises.writeFile.mock.calls[0][1] as string;
      expect(savedYaml).toContain('test-key');
    });

    it('should handle save errors', async () => {
      mockFsPromises.writeFile.mockRejectedValue(new Error('Permission denied'));

      await expect(configService.save(mockConfig)).rejects.toThrow(ConfigError);
    });
  });

  describe('update', () => {
    it('should update and save config', async () => {
      const yamlContent = yaml.stringify(mockConfig);
      mockFsPromises.readFile.mockResolvedValue(yamlContent);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const updates = { twitter: { ...mockConfig.twitter, username: 'newuser' } };
      await configService.update(updates);
      const updated = await configService.load();

      expect(updated.twitter.username).toBe('newuser');
      expect(mockFsPromises.writeFile).toHaveBeenCalled();
    });

    it('should merge deep updates correctly', async () => {
      const yamlContent = yaml.stringify(mockConfig);
      mockFsPromises.readFile.mockResolvedValue(yamlContent);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const updates = {
        style: {
          ...mockConfig.style,
          emojis: {
            ...mockConfig.style.emojis,
            frequency: 'high' as const,
          },
        },
      };
      await configService.update(updates);
      const updated = await configService.load();

      expect(updated.style.emojis.frequency).toBe('high');
      expect(updated.style.emojis.preferred).toEqual(expect.arrayContaining(['🚀', '💻', '✨'])); // Should preserve
    });
  });

  describe('updateStyle', () => {
    it('should update style configuration', async () => {
      const yamlContent = yaml.stringify(mockConfig);
      mockFsPromises.readFile.mockResolvedValue(yamlContent);
      mockFsPromises.writeFile.mockResolvedValue(undefined);

      const styleUpdates = {
        tone: 'professional' as const,
        emojis: {
          frequency: 'low' as const,
          preferred: ['🎯'],
        },
      };

      await configService.updateStyle(styleUpdates);
      const updated = await configService.load();

      expect(updated.style.tone).toBe('professional');
      expect(updated.style.emojis.frequency).toBe('low');
      expect(updated.style.emojis.preferred).toEqual(['🎯']);
    });
  });

});