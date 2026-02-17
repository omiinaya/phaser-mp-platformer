# Release Process

This document outlines the release workflow and versioning strategy for Phaser Platformer.

## Versioning

We follow [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking changes (incompatible API changes)
- **MINOR**: New features (backward-compatible)
- **PATCH**: Bug fixes (backward-compatible)

### Pre-release Versions

- **alpha**: Early development (unstable)
- **beta**: Feature complete, testing
- **rc**: Release candidate (feature complete, final testing)

Examples:
- `1.0.0-alpha.1`
- `1.0.0-beta.3`
- `1.0.0-rc.1`

## Release Branches

### Main Branch
- Always production-ready
- All tests must pass
- Protected branch

### Develop Branch
- Integration branch for next release
- Contains work-in-progress features

### Release Branches
- Format: `release/x.y.z`
- Created from develop when ready for release
- Only bug fixes allowed
- Merged to main and develop

### Hotfix Branches
- Format: `hotfix/description`
- For urgent production fixes
- Created from main
- Merged to main and develop

## Release Workflow

### 1. Prepare Release

```bash
# Update version
npm version minor -m "Release v%s"

# Update changelog
npm run changelog

# Push changes
git push && git push --tags
```

### 2. Create Release on GitHub

1. Go to Releases → Draft New Release
2. Select tag (e.g., v1.0.0)
3. Add release notes from CHANGELOG.md
4. Attach build artifacts
5. Publish release

### 3. CI/CD Pipeline

On tag push, the CI pipeline:
1. Runs all tests
2. Builds artifacts
3. Creates GitHub release
4. Deploys to staging (develop branch)
5. Deploys to production (main branch tags)

## Automated Releases

### Dependabot

We use Dependabot for dependency updates:
- Creates PRs for outdated dependencies
- Auto-merges non-breaking security updates
- Requires manual review for major updates

### Release Automation

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build
        run: |
          npm ci
          npm run build
      
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: ${{ contains(github.ref, 'alpha') || contains(github.ref, 'beta') }}
```

## Environment Configs

| Environment | URL | Branch | Config |
|-------------|-----|--------|--------|
| Development | localhost | feature/* | .env |
| Staging | staging.example.com | develop | staging.env |
| Production | game.example.com | main | production.env |

## Deployment

### Manual Deploy

```bash
# Staging
git checkout develop
git pull
npm ci
npm run build
pm2 restart server

# Production
git checkout v1.0.0
git pull
npm ci
npm run build
pm2 restart server
```

### Automated Deploy (Docker)

```bash
# Build image
docker build -t phaser-platformer:v1.0.0 .

# Run container
docker run -d -p 4000:4000 phaser-platformer:v1.0.0
```

## Rollback Procedure

### Quick Rollback

```bash
# Revert to previous version
git revert HEAD
git push

# Or rollback database
psql -c "BEGIN; ROLLBACK;"
```

### Database Rollback

1. Stop application
2. Restore database from backup
3. Deploy previous version
4. Verify functionality

## Post-Release

1. Monitor error rates
2. Check performance metrics
3. Update documentation
4. Announce release
5. Close related issues

## Release Checklist

- [ ] All tests pass
- [ ] Security audit completed
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Build artifacts created
- [ ] Release notes written
- [ ] Deployment verified
- [ ] Monitoring alerts configured
- [ ] Rollback plan tested

---

*Last updated: 2026-02-17*
