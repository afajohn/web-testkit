import { test, expect, request } from '@playwright/test';
import {
  runSEOChecks,
  formatSEOCheckReport,
} from '../utils/seo-checks';
import {
  checkBrokenLinks,
  formatBrokenLinksReport,
} from '../utils/broken-links';
import {
  runAccessibilityCheck,
  formatAccessibilityReport,
} from '../utils/accessibility';
import { gotoAndWait } from '../utils/page-load';
import { formatErrorWithContext, getCurrentUrl } from '../utils/error-handling';

/**
 * Comprehensive audit test that runs SEO, broken links, and accessibility checks
 * This is useful for running a full site audit on a single page
 */
test.describe('Comprehensive Site Audit', () => {
  test('full audit of homepage', async ({ page }) => {
    const testUrl = 'https://anewbride.com/';
    
    try {
      console.log(`\nNavigating to: ${testUrl}`);
      await gotoAndWait(page, testUrl);
      const currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);

      // Run all checks in parallel for faster execution
      const apiRequest = await request.newContext();

    const [seoResults, brokenLinks, accessibilityResults] = await Promise.all([
      runSEOChecks(page, {
        checkRobots: true, // Include robots meta tag check
      }),
      checkBrokenLinks(page, apiRequest),
      runAccessibilityCheck(page),
    ]);

    // Log all reports
    console.log('\n=== SEO CHECK RESULTS ===');
    console.log(await formatSEOCheckReport(seoResults, page));

    console.log('\n=== BROKEN LINKS CHECK ===');
    console.log(formatBrokenLinksReport(brokenLinks));

    console.log('\n=== ACCESSIBILITY CHECK ===');
    console.log(formatAccessibilityReport(accessibilityResults));

    // Assertions
    const failedSEOChecks = seoResults.filter(r => !r.passed);
    expect(failedSEOChecks.length).toBe(0);
    expect(brokenLinks.length).toBe(0);
    expect(accessibilityResults.passed).toBe(true);
    } catch (error: any) {
      const finalUrl = await getCurrentUrl(page);
      const errorMessage = formatErrorWithContext(
        testUrl,
        'full audit of homepage',
        error
      );
      console.error(errorMessage);
      console.error(`URL before error: ${testUrl}`);
      console.error(`URL after error: ${finalUrl}`);
      throw error;
    }
  });

  test('full audit of tour page', async ({ page }) => {
    const testUrl = 'https://anewbride.com/tour/things-to-consider-on-singles-tours.html';
    
    try {
      console.log(`\nNavigating to: ${testUrl}`);
      await gotoAndWait(page, testUrl);
      const currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);

    const apiRequest = await request.newContext();

    const [seoResults, brokenLinks, accessibilityResults] = await Promise.all([
      runSEOChecks(page, {
        checkRobots: true, // Include robots meta tag check
      }),
      checkBrokenLinks(page, apiRequest),
      runAccessibilityCheck(page),
    ]);

    console.log('\n=== SEO CHECK RESULTS ===');
    console.log(await formatSEOCheckReport(seoResults, page));

    console.log('\n=== BROKEN LINKS CHECK ===');
    console.log(formatBrokenLinksReport(brokenLinks));

    console.log('\n=== ACCESSIBILITY CHECK ===');
    console.log(formatAccessibilityReport(accessibilityResults));

    const failedSEOChecks = seoResults.filter(r => !r.passed);
    expect(failedSEOChecks.length).toBe(0);
    expect(brokenLinks.length).toBe(0);
    expect(accessibilityResults.passed).toBe(true);
    } catch (error: any) {
      const finalUrl = await getCurrentUrl(page);
      const errorMessage = formatErrorWithContext(
        testUrl,
        'full audit of tour page',
        error
      );
      console.error(errorMessage);
      console.error(`URL before error: ${testUrl}`);
      console.error(`URL after error: ${finalUrl}`);
      throw error;
    }
  });
});

