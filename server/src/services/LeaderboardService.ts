import { DataSource } from 'typeorm';
import { createClient, RedisClientType } from 'redis';
import { PlayerStatsRepository } from '../persistence/repositories/PlayerStatsRepository';
import { PlayerProfileRepository } from '../persistence/repositories/PlayerProfileRepository';
import { logger } from '../utils/logger';

// Validate required environment variables at startup
if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is required for leaderboard service');
}

/**
 * Service for managing player leaderboards.
 * Uses Redis for caching and TypeORM for persistent storage.
 * Provides real-time leaderboard queries for scores, levels, and rankings.
 */
export class LeaderboardService {
  private redisClient: RedisClientType;

  /**
   * Creates a new LeaderboardService instance.
   * @param dataSource - The TypeORM data source for database queries.
   * @param statsRepo - Repository for player statistics.
   * @param profileRepo - Repository for player profiles.
   * @param redisUrl - Optional Redis URL override.
   */
  constructor(
    private dataSource: DataSource,
    private statsRepo: PlayerStatsRepository,
    private profileRepo: PlayerProfileRepository,
    redisUrl?: string
  ) {
    this.redisClient = createClient({
      url: redisUrl || process.env.REDIS_URL,
    });
    this.redisClient.on('error', (err) => logger.error('Redis Client Error', err));
    this.redisClient.connect();
  }

  /**
   * Gets the top players by score.
   * Results are cached for 5 minutes to improve performance.
   * @param limit - Maximum number of players to return (default: 10).
   * @param useCache - Whether to use cached results (default: true).
   * @returns Promise resolving to array of player leaderboard entries.
   */
  async getTopPlayersByScore(limit: number = 10, useCache: boolean = true): Promise<any[]> {
    const cacheKey = `leaderboard:top_score:${limit}`;
    if (useCache) {
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const stats = await this.statsRepo.findTopPlayersByScore(limit);
    const result = await Promise.all(
      stats.map(async (stat) => {
        const profile = await this.profileRepo.findOne({ where: { id: stat.playerId } });
        return {
          playerId: stat.playerId,
          username: profile?.username || 'Unknown',
          score: stat.score,
          kills: stat.kills,
          deaths: stat.deaths,
          playTimeSeconds: stat.playTimeSeconds,
        };
      })
    );

    if (useCache) {
      await this.redisClient.setEx(cacheKey, 300, JSON.stringify(result)); // 5 minutes TTL
    }
    return result;
  }

  /**
   * Gets the top players by level.
   * Results are cached for 5 minutes.
   * @param limit - Maximum number of players to return (default: 10).
   * @returns Promise resolving to array of player level entries.
   */
  async getTopPlayersByLevel(limit: number = 10): Promise<any[]> {
    const cacheKey = `leaderboard:top_level:${limit}`;
    const cached = await this.redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const profiles = await this.profileRepo.findTopPlayersByLevel(limit);
    const result = profiles.map(profile => ({
      playerId: profile.id,
      username: profile.username,
      level: profile.level,
      experience: profile.experience,
      coins: profile.coins,
    }));

    await this.redisClient.setEx(cacheKey, 300, JSON.stringify(result));
    return result;
  }

  /**
   * Updates a player's score and invalidates related caches.
   * @param playerId - The unique identifier of the player.
   * @param scoreDelta - The amount to add to the player's score (can be negative).
   */
  async updatePlayerScore(playerId: string, scoreDelta: number): Promise<void> {
    await this.statsRepo.updateScore(playerId, scoreDelta);
    // Invalidate relevant caches
    await this.redisClient.del('leaderboard:top_score:*');
  }

  /**
   * Gets a player's rank based on their score.
   * @param playerId - The unique identifier of the player.
   * @returns Promise resolving to the player's rank (1-based), or -1 if not found.
   */
  async getPlayerRankByScore(playerId: string): Promise<number> {
    const stats = await this.statsRepo.findByPlayerId(playerId);
    if (!stats) return -1;
    const rank = await this.statsRepo.createQueryBuilder('ps')
      .where('ps.score > :score', { score: stats.score })
      .getCount();
    return rank + 1;
  }

  /**
   * Refreshes all leaderboard caches by clearing all cached entries.
   * Useful for forcing a fresh lookup after bulk updates.
   */
  async refreshAllLeaderboards(): Promise<void> {
    const keys = await this.redisClient.keys('leaderboard:*');
    if (keys.length > 0) {
      await this.redisClient.del(keys);
    }
    logger.info('Refreshed all leaderboard caches');
  }
}