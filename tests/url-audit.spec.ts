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
  runAccessibilityCheckOnVisibleContent,
  formatAccessibilityReport,
} from '../utils/accessibility';
import { gotoAndWaitForDOMContentLoaded } from '../utils/page-load';
import { formatErrorWithContext, getCurrentUrl } from '../utils/error-handling';
import { formatTestHeader, formatSubsectionHeader } from '../utils/formatting';

/**
 * Dynamic URL audit test
 * URL can be provided via:
 * 1. Environment variable: URL_AUDIT_URL
 * 2. Playwright project use.baseURL
 * 3. Default fallback URL
 */
const TEST_URL = process.env.URL_AUDIT_URL || process.env.TEST_URL || process.env.BASE_URL || 'https://anewbride.com/';

test.describe(`Audit Test for: ${TEST_URL}`, () => {
  test('comprehensive audit - SEO, broken links, and accessibility', async ({ page }) => {
    let currentUrl = TEST_URL;
    
    try {
      console.log(`\nNavigating to: ${TEST_URL}`);
      await gotoAndWaitForDOMContentLoaded(page, TEST_URL);
      currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);

      // Run all checks in parallel for faster execution
      console.log('\nStarting parallel checks...');
      const testStartTime = Date.now();
      const apiRequest = await request.newContext();

      // Wrap each operation with logging
      const seoCheckPromise = (async () => {
        const startTime = Date.now();
        console.log('  [1/3] Starting SEO checks...');
        try {
          const results = await runSEOChecks(page, {
            checkRobots: true, // Include robots meta tag check
            skipPageLoad: true, // Page already loaded
          });
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`  [1/3] ✓ SEO checks completed (${elapsed}s)`);
          return results;
        } catch (error) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.error(`  [1/3] ✗ SEO checks failed (${elapsed}s): ${error}`);
          throw error;
        }
      })();

      const brokenLinksPromise = (async () => {
        const startTime = Date.now();
        console.log('  [2/3] Starting broken links check...');
        try {
          const results = await checkBrokenLinks(page, apiRequest, undefined, 10, true); // Use visible links (default)
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`  [2/3] ✓ Broken links check completed (${elapsed}s)`);
          return results;
        } catch (error) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.error(`  [2/3] ✗ Broken links check failed (${elapsed}s): ${error}`);
          throw error;
        }
      })();

      const accessibilityPromise = (async () => {
        const startTime = Date.now();
        console.log('  [3/3] Starting accessibility check...');
        try {
          const results = await runAccessibilityCheckOnVisibleContent(page, { skipPageLoad: true });
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`  [3/3] ✓ Accessibility check completed (${elapsed}s)`);
          return results;
        } catch (error) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.error(`  [3/3] ✗ Accessibility check failed (${elapsed}s): ${error}`);
          throw error;
        }
      })();

      const [seoResults, brokenLinksResult, accessibilityResults] = await Promise.all([
        seoCheckPromise,
        brokenLinksPromise,
        accessibilityPromise,
      ]);

      const totalElapsed = ((Date.now() - testStartTime) / 1000).toFixed(1);
      console.log(`\n✓ All checks completed (${totalElapsed}s total)\n`);

    // Log all reports
    console.log(formatTestHeader('Comprehensive Audit', TEST_URL));

    console.log(formatSubsectionHeader('SEO CHECK RESULTS'));
    console.log(await formatSEOCheckReport(seoResults, page));

    // Attach SEO screenshots if available
    const seoResultsWithScreenshots = seoResults as any;
    if (seoResultsWithScreenshots.screenshotPaths) {
      if (seoResultsWithScreenshots.screenshotPaths.fullPage) {
        await test.info().attach('SEO Errors - Overview', {
          path: seoResultsWithScreenshots.screenshotPaths.fullPage,
          contentType: 'image/png',
        });
      }
      seoResultsWithScreenshots.screenshotPaths.closeUps.forEach((path: string, index: number) => {
        test.info().attach(`SEO Error #${index + 1}`, {
          path,
          contentType: 'image/png',
        });
      });
    }

    console.log(formatSubsectionHeader('BROKEN LINKS CHECK'));
    console.log(formatBrokenLinksReport(brokenLinksResult.brokenLinks, brokenLinksResult.totalLinks, TEST_URL));

    // Attach broken links screenshots if available
    if (brokenLinksResult.screenshotPaths) {
      if (brokenLinksResult.screenshotPaths.fullPage) {
        await test.info().attach('Broken Links - Overview', {
          path: brokenLinksResult.screenshotPaths.fullPage,
          contentType: 'image/png',
        });
      }
      brokenLinksResult.screenshotPaths.closeUps.forEach((path: string, index: number) => {
        test.info().attach(`Broken Link #${index + 1}`, {
          path,
          contentType: 'image/png',
        });
      });
    }

    console.log(formatSubsectionHeader('ACCESSIBILITY CHECK'));
    console.log(await formatAccessibilityReport(accessibilityResults, TEST_URL));

    // Attach accessibility screenshots if available
    if (accessibilityResults.screenshotPaths) {
      if (accessibilityResults.screenshotPaths.fullPage) {
        await test.info().attach('Accessibility Errors - Overview', {
          path: accessibilityResults.screenshotPaths.fullPage,
          contentType: 'image/png',
        });
      }
      accessibilityResults.screenshotPaths.closeUps.forEach((path: string, index: number) => {
        test.info().attach(`Accessibility Error #${index + 1}`, {
          path,
          contentType: 'image/png',
        });
      });
    }

    // Assertions
    const failedSEOChecks = seoResults.filter(r => !r.passed);
    
    // You can adjust these assertions based on your requirements
    // Option 1: Fail if any check fails
    expect(failedSEOChecks.length).toBe(0);
    expect(brokenLinksResult.brokenLinks.length).toBe(0);
    expect(accessibilityResults.passed).toBe(true);
    
    // Option 2: Log failures but don't fail (comment out assertions above and use this):
    // if (failedSEOChecks.length > 0 || brokenLinksResult.brokenLinks.length > 0 || !accessibilityResults.passed) {
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
      await gotoAndWaitForDOMContentLoaded(page, TEST_URL);
      currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);

      console.log('\nStarting SEO checks...');
      const startTime = Date.now();
      const results = await runSEOChecks(page, {
        skipPageLoad: true, // Page already loaded
        checkRobots: true,
      });
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✓ SEO checks completed (${elapsed}s total)\n`);

    console.log(formatTestHeader('SEO Check', TEST_URL));
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
      await gotoAndWaitForDOMContentLoaded(page, TEST_URL);
      currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);
      
      console.log('\nStarting broken links check...');
      const startTime = Date.now();
      const apiRequest = await request.newContext();
      const { brokenLinks, totalLinks, screenshotPaths } = await checkBrokenLinks(page, apiRequest, undefined, 10, true); // Use visible links (default)
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✓ Broken links check completed (${elapsed}s total)\n`);

    console.log(formatTestHeader('Broken Links Check', TEST_URL));
    console.log(formatBrokenLinksReport(brokenLinks, totalLinks, TEST_URL));

    // Attach broken links screenshots if available
    if (screenshotPaths) {
      if (screenshotPaths.fullPage) {
        await test.info().attach('Broken Links - Overview', {
          path: screenshotPaths.fullPage,
          contentType: 'image/png',
        });
      }
      screenshotPaths.closeUps.forEach((path: string, index: number) => {
        test.info().attach(`Broken Link #${index + 1}`, {
          path,
          contentType: 'image/png',
        });
      });
    }

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
      await gotoAndWaitForDOMContentLoaded(page, TEST_URL);
      currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);

      // Skip page load steps since we already loaded the page
      console.log('\nStarting accessibility check...');
      const startTime = Date.now();
      const scanResults = await runAccessibilityCheckOnVisibleContent(page, { skipPageLoad: true });
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n✓ Accessibility check completed (${elapsed}s total)\n`);

    console.log(formatTestHeader('Accessibility Check', TEST_URL));
    console.log(await formatAccessibilityReport(scanResults, TEST_URL));

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

