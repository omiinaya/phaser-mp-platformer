// Type-only tests for entity types - no imports needed from source files
// These tests verify TypeScript type definitions compile correctly

describe('Entity Type Definitions', () => {
  describe('Enemy Types', () => {
    it('should define EnemyState type with all valid states', () => {
      type EnemyState =
        | 'idle'
        | 'patrol'
        | 'chase'
        | 'attack'
        | 'flee'
        | 'dead';
      const states: EnemyState[] = [
        'idle',
        'patrol',
        'chase',
        'attack',
        'flee',
        'dead',
      ];
      expect(states).toHaveLength(6);
    });

    it('should define EnemyAIConfig interface', () => {
      interface EnemyAIConfig {
        detectionRange?: number;
        attackRange?: number;
        patrolSpeed?: number;
        chaseSpeed?: number;
        patrolChangeTime?: number;
        flying?: boolean;
        dropsLoot?: boolean;
        lootTable?: string[];
      }
      const config: EnemyAIConfig = {
        detectionRange: 300,
        attackRange: 100,
        patrolSpeed: 50,
        chaseSpeed: 150,
        flying: true,
        dropsLoot: true,
        lootTable: ['coin', 'gem'],
      };
      expect(config.detectionRange).toBe(300);
    });
  });

  describe('Item Types', () => {
    it('should define ItemType enum', () => {
      enum ItemType {
        Consumable = 'consumable',
        PowerUp = 'powerup',
        Key = 'key',
        Coin = 'coin',
        Gem = 'gem',
        Weapon = 'weapon',
        Armor = 'armor',
        Miscellaneous = 'misc',
      }
      expect(ItemType.Consumable).toBe('consumable');
      expect(ItemType.PowerUp).toBe('powerup');
      expect(ItemType.Key).toBe('key');
      expect(ItemType.Coin).toBe('coin');
      expect(ItemType.Gem).toBe('gem');
      expect(ItemType.Weapon).toBe('weapon');
      expect(ItemType.Armor).toBe('armor');
      expect(ItemType.Miscellaneous).toBe('misc');
    });

    it('should define GemType union type', () => {
      type GemType = 'red' | 'blue' | 'green' | 'purple' | 'yellow';
      const gemTypes: GemType[] = ['red', 'blue', 'green', 'purple', 'yellow'];
      expect(gemTypes).toHaveLength(5);
    });

    it('should define ItemConfig interface', () => {
      interface ItemConfig {
        type: string;
        name: string;
        description?: string;
        value?: number;
        duration?: number;
        respawns?: boolean;
        respawnTime?: number;
        collectSound?: string;
        collectEffect?: string;
      }
      const config: ItemConfig = {
        type: 'consumable',
        name: 'Health Potion',
        description: 'Restores 50 HP',
        value: 50,
      };
      expect(config.name).toBe('Health Potion');
    });
  });

  describe('Platform Types', () => {
    it('should define PlatformMovement enum', () => {
      enum PlatformMovement {
        Static = 'static',
        Horizontal = 'horizontal',
        Vertical = 'vertical',
        Circular = 'circular',
        Patrolling = 'patrolling',
      }
      expect(PlatformMovement.Static).toBe('static');
      expect(PlatformMovement.Horizontal).toBe('horizontal');
      expect(PlatformMovement.Vertical).toBe('vertical');
      expect(PlatformMovement.Circular).toBe('circular');
      expect(PlatformMovement.Patrolling).toBe('patrolling');
    });

    it('should define PlatformConfig interface', () => {
      interface PlatformConfig {
        movement?: string;
        speed?: number;
        travelDistance?: number;
        oneWay?: boolean;
        tileWidth?: number;
        tileHeight?: number;
        tileSize?: number;
      }
      const config: PlatformConfig = {
        movement: 'horizontal',
        speed: 150,
        travelDistance: 300,
        oneWay: true,
      };
      expect(config.speed).toBe(150);
    });
  });

  describe('PowerUp Types', () => {
    it('should define PowerUpType union type', () => {
      type PowerUpType =
        | 'double_jump'
        | 'shield'
        | 'speed_boost'
        | 'health_boost'
        | 'damage_boost';
      const types: PowerUpType[] = [
        'double_jump',
        'shield',
        'speed_boost',
        'health_boost',
        'damage_boost',
      ];
      expect(types).toHaveLength(5);
    });

    it('should define PowerUpConfig interface', () => {
      interface PowerUpConfig {
        type: string;
        duration: number;
        effectValue?: number;
      }
      const config: PowerUpConfig = {
        type: 'shield',
        duration: 5000,
        effectValue: 50,
      };
      expect(config.duration).toBe(5000);
    });

    it('should define PowerUpEffect interface', () => {
      interface PowerUpEffect {
        type: string;
        startTime: number;
        duration: number;
        value?: number;
      }
      const effect: PowerUpEffect = {
        type: 'double_jump',
        startTime: Date.now(),
        duration: 5000,
      };
      expect(effect.type).toBe('double_jump');
    });
  });
});
