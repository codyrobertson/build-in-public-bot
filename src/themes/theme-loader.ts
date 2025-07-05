import fs from 'fs';
import path from 'path';
import toml from 'toml';
import { CodeTheme, getTokenColorMapping } from './theme.types';
import { logger } from '../utils/logger';

export class ThemeLoader {
  private static instance: ThemeLoader;
  private themes: Map<string, CodeTheme> = new Map();

  private constructor() {
    this.loadBuiltInThemes();
  }

  static getInstance(): ThemeLoader {
    if (!ThemeLoader.instance) {
      ThemeLoader.instance = new ThemeLoader();
    }
    return ThemeLoader.instance;
  }

  private loadBuiltInThemes() {
    const themesDir = path.join(__dirname);
    
    try {
      const files = fs.readdirSync(themesDir);
      const tomlFiles = files.filter(f => f.endsWith('.toml'));
      
      for (const file of tomlFiles) {
        try {
          const content = fs.readFileSync(path.join(themesDir, file), 'utf8');
          const theme = toml.parse(content) as CodeTheme;
          this.registerTheme(theme, file);
        } catch (error) {
          logger.warn(`Failed to load theme ${file}: ${error}`);
        }
      }
    } catch (error) {
      logger.warn(`Failed to load built-in themes: ${error}`);
    }
  }

  private registerTheme(theme: CodeTheme, filename: string) {
    // Store by name and by filename (without extension)
    const fileKey = path.basename(filename, '.toml').toLowerCase();
    this.themes.set(theme.name.toLowerCase(), theme);
    this.themes.set(fileKey, theme);
    
    // Also store by name with spaces replaced by hyphens
    const hyphenatedName = theme.name.toLowerCase().replace(/\s+/g, '-');
    if (hyphenatedName !== theme.name.toLowerCase()) {
      this.themes.set(hyphenatedName, theme);
    }
    
    logger.debug(`Loaded theme: ${theme.name}`);
  }

  loadCustomThemes(customPath: string) {
    
    if (!fs.existsSync(customPath)) {
      logger.debug(`Custom theme directory not found: ${customPath}`);
      return;
    }
    
    try {
      const files = fs.readdirSync(customPath);
      const tomlFiles = files.filter(f => f.endsWith('.toml'));
      
      for (const file of tomlFiles) {
        try {
          const content = fs.readFileSync(path.join(customPath, file), 'utf8');
          const theme = toml.parse(content) as CodeTheme;
          this.registerTheme(theme, file);
          logger.debug(`Loaded custom theme: ${theme.name}`);
        } catch (error) {
          logger.warn(`Failed to load custom theme ${file}: ${error}`);
        }
      }
    } catch (error) {
      logger.warn(`Failed to load custom themes: ${error}`);
    }
  }

  getTheme(name: string): CodeTheme | undefined {
    return this.themes.get(name.toLowerCase());
  }

  getAllThemes(): string[] {
    // Return unique theme names
    const names = new Set<string>();
    for (const theme of this.themes.values()) {
      names.add(theme.name);
    }
    return Array.from(names).sort();
  }

  getThemeInfo(name: string): CodeTheme | undefined {
    return this.getTheme(name);
  }

  // Get color mapping for highlight.js token types
  getColorMapping(theme: CodeTheme): Record<string, string> {
    return getTokenColorMapping(theme);
  }
}