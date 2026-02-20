import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { AchievementProgress } from './AchievementProgress';

export enum AchievementTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  LEGENDARY = 'legendary',
}

@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
    id!: string;

  @Column({ unique: true })
    code!: string;

  @Column()
    name!: string;

  @Column({ type: 'text', nullable: true })
    description: string | null = null;

  @Column({
    type: 'enum',
    enum: AchievementTier,
    default: AchievementTier.BRONZE,
  })
    tier!: AchievementTier;

  @Column({ name: 'required_value', default: 1 })
    requiredValue!: number;

  @Column({ name: 'reward_coins', default: 0 })
    rewardCoins!: number;

  @Column({ name: 'reward_unlockable_id', nullable: true })
    rewardUnlockableId: string | null = null;

  @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any> | null = null;

  @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

  @OneToMany(() => AchievementProgress, (progress) => progress.achievement)
    progresses!: AchievementProgress[];
}
