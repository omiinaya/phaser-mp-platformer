# Phaser Platformer

A multiplayer platformer game built with Phaser 3, Node.js, Socket.IO, and TypeScript.

## Project Structure

```
phaser-platformer/
├── client/                 # Phaser 3 TypeScript frontend
├── server/                 # Node.js backend with Socket.IO
├── shared/                 # Shared TypeScript interfaces & utilities
├── infrastructure/         # Docker, Kubernetes, Terraform
├── docs/                   # Documentation
├── tests/                  # Test suites
├── scripts/                # Build/deployment scripts
├── logs/                   # Log files (auto-generated)
└── results/                # Script results (auto-generated)
```

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- PostgreSQL (optional, for persistence)
- Redis (optional, for caching)

### Installation

1. Clone the repository.
2. Install root dependencies:

```bash
npm install
```

3. Install workspace dependencies:

```bash
npm run install:all
```

Or install individually:

```bash
cd client && npm install
cd server && npm install
cd shared && npm install
```

### Development

Start the client and server in development mode:

```bash
npm run dev
```

This will start:
- Client on http://localhost:3000 (via webpack-dev-server)
- Server on http://localhost:4000 (Express + Socket.IO)

### Building for Production

```bash
npm run build
```

Outputs:
- `client/dist/` – Bundled static assets
- `server/dist/` – Compiled Node.js server

## Testing

The project includes comprehensive test suites:

### Unit Tests

Unit tests are written with Jest and cover core modules, game entities, and server services.

Run client unit tests:

```bash
cd client && npm test
```

Run server unit tests:

```bash
cd server && npm test
```

Run all unit tests from root:

```bash
npm run test:unit
```

### Integration Tests

Integration tests verify client‑server communication and database interactions using Supertest and a test SQLite database.

Run integration tests:

```bash
npm run test:integration
```

### End‑to‑End Tests

E2E tests simulate gameplay with Puppeteer.

Run E2E tests:

```bash
npm run test:e2e
```

### Coverage Reports

Jest is configured to collect code coverage. Generate coverage reports:

```bash
npm run test:coverage
```

Coverage thresholds are set to >80% for statements, branches, functions, and lines.

## Documentation

### API Documentation

API documentation is automatically generated from TypeScript source using TypeDoc. To generate:

```bash
npm run docs
```

The output is placed in `docs/api/`. Open `docs/api/index.html` in a browser.

### Developer Guides

See `docs/developer/` for guides on extending the game, adding new entities, and integrating with the server.

### Player Guides

See `docs/player/` for gameplay instructions and controls.

## Continuous Integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push, executing all tests and generating coverage reports.

## Architecture

See [plans/architecture.md](plans/architecture.md) for detailed design.

## License

MIT