# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please send an email to the maintainers. All security vulnerabilities will be promptly addressed.

Please include the following information:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

## Security Measures

This project implements the following security measures:

- **Dependency Scanning**: We run `npm audit` as part of our CI/CD pipeline
- **Code Linting**: ESLint with TypeScript strict mode
- **Input Validation**: All user inputs are validated using schema validation
- **SQL Injection Prevention**: Parameterized queries via TypeORM
- **Rate Limiting**: HTTP rate limiting middleware on API endpoints
- **Authentication**: JWT-based authentication for API routes

## Known Security Considerations

- The game uses WebSocket connections for real-time multiplayer; ensure production deployments use WSS (WebSocket Secure)
- Database credentials should be stored in environment variables, never committed to version control
- The `.env.example` file shows required environment variables without exposing secrets
- Default development settings are not suitable for production use

## Dependency Security

Our CI runs `npm audit --audit-level=high` to catch high and critical vulnerabilities.

**Note:** There are known moderate vulnerabilities in ESLint's transitive dependencies (ajv via @eslint/eslintrc) that only affect development tools, not production code. These are:

- Ignored in CI via `--audit-level=high`
- Do not affect runtime security
- Will be resolved when ESLint 9.x adoption becomes more widespread

## Updating Dependencies

To ensure security updates are applied:

```bash
# Check for outdated dependencies
npm outdated

# Update all dependencies (respects semver)
npm update

# For major updates, review changelogs first
npm audit fix
```

We recommend enabling Dependabot for automated dependency updates.
