import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PlayerProfile } from './PlayerProfile';

@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ name: 'player_id' })
    playerId: string;

  @Column()
    itemId: string;

  @Column()
    quantity: number;

  @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any> | null;

  @Column({ name: 'acquired_at', default: () => 'CURRENT_TIMESTAMP' })
    acquiredAt: Date;

  @ManyToOne(() => PlayerProfile, (profile) => profile.inventoryItems)
  @JoinColumn({ name: 'player_id' })
    profile: PlayerProfile;
}
