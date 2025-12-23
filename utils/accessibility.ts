import { Page, Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Run accessibility audit using axe-core
 */
export async function runAccessibilityCheck(page: Page) {
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  
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
 * Run accessibility check on a specific element (useful for modals, dropdowns, etc.)
 */
export async function runAccessibilityCheckOnElement(page: Page, selector: string | Locator) {
  const element = typeof selector === 'string' ? page.locator(selector).first() : selector;
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .include(element)
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
 * Run accessibility check on an element in hover state
 */
export async function runAccessibilityCheckOnHover(page: Page, selector: string | Locator) {
  const element = typeof selector === 'string' ? page.locator(selector).first() : selector;
  
  // Hover over the element
  await element.hover();
  
  // Wait a bit for hover effects to apply
  await page.waitForTimeout(100);
  
  // Run accessibility check
  const accessibilityScanResults = await new AxeBuilder({ page })
    .include(element)
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
 * Run accessibility check on an element in focus/active state
 */
export async function runAccessibilityCheckOnFocus(page: Page, selector: string | Locator) {
  const element = typeof selector === 'string' ? page.locator(selector).first() : selector;
  
  // Focus the element (can be button, input, link, etc.)
  await element.focus();
  
  // Wait a bit for focus effects to apply
  await page.waitForTimeout(100);
  
  // Run accessibility check
  const accessibilityScanResults = await new AxeBuilder({ page })
    .include(element)
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
  
  // Run accessibility check on the modal
  const accessibilityScanResults = await new AxeBuilder({ page })
    .include(modal)
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
export function formatAccessibilityReport(scanResults: {
  violations: any[];
  incomplete: any[];
  passed: boolean;
  totalViolations: number;
  totalIncomplete: number;
}): string {
  if (scanResults.passed && scanResults.incomplete.length === 0) {
    return '✅ No accessibility violations found!';
  }

  let report = `Accessibility Check Results:\n`;
  report += `  Violations: ${scanResults.totalViolations}\n`;
  report += `  Incomplete: ${scanResults.totalIncomplete}\n\n`;

  if (scanResults.violations.length > 0) {
    report += 'Violations:\n';
    for (const violation of scanResults.violations) {
      report += `  ❌ ${violation.id}: ${violation.description}\n`;
      report += `     Impact: ${violation.impact}\n`;
      
      if (violation.helpUrl) {
        report += `     Help: ${violation.helpUrl}\n`;
      }
      
      if (violation.nodes && violation.nodes.length > 0) {
        report += `     Affected elements: ${violation.nodes.length}\n\n`;
        
        // Detail each affected element
        violation.nodes.forEach((node: any, index: number) => {
          report += `     Element ${index + 1}:\n`;
          
          // CSS Selector/Target
          if (node.target && Array.isArray(node.target) && node.target.length > 0) {
            // axe-core provides target as an array of selectors, use the most specific one
            const selector = node.target[node.target.length - 1];
            report += `        Selector: ${selector}\n`;
            if (node.target.length > 1) {
              report += `        Full path: ${node.target.join(' > ')}\n`;
            }
          } else if (node.target) {
            report += `        Target: ${JSON.stringify(node.target)}\n`;
          }
          
          // HTML snippet
          if (node.html) {
            // Truncate very long HTML snippets
            const htmlSnippet = node.html.length > 200 
              ? node.html.substring(0, 200) + '...' 
              : node.html;
            report += `        HTML: ${htmlSnippet}\n`;
          }
          
          // Failure summary
          if (node.failureSummary) {
            report += `        Issue: ${node.failureSummary.trim()}\n`;
          }
          
          // Related checks (any that passed, all that failed, none that completely failed)
          if (node.any && node.any.length > 0) {
            report += `        Related checks (any): ${node.any.map((check: any) => check.message || check.id).join(', ')}\n`;
          }
          if (node.all && node.all.length > 0) {
            report += `        Related checks (all): ${node.all.map((check: any) => check.message || check.id).join(', ')}\n`;
          }
          if (node.none && node.none.length > 0) {
            report += `        Related checks (none): ${node.none.map((check: any) => check.message || check.id).join(', ')}\n`;
          }
          
          report += '\n';
        });
      } else {
        report += '\n';
      }
    }
  }

  if (scanResults.incomplete.length > 0) {
    report += 'Incomplete (needs manual review):\n';
    for (const incomplete of scanResults.incomplete) {
      report += `  ⚠️  ${incomplete.id}: ${incomplete.description}\n`;
      
      if (incomplete.helpUrl) {
        report += `     Help: ${incomplete.helpUrl}\n`;
      }
      
      // Show affected elements for incomplete checks too
      if (incomplete.nodes && incomplete.nodes.length > 0) {
        report += `     Affected elements: ${incomplete.nodes.length}\n`;
        
        incomplete.nodes.forEach((node: any, index: number) => {
          report += `     Element ${index + 1}:\n`;
          
          if (node.target && Array.isArray(node.target) && node.target.length > 0) {
            const selector = node.target[node.target.length - 1];
            report += `        Selector: ${selector}\n`;
            if (node.target.length > 1) {
              report += `        Full path: ${node.target.join(' > ')}\n`;
            }
          }
          
          if (node.html) {
            const htmlSnippet = node.html.length > 200 
              ? node.html.substring(0, 200) + '...' 
              : node.html;
            report += `        HTML: ${htmlSnippet}\n`;
          }
          
          if (node.failureSummary) {
            report += `        Issue: ${node.failureSummary.trim()}\n`;
          }
          
          report += '\n';
        });
      }
      
      report += '\n';
    }
  }

  return report;
}

