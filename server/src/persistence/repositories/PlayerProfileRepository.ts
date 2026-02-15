import { DataSource } from 'typeorm';
import { BaseRepository } from './BaseRepository';
import { PlayerProfile } from '../models/PlayerProfile';

export class PlayerProfileRepository extends BaseRepository<PlayerProfile> {
  constructor(dataSource: DataSource) {
    super(dataSource, PlayerProfile);
  }

  async findByUsername(username: string): Promise<PlayerProfile | null> {
    return this.safeOperation(
      this.findOne({ where: { username } }),
      `Failed to find player profile by username: ${username}`
    );
  }

  async findByEmail(email: string): Promise<PlayerProfile | null> {
    return this.safeOperation(
      this.findOne({ where: { email } }),
      `Failed to find player profile by email: ${email}`
    );
  }

  async findTopPlayersByLevel(limit: number = 10): Promise<PlayerProfile[]> {
    return this.safeOperation(
      this.find({
        order: { level: 'DESC', experience: 'DESC' },
        take: limit,
      }),
      'Failed to find top players by level'
    );
  }

  async updateLastLogin(playerId: string): Promise<void> {
    await this.safeOperation(
      this.update(playerId, { lastLogin: new Date() }),
      `Failed to update last login for player ${playerId}`
    );
  }

  async incrementCoins(playerId: string, amount: number): Promise<void> {
    await this.safeOperation(
      this.createQueryBuilder()
        .update()
        .set({ coins: () => `coins + ${amount}` })
        .where('id = :id', { id: playerId })
        .execute(),
      `Failed to increment coins for player ${playerId}`
    );
  }
}