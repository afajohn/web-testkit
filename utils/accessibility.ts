import { Page, Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Interface for accessibility scan results
 */
export interface AccessibilityScanResults {
  violations: any[];
  incomplete: any[];
  passed: boolean;
  totalViolations: number;
  totalIncomplete: number;
}

/**
 * Get a CSS selector string from an axe target array
 */
export function getSelectorFromTarget(target: string[]): string {
  if (!Array.isArray(target) || target.length === 0) {
    return '';
  }
  // Join target array elements with space for compound selectors
  return target.join(' ');
}

/**
 * Run full accessibility audit on the page using axe-core
 */
export async function runAccessibilityCheck(page: Page): Promise<AccessibilityScanResults> {
  try {
    const results = await new AxeBuilder({ page }).analyze();
    
    return {
      violations: results.violations || [],
      incomplete: results.incomplete || [],
      passed: (results.violations || []).length === 0,
      totalViolations: (results.violations || []).length,
      totalIncomplete: (results.incomplete || []).length,
    };
  } catch (error: any) {
    console.error('Error running accessibility check:', error);
    return {
      violations: [],
      incomplete: [],
      passed: false,
      totalViolations: 0,
      totalIncomplete: 0,
    };
  }
}

/**
 * Run accessibility check on a specific element
 */
export async function runAccessibilityCheckOnElement(
  page: Page,
  selector: string | Locator
): Promise<AccessibilityScanResults> {
  try {
    const builder = new AxeBuilder({ page });
    
    // AxeBuilder.include() only accepts string selectors
    if (typeof selector === 'string') {
      builder.include(selector);
    }
    // For Locator, we scan the whole page - filtering is handled by axe
    // Alternatively, we could evaluate the locator to get its selector, but that's complex
    
    const results = await builder.analyze();
    
    return {
      violations: results.violations || [],
      incomplete: results.incomplete || [],
      passed: (results.violations || []).length === 0,
      totalViolations: (results.violations || []).length,
      totalIncomplete: (results.incomplete || []).length,
    };
  } catch (error: any) {
    console.error('Error running accessibility check on element:', error);
    return {
      violations: [],
      incomplete: [],
      passed: false,
      totalViolations: 0,
      totalIncomplete: 0,
    };
  }
}

/**
 * Run accessibility check when an element is hovered
 */
export async function runAccessibilityCheckOnHover(
  page: Page,
  element: string | Locator
): Promise<AccessibilityScanResults> {
  try {
    const locator = typeof element === 'string' ? page.locator(element) : element;
    
    // Hover over the element
    await locator.hover();
    
    // Wait a bit for any hover effects to apply
    await page.waitForTimeout(100);
    
    // Run accessibility check
    // Note: For Locator objects, we scan the whole page
    // To target specific element with Locator, convert to selector string first
    const builder = new AxeBuilder({ page });
    if (typeof element === 'string') {
      builder.include(element);
    }
    const results = await builder.analyze();
    
    return {
      violations: results.violations || [],
      incomplete: results.incomplete || [],
      passed: (results.violations || []).length === 0,
      totalViolations: (results.violations || []).length,
      totalIncomplete: (results.incomplete || []).length,
    };
  } catch (error: any) {
    console.error('Error running accessibility check on hover:', error);
    return {
      violations: [],
      incomplete: [],
      passed: false,
      totalViolations: 0,
      totalIncomplete: 0,
    };
  }
}

/**
 * Run accessibility check when an element is focused/active
 */
export async function runAccessibilityCheckOnFocus(
  page: Page,
  element: string | Locator
): Promise<AccessibilityScanResults> {
  try {
    const locator = typeof element === 'string' ? page.locator(element) : element;
    
    // Focus the element
    await locator.focus();
    
    // Wait a bit for any focus effects to apply
    await page.waitForTimeout(100);
    
    // Run accessibility check
    // Note: For Locator objects, we scan the whole page
    // To target specific element with Locator, convert to selector string first
    const builder = new AxeBuilder({ page });
    if (typeof element === 'string') {
      builder.include(element);
    }
    const results = await builder.analyze();
    
    return {
      violations: results.violations || [],
      incomplete: results.incomplete || [],
      passed: (results.violations || []).length === 0,
      totalViolations: (results.violations || []).length,
      totalIncomplete: (results.incomplete || []).length,
    };
  } catch (error: any) {
    console.error('Error running accessibility check on focus:', error);
    return {
      violations: [],
      incomplete: [],
      passed: false,
      totalViolations: 0,
      totalIncomplete: 0,
    };
  }
}

/**
 * Run accessibility check on a modal/popup
 * Opens the modal, checks it, then closes it
 */
export async function runAccessibilityCheckOnModal(
  page: Page,
  openSelector: string | Locator,
  modalSelector: string | Locator,
  closeSelector?: string | Locator
): Promise<AccessibilityScanResults> {
  try {
    const openLocator = typeof openSelector === 'string' ? page.locator(openSelector) : openSelector;
    const modalLocator = typeof modalSelector === 'string' ? page.locator(modalSelector) : modalSelector;
    
    // Open the modal
    await openLocator.click();
    
    // Wait for modal to appear
    await modalLocator.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(200); // Give time for animations
    
    // Run accessibility check on the modal
    const builder = new AxeBuilder({ page });
    if (typeof modalSelector === 'string') {
      builder.include(modalSelector);
    }
    const results = await builder.analyze();
    
    // Close the modal if close selector is provided
    if (closeSelector) {
      const closeLocator = typeof closeSelector === 'string' ? page.locator(closeSelector) : closeSelector;
      try {
        await closeLocator.click();
        await page.waitForTimeout(200);
      } catch (error) {
        // If closing fails, try pressing Escape
        await page.keyboard.press('Escape');
      }
    } else {
      // Try pressing Escape to close
      await page.keyboard.press('Escape');
    }
    
    return {
      violations: results.violations || [],
      incomplete: results.incomplete || [],
      passed: (results.violations || []).length === 0,
      totalViolations: (results.violations || []).length,
      totalIncomplete: (results.incomplete || []).length,
    };
  } catch (error: any) {
    console.error('Error running accessibility check on modal:', error);
    return {
      violations: [],
      incomplete: [],
      passed: false,
      totalViolations: 0,
      totalIncomplete: 0,
    };
  }
}

/**
 * Format accessibility scan results for console output
 */
export function formatAccessibilityReport(results: AccessibilityScanResults): string {
  let output = '\n=== ACCESSIBILITY AUDIT RESULTS ===\n';
  
  output += `Status: ${results.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
  output += `Total Violations: ${results.totalViolations}\n`;
  output += `Total Incomplete: ${results.totalIncomplete}\n\n`;
  
  if (results.totalViolations === 0 && results.totalIncomplete === 0) {
    output += '✅ No accessibility issues found!\n';
    return output;
  }
  
  // Format violations
  if (results.violations && results.violations.length > 0) {
    output += '❌ VIOLATIONS (Must Fix):\n';
    output += '─'.repeat(70) + '\n';
    
    results.violations.forEach((violation: any, index: number) => {
      output += `\n${index + 1}. ${violation.id} - ${violation.impact || 'Unknown'} Impact\n`;
      output += `   Description: ${violation.description || 'No description'}\n`;
      output += `   Help: ${violation.help || 'No help available'}\n`;
      output += `   Help URL: ${violation.helpUrl || 'N/A'}\n`;
      
      if (violation.nodes && violation.nodes.length > 0) {
        output += `   Affected Elements (${violation.nodes.length}):\n`;
        violation.nodes.forEach((node: any, nodeIndex: number) => {
          const selector = node.selector || getSelectorFromTarget(node.target || []);
          output += `     ${nodeIndex + 1}. ${selector || 'Unknown selector'}\n`;
          
          if (node.failureSummary) {
            output += `        ${node.failureSummary.trim()}\n`;
          }
          
          if (node.html) {
            // Truncate HTML if too long
            const htmlPreview = node.html.length > 100 
              ? node.html.substring(0, 100) + '...' 
              : node.html;
            output += `        HTML: ${htmlPreview}\n`;
          }
        });
      }
      
      output += '\n';
    });
  }
  
  // Format incomplete (needs manual review)
  if (results.incomplete && results.incomplete.length > 0) {
    output += '⚠️  INCOMPLETE (Needs Review):\n';
    output += '─'.repeat(70) + '\n';
    
    results.incomplete.forEach((incomplete: any, index: number) => {
      output += `\n${index + 1}. ${incomplete.id}\n`;
      output += `   Description: ${incomplete.description || 'No description'}\n`;
      
      if (incomplete.nodes && incomplete.nodes.length > 0) {
        output += `   Elements to Review (${incomplete.nodes.length}):\n`;
        incomplete.nodes.forEach((node: any, nodeIndex: number) => {
          const selector = node.selector || getSelectorFromTarget(node.target || []);
          output += `     ${nodeIndex + 1}. ${selector || 'Unknown selector'}\n`;
        });
      }
      
      output += '\n';
    });
  }
  
  return output;
}
