import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { PlayerUnlock } from './PlayerUnlock';

export enum UnlockableType {
  SKIN = 'skin',
  ABILITY = 'ability',
  TITLE = 'title',
  EMOTE = 'emote',
  OTHER = 'other',
}

@Entity('unlockables')
export class Unlockable {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column()
    name: string;

  @Column({ type: 'text', nullable: true })
    description: string | null;

  @Column({ type: 'enum', enum: UnlockableType, default: UnlockableType.OTHER })
    type: UnlockableType;

  @Column({ name: 'required_level', default: 1 })
    requiredLevel: number;

  @Column({ name: 'required_achievement_id', nullable: true })
    requiredAchievementId: string | null;

  @Column({ name: 'is_secret', default: false })
    isSecret: boolean;

  @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

  @OneToMany(() => PlayerUnlock, (unlock) => unlock.unlockable)
    playerUnlocks: PlayerUnlock[];
}
