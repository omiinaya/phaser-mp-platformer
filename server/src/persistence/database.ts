import { DataSource } from 'typeorm';
import { PlayerProfile } from './models/PlayerProfile';
import { PlayerStats } from './models/PlayerStats';
import { Unlockable } from './models/Unlockable';
import { PlayerUnlock } from './models/PlayerUnlock';
import { Inventory } from './models/Inventory';
import { Achievement } from './models/Achievement';
import { AchievementProgress } from './models/AchievementProgress';
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'phaser_platformer',
  synchronize: process.env.NODE_ENV === 'development', // auto-create tables in dev (not for production)
  logging: process.env.NODE_ENV === 'development',
  entities: [
    PlayerProfile,
    PlayerStats,
    Unlockable,
    PlayerUnlock,
    Inventory,
    Achievement,
    AchievementProgress,
  ],
  migrations: ['infrastructure/database/migrations/*.ts'],
  subscribers: [],
  poolSize: 20, // maximum number of connections in the pool
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});