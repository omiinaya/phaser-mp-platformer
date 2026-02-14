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
 */
export class ProgressionService {
  constructor(
    private dataSource: DataSource,
    private profileRepo: PlayerProfileRepository,
    private statsRepo: PlayerStatsRepository,
    private unlockRepo: PlayerUnlockRepository,
    private achievementProgressRepo: AchievementProgressRepository,
    private unlockableRepo: UnlockableRepository
  ) {}

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

  async grantUnlock(playerId: string, unlockableId: string): Promise<boolean> {
    try {
      const unlock = await this.unlockRepo.unlock(playerId, unlockableId);
      logger.info(`Player ${playerId} unlocked ${unlockableId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to grant unlock: ${error}`);
      return false;
    }
  }

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

  async incrementAchievementProgress(playerId: string, achievementCode: string, amount: number = 1): Promise<void> {
    const achievement = await this.unlockableRepo.manager.findOne(Achievement, { where: { code: achievementCode } });
    if (!achievement) {
      logger.warn(`Achievement ${achievementCode} not found`);
      return;
    }
    await this.achievementProgressRepo.incrementProgress(playerId, achievement.id, amount);
  }

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