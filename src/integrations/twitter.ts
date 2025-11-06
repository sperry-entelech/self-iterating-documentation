/**
 * Twitter API Integration
 * Auto-syncs follower counts and profile data
 */

import { Env, SyncResult } from '../types';

export class TwitterIntegration {
  private bearerToken: string;
  private baseUrl = 'https://api.twitter.com/2';

  constructor(env: Env) {
    this.bearerToken = env.TWITTER_BEARER_TOKEN;
  }

  /**
   * Sync Twitter follower count and profile data
   */
  async syncFollowerData(username: string): Promise<SyncResult> {

    try {
      // Get user data from Twitter API v2
      const userData = await this.getUserByUsername(username);

      if (!userData) {
        throw new Error(`Twitter user ${username} not found`);
      }

      const fieldsUpdated = ['follower_count'];
      const changes = {
        twitter_follower_count: userData.public_metrics.followers_count,
        twitter_following_count: userData.public_metrics.following_count,
        twitter_tweet_count: userData.public_metrics.tweet_count,
        twitter_profile_updated: new Date(),
        twitter_username: userData.username,
        twitter_name: userData.name,
        twitter_bio: userData.description,
        twitter_verified: userData.verified || false
      };

      return {
        source: 'api_twitter',
        success: true,
        fields_updated: fieldsUpdated,
        changes_count: Object.keys(changes).length,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Twitter sync failed:', error);
      return {
        source: 'api_twitter',
        success: false,
        fields_updated: [],
        changes_count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get user data by username
   */
  private async getUserByUsername(username: string): Promise<any> {
    const url = `${this.baseUrl}/users/by/username/${username}`;
    const params = new URLSearchParams({
      'user.fields': 'description,public_metrics,verified,created_at'
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twitter API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as { data: any };
    return data.data;
  }

  /**
   * Get follower growth over time
   */
  async getFollowerGrowth(username: string, _days: number = 30): Promise<{
    current: number;
    growth: number;
    daily_average: number;
  }> {
    // Note: Twitter API v2 doesn't provide historical data directly
    // This would need to be calculated from our own stored snapshots
    const userData = await this.getUserByUsername(username);

    return {
      current: userData.public_metrics.followers_count,
      growth: 0, // Would need historical data
      daily_average: 0 // Would need historical data
    };
  }

  /**
   * Check if sync is needed based on follower count threshold
   */
  shouldAutoCommit(
    previousCount: number,
    currentCount: number,
    threshold: number = 1000
  ): boolean {
    const diff = Math.abs(currentCount - previousCount);
    return diff >= threshold;
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(username: string, tweetCount: number = 10): Promise<{
    average_likes: number;
    average_retweets: number;
    average_replies: number;
    engagement_rate: number;
  }> {
    try {
      // Get user ID first
      const userData = await this.getUserByUsername(username);
      const userId = userData.id;

      // Get recent tweets
      const url = `${this.baseUrl}/users/${userId}/tweets`;
      const params = new URLSearchParams({
        'max_results': tweetCount.toString(),
        'tweet.fields': 'public_metrics,created_at'
      });

      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tweets: ${response.status}`);
      }

      const data = await response.json() as { data: any[] | undefined };
      const tweets = data.data || [];

      if (tweets.length === 0) {
        return {
          average_likes: 0,
          average_retweets: 0,
          average_replies: 0,
          engagement_rate: 0
        };
      }

      const totalLikes = tweets.reduce((sum: number, t: any) => sum + (t.public_metrics?.like_count || 0), 0);
      const totalRetweets = tweets.reduce((sum: number, t: any) => sum + (t.public_metrics?.retweet_count || 0), 0);
      const totalReplies = tweets.reduce((sum: number, t: any) => sum + (t.public_metrics?.reply_count || 0), 0);
      const totalEngagements = totalLikes + totalRetweets + totalReplies;

      const followerCount = userData.public_metrics.followers_count;
      const engagementRate = followerCount > 0 ? (totalEngagements / tweets.length / followerCount) * 100 : 0;

      return {
        average_likes: totalLikes / tweets.length,
        average_retweets: totalRetweets / tweets.length,
        average_replies: totalReplies / tweets.length,
        engagement_rate: engagementRate
      };

    } catch (error) {
      console.error('Failed to get engagement metrics:', error);
      return {
        average_likes: 0,
        average_retweets: 0,
        average_replies: 0,
        engagement_rate: 0
      };
    }
  }
}

/**
 * LinkedIn Integration (placeholder - requires OAuth)
 */
export class LinkedInIntegration {
  constructor(_accessToken: string) {
    // LinkedIn integration placeholder
  }

  async syncFollowerData(_profileId: string): Promise<SyncResult> {
    // LinkedIn API integration would go here
    // Requires OAuth 2.0 authentication
    return {
      source: 'api_linkedin',
      success: false,
      fields_updated: [],
      changes_count: 0,
      error: 'LinkedIn integration not yet implemented',
      timestamp: new Date()
    };
  }
}

/**
 * Generic Webhook Integration
 * Allows external systems to push context updates
 */
export class WebhookIntegration {
  /**
   * Process incoming webhook data
   */
  async processWebhook(
    source: string,
    payload: any,
    fieldMappings: Record<string, string>
  ): Promise<SyncResult> {
    try {
      const fieldsUpdated: string[] = [];
      const changes: Record<string, any> = {};

      // Map webhook payload to business state fields
      for (const [webhookField, stateField] of Object.entries(fieldMappings)) {
        if (payload[webhookField] !== undefined) {
          changes[stateField] = payload[webhookField];
          fieldsUpdated.push(stateField);
        }
      }

      return {
        source: `webhook_${source}`,
        success: true,
        fields_updated: fieldsUpdated,
        changes_count: fieldsUpdated.length,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        source: `webhook_${source}`,
        success: false,
        fields_updated: [],
        changes_count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate webhook signature (for security)
   */
  validateSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}
