#!/usr/bin/env node

/**
 * Test runner that accepts URL as argument
 * Usage: npm test -- https://example.com
 *    or: npm test (runs all tests)
 */

const { spawn } = require('child_process');

// Get arguments after '--' (npm passes them as additional process.argv entries)
const args = process.argv.slice(2);
const urlArg = args.find(arg => arg.startsWith('http://') || arg.startsWith('https://'));

if (urlArg) {
  // If URL is provided, run only the URL audit test
  console.log(`Running audit tests for: ${urlArg}\n`);
  
  const testProcess = spawn('npx', ['playwright', 'test', 'tests/url-audit.spec.ts'], {
    env: {
      ...process.env,
      URL_AUDIT_URL: urlArg,
    },
    stdio: 'inherit',
    shell: true,
  });

  testProcess.on('close', (code) => {
    process.exit(code);
  });
} else {
  // No URL provided, run all tests
  const testProcess = spawn('npx', ['playwright', 'test'], {
    stdio: 'inherit',
    shell: true,
  });

  testProcess.on('close', (code) => {
    process.exit(code);
  });
}

