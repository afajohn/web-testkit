import { Page, Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  waitForDOMReady,
  scrollToBottom,
  waitForLazyContent,
} from './dom-helpers';
import {
  formatSectionHeader,
  formatTableHeader,
  formatTableRow,
  formatSeparator,
  formatUnifiedReport,
  type ReportItem,
  type ReportSection,
} from './formatting';
import { createViolationScreenshots } from './screenshot-helpers';

/**
 * Helper function to convert a Locator or string selector to a string selector
 * for use with AxeBuilder.include(). AxeBuilder requires string selectors, not Locator objects.
 */
async function getSelectorFromLocatorOrString(
  page: Page,
  selector: string | Locator
): Promise<string> {
  // If it's already a string, return it directly
  if (typeof selector === 'string') {
    return selector;
  }
  
  // For Locator, try to generate a unique selector by evaluating the element
  try {
    // Get the element and try to generate a unique selector
    const selectorString = await selector.evaluate((el: Element) => {
      // Try to generate a unique selector path
      // Priority: id > class > tag with attributes > tag
      if (el.id) {
        return `#${el.id}`;
      }
      
      // Try class-based selector
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/).filter(c => c.length > 0);
        if (classes.length > 0) {
          const classSelector = '.' + classes.join('.');
          // Check if this selector is unique (simplified check)
          const matches = document.querySelectorAll(classSelector);
          if (matches.length === 1) {
            return classSelector;
          }
          // If not unique, add tag name
          return `${el.tagName.toLowerCase()}${classSelector}`;
        }
      }
      
      // Fallback: use tag name with attributes
      const tagName = el.tagName.toLowerCase();
      const attrs: string[] = [];
      
      // Add data attributes
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          attrs.push(`[${attr.name}="${attr.value}"]`);
        }
      });
      
      if (attrs.length > 0) {
        return `${tagName}${attrs.join('')}`;
      }
      
      // Last resort: just tag name
      return tagName;
    });
    
    return selectorString;
  } catch (error) {
    // If we can't generate a selector, throw a helpful error
    throw new Error(
      'Unable to convert Locator to selector string for AxeBuilder.include(). ' +
      'Please use a string selector instead, or ensure the Locator references a valid element.'
    );
  }
}

/**
 * Run accessibility audit using axe-core
 * Can optionally exclude hidden elements
 */
export async function runAccessibilityCheck(
  page: Page,
  excludeHidden: boolean = false
) {
  const axeBuilder = new AxeBuilder({ page });
  
  if (excludeHidden) {
    axeBuilder.exclude('[style*="display: none"], [hidden], [aria-hidden="true"]');
  }
  
  const accessibilityScanResults = await axeBuilder.analyze();
  
  const violations = accessibilityScanResults.violations;
  const incomplete = accessibilityScanResults.incomplete;
  
  return {
    violations,
    incomplete,
    passed: violations.length === 0,
    totalViolations: violations.length,
    totalIncomplete: incomplete.length,
  };
}

/**
 * Run accessibility check on visible content only
 * CRITICAL: Waits for DOM to be fully loaded, scrolls through entire page,
 * waits for lazy content, and excludes hidden elements
 * NO SKIPPING - checks all visible elements
 * 
 * @param page - Playwright page object
 * @param options - Optional configuration
 * @param options.skipPageLoad - If true, skip waiting/scrolling (page already loaded)
 * @param options.captureScreenshot - If true, capture screenshots when violations are found (default: true)
 */
export async function runAccessibilityCheckOnVisibleContent(
  page: Page,
  options: { skipPageLoad?: boolean; captureScreenshot?: boolean } = {}
) {
  const startTime = Date.now();
  const { skipPageLoad = false, captureScreenshot = true } = options;

  console.log('  ⏳ Starting accessibility check...');

  if (!skipPageLoad) {
    // FIRST: Wait for DOM to be fully loaded
    console.log('  ⏳ Waiting for DOM to be fully loaded...');
    await waitForDOMReady(page);

    // Scroll through entire page before checking (no skipping)
    console.log('  ⏳ Scrolling through page to check all content...');
    await scrollToBottom(page);

    // Wait for all lazy content to load
    console.log('  ⏳ Waiting for lazy content to load...');
    await waitForLazyContent(page);

    // Wait for dynamic content to fully render
    await page.waitForTimeout(500);
  }

  // Configure axe-core to exclude hidden elements
  console.log('  ⏳ Running accessibility scan (axe-core)...');
  const scanStart = Date.now();
  const accessibilityScanResults = await new AxeBuilder({ page })
    .exclude('[style*="display: none"], [hidden], [aria-hidden="true"]')
    .analyze();
  const scanElapsed = ((Date.now() - scanStart) / 1000).toFixed(1);
  console.log(`  ✓ Accessibility scan complete (${scanElapsed}s)`);
  
  const violations = accessibilityScanResults.violations;
  const incomplete = accessibilityScanResults.incomplete;
  
  // Capture screenshots if violations found
  let screenshotPaths: { fullPage: string | null; closeUps: string[] } | undefined;
  if (captureScreenshot && violations.length > 0) {
    console.log(`  ⏳ Capturing screenshots for ${violations.length} violation(s)...`);
    try {
      screenshotPaths = await createViolationScreenshots(page, violations, 'test-results');
      console.log('  ✓ Screenshots captured');
    } catch (error) {
      console.warn('  ⚠️  Failed to capture accessibility violation screenshots:', error);
    }
  }
  
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  ✓ Accessibility check complete: ${violations.length} violations, ${incomplete.length} incomplete (${totalElapsed}s total)`);
  
  return {
    violations,
    incomplete,
    passed: violations.length === 0,
    totalViolations: violations.length,
    totalIncomplete: incomplete.length,
    screenshotPaths,
  };
}

/**
 * Run accessibility check on a specific element (useful for modals, dropdowns, etc.)
 */
export async function runAccessibilityCheckOnElement(
  page: Page,
  selector: string | Locator,
  options: { captureScreenshot?: boolean } = {}
) {
  const { captureScreenshot = true } = options;
  const element = typeof selector === 'string' ? page.locator(selector).first() : selector;
  
  // Convert Locator to string selector for AxeBuilder.include()
  const selectorString = await getSelectorFromLocatorOrString(page, selector);
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .include(selectorString)
    .analyze();
  
  const violations = accessibilityScanResults.violations;
  const incomplete = accessibilityScanResults.incomplete;
  
  // Capture screenshots if violations found
  let screenshotPaths: { fullPage: string | null; closeUps: string[] } | undefined;
  if (captureScreenshot && violations.length > 0) {
    try {
      screenshotPaths = await createViolationScreenshots(page, violations, 'test-results');
    } catch (error) {
      console.warn('Failed to capture accessibility violation screenshots:', error);
    }
  }
  
  return {
    violations,
    incomplete,
    passed: violations.length === 0,
    totalViolations: violations.length,
    totalIncomplete: incomplete.length,
    screenshotPaths,
  };
}

/**
 * Run accessibility check on an element in hover state
 */
export async function runAccessibilityCheckOnHover(
  page: Page,
  selector: string | Locator,
  options: { captureScreenshot?: boolean } = {}
) {
  const { captureScreenshot = true } = options;
  const element = typeof selector === 'string' ? page.locator(selector).first() : selector;
  
  // Hover over the element
  await element.hover();
  
  // Wait a bit for hover effects to apply
  await page.waitForTimeout(100);
  
  // Convert Locator to string selector for AxeBuilder.include()
  const selectorString = await getSelectorFromLocatorOrString(page, selector);
  
  // Run accessibility check
  const accessibilityScanResults = await new AxeBuilder({ page })
    .include(selectorString)
    .analyze();
  
  const violations = accessibilityScanResults.violations;
  const incomplete = accessibilityScanResults.incomplete;
  
  // Capture screenshots if violations found
  let screenshotPaths: { fullPage: string | null; closeUps: string[] } | undefined;
  if (captureScreenshot && violations.length > 0) {
    try {
      screenshotPaths = await createViolationScreenshots(page, violations, 'test-results');
    } catch (error) {
      console.warn('Failed to capture accessibility violation screenshots:', error);
    }
  }
  
  return {
    violations,
    incomplete,
    passed: violations.length === 0,
    totalViolations: violations.length,
    totalIncomplete: incomplete.length,
    screenshotPaths,
  };
}

/**
 * Run accessibility check on an element in focus/active state
 */
export async function runAccessibilityCheckOnFocus(page: Page, selector: string | Locator) {
  const element = typeof selector === 'string' ? page.locator(selector).first() : selector;
  
  // Focus the element (can be button, input, link, etc.)
  await element.focus();
  
  // Wait a bit for focus effects to apply
  await page.waitForTimeout(100);
  
  // Convert Locator to string selector for AxeBuilder.include()
  const selectorString = await getSelectorFromLocatorOrString(page, selector);
  
  // Run accessibility check
  const accessibilityScanResults = await new AxeBuilder({ page })
    .include(selectorString)
    .analyze();
  
  const violations = accessibilityScanResults.violations;
  const incomplete = accessibilityScanResults.incomplete;
  
  return {
    violations,
    incomplete,
    passed: violations.length === 0,
    totalViolations: violations.length,
    totalIncomplete: incomplete.length,
  };
}

/**
 * Run accessibility check on a modal/popup
 * First opens the modal, then checks it, then closes it
 */
export async function runAccessibilityCheckOnModal(
  page: Page,
  openSelector: string | Locator,
  modalSelector: string | Locator,
  closeSelector?: string | Locator
) {
  const openButton = typeof openSelector === 'string' ? page.locator(openSelector).first() : openSelector;
  const modal = typeof modalSelector === 'string' ? page.locator(modalSelector).first() : modalSelector;
  
  // Open the modal
  await openButton.click();
  
  // Wait for modal to be visible
  await modal.waitFor({ state: 'visible' });
  await page.waitForTimeout(200); // Wait for animations/transitions
  
  // Convert Locator to string selector for AxeBuilder.include()
  const modalSelectorString = await getSelectorFromLocatorOrString(page, modalSelector);
  
  // Run accessibility check on the modal
  const accessibilityScanResults = await new AxeBuilder({ page })
    .include(modalSelectorString)
    .analyze();
  
  const violations = accessibilityScanResults.violations;
  const incomplete = accessibilityScanResults.incomplete;
  
  // Close the modal if close selector is provided
  if (closeSelector) {
    const closeButton = typeof closeSelector === 'string' 
      ? page.locator(closeSelector).first() 
      : closeSelector;
    await closeButton.click();
    await modal.waitFor({ state: 'hidden' }).catch(() => {}); // Modal might close immediately
  } else {
    // Try pressing Escape key as fallback
    await page.keyboard.press('Escape');
    await modal.waitFor({ state: 'hidden' }).catch(() => {});
  }
  
  return {
    violations,
    incomplete,
    passed: violations.length === 0,
    totalViolations: violations.length,
    totalIncomplete: incomplete.length,
  };
}

/**
 * Format accessibility check results for reporting with detailed element information
 */
export function formatAccessibilityReport(
  scanResults: {
    violations: any[];
    incomplete: any[];
    passed: boolean;
    totalViolations: number;
    totalIncomplete: number;
  },
  url?: string
): string {
  // Build summary using unified template
  const summary: ReportItem[] = [
    {
      label: 'Violations',
      value: scanResults.totalViolations,
      status: scanResults.totalViolations === 0 ? 'passed' : 'failed',
    },
    {
      label: 'Incomplete Checks',
      value: scanResults.totalIncomplete,
      status: scanResults.totalIncomplete === 0 ? 'passed' : 'warning',
    },
  ];

  // Build sections for violations and incomplete checks
  const sections: ReportSection[] = [];

  if (scanResults.violations.length > 0) {
    sections.push({
      title: 'Violations',
      items: scanResults.violations.map((violation) => {
        const affectedCount = violation.nodes?.length || 0;
        let details = `Impact: ${violation.impact}`;
        if (violation.helpUrl) {
          details += `\nHelp: ${violation.helpUrl}`;
        }
        if (affectedCount > 0) {
          details += `\nAffected Elements: ${affectedCount}`;
          
          // Add first few element details
          if (violation.nodes && violation.nodes.length > 0) {
            const firstNode = violation.nodes[0];
            if (firstNode.target && Array.isArray(firstNode.target)) {
              const selector = firstNode.target[firstNode.target.length - 1];
              details += `\nExample Selector: ${selector}`;
            }
            if (firstNode.failureSummary) {
              details += `\nIssue: ${firstNode.failureSummary.trim()}`;
            }
          }
        }
        
        return {
          label: `${violation.id}: ${violation.description}`,
          value: affectedCount > 0 ? `${affectedCount} element${affectedCount > 1 ? 's' : ''}` : '0 elements',
          status: 'failed' as const,
          details,
        };
      }),
    });
  }

  if (scanResults.incomplete.length > 0) {
    sections.push({
      title: 'Incomplete Checks (needs manual review)',
      items: scanResults.incomplete.map((incomplete) => {
        const affectedCount = incomplete.nodes?.length || 0;
        let details = `Help: ${incomplete.helpUrl || 'N/A'}`;
        if (affectedCount > 0) {
          details += `\nAffected Elements: ${affectedCount}`;
        }
        
        return {
          label: `${incomplete.id}: ${incomplete.description}`,
          value: affectedCount > 0 ? `${affectedCount} element${affectedCount > 1 ? 's' : ''}` : '0 elements',
          status: 'warning' as const,
          details,
        };
      }),
    });
  }

  // Use unified template
  let report = formatUnifiedReport({
    testName: 'Accessibility Check',
    url,
    summary,
    sections,
  });
  
  // Add screenshot note if sections exist (errors found)
  if (sections.length > 0) {
    report += `\n📸 Screenshots have been captured and attached to the test report.\n`;
  }
  
  return report;
}

