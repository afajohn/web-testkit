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

const { spawn } = require("child_process");
const path = require("path");

// Array of URLs to test

const URLS = [
  "sample.com",
  "example.com",
  "test.com",
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
    console.log(`\n${"=".repeat(80)}`);
    console.log(`[${index + 1}/${totalURLs}] Testing: ${url}`);
    console.log(`Started at: ${new Date().toLocaleString()}`);
    console.log(`${"=".repeat(80)}\n`);

    // Run Playwright directly with CI mode to prevent HTML server from starting
    // CI mode disables interactive features like serving reports
    const testProcess = spawn(
      "npx",
      ["playwright", "test", "tests/url-audit.spec.ts"],
      {
        env: {
          ...process.env,
          URL_AUDIT_URL: url,
          // Set CI=true to disable interactive features (like serving HTML reports)
          CI: "true",
          // Also set these to ensure no interactive behavior
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
        },
        stdio: "inherit",
        shell: true,
        cwd: __dirname,
      },
    );

    // Set a timeout to kill the process if it hangs (e.g., if HTML server starts)
    const timeout = setTimeout(
      () => {
        if (!testProcess.killed) {
          console.log(
            `\n⚠️  Test process timed out after 5 minutes, killing process...`,
          );
          testProcess.kill("SIGTERM");
          setTimeout(() => {
            if (!testProcess.killed) {
              testProcess.kill("SIGKILL");
            }
          }, 5000);
        }
      },
      5 * 60 * 1000,
    ); // 5 minute timeout

    testProcess.on("close", (code) => {
      clearTimeout(timeout); // Clear timeout since process completed

      completed++;
      const testDuration = ((Date.now() - testStartTime) / 1000).toFixed(2);

      // Run organize script after test completes (non-blocking, don't wait)
      const organizeProcess = spawn(
        "node",
        ["scripts/organize-html-report.js"],
        {
          env: {
            ...process.env,
            URL_AUDIT_URL: url,
            TEST_URL: url,
          },
          shell: true,
          cwd: __dirname,
          stdio: "pipe", // Don't inherit to avoid blocking
        },
      );

      // Don't wait for organize script, just let it run in background
      organizeProcess.on("close", () => {
        // Silently complete
      });

      if (code === 0) {
        successful++;
        console.log(
          `\n✅ [${
            index + 1
          }/${totalURLs}] Successfully tested: ${url} (${testDuration}s)`,
        );
      } else {
        failed++;
        errors.push({ url, code });
        console.log(
          `\n❌ [${
            index + 1
          }/${totalURLs}] Failed testing: ${url} (exit code: ${code}, ${testDuration}s)`,
        );
      }

      console.log(`\n${"=".repeat(80)}`);
      console.log(
        `Progress: ${completed}/${totalURLs} completed | ${successful} passed | ${failed} failed`,
      );
      console.log(`${"=".repeat(80)}\n`);

      resolve(code);
    });

    testProcess.on("error", (error) => {
      completed++;
      failed++;
      errors.push({ url, error: error.message });
      console.error(
        `\n❌ [${index + 1}/${totalURLs}] Error running test for: ${url}`,
      );
      console.error(`   Error: ${error.message}`);
      resolve(1);
    });
  });
}

/**
 * Run all tests sequentially
 */
async function runAllTests() {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`BATCH URL TEST RUNNER`);
  console.log(`${"=".repeat(80)}`);
  console.log(`Total URLs to test: ${totalURLs}`);
  console.log(`Starting at: ${new Date().toLocaleString()}`);
  console.log(`${"=".repeat(80)}\n`);

  const startTime = Date.now();

  // Run tests sequentially (one at a time)
  for (let i = 0; i < uniqueURLs.length; i++) {
    await runTestForUrl(uniqueURLs[i], i);
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print summary
  console.log(`\n${"=".repeat(80)}`);
  console.log(`BATCH TEST SUMMARY`);
  console.log(`${"=".repeat(80)}`);
  console.log(`Total URLs: ${totalURLs}`);
  console.log(`Completed: ${completed}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${duration} seconds`);
  console.log(`Started: ${new Date(startTime).toLocaleString()}`);
  console.log(`Finished: ${new Date(endTime).toLocaleString()}`);
  console.log(`${"=".repeat(80)}\n`);

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
    console.log("");
  }

  // Exit with error code if any tests failed
  process.exit(failed > 0 ? 1 : 0);
}

// Handle script interruption
process.on("SIGINT", () => {
  console.log(`\n\n⚠️  Batch test interrupted by user`);
  console.log(`   Completed: ${completed}/${totalURLs}`);
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}\n`);
  process.exit(1);
});

// Run the batch tests
if (uniqueURLs.length === 0) {
  console.error(
    "❌ No URLs to test. Please add URLs to the URLS array in run-batch-url-tests.js",
  );
  process.exit(1);
}

runAllTests().catch((error) => {
  console.error("\n❌ Fatal error running batch tests:");
  console.error(error);
  process.exit(1);
});
