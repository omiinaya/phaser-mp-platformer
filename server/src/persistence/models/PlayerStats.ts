import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { PlayerProfile } from './PlayerProfile';

@Entity('player_stats')
export class PlayerStats {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ name: 'player_id', unique: true })
    playerId: string;

  @Column({ default: 0 })
    kills: number;

  @Column({ default: 0 })
    deaths: number;

  @Column({ default: 0 })
    score: number;

  @Column({ name: 'play_time_seconds', default: 0 })
    playTimeSeconds: number;

  @Column({ name: 'games_played', default: 0 })
    gamesPlayed: number;

  @Column({ name: 'games_won', default: 0 })
    gamesWon: number;

  @Column({ name: 'highest_score', default: 0 })
    highestScore: number;

  @Column({ type: 'jsonb', nullable: true })
    extraStats: Record<string, any> | null;

  @OneToOne(() => PlayerProfile, (profile) => profile.stats)
  @JoinColumn({ name: 'player_id' })
    profile: PlayerProfile;
}
