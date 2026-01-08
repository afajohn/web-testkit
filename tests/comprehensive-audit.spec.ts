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
 * Comprehensive audit test that runs SEO, broken links, accessibility, and GTM checks
 * This is useful for running a full site audit on a single page
 * 
 * Saves detailed JSON report to reports/ folder with merged results from all tests
 */
const BASE_URL = process.env.URL_AUDIT_URL || process.env.BASE_URL || 'https://anewbride.com/';
const REPORTS_DIR = path.join(process.cwd(), 'reports');

test.describe('Comprehensive Site Audit', () => {
  test('full audit of homepage', async ({ page }) => {
    const testUrl = BASE_URL;
    
    // Declare variables outside try block so they're accessible in catch
    let seoResults: any;
    let brokenLinks: any;
    let accessibilityResults: any;
    let gtmResult: any;
    let currentUrl = testUrl;
    
    try {
      console.log(`\nNavigating to: ${testUrl}`);
      await gotoAndWait(page, testUrl);
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
    console.log('\n=== SEO CHECK RESULTS ===');
    console.log(await formatSEOCheckReport(seoResults, page));

    console.log('\n=== BROKEN LINKS CHECK ===');
    console.log(formatBrokenLinksReport(brokenLinks));

    console.log('\n=== ACCESSIBILITY CHECK ===');
    console.log(formatAccessibilityReport(accessibilityResults));

    console.log('\n=== GTM CHECK ===');
    console.log(formatGTMReport(gtmResult));

    // Merge all results into a single report
    const mergedReport = await mergeTestResults(
      currentUrl,
      seoResults,
      brokenLinks,
      accessibilityResults,
      page,
      gtmResult
    );

    // Generate filename from URL and save JSON report
    const relativePath = getFilePathFromUrl(currentUrl, '', 'json');
    const filePath = path.join(REPORTS_DIR, relativePath);
    writeJsonFile(filePath, mergedReport);

    console.log(`\n✅ JSON Report saved: ${filePath}`);
    console.log(`   Overall Status: ${mergedReport.summary.overallStatus.toUpperCase()}`);
    console.log(`   SEO: ${mergedReport.seo.passedCount}/${mergedReport.seo.totalCount} passed`);
    console.log(`   Broken Links: ${mergedReport.brokenLinks.brokenCount} found`);
    console.log(`   Accessibility: ${mergedReport.accessibility.passed ? 'PASSED' : 'FAILED'} (${mergedReport.accessibility.totalViolations} violations)`);
    console.log(`   GTM: ${mergedReport.gtm.hasGTM ? 'FOUND' : 'NOT FOUND'}${mergedReport.gtm.containerId ? ` (${mergedReport.gtm.containerId})` : ''}`);

    // Assertions
    const failedSEOChecks = seoResults.filter(r => !r.passed);
    expect(failedSEOChecks.length).toBe(0);
    expect(brokenLinks.length).toBe(0);
    expect(accessibilityResults.passed).toBe(true);
    expect(gtmResult.hasGTM).toBe(true);
    } catch (error: any) {
      const finalUrl = await getCurrentUrl(page).catch(() => testUrl);
      
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
            url: testUrl,
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
    const testUrl = process.env.TOUR_PAGE_URL || `${BASE_URL}tour/things-to-consider-on-singles-tours.html`;
    
    // Declare variables outside try block so they're accessible in catch
    let seoResults: any;
    let brokenLinks: any;
    let accessibilityResults: any;
    let gtmResult: any;
    let currentUrl = testUrl;
    
    try {
      console.log(`\nNavigating to: ${testUrl}`);
      await gotoAndWait(page, testUrl);
      currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);

      const apiRequest = await request.newContext();

      [seoResults, brokenLinks, accessibilityResults, gtmResult] = await Promise.all([
        runSEOChecks(page, {
          checkRobots: true, // Include robots meta tag check
        }),
        checkBrokenLinks(page, apiRequest),
        runAccessibilityCheck(page),
        checkGTMImplementation(page),
      ]);

    console.log('\n=== SEO CHECK RESULTS ===');
    console.log(await formatSEOCheckReport(seoResults, page));

    console.log('\n=== BROKEN LINKS CHECK ===');
    console.log(formatBrokenLinksReport(brokenLinks));

    console.log('\n=== ACCESSIBILITY CHECK ===');
    console.log(formatAccessibilityReport(accessibilityResults));

    console.log('\n=== GTM CHECK ===');
    console.log(formatGTMReport(gtmResult));

    // Merge all results into a single report
    const mergedReport = await mergeTestResults(
      currentUrl,
      seoResults,
      brokenLinks,
      accessibilityResults,
      page,
      gtmResult
    );

    // Generate filename from URL and save JSON report
    const relativePath = getFilePathFromUrl(currentUrl, '', 'json');
    const filePath = path.join(REPORTS_DIR, relativePath);
    writeJsonFile(filePath, mergedReport);

    console.log(`\n✅ JSON Report saved: ${filePath}`);
    console.log(`   Overall Status: ${mergedReport.summary.overallStatus.toUpperCase()}`);
    console.log(`   SEO: ${mergedReport.seo.passedCount}/${mergedReport.seo.totalCount} passed`);
    console.log(`   Broken Links: ${mergedReport.brokenLinks.brokenCount} found`);
    console.log(`   Accessibility: ${mergedReport.accessibility.passed ? 'PASSED' : 'FAILED'} (${mergedReport.accessibility.totalViolations} violations)`);
    console.log(`   GTM: ${mergedReport.gtm.hasGTM ? 'FOUND' : 'NOT FOUND'}${mergedReport.gtm.containerId ? ` (${mergedReport.gtm.containerId})` : ''}`);

    const failedSEOChecks = seoResults.filter(r => !r.passed);
    expect(failedSEOChecks.length).toBe(0);
    expect(brokenLinks.length).toBe(0);
    expect(accessibilityResults.passed).toBe(true);
    } catch (error: any) {
      const finalUrl = await getCurrentUrl(page).catch(() => testUrl);
      
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
            url: testUrl,
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

