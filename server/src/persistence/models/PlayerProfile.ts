import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { PlayerStats } from './PlayerStats';
import { PlayerUnlock } from './PlayerUnlock';
import { Inventory } from './Inventory';
import { AchievementProgress } from './AchievementProgress';

@Entity('player_profiles')
export class PlayerProfile {
  @PrimaryGeneratedColumn('uuid')
    id!: string;

  @Column({ unique: true, length: 50 })
    username!: string;

  @Column({ unique: true, nullable: true })
    email!: string | null;

  @Column({ name: 'password_hash', nullable: true })
    passwordHash!: string | null;

  @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
    lastLogin!: Date | null;

  @Column({ default: 0 })
    experience!: number;

  @Column({ default: 1 })
    level!: number;

  @Column({ default: 0 })
    coins!: number;

  // Relations
  @OneToOne(() => PlayerStats, (stats) => stats.profile, { cascade: true })
    stats!: PlayerStats;

  @OneToMany(() => PlayerUnlock, (unlock) => unlock.profile)
    unlocks!: PlayerUnlock[];

  @OneToMany(() => Inventory, (inventory) => inventory.profile)
    inventoryItems!: Inventory[];

  @OneToMany(() => AchievementProgress, (progress) => progress.profile)
    achievements!: AchievementProgress[];
}
