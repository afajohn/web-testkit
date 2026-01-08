import { test, expect, request } from '@playwright/test';
import * as path from 'path';
import {
  runSEOChecks,
} from '../utils/seo-checks';
import {
  checkBrokenLinks,
} from '../utils/broken-links';
import {
  runAccessibilityCheck,
} from '../utils/accessibility';
import {
  checkGTMImplementation,
} from '../utils/gtm-check';
import { gotoAndWait } from '../utils/page-load';
import { formatErrorWithContext, getCurrentUrl } from '../utils/error-handling';
import { getFilePathFromUrl, writeJsonFile } from '../utils/file-utils';
import { mergeTestResults } from '../utils/report-merger';

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
    'https://mexicocitydating.com/about-mexico-city-dating.html',
    'https://mexicocitydating.com/all-about-mexico-city.html',
    'https://mexicocitydating.com/conversation-starters-with-mexican-women.html',
    'https://mexicocitydating.com/dating-apps-vs-mexico-city-dating.html',
    'https://mexicocitydating.com/dating-culture-mexico.html',
    'https://mexicocitydating.com/do-mexican-women-want-to-marry-foreign-men.html',
    'https://mexicocitydating.com/find-love-international-matchmaking.html',
    'https://mexicocitydating.com/how-to-meet-mexican-women.html',
    'https://mexicocitydating.com/index.html',
    'https://mexicocitydating.com/love-relationships-mexican-women.html',
    'https://mexicocitydating.com/marriage-culture-mexico.html',
    'https://mexicocitydating.com/mexico-city-dating-liveshow.html',
    'https://mexicocitydating.com/mexico-city-dating-new-profiles.html',
    'https://mexicocitydating.com/mexico-city-itinerary-tips.html',
    'https://mexicocitydating.com/more-about-mexico-city-dating.html',
    'https://mexicocitydating.com/new-single-girls-for-marriage-worldwide.html',
    'https://mexicocitydating.com/qualities-of-mexican-women.html',
    'https://mexicocitydating.com/reasons-to-visit-mexico-city.html',
    'https://mexicocitydating.com/why-date-mexican-women.html',
  
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/american-men-learn-true-expectations-of-latinas.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/americans-spend-less-dating-latinas-in-mexico-city.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/are-mexican-girls-afraid-of-dating-foreigners.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/are-mexican-latinas-easy-to-date.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/are-you-on-her-level-latinas-unfiltered.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/brutal-comparison-mexican-dating-vs-american-dating.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/date-ukrainian-women-in-mexico-city-dating-outside-ukraine.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/do-mexican-girls-marry-for-love.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/dont-be-cheap-right-approach-to-dating-mexican-girls.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/foreigners-focus-on-dating-latinas-in-mexico-city.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/how-anyone-can-date-dozens-of-latinas-in-mexico-city.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/how-foreigners-exceed-dating-expectations-of-mexican-girls.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/how-men-destroy-dates-with-mexican-women.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/hundreds-of-hot-mexican-women-line-up-to-date-foreigners.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/index.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/is-cdmx-safe-for-expats-and-foreigners-dating-mexican-girls.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/latina-dating-bootcamp-foreign-guys-in-mexico-city.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexican-career-women-cant-find-love.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexican-matchmakers-expose-why-latinas-date-foreigners.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexican-matchmakers-go-all-out-to-help-foreign-daters.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexican-matchmakers-simplify-latina-dating-expectations.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexican-women-demand-dating-options-mexico-city-profiles.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexican-women-hate-hesitation-latina-dating-decoded.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexican-women-prefer-foreigners-dating-latinas-in-mexico.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexico-city-knockouts-single-mexican-girls-looking-for-you.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mexico-dating-crash-course-how-you-can-date-mexican-women.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mismatched-mexico-dating-mexican-women-without-internet.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/mistakes-most-foreigners-make-dating-in-mexico.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/stop-diy-dating-mexican-women-matchmakers-warn-you.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/stunning-mexican-women-demand-foreigners-dating-in-mexico.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/true-risk-of-dating-mexican-women.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/ukrainian-women-in-mexico-want-to-date-you.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/why-mexican-women-reject-so-many-american-men.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/will-mexican-girls-date-guys-30-yrs-older.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/informational/you-should-know-before-dating-mexican-women-in-cdmx.html',
  
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/droves-of-latinas-swarm-passport-bros-dating-in-mexico-city.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/index.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/love-in-48-hrs-dating-mexican-women-in-cdmx.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/magic-or-myth-dating-latinas-in-mexico-city.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/mexican-girls-are-not-what-you-think.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/mexican-girls-put-foreigner-in-the-hot-seat.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/passport-bros-hot-take-on-mexico-city-dating.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/ukraine-dating-in-mexico-city-how-it-works.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/where-mexican-girls-approach-you-mexico-city-dating.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/testimonial/youll-never-meet-mexican-women-faster-cdmx-speed-dating.html',
  
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/tours/epic-dating-event-10-guys-meet-100-mexican-girls-in-cdmx.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/tours/mature-latinas-dating-foreigners-in-mexico-city.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/tours/mexican-women-desire-foreign-men.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/tours/stop-dming-embrace-mexican-latina-speed-dating.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/tours/why-do-foreign-men-date-latinas-in-cdmx.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/tours/anyone-can-date-latinas-in-mexico.html',
  
    'https://mexicocitydating.com/mexico-city-dating-tour-videos/',
    'https://mexicocitydating.com/mexico-city-dating-tour-vacations/asian-tour-dates.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-vacations/european-tour-dates.html',
    'https://mexicocitydating.com/mexico-city-dating-tour-vacations/mexico-city-dating-tour-schedule.html',
  
    'https://mexicocitydating.com/execu/cost.html',
    'https://mexicocitydating.com/execu/meet-our-matchmakers.html',
    'https://mexicocitydating.com/execu/professional-matchmaker-plan.html',
    'https://mexicocitydating.com/execu/the-process.html',
    'https://mexicocitydating.com/execu/why-us.html',
  
    'https://mexicocitydating.com/error-404.html'
];

// Get URLs from environment variable or use defaults
const TEST_URLS_RAW = process.env.MULTI_URL_AUDIT_URLS
  ? process.env.MULTI_URL_AUDIT_URLS.split(',').map(url => url.trim()).filter(url => url.length > 0)
  : DEFAULT_TEST_URLS;

// Remove duplicate URLs to avoid duplicate test titles
const TEST_URLS = [...new Set(TEST_URLS_RAW)];

// Output directory for reports
const REPORTS_DIR = path.join(process.cwd(), 'reports');

test.describe(`Multi-URL Audit Test (${TEST_URLS.length} URLs)`, () => {
  for (const testUrl of TEST_URLS) {
    test(`audit: ${testUrl}`, async ({ page }) => {
      let currentUrl = testUrl;
      
      try {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`Starting audit for: ${testUrl}`);
        console.log(`${'='.repeat(80)}`);
        
        // Navigate to the page
        await gotoAndWait(page, testUrl);
        currentUrl = await getCurrentUrl(page);
        console.log(`Successfully loaded: ${currentUrl}`);

        // Run all checks in parallel for faster execution
        const apiRequest = await request.newContext();

        const [seoResults, brokenLinks, accessibilityResults, gtmResult] = await Promise.all([
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
          gtmResult
        );

        // Generate filename from URL
        const relativePath = getFilePathFromUrl(currentUrl, '', 'json');
        const filePath = path.join(REPORTS_DIR, relativePath);

        // Save merged report to file
        writeJsonFile(filePath, mergedReport);

        console.log(`\n✅ Report saved: ${filePath}`);
        console.log(`   Overall Status: ${mergedReport.summary.overallStatus.toUpperCase()}`);
        console.log(`   SEO: ${mergedReport.seo.passedCount}/${mergedReport.seo.totalCount} passed`);
        console.log(`   Broken Links: ${mergedReport.brokenLinks.brokenCount} found`);
        console.log(`   Accessibility: ${mergedReport.accessibility.passed ? 'PASSED' : 'FAILED'} (${mergedReport.accessibility.totalViolations} violations)`);
        console.log(`   GTM: ${mergedReport.gtm.hasGTM ? 'FOUND' : 'NOT FOUND'}${mergedReport.gtm.containerId ? ` (${mergedReport.gtm.containerId})` : ''}`);

        // Optionally, you can assert on the results here
        // Uncomment below to fail test if any check fails:
        // expect(mergedReport.summary.overallStatus).toBe('passed');
        
      } catch (error: any) {
        const finalUrl = await getCurrentUrl(page);
        const errorMessage = formatErrorWithContext(
          testUrl,
          'multi-url audit',
          error
        );
        console.error(`\n❌ Error auditing ${testUrl}:`);
        console.error(errorMessage);
        console.error(`URL before error: ${testUrl}`);
        console.error(`URL after error: ${finalUrl}`);
        
        // Save error report
        const errorReport = {
          url: testUrl,
          timestamp: new Date().toISOString(),
          error: true,
          errorMessage: error.message,
          errorStack: error.stack,
          finalUrl,
        };
        const relativePath = getFilePathFromUrl(testUrl, '', 'json');
        const filePath = path.join(REPORTS_DIR, `error-${path.basename(relativePath)}`);
        writeJsonFile(filePath, errorReport);
        
        throw error;
      }
    });
  }
});
