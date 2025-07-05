import axios, { AxiosInstance, AxiosError } from 'axios';
import { TwitterAuthData } from './twitter-auth';
import { TwitterError } from '../utils/errors';
import { logger } from '../utils/logger';
import FormData from 'form-data';
import fs from 'fs/promises';

interface TweetResponse {
  data: {
    create_tweet: {
      tweet_results: {
        result: {
          rest_id: string;
          legacy: {
            full_text: string;
          };
        };
      };
    };
  };
}

interface MediaUploadResponse {
  media_id: number;
  media_id_string: string;
  size: number;
  expires_after_secs: number;
  image?: {
    image_type: string;
    w: number;
    h: number;
  };
}

export class TwitterAPIClient {
  private client: AxiosInstance;
  private graphqlFeatures = {
    "rweb_lists_timeline_redesign_enabled": true,
    "responsive_web_graphql_exclude_directive_enabled": true,
    "verified_phone_label_enabled": false,
    "creator_subscriptions_tweet_preview_api_enabled": true,
    "responsive_web_graphql_timeline_navigation_enabled": true,
    "responsive_web_graphql_skip_user_profile_image_extensions_enabled": false,
    "tweetypie_unmention_optimization_enabled": true,
    "responsive_web_edit_tweet_api_enabled": true,
    "graphql_is_translatable_rweb_tweet_is_translatable_enabled": true,
    "view_counts_everywhere_api_enabled": true,
    "longform_notetweets_consumption_enabled": true,
    "tweet_awards_web_tipping_enabled": false,
    "freedom_of_speech_not_reach_fetch_enabled": true,
    "standardized_nudges_misinfo": true,
    "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": false,
    "longform_notetweets_rich_text_read_enabled": true,
    "longform_notetweets_inline_media_enabled": true,
    "responsive_web_media_download_video_enabled": false,
    "responsive_web_enhance_cards_enabled": false
  };

  constructor(authData: TwitterAuthData) {
    // Validate required environment variable
    if (!process.env.TWITTER_BEARER_TOKEN) {
      throw new TwitterError('TWITTER_BEARER_TOKEN environment variable is required');
    }
    
    // Build cookie string from auth data
    const cookieString = authData.cookies
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');

    this.client = axios.create({
      baseURL: 'https://twitter.com',
      headers: {
        'authority': 'twitter.com',
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        'content-type': 'application/json',
        'cookie': cookieString,
        'origin': 'https://twitter.com',
        'referer': 'https://twitter.com/compose/tweet',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'x-csrf-token': authData.ct0 || '',
        'x-twitter-active-user': 'yes',
        'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-client-language': 'en'
      },
      timeout: 30000
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      this.handleApiError.bind(this)
    );
  }

  async postTweet(text: string, mediaIds?: string[]): Promise<string> {
    try {
      logger.debug('Preparing tweet for posting...');

      const variables: any = {
        tweet_text: text,
        dark_request: false,
        media: mediaIds ? {
          media_entities: mediaIds.map(id => ({ media_id: id, tagged_users: [] })),
          possibly_sensitive: false
        } : undefined,
        semantic_annotation_ids: []
      };

      const response = await this.client.post<TweetResponse>(
        '/i/api/graphql/SoVnbfCycZ7fERGCwpZkYA/CreateTweet',
        {
          variables,
          features: this.graphqlFeatures,
          queryId: 'SoVnbfCycZ7fERGCwpZkYA'
        }
      );

      const tweetId = response.data.data.create_tweet.tweet_results.result.rest_id;
      logger.debug(`Tweet posted successfully with ID: ${tweetId}`);
      
      return tweetId;
    } catch (error) {
      throw this.handleTweetError(error);
    }
  }

  async uploadMedia(filePath: string): Promise<string> {
    try {
      logger.debug(`Uploading media from: ${filePath}`);

      // Step 1: Initialize upload
      const fileData = await fs.readFile(filePath);
      const totalBytes = fileData.length;

      const initResponse = await this.uploadInit(totalBytes, 'image/png');
      const mediaId = initResponse.media_id_string;

      // Step 2: Upload chunks (for simplicity, we'll upload in one chunk)
      await this.uploadAppend(mediaId, fileData, 0);

      // Step 3: Finalize upload
      await this.uploadFinalize(mediaId);

      // Step 4: Check processing status
      await this.checkUploadStatus(mediaId);

      logger.debug(`Media uploaded successfully. ID: ${mediaId}`);
      return mediaId;
    } catch (error) {
      throw this.handleMediaError(error);
    }
  }

  private async uploadInit(totalBytes: number, mediaType: string): Promise<MediaUploadResponse> {
    const params = new URLSearchParams({
      command: 'INIT',
      total_bytes: totalBytes.toString(),
      media_type: mediaType,
      media_category: 'tweet_image'
    });

    const response = await this.client.post<MediaUploadResponse>(
      'https://upload.twitter.com/1.1/media/upload.json',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data;
  }

  private async uploadAppend(mediaId: string, data: Buffer, segmentIndex: number): Promise<void> {
    const form = new FormData();
    form.append('command', 'APPEND');
    form.append('media_id', mediaId);
    form.append('segment_index', segmentIndex.toString());
    form.append('media', data, 'media.png');

    await this.client.post(
      'https://upload.twitter.com/1.1/media/upload.json',
      form,
      {
        headers: {
          ...form.getHeaders()
        }
      }
    );
  }

  private async uploadFinalize(mediaId: string): Promise<void> {
    const params = new URLSearchParams({
      command: 'FINALIZE',
      media_id: mediaId
    });

    await this.client.post(
      'https://upload.twitter.com/1.1/media/upload.json',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
  }

  private async checkUploadStatus(mediaId: string): Promise<void> {
    let attempts = 0;
    const maxAttempts = 10;
    const baseDelay = 1000;

    while (attempts < maxAttempts) {
      const params = new URLSearchParams({
        command: 'STATUS',
        media_id: mediaId
      });

      const response = await this.client.get(
        'https://upload.twitter.com/1.1/media/upload.json?' + params.toString()
      );

      const { processing_info } = response.data;

      if (!processing_info || processing_info.state === 'succeeded') {
        return;
      }

      if (processing_info.state === 'failed') {
        throw new TwitterError(`Media processing failed: ${processing_info.error?.message || 'Unknown error'}`);
      }

      // Exponential backoff with jitter
      const delay = Math.min(baseDelay * Math.pow(2, attempts), 30000);
      const jitter = Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
      
      attempts++;
    }

    throw new TwitterError('Media processing timeout after maximum attempts');
  }

  async getRateLimitStatus(): Promise<{
    remaining: number;
    limit: number;
    reset: Date;
  }> {
    try {
      const response = await this.client.get('/i/api/1.1/application/rate_limit_status.json', {
        params: {
          resources: 'statuses'
        }
      });

      const limits = response.data.resources.statuses['/statuses/update'];
      
      return {
        remaining: limits.remaining,
        limit: limits.limit,
        reset: new Date(limits.reset * 1000)
      };
    } catch (error) {
      // Return default values if we can't get rate limit info
      return {
        remaining: 50,
        limit: 50,
        reset: new Date(Date.now() + 15 * 60 * 1000)
      };
    }
  }

  private handleApiError(error: AxiosError): Promise<never> {
    if (error.response) {
      const status = error.response.status;
      const data: any = error.response.data;

      if (status === 401) {
        throw new TwitterError('Authentication expired. Please re-authenticate.');
      } else if (status === 403) {
        throw new TwitterError('Access forbidden. Your account may be restricted.');
      } else if (status === 429) {
        const resetTime = error.response.headers['x-rate-limit-reset'];
        const reset = resetTime ? new Date(parseInt(resetTime) * 1000) : new Date();
        throw new TwitterError(`Rate limit exceeded. Try again after ${reset.toLocaleTimeString()}`);
      } else if (data?.errors) {
        const errorMessages = data.errors.map((e: any) => e.message).join(', ');
        throw new TwitterError(`Twitter API error: ${errorMessages}`);
      }
    }

    throw error;
  }

  private handleTweetError(error: any): TwitterError {
    if (error instanceof TwitterError) {
      return error;
    }

    if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      if (errors.some((e: any) => e.message?.includes('duplicate'))) {
        return new TwitterError('This tweet is a duplicate of a recent tweet.');
      }
    }

    return new TwitterError(`Failed to post tweet: ${error.message}`, error);
  }

  private handleMediaError(error: any): TwitterError {
    if (error instanceof TwitterError) {
      return error;
    }

    return new TwitterError(`Failed to upload media: ${error.message}`, error);
  }
}