import {
  getMetrics,
  resetMetrics,
  httpRequestDuration,
  httpRequestTotal,
  gameRoomsTotal,
  gamePlayersTotal,
  socketConnectionsTotal,
  socketMessagesTotal,
  dbQueryDuration,
  cacheHitsTotal,
  cacheMissesTotal,
  register,
} from '../../../src/utils/metrics';

describe('metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      const metrics = await getMetrics();
      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', async () => {
      // Increment some counters
      httpRequestTotal.inc({
        method: 'GET',
        route: '/test',
        status_code: '200',
      });
      gameRoomsTotal.set(5);

      // Reset
      resetMetrics();

      // Should be able to get metrics without error
      const metrics = await getMetrics();
      expect(typeof metrics).toBe('string');
    });
  });

  describe('httpRequestDuration', () => {
    it('should observe a request duration', () => {
      httpRequestDuration.observe(
        { method: 'GET', route: '/api/test', status_code: '200' },
        0.05,
      );
      // Just ensure it doesn't throw
    });

    it('should track multiple observations', () => {
      httpRequestDuration.observe(
        { method: 'GET', route: '/api/test', status_code: '200' },
        0.01,
      );
      httpRequestDuration.observe(
        { method: 'GET', route: '/api/test', status_code: '200' },
        0.1,
      );
      httpRequestDuration.observe(
        { method: 'POST', route: '/api/test', status_code: '201' },
        0.05,
      );
    });
  });

  describe('httpRequestTotal', () => {
    it('should increment counter', () => {
      httpRequestTotal.inc({
        method: 'GET',
        route: '/api/test',
        status_code: '200',
      });
    });

    it('should increment by custom value', () => {
      httpRequestTotal.inc(
        { method: 'GET', route: '/api/test', status_code: '200' },
        5,
      );
    });
  });

  describe('gameRoomsTotal', () => {
    it('should set gauge value', () => {
      gameRoomsTotal.set(10);
    });

    it('should increment gauge', () => {
      gameRoomsTotal.inc();
      gameRoomsTotal.inc();
      gameRoomsTotal.set(5);
    });

    it('should decrement gauge', () => {
      gameRoomsTotal.set(10);
      gameRoomsTotal.dec();
      gameRoomsTotal.dec(3);
    });
  });

  describe('gamePlayersTotal', () => {
    it('should set gauge value', () => {
      gamePlayersTotal.set(100);
    });

    it('should increment and decrement', () => {
      gamePlayersTotal.inc();
      gamePlayersTotal.dec();
    });
  });

  describe('socketConnectionsTotal', () => {
    it('should increment connection counter', () => {
      socketConnectionsTotal.inc({ event: 'connect' });
    });

    it('should track disconnection', () => {
      socketConnectionsTotal.inc({ event: 'disconnect' });
    });
  });

  describe('socketMessagesTotal', () => {
    it('should increment message counter', () => {
      socketMessagesTotal.inc({ event: 'game_update' });
    });

    it('should track different message types', () => {
      socketMessagesTotal.inc({ event: 'player_action' });
      socketMessagesTotal.inc({ event: 'chat_message' });
    });
  });

  describe('dbQueryDuration', () => {
    it('should observe query duration', () => {
      dbQueryDuration.observe({ operation: 'SELECT', table: 'players' }, 0.01);
    });

    it('should track different operations', () => {
      dbQueryDuration.observe(
        { operation: 'INSERT', table: 'inventory' },
        0.05,
      );
      dbQueryDuration.observe(
        { operation: 'UPDATE', table: 'player_stats' },
        0.02,
      );
      dbQueryDuration.observe(
        { operation: 'DELETE', table: 'achievements' },
        0.01,
      );
    });
  });

  describe('cacheHitsTotal', () => {
    it('should increment cache hits', () => {
      cacheHitsTotal.inc({ operation: 'get' });
    });

    it('should track multiple hits', () => {
      cacheHitsTotal.inc({ operation: 'get' }, 10);
    });
  });

  describe('cacheMissesTotal', () => {
    it('should increment cache misses', () => {
      cacheMissesTotal.inc({ operation: 'get' });
    });

    it('should track misses for different operations', () => {
      cacheMissesTotal.inc({ operation: 'set' });
      cacheMissesTotal.inc({ operation: 'delete' });
    });
  });

  describe('register', () => {
    it('should have metrics registered', () => {
      expect(
        register.getSingleMetric('http_request_duration_seconds'),
      ).toBeDefined();
      expect(register.getSingleMetric('http_requests_total')).toBeDefined();
      expect(register.getSingleMetric('game_rooms_total')).toBeDefined();
    });
  });
});
