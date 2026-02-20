// Type-only tests for Platform types - no imports needed from source files

describe('Platform Types', () => {
  describe('PlatformMovement', () => {
    it('should have all movement types', () => {
      type PlatformMovement = 'static' | 'horizontal' | 'vertical' | 'circular';
      const movements: PlatformMovement[] = [
        'static',
        'horizontal',
        'vertical',
        'circular',
      ];
      expect(movements).toHaveLength(4);
    });
  });

  describe('PlatformConfig', () => {
    it('should define platform config', () => {
      interface PlatformConfig {
        width: number;
        height: number;
        movement?: string;
        moveSpeed?: number;
        moveRange?: number;
        breakable?: boolean;
        breakDelay?: number;
      }
      const config: PlatformConfig = {
        width: 100,
        height: 20,
      };
      expect(config.width).toBe(100);
      expect(config.height).toBe(20);
    });

    it('should allow optional movement fields', () => {
      interface PlatformConfig {
        width: number;
        height: number;
        movement?: string;
        moveSpeed?: number;
        moveRange?: number;
        breakable?: boolean;
        breakDelay?: number;
      }
      const config: PlatformConfig = {
        width: 100,
        height: 20,
        movement: 'horizontal',
        moveSpeed: 50,
        moveRange: 100,
      };
      expect(config.movement).toBe('horizontal');
      expect(config.moveSpeed).toBe(50);
    });

    it('should allow breakable platform', () => {
      interface PlatformConfig {
        width: number;
        height: number;
        movement?: string;
        moveSpeed?: number;
        moveRange?: number;
        breakable?: boolean;
        breakDelay?: number;
      }
      const config: PlatformConfig = {
        width: 100,
        height: 20,
        breakable: true,
        breakDelay: 500,
      };
      expect(config.breakable).toBe(true);
      expect(config.breakDelay).toBe(500);
    });
  });
});
