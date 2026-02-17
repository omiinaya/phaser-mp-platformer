# Tech Stack

This document outlines the technology choices and their rationale.

## Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Phaser 3 | 3.x | Game engine |
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Webpack | 5.x | Bundling |
| Jest | 29.x | Testing |

### Rationale
- **Phaser 3**: Best 2D game engine for JavaScript, excellent documentation
- **React**: Component-based UI, large ecosystem
- **TypeScript**: Catches bugs early, better IDE support
- **Webpack**: Mature, well-supported, good for complex apps

## Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime |
| Express | 4.x | Web framework |
| Socket.IO | 4.x | WebSocket |
| TypeORM | 0.3.x | ORM |
| PostgreSQL | 16.x | Database |

### Rationale
- **Node.js**: Non-blocking I/O, good for real-time apps
- **Express**: Simple, flexible, large community
- **Socket.IO**: Reliable WebSocket, auto-reconnection
- **TypeORM**: TypeScript support, migration system

## Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Kubernetes | Orchestration |
| Nginx | Reverse proxy |
| Redis | Caching |
| Prometheus | Monitoring |
| Grafana | Visualization |

## Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Linting |
| Prettier | Formatting |
| TypeDoc | Documentation |
| Jest | Testing |
| Puppeteer | E2E testing |

---

*Last updated: 2026-02-17*
