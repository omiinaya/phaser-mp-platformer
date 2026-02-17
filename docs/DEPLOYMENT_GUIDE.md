# Deployment Guide

This guide covers deploying the Phaser Platformer to production.

## Prerequisites

- Node.js 18+ 
- npm 9+
- PostgreSQL 14+
- Redis 7+

## Environment Variables

### Server (.env)
```bash
# Server
PORT=4000
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=phaser_platformer
DB_USER=your_user
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=your-secret-key
BCRYPT_ROUNDS=12

# Logging
LOG_LEVEL=info
```

### Client
The client is a static SPA that connects to the server. Configure the server URL in your deployment.

## Build

### Build Client
```bash
npm run build:client
# Output: client/dist/
```

### Build Server
```bash
npm run build:server
# Output: server/dist/
```

## Production Deployment

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Set environment variables

3. Start the server:
```bash
cd server && npm start
```

4. Serve the client:
```bash
# Using nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/client/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:4000;
    }
    
    location /socket.io {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Docker Deployment

```bash
docker-compose up -d
```

See `docker-compose.yml` for configuration.

## Health Checks

### Server Health
```bash
curl http://localhost:4000/health
```

### Database Connection
```bash
# Check via server logs
```

## Monitoring

### Logs
- Server logs: `server/logs/`
- Use Winston with daily rotate file transport

### Metrics
- Prometheus metrics available at `/metrics`
- Default port: 9090

## Performance Tuning

See [PERFORMANCE_TUNING.md](./PERFORMANCE_TUNING.md) for detailed tuning recommendations.

## Troubleshooting

### Connection Issues
1. Check firewall rules
2. Verify WebSocket proxy configuration
3. Check server logs for errors

### Performance Issues
1. Monitor Redis cache hit rates
2. Check database query performance
3. Review client-side performance metrics

### Security
1. Ensure JWT_SECRET is unique in production
2. Use HTTPS in production
3. Configure CORS properly
