#!/usr/bin/env node

/**
 * Test runner that accepts URL as argument
 * Usage: npm test -- https://example.com
 *    or: npm test (runs all tests)
 */

require('dotenv').config();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getUrlBasedPath } = require('./utils/url-path');
const runId = process.env.RUN_ID || new Date().toISOString().replace(/[:.]/g, '-');
const KEEP_RUNS = parseInt(process.env.RUNS_KEEP_COUNT || '3', 10);
const REPORT_BASE_DIR = process.env.REPORT_BASE_DIR || path.join('runs', runId, 'playwright-report');
fs.mkdirSync(path.join(__dirname, REPORT_BASE_DIR), { recursive: true });

// Helper function to format duration
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Get arguments after '--' (npm passes them as additional process.argv entries)
const args = process.argv.slice(2);
const urlArg = args.find(arg => arg.startsWith('http://') || arg.startsWith('https://'));

if (urlArg) {
  // If URL is provided, run only the URL audit test
  console.log(`Running audit tests for: ${urlArg}\n`);
  // Clean domain artifacts for this URL
  try {
    const domain = new URL(urlArg).hostname.replace(/^www\./, '');
    pruneDomainRuns(domain);
    ['playwright-report'].forEach(base => {
      const actualBase = base === 'playwright-report' ? REPORT_BASE_DIR : REPORT_BASE_DIR;
      const baseParent = path.join(__dirname, actualBase);
      if (fs.existsSync(baseParent)) {
        const entries = fs.readdirSync(baseParent, { withFileTypes: true });
        entries.forEach(entry => {
          if (
            entry.isDirectory() &&
            (entry.name === domain || entry.name.startsWith(`${domain}-`))
          ) {
            fs.rmSync(path.join(baseParent, entry.name), { recursive: true, force: true });
          }
        });
      }
    });
  } catch (e) {
    console.warn(`⚠️  Domain cleanup skipped: ${e.message}`);
  }
  
  // Record start time
  const startTime = Date.now();
  
  const testProcess = spawn('npx', ['playwright', 'test', 'tests/url-audit.spec.ts'], {
    env: {
      ...process.env,
      URL_AUDIT_URL: urlArg,
      REPORT_BASE_DIR,
    },
    stdio: 'inherit',
    shell: true,
  });

  testProcess.on('close', (code) => {
    const duration = Date.now() - startTime;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`⏱️  EXECUTION TIME: ${formatDuration(duration)}`);
    console.log(`${'='.repeat(70)}\n`);
    process.exit(code);
  });
} else if (process.env.TEST_URL) {
  // If no URL provided but TEST_URL is in .env, use it
  console.log(`Running audit tests for: ${process.env.TEST_URL} (from .env)\n`);
  
  // Record start time
  const startTime = Date.now();
  
  const testProcess = spawn('npx', ['playwright', 'test', 'tests/url-audit.spec.ts'], {
    env: {
      ...process.env,
      URL_AUDIT_URL: process.env.TEST_URL,
    },
    stdio: 'inherit',
    shell: true,
  });

  testProcess.on('close', (code) => {
    const duration = Date.now() - startTime;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`⏱️  EXECUTION TIME: ${formatDuration(duration)}`);
    console.log(`${'='.repeat(70)}\n`);
    process.exit(code);
  });
} else {
  // No URL provided, run all tests
  // Record start time
  const startTime = Date.now();
  
  const testProcess = spawn('npx', ['playwright', 'test'], {
    stdio: 'inherit',
    shell: true,
  });

  testProcess.on('close', (code) => {
    const duration = Date.now() - startTime;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`⏱️  EXECUTION TIME: ${formatDuration(duration)}`);
    console.log(`${'='.repeat(70)}\n`);
    process.exit(code);
  });
}

// Remove older runs for this domain (keep newest KEEP_RUNS)
function pruneDomainRuns(domain) {
  const runsRoot = path.join(__dirname, 'runs');
  if (!fs.existsSync(runsRoot)) return;
  const runEntries = fs.readdirSync(runsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => name !== runId);

  const candidates = [];
  for (const r of runEntries) {
    const repDir = path.join(runsRoot, r, 'playwright-report', domain);
    if (fs.existsSync(repDir)) {
      const statPath = repDir;
      try {
        const stat = fs.statSync(statPath);
        candidates.push({ run: r, mtime: stat.mtimeMs, repDir });
      } catch (e) {
        // ignore
      }
    }
  }
  if (candidates.length <= KEEP_RUNS) return;
  candidates.sort((a, b) => b.mtime - a.mtime);
  const toDelete = candidates.slice(KEEP_RUNS);
  toDelete.forEach(item => {
    fs.rmSync(item.repDir, { recursive: true, force: true });
  });
}

