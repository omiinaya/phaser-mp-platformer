import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PlayerProfile } from './PlayerProfile';
import { Unlockable } from './Unlockable';

@Entity('player_unlocks')
export class PlayerUnlock {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ name: 'player_id' })
    playerId: string;

  @Column({ name: 'unlockable_id' })
    unlockableId: string;

  @CreateDateColumn({ name: 'unlocked_at' })
    unlockedAt: Date;

  @Column({ default: false })
    notified: boolean;

  @ManyToOne(() => PlayerProfile, (profile) => profile.unlocks)
  @JoinColumn({ name: 'player_id' })
    profile: PlayerProfile;

  @ManyToOne(() => Unlockable, (unlockable) => unlockable.playerUnlocks)
  @JoinColumn({ name: 'unlockable_id' })
    unlockable: Unlockable;
}
