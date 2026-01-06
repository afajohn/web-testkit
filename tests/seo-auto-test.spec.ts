import { test, expect } from './support/seo.auto';
import { gotoAndWaitForDOMContentLoaded } from '../utils/page-load';

const DEFAULT_TEST_URL = process.env.TEST_URL || process.env.URL_AUDIT_URL || 'https://anewbride.com/';

/**
 * Test file to verify automatic SEO audits work with playwright-seo
 * This test uses the seo.auto fixture which automatically runs SEO audits after each test
 */
test.describe('Automatic SEO Audits', () => {
  test('homepage with automatic SEO audit', async ({ page }) => {
    await gotoAndWaitForDOMContentLoaded(page, DEFAULT_TEST_URL);
    
    // Just navigate - SEO audit runs automatically after this test
    // Note: SEO audit will check meta description length and other rules
    await expect(page).toHaveTitle(/Foreign Women|New Bride/i);
  });

  test('tour page with automatic SEO audit', async ({ page }) => {
    const baseUrl = DEFAULT_TEST_URL.replace(/\/$/, '');
    const tourUrl = `${baseUrl}/tour/things-to-consider-on-singles-tours.html`;
    await gotoAndWaitForDOMContentLoaded(page, tourUrl);
    
    // Just navigate - SEO audit runs automatically after this test
    await expect(page).toHaveTitle(/tour/i);
  });
});

