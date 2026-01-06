import { test, expect } from '@playwright/test';
import {
  runAccessibilityCheckOnVisibleContent,
  formatAccessibilityReport,
} from '../utils/accessibility';
import { gotoAndWaitForDOMContentLoaded } from '../utils/page-load';
import { formatTestHeader } from '../utils/formatting';

const DEFAULT_TEST_URL = process.env.TEST_URL || process.env.URL_AUDIT_URL || 'https://anewbride.com/';

test.describe('Accessibility Testing', () => {
  test('check homepage accessibility (visible content only)', async ({ page }) => {
    await gotoAndWaitForDOMContentLoaded(page, DEFAULT_TEST_URL);

    // Uses runAccessibilityCheckOnVisibleContent which waits for DOM, scrolls, and checks all visible elements
    const scanResults = await runAccessibilityCheckOnVisibleContent(page);

    // Log the report
    console.log(formatTestHeader('Accessibility Check', DEFAULT_TEST_URL));
    console.log(await formatAccessibilityReport(scanResults, DEFAULT_TEST_URL));

    // Attach accessibility screenshots if available
    if (scanResults.screenshotPaths) {
      if (scanResults.screenshotPaths.fullPage) {
        await test.info().attach('Accessibility Errors - Overview', {
          path: scanResults.screenshotPaths.fullPage,
          contentType: 'image/png',
        });
      }
      scanResults.screenshotPaths.closeUps.forEach((path: string, index: number) => {
        test.info().attach(`Accessibility Error #${index + 1}`, {
          path,
          contentType: 'image/png',
        });
      });
    }

    // Assert no violations (or adjust threshold based on your requirements)
    expect(scanResults.passed).toBe(true);
  });

  test('check tour page accessibility (visible content only)', async ({ page }) => {
    const baseUrl = DEFAULT_TEST_URL.replace(/\/$/, '');
    const tourUrl = `${baseUrl}/tour/things-to-consider-on-singles-tours.html`;
    await gotoAndWaitForDOMContentLoaded(page, tourUrl);

    const scanResults = await runAccessibilityCheckOnVisibleContent(page);

    console.log(formatTestHeader('Accessibility Check', tourUrl));
    console.log(await formatAccessibilityReport(scanResults, DEFAULT_TEST_URL));

    expect(scanResults.passed).toBe(true);
  });
});

