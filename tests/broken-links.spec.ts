import { test, expect, request } from '@playwright/test';
import {
  checkBrokenLinks,
  formatBrokenLinksReport,
  extractLinks,
  checkLinks,
  LinkCheckResult,
} from '../utils/broken-links';
import { gotoAndWait } from '../utils/page-load';

const BASE_URL = process.env.URL_AUDIT_URL || process.env.BASE_URL || 'https://anewbride.com/';

test.describe('Broken Link Checking', () => {
  test('check all links on homepage', async ({ page }) => {
    await gotoAndWait(page, BASE_URL);
    
    const apiRequest = await request.newContext();
    const brokenLinks = await checkBrokenLinks(page, apiRequest);

    // Log the report
    console.log(formatBrokenLinksReport(brokenLinks));

    // Assert no broken links (or adjust based on your requirements)
    expect(brokenLinks.length).toBe(0);
  });

  test('check links on tour page', async ({ page }) => {
    const tourPageUrl = process.env.TOUR_PAGE_URL || `${BASE_URL}tour/things-to-consider-on-singles-tours.html`;
    await gotoAndWait(page, tourPageUrl);
    
    const apiRequest = await request.newContext();
    const brokenLinks = await checkBrokenLinks(page, apiRequest);

    console.log(formatBrokenLinksReport(brokenLinks));
    expect(brokenLinks.length).toBe(0);
  });

  test('check links with custom concurrency', async ({ page }) => {
    await gotoAndWait(page, BASE_URL);
    
    const apiRequest = await request.newContext();
    // Check links with higher concurrency for faster execution
    const brokenLinks = await checkBrokenLinks(page, apiRequest, undefined, 20);

    console.log(formatBrokenLinksReport(brokenLinks));
    expect(brokenLinks.length).toBe(0);
  });

  test('extract and validate specific links', async ({ page }) => {
    await gotoAndWait(page, BASE_URL);
    
    const links = await extractLinks(page);
    console.log(`Found ${links.length} links on the page`);

    // Filter for specific link patterns if needed
    const tourLinks = links.filter(link => link.includes('/tour/'));
    console.log(`Found ${tourLinks.length} tour-related links`);

    // Check specific links
    const apiRequest = await request.newContext();
    const results = await checkLinks(apiRequest, tourLinks.slice(0, 10)); // Check first 10 tour links

    const broken = results.filter(r => r.isBroken);
    console.log(formatBrokenLinksReport(broken));
    
    expect(broken.length).toBe(0);
  });
});

