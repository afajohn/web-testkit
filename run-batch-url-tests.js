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
  "https://davaowomen.com/about-davao-women.html",
  "https://davaowomen.com/best-marriage-agency-and-matchmaking-services-in-davao.html",
  "https://davaowomen.com/craigslist-women-seeking-men-vs-davao-women.html",
  "https://davaowomen.com/date-davao-women-seeking-men.html",
  "https://davaowomen.com/davao-brides.html",
  "https://davaowomen.com/davao-dating-culture.html",
  "https://davaowomen.com/davao-history-culture-traditions.html",
  "https://davaowomen.com/davao-marriage-culture.html",
  "https://davaowomen.com/davao-singles.html",
  "https://davaowomen.com/davao-travel-guide.html",
  "https://davaowomen.com/davao-women-questions-to-ask.html",
  "https://davaowomen.com/error-404.html",
  "https://davaowomen.com/how-to-meet-davao-women.html",
  "https://davaowomen.com/index.html",
  "https://davaowomen.com/long-distance-relationship-meeting-first-time-read.html",
  "https://davaowomen.com/meet-davao-girls-dating-true-love.html",
  "https://davaowomen.com/more-single-davao-ladies.html",
  "https://davaowomen.com/new-davao-women.html",
  "https://davaowomen.com/new-single-girls-for-marriage-worldwide.html",
  "https://davaowomen.com/newest-asian-women.html",
  "https://davaowomen.com/open-relationship-bad-idea.html",
  "https://davaowomen.com/live-webcast.html",
  "https://davaowomen.com/sign-up.html",
  "https://davaowomen.com/swiping-right-love-online-dating-worth.html",
  "https://davaowomen.com/visit-davao.html",
  "https://davaowomen.com/why-marry-younger-davao-women.html",
  "https://davaowomen.com/women-in-davao.html",
  "https://davaowomen.com/davao-tour-videos/informational/4-most-effective-advice-for-men-dating-filipinas.html",
  "https://davaowomen.com/davao-tour-videos/informational/19-y-o-filipina-never-had-a-boyfriend.html",
  "https://davaowomen.com/davao-tour-videos/informational/20s-vs-30s-do-dating-demands-of-filipinas-change.html",
  "https://davaowomen.com/davao-tour-videos/informational/24-yr-old-filipina-challenges-foreigners-dating-in-davao.html",
  "https://davaowomen.com/davao-tour-videos/informational/26-yr-old-filipina-s-plea-i-really-want-marriage.html",
  "https://davaowomen.com/davao-tour-videos/informational/30yr-old-filipina-wo-kids-wants-older-man-dating-in-cebu.html",
  "https://davaowomen.com/davao-tour-videos/informational/100-women-youll-encounter-in-the-philippines.html",
  "https://davaowomen.com/davao-tour-videos/informational/african-american-debunks-filipina-dating-myths.html",
  "https://davaowomen.com/davao-tour-videos/informational/ageless-filipinas-shock-men-dating-in-davao.html",
  "https://davaowomen.com/davao-tour-videos/informational/are-davao-filipinas-more-traditional.html",
  "https://davaowomen.com/davao-tour-videos/informational/can-filipino-women-offer-passport-bros-anything.html",
  "https://davaowomen.com/davao-tour-videos/informational/can-there-be-joy-in-dating-a-filipina-pinay-tell-all.html",
  "https://davaowomen.com/davao-tour-videos/informational/christmas-gift-guide-what-do-filipinas-love.html",
  "https://davaowomen.com/davao-tour-videos/informational/cute-pinays-await-in-the-philippines-dating-a-filipina.html",
  "https://davaowomen.com/davao-tour-videos/informational/dating-apps-trump-matchmaking-finding-your-filipina.html",
  "https://davaowomen.com/davao-tour-videos/informational/dating-filipinas-in-davao-real-or-fake.html",
  "https://davaowomen.com/davao-tour-videos/informational/dating-filipinas-is-harana-still-practiced.html",
  "https://davaowomen.com/davao-tour-videos/informational/davao-city-dating-new-stunning-filipina-profiles.html",
  "https://davaowomen.com/davao-tour-videos/informational/davao-dating-where-filipinas-approach-you.html",
  "https://davaowomen.com/davao-tour-videos/informational/davao-difference-are-filipinas-in-davao-more-traditional.html",
  "https://davaowomen.com/davao-tour-videos/informational/davao-filipina-desires-beautiful-family-with-a-foreigner.html",
  "https://davaowomen.com/davao-tour-videos/informational/davao-filipinas-date-different-pool-party-pinays-tell-all.html",
  "https://davaowomen.com/davao-tour-videos/informational/davao-filipinas-dish-on-why-theyre-dating-foreign-guys.html",
  "https://davaowomen.com/davao-tour-videos/informational/davao-filipinas-urge-foreigners-to-visit-paradise.html",
  "https://davaowomen.com/davao-tour-videos/informational/do-filipinas-have-anything-to-offer-foreigners.html",
  "https://davaowomen.com/davao-tour-videos/informational/do-filipino-women-think-socials-as-a-free-night-out.html",
  "https://davaowomen.com/davao-tour-videos/informational/do-it-in-davao.html",
  "https://davaowomen.com/davao-tour-videos/informational/dont-date-filipinas-if.html",
  "https://davaowomen.com/davao-tour-videos/informational/dos-and-donts-of-dating-filipinas-in-their-own-words.html",
  "https://davaowomen.com/davao-tour-videos/informational/droves-of-pinays-await-foreigners-in-davao-dating-filipinas.html",
  "https://davaowomen.com/davao-tour-videos/informational/eager-filipinas-pack-private-speed-dating-social.html",
  "https://davaowomen.com/davao-tour-videos/informational/family-first-filipinas-seek-respectful-foreigner.html",
  "https://davaowomen.com/davao-tour-videos/informational/filipina-knockouts-first-time-dating-foreigners-in-davao.html",
  "https://davaowomen.com/davao-tour-videos/informational/filipina-marketer-wants-to-start-family-with-foreigner.html",
  "https://davaowomen.com/davao-tour-videos/informational/filipina-paradise-davao-women-take-foreigners-to-the-beach.html",
  "https://davaowomen.com/davao-tour-videos/informational/filipinas-dream-of-foreign-men-in-davao.html",
  "https://davaowomen.com/davao-tour-videos/informational/filipinas-from-davao-desire-foreign-men.html",
  "https://davaowomen.com/davao-tour-videos/informational/filipinas-hate-these.html",
  "https://davaowomen.com/davao-tour-videos/informational/filipinas-over-want-real-love-dating-in-davao-city.html",
  "https://davaowomen.com/davao-tour-videos/informational/filipinas-under-25-reveal-shocking-relationship-goals.html",
  "https://davaowomen.com/davao-tour-videos/informational/filipinas-without-kids-seek-love-dating-in-davao-city.html",
  "https://davaowomen.com/davao-tour-videos/informational/foreigners-guide-to-dating-genuine-filipino-women-in-davao.html",
  "https://davaowomen.com/davao-tour-videos/informational/foreigners-outnumbered-at-private-filipina-speed-dating.html",
  "https://davaowomen.com/davao-tour-videos/informational/give-and-take-what-filipinas-dating-foreigners-can-offer.html",
  "https://davaowomen.com/davao-tour-videos/informational/how-to-dress-in-dating-filipinas-in-davao-philippines.html",
  "https://davaowomen.com/davao-tour-videos/informational/huge-concerns-filipinas-share-with-most-foreigners.html",
  "https://davaowomen.com/davao-tour-videos/informational/hundreds-of-filipinas-swarm-20-foreign-guys-speed-dating.html",
  "https://davaowomen.com/davao-tour-videos/informational/i-m-ready-32-yr-old-filipina-wants-to-start-her-family.html",
  "https://davaowomen.com/davao-tour-videos/informational/i-m-using-a-filipina-matchmaker-to-date-foreigners.html",
  "https://davaowomen.com/davao-tour-videos/informational/im-done-dating-unfaithful-guys-filipinas-seek-foreigners.html",
  "https://davaowomen.com/davao-tour-videos/informational/is-it-normal-for-filipinas-to-ask-you-out.html",
  "https://davaowomen.com/davao-tour-videos/informational/make-a-splash-in-davao-how-guys-attract-filipino-girls.html",
  "https://davaowomen.com/davao-tour-videos/informational/making-a-good-impression-on-younger-filipinas.html",
  "https://davaowomen.com/davao-tour-videos/informational/marriage-minded-filipina-breaks-down-davao-dating.html",
  "https://davaowomen.com/davao-tour-videos/informational/one-flaw-zero-filipinas-tolerate-in-any-relationship.html",
  "https://davaowomen.com/davao-tour-videos/informational/one-flight-can-change-your-life-dating-in-the-philippines.html",
  "https://davaowomen.com/davao-tour-videos/informational/pinays-looking-for-a-better-bachelor-dating-in-davao.html",
  "https://davaowomen.com/davao-tour-videos/informational/real-filipinas-offer-real-love-to-foreigners.html",
  "https://davaowomen.com/davao-tour-videos/informational/she-ll-only-date-men-37-to-70-y-o.html",
  "https://davaowomen.com/davao-tour-videos/informational/shy-24-y-o-filipina-wants-older-foreigner.html",
  "https://davaowomen.com/davao-tour-videos/informational/signs-shes-into-you-dating-filipinas.html",
  "https://davaowomen.com/davao-tour-videos/informational/single-filipinas-for-marriage.html",
  "https://davaowomen.com/davao-tour-videos/informational/single-filipinas-want-foreign-men.html",
  "https://davaowomen.com/davao-tour-videos/informational/the-best-single-filipinas-look-for-foreign-men.html",
  "https://davaowomen.com/davao-tour-videos/informational/the-ideal-man-of-filipinas.html",
  "https://davaowomen.com/davao-tour-videos/informational/the-impact-of-serenading-filipinas-dating-culture.html",
  "https://davaowomen.com/davao-tour-videos/informational/toxic-turn-offs-of-real-filipino-girls.html",
  "https://davaowomen.com/davao-tour-videos/informational/traveling-to-the-philippines-in-2021.html",
  "https://davaowomen.com/davao-tour-videos/informational/unmatched-pinays-in-the-philippines-dating-davao-filipinas.html",
  "https://davaowomen.com/davao-tour-videos/informational/wanted-single-filipinas-look-for-foreign-husband.html",
  "https://davaowomen.com/davao-tour-videos/informational/we-re-not-desperate-filipinas-set-the-record-straight.html",
  "https://davaowomen.com/davao-tour-videos/informational/what-are-the-chances-of-introverts-in-dating-filipinas.html",
  "https://davaowomen.com/davao-tour-videos/informational/what-do-you-get-out-of-dating-a-filipina.html",
  "https://davaowomen.com/davao-tour-videos/informational/what-i-really-want-32-yr-old-filipina-tells-all.html",
  "https://davaowomen.com/davao-tour-videos/informational/what-if-i-dont-want-children-dating-filipinas.html",
  "https://davaowomen.com/davao-tour-videos/informational/what-makes-filipino-women-stand-out.html",
  "https://davaowomen.com/davao-tour-videos/informational/why-are-filipinas-well-loved-by-foreigners.html",
  "https://davaowomen.com/davao-tour-videos/informational/why-do-filipinas-love-dating-older-men.html",
  "https://davaowomen.com/davao-tour-videos/informational/why-do-filipinas-love-to-have-many-children.html",
  "https://davaowomen.com/davao-tour-videos/informational/why-filipina-only-wants-a-foreign-man.html",
  "https://davaowomen.com/davao-tour-videos/informational/why-filipinas-look-for-old-foreign-men.html",
  "https://davaowomen.com/davao-tour-videos/informational/why-i-want-an-older-guy-filipinas-hold-nothing-back.html",
  "https://davaowomen.com/davao-tour-videos/informational/why-more-filipinas-are-breaking-with-tradition.html",
  "https://davaowomen.com/davao-tour-videos/informational/why-should-you-meet-davao-filipinas.html",
  "https://davaowomen.com/davao-tour-videos/informational/why-wait-half-a-decade-to-date-filipinas-in-davao.html",
  "https://davaowomen.com/davao-tour-videos/informational/youll-never-date-like-this-outside-the-philippines.html",
  "https://davaowomen.com/davao-tour-videos/informational/your-loyal-lover-why-filipina-foreigner-couples-work.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/are-davao-filipinas-still-traditional-foreign-men-answer.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/are-filipinas-dating-african-americans-in-davao.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/beautiful-philippine-women-date-foreigners-in-davao.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/city-dating-difference-foreigner-finds-filipina-love.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/dating-after-divorce-in-the-philippines.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/dating-filipinas-why-joining-dating-events-is-important.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/divorced-foreigner-date-filipinas-in-davao-philippines.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/fil-am-dream-wedding-dating-filipino-women.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/filipinas-philippines-and-how-much-they-mean-to-men.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/foreign-men-complained-about-dating-filipinas-in-davao.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/foreign-men-date-100-filipinas-in-one-time-at-davao-city.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/foreign-men-want-filipinas-for-higher-fertility-rate.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/how-do-filipinas-for-marriage-meet-foreign-men.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/how-he-found-his-19-y-o-filipina-fiance-online.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/i-met-more-serious-filipinas-in-one-night-than-a-lifetime.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/meeting-potentials-to-be-my-pinay-wife-in-davao-city.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/no-regrets-my-engagement-to-a-filipina-in-davao-city.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/say-no-to-fake-photos-dating-filipinas-in-davao.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/thousands-of-davao-filipinas-want-foreign-men.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/unlimited-options-why-more-foreigners-are-dating-filipinas.html",
  "https://davaowomen.com/davao-tour-videos/testimonial/you-should-have-zero-expectations-dating-filipinas.html",
  "https://davaowomen.com/davao-tour-videos/tours/8k-miles-for-love-filipinas-welcome-men-dating-in-davao.html",
  "https://davaowomen.com/davao-tour-videos/tours/100-filipinas-push-you-to-the-limit-intense-davao-dating.html",
  "https://davaowomen.com/davao-tour-videos/tours/a-room-packed-with-100-filipinas-in-davao-city-philippines.html",
  "https://davaowomen.com/davao-tour-videos/tours/are-filipinas-settling-for-any-foreigner.html",
  "https://davaowomen.com/davao-tour-videos/tours/date-small-town-filipinas-safely.html",
  "https://davaowomen.com/davao-tour-videos/tours/date-the-most-traditional-women-in-the-philippines.html",
  "https://davaowomen.com/davao-tour-videos/tours/davao-citys-hidden-dating-culture-filipino-women.html",
  "https://davaowomen.com/davao-tour-videos/tours/davao-filipinas-are-on-an-adventure-to-paradise-island.html",
  "https://davaowomen.com/davao-tour-videos/tours/davaos-foreigner-dominated-dating-scene.html",
  "https://davaowomen.com/davao-tour-videos/tours/fed-up-foreigners-flee-to-private-filipina-dating-events.html",
  "https://davaowomen.com/davao-tour-videos/tours/filipina-dating-you-ll-never-get-more-attention-in-1-night.html",
  "https://davaowomen.com/davao-tour-videos/tours/filipina-matchmakers-cant-do-it-for-you.html",
  "https://davaowomen.com/davao-tour-videos/tours/filipinas-are-looking-for-you.html",
  "https://davaowomen.com/davao-tour-videos/tours/filipinas-in-davao-city-welcome-foreign-men.html",
  "https://davaowomen.com/davao-tour-videos/tours/filipinas-in-davao-want-more-foreign-men.html",
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
