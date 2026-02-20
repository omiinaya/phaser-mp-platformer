import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PlayerProfile } from './PlayerProfile';
import { Achievement } from './Achievement';

@Entity('achievement_progress')
export class AchievementProgress {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ name: 'player_id' })
    playerId: string;

  @Column({ name: 'achievement_id' })
    achievementId: string;

  @Column({ default: 0 })
    progress: number;

  @Column({ default: false })
    completed: boolean;

  @Column({ name: 'completed_at', nullable: true })
    completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @ManyToOne(() => PlayerProfile, (profile) => profile.achievements)
  @JoinColumn({ name: 'player_id' })
    profile: PlayerProfile;

  @ManyToOne(() => Achievement, (achievement) => achievement.progresses)
  @JoinColumn({ name: 'achievement_id' })
    achievement: Achievement;
}
