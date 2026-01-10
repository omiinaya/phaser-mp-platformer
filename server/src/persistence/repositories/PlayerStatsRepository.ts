import { DataSource } from 'typeorm';
import { BaseRepository } from './BaseRepository';
import { PlayerStats } from '../models/PlayerStats';

export class PlayerStatsRepository extends BaseRepository<PlayerStats> {
  constructor(dataSource: DataSource) {
    super(dataSource, PlayerStats);
  }

  async findByPlayerId(playerId: string): Promise<PlayerStats | null> {
    return this.safeOperation(
      this.findOne({ where: { playerId } }),
      `Failed to find player stats by playerId: ${playerId}`
    );
  }

  async incrementKills(playerId: string, count: number = 1): Promise<void> {
    await this.safeOperation(
      this.createQueryBuilder()
        .update()
        .set({ kills: () => `kills + ${count}` })
        .where('player_id = :playerId', { playerId })
        .execute(),
      `Failed to increment kills for player ${playerId}`
    );
  }

  async incrementDeaths(playerId: string, count: number = 1): Promise<void> {
    await this.safeOperation(
      this.createQueryBuilder()
        .update()
        .set({ deaths: () => `deaths + ${count}` })
        .where('player_id = :playerId', { playerId })
        .execute(),
      `Failed to increment deaths for player ${playerId}`
    );
  }

  async updateScore(playerId: string, scoreDelta: number): Promise<void> {
    await this.safeOperation(
      this.createQueryBuilder()
        .update()
        .set({ score: () => `score + ${scoreDelta}` })
        .where('player_id = :playerId', { playerId })
        .execute(),
      `Failed to update score for player ${playerId}`
    );
  }

  async updatePlayTime(playerId: string, seconds: number): Promise<void> {
    await this.safeOperation(
      this.createQueryBuilder()
        .update()
        .set({ playTimeSeconds: () => `play_time_seconds + ${seconds}` })
        .where('player_id = :playerId', { playerId })
        .execute(),
      `Failed to update play time for player ${playerId}`
    );
  }

  async findTopPlayersByScore(limit: number = 10): Promise<PlayerStats[]> {
    return this.safeOperation(
      this.find({
        order: { score: 'DESC' },
        take: limit,
      }),
      `Failed to find top players by score`
    );
  }
}