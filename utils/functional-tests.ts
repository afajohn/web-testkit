import { Page } from '@playwright/test';
import {
  formatUnifiedReport,
  type ReportItem,
  type ReportSection,
} from './formatting';

/**
 * Interface for functional test results
 */
export interface FunctionalTestResult {
  check: string;
  passed: boolean;
  message: string;
  element?: string;
  url?: string;
}

/**
 * Interface for functional test summary
 */
export interface FunctionalTestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: FunctionalTestResult[];
  passed: boolean;
}

/**
 * Test CTA button functionality
 */
export async function testCTAButtons(
  page: Page,
  ctaSelectors: string[]
): Promise<FunctionalTestResult[]> {
  const results: FunctionalTestResult[] = [];

  for (const selector of ctaSelectors) {
    const button = page.locator(selector);
    const buttonExists = await button.count() > 0;

    if (!buttonExists) {
      results.push({
        check: 'CTA Button',
        passed: false,
        message: `CTA button not found: ${selector}`,
        element: selector,
      });
      continue;
    }

    const isVisible = await button.isVisible();
    if (!isVisible) {
      results.push({
        check: 'CTA Button',
        passed: false,
        message: `CTA button is not visible: ${selector}`,
        element: selector,
      });
      continue;
    }

    const isEnabled = await button.isEnabled();
    if (!isEnabled) {
      results.push({
        check: 'CTA Button',
        passed: false,
        message: `CTA button is disabled: ${selector}`,
        element: selector,
      });
      continue;
    }

    // Check if button has text or aria-label
    const hasAccessibleText = await button.evaluate((el: HTMLElement) => {
      return !!(el.textContent?.trim() || el.getAttribute('aria-label'));
    });

    if (!hasAccessibleText) {
      results.push({
        check: 'CTA Button',
        passed: false,
        message: `CTA button lacks accessible text (text or aria-label): ${selector}`,
        element: selector,
      });
      continue;
    }

    results.push({
      check: 'CTA Button',
      passed: true,
      message: `CTA button is functional: ${selector}`,
      element: selector,
    });
  }

  return results;
}

/**
 * Test navigation menu
 */
export async function testNavigationMenu(
  page: Page,
  options?: {
    menuSelector?: string;
    linkSelectors?: string[];
  }
): Promise<FunctionalTestResult[]> {
  const results: FunctionalTestResult[] = [];
  const menuSelector = options?.menuSelector || 'nav, .nav, .navigation, .navbar, [role="navigation"]';
  
  const menu = page.locator(menuSelector).first();
  const menuExists = await menu.count() > 0;

  if (!menuExists) {
    return [{
      check: 'Navigation Menu',
      passed: false,
      message: `Navigation menu not found: ${menuSelector}`,
    }];
  }

  // Find all links in the menu
  const links = options?.linkSelectors
    ? options.linkSelectors.map(sel => menu.locator(sel))
    : await menu.locator('a[href]').all();

  for (const link of links) {
    const selector = await link.evaluate((el: HTMLElement) => {
      if (el.id) return `#${el.id}`;
      return el.tagName.toLowerCase();
    }).catch(() => 'nav-link');

    const isVisible = await link.isVisible().catch(() => false);
    if (!isVisible) {
      results.push({
        check: 'Navigation Link',
        passed: false,
        message: `Navigation link is not visible: ${selector}`,
        element: selector,
      });
      continue;
    }

    const href = (await link.getAttribute('href')) || '';
    if (!href || href === '#' || href.startsWith('javascript:')) {
      results.push({
        check: 'Navigation Link',
        passed: false,
        message: `Navigation link has invalid href: ${selector}`,
        element: selector,
        url: href || undefined,
      });
      continue;
    }

    results.push({
      check: 'Navigation Link',
      passed: true,
      message: `Navigation link is valid: ${selector}`,
      element: selector,
      url: href || undefined,
    });
  }

  return results;
}

/**
 * Test external links
 */
export async function testExternalLinks(
  page: Page,
  options?: {
    linkSelectors?: string[];
    checkTarget?: boolean;
  }
): Promise<FunctionalTestResult[]> {
  const results: FunctionalTestResult[] = [];
  
  const linkSelectors = options?.linkSelectors || ['a[href^="http"]'];
  const links: any[] = [];

  // Collect all external links
  for (const selector of linkSelectors) {
    const foundLinks = await page.locator(selector).all();
    links.push(...foundLinks);
  }

  // Also find external links by checking href attributes
  const allLinks = await page.locator('a[href]').all();
  for (const link of allLinks) {
    const href = await link.getAttribute('href').catch(() => '');
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      const currentUrl = new URL(page.url());
      try {
        const linkUrl = new URL(href, page.url());
        if (linkUrl.hostname !== currentUrl.hostname) {
          if (!links.includes(link)) {
            links.push(link);
          }
        }
      } catch {
        // Invalid URL, skip
      }
    }
  }

  for (const link of links) {
    const href = await link.getAttribute('href').catch(() => '');
    const target = await link.getAttribute('target').catch(() => '');
    const rel = await link.getAttribute('rel').catch(() => '');

    // Check if external links open in new tab (recommended for external links)
    if (options?.checkTarget !== false) {
      if (!target || target !== '_blank') {
        results.push({
          check: 'External Link Target',
          passed: false,
          message: `External link should open in new tab (target="_blank"): ${href}`,
          element: href,
          url: href || undefined,
        });
      } else {
        // Check if rel="noopener noreferrer" is present for security
        if (!rel || (!rel.includes('noopener') && !rel.includes('noreferrer'))) {
          results.push({
            check: 'External Link Security',
            passed: false,
            message: `External link with target="_blank" should include rel="noopener noreferrer": ${href}`,
            element: href,
            url: href || undefined,
          });
        } else {
          results.push({
            check: 'External Link',
            passed: true,
            message: `External link configured correctly: ${href}`,
            element: href,
            url: href || undefined,
          });
        }
      }
    } else {
      results.push({
        check: 'External Link',
        passed: true,
        message: `External link found: ${href}`,
        element: href,
        url: href || undefined,
      });
    }
  }

  return results;
}

/**
 * Test modal functionality
 */
export async function testModalFunctionality(
  page: Page,
  modalTriggers: string[]
): Promise<FunctionalTestResult[]> {
  const results: FunctionalTestResult[] = [];

  for (const triggerSelector of modalTriggers) {
    const trigger = page.locator(triggerSelector);
    const triggerExists = await trigger.count() > 0;

    if (!triggerExists) {
      results.push({
        check: 'Modal Trigger',
        passed: false,
        message: `Modal trigger not found: ${triggerSelector}`,
        element: triggerSelector,
      });
      continue;
    }

    try {
      // Click the trigger
      await trigger.click();
      await page.waitForTimeout(500); // Wait for modal to open

      // Check if modal appeared
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first();
      const modalExists = await modal.count() > 0;
      const modalVisible = modalExists ? await modal.isVisible().catch(() => false) : false;

      if (!modalVisible) {
        results.push({
          check: 'Modal Functionality',
          passed: false,
          message: `Modal did not open after clicking trigger: ${triggerSelector}`,
          element: triggerSelector,
        });
        continue;
      }

      // Check for close button
      const closeButton = modal.locator('[aria-label*="close" i], [class*="close"], button[aria-label*="close" i]').first();
      const closeButtonExists = await closeButton.count() > 0;

      if (!closeButtonExists) {
        results.push({
          check: 'Modal Close Button',
          passed: false,
          message: `Modal lacks close button: ${triggerSelector}`,
          element: triggerSelector,
        });
      } else {
        results.push({
          check: 'Modal Functionality',
          passed: true,
          message: `Modal opens and has close button: ${triggerSelector}`,
          element: triggerSelector,
        });
      }

      // Close modal for next test
      if (closeButtonExists) {
        await closeButton.click().catch(() => {});
        await page.waitForTimeout(300);
      }
    } catch (error: any) {
      results.push({
        check: 'Modal Functionality',
        passed: false,
        message: `Error testing modal: ${error.message}`,
        element: triggerSelector,
      });
    }
  }

  return results;
}

/**
 * Test video embed functionality
 */
export async function testVideoEmbed(
  page: Page,
  videoSelectors?: string[]
): Promise<FunctionalTestResult[]> {
  const results: FunctionalTestResult[] = [];

  const selectors = videoSelectors || [
    'iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="vimeo"], iframe[src*="video"]',
    'video',
    '[class*="video"]',
  ];

  const videos: any[] = [];

  for (const selector of selectors) {
    const foundVideos = await page.locator(selector).all();
    videos.push(...foundVideos);
  }

  for (const video of videos) {
    const selector = await video.evaluate((el: HTMLElement) => {
      if (el.id) return `#${el.id}`;
      return el.tagName.toLowerCase();
    }).catch(() => 'video');

    const isVisible = await video.isVisible().catch(() => false);
    if (!isVisible) {
      results.push({
        check: 'Video Embed',
        passed: false,
        message: `Video embed is not visible: ${selector}`,
        element: selector,
      });
      continue;
    }

    // Check if iframe has title (accessibility)
    const tagName = await video.evaluate((el: HTMLElement) => el.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'iframe') {
      const title = await video.getAttribute('title').catch(() => '');
      if (!title) {
        results.push({
          check: 'Video Embed Accessibility',
          passed: false,
          message: `Video iframe should have title attribute: ${selector}`,
          element: selector,
        });
        continue;
      }
    }

    results.push({
      check: 'Video Embed',
      passed: true,
      message: `Video embed is functional: ${selector}`,
      element: selector,
    });
  }

  if (videos.length === 0) {
    results.push({
      check: 'Video Embed',
      passed: true,
      message: 'No video embeds found (not applicable)',
    });
  }

  return results;
}

/**
 * Run all functional tests
 */
export async function runFunctionalTests(
  page: Page,
  options?: {
    ctaSelectors?: string[];
    navigationMenuSelector?: string;
    navigationLinkSelectors?: string[];
    externalLinkSelectors?: string[];
    modalTriggers?: string[];
    videoSelectors?: string[];
  }
): Promise<FunctionalTestSummary> {
  const results: FunctionalTestResult[] = [];

  // CTA Buttons
  if (options?.ctaSelectors && options.ctaSelectors.length > 0) {
    results.push(...await testCTAButtons(page, options.ctaSelectors));
  }

  // Navigation Menu
  results.push(...await testNavigationMenu(page, {
    menuSelector: options?.navigationMenuSelector,
    linkSelectors: options?.navigationLinkSelectors,
  }));

  // External Links
  results.push(...await testExternalLinks(page, {
    linkSelectors: options?.externalLinkSelectors,
  }));

  // Modal Functionality
  if (options?.modalTriggers && options.modalTriggers.length > 0) {
    results.push(...await testModalFunctionality(page, options.modalTriggers));
  }

  // Video Embeds
  results.push(...await testVideoEmbed(page, options?.videoSelectors));

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
 * Format functional test report
 */
export function formatFunctionalTestReport(
  summary: FunctionalTestSummary,
  url?: string
): string {
  const sections: ReportSection[] = [];

  if (summary.results.length > 0) {
    const items: ReportItem[] = summary.results.map(result => ({
      label: result.element || result.check,
      value: result.passed ? 'Passed' : 'Failed',
      status: result.passed ? 'passed' : 'failed',
      details: result.url ? `${result.message} (${result.url})` : result.message,
    }));

    sections.push({
      title: 'Functional Test Results',
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
    testName: 'Functional Tests',
    url,
    summary: summaryItems,
    sections,
  });
}
