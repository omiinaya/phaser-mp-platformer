# Contributing to Phaser Platformer

Thank you for your interest in contributing!

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/omiinaya/zero-re.git
   cd zero-re
   ```

2. Install dependencies:
   ```bash
   npm install
   npm run install:all
   ```

3. Run the setup script (optional):
   ```bash
   ./scripts/setup.sh
   ```

4. Start development:
   ```bash
   npm run dev
   ```

## Project Structure

```
├── client/         # Phaser 3 game client
├── server/         # Node.js + Socket.IO game server
├── shared/         # Shared types and utilities
├── tests/          # Test files
└── docs/           # Documentation
```

## Running Tests

```bash
# All tests
npm test

# Client tests
npm run test:client

# Server tests  
npm run test:server

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

## Code Style

- Use TypeScript for all new code
- Run `npm run lint` before committing
- Run `npm run format` to auto-format code
- Add JSDoc comments to public methods

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with tests
3. Ensure all tests pass: `npm test`
4. Ensure lint passes: `npm run lint`
5. Update documentation if needed
6. Submit a pull request

## Reporting Issues

Use GitHub issues to report bugs or request features. Include:
- Clear description
- Steps to reproduce
- Environment details (Node.js version, OS, etc.)
