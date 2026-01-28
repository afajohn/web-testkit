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
import { mergeTestResults, getPhilippineTimeISOString } from '../utils/report-merger';

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
    
    // Check if running in batch mode (for performance optimizations)
    const isBatchMode = process.env.CI === 'true' || process.env.BATCH_MODE === 'true';
    
    try {
      // Skip verbose navigation logs in batch mode
      if (!isBatchMode) {
        console.log(`\nNavigating to: ${TEST_URL}`);
      }
      await gotoAndWait(page, TEST_URL);
      currentUrl = await getCurrentUrl(page);
      if (!isBatchMode) {
        console.log(`Successfully loaded: ${currentUrl}`);
      }

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

      // Show concise status in batch mode
      if (isBatchMode) {
        // SEO checks status
        process.stdout.write('  SEO checks... ');
        const seoPassed = seoResults.filter(r => r.passed).length;
        const seoTotal = seoResults.length;
        const seoFailed = seoTotal - seoPassed;
        if (seoFailed === 0) {
          console.log('✓ Pass');
        } else {
          console.log(`✗ Failed (${seoFailed}/${seoTotal})`);
        }

        // Broken links status
        process.stdout.write('  Checking Broken Links... ');
        const brokenCount = brokenLinks.filter(link => link.isBroken).length;
        if (brokenCount === 0) {
          console.log('✓ No broken links');
        } else {
          console.log(`✗ ${brokenCount} broken link(s)`);
        }

        // Accessibility status
        process.stdout.write('  Checking Accessibility... ');
        if (accessibilityResults.passed) {
          console.log('✓ Pass');
        } else {
          console.log(`✗ Failed (${accessibilityResults.totalViolations} violation(s))`);
        }

        // GTM status
        process.stdout.write('  Checking GTM... ');
        if (gtmResult.hasGTM) {
          console.log(`✓ Found (${gtmResult.containerId})`);
        } else {
          console.log('✗ Not found');
        }
      } else {
        // Detailed reports when not in batch mode (for debugging)
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
      }

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

    // Log summary (concise in batch mode, detailed otherwise)
    if (isBatchMode) {
      // In batch mode, we already showed status above, just confirm completion
      // The summary line is handled by the batch runner
    } else {
      console.log(`\n✅ JSON Report saved: ${filePath}`);
      console.log(`   Status: ${mergedReport.summary.overallStatus.toUpperCase()} | SEO: ${mergedReport.seo.passedCount}/${mergedReport.seo.totalCount} | Links: ${mergedReport.brokenLinks.brokenCount} | A11y: ${mergedReport.accessibility.passed ? 'PASS' : 'FAIL'} (${mergedReport.accessibility.totalViolations}) | GTM: ${mergedReport.gtm.hasGTM ? '✓' : '✗'}`);
      console.log(`\n${'='.repeat(80)}\n`);
    }

    // Assertions
    const failedSEOChecks = seoResults.filter(r => !r.passed);
    const brokenLinksCount = brokenLinks.filter(link => link.isBroken).length;
    
    // You can adjust these assertions based on your requirements
    // Option 1: Fail if any check fails
    expect(failedSEOChecks.length).toBe(0);
    expect(brokenLinksCount).toBe(0);
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
          
          // Only show this message in batch mode to avoid duplication
          // Playwright will show the test failure output anyway
          if (isBatchMode) {
            // Suppress the duplicate message - Playwright already shows status output
          } else {
            console.error(`\n⚠️  Test failed but detailed report saved: ${filePath}`);
          }
        } else {
          // If we don't have test results, save minimal error report
          const errorReport = {
            url: TEST_URL,
            timestamp: getPhilippineTimeISOString(),
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
      
      // Only print detailed error message in non-batch mode
      // In batch mode, Playwright will print the error anyway, so we skip duplication
      if (!isBatchMode) {
        const errorMessage = formatErrorWithContext(
          TEST_URL,
          'comprehensive audit',
          error
        );
        console.error(errorMessage);
        console.error(`URL before error: ${TEST_URL}`);
        console.error(`URL after error: ${finalUrl}`);
      }
      
      throw error;
    }
  });
});

