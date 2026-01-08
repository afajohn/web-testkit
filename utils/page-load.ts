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
    waitUntil = 'networkidle',
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
  await page.waitForTimeout(500);
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
    // Navigate to the URL with networkidle as default
    const gotoOptions: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'; timeout?: number } = {
      waitUntil: options.waitUntil || 'networkidle',
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
    await page.waitForTimeout(500);
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

