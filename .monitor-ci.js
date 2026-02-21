#!/usr/bin/env node
/**
 * CI Monitor - Continuous S+ Improvement Monitor
 * Watches test/lint status and triggers fixes as needed
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = process.env.REPO || '/root/repos/zero-re';
const LOG_FILE = path.join(REPO, '.ci-daemon.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  fs.appendFileSync(LOG_FILE, line + '\n');
  console.log(line);
}

function exec(cmd, opts = {}) {
  try {
    return {
      success: true,
      output: execSync(cmd, { encoding: 'utf8', cwd: REPO, ...opts }),
    };
  } catch (e) {
    return { success: false, output: e.stdout + e.stderr, code: e.status };
  }
}

function checkStatus() {
  const lint = exec('npm run lint 2>&1');
  const tests = exec('npm run test 2>&1', { timeout: 120000 });

  const lintPass = lint.success;
  // Only rely on exit code; avoid false positives from unrelated "failed" strings (e.g., worker warnings)
  const testPass = tests.success;
  // Extract passed test count from the summary line, avoiding worker warning false positives
const testCountMatch = tests.output.match(/^Tests:\s+(\d+)\s+passed/m);
const testCount = testCountMatch?.[1] || '?';

  return {
    lintPass,
    testPass,
    testCount,
    lintOutput: lint.output,
    testOutput: tests.output,
  };
}

function tryAutoFix() {
  log('Attempting auto-fix...');
  exec('npm run format 2>&1');
  exec('npm run lint -- --fix 2>&1');
}

function commitAndPush() {
  try {
    exec('git add -A');
    const status = exec('git status --porcelain');
    if (!status.output.trim()) {
      log('No changes to commit');
      return false;
    }

    const commit = exec(
      `git commit -m "ci(auto): S+ maintenance fix [${new Date().toISOString()}]"`,
    );
    if (commit.success) {
      exec('git push origin main');
      log('✓ Changes committed and pushed');
      return true;
    }
  } catch (e) {
    log('Commit failed: ' + e.message);
  }
  return false;
}

async function runCycle() {
  log('=== CI Monitor Cycle ===');

  // Pull first
  exec('git pull origin main 2>&1 || true');

  const status = checkStatus();
  log(
    `Status: Lint=${status.lintPass ? 'PASS' : 'FAIL'}, Tests=${status.testPass ? 'PASS' : 'FAIL'} (${status.testCount})`,
  );

  if (status.lintPass && status.testPass) {
    log('✓ S+ maintained - all checks pass');
    return true;
  }

  log('✗ Issues detected - running auto-fix');
  tryAutoFix();

  // Re-check
  const recheck = checkStatus();
  if (recheck.lintPass && recheck.testPass) {
    log('✓ Auto-fix successful');
    commitAndPush();
    return true;
  }

  log('✗ Auto-fix incomplete - may need manual intervention');
  if (!recheck.lintPass) {
    log('Lint issues remain:');
    log(recheck.lintOutput.slice(-500));
  }
  if (!recheck.testPass) {
    log('Test failures remain:');
    log(recheck.testOutput.slice(-1000));
  }
  return false;
}

// Run immediately, then loop
runCycle();
setInterval(runCycle, 5 * 60 * 1000); // Every 5 minutes

log('CI Monitor daemon started');
