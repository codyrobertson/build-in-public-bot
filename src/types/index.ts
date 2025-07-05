export interface Config {
  version: string;
  twitter: TwitterConfig;
  ai: AIConfig;
  style: StyleConfig;
  screenshots: ScreenshotConfig;
}

export interface TwitterConfig {
  username: string;
  sessionData: string | null;
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'openrouter';
  model: string;
  apiKey: string;
}

export interface StyleConfig {
  tone: 'casual' | 'professional' | 'technical' | 'humorous' | 'casual-technical' | 'enthusiastic' | 'minimalist';
  emojis: {
    frequency: 'none' | 'low' | 'moderate' | 'high';
    preferred: string[];
  };
  hashtags: {
    always: string[];
    contextual: string[];
  };
  examples: string[];
}

export interface ScreenshotConfig {
  theme: string;
  backgroundColor: string;
  windowTheme: string;
  padding: number;
  language: string;
}

export interface Tweet {
  id: string;
  text: string;
  createdAt: Date;
  url: string;
  mediaUrls?: string[];
}

export interface Draft {
  id: string;
  text: string;
  createdAt: Date;
  includeScreenshot: boolean;
  screenshotPath?: string;
}

export interface TwitterAuthData {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  headers: Record<string, string>;
  userId: string;
  username?: string;
}

export interface GenerateOptions {
  message: string;
  includeScreenshot: boolean;
}