# Monitoring & Alerting

This document outlines the monitoring and alerting strategy for Phaser Platformer.

## Metrics Collection

### Application Metrics

| Metric | Description | Type |
|--------|-------------|------|
| `http_requests_total` | Total HTTP requests | Counter |
| `http_request_duration_seconds` | Request latency | Histogram |
| `game_players_online` | Active players | Gauge |
| `game_rooms_active` | Active game rooms | Gauge |
| `websocket_connections` | WebSocket connections | Gauge |
| `database_query_duration_seconds` | DB query time | Histogram |
| `cache_hit_ratio` | Cache hit/miss ratio | Gauge |

### Node.js Process

| Metric | Description |
|--------|-------------|
| `process_cpu_seconds_total` | CPU usage |
| `process_memory_bytes` | Memory usage |
| `process_open_handles` | Open file handles |

### System Metrics

| Metric | Description |
|--------|-------------|
| `system_cpu_usage` | CPU utilization |
| `system_memory_usage` | RAM utilization |
| `system_disk_io` | Disk I/O |
| `system_network_bytes` | Network traffic |

## Alerting Rules

### Critical Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| High Error Rate | errors > 5% for 5m | Critical |
| Service Down | HTTP 503 for 1m | Critical |
| Database Unreachable | Connection failure | Critical |
| Memory Exhausted | Memory > 90% | Critical |

### Warning Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| High Latency | p99 > 2s | Warning |
| High CPU | CPU > 80% for 10m | Warning |
| Low Disk Space | Disk < 10% | Warning |
| Failed Logins | failures > 10/m | Warning |

### Info Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| New Deploy | Version change | Info |
| Rate Limit | 429 responses | Info |

## Dashboards

### System Overview
- CPU/Memory/Disk usage
- Request rate
- Error rate

### Application
- Active players
- Game rooms
- WebSocket connections
- Latency percentiles

### Database
- Query performance
- Connection pool
- Slow queries

### Cache
- Hit ratio
- Memory usage
- Evictions

## Tools

### Prometheus + Grafana
```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
```

### Logging
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Or: Loki + Grafana

## Runbook: High CPU

1. Check which process is consuming CPU
   ```bash
   top -c
   ```

2. Check for infinite loops in recent deploys

3. Enable CPU profiling
   ```bash
   node --prof server.js
   ```

4. Scale horizontally if needed

## Runbook: Memory Leak

1. Take heap snapshot
   ```bash
   node --inspect server.js
   # Chrome DevTools > Memory > Take snapshot
   ```

2. Compare snapshots after gameplay

3. Check for event listener leaks

4. Restart service if critical

---

*Last updated: 2026-02-17*
