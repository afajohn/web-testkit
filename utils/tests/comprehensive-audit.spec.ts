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
import { formatSubsectionHeader } from '../utils/formatting';

/**
 * Comprehensive audit test that runs SEO, broken links, and accessibility checks
 * This is useful for running a full site audit on a single page
 */
const DEFAULT_TEST_URL = process.env.TEST_URL || process.env.URL_AUDIT_URL || 'https://anewbride.com/';

test.describe('Comprehensive Site Audit', () => {
  test('full audit of homepage', async ({ page }) => {
    const testUrl = DEFAULT_TEST_URL;
    
    try {
      console.log(`\nNavigating to: ${testUrl}`);
      await gotoAndWaitForDOMContentLoaded(page, testUrl);
      const currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);

      // Run all checks in parallel for faster execution
      const apiRequest = await request.newContext();

    const [seoResults, brokenLinksResult, accessibilityResults] = await Promise.all([
      runSEOChecks(page, {
        checkRobots: true, // Include robots meta tag check
        skipPageLoad: true, // Page already loaded
      }),
      checkBrokenLinks(page, apiRequest, undefined, 10, true), // Use visible links (default)
      runAccessibilityCheckOnVisibleContent(page, { skipPageLoad: true }),
    ]);

    // Log all reports
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
    console.log(formatBrokenLinksReport(brokenLinksResult.brokenLinks, brokenLinksResult.totalLinks, testUrl));

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
    console.log(await formatAccessibilityReport(accessibilityResults, testUrl));

    // Attach accessibility screenshots if available
    const accessibilityResultsWithScreenshots = accessibilityResults as any;
    if (accessibilityResultsWithScreenshots.screenshotPaths) {
      if (accessibilityResultsWithScreenshots.screenshotPaths.fullPage) {
        await test.info().attach('Accessibility Errors - Overview', {
          path: accessibilityResultsWithScreenshots.screenshotPaths.fullPage,
          contentType: 'image/png',
        });
      }
      accessibilityResultsWithScreenshots.screenshotPaths.closeUps.forEach((path: string, index: number) => {
        test.info().attach(`Accessibility Error #${index + 1}`, {
          path,
          contentType: 'image/png',
        });
      });
    }

    // Assertions
    const failedSEOChecks = seoResults.filter(r => !r.passed);
    expect(failedSEOChecks.length).toBe(0);
    expect(brokenLinksResult.brokenLinks.length).toBe(0);
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
    // Use base URL from env and append tour path, or use full URL if provided
    const baseUrl = DEFAULT_TEST_URL.replace(/\/$/, ''); // Remove trailing slash
    const testUrl = process.env.TEST_URL_TOUR || `${baseUrl}/tour/things-to-consider-on-singles-tours.html`;
    
    try {
      console.log(`\nNavigating to: ${testUrl}`);
      await gotoAndWaitForDOMContentLoaded(page, testUrl);
      const currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);

    const apiRequest = await request.newContext();

    const [seoResults, brokenLinksResult, accessibilityResults] = await Promise.all([
      runSEOChecks(page, {
        checkRobots: true, // Include robots meta tag check
        skipPageLoad: true, // Page already loaded
      }),
      checkBrokenLinks(page, apiRequest, undefined, 10, true), // Use visible links (default)
      runAccessibilityCheckOnVisibleContent(page, { skipPageLoad: true }),
    ]);

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
    console.log(formatBrokenLinksReport(brokenLinksResult.brokenLinks, brokenLinksResult.totalLinks, testUrl));

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
    console.log(await formatAccessibilityReport(accessibilityResults, testUrl));

    // Attach accessibility screenshots if available
    const accessibilityResultsWithScreenshots = accessibilityResults as any;
    if (accessibilityResultsWithScreenshots.screenshotPaths) {
      if (accessibilityResultsWithScreenshots.screenshotPaths.fullPage) {
        await test.info().attach('Accessibility Errors - Overview', {
          path: accessibilityResultsWithScreenshots.screenshotPaths.fullPage,
          contentType: 'image/png',
        });
      }
      accessibilityResultsWithScreenshots.screenshotPaths.closeUps.forEach((path: string, index: number) => {
        test.info().attach(`Accessibility Error #${index + 1}`, {
          path,
          contentType: 'image/png',
        });
      });
    }

    // Assertions
    const failedSEOChecks = seoResults.filter(r => !r.passed);
    expect(failedSEOChecks.length).toBe(0);
    expect(brokenLinksResult.brokenLinks.length).toBe(0);
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

