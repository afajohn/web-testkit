import { test, expect } from '@playwright/test';
import {
  runAccessibilityCheck,
  formatAccessibilityReport,
} from '../utils/accessibility';
import { gotoAndWait } from '../utils/page-load';

const BASE_URL = process.env.URL_AUDIT_URL || process.env.BASE_URL || 'https://anewbride.com/';

test.describe('Accessibility Testing', () => {
  test('check homepage accessibility', async ({ page }) => {
    await gotoAndWait(page, BASE_URL);

    const scanResults = await runAccessibilityCheck(page);

    // Log the report
    console.log(formatAccessibilityReport(scanResults));

    // Assert no violations (or adjust threshold based on your requirements)
    expect(scanResults.passed).toBe(true);
  });

  test('check tour page accessibility', async ({ page }) => {
    const tourPageUrl = process.env.TOUR_PAGE_URL || `${BASE_URL}tour/things-to-consider-on-singles-tours.html`;
    await gotoAndWait(page, tourPageUrl);

    const scanResults = await runAccessibilityCheck(page);

    console.log(formatAccessibilityReport(scanResults));

    expect(scanResults.passed).toBe(true);
  });
});

