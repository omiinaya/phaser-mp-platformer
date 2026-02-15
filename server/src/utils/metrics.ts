import client from 'prom-client';

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const gameRoomsTotal = new client.Gauge({
  name: 'game_rooms_total',
  help: 'Total number of active game rooms',
});

export const gamePlayersTotal = new client.Gauge({
  name: 'game_players_total',
  help: 'Total number of connected players',
});

export const socketConnectionsTotal = new client.Counter({
  name: 'socket_connections_total',
  help: 'Total number of socket connections',
  labelNames: ['event'],
});

export const socketMessagesTotal = new client.Counter({
  name: 'socket_messages_total',
  help: 'Total number of socket messages',
  labelNames: ['event'],
});

export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

export const cacheHitsTotal = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['operation'],
});

export const cacheMissesTotal = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['operation'],
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(gameRoomsTotal);
register.registerMetric(gamePlayersTotal);
register.registerMetric(socketConnectionsTotal);
register.registerMetric(socketMessagesTotal);
register.registerMetric(dbQueryDuration);
register.registerMetric(cacheHitsTotal);
register.registerMetric(cacheMissesTotal);

export { register };

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  register.resetMetrics();
}
