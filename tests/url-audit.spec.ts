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
 * Dynamic URL audit test
 * URL can be provided via:
 * 1. Environment variable: URL_AUDIT_URL
 * 2. Playwright project use.baseURL
 * 3. Default fallback URL
 */
const TEST_URL = process.env.URL_AUDIT_URL || process.env.BASE_URL || 'https://anewbride.com/';

test.describe(`Audit Test for: ${TEST_URL}`, () => {
  test('comprehensive audit - SEO, broken links, and accessibility', async ({ page }) => {
    let currentUrl = TEST_URL;
    
    try {
      console.log(`\nNavigating to: ${TEST_URL}`);
      await gotoAndWait(page, TEST_URL);
      currentUrl = await getCurrentUrl(page);
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
    console.log(`\n${'='.repeat(80)}`);
    console.log(`AUDIT REPORT FOR: ${TEST_URL}`);
    console.log(`${'='.repeat(80)}\n`);

    console.log('=== SEO CHECK RESULTS ===');
    console.log(await formatSEOCheckReport(seoResults, page));

    console.log('\n=== BROKEN LINKS CHECK ===');
    console.log(formatBrokenLinksReport(brokenLinks));

    console.log('\n=== ACCESSIBILITY CHECK ===');
    console.log(formatAccessibilityReport(accessibilityResults));

    console.log(`\n${'='.repeat(80)}\n`);

    // Assertions
    const failedSEOChecks = seoResults.filter(r => !r.passed);
    
    // You can adjust these assertions based on your requirements
    // Option 1: Fail if any check fails
    expect(failedSEOChecks.length).toBe(0);
    expect(brokenLinks.length).toBe(0);
    expect(accessibilityResults.passed).toBe(true);
    
    // Option 2: Log failures but don't fail (comment out assertions above and use this):
    // if (failedSEOChecks.length > 0 || brokenLinks.length > 0 || !accessibilityResults.passed) {
    //   console.warn('⚠️  Some checks failed. Review the report above.');
    // }
    } catch (error: any) {
      const finalUrl = await getCurrentUrl(page);
      const errorMessage = formatErrorWithContext(
        TEST_URL,
        'comprehensive audit',
        error
      );
      console.error(errorMessage);
      console.error(`URL before error: ${TEST_URL}`);
      console.error(`URL after error: ${finalUrl}`);
      throw error;
    }
  });

  test('SEO checks only', async ({ page }) => {
    let currentUrl = TEST_URL;
    
    try {
      console.log(`\nNavigating to: ${TEST_URL}`);
      await gotoAndWait(page, TEST_URL);
      currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);

      const results = await runSEOChecks(page, {
        checkRobots: true,
      });

    console.log(`\nSEO Check for: ${TEST_URL}`);
    console.log(await formatSEOCheckReport(results, page));

    const failedChecks = results.filter(r => !r.passed);
    expect(failedChecks.length).toBe(0);
    } catch (error: any) {
      const finalUrl = await getCurrentUrl(page);
      const errorMessage = formatErrorWithContext(
        TEST_URL,
        'SEO checks',
        error
      );
      console.error(errorMessage);
      console.error(`URL before error: ${TEST_URL}`);
      console.error(`URL after error: ${finalUrl}`);
      throw error;
    }
  });

  test('broken links check only', async ({ page }) => {
    let currentUrl = TEST_URL;
    
    try {
      console.log(`\nNavigating to: ${TEST_URL}`);
      await gotoAndWait(page, TEST_URL);
      currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);
      
      const apiRequest = await request.newContext();
      const brokenLinks = await checkBrokenLinks(page, apiRequest);

    console.log(`\nBroken Links Check for: ${TEST_URL}`);
    console.log(formatBrokenLinksReport(brokenLinks));

    expect(brokenLinks.length).toBe(0);
    } catch (error: any) {
      const finalUrl = await getCurrentUrl(page);
      const errorMessage = formatErrorWithContext(
        TEST_URL,
        'broken links check',
        error
      );
      console.error(errorMessage);
      console.error(`URL before error: ${TEST_URL}`);
      console.error(`URL after error: ${finalUrl}`);
      throw error;
    }
  });

  test('accessibility check only', async ({ page }) => {
    let currentUrl = TEST_URL;
    
    try {
      console.log(`\nNavigating to: ${TEST_URL}`);
      await gotoAndWait(page, TEST_URL);
      currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);

      const scanResults = await runAccessibilityCheck(page);

    console.log(`\nAccessibility Check for: ${TEST_URL}`);
    console.log(formatAccessibilityReport(scanResults));

    expect(scanResults.passed).toBe(true);
    } catch (error: any) {
      const finalUrl = await getCurrentUrl(page);
      const errorMessage = formatErrorWithContext(
        TEST_URL,
        'accessibility check',
        error
      );
      console.error(errorMessage);
      console.error(`URL before error: ${TEST_URL}`);
      console.error(`URL after error: ${finalUrl}`);
      throw error;
    }
  });
});

