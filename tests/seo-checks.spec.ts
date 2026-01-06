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
import { gotoAndWaitForDOMContentLoaded } from '../utils/page-load';

const DEFAULT_TEST_URL = process.env.TEST_URL || process.env.URL_AUDIT_URL || 'https://anewbride.com/';

test.describe('SEO Checks', () => {
  test('run comprehensive SEO checks on homepage', async ({ page }) => {
    await gotoAndWaitForDOMContentLoaded(page, DEFAULT_TEST_URL);

    const results = await runSEOChecks(page, {
      checkTitle: true,
      checkMetaDescription: true,
      checkCanonical: true,
      checkRobots: true, // Check robots meta tag for index,follow
      checkImageAlt: true,
      checkHeadings: true,
      checkOpenGraph: false, // Set to true if you want to check Open Graph tags
      skipPageLoad: true, // Page already loaded
    });

    // Log the report
    console.log(await formatSEOCheckReport(results, page));

    // Attach SEO screenshots if available
    const resultsWithScreenshots = results as any;
    if (resultsWithScreenshots.screenshotPaths) {
      if (resultsWithScreenshots.screenshotPaths.fullPage) {
        await test.info().attach('SEO Errors - Overview', {
          path: resultsWithScreenshots.screenshotPaths.fullPage,
          contentType: 'image/png',
        });
      }
      resultsWithScreenshots.screenshotPaths.closeUps.forEach((path: string, index: number) => {
        test.info().attach(`SEO Error #${index + 1}`, {
          path,
          contentType: 'image/png',
        });
      });
    }

    // Assert all checks passed
    const failedChecks = results.filter(r => !r.passed);
    expect(failedChecks.length).toBe(0);
  });

  test('check page title specifically', async ({ page }) => {
    await gotoAndWaitForDOMContentLoaded(page, DEFAULT_TEST_URL);

    const result = await checkPageTitle(page, /ANewBride/i);
    
    console.log(`Title check: ${result.message}`);
    expect(result.passed).toBe(true);
  });

  test('check meta description length', async ({ page }) => {
    await gotoAndWaitForDOMContentLoaded(page, DEFAULT_TEST_URL);

    const result = await checkMetaDescription(page, 50, 160);
    
    console.log(`Meta description check: ${result.message}`);
    expect(result.passed).toBe(true);
  });

  test('check canonical URL', async ({ page }) => {
    await gotoAndWaitForDOMContentLoaded(page, DEFAULT_TEST_URL);

    const result = await checkCanonicalURL(page);
    
    console.log(`Canonical URL check: ${result.message}`);
    expect(result.passed).toBe(true);
  });

  test('check robots meta tag for index,follow', async ({ page }) => {
    await gotoAndWaitForDOMContentLoaded(page, DEFAULT_TEST_URL);

    const result = await checkRobotsMetaTag(page, true, true); // require index and follow
    
    console.log(`Robots meta tag check: ${result.message}`);
    if (result.value) {
      console.log(`  Robots value: ${result.value}`);
    }
    expect(result.passed).toBe(true);
  });

  test('check all visible images have alt attributes', async ({ page }) => {
    await gotoAndWaitForDOMContentLoaded(page, DEFAULT_TEST_URL);

    // checkImageAltAttributes now waits for DOM, scrolls, and checks only visible images by default
    const result = await checkImageAltAttributes(page, false); // Skip DOM wait, page already loaded
    
    console.log(`Image alt check: ${result.message}`);
    expect(result.passed).toBe(true);
  });

  test('check heading structure', async ({ page }) => {
    await gotoAndWaitForDOMContentLoaded(page, DEFAULT_TEST_URL);

    const result = await checkHeadingStructure(page);
    
    console.log(`Heading structure check: ${result.message}`);
    expect(result.passed).toBe(true);
  });

  test('run SEO checks on tour page', async ({ page }) => {
    const baseUrl = DEFAULT_TEST_URL.replace(/\/$/, '');
    const tourUrl = `${baseUrl}/tour/things-to-consider-on-singles-tours.html`;
    await gotoAndWaitForDOMContentLoaded(page, tourUrl);

    const results = await runSEOChecks(page, { skipPageLoad: true });

    console.log(await formatSEOCheckReport(results, page));

    const failedChecks = results.filter(r => !r.passed);
    expect(failedChecks.length).toBe(0);
  });
});

