import { test, expect } from '@playwright/test';
import {
  runAccessibilityCheckOnHover,
  runAccessibilityCheckOnFocus,
  runAccessibilityCheckOnModal,
  formatAccessibilityReport,
} from '../utils/accessibility';
import { gotoAndWait } from '../utils/page-load';

const DEFAULT_TEST_URL = process.env.TEST_URL || process.env.URL_AUDIT_URL || 'https://anewbride.com/';

/**
 * Interactive accessibility tests
 * These tests check accessibility in different interaction states:
 * - Hovered buttons
 * - Focused/active buttons
 * - Open modals/popups
 */
test.describe('Interactive Accessibility Testing', () => {
  test('check accessibility on hovered buttons', async ({ page }) => {
    await gotoAndWait(page, DEFAULT_TEST_URL);
    
    // Find all buttons on the page
    const buttons = await page.locator('button').all();
    
    if (buttons.length === 0) {
      console.log('No buttons found on the page');
      return;
    }

    console.log(`Found ${buttons.length} buttons to test\n`);

    // Test first few buttons (adjust as needed)
    const buttonsToTest = buttons.slice(0, 5);
    
    for (let i = 0; i < buttonsToTest.length; i++) {
      const button = buttonsToTest[i];
      const buttonText = await button.textContent().catch(() => 'unknown');
      
      console.log(`Testing button ${i + 1}: "${buttonText?.trim()}"`);
      
      try {
        const scanResults = await runAccessibilityCheckOnHover(page, button);
        console.log(await formatAccessibilityReport(scanResults));
        
        // Optionally fail test if violations found
        // expect(scanResults.passed).toBe(true);
      } catch (error: any) {
        console.warn(`  ⚠️  Could not test button: ${error.message}`);
      }
      
      console.log('');
    }
  });

  test('check accessibility on focused buttons', async ({ page }) => {
    await gotoAndWait(page, DEFAULT_TEST_URL);
    
    // Find all interactive elements (buttons, links, inputs)
    const buttons = await page.locator('button, a[href], input, select, textarea').all();
    
    if (buttons.length === 0) {
      console.log('No interactive elements found on the page');
      return;
    }

    console.log(`Found ${buttons.length} interactive elements to test\n`);

    // Test first few elements
    const elementsToTest = buttons.slice(0, 5);
    
    for (let i = 0; i < elementsToTest.length; i++) {
      const element = elementsToTest[i];
      let elementText = await element.textContent().catch(() => null);
      if (!elementText) {
        elementText = await element.getAttribute('aria-label').catch(() => 'unknown');
      }
      
      console.log(`Testing focused element ${i + 1}: "${elementText?.trim()}"`);
      
      try {
        const scanResults = await runAccessibilityCheckOnFocus(page, element);
        console.log(await formatAccessibilityReport(scanResults));
        
        // Optionally fail test if violations found
        // expect(scanResults.passed).toBe(true);
      } catch (error: any) {
        console.warn(`  ⚠️  Could not test element: ${error.message}`);
      }
      
      console.log('');
    }
  });

  test('check accessibility on modals/popups', async ({ page }) => {
    await gotoAndWait(page, DEFAULT_TEST_URL);
    
    // Example: Find buttons that might open modals
    // You'll need to adjust selectors based on your site's structure
    const modalTriggers = await page.locator('[data-modal], [data-popup], [aria-haspopup="true"]').all();
    
    if (modalTriggers.length === 0) {
      console.log('No modal triggers found. Add custom selectors for your modals.');
      console.log('Example selectors: [data-modal], button[aria-haspopup="true"], .modal-trigger');
      return;
    }

    console.log(`Found ${modalTriggers.length} potential modal triggers\n`);

    // Test first modal (adjust as needed)
    const trigger = modalTriggers[0];
    
    try {
      // You need to provide the correct modal selector for your site
      // This is an example - adjust based on your modal structure
      const modalSelector = '.modal, [role="dialog"], [role="alertdialog"]';
      
      const scanResults = await runAccessibilityCheckOnModal(
        page,
        trigger,
        modalSelector,
        '[data-close], .close, button[aria-label*="close" i]' // Close button selector
      );
      
      console.log('Modal Accessibility Check:');
      console.log(formatAccessibilityReport(scanResults));
      
      // Optionally fail test if violations found
      // expect(scanResults.passed).toBe(true);
    } catch (error: any) {
      console.warn(`⚠️  Could not test modal: ${error.message}`);
      console.log('Hint: You may need to adjust the modal selectors in the test');
    }
  });

  test('custom: test specific button on hover', async ({ page }) => {
    await gotoAndWait(page, DEFAULT_TEST_URL);
    
    // Example: Test a specific button by selector
    // Adjust the selector to match your button
    const buttonSelector = 'button:has-text("Submit"), button.primary, [role="button"]';
    
    const button = page.locator(buttonSelector).first();
    const isVisible = await button.isVisible().catch(() => false);
    
    if (!isVisible) {
      console.log(`Button not found with selector: ${buttonSelector}`);
      console.log('Adjust the selector to match your button');
      return;
    }
    
    const scanResults = await runAccessibilityCheckOnHover(page, button);
    console.log(formatAccessibilityReport(scanResults));
    expect(scanResults.passed).toBe(true);
  });

  test('custom: test specific modal accessibility', async ({ page }) => {
    await gotoAndWait(page, DEFAULT_TEST_URL);
    
    // Example: Test a specific modal
    // Adjust these selectors to match your modal structure
    const openButtonSelector = 'button:has-text("Open Modal"), [data-open-modal]';
    const modalSelector = '.modal-content, [role="dialog"]';
    const closeButtonSelector = '.modal-close, button:has-text("Close")';
    
    try {
      const scanResults = await runAccessibilityCheckOnModal(
        page,
        openButtonSelector,
        modalSelector,
        closeButtonSelector
      );
      
      console.log(formatAccessibilityReport(scanResults));
      expect(scanResults.passed).toBe(true);
    } catch (error: any) {
      console.warn(`⚠️  Modal test failed: ${error.message}`);
      console.log('Adjust the selectors in the test to match your modal structure');
      throw error;
    }
  });
});

