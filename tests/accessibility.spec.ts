import { test, expect } from '@playwright/test';
import {
  runAccessibilityCheck,
  formatAccessibilityReport,
} from '../utils/accessibility';
import { gotoAndWait } from '../utils/page-load';

/**
 * NOTE: This test file is SKIPPED by default. It only runs when explicitly requested
 * via environment variable: RUN_ACCESSIBILITY_TESTS=true
 * 
 * Batch URL testing uses url-audit.spec.ts instead, which includes accessibility checks.
 */
const BASE_URL = process.env.URL_AUDIT_URL || process.env.BASE_URL || 'https://anewbride.com/';
const shouldRunAccessibilityTests = process.env.RUN_ACCESSIBILITY_TESTS === 'true';

test.describe('Accessibility Testing', () => {
  test('check homepage accessibility', async ({ page }) => {
    test.skip(!shouldRunAccessibilityTests, 'Skipped - set RUN_ACCESSIBILITY_TESTS=true to run');
    await gotoAndWait(page, BASE_URL);

    const scanResults = await runAccessibilityCheck(page);

    // Log the report
    console.log(formatAccessibilityReport(scanResults));

    // Assert no violations (or adjust threshold based on your requirements)
    expect(scanResults.passed).toBe(true);
  });

  test('check tour page accessibility', async ({ page }) => {
    test.skip(!shouldRunAccessibilityTests, 'Skipped - set RUN_ACCESSIBILITY_TESTS=true to run');
    const tourPageUrl = process.env.TOUR_PAGE_URL || `${BASE_URL}tour/things-to-consider-on-singles-tours.html`;
    await gotoAndWait(page, tourPageUrl);

    const scanResults = await runAccessibilityCheck(page);

    console.log(formatAccessibilityReport(scanResults));

    expect(scanResults.passed).toBe(true);
  });
});

