import { Page } from '@playwright/test';
import {
  formatUnifiedReport,
  type ReportItem,
  type ReportSection,
} from './formatting';

/**
 * Common viewport sizes
 */
export const VIEWPORTS = {
  mobile: { width: 375, height: 667 }, // iPhone SE
  mobileLarge: { width: 414, height: 896 }, // iPhone 11 Pro Max
  tablet: { width: 768, height: 1024 }, // iPad
  tabletLandscape: { width: 1024, height: 768 }, // iPad Landscape
  desktop: { width: 1920, height: 1080 }, // Desktop
  desktopSmall: { width: 1366, height: 768 }, // Small Desktop
};

/**
 * Interface for mobile test results
 */
export interface MobileTestResult {
  check: string;
  passed: boolean;
  message: string;
  viewport?: string;
  element?: string;
  value?: string;
}

/**
 * Interface for mobile test summary
 */
export interface MobileTestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: MobileTestResult[];
  passed: boolean;
}

/**
 * Test mobile viewport
 */
export async function testMobileViewport(
  page: Page,
  viewport: { width: number; height: number },
  viewportName: string
): Promise<MobileTestResult[]> {
  const results: MobileTestResult[] = [];

  try {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(500); // Allow layout to settle

    // Check if page is responsive (no horizontal scroll)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    if (hasHorizontalScroll) {
      results.push({
        check: 'Horizontal Scroll',
        passed: false,
        message: `Page has horizontal scroll at viewport ${viewportName} (${viewport.width}x${viewport.height})`,
        viewport: viewportName,
      });
    } else {
      results.push({
        check: 'Horizontal Scroll',
        passed: true,
        message: `No horizontal scroll at viewport ${viewportName}`,
        viewport: viewportName,
      });
    }

    // Check viewport meta tag
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content').catch(() => '');
    if (!viewportMeta) {
      results.push({
        check: 'Viewport Meta Tag',
        passed: false,
        message: 'Viewport meta tag is missing',
        viewport: viewportName,
      });
    } else if (!viewportMeta.includes('width=') && !viewportMeta.includes('device-width')) {
      results.push({
        check: 'Viewport Meta Tag',
        passed: false,
        message: `Viewport meta tag is invalid: ${viewportMeta}`,
        viewport: viewportName,
        value: viewportMeta,
      });
    } else {
      results.push({
        check: 'Viewport Meta Tag',
        passed: true,
        message: `Viewport meta tag is present: ${viewportMeta}`,
        viewport: viewportName,
        value: viewportMeta,
      });
    }

    return results;
  } catch (error: any) {
    return [{
      check: 'Mobile Viewport',
      passed: false,
      message: `Error testing viewport: ${error.message}`,
      viewport: viewportName,
    }];
  }
}

/**
 * Check touch target sizes (minimum 44x44px recommended)
 */
export async function checkTouchTargets(
  page: Page,
  options?: {
    minSize?: number;
    selectors?: string[];
  }
): Promise<MobileTestResult[]> {
  const results: MobileTestResult[] = [];
  const minSize = options?.minSize || 44; // WCAG recommendation

  const interactiveSelectors = options?.selectors || [
    'button',
    'a',
    'input[type="button"]',
    'input[type="submit"]',
    '[role="button"]',
    '[onclick]',
  ];

  const interactiveElements: any[] = [];

  for (const selector of interactiveSelectors) {
    const elements = await page.locator(selector).all();
    interactiveElements.push(...elements);
  }

  for (const element of interactiveElements) {
    const selector = await element.evaluate((el: HTMLElement) => {
      if (el.id) return `#${el.id}`;
      if (el.className) return `.${el.className.split(' ')[0]}`;
      return el.tagName.toLowerCase();
    }).catch(() => 'element');

    const isVisible = await element.isVisible().catch(() => false);
    if (!isVisible) continue;

    const boundingBox = await element.boundingBox().catch(() => null);
    if (!boundingBox) continue;

    const width = boundingBox.width;
    const height = boundingBox.height;
    const area = width * height;

    if (width < minSize || height < minSize) {
      results.push({
        check: 'Touch Target Size',
        passed: false,
        message: `Touch target too small: ${selector} (${Math.round(width)}x${Math.round(height)}px, minimum ${minSize}x${minSize}px)`,
        element: selector,
        value: `${Math.round(width)}x${Math.round(height)}`,
      });
    } else {
      // Only report passed if we're checking specific elements
      if (options?.selectors) {
        results.push({
          check: 'Touch Target Size',
          passed: true,
          message: `Touch target size OK: ${selector}`,
          element: selector,
          value: `${Math.round(width)}x${Math.round(height)}`,
        });
      }
    }
  }

  if (results.length === 0 && interactiveElements.length > 0) {
    results.push({
      check: 'Touch Target Size',
      passed: true,
      message: `All ${interactiveElements.length} interactive element(s) meet minimum touch target size`,
    });
  }

  return results;
}

/**
 * Test mobile navigation (hamburger menu)
 */
export async function testMobileNavigation(
  page: Page,
  options?: {
    menuToggleSelector?: string;
    menuSelector?: string;
  }
): Promise<MobileTestResult[]> {
  const results: MobileTestResult[] = [];

  // Set mobile viewport
  await page.setViewportSize(VIEWPORTS.mobile);
  await page.waitForTimeout(500);

  const toggleSelector = options?.menuToggleSelector || 'button[aria-label*="menu" i], .hamburger, .menu-toggle, [class*="hamburger"], [class*="menu-toggle"]';
  const menuSelector = options?.menuSelector || 'nav, .nav, .navigation, .mobile-menu, [class*="mobile-menu"]';

  const toggle = page.locator(toggleSelector).first();
  const toggleExists = await toggle.count() > 0;

  if (!toggleExists) {
    // Check if navigation is always visible (not hamburger menu)
    const menu = page.locator(menuSelector).first();
    const menuVisible = await menu.isVisible().catch(() => false);

    if (menuVisible) {
      results.push({
        check: 'Mobile Navigation',
        passed: true,
        message: 'Navigation menu is always visible (no hamburger menu required)',
      });
    } else {
      results.push({
        check: 'Mobile Navigation',
        passed: false,
        message: `Mobile menu toggle button not found: ${toggleSelector}`,
      });
    }
    return results;
  }

  const toggleVisible = await toggle.isVisible().catch(() => false);
  if (!toggleVisible) {
    results.push({
      check: 'Mobile Navigation',
      passed: false,
      message: 'Mobile menu toggle button is not visible',
    });
    return results;
  }

  // Check if toggle has accessible text
  const hasAccessibleText = await toggle.evaluate((el: HTMLElement) => {
    return !!(el.textContent?.trim() || 
              el.getAttribute('aria-label') || 
              el.getAttribute('aria-labelledby'));
  });

  if (!hasAccessibleText) {
    results.push({
      check: 'Mobile Navigation Accessibility',
      passed: false,
      message: 'Mobile menu toggle button lacks accessible text (aria-label or text)',
    });
  }

  try {
    // Click toggle to open menu
    await toggle.click();
    await page.waitForTimeout(500);

    const menu = page.locator(menuSelector).first();
    const menuVisible = await menu.isVisible().catch(() => false);

    if (!menuVisible) {
      results.push({
        check: 'Mobile Navigation',
        passed: false,
        message: 'Mobile menu did not open after clicking toggle',
      });
    } else {
      results.push({
        check: 'Mobile Navigation',
        passed: true,
        message: 'Mobile navigation menu opens correctly',
      });

      // Check if menu has close button or can be closed
      const closeButton = menu.locator('[aria-label*="close" i], [class*="close"]').first();
      const closeButtonExists = await closeButton.count() > 0;

      if (closeButtonExists) {
        results.push({
          check: 'Mobile Navigation Close',
          passed: true,
          message: 'Mobile menu has close button',
        });
      }
    }
  } catch (error: any) {
    results.push({
      check: 'Mobile Navigation',
      passed: false,
      message: `Error testing mobile navigation: ${error.message}`,
    });
  }

  return results;
}

/**
 * Check responsive layout across multiple viewports
 */
export async function checkResponsiveLayout(
  page: Page,
  viewports: { name: string; width: number; height: number }[] = [
    { name: 'mobile', ...VIEWPORTS.mobile },
    { name: 'tablet', ...VIEWPORTS.tablet },
    { name: 'desktop', ...VIEWPORTS.desktop },
  ]
): Promise<MobileTestSummary> {
  const results: MobileTestResult[] = [];

  for (const viewport of viewports) {
    const viewportResults = await testMobileViewport(page, { width: viewport.width, height: viewport.height }, viewport.name);
    results.push(...viewportResults);
  }

  // Check touch targets on mobile viewport
  await page.setViewportSize(VIEWPORTS.mobile);
  const touchTargetResults = await checkTouchTargets(page);
  results.push(...touchTargetResults);

  // Test mobile navigation
  const navigationResults = await testMobileNavigation(page);
  results.push(...navigationResults);

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
 * Format mobile test report
 */
export function formatMobileTestReport(
  summary: MobileTestSummary,
  url?: string
): string {
  const sections: ReportSection[] = [];

  if (summary.results.length > 0) {
    const items: ReportItem[] = summary.results.map(result => ({
      label: result.viewport ? `${result.check} (${result.viewport})` : result.check,
      value: result.passed ? 'Passed' : 'Failed',
      status: result.passed ? 'passed' : 'failed',
      details: result.value ? `${result.message} - ${result.value}` : result.message,
    }));

    sections.push({
      title: 'Mobile Test Results',
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
    testName: 'Mobile Responsiveness',
    url,
    summary: summaryItems,
    sections,
  });
}

/**
 * Test mobile responsiveness (convenience function)
 */
export async function testMobileResponsiveness(
  page: Page
): Promise<MobileTestSummary> {
  return checkResponsiveLayout(page);
}
