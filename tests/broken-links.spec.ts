import { test, expect, request } from '@playwright/test';
import {
  checkBrokenLinks,
  formatBrokenLinksReport,
  extractVisibleLinks,
  checkLinks,
  LinkCheckResult,
} from '../utils/broken-links';
import { gotoAndWaitForDOMContentLoaded } from '../utils/page-load';
import { formatTestHeader } from '../utils/formatting';

const DEFAULT_TEST_URL = process.env.TEST_URL || process.env.URL_AUDIT_URL || 'https://anewbride.com/';

test.describe('Broken Link Checking', () => {
  test('check all visible links on homepage', async ({ page }) => {
    await gotoAndWaitForDOMContentLoaded(page, DEFAULT_TEST_URL);
    
    const apiRequest = await request.newContext();
    // Uses extractVisibleLinks by default (useVisibleLinks = true)
    const { brokenLinks, totalLinks, screenshotPaths } = await checkBrokenLinks(page, apiRequest);

    // Log the report
    console.log(formatTestHeader('Broken Links Check', DEFAULT_TEST_URL));
    console.log(formatBrokenLinksReport(brokenLinks, totalLinks, DEFAULT_TEST_URL));

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

    // Assert no broken links (or adjust based on your requirements)
    expect(brokenLinks.length).toBe(0);
  });

  test('check visible links on tour page', async ({ page }) => {
    const baseUrl = DEFAULT_TEST_URL.replace(/\/$/, '');
    const tourUrl = `${baseUrl}/tour/things-to-consider-on-singles-tours.html`;
    await gotoAndWaitForDOMContentLoaded(page, tourUrl);
    
    const apiRequest = await request.newContext();
    const { brokenLinks, totalLinks, screenshotPaths } = await checkBrokenLinks(page, apiRequest);

    console.log(formatTestHeader('Broken Links Check', tourUrl));
    console.log(formatBrokenLinksReport(brokenLinks, totalLinks, DEFAULT_TEST_URL));

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
  });

  test('check visible links with custom concurrency', async ({ page }) => {
    await gotoAndWaitForDOMContentLoaded(page, DEFAULT_TEST_URL);
    
    const apiRequest = await request.newContext();
    // Check links with higher concurrency for faster execution
    const { brokenLinks, totalLinks, screenshotPaths } = await checkBrokenLinks(page, apiRequest, undefined, 20);

    console.log(formatTestHeader('Broken Links Check', DEFAULT_TEST_URL));
    console.log(formatBrokenLinksReport(brokenLinks, totalLinks, DEFAULT_TEST_URL));

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
  });

  test('extract and validate specific visible links', async ({ page }) => {
    await gotoAndWaitForDOMContentLoaded(page, DEFAULT_TEST_URL);
    
    // Use extractVisibleLinks to get all visible links
    const links = await extractVisibleLinks(page);
    console.log(`Found ${links.length} visible links on the page`);

    // Filter for specific link patterns if needed
    const tourLinks = links.filter(link => link.includes('/tour/'));
    console.log(`Found ${tourLinks.length} tour-related visible links`);

    // Check specific links
    const apiRequest = await request.newContext();
    const results = await checkLinks(apiRequest, tourLinks.slice(0, 10)); // Check first 10 tour links

    const broken = results.filter(r => r.isBroken);
    console.log(formatTestHeader('Broken Links Check (Tour Links)', DEFAULT_TEST_URL));
    console.log(formatBrokenLinksReport(broken, tourLinks.slice(0, 10).length));
    
    expect(broken.length).toBe(0);
  });
});

