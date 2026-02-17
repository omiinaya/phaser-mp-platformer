import { DataSource } from 'typeorm';
import { PlayerProfileRepository } from '../persistence/repositories/PlayerProfileRepository';
import { PlayerStatsRepository } from '../persistence/repositories/PlayerStatsRepository';
import { PlayerUnlockRepository } from '../persistence/repositories/PlayerUnlockRepository';
import { AchievementProgressRepository } from '../persistence/repositories/AchievementProgressRepository';
import { UnlockableRepository } from '../persistence/repositories/UnlockableRepository';
import { Achievement } from '../persistence/models/Achievement';
import { logger } from '../utils/logger';

/**
 * Service for managing player progression, stats, unlocks, and achievements.
 * Handles player leveling, stat tracking, unlockable content, and achievement progress.
 */
export class ProgressionService {
  /**
   * Creates a new ProgressionService instance.
   * @param dataSource - The TypeORM data source for database transactions.
   * @param profileRepo - Repository for player profile data.
   * @param statsRepo - Repository for player statistics.
   * @param unlockRepo - Repository for player unlocks.
   * @param achievementProgressRepo - Repository for achievement progress.
   * @param unlockableRepo - Repository for unlockable content.
   */
  constructor(
    private dataSource: DataSource,
    private profileRepo: PlayerProfileRepository,
    private statsRepo: PlayerStatsRepository,
    private unlockRepo: PlayerUnlockRepository,
    private achievementProgressRepo: AchievementProgressRepository,
    private unlockableRepo: UnlockableRepository
  ) {}

  /**
   * Initializes a new player's progression data.
   * Creates necessary records in the database if they don't exist.
   * @param playerId - The unique identifier of the player.
   * @throws Error if player profile doesn't exist.
   */
  async initializePlayer(playerId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const profile = await this.profileRepo.findOne({ where: { id: playerId } });
      if (!profile) {
        throw new Error(`Player profile ${playerId} not found`);
      }
      // Ensure stats exist
      let stats = await this.statsRepo.findByPlayerId(playerId);
      if (!stats) {
        stats = this.statsRepo.create({ playerId });
        await manager.save(stats);
      }
    });
  }

  /**
   * Applies stat updates to a player's stats object.
   * @param stats - The stats object to update.
   * @param updates - Partial stats containing fields to update.
   */
  private applyStatUpdates(stats: any, updates: any): void {
    if (updates.kills) {
      stats.kills += updates.kills;
    }
    if (updates.deaths) {
      stats.deaths += updates.deaths;
    }
    if (updates.score) {
      stats.score += updates.score;
      if (stats.score > stats.highestScore) {
        stats.highestScore = stats.score;
      }
    }
    if (updates.playTimeSeconds) {
      stats.playTimeSeconds += updates.playTimeSeconds;
    }
    if (updates.gamesPlayed) {
      stats.gamesPlayed += updates.gamesPlayed;
    }
    if (updates.gamesWon) {
      stats.gamesWon += updates.gamesWon;
    }
  }

  /**
   * Updates a player's statistics with incremental values.
   * @param playerId - The unique identifier of the player.
   * @param updates - Object containing stat fields to update (kills, deaths, score, etc.).
   * @throws Error if player stats don't exist.
   */
  async updateStats(playerId: string, updates: Partial<{
    kills?: number;
    deaths?: number;
    score?: number;
    playTimeSeconds?: number;
    gamesPlayed?: number;
    gamesWon?: number;
  }>): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const stats = await this.statsRepo.findByPlayerId(playerId);
      if (!stats) {
        throw new Error(`Player stats ${playerId} not found`);
      }
      this.applyStatUpdates(stats, updates);
      await manager.save(stats);
    });
  }

  /**
   * Grants an unlockable item to a player.
   * @param playerId - The unique identifier of the player.
   * @param unlockableId - The unique identifier of the unlockable content.
   * @returns Promise resolving to true if successful, false otherwise.
   */
  async grantUnlock(playerId: string, unlockableId: string): Promise<boolean> {
    try {
      await this.unlockRepo.unlock(playerId, unlockableId);
      logger.info(`Player ${playerId} unlocked ${unlockableId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to grant unlock: ${error}`);
      return false;
    }
  }

  /**
   * Checks if a player has leveled up based on experience and grants appropriate unlocks.
   * @param playerId - The unique identifier of the player.
   * @returns Promise resolving to true if player leveled up, false otherwise.
   */
  async checkAndGrantLevelUp(playerId: string): Promise<boolean> {
    const profile = await this.profileRepo.findOne({ where: { id: playerId } });
    if (!profile) return false;
    const oldLevel = profile.level;
    const newLevel = Math.floor(Math.sqrt(profile.experience / 100)) + 1;
    if (newLevel > oldLevel) {
      profile.level = newLevel;
      await this.profileRepo.save(profile);
      // Grant unlockables that require this level
      const unlockables = await this.unlockableRepo.findUnlockablesByRequiredLevel(newLevel);
      for (const unlockable of unlockables) {
        await this.grantUnlock(playerId, unlockable.id);
      }
      return true;
    }
    return false;
  }

  /**
   * Increments progress toward an achievement.
   * @param playerId - The unique identifier of the player.
   * @param achievementCode - The code of the achievement to progress.
   * @param amount - The amount to increment progress by (default: 1).
   */
  async incrementAchievementProgress(playerId: string, achievementCode: string, amount: number = 1): Promise<void> {
    const achievement = await this.unlockableRepo.manager.findOne(Achievement, { where: { code: achievementCode } });
    if (!achievement) {
      logger.warn(`Achievement ${achievementCode} not found`);
      return;
    }
    await this.achievementProgressRepo.incrementProgress(playerId, achievement.id, amount);
  }

  /**
   * Gets a comprehensive summary of a player's progression.
   * Includes profile, stats, unlocks, and achievements.
   * @param playerId - The unique identifier of the player.
   * @returns Promise resolving to an object containing profile, stats, unlocks, and achievements.
   */
  async getPlayerSummary(playerId: string): Promise<any> {
    const profile = await this.profileRepo.findOne({ where: { id: playerId } });
    const stats = await this.statsRepo.findByPlayerId(playerId);
    const unlocks = await this.unlockRepo.findByPlayerId(playerId);
    const achievements = await this.achievementProgressRepo.findByPlayerId(playerId);
    return {
      profile,
      stats,
      unlocks: unlocks.map(u => ({
        id: u.unlockableId,
        unlockedAt: u.unlockedAt,
      })),
      achievements: achievements.map(a => ({
        achievementId: a.achievementId,
        progress: a.progress,
        completed: a.completed,
      })),
    };
  }
}