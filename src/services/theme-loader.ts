import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

export interface ThemeConfig {
  name: string;
  background: string;
  text: string;
  comment: string;
  keyword: string;
  string: string;
  number: string;
  operator: string;
  function: string;
  variable: string;
  type: string;
  windowControls?: {
    background: string;
  };
  shader?: {
    colors?: {
      primary: string;
      secondary: string;
      accent: string;
    };
    parameters?: {
      intensity: number;
      scale: number;
    };
  };
}

export class ThemeLoader {
  private static instance: ThemeLoader;
  private themes = new Map<string, ThemeConfig>();
  private initialized = false;

  private constructor() {}

  static getInstance(): ThemeLoader {
    if (!ThemeLoader.instance) {
      ThemeLoader.instance = new ThemeLoader();
    }
    return ThemeLoader.instance;
  }

  async getTheme(themeName: string): Promise<ThemeConfig> {
    if (!this.initialized) {
      await this.loadDefaultThemes();
      this.initialized = true;
    }

    return this.themes.get(themeName) || this.themes.get('dracula') || this.getDefaultTheme();
  }

  getAllThemes(): string[] {
    return Array.from(this.themes.keys());
  }

  private async loadDefaultThemes(): Promise<void> {
    const defaultThemes: Record<string, ThemeConfig> = {
      'dracula': {
        name: 'dracula',
        background: '#282a36',
        text: '#f8f8f2',
        comment: '#6272a4',
        keyword: '#ff79c6',
        string: '#f1fa8c',
        number: '#bd93f9',
        operator: '#ff79c6',
        function: '#50fa7b',
        variable: '#8be9fd',
        type: '#8be9fd',
        windowControls: {
          background: '#21222c'
        }
      },
      'synthwave-84': {
        name: 'synthwave-84',
        background: '#2d1b69',
        text: '#f92aad',
        comment: '#848bbd',
        keyword: '#ff7edb',
        string: '#f97e72',
        number: '#36f9f6',
        operator: '#ff7edb',
        function: '#36f9f6',
        variable: '#f4f99d',
        type: '#36f9f6',
        windowControls: {
          background: '#241b2f'
        },
        shader: {
          colors: {
            primary: '#ff7edb',
            secondary: '#36f9f6',
            accent: '#f97e72'
          }
        }
      },
      'cyberpunk': {
        name: 'cyberpunk',
        background: '#0a0a0a',
        text: '#00ff00',
        comment: '#666666',
        keyword: '#ff0080',
        string: '#ffff00',
        number: '#00ffff',
        operator: '#ff0080',
        function: '#00ff80',
        variable: '#80ff00',
        type: '#0080ff',
        windowControls: {
          background: '#1a1a1a'
        },
        shader: {
          colors: {
            primary: '#ff0080',
            secondary: '#00ff80',
            accent: '#00ffff'
          }
        }
      },
      'nord': {
        name: 'nord',
        background: '#2e3440',
        text: '#d8dee9',
        comment: '#616e88',
        keyword: '#81a1c1',
        string: '#a3be8c',
        number: '#b48ead',
        operator: '#81a1c1',
        function: '#88c0d0',
        variable: '#d8dee9',
        type: '#8fbcbb',
        windowControls: {
          background: '#3b4252'
        }
      },
      'gruvbox-dark': {
        name: 'gruvbox-dark',
        background: '#282828',
        text: '#ebdbb2',
        comment: '#928374',
        keyword: '#fb4934',
        string: '#b8bb26',
        number: '#d3869b',
        operator: '#fe8019',
        function: '#fabd2f',
        variable: '#83a598',
        type: '#8ec07c',
        windowControls: {
          background: '#3c3836'
        }
      }
    };

    for (const [name, config] of Object.entries(defaultThemes)) {
      this.themes.set(name, config);
    }

    logger.debug(`Loaded ${this.themes.size} default themes`);
  }

  private getDefaultTheme(): ThemeConfig {
    return {
      name: 'default',
      background: '#1e1e1e',
      text: '#ffffff',
      comment: '#6a9955',
      keyword: '#569cd6',
      string: '#ce9178',
      number: '#b5cea8',
      operator: '#d4d4d4',
      function: '#dcdcaa',
      variable: '#9cdcfe',
      type: '#4ec9b0',
      windowControls: {
        background: '#2d2d2d'
      }
    };
  }

  registerTheme(theme: ThemeConfig): void {
    this.themes.set(theme.name, theme);
    logger.debug(`Registered theme: ${theme.name}`);
  }

  async loadCustomThemes(themesDir: string): Promise<void> {
    try {
      const files = await fs.readdir(themesDir);
      const themeFiles = files.filter(file => file.endsWith('.json'));

      for (const file of themeFiles) {
        try {
          const filePath = path.join(themesDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const theme = JSON.parse(content) as ThemeConfig;
          this.registerTheme(theme);
        } catch (error) {
          logger.warn(`Failed to load theme from ${file}:`);
        }
      }
    } catch (error) {
      logger.warn(`Failed to load custom themes from ${themesDir}`);
    }
  }

  getThemeInfo(themeName: string): ThemeConfig | undefined {
    return this.themes.get(themeName);
  }

  getColorMapping(theme: ThemeConfig): Record<string, string> {
    return {
      'hljs-comment': theme.comment,
      'hljs-keyword': theme.keyword,
      'hljs-string': theme.string,
      'hljs-number': theme.number,
      'hljs-operator': theme.operator,
      'hljs-function': theme.function,
      'hljs-variable': theme.variable,
      'hljs-type': theme.type,
      'hljs-built_in': theme.function,
      'hljs-literal': theme.number,
      'hljs-title': theme.function,
      'hljs-params': theme.variable,
      'hljs-attr': theme.keyword,
      'hljs-tag': theme.keyword,
      'hljs-name': theme.function,
      'hljs-attribute': theme.variable,
      'hljs-value': theme.string,
      'hljs-doctag': theme.comment,
      'hljs-meta': theme.comment,
      'hljs-regexp': theme.string,
      'hljs-section': theme.keyword,
      'hljs-class': theme.type,
      'hljs-selector-tag': theme.keyword,
      'hljs-selector-id': theme.function,
      'hljs-selector-class': theme.type,
      'hljs-selector-attr': theme.variable,
      'hljs-selector-pseudo': theme.keyword,
      'hljs-template-tag': theme.keyword,
      'hljs-template-variable': theme.variable,
      'hljs-addition': theme.string,
      'hljs-deletion': theme.keyword,
      'hljs-subst': theme.variable,
      'hljs-formula': theme.number,
      'hljs-quote': theme.comment,
      'hljs-bullet': theme.operator,
      'hljs-code': theme.string,
      'hljs-emphasis': theme.variable,
      'hljs-strong': theme.keyword,
      'hljs-symbol': theme.operator,
      'hljs-link': theme.string
    };
  }
}