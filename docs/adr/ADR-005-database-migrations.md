# ADR-005: Database Migration Strategy

## Status

Accepted

## Context

We need a strategy for managing database schema changes safely in development and production.

## Decision

We will use TypeORM migrations with the following workflow:

1. Generate migrations from entity changes
2. Run migrations in CI/CD
3. Use versioned migration files

## Migration Structure

```
database/
├── migrations/
│   ├── 1708200000-CreatePlayersTable.ts
│   ├── 1708200001-AddIndexes.ts
│   └── 1708200002-AddLeaderboard.ts
├── seeds/
│   ├── 001-initial-data.ts
│   └── 002-game-config.ts
└── config.ts
```

## Commands

```bash
# Generate migration from entities
npm run migration:generate -- -n AddPlayerStats

# Create empty migration
npm run migration:create -- -n AddPlayerStats

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

## Workflow

### Development

1. Modify entity file
2. Generate migration:
   ```bash
   npm run migration:generate -- -n MigrationName
   ```
3. Review generated SQL
4. Run migration:
   ```bash
   npm run migration:run
   ```

### Production

1. Merge migration PR
2. CI runs migration automatically:
   ```yaml
   - name: Run migrations
     run: npm run migration:run
   ```
3. Verify deployment

## Rollback Strategy

### Option 1: Down Migrations

```typescript
export class AddPlayers1708200000 {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(/* ... */);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('players');
  }
}
```

### Option 2: Data Backup

Before risky migrations:
1. Backup data
2. Run migration
3. Verify
4. Delete backup if successful

## Best Practices

1. **Never modify existing migrations** - Always create new ones
2. **Test migrations locally first** - Use test database
3. **Keep migrations small** - One change per migration
4. **Include rollback** - Always write `down()` method
5. **Add comments** - Explain why the change was made

## Seed Data

For reference/static data:

```typescript
export class SeedInitialData1708200000 {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.insert('game_config', {
      key: 'max_players_per_room',
      value: '4',
    });
  }
}
```

---

*Date: 2026-02-17*
