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

### Running Tests

```bash
npm test
```

## Architecture

See [plans/architecture.md](plans/architecture.md) for detailed design.

## License

MIT