import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProgressionTables1704840000000 implements MigrationInterface {
  name = 'CreateProgressionTables1704840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // player_profiles
    await queryRunner.query(`
      CREATE TABLE player_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        experience INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        coins INTEGER DEFAULT 0
      );
    `);

    // player_stats
    await queryRunner.query(`
      CREATE TABLE player_stats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID UNIQUE NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
        kills INTEGER DEFAULT 0,
        deaths INTEGER DEFAULT 0,
        score INTEGER DEFAULT 0,
        play_time_seconds INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        highest_score INTEGER DEFAULT 0,
        extra_stats JSONB
      );
    `);

    // unlockables
    await queryRunner.query(`
      CREATE TYPE unlockable_type AS ENUM ('skin', 'ability', 'title', 'emote', 'other');
      CREATE TABLE unlockables (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type unlockable_type DEFAULT 'other',
        required_level INTEGER DEFAULT 1,
        required_achievement_id UUID,
        is_secret BOOLEAN DEFAULT FALSE,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // player_unlocks
    await queryRunner.query(`
      CREATE TABLE player_unlocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
        unlockable_id UUID NOT NULL REFERENCES unlockables(id) ON DELETE CASCADE,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notified BOOLEAN DEFAULT FALSE,
        UNIQUE(player_id, unlockable_id)
      );
    `);

    // inventory
    await queryRunner.query(`
      CREATE TABLE inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
        item_id VARCHAR(255) NOT NULL,
        quantity INTEGER DEFAULT 1,
        metadata JSONB,
        acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // achievements
    await queryRunner.query(`
      CREATE TYPE achievement_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'legendary');
      CREATE TABLE achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        tier achievement_tier DEFAULT 'bronze',
        required_value INTEGER DEFAULT 1,
        reward_coins INTEGER DEFAULT 0,
        reward_unlockable_id UUID REFERENCES unlockables(id),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // achievement_progress
    await queryRunner.query(`
      CREATE TABLE achievement_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
        achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
        progress INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(player_id, achievement_id)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE achievement_progress;`);
    await queryRunner.query(`DROP TABLE achievements;`);
    await queryRunner.query(`DROP TABLE inventory;`);
    await queryRunner.query(`DROP TABLE player_unlocks;`);
    await queryRunner.query(`DROP TABLE unlockables;`);
    await queryRunner.query(`DROP TYPE unlockable_type;`);
    await queryRunner.query(`DROP TABLE player_stats;`);
    await queryRunner.query(`DROP TABLE player_profiles;`);
    await queryRunner.query(`DROP TYPE achievement_tier;`);
  }
}