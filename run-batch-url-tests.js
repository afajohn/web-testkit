#!/usr/bin/env node

/**
 * Batch URL Test Runner
 * 
 * Runs npm run test:url for each URL in the URLS array
 * 
 * Usage:
 *   node run-batch-url-tests.js
 * 
 * Or modify the URLS array below with your URLs 
 */

const { spawn } = require('child_process');
const path = require('path');

// Array of URLs to test

const URLS = [
  'https://barranquilladating.com/dating/long-distance-relationships-with-colombian-women.html',
  'https://barranquilladating.com/dating/love-advice-best-ways-to-say-sorry.html',
  'https://barranquilladating.com/dating/making-christmas-romantic-with-colombian-woman.html',
  'https://barranquilladating.com/dating/stages-of-courtship-in-Colombia.html',
  'https://barranquilladating.com/dating/types-of-men-colombian-women-approach.html',
  'https://barranquilladating.com/dating/useful-tips-on-dating-a-colombian-woman.html',
  'https://barranquilladating.com/dating/what-to-expect-when-dating-a-latina.html',
  'https://barranquilladating.com/dating/will-colombian-women-tolerate-codependency.html',
  'https://barranquilladating.com/psychology/how-marrying-colombian-women-affects-foreign-men.html',
  'https://barranquilladating.com/psychology/index.html',
  'https://barranquilladating.com/psychology/make-anxiety-vanish-with-colombian-women.html',
  'https://barranquilladating.com/psychology/qualities-of-colombian-women-from-barranquilla.html',
  'https://barranquilladating.com/travel/best-places-to-meet-women-in-barranquilla.html',
  'https://barranquilladating.com/travel/exploring-barranquilla-colombia.html',
  'https://barranquilladating.com/travel/index.html',
  'https://barranquilladating.com/travel/memorable-moments-dating-in-barranquilla.html',
  'https://barranquilladating.com/travel/reasons-to-visit-barranquilla-colombia.html',
  'https://barranquilladating.com/travel/things-to-do-in-colombia-activities.html',
  'https://barranquilladating.com/travel/travel-advice-barranquilla-carnival.html',
  'https://barranquilladating.com/blog/index.html',
  'https://barranquilladating.com/execu/cost.html',
  'https://barranquilladating.com/execu/meet-our-matchmakers.html',
  'https://barranquilladating.com/execu/professional-matchmaker-plan.html',
  'https://barranquilladating.com/execu/the-process.html',
  'https://barranquilladating.com/execu/why-us.html',
  'https://barranquilladating.com/featured-ladies/barranquilla-colombian-women-dating-marriage-foreigners.html',
  'https://barranquilladating.com/featured-ladies/dating-colombian-women-barranquilla-meet-latinas-marriage.html',
];
// Remove duplicates
const uniqueURLs = [...new Set(URLS)];

// Statistics
let totalURLs = uniqueURLs.length;
let completed = 0;
let successful = 0;
let failed = 0;
const errors = [];

/**
 * Run test for a single URL
 */
function runTestForUrl(url, index) {
  return new Promise((resolve) => {
    const testStartTime = Date.now();
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[${index + 1}/${totalURLs}] Testing: ${url}`);
    console.log(`Started at: ${new Date().toLocaleString()}`);
    console.log(`${'='.repeat(80)}\n`);

    // Run Playwright directly with CI mode to prevent HTML server from starting
    // CI mode disables interactive features like serving reports
    const testProcess = spawn('npx', [
      'playwright', 
      'test', 
      'tests/url-audit.spec.ts',
    ], {
      env: {
        ...process.env,
        URL_AUDIT_URL: url,
        // Set CI=true to disable interactive features (like serving HTML reports)
        CI: 'true',
        // Set BATCH_MODE=true to disable retries and verbose logging for faster execution
        BATCH_MODE: 'true',
        // Also set these to ensure no interactive behavior
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',
      },
      stdio: 'inherit',
      shell: true,
      cwd: __dirname,
    });
    
    // Set a timeout to kill the process if it hangs (e.g., if HTML server starts)
    const timeout = setTimeout(() => {
      if (!testProcess.killed) {
        console.log(`\n⚠️  Test process timed out after 5 minutes, killing process...`);
        testProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!testProcess.killed) {
            testProcess.kill('SIGKILL');
          }
        }, 5000);
      }
    }, 5 * 60 * 1000); // 5 minute timeout

    testProcess.on('close', (code) => {
      clearTimeout(timeout); // Clear timeout since process completed
      
      completed++;
      const testDuration = ((Date.now() - testStartTime) / 1000).toFixed(2);
      
      // Run organize script after test completes (non-blocking, don't wait)
      const organizeProcess = spawn('node', ['scripts/organize-html-report.js'], {
        env: {
          ...process.env,
          URL_AUDIT_URL: url,
          TEST_URL: url, 
        },
        shell: true,
        cwd: __dirname,
        stdio: 'pipe',  // Don't inherit to avoid blocking
      });
      
      // Don't wait for organize script, just let it run in background
      organizeProcess.on('close', () => {
        // Silently complete
      });
      
      if (code === 0) {
        successful++;
        console.log(`\n✅ [${index + 1}/${totalURLs}] Successfully tested: ${url} (${testDuration}s)`);
      } else {
        failed++;
        errors.push({ url, code });
        console.log(`\n❌ [${index + 1}/${totalURLs}] Failed testing: ${url} (exit code: ${code}, ${testDuration}s)`);
      }
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Progress: ${completed}/${totalURLs} completed | ${successful} passed | ${failed} failed`);
      console.log(`${'='.repeat(80)}\n`);
      
      resolve(code);
    });

    testProcess.on('error', (error) => {
      completed++;
      failed++;
      errors.push({ url, error: error.message });
      console.error(`\n❌ [${index + 1}/${totalURLs}] Error running test for: ${url}`);
      console.error(`   Error: ${error.message}`);
      resolve(1);
    });
  });
}

/**
 * Run all tests sequentially
 */
async function runAllTests() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`BATCH URL TEST RUNNER`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Total URLs to test: ${totalURLs}`);
  console.log(`Starting at: ${new Date().toLocaleString()}`);
  console.log(`${'='.repeat(80)}\n`);

  const startTime = Date.now();

  // Run tests sequentially (one at a time)
  for (let i = 0; i < uniqueURLs.length; i++) {
    await runTestForUrl(uniqueURLs[i], i);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`BATCH TEST SUMMARY`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Total URLs: ${totalURLs}`);
  console.log(`Completed: ${completed}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${duration} seconds`);
  console.log(`Started: ${new Date(startTime).toLocaleString()}`);
  console.log(`Finished: ${new Date(endTime).toLocaleString()}`);
  console.log(`${'='.repeat(80)}\n`);

  if (errors.length > 0) {
    console.log(`\n❌ FAILED URLS (${errors.length}):\n`);
    errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.url}`);
      if (error.code !== undefined) {
        console.log(`     Exit code: ${error.code}`);
      }
      if (error.error) {
        console.log(`     Error: ${error.error}`);
      }
    });
    console.log('');
  }

  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log(`\n\n⚠️  Batch test interrupted by user`);
  console.log(`   Completed: ${completed}/${totalURLs}`);
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}\n`);
  process.exit(1);
});

// Run the batch tests
if (uniqueURLs.length === 0) {
  console.error('❌ No URLs to test. Please add URLs to the URLS array in run-batch-url-tests.js');
  process.exit(1);
}

runAllTests().catch((error) => {
  console.error('\n❌ Fatal error running batch tests:');
  console.error(error);
  process.exit(1);
});
