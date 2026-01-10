import { DataSource, Not, IsNull } from 'typeorm';
import { BaseRepository } from './BaseRepository';
import { Achievement, AchievementTier } from '../models/Achievement';

export class AchievementRepository extends BaseRepository<Achievement> {
  constructor(dataSource: DataSource) {
    super(dataSource, Achievement);
  }

  async findByCode(code: string): Promise<Achievement | null> {
    return this.safeOperation(
      this.findOne({ where: { code } }),
      `Failed to find achievement by code: ${code}`
    );
  }

  async findByTier(tier: AchievementTier): Promise<Achievement[]> {
    return this.safeOperation(
      this.find({ where: { tier } }),
      `Failed to find achievements by tier: ${tier}`
    );
  }

  async findUnlockableRewards(): Promise<Achievement[]> {
    return this.safeOperation(
      this.find({ where: { rewardUnlockableId: Not(IsNull()) } }),
      `Failed to find achievements with unlockable rewards`
    );
  }
}