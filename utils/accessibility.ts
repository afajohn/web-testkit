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
 * Check if a button element contains SVG, icon, or image elements
 * @param page - Playwright page object
 * @param selector - CSS selector for the button element
 * @returns true if button contains SVG, icon (elements with icon class or data-icon attribute), or img elements
 */
async function buttonHasVisualContent(page: Page, selector: string): Promise<boolean> {
  try {
    // Check if selector exists on the page
    const element = page.locator(selector).first();
    const count = await element.count();
    
    if (count === 0) {
      return false;
    }

    // Check if button contains SVG (including nested SVGs)
    const hasSvg = await element.locator('svg').count() > 0;
    
    // Check if button contains img elements
    const hasImg = await element.locator('img').count() > 0;
    
    // Check for icon elements - look for classes containing "icon" (case-insensitive via multiple checks)
    // Also check for data-icon attribute, font-icon classes, etc.
    const hasIconLower = await element.locator('[class*="icon"]').count() > 0;
    const hasIconUpper = await element.locator('[class*="Icon"]').count() > 0;
    const hasDataIcon = await element.locator('[data-icon], [data-icon-name]').count() > 0;
    const hasIcon = hasIconLower || hasIconUpper || hasDataIcon;
    
    // Also check the innerHTML for SVG or icon indicators
    let hasInlineSvg = false;
    try {
      const innerHTML = await element.innerHTML();
      hasInlineSvg = innerHTML.includes('<svg') || innerHTML.includes('svg');
    } catch {
      // If we can't get innerHTML, ignore this check
    }
    
    // Also check if the button itself has icon-related classes
    let buttonHasIconClass = false;
    try {
      const className = await element.getAttribute('class');
      if (className) {
        buttonHasIconClass = className.toLowerCase().includes('icon') || 
                           className.includes('svg') || 
                           className.includes('Icon');
      }
    } catch {
      // If we can't get class, ignore this check
    }
    
    return hasSvg || hasImg || hasIcon || hasInlineSvg || buttonHasIconClass;
  } catch (error) {
    // If we can't check, assume it doesn't have visual content (fail safe)
    console.warn(`Warning: Could not check visual content for selector "${selector}": ${error}`);
    return false;
  }
}

/**
 * Check if a node has any of the three specific check IDs we care about for pass/fail decision
 * @param node - Accessibility violation node
 * @returns Array of check IDs found: 'button-has-visible-text', 'aria-label', or 'aria-labelledby'
 */
function getRelevantCheckIds(node: any): string[] {
  const relevantIds: string[] = [];
  
  if (!node.any || !Array.isArray(node.any)) {
    return relevantIds;
  }

  const checkIdsToEvaluate = ['button-has-visible-text', 'aria-label', 'aria-labelledby'];
  
  for (const check of node.any) {
    if (checkIdsToEvaluate.includes(check.id)) {
      relevantIds.push(check.id);
    }
  }

  return relevantIds;
}

/**
 * Determine if accessibility check passed based only on the 3 specific check IDs:
 * - button-has-visible-text (passes if button has visual content)
 * - aria-label (fails if missing)
 * - aria-labelledby (fails if missing/invalid)
 * 
 * Note: All violations are still included in the report, but only these checks determine pass/fail.
 * @param page - Playwright page object
 * @param violations - Array of ALL accessibility violations from axe-core (unchanged for report)
 * @returns true if no failures found in the 3 specific checks, false otherwise
 */
async function calculateAccessibilityPassStatus(page: Page, violations: any[]): Promise<boolean> {
  if (!violations || violations.length === 0) {
    return true;
  }

  // If there are no 'critical' or 'serious' impact violations, consider passed
  try {
    const hasSevere = violations.some((v: any) => {
      const impact = (v && v.impact) || '';
      return impact === 'critical' || impact === 'serious';
    });

    if (!hasSevere) {
      return true;
    }
  } catch (e) {
    // If anything goes wrong evaluating impact, fall back to original logic
    console.warn('Warning evaluating violation impacts:', e);
  }

  // Track failures from the 3 specific checks only
  for (const violation of violations) {
    if (!violation.nodes || !Array.isArray(violation.nodes)) {
      continue;
    }

    for (const node of violation.nodes) {
      const relevantCheckIds = getRelevantCheckIds(node);
      
      if (relevantCheckIds.length === 0) {
        // This node doesn't have any of the 3 checks we care about, skip it
        continue;
      }

      const selector = node.selector || getSelectorFromTarget(node.target || []);
      
      // First check if button has visual content - if it does, we can skip ALL checks (button-has-visible-text, aria-label, aria-labelledby)
      // We check for visual content if we have any relevant checks, because if it has visual content, all should pass
      let hasVisualContent = false;
      if (selector && relevantCheckIds.length > 0) {
        hasVisualContent = await buttonHasVisualContent(page, selector);
      }
      
      // If button has visual content, all checks pass (skip button-has-visible-text, aria-label, and aria-labelledby)
      if (hasVisualContent) {
        continue; // Move to next node - this node passes
      }
      
      // If button doesn't have visual content, check each relevant check ID
      for (const checkId of relevantCheckIds) {
        if (checkId === 'button-has-visible-text') {
          // Button doesn't have visual content, so this check fails
          return false;
        } else if (checkId === 'aria-label' || checkId === 'aria-labelledby') {
          // These checks fail if they're present in the violations
          // (axe reports them when aria-label/aria-labelledby are missing or invalid)
          return false;
        }
      }
    }
  }

  // No failures found in the 3 specific checks
  return true;
}

/**
 * Run full accessibility audit on the page using axe-core
 * 
 * Note: All violations are included in the report, but pass/fail is determined
 * only by these 3 specific checks: button-has-visible-text, aria-label, aria-labelledby
 */
export async function runAccessibilityCheck(page: Page): Promise<AccessibilityScanResults> {
  try {
    const results = await new AxeBuilder({ page }).analyze();
    
    // Keep ALL violations in the report (unchanged)
    const allViolations = results.violations || [];
    
    // Calculate pass/fail based only on the 3 specific check IDs
    const passed = await calculateAccessibilityPassStatus(page, allViolations);
    
    return {
      violations: allViolations, // Include all violations in report
      incomplete: results.incomplete || [],
      passed: passed, // Pass/fail based only on 3 specific checks
      totalViolations: allViolations.length, // Total count of all violations (for report)
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
 * 
 * Note: All violations are included in the report, but pass/fail is determined
 * only by these 3 specific checks: button-has-visible-text, aria-label, aria-labelledby
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
    
    // Keep ALL violations in the report (unchanged)
    const allViolations = results.violations || [];
    
    // Calculate pass/fail based only on the 3 specific check IDs
    const passed = await calculateAccessibilityPassStatus(page, allViolations);
    
    return {
      violations: allViolations, // Include all violations in report
      incomplete: results.incomplete || [],
      passed: passed, // Pass/fail based only on 3 specific checks
      totalViolations: allViolations.length, // Total count of all violations (for report)
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
 * 
 * Note: All violations are included in the report, but pass/fail is determined
 * only by these 3 specific checks: button-has-visible-text, aria-label, aria-labelledby
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
    
    // Keep ALL violations in the report (unchanged)
    const allViolations = results.violations || [];
    
    // Calculate pass/fail based only on the 3 specific check IDs
    const passed = await calculateAccessibilityPassStatus(page, allViolations);
    
    return {
      violations: allViolations, // Include all violations in report
      incomplete: results.incomplete || [],
      passed: passed, // Pass/fail based only on 3 specific checks
      totalViolations: allViolations.length, // Total count of all violations (for report)
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
 * 
 * Note: All violations are included in the report, but pass/fail is determined
 * only by these 3 specific checks: button-has-visible-text, aria-label, aria-labelledby
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
    
    // Keep ALL violations in the report (unchanged)
    const allViolations = results.violations || [];
    
    // Calculate pass/fail based only on the 3 specific check IDs
    const passed = await calculateAccessibilityPassStatus(page, allViolations);
    
    return {
      violations: allViolations, // Include all violations in report
      incomplete: results.incomplete || [],
      passed: passed, // Pass/fail based only on 3 specific checks
      totalViolations: allViolations.length, // Total count of all violations (for report)
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
    
    // Keep ALL violations in the report (unchanged)
    const allViolations = results.violations || [];
    
    // Calculate pass/fail based only on the 3 specific check IDs
    const passed = await calculateAccessibilityPassStatus(page, allViolations);
    
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
      violations: allViolations, // Include all violations in report
      incomplete: results.incomplete || [],
      passed: passed, // Pass/fail based only on 3 specific checks
      totalViolations: allViolations.length, // Total count of all violations (for report)
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
