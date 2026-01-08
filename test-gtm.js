#!/usr/bin/env node

/**
 * GTM Check Helper Script
 * Usage: npm run test:gtm --url=https://example.com
 *    or: node test-gtm.js https://example.com
 */

const { spawn } = require('child_process');

const args = process.argv.slice(2);
const url = args[0];

if (!url) {
  console.error('Usage: node test-gtm.js <URL>');
  console.error('   or: npm run test:gtm <URL>');
  console.error('');
  console.error('Example:');
  console.error('  node test-gtm.js https://anewbride.com');
  console.error('  npm run test:gtm https://anewbride.com');
  process.exit(1);
}

// Validate URL format
try {
  new URL(url);
} catch (error) {
  console.error(`Invalid URL: ${url}`);
  process.exit(1);
}

console.log(`Checking GTM implementation for: ${url}\n`);

// Set environment variable and run Playwright test
const testProcess = spawn('npx', ['playwright', 'test', 'tests/gtm-check.spec.ts'], {
  env: {
    ...process.env,
    URL_AUDIT_URL: url,
  },
  stdio: 'inherit',
  shell: true,
});

testProcess.on('close', (code) => {
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error(`Error running GTM check: ${error.message}`);
  process.exit(1);
});



