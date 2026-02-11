import { test, expect, request } from "@playwright/test";
import * as path from "path";
import { runSEOChecks } from "../utils/seo-checks";
import { checkBrokenLinks } from "../utils/broken-links";
import { runAccessibilityCheck } from "../utils/accessibility";
import { checkGTMImplementation } from "../utils/gtm-check";
import { gotoAndWait } from "../utils/page-load";
import { formatErrorWithContext, getCurrentUrl } from "../utils/error-handling";
import { getFilePathFromUrl, writeJsonFile } from "../utils/file-utils";
import {
  mergeTestResults,
  getPhilippineTimeISOString,
} from "../utils/report-merger";

/**
 * Multi-URL Audit Test
 *
 * Tests multiple URLs and saves merged results (SEO, broken links, accessibility)
 * to individual JSON files named after each URL.
 *
 * URLs can be provided via:
 * 1. Environment variable: MULTI_URL_AUDIT_URLS (comma-separated)
 * 2. Hardcoded array in TEST_URLS below
 */

// Default test URLs - modify this array or use environment variable
const DEFAULT_TEST_URLS = [
  "https://russia-ladies.com/about-russia-ladies.html",
  "https://russia-ladies.com/best-russian-matchmakers-marriage-agency.html",
  "https://russia-ladies.com/Craigslist-women-seeking-men-vs-russia-ladies.html",
  "http://russia-ladies.com/culture-traditions-russian-ladies.htm",
  "https://russia-ladies.com/date-russia-ladies.html",
  "https://russia-ladies.com/history-of-russia.html",
  "https://russia-ladies.com/itinerary-for-russia.html",
  "https://russia-ladies.com/marry-younger-russian-ladies.html",
  "https://russia-ladies.com/how-to-meet-single-russian-ladies.html",
  "https://russia-ladies.com/more-single-russian-ladies.htm",
  "https://russia-ladies.com/new-russia-ladies.html",
  "https://russia-ladies.com/new-single-girls-for-marriage-worldwide.html",
  "https://russia-ladies.com/russialadies-liveshow.html",
  "https://russia-ladies.com/russian-brides.html",
  "https://russia-ladies.com/russian-dating-culture.html",
  "https://russia-ladies.com/russian-ladies-in-love.html",
  "https://russia-ladies.com/russian-marriage-culture.html",
  "https://russia-ladies.com/russian-questions-to-ask.html",
  "https://russia-ladies.com/russian-singles.html",
  "https://russia-ladies.com/search-single-foreign-women-worldwide.html",
  "https://russia-ladies.com/sign-up.html",
  "https://russia-ladies.com/why-travel-to-russia.htm",
  "https://russia-ladies.com/women-in-russia-ladies.html",
  "https://russia-ladies.com/error-404.html",
  "https://russia-ladies.com/culture/celebrating-new-years-the-russian-way.html",
  "https://russia-ladies.com/culture/get-your-festive-mode-on-and-celebrate-christmas-in-russia.html",
  "https://russia-ladies.com/culture/historic-roles-of-russian-women.html",
  "https://russia-ladies.com/culture/pre-and-post-soviet-dating-habits-in-russia.html",
  "https://russia-ladies.com/culture/traditional-dishes-to-try-in-russia.html",
  "https://russia-ladies.com/culture/valentines-day-culture-among-russian-women.html",
  "https://russia-ladies.com/culture/",
  "https://russia-ladies.com/blog/",
  "https://russia-ladies.com/dating/",
  "https://russia-ladies.com/dating/5-surefire-ways-to-break-the-ice-on-dating-apps.html",
  "https://russia-ladies.com/dating/best-flowers-to-give-a-russian-woman.html",
  "https://russia-ladies.com/dating/building-relationships-with-independent-russian-women.html",
  "https://russia-ladies.com/dating/building-relationships-with-russian-women.html",
  "https://russia-ladies.com/dating/cultural-differences-dating-russian-women.html",
  "https://russia-ladies.com/dating/dating-a-single-mom-pros-and-cons.html",
  "https://russia-ladies.com/dating/dating-russian-women-how-to-care-for-your-relationship.html",
  "https://russia-ladies.com/dating/dating-russian-women-reasons-to-love-yourself-first.html",
  "https://russia-ladies.com/dating/dating-russian-women-why-masculinity-is-the-way-to-their-hearts.html",
  "https://russia-ladies.com/dating/dating-tips-for-pursuing-divorced-woman.html",
  "https://russia-ladies.com/dating/following-up-a-first-date.html",
  "https://russia-ladies.com/dating/how-to-be-more-attractive-to-russian-women.html",
  "https://russia-ladies.com/dating/how-to-charm-russian-women.html",
  "https://russia-ladies.com/dating/how-to-court-a-russian-woman.html",
  "https://russia-ladies.com/dating/how-to-date-russian-women.html",
  "https://russia-ladies.com/dating/how-to-successfully-flirt-with-russian-women.html",
  "https://russia-ladies.com/dating/important-dates-to-a-russian-woman.html",
  "https://russia-ladies.com/dating/never-do-this-when-dating-russian-women.html",
  "https://russia-ladies.com/dating/never-put-this-on-your-dating-profile.html",
  "https://russia-ladies.com/dating/phrases-to-use-with-russian-women.html",
  "https://russia-ladies.com/dating/rekindle-romance-for-your-partner-this-national-lovers-day.html",
  "https://russia-ladies.com/dating/russian-women-comfortable-conversations.html",
  "https://russia-ladies.com/dating/russian-women-how-to-have-a-successful-first-date.html",
  "https://russia-ladies.com/dating/russian-women-how-to-take-them-out-on-a-romantic-date.html",
  "https://russia-ladies.com/dating/russian-women-know-if-shes-interested.html",
  "https://russia-ladies.com/dating/understanding-russian-dating-etiquettes.html",
  "https://russia-ladies.com/dating/valentine's-day-activities-russian-ladies-like.html",
  "https://russia-ladies.com/dating/what-russian-women-want-you-to-do-during-the-day-of-love.html",
  "https://russia-ladies.com/dating/women-in-russia-facts-about-their-culture.html",
  "https://russia-ladies.com/psychology/date-career-women-in-russia.html",
  "https://russia-ladies.com/psychology/qualities-russian-women-find-attractive.html",
  "https://russia-ladies.com/psychology/red-flags-dating-russian-women.html",
  "https://russia-ladies.com/psychology/russian-women-signs-shes-okay-breaking-up-with-you.html",
  "https://russia-ladies.com/psychology/traits-that-attract-russian-women.html",
  "https://russia-ladies.com/psychology/understanding-love-languages-with-Russian-women.html",
  "https://russia-ladies.com/psychology/ways-to-keep-your-russian-wife-happy.html",
  "https://russia-ladies.com/psychology/what-do-russian-women-find-attractive.html",
  "https://russia-ladies.com/psychology/",
  "https://russia-ladies.com/realities/dating-russian-women-cold-approach.html",
  "https://russia-ladies.com/realities/",
  "https://russia-ladies.com/travel/travel-hacks-for-exploring-russia.html",
  "https://russia-ladies.com/travel/traveling-to-russia-things-you-should-avoid-doing.html",
  "https://russia-ladies.com/travel/",
  "https://russia-ladies.com/russia-ladies-tour-videos/tours/dating-russian-women-changed-life.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/tours/eastern-european-women-date-men-desperation.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/tours/foreign-men-get-upfront-dating-russian-women.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/tours/foreigners-cant-get-enough-russia-date-russian-girls.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/tours/hot-russian-girls-invite-foreign-men-flock-russia.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/tours/matchmakers-lie-eastern-european-women.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/tours/meet-beautiful-russian-girls-online.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/tours/not-date-young-russian-singles.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/tours/russian-women-dating-foreign-men-online.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/tours/russian-women-go-online-dating.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/tours/russian-women-reveal-date-foreign-men.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/tours/young-russian-women-target-date-older-foreign-men.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/",
  "https://russia-ladies.com/russia-ladies-tour-videos/testimonial/3-effective-tips-dating-russian-women.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/testimonial/dating-russian-women-expectations-foreign-men.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/testimonial/foreigners-seek-help-dating-agency.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/testimonial/new-yorker-finds-love-russia-dating-russian-women.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/testimonial/russian-women-claim-foreign-men-one.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/testimonial/russian-women-open-dating-americans.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/testimonial/russian-women-vs-american-women-foreign-men-say.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/testimonial/used-marriage-agency-find-russian-bride.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/testimonial/",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/attracts-russian-women-shocking-revelation.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/avoid-restaurant-scams-dating-russian-women.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/background-check-russian-women-dating.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/celebrating-valentines-day-russian-girls.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/complicated-dating-russian-women-foreign-men.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/cost-translators-dating-russian-girls.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/crazy-moscow-nights-russian-women-dark.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/culture-dictates-russian-women-foreign-dating.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/dated-thousands-single-russian-women-tour.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/dating-donts-russian-girls-dating-tips-men.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/dating-hundreds-hot-russian-women.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/dating-russian-women-age-difference-matters.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/dating-russian-women-online-vs-offline.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/dating-russian-women-without-english.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/foreign-men-deserve-russian-women.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/gorgeous-russian-women-seek-honest-men.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/huge-mistake-men-make-dating-russian-women.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/maintain-ldr-russian-women.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/meeting-russian-girls-moscow-nightlife.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/met-nice-colombian-women.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/moving-abroad-russian-girls-share-insights.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/negative-perception-around-russian-dating.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/perfect-approach-dating-russian-women.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/questions-never-ask-russian-women.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/real-fake-russian-women-online-dating-profiles.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/real-man-russian-girls.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/risks-russian-women-take-marry.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/russian-girls-notice.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/russian-singles-photoshopped.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/russian-women-attracted-foreign-men.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/russian-women-christmas-gifts-love.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/russian-women-cold-distant.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/russian-women-family-oriented.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/russian-women-high-expectations-dating.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/russian-women-impressions-american-men.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/russian-women-like-foreign-men-small-towns.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/russian-women-look-man.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/russian-women-look-men.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/single-russian-women-looking-foreign-men.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/stopped-writing-russian-women-international-dating.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/top-1-expectation-russian-girls-dating-foreign-men.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/will-safe-russia-dating-russian-women.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/win-hearts-russian-women-dating-advice.html",
  "https://russia-ladies.com/russia-ladies-tour-videos/informational/",
  "https://russia-ladies.com/russia-ladies-singles-tour-vacations",
  "https://russia-ladies.com/featured-ladies/RusL-YTProfile02.html",
  "https://russia-ladies.com/featured-ladies/RusL-YTProfiles01.html",
  "https://russia-ladies.com/execu/cost.html",
  "https://russia-ladies.com/execu/meet-our-matchmakers.html",
  "https://russia-ladies.com/execu/professional-matchmaker-plan.html",
  "https://russia-ladies.com/execu/the-process.html",
  "https://russia-ladies.com/execu/why-us.html",
  "https://russia-ladies.com/",
];

// Get URLs from environment variable or use defaults
const TEST_URLS_RAW = process.env.MULTI_URL_AUDIT_URLS
  ? process.env.MULTI_URL_AUDIT_URLS.split(",")
      .map((url) => url.trim())
      .filter((url) => url.length > 0)
  : DEFAULT_TEST_URLS;

// Remove duplicate URLs to avoid duplicate test titles
const TEST_URLS = [...new Set(TEST_URLS_RAW)];

// Output directory for reports
const REPORTS_DIR = path.join(process.cwd(), "reports");

test.describe(`Multi-URL Audit Test (${TEST_URLS.length} URLs)`, () => {
  for (const testUrl of TEST_URLS) {
    test(`audit: ${testUrl}`, async ({ page }) => {
      let currentUrl = testUrl;

      try {
        console.log(`\n${"=".repeat(80)}`);
        console.log(`Starting audit for: ${testUrl}`);
        console.log(`${"=".repeat(80)}`);

        // Navigate to the page
        await gotoAndWait(page, testUrl);
        currentUrl = await getCurrentUrl(page);
        console.log(`Successfully loaded: ${currentUrl}`);

        // Run all checks in parallel for faster execution
        const apiRequest = await request.newContext();

        const [seoResults, brokenLinks, accessibilityResults, gtmResult] =
          await Promise.all([
            runSEOChecks(page, {
              checkRobots: true, // Include robots meta tag check
            }),
            checkBrokenLinks(page, apiRequest),
            runAccessibilityCheck(page),
            checkGTMImplementation(page),
          ]);

        // Merge all results
        const mergedReport = await mergeTestResults(
          currentUrl,
          seoResults,
          brokenLinks,
          accessibilityResults,
          page,
          gtmResult,
        );

        // Generate filename from URL
        const relativePath = getFilePathFromUrl(currentUrl, "", "json");
        const filePath = path.join(REPORTS_DIR, relativePath);

        // Save merged report to file
        writeJsonFile(filePath, mergedReport);

        console.log(`\n✅ Report saved: ${filePath}`);
        console.log(
          `   Overall Status: ${mergedReport.summary.overallStatus.toUpperCase()}`,
        );
        console.log(
          `   SEO: ${mergedReport.seo.passedCount}/${mergedReport.seo.totalCount} passed`,
        );
        console.log(
          `   Broken Links: ${mergedReport.brokenLinks.brokenCount} found`,
        );
        console.log(
          `   Accessibility: ${
            mergedReport.accessibility.passed ? "PASSED" : "FAILED"
          } (${mergedReport.accessibility.totalViolations} violations)`,
        );
        console.log(
          `   GTM: ${mergedReport.gtm.hasGTM ? "FOUND" : "NOT FOUND"}${
            mergedReport.gtm.containerId
              ? ` (${mergedReport.gtm.containerId})`
              : ""
          }`,
        );

        // Optionally, you can assert on the results here
        // Uncomment below to fail test if any check fails:
        // expect(mergedReport.summary.overallStatus).toBe('passed');
      } catch (error: any) {
        const finalUrl = await getCurrentUrl(page);
        const errorMessage = formatErrorWithContext(
          testUrl,
          "multi-url audit",
          error,
        );
        console.error(`\n❌ Error auditing ${testUrl}:`);
        console.error(errorMessage);
        console.error(`URL before error: ${testUrl}`);
        console.error(`URL after error: ${finalUrl}`);

        // Save error report
        const errorReport = {
          url: testUrl,
          timestamp: getPhilippineTimeISOString(),
          error: true,
          errorMessage: error.message,
          errorStack: error.stack,
          finalUrl,
        };
        const relativePath = getFilePathFromUrl(testUrl, "", "json");
        const filePath = path.join(
          REPORTS_DIR,
          `error-${path.basename(relativePath)}`,
        );
        writeJsonFile(filePath, errorReport);

        throw error;
      }
    });
  }
});
