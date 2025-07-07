/**
 * Service Interface Contracts
 * 
 * These interfaces define the public API contracts for all services,
 * enabling better testing, dependency injection, and architectural boundaries.
 */

import { Config, GenerateOptions } from '../types';

// Screenshot Service Interface
export interface IScreenshotService {
  generateCodeScreenshot(
    code: string, 
    language: string, 
    config: Config['screenshots'], 
    customOptions?: any
  ): Promise<Buffer>;
  
  readCodeFile(filePath: string, lineRange?: string): Promise<{
    code: string;
    language: string;
  }>;
  
  saveScreenshot(buffer: Buffer): Promise<string>;
  getAvailableThemes(): string[];
}

// Twitter Service Interface
export interface ITwitterService {
  authenticate(username: string, password: string): Promise<void>;
  isAuthenticated(): Promise<boolean>;
  loadSession(): Promise<boolean>;
  postTweet(text: string, mediaIds?: string[]): Promise<string>;
  uploadMedia(filePath: string): Promise<string>;
  saveSession(): Promise<void>;
}

// AI Service Interface
export interface IAIService {
  generateTweet(options: GenerateOptions, config: Config): Promise<string>;
  generateSummary(content: string, config: Config): Promise<string>;
  validateApiKey(): Promise<boolean>;
}

// Config Service Interface
export interface IConfigService {
  init(): Promise<void>;
  load(): Promise<Config>;
  save(config: Config): Promise<void>;
  update(updates: Partial<Config>): Promise<void>;
  getConfigPath(): string;
  exists(): Promise<boolean>;
}

// Storage Service Interface
export interface IStorageService {
  saveHistory(entry: any): Promise<void>;
  getHistory(): Promise<any[]>;
  clearHistory(): Promise<void>;
  saveDraft(content: string): Promise<string>;
  getDrafts(): Promise<any[]>;
  deleteDraft(id: string): Promise<void>;
}

// Theme Service Interface
export interface IThemeService {
  getTheme(name: string): any;
  getAllThemes(): string[];
  loadCustomThemes(path: string): void;
  registerTheme(theme: any, filename: string): void;
  getColorMapping(theme: any): Record<string, string>;
}

// Shader Renderer Interface
export interface IShaderRenderer {
  renderShaderBackground(
    width: number,
    height: number,
    theme: any,
    shaderName: string,
    config?: any
  ): any;
  getAvailableShaders(): string[];
}

// Emoji Renderer Interface
export interface IEmojiRenderer {
  parseEmojis(text: string): any[];
  renderTextWithEmojis(
    ctx: any,
    text: string,
    x: number,
    y: number,
    fontSize: number
  ): Promise<number>;
  measureTextWithEmojis(ctx: any, text: string, fontSize: number): number;
}

// Watcher Service Interface
export interface IWatcherService {
  startWatching(paths: string[], callback: (path: string) => void): Promise<void>;
  stopWatching(): Promise<void>;
  isWatching(): boolean;
}

// Context Analyzer Interface
export interface IContextAnalyzer {
  analyzeFile(filePath: string): Promise<any>;
  extractKeywords(content: string): string[];
  generateSummary(content: string): Promise<string>;
}

// Health Check Types
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  lastChecked: Date;
  responseTime?: number;
}

export interface HealthReport {
  overall: ServiceHealth;
  services: {
    screenshot: ServiceHealth;
    twitter: ServiceHealth;
    ai: ServiceHealth;
    config: ServiceHealth;
    storage: ServiceHealth;
  };
  timestamp: Date;
}