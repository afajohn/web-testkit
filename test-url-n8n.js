#!/usr/bin/env node

/**
 * Test URL Helper Script with n8n Integration
 * Usage: node test-url-n8n.js <URL>
 *    or: npm run test:url:n8n -- <URL>
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getUrlBasedPath } = require('./utils/url-path');

const args = process.argv.slice(2);
const url = args[0];

if (!url) {
  console.error('Usage: node test-url-n8n.js <URL>');
  console.error('   or: npm run test:url:n8n -- <URL>');
  console.error('');
  console.error('Example:');
  console.error('  node test-url-n8n.js https://anewbride.com/tour/things-to-consider-on-singles-tours.html');
  console.error('  npm run test:url:n8n -- https://anewbride.com');
  process.exit(1);
}

// Validate URL format
try {
  new URL(url);
} catch (error) {
  console.error(`Invalid URL: ${url}`);
  process.exit(1);
}

console.log(`Running audit tests for: ${url}\n`);

// Path to test results file based on URL
const resultsDir = getUrlBasedPath(url, 'test-results');
const RESULTS_FILE = path.join(__dirname, resultsDir, 'test-results.json');

/**
 * Wait for test results file to be created
 * Returns true if file exists, false if timeout
 */
function waitForResultsFile(maxWaitMs = 10000) {
  const startTime = Date.now();
  const checkInterval = 100; // Check every 100ms
  
  return new Promise((resolve) => {
    const checkFile = () => {
      if (fs.existsSync(RESULTS_FILE)) {
        // File exists, verify it's not empty
        try {
          const stats = fs.statSync(RESULTS_FILE);
          if (stats.size > 0) {
            resolve(true);
            return;
          }
        } catch (error) {
          // File might be in the process of being written, continue waiting
        }
      }
      
      if (Date.now() - startTime >= maxWaitMs) {
        resolve(false);
        return;
      }
      
      setTimeout(checkFile, checkInterval);
    };
    
    checkFile();
  });
}

/**
 * Send test results to n8n
 * Returns a promise that resolves with exit code
 */
function sendToN8n() {
  return new Promise((resolve) => {
    console.log('\n📤 Sending test results to n8n...\n');
    
    let stdout = '';
    let stderr = '';
    
    const n8nProcess = spawn('node', ['scripts/send-to-n8n.js'], {
      env: {
        ...process.env,
        TEST_URL: url, // Pass URL to send-to-n8n.js
      },
      shell: true,
      cwd: __dirname,
    });

    // Capture stdout and stderr
    n8nProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output); // Also display in real-time
    });

    n8nProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output); // Also display in real-time
    });

    n8nProcess.on('close', (n8nCode) => {
      if (n8nCode !== 0) {
        console.error(`\n${'='.repeat(70)}`);
        console.error(`❌ FAILED TO SEND TEST RESULTS TO N8N`);
        console.error(`${'='.repeat(70)}`);
        console.error(`   Exit Code: ${n8nCode}`);
        console.error(`   Script: scripts/send-to-n8n.js`);
        console.error(`   Webhook URL: ${process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/playwright-results'}`);
        console.error(`   Test URL: ${url}`);
        console.error(`   Results File: ${RESULTS_FILE}`);
        
        // Show all stdout output if available
        if (stdout.trim()) {
          console.error(`\n   Standard Output (stdout):`);
          console.error(`   ${'─'.repeat(66)}`);
          const stdoutLines = stdout.split('\n').filter(line => line.trim().length > 0);
          if (stdoutLines.length > 0) {
            stdoutLines.forEach(line => {
              console.error(`   ${line}`);
            });
          } else {
            console.error(`   (no output)`);
          }
        }
        
        // Show all stderr output if available
        if (stderr.trim()) {
          console.error(`\n   Error Output (stderr):`);
          console.error(`   ${'─'.repeat(66)}`);
          const stderrLines = stderr.split('\n').filter(line => line.trim().length > 0);
          if (stderrLines.length > 0) {
            stderrLines.forEach(line => {
              console.error(`   ${line}`);
            });
          } else {
            console.error(`   (no error output)`);
          }
        }
        
        // If no detailed error message was captured, provide troubleshooting guidance
        if (!stdout.includes('❌') && !stderr.includes('❌') && !stdout.includes('FAILED') && !stderr.includes('FAILED')) {
          console.error(`\n   💡 Troubleshooting:`);
          console.error(`      1. Check the error messages above for details`);
          console.error(`      2. Verify n8n is running: n8n`);
          console.error(`      3. Ensure workflow is ACTIVATED in n8n (green toggle)`);
          console.error(`      4. Check webhook URL and HTTP method configuration`);
          console.error(`      5. Verify test results file exists: ${RESULTS_FILE}`);
          console.error(`      6. Check n8n execution logs for more details`);
        }
        
        console.error(`${'='.repeat(70)}\n`);
        resolve(n8nCode);
      } else {
        // Even on success, log summary if there's useful information
        if (stdout.includes('Successfully sent') || stdout.includes('✅')) {
          // Output already shown, just resolve
        }
        resolve(0);
      }
    });

    n8nProcess.on('error', (error) => {
      console.error(`\n${'='.repeat(70)}`);
      console.error(`❌ ERROR SPAWNING N8N SEND PROCESS`);
      console.error(`${'='.repeat(70)}`);
      console.error(`   Error Type: ${error.name || 'Unknown'}`);
      console.error(`   Error Message: ${error.message}`);
      console.error(`   Script: scripts/send-to-n8n.js`);
      console.error(`\n   💡 Possible Causes:`);
      console.error(`      1. Node.js is not installed or not in PATH`);
      console.error(`      2. scripts/send-to-n8n.js file is missing or corrupted`);
      console.error(`      3. Permission denied to execute the script`);
      console.error(`${'='.repeat(70)}\n`);
      resolve(1);
    });
  });
}

// Run Playwright test with URL
const testProcess = spawn('npx', ['playwright', 'test', 'tests/url-audit.spec.ts'], {
  env: {
    ...process.env,
    URL_AUDIT_URL: url,
  },
  stdio: 'inherit',
  shell: true,
  cwd: __dirname,
});

testProcess.on('close', async (code) => {
  const testExitCode = code;
  
  if (code !== 0) {
    console.log('\n⚠️  Tests completed with errors, but sending results to n8n anyway...');
  }
  
  // Wait for test results file to be created (Playwright JSON reporter writes this)
  console.log('\n⏳ Waiting for test results file to be ready...');
  console.log(`   Expected file: ${RESULTS_FILE}`);
  console.log(`   Full path: ${path.resolve(RESULTS_FILE)}`);
  const fileExists = await waitForResultsFile(10000); // Wait up to 10 seconds
  
  if (!fileExists) {
    console.error(`\n${'='.repeat(70)}`);
    console.error(`❌ TEST RESULTS FILE NOT FOUND AFTER WAITING`);
    console.error(`${'='.repeat(70)}`);
    console.error(`   Expected File: ${RESULTS_FILE}`);
    console.error(`   Full Path: ${path.resolve(RESULTS_FILE)}`);
    console.error(`   Wait Time: 10 seconds`);
    console.error(`\n   🔍 POSSIBLE CAUSES:`);
    console.error(`      1. Tests are still running (file not written yet)`);
    console.error(`      2. Playwright JSON reporter failed to write the file`);
    console.error(`      3. File permissions issue (cannot write to directory)`);
    console.error(`      4. File is in a different location`);
    console.error(`\n   💡 TROUBLESHOOTING:`);
    console.error(`      1. Check if test run completed successfully`);
    console.error(`      2. Verify Playwright config has JSON reporter enabled`);
    console.error(`      3. Check file system permissions`);
    console.error(`      4. Try running tests again to regenerate the file`);
    console.error(`\n   Note: Trying to send anyway (send-to-n8n.js has its own retry logic)...`);
    console.error(`${'='.repeat(70)}\n`);
  } else {
    // File exists, show details
    try {
      const stats = fs.statSync(RESULTS_FILE);
      console.log('✅ Test results file is ready');
      console.log(`   File Size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   Last Modified: ${stats.mtime.toISOString()}`);
    } catch (statError) {
      console.log('✅ Test results file is ready (unable to get file stats)');
    }
  }
  
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

  await new Promise((resolve) => {
    organizeProcess.on('close', (organizeCode) => {
      if (organizeCode !== 0 && organizeStderr.trim()) {
        // If there were errors, show them but don't fail the build
        console.error(`\n⚠️  HTML report organization completed with warnings (exit code: ${organizeCode})`);
        if (organizeStderr.trim()) {
          console.error(`   Error details are shown above.`);
        }
      }
      resolve(organizeCode);
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
      resolve(0);
    });
  });

  // Send results to n8n regardless of test outcome
  const n8nExitCode = await sendToN8n();
  
  // Exit with test exit code (to reflect test results, not n8n status)
  // But if n8n failed critically, we might want to exit with that code
  if (n8nExitCode !== 0 && !fileExists) {
    // If file doesn't exist AND n8n failed, exit with n8n code
    process.exit(n8nExitCode);
  } else {
    // Otherwise, exit with test code to reflect test results
    process.exit(testExitCode);
  }
});

testProcess.on('error', (error) => {
  console.error(`\n❌ Error spawning test process: ${error.message}`);
  process.exit(1);
});

