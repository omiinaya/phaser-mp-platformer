import { ObjectPool, ObjectPoolConfig } from '../../../src/core/ObjectPool';

interface MockObject {
  id: number;
  resetCalled: boolean;
  destroyCalled: boolean;
}

describe('ObjectPool', () => {
  let pool: ObjectPool<MockObject>;
  let createCount: number;
  let resetCount: number;
  let destroyCount: number;

  beforeEach(() => {
    createCount = 0;
    resetCount = 0;
    destroyCount = 0;
  });

  const createFactory = () => {
    createCount++;
    return { id: createCount, resetCalled: false, destroyCalled: false };
  };

  const createReset = (obj: MockObject) => {
    resetCount++;
    obj.resetCalled = true;
  };

  const createDestroy = (obj: MockObject) => {
    destroyCount++;
    obj.destroyCalled = true;
  };

  const createConfig = (
    overrides?: Partial<ObjectPoolConfig<MockObject>>,
  ): ObjectPoolConfig<MockObject> => ({
    initialSize: 3,
    maxSize: 10,
    create: createFactory,
    reset: createReset,
    destroy: createDestroy,
    ...overrides,
  });

  describe('constructor', () => {
    it('should create pool with initial size', () => {
      pool = new ObjectPool(createConfig({ initialSize: 5 }));
      expect(pool.getIdleCount()).toBe(5);
      expect(createCount).toBe(5);
    });

    it('should create pool with default initial size of 10', () => {
      pool = new ObjectPool({
        create: createFactory,
      });
      expect(pool.getIdleCount()).toBe(10);
      expect(createCount).toBe(10);
    });

    it('should use default max size of 100', () => {
      pool = new ObjectPool({
        create: createFactory,
      });
      expect(pool.getActiveCount()).toBe(0);
    });
  });

  describe('acquire', () => {
    it('should return an object from the pool', () => {
      pool = new ObjectPool(createConfig({ initialSize: 3 }));
      const obj = pool.acquire();
      expect(obj).toBeDefined();
      expect(pool.getIdleCount()).toBe(2);
      expect(pool.getActiveCount()).toBe(1);
    });

    it('should create new object when pool is empty', () => {
      pool = new ObjectPool(createConfig({ initialSize: 1 }));
      pool.acquire(); // Takes the only idle object
      expect(pool.getIdleCount()).toBe(0);

      const obj = pool.acquire(); // Should create new
      expect(obj).toBeDefined();
      expect(pool.getActiveCount()).toBe(2);
    });

    it('should track active count correctly', () => {
      pool = new ObjectPool(createConfig({ initialSize: 5 }));
      expect(pool.getActiveCount()).toBe(0);

      pool.acquire();
      expect(pool.getActiveCount()).toBe(1);

      pool.acquire();
      expect(pool.getActiveCount()).toBe(2);
    });
  });

  describe('release', () => {
    it('should return object to the pool', () => {
      pool = new ObjectPool(createConfig({ initialSize: 3 }));
      const obj = pool.acquire();
      pool.release(obj);
      expect(pool.getIdleCount()).toBe(3);
      expect(pool.getActiveCount()).toBe(0);
    });

    it('should call reset on released object', () => {
      pool = new ObjectPool(createConfig());
      const obj = pool.acquire();
      pool.release(obj);
      expect(obj.resetCalled).toBe(true);
      expect(resetCount).toBe(1);
    });

    it('should track active count correctly when releasing', () => {
      pool = new ObjectPool(createConfig({ initialSize: 1, maxSize: 2 }));

      const obj1 = pool.acquire();
      expect(pool.getActiveCount()).toBe(1);

      const _obj2 = pool.acquire();
      expect(_obj2).toBeDefined();
      expect(pool.getActiveCount()).toBe(2);

      pool.release(obj1);
      expect(pool.getActiveCount()).toBe(1);
    });
  });

  describe('releaseAll', () => {
    it('should release all objects in the provided list', () => {
      pool = new ObjectPool(createConfig({ initialSize: 5 }));
      const obj1 = pool.acquire();
      const obj2 = pool.acquire();
      pool.releaseAll([obj1, obj2]);
      expect(pool.getIdleCount()).toBe(5);
      expect(pool.getActiveCount()).toBe(0);
    });

    it('should reset active count when no list provided', () => {
      pool = new ObjectPool(createConfig({ initialSize: 5 }));
      pool.acquire();
      pool.acquire();
      pool.releaseAll();
      expect(pool.getActiveCount()).toBe(0);
    });
  });

  describe('getIdleCount', () => {
    it('should return correct idle count', () => {
      pool = new ObjectPool(createConfig({ initialSize: 5 }));
      expect(pool.getIdleCount()).toBe(5);

      pool.acquire();
      expect(pool.getIdleCount()).toBe(4);

      pool.acquire();
      expect(pool.getIdleCount()).toBe(3);
    });
  });

  describe('getActiveCount', () => {
    it('should return correct active count', () => {
      pool = new ObjectPool(createConfig({ initialSize: 5 }));
      expect(pool.getActiveCount()).toBe(0);

      pool.acquire();
      expect(pool.getActiveCount()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should destroy all idle objects', () => {
      pool = new ObjectPool(createConfig({ initialSize: 5 }));
      pool.clear();
      expect(pool.getIdleCount()).toBe(0);
      expect(destroyCount).toBe(5);
    });

    it('should reset active count', () => {
      pool = new ObjectPool(createConfig({ initialSize: 5 }));
      pool.acquire();
      pool.acquire();
      pool.clear();
      expect(pool.getActiveCount()).toBe(0);
    });
  });

  describe('preallocate', () => {
    it('should add additional objects to the pool', () => {
      pool = new ObjectPool(createConfig({ initialSize: 2, maxSize: 10 }));
      expect(pool.getIdleCount()).toBe(2);

      pool.preallocate(5);
      expect(pool.getIdleCount()).toBe(7);
    });

    it('should not exceed max size', () => {
      pool = new ObjectPool(createConfig({ initialSize: 2, maxSize: 5 }));
      pool.preallocate(10);
      expect(pool.getIdleCount()).toBe(5);
    });
  });
});
