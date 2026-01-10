import { DataSource } from 'typeorm';
import { BaseRepository } from './BaseRepository';
import { PlayerUnlock } from '../models/PlayerUnlock';

export class PlayerUnlockRepository extends BaseRepository<PlayerUnlock> {
  constructor(dataSource: DataSource) {
    super(dataSource, PlayerUnlock);
  }

  async findByPlayerId(playerId: string): Promise<PlayerUnlock[]> {
    return this.safeOperation(
      this.find({ where: { playerId }, relations: ['unlockable'] }),
      `Failed to find player unlocks by playerId: ${playerId}`
    );
  }

  async hasUnlocked(playerId: string, unlockableId: string): Promise<boolean> {
    const count = await this.safeOperation(
      this.count({ where: { playerId, unlockableId } }),
      `Failed to check unlock status`
    );
    return count > 0;
  }

  async unlock(playerId: string, unlockableId: string): Promise<PlayerUnlock> {
    const existing = await this.findOne({ where: { playerId, unlockableId } });
    if (existing) {
      return existing;
    }
    const unlock = this.create({
      playerId,
      unlockableId,
      unlockedAt: new Date(),
      notified: false,
    });
    return this.safeOperation(
      this.save(unlock),
      `Failed to unlock ${unlockableId} for player ${playerId}`
    );
  }

  async markAsNotified(playerId: string, unlockableId: string): Promise<void> {
    await this.safeOperation(
      this.update({ playerId, unlockableId }, { notified: true }),
      `Failed to mark unlock as notified`
    );
  }

  async countUnlocksByPlayer(playerId: string): Promise<number> {
    return this.safeOperation(
      this.count({ where: { playerId } }),
      `Failed to count unlocks for player ${playerId}`
    );
  }
}