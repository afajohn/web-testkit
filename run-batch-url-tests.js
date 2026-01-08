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
  'https://mexicocitydating.com/about-mexico-city-dating.html',
  // 'https://mexicocitydating.com/all-about-mexico-city.html',
  // 'https://mexicocitydating.com/conversation-starters-with-mexican-women.html',
  // 'https://mexicocitydating.com/dating-apps-vs-mexico-city-dating.html',
  // 'https://mexicocitydating.com/dating-culture-mexico.html',
  // 'https://mexicocitydating.com/do-mexican-women-want-to-marry-foreign-men.html',
  // 'https://mexicocitydating.com/find-love-international-matchmaking.html',
  // 'https://mexicocitydating.com/how-to-meet-mexican-women.html',
  // 'https://mexicocitydating.com/index.html',
  // 'https://mexicocitydating.com/love-relationships-mexican-women.html',
  // 'https://mexicocitydating.com/marriage-culture-mexico.html',
  // 'https://mexicocitydating.com/mexico-city-dating-liveshow.html',
  // 'https://mexicocitydating.com/mexico-city-dating-new-profiles.html',
  // 'https://mexicocitydating.com/mexico-city-itinerary-tips.html',
  // 'https://mexicocitydating.com/more-about-mexico-city-dating.html',
  // 'https://mexicocitydating.com/new-single-girls-for-marriage-worldwide.html',
  // 'https://mexicocitydating.com/qualities-of-mexican-women.html',
  // 'https://mexicocitydating.com/reasons-to-visit-mexico-city.html',
  // 'https://mexicocitydating.com/why-date-mexican-women.html',

  'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/american-men-learn-true-expectations-of-latinas.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/americans-spend-less-dating-latinas-in-mexico-city.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/are-mexican-girls-afraid-of-dating-foreigners.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/are-mexican-latinas-easy-to-date.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/are-you-on-her-level-latinas-unfiltered.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/brutal-comparison-mexican-dating-vs-american-dating.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/date-ukrainian-women-in-mexico-city-dating-outside-ukraine.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/do-mexican-girls-marry-for-love.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/dont-be-cheap-right-approach-to-dating-mexican-girls.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/foreigners-focus-on-dating-latinas-in-mexico-city.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/how-anyone-can-date-dozens-of-latinas-in-mexico-city.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/how-foreigners-exceed-dating-expectations-of-mexican-girls.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/how-men-destroy-dates-with-mexican-women.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/hundreds-of-hot-mexican-women-line-up-to-date-foreigners.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/index.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/is-cdmx-safe-for-expats-and-foreigners-dating-mexican-girls.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/latina-dating-bootcamp-foreign-guys-in-mexico-city.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexican-career-women-cant-find-love.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexican-matchmakers-expose-why-latinas-date-foreigners.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexican-matchmakers-go-all-out-to-help-foreign-daters.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexican-matchmakers-simplify-latina-dating-expectations.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexican-women-demand-dating-options-mexico-city-profiles.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexican-women-hate-hesitation-latina-dating-decoded.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexican-women-prefer-foreigners-dating-latinas-in-mexico.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexico-city-knockouts-single-mexican-girls-looking-for-you.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexico-dating-crash-course-how-you-can-date-mexican-women.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mismatched-mexico-dating-mexican-women-without-internet.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mistakes-most-foreigners-make-dating-in-mexico.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/stop-diy-dating-mexican-women-matchmakers-warn-you.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/stunning-mexican-women-demand-foreigners-dating-in-mexico.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/true-risk-of-dating-mexican-women.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/ukrainian-women-in-mexico-want-to-date-you.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/why-mexican-women-reject-so-many-american-men.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/will-mexican-girls-date-guys-30-yrs-older.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/you-should-know-before-dating-mexican-women-in-cdmx.html',

  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/droves-of-latinas-swarm-passport-bros-dating-in-mexico-city.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/index.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/love-in-48-hrs-dating-mexican-women-in-cdmx.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/magic-or-myth-dating-latinas-in-mexico-city.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/mexican-girls-are-not-what-you-think.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/mexican-girls-put-foreigner-in-the-hot-seat.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/passport-bros-hot-take-on-mexico-city-dating.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/ukraine-dating-in-mexico-city-how-it-works.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/where-mexican-girls-approach-you-mexico-city-dating.html',
  'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/youll-never-meet-mexican-women-faster-cdmx-speed-dating.html',

  'https://mexicocitydating.com/mexico-city-dating-tour-videos/tours/epic-dating-event-10-guys-meet-100-mexican-girls-in-cdmx.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/tours/mature-latinas-dating-foreigners-in-mexico-city.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/tours/mexican-women-desire-foreign-men.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/tours/stop-dming-embrace-mexican-latina-speed-dating.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/tours/why-do-foreign-men-date-latinas-in-cdmx.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/tours/anyone-can-date-latinas-in-mexico.html',

  // 'https://mexicocitydating.com/mexico-city-dating-tour-videos/',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-vacations/asian-tour-dates.html',
  // 'https://mexicocitydating.com/mexico-city-dating-tour-vacations/european-tour-dates.html',
  'https://mexicocitydating.com/mexico-city-dating-tour-vacations/mexico-city-dating-tour-schedule.html',

  // 'https://mexicocitydating.com/execu/cost.html',
  'https://mexicocitydating.com/execu/meet-our-matchmakers.html',
  // 'https://mexicocitydating.com/execu/professional-matchmaker-plan.html',
  // 'https://mexicocitydating.com/execu/the-process.html',
  // 'https://mexicocitydating.com/execu/why-us.html',

  'https://mexicocitydating.com/error-404.html'
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

