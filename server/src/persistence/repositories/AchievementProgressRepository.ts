import { DataSource } from 'typeorm';
import { BaseRepository } from './BaseRepository';
import { AchievementProgress } from '../models/AchievementProgress';
import { Achievement } from '../models/Achievement';

export class AchievementProgressRepository extends BaseRepository<AchievementProgress> {
  constructor(dataSource: DataSource) {
    super(dataSource, AchievementProgress);
  }

  async findByPlayerId(playerId: string): Promise<AchievementProgress[]> {
    return this.safeOperation(
      this.find({ where: { playerId }, relations: ['achievement'] }),
      `Failed to find achievement progress by playerId: ${playerId}`
    );
  }

  async findByAchievementId(playerId: string, achievementId: string): Promise<AchievementProgress | null> {
    return this.safeOperation(
      this.findOne({ where: { playerId, achievementId } }),
      `Failed to find achievement progress`
    );
  }

  async incrementProgress(playerId: string, achievementId: string, amount: number = 1): Promise<AchievementProgress> {
    const progress = await this.findByAchievementId(playerId, achievementId);
    if (!progress) {
      const newProgress = this.create({
        playerId,
        achievementId,
        progress: amount,
        completed: false,
        completedAt: null,
      });
      return this.safeOperation(
        this.save(newProgress),
        `Failed to create achievement progress`
      );
    }
    progress.progress += amount;
    // Check if completed
    const achievement = await this.manager.findOne(Achievement, { where: { id: achievementId } });
    if (achievement && progress.progress >= achievement.requiredValue && !progress.completed) {
      progress.completed = true;
      progress.completedAt = new Date();
    }
    return this.safeOperation(
      this.save(progress),
      `Failed to update achievement progress`
    );
  }

  async markCompleted(playerId: string, achievementId: string): Promise<void> {
    await this.safeOperation(
      this.update({ playerId, achievementId }, { completed: true, completedAt: new Date() }),
      `Failed to mark achievement as completed`
    );
  }

  async countCompletedAchievements(playerId: string): Promise<number> {
    return this.safeOperation(
      this.count({ where: { playerId, completed: true } }),
      `Failed to count completed achievements`
    );
  }
}