import axios from 'axios';
import { Config, GenerateOptions } from '../types';
import { AIError } from '../utils/errors';
import { logger } from '../utils/logger';

export class AIService {
  private static instance: AIService;
  private apiKey: string;

  private constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      throw new AIError(
        'OPENROUTER_API_KEY not found in environment variables.\n\n' +
        'To fix this:\n' +
        '1. Sign up at https://openrouter.ai to get a free API key\n' +
        '2. Add it to your environment:\n' +
        '   export OPENROUTER_API_KEY="your-key-here"\n' +
        '3. Or create a .env file with:\n' +
        '   OPENROUTER_API_KEY=your-key-here'
      );
    }
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async generateTweet(options: GenerateOptions, config: Config): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(config.style);
      const userPrompt = this.buildUserPrompt(options.message, config.style);

      logger.debug('Generating tweet with AI...');

      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'openai/gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.8,
          max_tokens: 150
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/build-in-public-bot',
            'X-Title': 'Build in Public Bot'
          }
        }
      );

      const tweet = response.data.choices[0].message.content.trim();
      return this.validateAndCleanTweet(tweet);
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new AIError('Invalid API key. Please check your OPENROUTER_API_KEY');
      }
      throw new AIError(`Failed to generate tweet: ${error.message}`, error);
    }
  }

  private buildSystemPrompt(style: Config['style']): string {
    const emojiInstructions = style.emojis.frequency === 'none' 
      ? 'Do not use any emojis.'
      : style.emojis.frequency === 'low'
      ? 'Use emojis sparingly, maximum 1 per tweet.'
      : style.emojis.frequency === 'moderate'
      ? 'Use 1-2 emojis per tweet from this list: ' + style.emojis.preferred.join(' ')
      : 'Use 2-3 emojis per tweet from this list: ' + style.emojis.preferred.join(' ');

    const hashtagInstructions = style.hashtags.always.length > 0
      ? `Always include these hashtags: ${style.hashtags.always.join(' ')}`
      : 'No required hashtags.';

    return `You are a developer sharing build-in-public updates on Twitter. 
Your tone is ${style.tone}.
${emojiInstructions}
${hashtagInstructions}
Keep tweets under 280 characters.
Be authentic, engaging, and specific about technical details.

Example tweets for reference:
${Array.isArray(style.examples) ? style.examples.map(ex => `- ${ex}`).join('\n') : '- No examples provided'}`;
  }

  private buildUserPrompt(message: string, style: Config['style']): string {
    const contextualHashtags = style.hashtags.contextual.length > 0
      ? `Consider using relevant hashtags from: ${style.hashtags.contextual.join(', ')}`
      : '';

    return `Generate a tweet about: ${message}

${contextualHashtags}

Return only the tweet text, nothing else.`;
  }

  private validateAndCleanTweet(tweet: string): string {
    // Remove quotes if the AI wrapped the tweet in them
    tweet = tweet.replace(/^["']|["']$/g, '');
    
    // Ensure it's under 280 characters
    if (tweet.length > 280) {
      // Try to cut at the last complete sentence
      const sentences = tweet.match(/[^.!?]+[.!?]+/g) || [tweet];
      let result = '';
      for (const sentence of sentences) {
        if ((result + sentence).length <= 280) {
          result += sentence;
        } else {
          break;
        }
      }
      tweet = result || tweet.substring(0, 277) + '...';
    }

    return tweet;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await axios.get(
        'https://openrouter.ai/api/v1/models',
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }
}