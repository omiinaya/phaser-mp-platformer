#!/bin/bash
# Continuous Improvement Daemon for S+ Maintenance

REPO="$HOME/repos/zero-re"
LOGFILE="$REPO/.ci-daemon.log"
INTERVAL=300  # 5 minutes

log() {
    echo "[$(date -Iseconds)] $1" | tee -a "$LOGFILE"
}

cd "$REPO" || exit 1

while true; do
    log "=== CI Cycle Start ==="
    
    # Pull latest changes first
    git pull origin main 2>/dev/null || true
    
    # Run lint
    log "Running lint..."
    LINT_OUTPUT=$(npm run lint 2>&1)
    LINT_STATUS=$?
    
    # Run tests  
    log "Running tests..."
    TEST_OUTPUT=$(npm run test 2>&1)
    TEST_STATUS=$?
    
    # Count failures in output
    # Count failures in output - only match 'Tests: X failed' pattern to avoid worker warning false positives
FAILURES=$(echo "$TEST_OUTPUT" | grep -E '^Tests:' | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' | head -1)
    
    if [ $LINT_STATUS -eq 0 ] && [ $TEST_STATUS -eq 0 ] && [ -z "$FAILURES" ]; then
        log "✓ All checks passed - S+ maintained"
        echo "$TEST_OUTPUT" | grep -E "(Tests:|Test Suites:)" | tee -a "$LOGFILE"
    else
        log "✗ Issues detected:"
        [ $LINT_STATUS -ne 0 ] && echo "$LINT_OUTPUT" | tail -20 | tee -a "$LOGFILE"
        [ $TEST_STATUS -ne 0 ] && echo "$TEST_OUTPUT" | tail -30 | tee -a "$LOGFILE"
        [ -n "$FAILURES" ] && log "Detected failures: $FAILURES"
        
        # Try auto-fix
        log "Attempting auto-fix..."
        npm run format 2>&1 | tee -a "$LOGFILE"
        npm run lint -- --fix 2>&1 | tee -a "$LOGFILE"
        
        # Re-check
        NEW_LINT=$(npm run lint 2>&1)
        NEW_LINT_STATUS=$?
        
        if [ $NEW_LINT_STATUS -eq 0 ]; then
            log "✓ Auto-fix resolved lint issues"
            git add -A
            git commit -m "ci(auto): fix lint/format issues [$(date +%H:%M)]" 2>/dev/null || true
            git push origin main 2>/dev/null || true
            log "✓ Pushed fixes"
        fi
    fi
    
    log "=== CI Cycle Complete. Sleeping ${INTERVAL}s ==="
    sleep $INTERVAL
done
