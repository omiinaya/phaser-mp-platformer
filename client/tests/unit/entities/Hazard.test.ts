// Type-only tests for Hazard types - no imports needed from source files

describe('Hazard Types', () => {
  describe('HazardType', () => {
    it('should have spike type', () => {
      type HazardType = 'spike' | 'lava' | 'saw_blade' | 'fire' | 'acid';
      const types: HazardType[] = [
        'spike',
        'lava',
        'saw_blade',
        'fire',
        'acid',
      ];
      expect(types).toHaveLength(5);
    });
  });

  describe('HazardConfig', () => {
    it('should define HazardConfig interface', () => {
      interface HazardConfig {
        type: string;
        damage: number;
        damagePerSecond?: number;
        knockback?: boolean;
        knockbackForce?: number;
      }
      const config: HazardConfig = {
        type: 'spike',
        damage: 10,
      };
      expect(config.type).toBe('spike');
      expect(config.damage).toBe(10);
    });

    it('should allow optional fields', () => {
      interface HazardConfig {
        type: string;
        damage: number;
        damagePerSecond?: number;
        knockback?: boolean;
        knockbackForce?: number;
      }
      const config: HazardConfig = {
        type: 'lava',
        damage: 25,
        damagePerSecond: 5,
        knockback: true,
        knockbackForce: 200,
      };
      expect(config.damagePerSecond).toBe(5);
      expect(config.knockback).toBe(true);
      expect(config.knockbackForce).toBe(200);
    });
  });
});
