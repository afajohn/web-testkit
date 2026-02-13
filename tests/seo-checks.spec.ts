import { test, expect } from '@playwright/test';
import {
  runSEOChecks,
  formatSEOCheckReport,
  checkPageTitle,
  checkMetaDescription,
  checkCanonicalURL,
  checkRobotsMetaTag,
  checkImageAltAttributes,
  checkHeadingStructure,
  checkOpenGraphTags,
} from '../utils/seo-checks';
import { gotoAndWait } from '../utils/page-load';

/**
 * NOTE: This test file is SKIPPED by default. It only runs when explicitly requested
 * via environment variable: RUN_SEO_TESTS=true
 * 
 * Batch URL testing uses url-audit.spec.ts instead, which includes SEO checks.
 */
const BASE_URL = process.env.URL_AUDIT_URL || process.env.BASE_URL || 'https://anewbride.com/';
const shouldRunSEOTests = process.env.RUN_SEO_TESTS === 'true';

test.describe('SEO Checks', () => {
  test('run comprehensive SEO checks on homepage', async ({ page }) => {
    // Skip if not explicitly requested
    test.skip(!shouldRunSEOTests, 'Skipped - set RUN_SEO_TESTS=true to run');
    await gotoAndWait(page, BASE_URL);

    const results = await runSEOChecks(page, {
      checkTitle: true,
      checkMetaDescription: true,
      checkCanonical: true,
      checkRobots: true, // Check robots meta tag for index,follow
      checkImageAlt: true,
      checkHeadings: true,
      checkOpenGraph: false, // Set to true if you want to check Open Graph tags
    });

    // Log the report
    console.log(await formatSEOCheckReport(results, page));

    // Assert all checks passed
    const failedChecks = results.filter(r => !r.passed);
    expect(failedChecks.length).toBe(0);
  });

  test('check page title specifically', async ({ page }) => {
    test.skip(!shouldRunSEOTests, 'Skipped - set RUN_SEO_TESTS=true to run');
    await gotoAndWait(page, BASE_URL);

    const result = await checkPageTitle(page);
    
    console.log(`Title check: ${result.message}`);
    expect(result.passed).toBe(true);
  });

  test('check meta description length', async ({ page }) => {
    test.skip(!shouldRunSEOTests, 'Skipped - set RUN_SEO_TESTS=true to run');
    await gotoAndWait(page, BASE_URL);

    const result = await checkMetaDescription(page, 50, 160);
    
    console.log(`Meta description check: ${result.message}`);
    expect(result.passed).toBe(true);
  });

  test('check canonical URL', async ({ page }) => {
    test.skip(!shouldRunSEOTests, 'Skipped - set RUN_SEO_TESTS=true to run');
    await gotoAndWait(page, BASE_URL);

    const result = await checkCanonicalURL(page);
    
    console.log(`Canonical URL check: ${result.message}`);
    expect(result.passed).toBe(true);
  });

  test('check robots meta tag for index,follow', async ({ page }) => {
    test.skip(!shouldRunSEOTests, 'Skipped - set RUN_SEO_TESTS=true to run');
    await gotoAndWait(page, BASE_URL);

    const result = await checkRobotsMetaTag(page, true, true); // require index and follow
    
    console.log(`Robots meta tag check: ${result.message}`);
    if (result.value) {
      console.log(`  Robots value: ${result.value}`);
    }
    expect(result.passed).toBe(true);
  });

  test('check all images have alt attributes', async ({ page }) => {
    test.skip(!shouldRunSEOTests, 'Skipped - set RUN_SEO_TESTS=true to run');
    await gotoAndWait(page, BASE_URL);

    const result = await checkImageAltAttributes(page);
    
    console.log(`Image alt check: ${result.message}`);
    expect(result.passed).toBe(true);
  });

  test('check heading structure', async ({ page }) => {
    test.skip(!shouldRunSEOTests, 'Skipped - set RUN_SEO_TESTS=true to run');
    await gotoAndWait(page, BASE_URL);

    const result = await checkHeadingStructure(page);
    
    console.log(`Heading structure check: ${result.message}`);
    expect(result.passed).toBe(true);
  });

  test('run SEO checks on tour page', async ({ page }) => {
    test.skip(!shouldRunSEOTests, 'Skipped - set RUN_SEO_TESTS=true to run');
    const tourPageUrl = process.env.TOUR_PAGE_URL || `${BASE_URL}tour/things-to-consider-on-singles-tours.html`;
    await gotoAndWait(page, tourPageUrl);

    const results = await runSEOChecks(page);

    console.log(await formatSEOCheckReport(results, page));

    const failedChecks = results.filter(r => !r.passed);
    expect(failedChecks.length).toBe(0);
  });
});

