#!/usr/bin/env node

/**
 * Test URL Helper Script
 * Usage: npm run test:url --url=https://example.com
 *    or: node test-url.js https://example.com
 */

require('dotenv').config();
const { spawn } = require('child_process');

const args = process.argv.slice(2);
let url = args[0];

// If no URL provided, try to use from .env file
if (!url) {
  url = process.env.TEST_URL || process.env.URL_AUDIT_URL;
  if (url) {
    console.log(`Using URL from .env: ${url}\n`);
  } else {
    console.error('Usage: node test-url.js <URL>');
    console.error('   or: npm run test:url --url=<URL>');
    console.error('   or: Set TEST_URL in .env file');
    console.error('');
    console.error('Example:');
    console.error('  node test-url.js https://anewbride.com/tour/things-to-consider-on-singles-tours.html');
    console.error('  npm run test:url --url=https://anewbride.com');
    console.error('  Or set TEST_URL=https://example.com in .env file');
    process.exit(1);
  }
}

// Validate URL format
try {
  new URL(url);
} catch (error) {
  console.error(`Invalid URL: ${url}`);
  process.exit(1);
}

console.log(`Running audit tests for: ${url}\n`);

// Set environment variable and run Playwright test
const testProcess = spawn('npx', ['playwright', 'test', 'tests/url-audit.spec.ts'], {
  env: {
    ...process.env,
    URL_AUDIT_URL: url,
  },
  stdio: 'inherit',
  shell: true,
});

testProcess.on('close', (code) => {
  // Organize HTML report to URL-based directory
  console.log('\n📁 Organizing HTML report...');
  console.log(`   URL: ${url}`);
  
  let organizeStdout = '';
  let organizeStderr = '';
  
  const organizeProcess = spawn('node', ['scripts/organize-html-report.js'], {
    env: {
      ...process.env,
      URL_AUDIT_URL: url,
      TEST_URL: url,
    },
    shell: true,
    cwd: __dirname,
  });

  // Capture organize script output for detailed logging
  organizeProcess.stdout.on('data', (data) => {
    const output = data.toString();
    organizeStdout += output;
    process.stdout.write(output); // Display in real-time
  });

  organizeProcess.stderr.on('data', (data) => {
    const output = data.toString();
    organizeStderr += output;
    process.stderr.write(output); // Display in real-time
  });

  organizeProcess.on('close', (organizeCode) => {
    if (organizeCode !== 0) {
      // If there were errors, show them but don't fail the build
      console.error(`\n⚠️  HTML report organization completed with warnings (exit code: ${organizeCode})`);
      if (organizeStderr.trim()) {
        console.error(`   Error details are shown above.`);
        // Show summary if stderr contains useful information
        const errorSummary = organizeStderr.split('\n').filter(line => 
          line.includes('Error') || line.includes('❌') || line.includes('ERROR')
        ).slice(0, 5);
        if (errorSummary.length > 0) {
          console.error(`   Key error messages:`);
          errorSummary.forEach(line => {
            console.error(`     - ${line.trim()}`);
          });
        }
      }
    }
    process.exit(code);
  });
  
  organizeProcess.on('error', (error) => {
    console.error(`\n${'='.repeat(70)}`);
    console.error(`❌ ERROR SPAWNING HTML REPORT ORGANIZATION PROCESS`);
    console.error(`${'='.repeat(70)}`);
    console.error(`   Error Type: ${error.name || 'Unknown'}`);
    console.error(`   Error Message: ${error.message}`);
    console.error(`   Script: scripts/organize-html-report.js`);
    console.error(`   URL: ${url}`);
    console.error(`\n   💡 Possible Causes:`);
    console.error(`      1. Node.js is not installed or not in PATH`);
    console.error(`      2. scripts/organize-html-report.js file is missing or corrupted`);
    console.error(`      3. Permission denied to execute the script`);
    console.error(`\n   Note: This error will not fail the test run.`);
    console.error(`${'='.repeat(70)}\n`);
    // Ignore errors, don't fail the build
    process.exit(code);
  });
});

