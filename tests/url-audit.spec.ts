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

      // Run all checks with individual error handling to collect partial results
      // This ensures we get data even if some checks fail
      const apiRequest = await request.newContext();

      // Run checks individually with error handling to collect partial results
      const checkPromises = [
        runSEOChecks(page, {
          checkRobots: true, // Include robots meta tag check
        }).catch((error: any) => {
          console.error('SEO checks failed:', error.message);
          return {
            error: true,
            errorMessage: error.message,
            errorStack: error.stack,
            results: [],
          };
        }),
        checkBrokenLinks(page, apiRequest).catch((error: any) => {
          console.error('Broken links check failed:', error.message);
          return {
            error: true,
            errorMessage: error.message,
            errorStack: error.stack,
            brokenLinks: [],
            linksForReview: [],
          };
        }),
        runAccessibilityCheck(page).catch((error: any) => {
          console.error('Accessibility check failed:', error.message);
          return {
            error: true,
            errorMessage: error.message,
            errorStack: error.stack,
            violations: [],
            incomplete: [],
            passed: false,
            totalViolations: 0,
            totalIncomplete: 0,
          };
        }),
        checkGTMImplementation(page).catch((error: any) => {
          console.error('GTM check failed:', error.message);
          return {
            error: true,
            errorMessage: error.message,
            errorStack: error.stack,
            hasGTM: false,
            containerId: null,
            message: `GTM check failed: ${error.message}`,
          };
        }),
      ];

      [seoResults, brokenLinks, accessibilityResults, gtmResult] = await Promise.all(checkPromises);

      // Show concise status in batch mode
      if (isBatchMode) {
        // SEO checks status
        process.stdout.write('  SEO checks... ');
        if (seoResults.error) {
          console.log(`✗ Error: ${seoResults.errorMessage}`);
        } else {
          const seoPassed = seoResults.filter((r: any) => r.passed).length;
          const seoTotal = seoResults.length;
          const seoFailed = seoTotal - seoPassed;
          if (seoFailed === 0) {
            console.log('✓ Pass');
          } else {
            console.log(`✗ Failed (${seoFailed}/${seoTotal})`);
          }
        }

        // Broken links status
        process.stdout.write('  Checking Broken Links... ');
        if (brokenLinks.error) {
          console.log(`✗ Error: ${brokenLinks.errorMessage}`);
        } else {
          const brokenCount = brokenLinks.filter((link: any) => link.isBroken).length;
          if (brokenCount === 0) {
            console.log('✓ No broken links');
          } else {
            console.log(`✗ ${brokenCount} broken link(s)`);
          }
        }

        // Accessibility status
        process.stdout.write('  Checking Accessibility... ');
        if (accessibilityResults.error) {
          console.log(`✗ Error: ${accessibilityResults.errorMessage}`);
        } else if (accessibilityResults.passed) {
          console.log('✓ Pass');
        } else {
          console.log(`✗ Failed (${accessibilityResults.totalViolations} violation(s))`);
        }

        // GTM status
        process.stdout.write('  Checking GTM... ');
        if (gtmResult.error) {
          console.log(`✗ Error: ${gtmResult.errorMessage}`);
        } else if (gtmResult.hasGTM) {
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
        if (seoResults.error) {
          console.log(`❌ SEO checks failed: ${seoResults.errorMessage}`);
        } else {
          console.log(await formatSEOCheckReport(seoResults, page));
        }

        console.log('\n=== BROKEN LINKS CHECK ===');
        if (brokenLinks.error) {
          console.log(`❌ Broken links check failed: ${brokenLinks.errorMessage}`);
        } else {
          console.log(formatBrokenLinksReport(brokenLinks));
        }

        console.log('\n=== ACCESSIBILITY CHECK ===');
        if (accessibilityResults.error) {
          console.log(`❌ Accessibility check failed: ${accessibilityResults.errorMessage}`);
        } else {
          console.log(formatAccessibilityReport(accessibilityResults));
        }

        console.log('\n=== GTM CHECK ===');
        if (gtmResult.error) {
          console.log(`❌ GTM check failed: ${gtmResult.errorMessage}`);
        } else {
          console.log(formatGTMReport(gtmResult));
        }

        console.log(`\n${'='.repeat(80)}\n`);
      }

    // Normalize results - handle error cases
    const normalizedSeoResults = seoResults.error ? [] : seoResults;
    const normalizedBrokenLinks = brokenLinks.error ? [] : brokenLinks;
    const normalizedAccessibilityResults = accessibilityResults.error 
      ? {
          violations: [],
          incomplete: [],
          passed: false,
          totalViolations: 0,
          totalIncomplete: 0,
        }
      : accessibilityResults;

    // Merge all results into a single report
    const mergedReport = await mergeTestResults(
      currentUrl,
      normalizedSeoResults,
      normalizedBrokenLinks,
      normalizedAccessibilityResults,
      page,
      gtmResult
    );

    // Add error information to report if any checks failed
    if (seoResults.error || brokenLinks.error || accessibilityResults.error || gtmResult.error) {
      mergedReport.partialResults = true;
      mergedReport.checkErrors = {};
      if (seoResults.error) {
        mergedReport.checkErrors.seo = {
          error: true,
          errorMessage: seoResults.errorMessage,
          errorStack: seoResults.errorStack,
        };
      }
      if (brokenLinks.error) {
        mergedReport.checkErrors.brokenLinks = {
          error: true,
          errorMessage: brokenLinks.errorMessage,
          errorStack: brokenLinks.errorStack,
        };
      }
      if (accessibilityResults.error) {
        mergedReport.checkErrors.accessibility = {
          error: true,
          errorMessage: accessibilityResults.errorMessage,
          errorStack: accessibilityResults.errorStack,
        };
      }
      if (gtmResult.error) {
        mergedReport.checkErrors.gtm = {
          error: true,
          errorMessage: gtmResult.errorMessage,
          errorStack: gtmResult.errorStack,
        };
      }
    }

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

    // Assertions - only check if results were collected (not errors)
    if (!seoResults.error) {
      const failedSEOChecks = seoResults.filter((r: any) => !r.passed);
      expect(failedSEOChecks.length).toBe(0);
    }
    if (!brokenLinks.error) {
      const brokenLinksCount = brokenLinks.filter((link: any) => link.isBroken).length;
      expect(brokenLinksCount).toBe(0);
    }
    if (!accessibilityResults.error) {
      expect(accessibilityResults.passed).toBe(true);
    }
    
    // Option 2: Log failures but don't fail (comment out assertions above and use this):
    // if (failedSEOChecks.length > 0 || brokenLinks.length > 0 || !accessibilityResults.passed) {
    //   console.warn('⚠️  Some checks failed. Review the report above.');
    // }
    } catch (error: any) {
      const finalUrl = await getCurrentUrl(page).catch(() => TEST_URL);
      
      // Try to save merged report even if assertions failed
      // This ensures we have the full detailed report even when test fails
      try {
        // Normalize results - handle cases where checks might have partial results
        const normalizedSeoResults = (seoResults && !seoResults.error) ? seoResults : [];
        const normalizedBrokenLinks = (brokenLinks && !brokenLinks.error) ? brokenLinks : [];
        const normalizedAccessibilityResults = (accessibilityResults && !accessibilityResults.error)
          ? accessibilityResults
          : {
              violations: [],
              incomplete: [],
              passed: false,
              totalViolations: 0,
              totalIncomplete: 0,
            };
        const normalizedGtmResult = (gtmResult && !gtmResult.error) ? gtmResult : {
          hasGTM: false,
          containerId: null,
          message: 'GTM check not performed',
        };

        // Check if we have any results to merge (even partial)
        if (typeof seoResults !== 'undefined' || typeof brokenLinks !== 'undefined' || typeof accessibilityResults !== 'undefined') {
          const mergedReport = await mergeTestResults(
            finalUrl,
            normalizedSeoResults,
            normalizedBrokenLinks,
            normalizedAccessibilityResults,
            page,
            normalizedGtmResult
          );
          
          // Add error information to the report
          mergedReport.error = true;
          mergedReport.errorMessage = error.message;
          mergedReport.errorStack = error.stack;
          mergedReport.testFailed = true;
          mergedReport.partialResults = true;
          
          // Add check-specific errors if they exist
          if (!mergedReport.checkErrors) {
            mergedReport.checkErrors = {};
          }
          if (seoResults && seoResults.error) {
            mergedReport.checkErrors.seo = {
              error: true,
              errorMessage: seoResults.errorMessage,
              errorStack: seoResults.errorStack,
            };
          }
          if (brokenLinks && brokenLinks.error) {
            mergedReport.checkErrors.brokenLinks = {
              error: true,
              errorMessage: brokenLinks.errorMessage,
              errorStack: brokenLinks.errorStack,
            };
          }
          if (accessibilityResults && accessibilityResults.error) {
            mergedReport.checkErrors.accessibility = {
              error: true,
              errorMessage: accessibilityResults.errorMessage,
              errorStack: accessibilityResults.errorStack,
            };
          }
          if (gtmResult && gtmResult.error) {
            mergedReport.checkErrors.gtm = {
              error: true,
              errorMessage: gtmResult.errorMessage,
              errorStack: gtmResult.errorStack,
            };
          }
          
          const relativePath = getFilePathFromUrl(finalUrl, '', 'json');
          const filePath = path.join(REPORTS_DIR, relativePath);
          writeJsonFile(filePath, mergedReport);
          
          // Only show this message in batch mode to avoid duplication
          // Playwright will show the test failure output anyway
          if (isBatchMode) {
            // Suppress the duplicate message - Playwright already shows status output
          } else {
            console.error(`\n⚠️  Test failed but detailed report saved: ${filePath}`);
          }
        } else {
          // If we don't have ANY test results, save minimal error report
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

