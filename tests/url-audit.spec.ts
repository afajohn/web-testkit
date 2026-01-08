import { test, expect, request } from '@playwright/test';
import * as path from 'path';
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
import {
  checkGTMImplementation,
  formatGTMReport,
} from '../utils/gtm-check';
import { gotoAndWait } from '../utils/page-load';
import { formatErrorWithContext, getCurrentUrl } from '../utils/error-handling';
import { getFilePathFromUrl, writeJsonFile } from '../utils/file-utils';
import { mergeTestResults } from '../utils/report-merger';

/**
 * Dynamic URL audit test
 * URL can be provided via:
 * 1. Environment variable: URL_AUDIT_URL
 * 2. Playwright project use.baseURL
 * 3. Default fallback URL
 * 
 * Saves detailed JSON report to reports/ folder with merged results from all tests
 */
const TEST_URL = process.env.URL_AUDIT_URL || process.env.BASE_URL || 'https://anewbride.com/';
const REPORTS_DIR = path.join(process.cwd(), 'reports');

test.describe(`Audit Test for: ${TEST_URL}`, () => {
  test('comprehensive audit - SEO, broken links, and accessibility', async ({ page }) => {
    // Declare variables outside try block so they're accessible in catch
    let seoResults: any;
    let brokenLinks: any;
    let accessibilityResults: any;
    let gtmResult: any;
    let currentUrl = TEST_URL;
    
    try {
      console.log(`\nNavigating to: ${TEST_URL}`);
      await gotoAndWait(page, TEST_URL);
      currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);

      // Run all checks in parallel for faster execution
      const apiRequest = await request.newContext();

      [seoResults, brokenLinks, accessibilityResults, gtmResult] = await Promise.all([
        runSEOChecks(page, {
          checkRobots: true, // Include robots meta tag check
        }),
        checkBrokenLinks(page, apiRequest),
        runAccessibilityCheck(page),
        checkGTMImplementation(page),
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

    console.log('\n=== GTM CHECK ===');
    console.log(formatGTMReport(gtmResult));

    console.log(`\n${'='.repeat(80)}\n`);

    // Merge all results into a single report
    const mergedReport = await mergeTestResults(
      currentUrl,
      seoResults,
      brokenLinks,
      accessibilityResults,
      page,
      gtmResult
    );

    // Generate file path from URL (includes folder structure) and save JSON report
    const relativePath = getFilePathFromUrl(currentUrl, '', 'json');
    const filePath = path.join(REPORTS_DIR, relativePath);
    writeJsonFile(filePath, mergedReport);

    console.log(`\n✅ JSON Report saved: ${filePath}`);
    console.log(`   Overall Status: ${mergedReport.summary.overallStatus.toUpperCase()}`);
    console.log(`   SEO: ${mergedReport.seo.passedCount}/${mergedReport.seo.totalCount} passed`);
    console.log(`   Broken Links: ${mergedReport.brokenLinks.brokenCount} found`);
    console.log(`   Accessibility: ${mergedReport.accessibility.passed ? 'PASSED' : 'FAILED'} (${mergedReport.accessibility.totalViolations} violations)`);
    console.log(`   GTM: ${mergedReport.gtm.hasGTM ? 'FOUND' : 'NOT FOUND'}${mergedReport.gtm.containerId ? ` (${mergedReport.gtm.containerId})` : ''}`);
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
      const finalUrl = await getCurrentUrl(page).catch(() => TEST_URL);
      
      // Try to save merged report even if assertions failed
      // This ensures we have the full detailed report even when test fails
      try {
        // Check if we have results to merge (might not exist if error occurred before tests)
        if (typeof seoResults !== 'undefined' && typeof brokenLinks !== 'undefined' && typeof accessibilityResults !== 'undefined') {
          const mergedReport = await mergeTestResults(
            finalUrl,
            seoResults,
            brokenLinks,
            accessibilityResults,
            page,
            gtmResult
          );
          
          // Add error information to the report
          const errorReport = {
            ...mergedReport,
            error: true,
            errorMessage: error.message,
            errorStack: error.stack,
            testFailed: true,
          };
          
          const relativePath = getFilePathFromUrl(finalUrl, '', 'json');
          const filePath = path.join(REPORTS_DIR, relativePath);
          writeJsonFile(filePath, errorReport);
          
          console.error(`\n⚠️  Test failed but detailed report saved: ${filePath}`);
        } else {
          // If we don't have test results, save minimal error report
          const errorReport = {
            url: TEST_URL,
            timestamp: new Date().toISOString(),
            error: true,
            errorMessage: error.message,
            errorStack: error.stack,
            finalUrl,
            testFailed: true,
          };
          const relativePath = getFilePathFromUrl(finalUrl, '', 'json');
          // Preserve folder structure, add error- prefix only to filename
          const dirPath = path.dirname(relativePath);
          const fileName = path.basename(relativePath);
          const errorRelativePath = dirPath === '.' 
            ? `error-${fileName}` 
            : path.join(dirPath, `error-${fileName}`);
          const filePath = path.join(REPORTS_DIR, errorRelativePath);
          writeJsonFile(filePath, errorReport);
          console.error(`\n❌ Error report saved: ${filePath}`);
        }
      } catch (saveError) {
        // If saving report fails, at least log the error
        console.error(`\n❌ Failed to save report: ${saveError.message}`);
      }
      
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

