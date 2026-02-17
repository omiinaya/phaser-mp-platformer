import { DataSource } from 'typeorm';
import { BaseRepository } from './BaseRepository';
import { Unlockable, UnlockableType } from '../models/Unlockable';

export { Unlockable, UnlockableType };

export class UnlockableRepository extends BaseRepository<Unlockable> {
  constructor(dataSource: DataSource) {
    super(dataSource, Unlockable);
  }

  async findByType(type: UnlockableType): Promise<Unlockable[]> {
    return this.safeOperation(
      this.find({ where: { type } }),
      `Failed to find unlockables by type: ${type}`
    );
  }

  async findSecretUnlockables(): Promise<Unlockable[]> {
    return this.safeOperation(
      this.find({ where: { isSecret: true } }),
      'Failed to find secret unlockables'
    );
  }

  async findUnlockablesByRequiredLevel(maxLevel: number): Promise<Unlockable[]> {
    return this.safeOperation(
      this.find({ where: { requiredLevel: maxLevel } }),
      'Failed to find unlockables by required level'
    );
  }

  async findUnlockablesByAchievement(achievementId: string): Promise<Unlockable[]> {
    return this.safeOperation(
      this.find({ where: { requiredAchievementId: achievementId } }),
      'Failed to find unlockables by achievement'
    );
  }
}