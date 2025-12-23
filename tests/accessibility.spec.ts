import { test, expect } from '@playwright/test';
import {
  runAccessibilityCheck,
  formatAccessibilityReport,
} from '../utils/accessibility';
import { gotoAndWait } from '../utils/page-load';

test.describe('Accessibility Testing', () => {
  test('check homepage accessibility', async ({ page }) => {
    await gotoAndWait(page, 'https://anewbride.com/');

    const scanResults = await runAccessibilityCheck(page);

    // Log the report
    console.log(formatAccessibilityReport(scanResults));

    // Assert no violations (or adjust threshold based on your requirements)
    expect(scanResults.passed).toBe(true);
  });

  test('check tour page accessibility', async ({ page }) => {
    await gotoAndWait(page, 'https://anewbride.com/tour/things-to-consider-on-singles-tours.html');

    const scanResults = await runAccessibilityCheck(page);

    console.log(formatAccessibilityReport(scanResults));

    expect(scanResults.passed).toBe(true);
  });
});

