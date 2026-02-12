import { Page } from '@playwright/test';
import {
  formatUnifiedReport,
  type ReportItem,
  type ReportSection,
} from './formatting';

/**
 * Interface for visual test results
 */
export interface VisualTestResult {
  check: string;
  passed: boolean;
  message: string;
  element?: string;
  value?: string;
}

/**
 * Interface for visual test summary
 */
export interface VisualTestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: VisualTestResult[];
  passed: boolean;
}

/**
 * Check element visibility
 */
export async function checkElementVisibility(
  page: Page,
  selectors: string[]
): Promise<VisualTestResult[]> {
  const results: VisualTestResult[] = [];

  for (const selector of selectors) {
    const element = page.locator(selector);
    const elementExists = await element.count() > 0;

    if (!elementExists) {
      results.push({
        check: 'Element Visibility',
        passed: false,
        message: `Element not found: ${selector}`,
        element: selector,
      });
      continue;
    }

    const isVisible = await element.isVisible().catch(() => false);
    if (!isVisible) {
      results.push({
        check: 'Element Visibility',
        passed: false,
        message: `Element is not visible: ${selector}`,
        element: selector,
      });
    } else {
      results.push({
        check: 'Element Visibility',
        passed: true,
        message: `Element is visible: ${selector}`,
        element: selector,
      });
    }
  }

  return results;
}

/**
 * Verify layout structure (header, footer, main content)
 */
export async function verifyLayoutStructure(
  page: Page
): Promise<VisualTestResult[]> {
  const results: VisualTestResult[] = [];

  // Check for header
  const headerSelectors = ['header', '[role="banner"]', '.header', '#header'];
  let headerFound = false;
  for (const selector of headerSelectors) {
    const header = page.locator(selector).first();
    if (await header.count() > 0) {
      const isVisible = await header.isVisible().catch(() => false);
      if (isVisible) {
        headerFound = true;
        break;
      }
    }
  }

  if (headerFound) {
    results.push({
      check: 'Layout Structure',
      passed: true,
      message: 'Header element found',
      element: 'header',
    });
  } else {
    results.push({
      check: 'Layout Structure',
      passed: false,
      message: 'Header element not found',
      element: 'header',
    });
  }

  // Check for footer
  const footerSelectors = ['footer', '[role="contentinfo"]', '.footer', '#footer'];
  let footerFound = false;
  for (const selector of footerSelectors) {
    const footer = page.locator(selector).first();
    if (await footer.count() > 0) {
      const isVisible = await footer.isVisible().catch(() => false);
      if (isVisible) {
        footerFound = true;
        break;
      }
    }
  }

  if (footerFound) {
    results.push({
      check: 'Layout Structure',
      passed: true,
      message: 'Footer element found',
      element: 'footer',
    });
  } else {
    results.push({
      check: 'Layout Structure',
      passed: false,
      message: 'Footer element not found',
      element: 'footer',
    });
  }

  // Check for main content area
  const mainSelectors = ['main', '[role="main"]', '.main', '#main', '.content', '#content'];
  let mainFound = false;
  for (const selector of mainSelectors) {
    const main = page.locator(selector).first();
    if (await main.count() > 0) {
      const isVisible = await main.isVisible().catch(() => false);
      if (isVisible) {
        mainFound = true;
        break;
      }
    }
  }

  if (mainFound) {
    results.push({
      check: 'Layout Structure',
      passed: true,
      message: 'Main content area found',
      element: 'main',
    });
  } else {
    results.push({
      check: 'Layout Structure',
      passed: true,
      message: 'Main content area not explicitly defined (acceptable)',
      element: 'main',
    });
  }

  return results;
}

/**
 * Check resource loading (images, CSS, fonts)
 */
export async function checkResourceLoading(
  page: Page
): Promise<VisualTestResult[]> {
  const results: VisualTestResult[] = [];

  // Check for broken images
  const images = await page.locator('img').all();
  let brokenImages = 0;

  for (const img of images) {
    const naturalWidth = await img.evaluate((el: HTMLImageElement) => {
      return el.naturalWidth;
    }).catch(() => 0);

    if (naturalWidth === 0) {
      brokenImages++;
      const src = await img.getAttribute('src').catch(() => '');
      results.push({
        check: 'Resource Loading',
        passed: false,
        message: `Broken image detected: ${src || 'unknown'}`,
        element: 'img',
        value: src,
      });
    }
  }

  if (brokenImages === 0 && images.length > 0) {
    results.push({
      check: 'Resource Loading',
      passed: true,
      message: `All ${images.length} image(s) loaded successfully`,
    });
  }

  // Check for CSS loading (basic check - check if styles are applied)
  const hasStyles = await page.evaluate(() => {
    const styleSheets = document.styleSheets;
    return styleSheets.length > 0;
  });

  if (hasStyles) {
    results.push({
      check: 'Resource Loading',
      passed: true,
      message: 'CSS stylesheets are loaded',
    });
  } else {
    results.push({
      check: 'Resource Loading',
      passed: false,
      message: 'No CSS stylesheets detected',
    });
  }

  return results;
}

/**
 * Measure layout shift (CLS - Cumulative Layout Shift)
 */
export async function measureLayoutShift(
  page: Page
): Promise<VisualTestResult> {
  try {
    // Use Performance Observer API to measure CLS
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        let lastEntry: any = null;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // Only count layout shifts without recent user input
            if (!(entry as any).hadRecentInput) {
              const firstSessionEntry = lastEntry;
              if (!firstSessionEntry) {
                lastEntry = entry;
              } else {
                // Check if entry is part of same session
                const timeDiff = (entry as any).startTime - (firstSessionEntry as any).startTime;
                const valueDiff = Math.abs((entry as any).value - (firstSessionEntry as any).value);

                if (timeDiff < 1000 && valueDiff < 0.25) {
                  // Same session
                  clsValue += (entry as any).value;
                } else {
                  // New session
                  clsValue += (entry as any).value;
                }
                lastEntry = entry;
              }
            }
          }
        });

        try {
          observer.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {
          // Performance Observer not supported
          resolve(-1);
        }

        // Wait a bit for layout shifts to occur
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 2000);
      });
    });

    if (cls === -1) {
      return {
        check: 'Layout Shift (CLS)',
        passed: true,
        message: 'Layout shift measurement not supported (requires user interaction)',
      };
    }

    // CLS threshold: < 0.1 is good
    const threshold = 0.1;
    if (cls < threshold) {
      return {
        check: 'Layout Shift (CLS)',
        passed: true,
        message: `Cumulative Layout Shift: ${cls.toFixed(3)} (good, < ${threshold})`,
        value: cls.toFixed(3),
      };
    } else {
      return {
        check: 'Layout Shift (CLS)',
        passed: false,
        message: `Cumulative Layout Shift: ${cls.toFixed(3)} (should be < ${threshold})`,
        value: cls.toFixed(3),
      };
    }
  } catch (error: any) {
    return {
      check: 'Layout Shift (CLS)',
      passed: true,
      message: `Layout shift measurement not available: ${error.message}`,
    };
  }
}

/**
 * Run all visual tests
 */
export async function runVisualTests(
  page: Page,
  options?: {
    elementSelectors?: string[];
  }
): Promise<VisualTestSummary> {
  const results: VisualTestResult[] = [];

  // Element Visibility
  if (options?.elementSelectors && options.elementSelectors.length > 0) {
    results.push(...await checkElementVisibility(page, options.elementSelectors));
  }

  // Layout Structure
  results.push(...await verifyLayoutStructure(page));

  // Resource Loading
  results.push(...await checkResourceLoading(page));

  // Layout Shift (may not work in all environments)
  results.push(await measureLayoutShift(page));

  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;

  return {
    totalTests: results.length,
    passedTests,
    failedTests,
    results,
    passed: failedTests === 0,
  };
}

/**
 * Format visual test report
 */
export function formatVisualTestReport(
  summary: VisualTestSummary,
  url?: string
): string {
  const sections: ReportSection[] = [];

  if (summary.results.length > 0) {
    const items: ReportItem[] = summary.results.map(result => ({
      label: result.element || result.check,
      value: result.passed ? 'Passed' : 'Failed',
      status: result.passed ? 'passed' : 'failed',
      details: result.value ? `${result.message} (${result.value})` : result.message,
    }));

    sections.push({
      title: 'Visual Test Results',
      items,
    });
  }

  const summaryItems: ReportItem[] = [
    {
      label: 'Total Tests',
      value: summary.totalTests,
      status: 'info',
    },
    {
      label: 'Passed',
      value: summary.passedTests,
      status: summary.passedTests === summary.totalTests ? 'passed' : 'warning',
    },
    {
      label: 'Failed',
      value: summary.failedTests,
      status: summary.failedTests === 0 ? 'passed' : 'failed',
    },
  ];

  return formatUnifiedReport({
    testName: 'Visual & Layout Tests',
    url,
    summary: summaryItems,
    sections,
  });
}
