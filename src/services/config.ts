import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import yaml from 'yaml';
import { Config } from '../types';
import { ConfigError } from '../utils/errors';
import { logger } from '../utils/logger';

export class ConfigService {
  private static instance: ConfigService;
  private configDir: string;
  private configPath: string;
  private config: Config | null = null;

  constructor(configDir?: string) {
    if (configDir) {
      this.configDir = configDir;
    } else if (process.env.NODE_ENV === 'test' && process.env.TEST_HOME) {
      this.configDir = path.join(process.env.TEST_HOME, '.bip');
    } else {
      this.configDir = path.join(os.homedir(), '.bip');
    }
    this.configPath = path.join(this.configDir, 'config.yml');
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  async init(): Promise<void> {
    try {
      // Create config directory if it doesn't exist
      await fs.mkdir(this.configDir, { recursive: true });

      // Check if config already exists
      try {
        await fs.access(this.configPath);
        throw new ConfigError('Configuration already exists. Use "bip style" to modify settings.');
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Create default configuration
      const defaultConfig: Config = {
        version: '1.0.0',
        twitter: {
          username: '',
          sessionData: null
        },
        ai: {
          provider: 'openai',
          model: 'gpt-4-turbo-preview',
          apiKey: process.env.OPENROUTER_API_KEY || ''
        },
        style: {
          tone: 'casual-technical',
          emojis: {
            frequency: 'moderate',
            preferred: ['🚀', '💡', '🔧', '✨', '🎯', '💻', '🛠️', '⚡']
          },
          hashtags: {
            always: ['#buildinpublic'],
            contextual: ['#webdev', '#typescript', '#nodejs', '#opensource']
          },
          examples: [
            'Just shipped a new feature that makes X 10x faster 🚀 Used Y technique to optimize Z. The difference is wild! #buildinpublic',
            'Debugging session turned into a refactoring marathon 🔧 Sometimes the best features come from fixing bugs. Added proper error handling and the UX is so much smoother now ✨',
            'TIL: You can use X to solve Y problem. Been struggling with this for hours and the solution was so simple 💡 Love when things just click! #buildinpublic #webdev'
          ]
        },
        screenshots: {
          theme: 'dracula',
          backgroundColor: '#282a36',
          windowTheme: 'mac',
          padding: 32,
          language: 'auto'
        }
      };

      // Save configuration
      await this.save(defaultConfig);
      
      logger.success('Configuration initialized successfully!');
      logger.info(`Config file created at: ${this.configPath}`);
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error;
      }
      throw new ConfigError('Failed to initialize configuration', error);
    }
  }

  async load(): Promise<Config> {
    if (this.config) {
      return this.config;
    }

    try {
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      this.config = yaml.parse(configContent);
      return this.config!;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new ConfigError('Configuration not found. Run "bip init" first.');
      }
      throw new ConfigError('Failed to load configuration', error);
    }
  }

  async save(config: Config): Promise<void> {
    try {
      const yamlContent = yaml.stringify(config, { indent: 2 });
      await fs.writeFile(this.configPath, yamlContent, 'utf-8');
      this.config = config;
    } catch (error) {
      throw new ConfigError('Failed to save configuration', error);
    }
  }

  async update(updates: Partial<Config>): Promise<void> {
    const current = await this.load();
    const updated = this.deepMerge(current, updates);
    await this.save(updated);
  }

  async updateStyle(styleUpdates: Partial<Config['style']>): Promise<void> {
    const current = await this.load();
    current.style = this.deepMerge(current.style, styleUpdates);
    await this.save(current);
  }

  private deepMerge(target: any, source: any): any {
    // Handle arrays - replace entirely
    if (Array.isArray(source)) {
      return source;
    }
    
    // Handle non-objects
    if (!source || typeof source !== 'object') {
      return source;
    }
    
    const output = { ...target };
    
    for (const key in source) {
      if (source[key] instanceof Object && !Array.isArray(source[key]) && key in target && target[key] instanceof Object && !Array.isArray(target[key])) {
        output[key] = this.deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }
    
    return output;
  }

  getConfigPath(): string {
    return this.configPath;
  }

  getConfigDir(): string {
    return this.configDir;
  }

  async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const config = await this.load();
      
      // Validate required fields
      if (!config.version) {
        errors.push('Missing required field: version');
      }
      
      // Validate Twitter config
      if (!config.twitter) {
        errors.push('Missing required field: twitter');
      } else {
        if (!config.twitter.username) {
          errors.push('Twitter username is required');
        }
      }
      
      // Validate AI config
      if (!config.ai) {
        errors.push('Missing required field: ai');
      } else {
        if (!config.ai.provider) {
          errors.push('AI provider is required');
        }
        if (!config.ai.model) {
          errors.push('AI model is required');
        }
        if (!config.ai.apiKey) {
          errors.push('AI API key is required');
        }
      }
      
      // Validate style config
      if (!config.style) {
        errors.push('Missing required field: style');
      } else {
        const validTones = ['casual', 'professional', 'technical', 'humorous', 'casual-technical', 'enthusiastic', 'minimalist'];
        if (!validTones.includes(config.style.tone)) {
          errors.push(`Invalid tone: ${config.style.tone}. Must be one of: ${validTones.join(', ')}`);
        }
        
        const validFrequencies = ['none', 'low', 'moderate', 'high'];
        if (!validFrequencies.includes(config.style.emojis.frequency)) {
          errors.push(`Invalid emoji frequency: ${config.style.emojis.frequency}. Must be one of: ${validFrequencies.join(', ')}`);
        }
      }
      
      // Validate screenshots config
      if (!config.screenshots) {
        errors.push('Missing required field: screenshots');
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: ['Failed to load configuration for validation']
      };
    }
  }

  async reset(): Promise<void> {
    try {
      // Create default configuration
      const defaultConfig: Config = {
        version: '1.0.0',
        twitter: {
          username: '',
          sessionData: null
        },
        ai: {
          provider: 'openai',
          model: 'gpt-4-turbo-preview',
          apiKey: process.env.OPENROUTER_API_KEY || ''
        },
        style: {
          tone: 'casual-technical',
          emojis: {
            frequency: 'moderate',
            preferred: ['🚀', '💡', '🔧', '✨', '🎯', '💻', '🛠️', '⚡']
          },
          hashtags: {
            always: ['#buildinpublic'],
            contextual: ['#webdev', '#typescript', '#nodejs', '#opensource']
          },
          examples: [
            'Just shipped a new feature that makes X 10x faster 🚀 Used Y technique to optimize Z. The difference is wild! #buildinpublic',
            'Debugging session turned into a refactoring marathon 🔧 Sometimes the best features come from fixing bugs. Added proper error handling and the UX is so much smoother now ✨',
            'TIL: You can use X to solve Y problem. Been struggling with this for hours and the solution was so simple 💡 Love when things just click! #buildinpublic #webdev'
          ]
        },
        screenshots: {
          theme: 'dracula',
          backgroundColor: '#282a36',
          windowTheme: 'mac',
          padding: 32,
          language: 'auto'
        }
      };

      // Save default configuration
      await this.save(defaultConfig);
      this.config = null; // Clear cache
    } catch (error) {
      throw new ConfigError('Failed to reset configuration', error);
    }
  }
}