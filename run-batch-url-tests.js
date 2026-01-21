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
  "https://bangkok-women.com/travel/thailand-travel-tips-older-men.html",
  "https://bangkok-women.com/travel/thailand-historical-sites.html",
  "https://bangkok-women.com/travel/hotels-bangkok.html",
  "https://bangkok-women.com/travel/what-to-wear-thailand.html",
  "https://bangkok-women.com/travel/national-parks-thailand.html",
  "https://bangkok-women.com/travel/thai-phrases-dating.html",
  "https://bangkok-women.com/travel/thai-visa-guide.html",
  "https://bangkok-women.com/travel/thai-airlines-guide.html",
  "https://bangkok-women.com/travel/planning-trip-to-thailand.html",
  "https://bangkok-women.com/travel/best-thailand-beaches.html",
  "https://bangkok-women.com/travel/must-try-thai-drinks-bangkok-heat.html",
  "https://bangkok-women.com/travel/best-places-propose-thailand.html",
  "https://bangkok-women.com/travel/navigating-cultural-differences-dating-thai-women.html",
  "https://bangkok-women.com/travel/Things-to-do-When-the-Sun-Goes-Down.html",
  "https://bangkok-women.com/travel/where-stay-bangkok-best-neighborhoods-offer.html",
  "https://bangkok-women.com/travel/long-can-us-citizen-stay-thailand.html",
  "https://bangkok-women.com/travel/",
  "https://bangkok-women.com/bangkok-women-videos/tours/find-a-thai-girlfriend-instantly.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/dating-thai-women-bangkok-thailand-solo-trip.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/thai-women-attend-bangkok-dating-event-for-foreign-men.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/building-modern-romance-with-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/thai-women-seek-foreign-men-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/meet-hundreds-of-bangkok-women-at-exclusive-thai-dating-club.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/exclusive-thai-dating-scene-changes-foreign-men.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/bangkok-thailand-singles-vacation-meeting-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/passport-bro-finds-soulmate-in-bangkok-thai-girls-reaction.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/i-dated-200-thai-women-in-bangkok-thailand-travel-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/dating-300-thai-women-in-bangkok-wmaf-couples-interview.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/1st-time-outside-usa-finding-a-thai-girlfriend-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/dating-a-different-thai-girl-every-day-bangkok-matchmaking.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/moving-to-bangkok-for-thai-women-is-it-worth-it.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/american-men-dominate-thai-speed-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/tours/asian-women-discover-the-beauty-of-thailand.html",
  "https://bangkok-women.com/bangkok-women-videos/",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/private-speed-dating-with-thai-women-in-bangkok-nightlife.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/building-modern-romance-with-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/thai-women-attend-bangkok-dating-event-for-foreign-men.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/thai-women-pack-dating-event-to-meet-their-husbands.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/love-with-no-boundaries-thai-women-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/finding-serious-thai-girls-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/exciting-adventures-dating-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/unforgettable-moments-dating-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/thailand-solo-travel-are-bangkok-women-worth-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/dating-dozens-of-thai-women-your-first-days-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/my-first-time-dating-women-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/he-found-his-thai-wife-on-his-2nd-singles-night.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/how-to-get-a-thai-girlfriend-international-dating-tips.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/kiwi-tourist-finds-thai-wife-in-his-first-time-in-thailand.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/how-to-impress-thai-girls-bangkok-solo-travel-tips.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/bangkok-girls-want-to-be-a-tradwife-thai-women-exposed.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/bangkok-is-like-miami-passport-bros-dating-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/dump-western-women-for-thai-girls-passport-bros-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/american-man-blown-away-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/overcoming-bangkok-dating-fears-how-to-find-a-thai-wife.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/can-foreigners-date-sincere-thai-girls-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/midwest-man-dominates-bangkok-dating-scene.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/men-are-flocking-to-bangkok-for-these-reaons.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/foreign-guys-ditch-the-west-to-date-asian-women-in-thailand.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/man-has-more-in-common-with-thai-women-than-americans.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/first-and-last-sincere-asian-girl-finds-love-with-foreigner.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/american-men-are-crushing-bangkoks-dating-scene.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/are-thai-women-really-attracted-to-foreigners.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/americans-overwhelmed-by-thai-girls.html",
  "https://bangkok-women.com/bangkok-women-videos/testimonial/",
  "https://bangkok-women.com/bangkok-women-videos/informational/why-do-independent-thai-women-attend-our-socials.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/the-beautiful-women-of-bangkok-thailand.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/the-endearing-qualities-of-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/how-do-singles-vacation-work.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/things-to-remember-when-it-comes-to-online-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/stunning-thailand-brides.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/travel-guide-fun-things-to-do-in-bangkok-thailand.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/bangkok-from-land-of-smiles-to-land-of-soulmates.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/how-to-date-thai-women-in-thailand-with-less-hassle.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/what-thai-girls-want-in-marriage-interracial-marriages.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/my-solo-tour-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-women-want-foreign-men-as-life-partner.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/what-thai-women-want-for-valentines.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/breaking-your-paradigm-bangkok-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/bangkok-women-how-do-i-meet-the-right-woman.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/international-dating-are-thai-women-into-me.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/bangkok-unsafe-for-foreign-men-to-date.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/approaching-thai-women-as-an-older-man-dating-bangkok-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/places-to-go-on-a-date-dating-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/reaching-out-to-thai-women-after-the-socials-thai-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/how-to-step-out-of-a-date-politely-thai-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/do-thai-women-send-photos-in-letters-thai-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/bangkok-tours-individual-vs-group.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-women-seek-foreign-men.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dating-young-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/meeting-thai-women-f2f.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/bangkok-women-dating-hurdles.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/why-bangkok-women-arent-disingenuous.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/why-bangkok-women-are-worth-it.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-women-how-soon-do-couples-get-engaged.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/how-thai-dating-works.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dating-in-thailand-date-stunning-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/contacting-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/experience-bangkok-thailand-2022-thai-travel-guide.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/challenges-dating-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-dating-the-best-qualities-dating-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/traveling-to-meet-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/are-thai-women-deceitful.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/exposing-lies-about-dating-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-women-never-resist-dating-these-men.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/are-visas-needed-for-marrying-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/how-to-talk-to-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/rapid-bangkok-dating-100-thai-women-in-8-hrs.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/keepthai-women-interested-after-marriage.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/honest-thai-women-pursue-foreigners-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dating-the-right-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/stunning-single-thai-women-want-foreigners.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/ideal-matches-of-thai-women-dating-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/are-thai-girls-in-bangkok-professional-daters.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/do-thai-girls-have-a-problem-with-age-gap-bangkok-dating.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dont-fall-for-the-wrong-thai-girl-bangkok-dating-advice.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-matchmaker-helps-thailand-tourists-find-love.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/i-still-live-with-mom-what-will-thai-girls-think.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/1-weakness-of-international-marriage-thailand-dating-vlog.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/do-thai-girls-fall-in-love-with-guys-on-online-dating-apps.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/will-this-obvious-romance-scam-fool-you-dating-thai-girls.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dont-settle-for-less-than-a-thai-girlfriend.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/40s-thai-women-seek-foreign-men-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/4-exciting-gifts-thai-women-cant-turn-down.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/indecisive-foreigner-couldve-married-thai-wife-5-years-ago.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/is-24-yrs-age-gap-too-big-for-thai-girls.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/28-to-43-yr-old-thai-women-actively-seeking-love.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/should-i-marry-my-thai-girlfriend-in-bangkok-matchmaker-qa.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/too-expensive-to-meet-thai-women-speed-dating-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/age-knows-no-boundaries-in-dating-thai-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/moving-to-bangkok-for-thai-women-is-it-worth-it.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/hat-old-reality-in-dating-thai-girls-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/passport-bro-should-consider-this-in-dating-thai-girls.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-women-in-their-30s-wants-mature-foreigners.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/date-thai-girls-safely-without-any-apps.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/one-flight-away-find-your-thai-girlfriend-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/aggressive-thai-girls-compete-for-your-attention.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dating-thai-girls-safely-at-private-bangkok-event.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/why-foreign-guys-cant-resist-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/no-faith-in-dating-apps-38yo-thai-girl-hires-matchmaker.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/why-serious-thai-girls-avoid-dating-apps.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/how-guys-end-up-dating-in-thailand.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/date-100-thai-girls-in-1-night.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/are-thai-girls-scared-to-date-you.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dont-get-fooled-dating-thai-girls-requires-realism.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/asian-women-candid-confession-to-find-foreign-love.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/huge-risk-men-take-on-thai-dating-apps.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/single-thai-women-over-40-ready-for-love-2025-new-profiles.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-girls-delete-dating-apps-for-international-matchmaking.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-girls-first-time-dating-foreigners.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/easiest-way-to-find-honest-thai-girls.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/top-mistakes-foreign-men-make-on-thai-dates.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/every-thai-girl-wants-this-from-foreigners.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/stop-gambling-on-love-date-serious-asian-women.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dont-unravel-before-you-travel-thai-dating-mindset.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/dating-over-50-bangkok-women-redefine-love.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/thai-dating-secrets-foreigners-must-know.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/american-men-cant-stay-single-in-bangkok.html",
  "https://bangkok-women.com/bangkok-women-videos/informational/marriage-or-motive-thai-girls-dating-foreigners-get-real.html",
  "https://bangkok-women.com/execu/cost.html",
  "https://bangkok-women.com/execu/meet-our-matchmakers.html",
  "https://bangkok-women.com/execu/professional-matchmaker-plan.html",
  "https://bangkok-women.com/execu/the-process.html",
  "https://bangkok-women.com/execu/why-us.html",
  "https://bangkok-women.com/featured-ladies/BW-YT003Profiles.html",
  "https://bangkok-women.com/featured-ladies/BW-YT126.html",
  "https://bangkok-women.com/featured-ladies/BW-YTProfiles05.html",
  "https://bangkok-women.com/featured-ladies/BW-YTProfiles06.html",
  "https://bangkok-women.com/featured-ladies/BW-YTProfiles07.html",
  "https://bangkok-women.com/women-tour/",
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
          // Set BATCH_MODE=true to disable retries and verbose logging for faster execution
          BATCH_MODE: "true",
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
          `\n✅ [${index + 1}/${totalURLs}] Successfully tested: ${url} (${testDuration}s)`,
        );
      } else {
        failed++;
        errors.push({ url, code });
        console.log(
          `\n❌ [${index + 1}/${totalURLs}] Failed testing: ${url} (exit code: ${code}, ${testDuration}s)`,
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
