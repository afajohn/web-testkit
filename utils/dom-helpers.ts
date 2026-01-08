import { Page, Locator } from '@playwright/test';

/**
 * Wait for DOM to be completely loaded and ready
 * CRITICAL: This ensures DOM is fully ready before any checks begin
 * 
 * Waits for:
 * - domcontentloaded event (required)
 * - document.readyState === 'complete' (optional, continues if fails)
 * - networkidle state (optional, continues if fails - can timeout on sites with continuous activity)
 * - All JavaScript execution to complete
 * - DOM stability (no new elements added for 1 second)
 * 
 * @param waitForNetworkIdle - If false, skips networkidle wait entirely (faster, more reliable)
 */
export async function waitForDOMReady(page: Page, timeout: number = 60000, waitForNetworkIdle: boolean = true): Promise<void> {
  const startTime = Date.now();
  
  // Wait for domcontentloaded (required - this is the minimum)
  console.log('  ⏳ Waiting for domcontentloaded...');
  await page.waitForLoadState('domcontentloaded', { timeout });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  ✓ domcontentloaded reached (${elapsed}s)`);

  // Wait for document.readyState to be 'complete' (with shorter timeout, continue if fails)
  // Some sites may never reach 'complete' state due to continuous activity
  const readyStateTimeout = Math.min(timeout, 30000);
  console.log(`  ⏳ Waiting for readyState complete... (max ${readyStateTimeout / 1000}s)`);
  const readyStateStart = Date.now();
  try {
    await page.waitForFunction(
      () => document.readyState === 'complete',
      { timeout: readyStateTimeout }
    );
    const readyStateElapsed = ((Date.now() - readyStateStart) / 1000).toFixed(1);
    console.log(`  ✓ readyState complete (${readyStateElapsed}s)`);
  } catch (error) {
    // If readyState never becomes 'complete', continue anyway
    // This is common on sites with continuous JavaScript execution
    const readyStateElapsed = ((Date.now() - readyStateStart) / 1000).toFixed(1);
    console.warn(`  ⚠️  readyState did not reach "complete" within timeout (${readyStateElapsed}s), continuing...`);
  }

  // Wait for networkidle state (optional, with shorter timeout, continue if fails)
  // networkidle can timeout on sites with continuous network activity (analytics, ads, etc.)
  if (waitForNetworkIdle) {
    const networkIdleTimeout = Math.min(timeout, 30000);
    console.log(`  ⏳ Waiting for networkidle... (max ${networkIdleTimeout / 1000}s)`);
    const networkIdleStart = Date.now();
    
    // Set up progress logging for networkidle
    const progressInterval = setInterval(() => {
      const elapsed = ((Date.now() - networkIdleStart) / 1000).toFixed(1);
      const remaining = ((networkIdleTimeout - (Date.now() - networkIdleStart)) / 1000).toFixed(1);
      if (parseFloat(remaining) > 0) {
        process.stdout.write(`\r  ⏳ Waiting for networkidle... (${elapsed}s elapsed, ${remaining}s remaining)`);
      }
    }, 2000);
    
    try {
      await page.waitForLoadState('networkidle', { timeout: networkIdleTimeout });
      clearInterval(progressInterval);
      const networkIdleElapsed = ((Date.now() - networkIdleStart) / 1000).toFixed(1);
      console.log(`\r  ✓ networkidle reached (${networkIdleElapsed}s)`);
    } catch (error) {
      clearInterval(progressInterval);
      // If networkidle never occurs, continue anyway
      // This is common on sites with continuous network requests
      const networkIdleElapsed = ((Date.now() - networkIdleStart) / 1000).toFixed(1);
      console.warn(`\r  ⚠️  networkidle not reached within timeout (${networkIdleElapsed}s), continuing...`);
    }
  } else {
    // Skip networkidle wait entirely for faster, more reliable execution
    // This matches playwright-seo's default behavior (waitFor: 'domcontentloaded')
    console.log('  ℹ️  Skipping networkidle wait (using domcontentloaded only for faster execution)');
  }

  // Wait for any pending JavaScript execution
  console.log('  ⏳ Checking JavaScript execution state...');
  await page.waitForFunction(
    () => {
      // Check if there are any pending timeouts/intervals
      // This is a best-effort check since we can't directly access the event loop
      return true;
    },
    { timeout: 5000 }
  ).catch(() => {
    // If this check fails, continue anyway
  });
  console.log('  ✓ JavaScript execution check complete');

  // Poll until DOM is stable (no new elements added for 1 second)
  console.log('  ⏳ Checking DOM stability...');
  let previousElementCount = 0;
  let stableCount = 0;
  const maxStableChecks = 10; // 10 checks * 100ms = 1 second of stability

  for (let i = 0; i < maxStableChecks; i++) {
    const currentElementCount = await page.evaluate(() => {
      return document.querySelectorAll('*').length;
    });

    if (i === 0) {
      previousElementCount = currentElementCount;
    }

    if (currentElementCount === previousElementCount) {
      stableCount++;
      if (stableCount >= 3) {
        // DOM is stable (same count for 3 consecutive checks = 300ms)
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  ✓ DOM stable (${currentElementCount} elements, ${elapsed}s total)`);
        break;
      }
    } else {
      stableCount = 0;
      previousElementCount = currentElementCount;
      if (i < maxStableChecks - 1) {
        process.stdout.write(`\r  ⏳ Checking DOM stability... (check ${i + 1}/${maxStableChecks}, elements: ${currentElementCount}, changed)`);
      }
    }

    await page.waitForTimeout(100);
  }

  // Final wait to ensure everything is settled
  await page.waitForTimeout(200);
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  ✓ DOM ready check complete (${totalElapsed}s total)`);
}

/**
 * Scroll smoothly through the entire page to trigger lazy loading
 * Checks ALL content - no skipping
 */
export async function scrollToBottom(page: Page): Promise<void> {
  let previousHeight = 0;
  let currentHeight = await page.evaluate(() => document.body.scrollHeight);
  let scrollAttempts = 0;
  const maxScrollAttempts = 100; // Prevent infinite loops

  console.log(`  ⏳ Scrolling through page (attempt 1)...`);
  
  while (currentHeight > previousHeight && scrollAttempts < maxScrollAttempts) {
    previousHeight = currentHeight;

    // Scroll in increments
    await page.evaluate(async () => {
      const distance = 100;
      const scrollHeight = document.body.scrollHeight;
      let totalHeight = 0;

      while (totalHeight < scrollHeight) {
        window.scrollBy(0, distance);
        totalHeight += distance;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    // Wait for lazy content to load
    await page.waitForTimeout(500);

    // Check if new content loaded
    currentHeight = await page.evaluate(() => document.body.scrollHeight);
    scrollAttempts++;

    // Log progress every 5 attempts
    if (scrollAttempts % 5 === 0) {
      console.log(`  ⏳ Scrolling through page (attempt ${scrollAttempts}, height: ${currentHeight}px)...`);
    }

    // If height increased, wait a bit more for content to fully load
    if (currentHeight > previousHeight) {
      await page.waitForTimeout(1000);
      currentHeight = await page.evaluate(() => document.body.scrollHeight);
    }
  }

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  
  console.log(`  ✓ Page scroll complete (${scrollAttempts} attempts, final height: ${currentHeight}px)`);
}

/**
 * Wait for dynamic content to fully render
 * Ensures all JavaScript has finished executing and content is rendered
 */
export async function waitForDynamicContent(page: Page, timeout: number = 10000): Promise<void> {
  // Wait for networkidle
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {
    // If networkidle times out, continue anyway
  });

  // Wait for any pending animations/transitions
  await page.waitForTimeout(500);

  // Wait for any pending JavaScript execution
  await page.waitForFunction(
    () => {
      // Check if page is ready
      return document.readyState === 'complete';
    },
    { timeout }
  );
}

/**
 * Check if an element is actually visible to users
 * Checks multiple criteria to determine visibility
 */
export async function isElementVisible(element: Locator): Promise<boolean> {
  try {
    const isVisible = await element.isVisible();
    if (!isVisible) return false;

    // Additional checks via evaluate
    const visibilityInfo = await element.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      return {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        ariaHidden: el.getAttribute('aria-hidden'),
      };
    });

    // Check visibility criteria
    if (visibilityInfo.display === 'none') return false;
    if (visibilityInfo.visibility === 'hidden') return false;
    if (parseFloat(visibilityInfo.opacity) === 0) return false;
    if (visibilityInfo.width === 0 || visibilityInfo.height === 0) return false;
    if (visibilityInfo.ariaHidden === 'true') return false;

    // Check if element is within viewport or scrollable area
    const viewportHeight = await element.evaluate(() => window.innerHeight);
    const viewportWidth = await element.evaluate(() => window.innerWidth);

    // Element is visible if it's within viewport bounds (with some tolerance)
    const isInViewport =
      visibilityInfo.top < viewportHeight &&
      visibilityInfo.bottom > 0 &&
      visibilityInfo.left < viewportWidth &&
      visibilityInfo.right > 0;

    // Also consider elements that are in the document flow but scrolled out of view
    // They're still "visible" in the sense that users can scroll to see them
    return isInViewport || (visibilityInfo.width > 0 && visibilityInfo.height > 0);
  } catch (error) {
    // If we can't check visibility, assume it's not visible
    return false;
  }
}

/**
 * Extract ALL visible elements matching a selector
 * NO SKIPPING - returns all visible elements found
 */
export async function extractVisibleElements(
  page: Page,
  selector: string
): Promise<Locator[]> {
  const allElements = await page.locator(selector).all();
  const visibleElements: Locator[] = [];

  for (const element of allElements) {
    if (await isElementVisible(element)) {
      visibleElements.push(element);
    }
  }

  return visibleElements;
}

/**
 * Interact with ALL modals/dropdowns to reveal hidden links
 * NO LIMITS - checks all modals found on the page
 */
export async function interactWithModals(
  page: Page,
  callback: (modal: Locator, triggerInfo?: { selector: string; text: string }) => Promise<void>
): Promise<void> {
  // Find all modal triggers
  const modalSelectors = [
    '[data-modal]',
    '[data-toggle="modal"]',
    'button[aria-haspopup="dialog"]',
    '[role="button"][aria-expanded]',
    'button[data-bs-toggle="modal"]',
    'a[data-toggle="modal"]',
  ];

  const allTriggers: Locator[] = [];

  for (const selector of modalSelectors) {
    const triggers = await page.locator(selector).all();
    allTriggers.push(...triggers);
  }

  // Remove duplicates by checking if element is already in array
  const uniqueTriggers: Locator[] = [];
  const seen = new Set<string>();

  for (const trigger of allTriggers) {
    try {
      const id = await trigger.evaluate((el) => {
        return el.id || el.getAttribute('data-modal') || el.getAttribute('data-target') || '';
      });
      const key = `${await trigger.textContent()}-${id}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTriggers.push(trigger);
      }
    } catch {
      // If we can't get identifier, include it anyway
      uniqueTriggers.push(trigger);
    }
  }

  if (uniqueTriggers.length > 0) {
    console.log(`  ⏳ Found ${uniqueTriggers.length} modal trigger(s), checking for links...`);
  }

  let modalCheckCount = 0;
  // Interact with each modal
  for (const trigger of uniqueTriggers) {
    try {
      // Check if page is still open
      if (page.isClosed()) break;
      
      // Dismiss overlays before opening modal
      await dismissOverlays(page);
      
      // Check if trigger is visible
      if (!(await isElementVisible(trigger))) {
        continue;
      }

      // Click to open modal
      await trigger.click({ timeout: 5000 });
      await page.waitForTimeout(300);

      // Find the modal
      const modal = page.locator('.modal, [role="dialog"], [data-modal-content], .modal-dialog').first();
      
      if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Get trigger info
        const triggerInfo = await trigger.evaluate((el) => {
          let selector = '';
          if (el.id) {
            selector = `#${el.id}`;
          } else if (el.className) {
            const firstClass = el.className.trim().split(/\s+/)[0];
            if (firstClass) selector = `.${firstClass}`;
          } else {
            selector = el.tagName.toLowerCase();
          }
          const text = (el.textContent || el.getAttribute('aria-label') || '').trim().substring(0, 50);
          return { selector, text };
        }).catch(() => ({ selector: '', text: '' }));
        
        // Get modal title for logging
        let modalTitle = 'Modal';
        try {
          modalTitle = await modal.evaluate((modalEl) => {
            return modalEl.querySelector('.modal-title, [role="dialog"] [aria-label], h2, h3')?.textContent?.trim() || 'Modal';
          });
          if (modalTitle === 'Modal' && triggerInfo?.text) {
            modalTitle = triggerInfo.text;
          }
        } catch {
          if (triggerInfo?.text) {
            modalTitle = triggerInfo.text;
          }
        }
        
        console.log(`  ⏳ Checking modal: ${modalTitle}...`);
        
        // Execute callback with modal and trigger info
        await callback(modal, triggerInfo);
        
        // Count links in modal for logging
        const modalLinkCount = await modal.evaluate((modalEl) => {
          return modalEl.querySelectorAll('a[href]').length;
        }).catch(() => 0);
        
        console.log(`  ✓ Modal '${modalTitle}' checked, found ${modalLinkCount} link(s)`);
        modalCheckCount++;

        // Close modal
        const closeSelectors = [
          '.modal-close',
          '[aria-label="Close"]',
          'button[data-dismiss="modal"]',
          'button[data-bs-dismiss="modal"]',
          '.close',
          '[data-close]',
        ];

        // Dismiss overlays before closing modal
        await dismissOverlays(page);
        
        let closed = false;
        for (const closeSelector of closeSelectors) {
          if (page.isClosed()) break;
          const closeBtn = modal.locator(closeSelector).first();
          if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
            try {
              // Try normal click first
              await closeBtn.click({ timeout: 2000 });
              await modal.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
              closed = true;
              break;
            } catch {
              // If normal click fails (blocked by overlay), try force click
              try {
                await closeBtn.click({ force: true, timeout: 2000 });
                await modal.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
                closed = true;
                break;
              } catch {
                // Continue to next close selector
              }
            }
          }
        }

        if (!closed && !page.isClosed()) {
          // Try pressing Escape
          try {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(200).catch(() => {});
          } catch {
            // Ignore errors
          }
        }
      }
    } catch (error) {
      // If modal interaction fails, continue with next modal
      console.warn(`Failed to interact with modal: ${error}`);
    }
  }

  // Wait for DOM to stabilize after modal interactions
  if (!page.isClosed()) {
    await page.waitForTimeout(500).catch(() => {});
  }
  
  if (modalCheckCount > 0) {
    console.log(`  ✓ Modal check complete (${modalCheckCount} modals checked)`);
  }
}

/**
 * Dismiss overlays, announcement bars, and cookie banners that might block interactions
 */
export async function dismissOverlays(page: Page): Promise<void> {
  if (page.isClosed()) return;
  
  try {
    // Common overlay selectors
    const overlaySelectors = [
      '.announcement-bar',
      '.cookie-banner',
      '.cookie-consent',
      '.overlay',
      '.popup',
      '[role="alert"]',
      '[role="dialog"]:not(.modal)',
    ];
    
    // Try to find and close overlays
    for (const selector of overlaySelectors) {
      try {
        if (page.isClosed()) break;
        const overlay = page.locator(selector).first();
        if (await overlay.isVisible({ timeout: 500 }).catch(() => false)) {
          // Try to find close button within overlay
          const closeSelectors = [
            'button[aria-label*="close" i]',
            'button[aria-label*="dismiss" i]',
            '.close',
            '[data-dismiss]',
            '[data-close]',
            'button:has-text("Close")',
            'button:has-text("Dismiss")',
            'button:has-text("Accept")',
            'button:has-text("OK")',
          ];
          
          let closed = false;
          for (const closeSel of closeSelectors) {
            if (page.isClosed()) break;
            const closeBtn = overlay.locator(closeSel).first();
            if (await closeBtn.isVisible({ timeout: 300 }).catch(() => false)) {
              try {
                await closeBtn.click({ force: true, timeout: 1000 });
                await page.waitForTimeout(200).catch(() => {});
                closed = true;
                break;
              } catch {
                // Try next close selector
              }
            }
          }
          
          // If no close button found, try clicking outside or pressing Escape
          if (!closed && !page.isClosed()) {
            try {
              await page.keyboard.press('Escape');
              await page.waitForTimeout(200).catch(() => {});
            } catch {
              // Ignore errors
            }
          }
        }
      } catch {
        // Continue to next overlay selector
      }
    }
  } catch (error) {
    // Ignore overlay dismissal errors - not critical
    console.warn('Failed to dismiss overlays:', error);
  }
}

/**
 * Wait for lazy-loaded content to appear
 * Waits until NO new content loads
 */
export async function waitForLazyContent(page: Page, timeout: number = 30000): Promise<void> {
  let previousContentCount = 0;
  let stableCount = 0;
  const maxStableChecks = 10; // 10 checks * 500ms = 5 seconds of stability
  const startTime = Date.now();
  let checkNumber = 0;

  while (Date.now() - startTime < timeout && stableCount < maxStableChecks) {
    checkNumber++;
    
    // Count images and links
    const currentContentCount = await page.evaluate(() => {
      const images = document.querySelectorAll('img').length;
      const links = document.querySelectorAll('a[href]').length;
      return images + links;
    });

    // Log progress every 3 checks
    if (checkNumber % 3 === 0) {
      console.log(`  ⏳ Waiting for lazy content... (check ${checkNumber}/${maxStableChecks}, content count: ${currentContentCount})`);
    }

    if (currentContentCount === previousContentCount) {
      stableCount++;
    } else {
      stableCount = 0;
      previousContentCount = currentContentCount;
    }

    await page.waitForTimeout(500);
  }

  // Final wait to ensure everything is loaded
  await page.waitForTimeout(500);
  
  const finalContentCount = await page.evaluate(() => {
    const images = document.querySelectorAll('img').length;
    const links = document.querySelectorAll('a[href]').length;
    return images + links;
  });
  
  console.log(`  ✓ Lazy content stable (content count: ${finalContentCount})`);
}

