#!/bin/bash
# Zero-RE Project Monitor
# Runs tests, lint, and reports status

set -e

echo "=== Zero-RE Project Monitor ==="
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

# Check git status
echo "📊 Git Status:"
git status --short || echo "Working tree clean"
echo ""

# Run lint
echo "🔍 Running ESLint..."
npm run lint > /dev/null 2>&1 && echo "✅ Lint: PASS" || echo "❌ Lint: FAIL"

# Run unit tests
echo "🧪 Running unit tests..."
npm run test:unit > /tmp/test-output.txt 2>&1 && echo "✅ Unit Tests: PASS" || echo "❌ Unit Tests: FAIL"

# Extract test counts
if [ -f /tmp/test-output.txt ]; then
    grep "Tests:" /tmp/test-output.txt | tail -1
fi

echo ""
echo "=== Monitor Complete ==="
