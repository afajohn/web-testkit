#!/usr/bin/env node

/**
 * Aura QA - Single URL Sniper
 * FEATURES: 
 * 1. Auto-Nukes 'test-results' folder every run.
 * 2. No Lighthouse (High Speed).
 * 3. Handles URL from command line or .env.
 */

require('dotenv').config();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. RESOLVE URL
const args = process.argv.slice(2);
let url = args[0] || process.env.TEST_URL || process.env.URL_AUDIT_URL;

if (!url) {
  console.error('❌ Usage: node test-url.js <URL>');
  process.exit(1);
}

// 2. CLEANUP 'test-results' (The "No PNGs" Mandate)
const artifactsDir = path.join(__dirname, 'test-results');
const dashboardResults = path.join(__dirname, 'reports', 'aura-dashboard', 'test-results.json');

function cleanup() {
  console.log('🧹 Purging old artifacts...');
  if (fs.existsSync(artifactsDir)) {
    fs.rmSync(artifactsDir, { recursive: true, force: true });
  }
  // Delete old results so we don't see "Zombie" data
  if (fs.existsSync(dashboardResults)) {
    fs.unlinkSync(dashboardResults);
  }
  console.log('   ✅ Workspace cleaned.');
}

cleanup();

// 3. EXECUTE PLAYWRIGHT
console.log(`🚀 Auditing: ${url}\n`);
const startTime = Date.now();

const testProcess = spawn('npx', ['playwright', 'test', 'tests/scaled-audit.spec.ts'], {
  env: {
    ...process.env,
    URL_AUDIT_URL: url,
    // Ensure we are in a single-site sniper mode
  },
  stdio: 'inherit',
  shell: true,
});

testProcess.on('close', (code) => {
  console.log('\n📁 Rebuilding Dashboard...');
  
  // Trigger the generator
  const organizeProcess = spawn('node', ['scripts/generate-aggregated-report.js'], {
    shell: true,
    cwd: __dirname,
  });

  organizeProcess.on('close', (orgCode) => {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    console.log(`\n===================================================`);
    console.log(`✅ MISSION COMPLETE | Time: ${duration}s`);
    console.log(`📂 Report: reports/aura-dashboard/index.html`);
    console.log(`===================================================`);
    process.exit(code);
  });
});