import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { dismissOverlays } from './dom-helpers';

/**
 * Check if selector contains Playwright-specific syntax
 */
function isPlaywrightSelector(selector: string): boolean {
  return selector.includes(':has-text(') || 
         selector.includes(':has(') || 
         selector.includes(':near(') ||
         selector.includes(':right-of(') ||
         selector.includes(':left-of(');
}

/**
 * Convert Playwright selector to standard CSS selector or find element directly
 */
async function findElementBySelector(
  page: Page,
  selector: string,
  elementIndex: number = 0
): Promise<string | null> {
  // If it's a Playwright selector, use locator API to find the element
  if (isPlaywrightSelector(selector)) {
    try {
      const locator = page.locator(selector);
      const count = await locator.count();
      if (count === 0) return null;
      
      // Get the specific element at the index
      const targetLocator = elementIndex < count ? locator.nth(elementIndex) : locator.first();
      
      // Generate a unique CSS selector for this element
      const cssSelector = await targetLocator.evaluate((el) => {
        // Try to generate a unique selector
        if (el.id) return `#${el.id}`;
        
        // Build selector path
        const path: string[] = [];
        let current: Element | null = el;
        
        while (current && current.nodeType === Node.ELEMENT_NODE) {
          let selector = current.tagName.toLowerCase();
          
          if (current.id) {
            selector = `#${current.id}`;
            path.unshift(selector);
            break;
          }
          
          if (current.className && typeof current.className === 'string') {
            const classes = current.className.trim().split(/\s+/).filter(c => c.length > 0);
            if (classes.length > 0) {
              selector += `.${classes[0]}`;
            }
          }
          
          // Add nth-child if needed
          const parent = current.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter(c => c.tagName === current!.tagName);
            if (siblings.length > 1) {
              const index = siblings.indexOf(current) + 1;
              selector += `:nth-of-type(${index})`;
            }
          }
          
          path.unshift(selector);
          current = current.parentElement;
          
          // Limit depth to avoid overly long selectors
          if (path.length >= 5) break;
        }
        
        return path.join(' > ') || current?.tagName.toLowerCase() || 'a';
      });
      
      return cssSelector;
    } catch (error) {
      console.warn(`Failed to convert Playwright selector ${selector}:`, error);
      return null;
    }
  }
  
  // Standard CSS selector - return as is
  return selector;
}

/**
 * Get color based on severity/impact level
 */
function getColorForSeverity(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return '#ff0000'; // Red
    case 'serious':
      return '#ff6600'; // Orange
    case 'moderate':
      return '#ffaa00'; // Yellow
    case 'minor':
      return '#ffdd00'; // Light yellow
    default:
      return '#ff0000'; // Default to red
  }
}

/**
 * Highlight elements on the page and take a screenshot
 * Only highlights the specific error elements, not all matching elements
 */
async function highlightAndScreenshot(
  page: Page,
  highlights: Array<{ selector: string; label: string; color: string; number: number; elementIndex?: number }>,
  screenshotPath: string
): Promise<string> {
  // First, scroll to top to get initial viewport state
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  
  const viewport = page.viewportSize() || { width: 1280, height: 720 };
  
  // Convert Playwright selectors to CSS selectors and find elements
  const elementData: Array<{ cssSelector: string; color: string; number: number }> = [];
  
  for (const highlight of highlights) {
    const cssSelector = await findElementBySelector(page, highlight.selector, highlight.elementIndex || 0);
    if (cssSelector) {
      elementData.push({
        cssSelector,
        color: highlight.color,
        number: highlight.number,
      });
    }
  }
  
  // Add highlight styles to each specific element
  await page.evaluate(({ elementData, viewportHeight }) => {
    elementData.forEach(({ cssSelector, color, number }) => {
      try {
        const element = document.querySelector(cssSelector) as HTMLElement;
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        
        // Check if element is in viewport
        const isInViewport = rect.top >= 0 && rect.top < viewportHeight && 
                            rect.left >= 0 && rect.left < window.innerWidth;
        
        // Save original style if not already saved
        if (!element.getAttribute('data-original-style')) {
          element.setAttribute('data-original-style', element.style.cssText);
        }
        
        // Add highlight style
        element.style.outline = `3px solid ${color}`;
        element.style.outlineOffset = '2px';
        element.style.boxShadow = `0 0 0 3px ${color}40`;
        element.style.backgroundColor = `${color}15`;
        
        // Add numbered badge
        const badge = document.createElement('div');
        badge.className = 'violation-badge';
        badge.textContent = `#${number}`;
        badge.style.cssText = `
          position: absolute;
          top: ${rect.top + scrollY - 25}px;
          left: ${rect.left + scrollX}px;
          background: ${color};
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          z-index: 999999;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(badge);
        
        // Add navigation hint if element is not in viewport
        if (!isInViewport) {
          const navHint = document.createElement('div');
          navHint.className = 'nav-hint';
          const scrollDirection = rect.top < 0 ? '↑ Scroll Up' : '↓ Scroll Down';
          navHint.textContent = `${scrollDirection} to Error #${number}`;
          navHint.style.cssText = `
            position: fixed;
            top: ${isInViewport ? '20px' : '50%'};
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 5px;
            font-weight: bold;
            font-size: 12px;
            z-index: 999998;
            pointer-events: none;
          `;
          document.body.appendChild(navHint);
        }
      } catch (error) {
        console.warn(`Failed to highlight element with selector ${cssSelector}:`, error);
      }
    });
  }, { elementData, viewportHeight: viewport.height });
  
  // Wait a bit for styles to apply
  await page.waitForTimeout(200);
  
  // Take screenshot
  await page.screenshot({
    path: screenshotPath,
    fullPage: true, // Capture entire page
  });
  
  // Remove highlights and badges
  await page.evaluate(() => {
    // Remove badges and nav hints
    document.querySelectorAll('.violation-badge, .nav-hint').forEach(el => el.remove());
    
    // Restore original styles
    document.querySelectorAll('[data-original-style]').forEach((el: Element) => {
      const element = el as HTMLElement;
      const originalStyle = element.getAttribute('data-original-style') || '';
      element.style.cssText = originalStyle;
      element.removeAttribute('data-original-style');
    });
  });
  
  return screenshotPath;
}

/**
 * Create a cropped screenshot centered on the error element
 * Adds navigation hints if scrolling was needed
 */
async function createCloseUpScreenshot(
  page: Page,
  selector: string,
  errorInfo: { id: string; description: string; severity?: string },
  screenshotPath: string,
  errorNumber: number,
  elementIndex?: number
): Promise<string | null> {
  try {
    // Get initial scroll position
    const initialScroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    
    // Convert Playwright selector to CSS selector if needed
    let cssSelector = selector;
    if (isPlaywrightSelector(selector)) {
      const converted = await findElementBySelector(page, selector, elementIndex || 0);
      if (!converted) return null;
      cssSelector = converted;
    }
    
    // Get the specific element using Playwright locator (works with both CSS and Playwright selectors)
    const locator = page.locator(selector);
    const count = await locator.count();
    if (count === 0) return null;
    
    const targetLocator = elementIndex !== undefined && elementIndex < count
      ? locator.nth(elementIndex)
      : locator.first();
    
    // Get element bounding box
    const box = await targetLocator.boundingBox();
    if (!box) return null;

    // Check if element is already in viewport
    const viewport = page.viewportSize() || { width: 1280, height: 720 };
    const wasInViewport = box.y >= 0 && box.y < viewport.height && 
                         box.x >= 0 && box.x < viewport.width;

    // Calculate scroll position to center the element
    const scrollX = Math.max(0, box.x + box.width / 2 - viewport.width / 2);
    const scrollY = Math.max(0, box.y + box.height / 2 - viewport.height / 2);
    const needsScrolling = scrollX !== initialScroll.x || scrollY !== initialScroll.y;

    // Scroll to center the element if needed
    if (needsScrolling) {
      await page.evaluate(({ x, y }) => {
        window.scrollTo(x, y);
      }, { x: scrollX, y: scrollY });
      await page.waitForTimeout(300);
    }

    // Highlight the specific element using the CSS selector
    const color = getColorForSeverity(errorInfo.severity || 'moderate');
    await page.evaluate(({ cssSelector, color, errorNumber, errorId, description, needsScrolling, wasInViewport }) => {
      const el = document.querySelector(cssSelector) as HTMLElement;
      if (!el) return;
      
      el.style.outline = `4px solid ${color}`;
      el.style.outlineOffset = '3px';
      el.style.boxShadow = `0 0 0 4px ${color}40`;
      el.style.backgroundColor = `${color}15`;
      
      // Add annotation label
      const label = document.createElement('div');
      label.className = 'error-label';
      let navText = '';
      if (needsScrolling && !wasInViewport) {
        navText = '<div style="font-size: 11px; margin-top: 4px; opacity: 0.9;">📍 Scrolled to this location</div>';
      } else if (wasInViewport) {
        navText = '<div style="font-size: 11px; margin-top: 4px; opacity: 0.9;">📍 Already visible</div>';
      }
      
      label.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">Error #${errorNumber}: ${errorId}</div>
        <div style="font-size: 12px;">${description}</div>
        ${navText}
      `;
      label.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${color};
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-weight: bold;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 600px;
        text-align: center;
      `;
      document.body.appendChild(label);
    }, { cssSelector, color, errorNumber, errorId: errorInfo.id, description: errorInfo.description, needsScrolling, wasInViewport });

    await page.waitForTimeout(200);

    // Take screenshot of viewport (cropped to visible area)
    await page.screenshot({
      path: screenshotPath,
      fullPage: false, // Just the viewport
    });

    // Cleanup
    await page.evaluate(({ cssSelector }) => {
      const el = document.querySelector(cssSelector) as HTMLElement;
      if (el) {
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.style.boxShadow = '';
        el.style.backgroundColor = '';
      }
      document.querySelectorAll('.error-label').forEach(el => el.remove());
    }, { cssSelector });

    return screenshotPath;
  } catch (error) {
    console.warn(`Failed to create close-up screenshot for ${selector}:`, error);
    return null;
  }
}

/**
 * Create screenshots for accessibility violations
 */
export async function createViolationScreenshots(
  page: Page,
  violations: any[],
  outputDir: string = 'test-results'
): Promise<{ fullPage: string | null; closeUps: string[] }> {
  if (violations.length === 0) {
    return { fullPage: null, closeUps: [] };
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const closeUpPaths: string[] = [];
  let highlightNumber = 1;
  
  // Collect all selectors and create numbered labels
  const highlights: Array<{ selector: string; label: string; color: string; number: number; elementIndex?: number }> = [];
  
  violations.forEach((violation) => {
    const color = getColorForSeverity(violation.impact);
    const label = `${violation.id} (${violation.impact})`;
    
    if (violation.nodes) {
      violation.nodes.forEach((node: any) => {
        if (node.target && Array.isArray(node.target)) {
          const selector = node.target[node.target.length - 1];
          highlights.push({
            selector,
            label,
            color,
            number: highlightNumber++,
            elementIndex: 0, // Use first matching element for each violation node
          });
        }
      });
    }
  });

  if (highlights.length === 0) {
    return { fullPage: null, closeUps: [] };
  }

  // Step 1: Create full-page screenshot with all violations highlighted
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fullPagePath = path.join(outputDir, `accessibility-violations-fullpage-${timestamp}.png`);
  await highlightAndScreenshot(page, highlights, fullPagePath);

  // Step 2: Create individual cropped screenshots for each violation
  let closeUpNumber = 1;
  for (let i = 0; i < violations.length; i++) {
    const violation = violations[i];
    if (!violation.nodes || violation.nodes.length === 0) continue;

    for (let j = 0; j < violation.nodes.length; j++) {
      const node = violation.nodes[j];
      if (!node.target || !Array.isArray(node.target)) continue;

      const selector = node.target[node.target.length - 1];
      const closeUpPath = path.join(
        outputDir,
        `accessibility-violation-${closeUpNumber}-${violation.id}-${timestamp}.png`
      );
      
      const result = await createCloseUpScreenshot(
        page,
        selector,
        {
          id: violation.id,
          description: violation.description,
          severity: violation.impact,
        },
        closeUpPath,
        closeUpNumber,
        0 // Use first matching element
      );
      
      if (result) {
        closeUpPaths.push(result);
      }
      closeUpNumber++;
    }
  }

  return { fullPage: fullPagePath, closeUps: closeUpPaths };
}

/**
 * Create screenshots for SEO errors (images without alt, heading issues)
 */
export async function createSEOErrorScreenshots(
  page: Page,
  failedChecks: Array<{ check: string; message: string; value?: string }>,
  outputDir: string = 'test-results'
): Promise<{ fullPage: string | null; closeUps: string[] }> {
  if (failedChecks.length === 0) {
    return { fullPage: null, closeUps: [] };
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const closeUpPaths: string[] = [];
  const highlights: Array<{ selector: string; label: string; color: string; number: number; elementIndex?: number }> = [];
  let highlightNumber = 1;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Process each failed check
  for (let i = 0; i < failedChecks.length; i++) {
    const check = failedChecks[i];
    
    if (check.check === 'Image Alt Attributes' && check.value) {
      // Find images without alt attributes
      // The value contains image srcs separated by commas
      const imageSrcs = check.value.split(', ').filter(src => src.trim());
      
      // Get all images on the page and find ones without alt
      const imagesWithoutAlt = await page.evaluate((srcs) => {
        const allImages = Array.from(document.querySelectorAll('img'));
        const missingAlt: string[] = [];
        
        allImages.forEach((img) => {
          const alt = img.getAttribute('alt');
          if (alt === null) {
            const src = (img as HTMLImageElement).src || img.getAttribute('src') || '';
            // Check if this image's src matches any in the failed list
            const matches = srcs.some(failedSrc => src.includes(failedSrc.split('/').pop() || '') || failedSrc.includes(src.split('/').pop() || ''));
            if (matches || srcs.length === 0) {
              // Try to generate a unique selector
              if (img.id) {
                missingAlt.push(`#${img.id}`);
              } else if (img.className) {
                const classes = img.className.trim().split(/\s+/).filter(c => c.length > 0);
                if (classes.length > 0) {
                  missingAlt.push(`img.${classes[0]}`);
                } else {
                  missingAlt.push(`img[src*="${src.split('/').pop()}"]`);
                }
              } else {
                missingAlt.push(`img[src*="${src.split('/').pop()}"]`);
              }
            }
          }
        });
        
        return missingAlt;
      }, imageSrcs);
      
      imagesWithoutAlt.forEach((selector, index) => {
        highlights.push({
          selector,
          label: 'Missing Alt Attribute',
          color: '#ff6600', // Orange for SEO issues
          number: highlightNumber++,
          elementIndex: 0, // Use first matching element
        });
      });
    } else if (check.check === 'Heading Structure') {
      // Find heading elements
      const h1Count = await page.locator('h1').count();
      const h2Count = await page.locator('h2').count();
      
      if (h1Count === 0) {
        // No H1 found - highlight first H2 or main content
        highlights.push({
          selector: 'h2:first-of-type, main, article, .content',
          label: 'Missing H1 Heading',
          color: '#ff6600',
          number: highlightNumber++,
          elementIndex: 0,
        });
      } else if (h1Count > 1) {
        // Multiple H1s - highlight all
        const h1Selectors = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('h1')).map((_, idx) => `h1:nth-of-type(${idx + 1})`);
        });
        h1Selectors.forEach((selector, idx) => {
          highlights.push({
            selector,
            label: 'Multiple H1 Headings',
            color: '#ff6600',
            number: highlightNumber++,
            elementIndex: 0, // Each selector is already specific (nth-of-type)
          });
        });
      }
    }
  }

  if (highlights.length === 0) {
    return { fullPage: null, closeUps: [] };
  }

  // Create full-page screenshot
  const fullPagePath = path.join(outputDir, `seo-errors-fullpage-${timestamp}.png`);
  await highlightAndScreenshot(page, highlights, fullPagePath);

  // Create close-up screenshots
  for (let i = 0; i < highlights.length; i++) {
    const highlight = highlights[i];
    const closeUpPath = path.join(
      outputDir,
      `seo-error-${i + 1}-${timestamp}.png`
    );
    
    const result = await createCloseUpScreenshot(
      page,
      highlight.selector,
      {
        id: highlight.label,
        description: highlight.label,
        severity: 'moderate',
      },
      closeUpPath,
      i + 1,
      highlight.elementIndex
    );
    
    if (result) {
      closeUpPaths.push(result);
    }
  }

  return { fullPage: fullPagePath, closeUps: closeUpPaths };
}

/**
 * Find the modal trigger button that opens a specific modal
 * Uses stored trigger info if available, otherwise falls back to dynamic finding
 * Returns the trigger locator and CSS selector
 */
async function findModalTrigger(
  page: Page,
  modalTitle: string,
  storedTriggerSelector?: string,
  storedTriggerText?: string
): Promise<{ locator: any; cssSelector: string | null } | null> {
  if (page.isClosed()) return null;
  
  // Use stored trigger info if available (preferred method - no modal opening needed)
  if (storedTriggerSelector) {
    try {
      const locator = page.locator(storedTriggerSelector).first();
      const count = await locator.count();
      if (count > 0 && await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
        const cssSelector = await findElementBySelector(page, storedTriggerSelector, 0);
        if (cssSelector) {
          return { locator, cssSelector };
        }
      }
    } catch (error) {
      // Fall through to dynamic finding
      console.warn(`Failed to use stored trigger selector "${storedTriggerSelector}":`, error);
    }
  }
  
  // Fallback: Try to find trigger dynamically (with timeout protection)
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), 5000); // Max 5 seconds
  });
  
  const findTriggerPromise = (async () => {
    // Try multiple strategies to find the trigger
    const triggerSelectors = [
      storedTriggerText ? `button:has-text("${storedTriggerText}")` : null,
      storedTriggerText ? `a:has-text("${storedTriggerText}")` : null,
      `button:has-text("${modalTitle}")`,
      `a:has-text("${modalTitle}")`,
      `[data-target*="${modalTitle}"]`,
      `[data-modal*="${modalTitle}"]`,
      `button[aria-controls*="${modalTitle}"]`,
      `[aria-label*="${modalTitle}" i]`,
    ].filter(Boolean) as string[];

    // First, try specific selectors
    for (const selector of triggerSelectors) {
      try {
        if (page.isClosed()) return null;
        const locator = page.locator(selector).first();
        const count = await locator.count();
        if (count > 0 && await locator.isVisible({ timeout: 500 }).catch(() => false)) {
          const cssSelector = await findElementBySelector(page, selector, 0);
          if (cssSelector) {
            return { locator, cssSelector };
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    return null;
  })();
  
  return Promise.race([findTriggerPromise, timeoutPromise]);
}

/**
 * Create screenshots for broken links with step-by-step navigation for modal links
 */
export async function createBrokenLinkScreenshots(
  page: Page,
  brokenLinks: Array<{ selector?: string; linkText?: string; url: string; status: number; location?: string; modalTriggerSelector?: string; modalTriggerText?: string }>,
  outputDir: string = 'test-results'
): Promise<{ fullPage: string | null; closeUps: string[] }> {
  if (brokenLinks.length === 0) {
    return { fullPage: null, closeUps: [] };
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const closeUpPaths: string[] = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Separate modal links from regular links
  const modalLinks = brokenLinks.filter(link => link.location && link.location.startsWith('Modal:'));
  const regularLinks = brokenLinks.filter(link => !link.location || !link.location.startsWith('Modal:'));

  // Process regular links (visible on page)
  const highlights: Array<{ selector: string; label: string; color: string; number: number; elementIndex?: number }> = [];
  let highlightNumber = 1;
  
  for (let i = 0; i < regularLinks.length; i++) {
    const link = regularLinks[i];
    
    // Try multiple strategies to find the exact link
    let foundSelector: string | null = null;
    let elementIndex = 0;
    
    if (link.selector && link.selector !== 'a') {
      const count = await page.locator(link.selector).count();
      if (count > 0) {
        if (count > 1 && link.linkText) {
          const matchingIndex = await page.evaluate(({ selector, linkText, url }) => {
            const elements = Array.from(document.querySelectorAll(selector));
            for (let i = 0; i < elements.length; i++) {
              const el = elements[i] as HTMLElement;
              const text = (el.textContent || '').trim();
              const href = (el as HTMLAnchorElement).href || '';
              if (text.includes(linkText) || href.includes(url.split('/').pop() || '')) {
                return i;
              }
            }
            return 0;
          }, { selector: link.selector, linkText: link.linkText, url: link.url });
          elementIndex = matchingIndex;
        }
        foundSelector = link.selector;
      }
    }
    
    if (!foundSelector && link.linkText) {
      const textSelector = `a:has-text("${link.linkText.replace(/"/g, '\\"')}")`;
      const count = await page.locator(textSelector).count();
      if (count > 0) {
        foundSelector = textSelector;
        if (count > 1) {
          const matchingIndex = await page.evaluate(({ textSelector, url }) => {
            const elements = Array.from(document.querySelectorAll('a'));
            for (let i = 0; i < elements.length; i++) {
              const el = elements[i] as HTMLAnchorElement;
              const text = (el.textContent || '').trim();
              const href = el.href || '';
              if (text.includes(textSelector.split('"')[1]) && href.includes(url.split('/').pop() || '')) {
                return i;
              }
            }
            return 0;
          }, { textSelector, url: link.url });
          elementIndex = matchingIndex;
        }
      }
    }
    
    if (!foundSelector) {
      const urlPath = link.url.split('/').pop() || '';
      if (urlPath) {
        const urlSelector = `a[href*="${urlPath}"]`;
        const count = await page.locator(urlSelector).count();
        if (count > 0) {
          foundSelector = urlSelector;
        }
      }
    }
    
    if (foundSelector) {
      highlights.push({
        selector: foundSelector,
        label: `Broken Link: ${link.status}`,
        color: '#ff0000',
        number: highlightNumber++,
        elementIndex,
      });
    }
  }

  // Create full-page screenshot for regular links
  let fullPagePath: string | null = null;
  if (highlights.length > 0) {
    fullPagePath = path.join(outputDir, `broken-links-fullpage-${timestamp}.png`);
    await highlightAndScreenshot(page, highlights, fullPagePath);
  }

  // Create close-up screenshots for regular links
  for (let i = 0; i < regularLinks.length; i++) {
    const brokenLink = regularLinks[i];
    const highlight = highlights.find(h => h.label.includes(brokenLink.linkText || '') || h.number === i + 1);
    if (!highlight) continue;
    
    const closeUpPath = path.join(
      outputDir,
      `broken-link-${i + 1}-${timestamp}.png`
    );
    
    const result = await createCloseUpScreenshot(
      page,
      highlight.selector,
      {
        id: 'Broken Link',
        description: `${brokenLink.linkText || brokenLink.url} - Status: ${brokenLink.status}`,
        severity: 'serious',
      },
      closeUpPath,
      i + 1,
      highlight.elementIndex
    );
    
    if (result) {
      closeUpPaths.push(result);
    }
  }
  
  // Handle modal links with step-by-step navigation
  for (let i = 0; i < modalLinks.length; i++) {
    const brokenLink = modalLinks[i];
    const modalTitle = brokenLink.location?.replace('Modal: ', '') || 'Modal';
    
    // Add timeout protection (max 10 seconds per modal)
    const modalTimeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 10000);
    });
    
    const modalOperationPromise = (async () => {
      if (page.isClosed()) return;
      
      try {
        // Dismiss overlays before starting
        await dismissOverlays(page);
        
        // Step 1: Find and highlight the modal trigger button
        const triggerInfo = await findModalTrigger(
          page, 
          modalTitle, 
          brokenLink.modalTriggerSelector, 
          brokenLink.modalTriggerText
        );
      
        if (page.isClosed()) return;
        
        if (triggerInfo && triggerInfo.cssSelector) {
          // Step 1 Screenshot: Show trigger button highlighted
          const step1Path = path.join(
            outputDir,
            `broken-link-modal-${i + 1}-step1-trigger-${timestamp}.png`
          );
          
          try {
            await page.evaluate(({ cssSelector, modalTitle }) => {
          const el = document.querySelector(cssSelector) as HTMLElement;
          if (el) {
            // Save original style
            if (!el.getAttribute('data-original-style')) {
              el.setAttribute('data-original-style', el.style.cssText);
            }
            
            // Highlight trigger button
            el.style.outline = '4px solid #0066ff';
            el.style.outlineOffset = '3px';
            el.style.boxShadow = '0 0 0 4px #0066ff40';
            el.style.backgroundColor = '#0066ff15';
            
            // Add step indicator
            const stepLabel = document.createElement('div');
            stepLabel.className = 'step-label';
            stepLabel.innerHTML = `
              <div style="font-weight: bold; margin-bottom: 4px;">Step 1: Click to Open</div>
              <div style="font-size: 12px;">Click this button to open "${modalTitle}" menu</div>
            `;
            stepLabel.style.cssText = `
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: #0066ff;
              color: white;
              padding: 10px 20px;
              border-radius: 5px;
              font-weight: bold;
              font-size: 14px;
              z-index: 999999;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              max-width: 600px;
              text-align: center;
            `;
            document.body.appendChild(stepLabel);
          }
            }, { cssSelector: triggerInfo.cssSelector, modalTitle });
            
            // Scroll trigger into view if needed
            if (!page.isClosed()) {
              await triggerInfo.locator.scrollIntoViewIfNeeded();
              await page.waitForTimeout(200).catch(() => {});
            }
            
            // Take screenshot with error handling
            if (!page.isClosed()) {
              await page.screenshot({ path: step1Path, fullPage: false }).catch((error) => {
                console.warn(`Failed to capture Step 1 screenshot:`, error);
              });
            }
            
            // Cleanup
            if (!page.isClosed()) {
              await page.evaluate(({ cssSelector }) => {
                const el = document.querySelector(cssSelector) as HTMLElement;
                if (el) {
                  const originalStyle = el.getAttribute('data-original-style') || '';
                  el.style.cssText = originalStyle;
                  el.removeAttribute('data-original-style');
                }
                document.querySelectorAll('.step-label').forEach(el => el.remove());
              }, { cssSelector: triggerInfo.cssSelector }).catch(() => {});
            }
            
            if (fs.existsSync(step1Path)) {
              closeUpPaths.push(step1Path);
            }
          } catch (error) {
            // Fallback: Capture screenshot with error annotation
            console.warn(`Failed to capture Step 1 screenshot for modal "${modalTitle}":`, error);
            try {
              if (!page.isClosed()) {
                const errorPath = path.join(
                  outputDir,
                  `broken-link-modal-${i + 1}-step1-error-${timestamp}.png`
                );
                await page.evaluate(({ modalTitle }) => {
                  const errorLabel = document.createElement('div');
                  errorLabel.className = 'error-label';
                  errorLabel.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 4px;">⚠️ Step 1: Error</div>
                    <div style="font-size: 12px;">Could not highlight trigger for "${modalTitle}"</div>
                  `;
                  errorLabel.style.cssText = `
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #ffaa00;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 5px;
                    font-weight: bold;
                    font-size: 14px;
                    z-index: 999999;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    max-width: 600px;
                    text-align: center;
                  `;
                  document.body.appendChild(errorLabel);
                }, { modalTitle });
                await page.screenshot({ path: errorPath, fullPage: false }).catch(() => {});
                if (fs.existsSync(errorPath)) {
                  closeUpPaths.push(errorPath);
                }
              }
            } catch {
              // Ignore fallback errors
            }
          }
        } else {
          console.warn(`Could not find trigger for modal "${modalTitle}". Skipping Step 1 screenshot.`);
        }
      
        // Step 2: Open the modal and highlight the broken link
        if (triggerInfo && triggerInfo.locator && !page.isClosed()) {
          // Dismiss overlays before opening modal
          await dismissOverlays(page);
          
          // Click trigger to open modal
          try {
            await triggerInfo.locator.click({ timeout: 5000 });
            await page.waitForTimeout(500).catch(() => {});
          } catch (error) {
            console.warn(`Failed to click trigger for modal "${modalTitle}":`, error);
            // Try force click as fallback
            try {
              await triggerInfo.locator.click({ force: true, timeout: 2000 });
              await page.waitForTimeout(500).catch(() => {});
            } catch {
              // Skip Step 2 if trigger click fails
              return;
            }
          }
          
          if (page.isClosed()) return;
          
          // Wait for modal to be visible
          const modal = page.locator('.modal, [role="dialog"], [data-modal-content], .modal-dialog').first();
          const isModalVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);
        
          if (isModalVisible && !page.isClosed()) {
            // Find the broken link in the modal
            const linkSelector = brokenLink.selector || (brokenLink.linkText ? `a:has-text("${brokenLink.linkText.replace(/"/g, '\\"')}")` : 'a');
            const linkLocator = modal.locator(linkSelector).first();
            const linkCount = await linkLocator.count();
            
            if (linkCount > 0) {
              // Scroll to the link
              await linkLocator.scrollIntoViewIfNeeded();
              await page.waitForTimeout(300).catch(() => {});
              
              if (page.isClosed()) return;
              
              // Get CSS selector for the link
              const linkCssSelector = await findElementBySelector(page, linkSelector, 0);
              
              if (linkCssSelector) {
                const step2Path = path.join(
                  outputDir,
                  `broken-link-modal-${i + 1}-step2-link-${timestamp}.png`
                );
                
                try {
                  // Highlight the broken link
                  await page.evaluate(({ linkCssSelector, linkText, status, modalTitle }) => {
                const el = document.querySelector(linkCssSelector) as HTMLElement;
                if (el) {
                  // Save original style
                  if (!el.getAttribute('data-original-style')) {
                    el.setAttribute('data-original-style', el.style.cssText);
                  }
                  
                  // Highlight broken link
                  el.style.outline = '4px solid #ff0000';
                  el.style.outlineOffset = '3px';
                  el.style.boxShadow = '0 0 0 4px #ff000040';
                  el.style.backgroundColor = '#ff000015';
                  
                  // Add step indicator
                  const stepLabel = document.createElement('div');
                  stepLabel.className = 'step-label';
                  stepLabel.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 4px;">Step 2: Broken Link Found</div>
                    <div style="font-size: 12px;">"${linkText || 'Link'}" - Status: ${status}</div>
                    <div style="font-size: 11px; margin-top: 4px; opacity: 0.9;">📍 In "${modalTitle}" menu</div>
                  `;
                  stepLabel.style.cssText = `
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #ff0000;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 5px;
                    font-weight: bold;
                    font-size: 14px;
                    z-index: 999999;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    max-width: 600px;
                    text-align: center;
                  `;
                  document.body.appendChild(stepLabel);
                }
                  }, { 
                    linkCssSelector, 
                    linkText: brokenLink.linkText || 'Link', 
                    status: brokenLink.status, 
                    modalTitle 
                  });
                  
                  await page.waitForTimeout(200).catch(() => {});
                  
                  // Take screenshot
                  if (!page.isClosed()) {
                    await page.screenshot({ path: step2Path, fullPage: false }).catch((error) => {
                      console.warn(`Failed to capture Step 2 screenshot:`, error);
                    });
                  }
                  
                  // Cleanup
                  if (!page.isClosed()) {
                    await page.evaluate(({ linkCssSelector }) => {
                      const el = document.querySelector(linkCssSelector) as HTMLElement;
                      if (el) {
                        const originalStyle = el.getAttribute('data-original-style') || '';
                        el.style.cssText = originalStyle;
                        el.removeAttribute('data-original-style');
                      }
                      document.querySelectorAll('.step-label').forEach(el => el.remove());
                    }, { linkCssSelector }).catch(() => {});
                  }
                  
                  if (fs.existsSync(step2Path)) {
                    closeUpPaths.push(step2Path);
                  }
                } catch (error) {
                  // Fallback: Capture screenshot with error annotation
                  console.warn(`Failed to capture Step 2 screenshot for modal "${modalTitle}":`, error);
                  try {
                    if (!page.isClosed()) {
                      const errorPath = path.join(
                        outputDir,
                        `broken-link-modal-${i + 1}-step2-error-${timestamp}.png`
                      );
                      await page.evaluate(({ linkText, status, modalTitle }) => {
                        const errorLabel = document.createElement('div');
                        errorLabel.className = 'error-label';
                        errorLabel.innerHTML = `
                          <div style="font-weight: bold; margin-bottom: 4px;">⚠️ Step 2: Error</div>
                          <div style="font-size: 12px;">Could not highlight broken link "${linkText}"</div>
                          <div style="font-size: 11px; margin-top: 4px; opacity: 0.9;">Status: ${status} | In "${modalTitle}" menu</div>
                        `;
                        errorLabel.style.cssText = `
                          position: fixed;
                          top: 20px;
                          left: 50%;
                          transform: translateX(-50%);
                          background: #ffaa00;
                          color: white;
                          padding: 10px 20px;
                          border-radius: 5px;
                          font-weight: bold;
                          font-size: 14px;
                          z-index: 999999;
                          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                          max-width: 600px;
                          text-align: center;
                        `;
                        document.body.appendChild(errorLabel);
                      }, { linkText: brokenLink.linkText || 'Link', status: brokenLink.status, modalTitle });
                      await page.screenshot({ path: errorPath, fullPage: false }).catch(() => {});
                      if (fs.existsSync(errorPath)) {
                        closeUpPaths.push(errorPath);
                      }
                    }
                  } catch {
                    // Ignore fallback errors
                  }
                }
              } else {
                console.warn(`Could not find broken link "${brokenLink.linkText}" in modal "${modalTitle}". Skipping Step 2 screenshot.`);
              }
            } else {
              console.warn(`Could not find broken link "${brokenLink.linkText}" in modal "${modalTitle}". Skipping Step 2 screenshot.`);
            }
          } else {
            console.warn(`Modal "${modalTitle}" did not open. Skipping Step 2 screenshot.`);
          }
          
          // Close modal with improved error handling
          if (!page.isClosed()) {
            try {
              await dismissOverlays(page);
              
              const closeSelectors = [
                'button[data-bs-dismiss="modal"]',
                'button[data-dismiss="modal"]',
                '.close',
                '[aria-label*="close" i]',
              ];
              
              let closed = false;
              for (const closeSel of closeSelectors) {
                if (page.isClosed()) break;
                const closeBtn = modal.locator(closeSel).first();
                if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
                  try {
                    await closeBtn.click({ timeout: 2000 });
                    await page.waitForTimeout(300).catch(() => {});
                    closed = true;
                    break;
                  } catch {
                    // Try force click
                    try {
                      await closeBtn.click({ force: true, timeout: 2000 });
                      await page.waitForTimeout(300).catch(() => {});
                      closed = true;
                      break;
                    } catch {
                      // Continue to next close selector
                    }
                  }
                }
              }
              
              if (!closed && !page.isClosed()) {
                try {
                  await page.keyboard.press('Escape');
                  await page.waitForTimeout(300).catch(() => {});
                } catch {
                  // Ignore errors
                }
              }
            } catch (error) {
              console.warn(`Failed to close modal "${modalTitle}":`, error);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to capture step-by-step screenshot for modal link ${brokenLink.linkText}:`, error);
      }
    })();
    
    // Race against timeout
    await Promise.race([modalOperationPromise, modalTimeoutPromise]);
  }

  return { fullPage: fullPagePath, closeUps: closeUpPaths };
}

