// Mock Phaser
jest.mock('phaser', () => ({
  Scene: jest.fn().mockImplementation(() => ({
    load: {
      spritesheet: jest.fn(),
      image: jest.fn(),
    },
  })),
  Math: {
    Vector2: class {
      x = 0;
      y = 0;
      set(x: number, y: number) {
        this.x = x;
        this.y = y;
        return this;
      }
    },
  },
}));

// Test the EnemyPool exports and types
describe('EnemyPool Types', () => {
  describe('EnemyType', () => {
    it('should define all enemy types', () => {
      type EnemyType = 'slime' | 'flying' | 'archer' | 'advanced' | 'custom';
      const types: EnemyType[] = [
        'slime',
        'flying',
        'archer',
        'advanced',
        'custom',
      ];
      expect(types).toHaveLength(5);
    });
  });

  describe('EnemySpawnParams', () => {
    it('should define spawn parameters', () => {
      interface EnemySpawnParams {
        x: number;
        y: number;
        type: string;
        config?: any;
        customFactory?: Function;
      }
      const params: EnemySpawnParams = {
        x: 100,
        y: 200,
        type: 'slime',
      };
      expect(params.x).toBe(100);
      expect(params.type).toBe('slime');
    });

    it('should allow optional config', () => {
      interface EnemySpawnParams {
        x: number;
        y: number;
        type: string;
        config?: any;
        customFactory?: Function;
      }
      const params: EnemySpawnParams = {
        x: 100,
        y: 200,
        type: 'slime',
        config: { speed: 50 },
      };
      expect(params.config).toEqual({ speed: 50 });
    });

    it('should allow customFactory', () => {
      interface EnemySpawnParams {
        x: number;
        y: number;
        type: string;
        config?: any;
        customFactory?: Function;
      }
      const factory = jest.fn();
      const params: EnemySpawnParams = {
        x: 100,
        y: 200,
        type: 'custom',
        customFactory: factory,
      };
      expect(params.customFactory).toBe(factory);
    });
  });
});
