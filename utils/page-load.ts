import { Page } from '@playwright/test';

/**
 * Wait for page to be fully loaded
 * This ensures the page is completely loaded before running tests
 */
export async function waitForPageLoad(
  page: Page,
  options: {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    timeout?: number;
    waitForSelector?: string;
  } = {}
): Promise<void> {
  const {
    waitUntil = 'load', // Changed from 'networkidle' to 'load' for faster execution
    timeout = 60000, // STRICTLY ENFORCED: 60 seconds default timeout
    waitForSelector,
  } = options;

  // Wait for the page to reach the desired load state
  await page.waitForLoadState(waitUntil, { timeout });

  // Optionally wait for a specific selector to be visible
  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { 
      state: 'visible',
      timeout: timeout 
    }).catch(() => {
      // If selector doesn't exist, continue anyway
      console.warn(`Warning: Selector "${waitForSelector}" not found, continuing...`);
    });
  }

  // Additional wait for any pending JavaScript/animations
  // Reduced from 500ms to 200ms - sufficient for most dynamic content
  await page.waitForTimeout(200);
}

/**
 * Navigate to URL and wait for full page load
 * Convenience function that combines goto() and waitForPageLoad()
 * Includes error handling with URL context
 */
export async function gotoAndWait(
  page: Page,
  url: string,
  options: {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    timeout?: number;
    waitForSelector?: string;
  } = {}
): Promise<void> {
  const urlBeforeNavigation = url;
  let urlAfterNavigation = urlBeforeNavigation;

  try {
    // Navigate to the URL with 'load' as default (faster than 'networkidle')
    // 'load' waits for load event, 'networkidle' waits for network to be idle for 500ms
    // Using 'load' is faster and still ensures page is fully loaded
    const gotoOptions: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'; timeout?: number } = {
      waitUntil: options.waitUntil || 'load', // Changed from 'networkidle' to 'load' for faster execution
      timeout: options.timeout || 60000, // STRICTLY ENFORCED: 60 seconds default timeout
    };

    await page.goto(url, gotoOptions);
    
    // Get the actual URL after navigation (in case of redirects)
    try {
      urlAfterNavigation = page.url();
      if (urlAfterNavigation !== urlBeforeNavigation) {
        console.log(`Note: Redirected from ${urlBeforeNavigation} to ${urlAfterNavigation}`);
      }
    } catch {
      // If we can't get the URL, continue
    }

    // Wait for additional page load conditions
    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, {
        state: 'visible',
        timeout: options.timeout || 60000, // STRICTLY ENFORCED: 60 seconds default timeout
      }).catch(() => {
        console.warn(`Warning: Selector "${options.waitForSelector}" not found, continuing...`);
      });
    }

    // Small delay to ensure all dynamic content is loaded
    // Reduced from 500ms to 200ms - sufficient for most dynamic content
    await page.waitForTimeout(200);
  } catch (error: any) {
    // Enhanced error with URL context
    try {
      urlAfterNavigation = page.url();
    } catch {
      // If we can't get the URL, use the original
    }
    
    const errorMessage = error.message || String(error);
    const enhancedError = new Error(
      `Failed to navigate to ${urlBeforeNavigation}\n` +
      `URL before navigation: ${urlBeforeNavigation}\n` +
      `URL after navigation: ${urlAfterNavigation}\n` +
      `Original error: ${errorMessage}`
    );
    enhancedError.stack = error.stack;
    throw enhancedError;
  }
}

