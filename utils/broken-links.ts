import { Page, APIRequestContext } from '@playwright/test';
import { URL } from 'url';
import {
  waitForDOMReady,
  scrollToBottom,
  waitForLazyContent,
  isElementVisible,
  interactWithModals,
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
import { createBrokenLinkScreenshots } from './screenshot-helpers';

/**
 * Interface for link check results with location context
 */
export interface LinkCheckResult {
  url: string;
  status: number;
  statusText: string;
  isBroken: boolean;
  error?: string;
  linkText?: string; // The visible text of the link
  selector?: string; // CSS selector for the link
  location?: string; // Where the link is located (e.g., "Navigation", "Footer", "Modal: Login")
  modalTriggerSelector?: string; // Selector for the button/trigger that opens the modal
  modalTriggerText?: string; // Text of the trigger button
}

// extractLinksFromModals is now integrated into extractVisibleLinks

/**
 * Extract all links from a page and normalize them to absolute URLs
 * Now filters for visible links only
 */
export async function extractLinks(page: Page, baseUrl?: string): Promise<Array<{ url: string; text?: string; selector?: string; location?: string }>> {
  const currentUrl = page.url();
  const base = baseUrl || currentUrl;
  const baseUrlObj = new URL(base);

  // Extract all href attributes from <a> tags and filter for visible ones
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    const visibleLinks: Array<{ url: string; text: string; selector: string; location: string }> = [];

    anchors.forEach((anchor) => {
      const element = anchor as HTMLElement;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      // Only include if visible
      if (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.width > 0 &&
        rect.height > 0 &&
        element.getAttribute('aria-hidden') !== 'true'
      ) {
        const url = (anchor as HTMLAnchorElement).href;
        const text = (anchor.textContent || anchor.getAttribute('aria-label') || '').trim().substring(0, 50);
        
        // Determine location
        let location = 'Page Content';
        const parent = anchor.closest('nav, header, footer, aside, .navbar, .header, .footer, .sidebar, .menu, .navigation');
        if (parent) {
          const tagName = parent.tagName.toLowerCase();
          const className = parent.className || '';
          if (tagName === 'nav' || className.includes('nav')) location = 'Navigation';
          else if (tagName === 'header' || className.includes('header')) location = 'Header';
          else if (tagName === 'footer' || className.includes('footer')) location = 'Footer';
          else if (tagName === 'aside' || className.includes('sidebar')) location = 'Sidebar';
          else location = `${tagName} (${className.substring(0, 30)})`;
        }
        
        // Generate unique selector that can identify this specific link
        let selector = 'a';
        
        // Try to build a unique selector
        if (anchor.id) {
          selector = `#${anchor.id}`;
        } else {
          // Build selector using parent context + text or href
          const parent = anchor.parentElement;
          let parentSelector = '';
          
          if (parent) {
            if (parent.id) {
              parentSelector = `#${parent.id} `;
            } else if (parent.className) {
              const firstClass = parent.className.trim().split(/\s+/)[0];
              if (firstClass) {
                parentSelector = `.${firstClass} `;
              }
            } else if (parent.tagName) {
              parentSelector = `${parent.tagName.toLowerCase()} `;
            }
          }
          
          // Use text content as selector if available
          if (text && text.length > 0) {
            selector = `${parentSelector}a:has-text("${text.substring(0, 30).replace(/"/g, '\\"')}")`;
          } else {
            // Fall back to href attribute
            const href = (anchor as HTMLAnchorElement).href || anchor.getAttribute('href') || '';
            if (href) {
              // Extract pathname safely
              try {
                const urlObj = new URL(href);
                const hrefPath = urlObj.pathname.split('/').filter(p => p).pop() || '';
                if (hrefPath) {
                  selector = `${parentSelector}a[href*="${hrefPath}"]`;
                } else {
                  selector = `${parentSelector}a[href="${href.replace(/"/g, '\\"')}"]`;
                }
              } catch (e) {
                // If URL parsing fails, extract path manually
                const match = href.match(/\/([^\/?#]+)(?:\?|#|$)/);
                if (match && match[1]) {
                  selector = `${parentSelector}a[href*="${match[1]}"]`;
                } else if (anchor.className) {
                  selector = `${parentSelector}a.${anchor.className.split(' ')[0]}`;
                }
              }
            } else {
              // Last resort: use class if available
              if (anchor.className) {
                selector = `${parentSelector}a.${anchor.className.split(' ')[0]}`;
              }
            }
          }
        }
        
        visibleLinks.push({ url, text, selector, location });
      }
    });

    return visibleLinks;
  });

  // Normalize URLs and filter out invalid ones, preserving context
  interface LinkWithContext {
    url: string;
    text: string;
    selector: string;
    location: string;
  }
  
  const normalizedLinks: LinkWithContext[] = [];
  const seen = new Set<string>();

  for (const link of links) {
    try {
      // Skip empty, javascript:, mailto:, tel:, and anchor-only links
      if (!link.url || link.url.startsWith('javascript:') || link.url.startsWith('mailto:') || link.url.startsWith('tel:') || link.url.startsWith('#')) {
        continue;
      }

      // Convert relative URLs to absolute
      const urlObj = new URL(link.url, base);
      const absoluteUrl = urlObj.href;

      // Remove hash fragments and trailing slashes for consistency
      const normalizedUrl = absoluteUrl.split('#')[0].replace(/\/$/, '');

      // Deduplicate by URL, but preserve context from first occurrence
      if (!seen.has(normalizedUrl)) {
        seen.add(normalizedUrl);
        normalizedLinks.push({
          url: normalizedUrl,
          text: link.text,
          selector: link.selector,
          location: link.location,
        });
      }
    } catch (error) {
      // Skip invalid URLs
    }
  }

  return normalizedLinks;
}

/**
 * Extract ALL visible links from a page
 * CRITICAL: Waits for DOM to be fully loaded, scrolls through entire page,
 * waits for lazy content, filters visible links, and checks ALL modals
 * NO SKIPPING - returns ALL visible links found
 */
export async function extractVisibleLinks(page: Page, baseUrl?: string): Promise<Array<{ url: string; text?: string; selector?: string; location?: string; modalTriggerSelector?: string; modalTriggerText?: string }>> {
  const currentUrl = page.url();
  const base = baseUrl || currentUrl;
  const baseUrlObj = new URL(base);

  // FIRST: Wait for DOM to be fully loaded
  await waitForDOMReady(page);
  console.log('  ✓ DOM ready, starting link extraction...');

  // Scroll through entire page to trigger lazy loading (checks ALL content, no skipping)
  console.log('  ⏳ Scrolling page to trigger lazy loading...');
  await scrollToBottom(page);
  console.log('  ✓ Page scroll complete');

  // Wait for lazy content to finish loading (polls until no new links appear)
  console.log('  ⏳ Waiting for lazy content to load...');
  await waitForLazyContent(page);
  console.log('  ✓ Lazy content loaded');

  // Extract visible links from main page with context
  const pageLinks = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    const visibleLinks: Array<{ url: string; text: string; selector: string; location: string }> = [];

    anchors.forEach((anchor) => {
      const element = anchor as HTMLElement;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      // Only include if visible
      if (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.width > 0 &&
        rect.height > 0 &&
        element.getAttribute('aria-hidden') !== 'true'
      ) {
        const url = (anchor as HTMLAnchorElement).href;
        const text = (anchor.textContent || anchor.getAttribute('aria-label') || '').trim().substring(0, 50);
        
        // Determine location
        let location = 'Page Content';
        const parent = anchor.closest('nav, header, footer, aside, .navbar, .header, .footer, .sidebar, .menu, .navigation');
        if (parent) {
          const tagName = parent.tagName.toLowerCase();
          const className = parent.className || '';
          if (tagName === 'nav' || className.includes('nav')) location = 'Navigation';
          else if (tagName === 'header' || className.includes('header')) location = 'Header';
          else if (tagName === 'footer' || className.includes('footer')) location = 'Footer';
          else if (tagName === 'aside' || className.includes('sidebar')) location = 'Sidebar';
          else location = `${tagName} (${className.substring(0, 30)})`;
        }
        
        // Generate unique selector that can identify this specific link
        let selector = 'a';
        
        // Try to build a unique selector
        if (anchor.id) {
          selector = `#${anchor.id}`;
        } else {
          // Build selector using parent context + text or href
          const parent = anchor.parentElement;
          let parentSelector = '';
          
          if (parent) {
            if (parent.id) {
              parentSelector = `#${parent.id} `;
            } else if (parent.className) {
              const firstClass = parent.className.trim().split(/\s+/)[0];
              if (firstClass) {
                parentSelector = `.${firstClass} `;
              }
            } else if (parent.tagName) {
              parentSelector = `${parent.tagName.toLowerCase()} `;
            }
          }
          
          // Use text content as selector if available
          if (text && text.length > 0) {
            selector = `${parentSelector}a:has-text("${text.substring(0, 30).replace(/"/g, '\\"')}")`;
          } else {
            // Fall back to href attribute
            const href = (anchor as HTMLAnchorElement).href || anchor.getAttribute('href') || '';
            if (href) {
              // Extract pathname safely
              try {
                const urlObj = new URL(href);
                const hrefPath = urlObj.pathname.split('/').filter(p => p).pop() || '';
                if (hrefPath) {
                  selector = `${parentSelector}a[href*="${hrefPath}"]`;
                } else {
                  selector = `${parentSelector}a[href="${href.replace(/"/g, '\\"')}"]`;
                }
              } catch (e) {
                // If URL parsing fails, extract path manually
                const match = href.match(/\/([^\/?#]+)(?:\?|#|$)/);
                if (match && match[1]) {
                  selector = `${parentSelector}a[href*="${match[1]}"]`;
                } else if (anchor.className) {
                  selector = `${parentSelector}a.${anchor.className.split(' ')[0]}`;
                }
              }
            } else {
              // Last resort: use class if available
              if (anchor.className) {
                selector = `${parentSelector}a.${anchor.className.split(' ')[0]}`;
              }
            }
          }
        }
        
        visibleLinks.push({ url, text, selector, location });
      }
    });

    return visibleLinks;
  });

  console.log(`  ✓ Extracted ${pageLinks.length} link(s) from page content`);

  // Extract links from ALL modals/dropdowns (no limit) with context
  const modalLinks: Array<{ url: string; text: string; selector: string; location: string; modalTriggerSelector?: string; modalTriggerText?: string }> = [];
  
  console.log('  ⏳ Checking modals for links...');
  let totalModalLinks = 0;
  
  await interactWithModals(page, async (modal, triggerInfo) => {
    const modalInfo = await modal.evaluate((modalEl) => {
      const anchors = Array.from(modalEl.querySelectorAll('a[href]'));
      const modalTitle = modalEl.querySelector('.modal-title, [role="dialog"] [aria-label], h2, h3')?.textContent?.trim() || 'Modal';
      
      return anchors.map(anchor => {
        const url = (anchor as HTMLAnchorElement).href;
        const text = (anchor.textContent || anchor.getAttribute('aria-label') || '').trim().substring(0, 50);
        
        // Generate unique selector for modal links
        let selector = 'a';
        
        if (anchor.id) {
          selector = `#${anchor.id}`;
        } else {
          // Build selector using modal context + text or href
          let parentSelector = '';
          const parent = anchor.parentElement;
          
          if (parent) {
            if (parent.id) {
              parentSelector = `#${parent.id} `;
            } else if (parent.className) {
              const firstClass = parent.className.trim().split(/\s+/)[0];
              if (firstClass) {
                parentSelector = `.${firstClass} `;
              }
            }
          }
          
          // Use text content as selector if available
          if (text && text.length > 0) {
            selector = `${parentSelector}a:has-text("${text.substring(0, 30).replace(/"/g, '\\"')}")`;
          } else {
            // Fall back to href attribute
            const href = (anchor as HTMLAnchorElement).href || anchor.getAttribute('href') || '';
            if (href) {
              // Extract pathname safely without using URL constructor
              try {
                const urlObj = new URL(href);
                const hrefPath = urlObj.pathname.split('/').filter(p => p).pop() || '';
                if (hrefPath) {
                  selector = `${parentSelector}a[href*="${hrefPath}"]`;
                } else {
                  // Use full href if pathname extraction fails
                  selector = `${parentSelector}a[href="${href.replace(/"/g, '\\"')}"]`;
                }
              } catch (e) {
                // If URL parsing fails, extract path manually
                const match = href.match(/\/([^\/?#]+)(?:\?|#|$)/);
                if (match && match[1]) {
                  selector = `${parentSelector}a[href*="${match[1]}"]`;
                } else {
                  // Last resort: use class if available
                  if (anchor.className) {
                    selector = `${parentSelector}a.${anchor.className.split(' ')[0]}`;
                  }
                }
              }
            } else if (anchor.className) {
              selector = `${parentSelector}a.${anchor.className.split(' ')[0]}`;
            }
          }
        }
        
        return { url, text, selector, location: `Modal: ${modalTitle}` };
      });
    });
    
    // Add trigger info to each modal link
    const linksWithTrigger = modalInfo.map(link => ({
      ...link,
      modalTriggerSelector: triggerInfo?.selector,
      modalTriggerText: triggerInfo?.text,
    }));
    
    modalLinks.push(...linksWithTrigger);
    totalModalLinks += linksWithTrigger.length;
  });
  
  console.log(`  ✓ Modal check complete, found ${totalModalLinks} link(s) in modals`);

  // Combine all links with context - ensure all have same structure
  const allLinks: Array<{ url: string; text: string; selector: string; location: string; modalTriggerSelector?: string; modalTriggerText?: string }> = [
    ...pageLinks.map(link => ({ ...link, modalTriggerSelector: undefined, modalTriggerText: undefined })),
    ...modalLinks
  ];

  // Normalize URLs and filter out invalid ones, preserving context
  interface LinkWithContext {
    url: string;
    text: string;
    selector: string;
    location: string;
    modalTriggerSelector?: string;
    modalTriggerText?: string;
  }
  
  const normalizedLinks: LinkWithContext[] = [];
  const seen = new Set<string>();

  for (const link of allLinks) {
    try {
      // Skip empty, javascript:, mailto:, tel:, and anchor-only links
      if (!link.url || link.url.startsWith('javascript:') || link.url.startsWith('mailto:') || link.url.startsWith('tel:') || link.url.startsWith('#')) {
        continue;
      }

      // Convert relative URLs to absolute
      const urlObj = new URL(link.url, base);
      const absoluteUrl = urlObj.href;

      // Remove hash fragments and trailing slashes for consistency
      const normalizedUrl = absoluteUrl.split('#')[0].replace(/\/$/, '');

      // Deduplicate by URL, but preserve context from first occurrence
      if (!seen.has(normalizedUrl)) {
        seen.add(normalizedUrl);
        normalizedLinks.push({
          url: normalizedUrl,
          text: link.text,
          selector: link.selector,
          location: link.location,
          modalTriggerSelector: link.modalTriggerSelector,
          modalTriggerText: link.modalTriggerText,
        });
      }
    } catch (error) {
      // Skip invalid URLs
    }
  }

  console.log(`  ✓ Link extraction complete: ${normalizedLinks.length} unique link(s) found`);
  return normalizedLinks;
}

/**
 * Check if a single link is broken using HEAD request (faster than GET)
 * Falls back to GET if HEAD is not supported
 */
export async function checkLink(
  request: APIRequestContext,
  url: string,
  timeout: number = 5000, // Reduced from 10s to 5s
  context?: { text?: string; selector?: string; location?: string; modalTriggerSelector?: string; modalTriggerText?: string }
): Promise<LinkCheckResult> {
  try {
    // Try HEAD request first (faster, doesn't download body)
    let response;
    try {
      response = await request.head(url, { timeout });
    } catch (error) {
      // If HEAD fails, try GET
      response = await request.get(url, { timeout });
    }

    const status = response.status();
    const statusText = response.statusText();
    const isBroken = status >= 400;

    return {
      url,
      status,
      statusText,
      isBroken,
      linkText: context?.text,
      selector: context?.selector,
      location: context?.location,
      modalTriggerSelector: context?.modalTriggerSelector,
      modalTriggerText: context?.modalTriggerText,
    };
  } catch (error: any) {
    // Network errors, timeouts, etc.
    return {
      url,
      status: 0,
      statusText: 'Error',
      isBroken: true,
      error: error?.message || 'Unknown error',
      linkText: context?.text,
      selector: context?.selector,
      location: context?.location,
      modalTriggerSelector: context?.modalTriggerSelector,
      modalTriggerText: context?.modalTriggerText,
    };
  }
}

/**
 * Check multiple links in parallel with context
 */
export async function checkLinks(
  request: APIRequestContext,
  links: Array<{ url: string; text?: string; selector?: string; location?: string; modalTriggerSelector?: string; modalTriggerText?: string }>,
  concurrency: number = 10
): Promise<LinkCheckResult[]> {
  const results: LinkCheckResult[] = [];
  const startTime = Date.now();
  const totalLinks = links.length;
  
  if (totalLinks === 0) {
    console.log('  ✓ No links to check');
    return results;
  }
  
  // Process links in batches to avoid overwhelming the server
  const totalBatches = Math.ceil(totalLinks / concurrency);
  let batchNumber = 0;
  
  for (let i = 0; i < links.length; i += concurrency) {
    batchNumber++;
    const batch = links.slice(i, i + concurrency);
    const batchStart = i + 1;
    const batchEnd = Math.min(i + concurrency, totalLinks);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ⏳ Checking links ${batchStart}-${batchEnd} of ${totalLinks}... (${elapsed}s elapsed)`);
    
    const batchResults = await Promise.all(
      batch.map(link => checkLink(request, link.url, 5000, {
        text: link.text,
        selector: link.selector,
        location: link.location,
        modalTriggerSelector: link.modalTriggerSelector,
        modalTriggerText: link.modalTriggerText,
      }))
    );
    results.push(...batchResults);
    
    const batchElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const brokenInBatch = batchResults.filter(r => r.isBroken).length;
    console.log(`  ✓ Batch ${batchNumber}/${totalBatches} complete (${brokenInBatch} broken, ${batchElapsed}s total)`);
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalBroken = results.filter(r => r.isBroken).length;
  console.log(`  ✓ Link checking complete: ${totalBroken} broken out of ${totalLinks} (${totalElapsed}s total)`);
  
  return results;
}

/**
 * Check all links on a page for broken links
 * Returns only broken links
 * Uses extractVisibleLinks by default to check only visible, user-accessible links
 */
export async function checkBrokenLinks(
  page: Page,
  request: APIRequestContext,
  baseUrl?: string,
  concurrency: number = 10,
  useVisibleLinks: boolean = true,
  captureScreenshot: boolean = true
): Promise<{ 
  brokenLinks: LinkCheckResult[]; 
  totalLinks: number;
  screenshotPaths?: { fullPage: string | null; closeUps: string[] };
}> {
  const startTime = Date.now();
  console.log('  ⏳ Starting broken links check...');
  
  // Extract links with context - use visible links by default
  console.log('  ⏳ Extracting links from page...');
  const linksWithContext = useVisibleLinks
    ? await extractVisibleLinks(page, baseUrl)
    : await extractLinks(page, baseUrl);
  
  console.log(`  ✓ Found ${linksWithContext.length} link(s) to check`);

  // Check all links with context
  const results = await checkLinks(request, linksWithContext, concurrency);

  // Filter to only broken links
  const brokenLinks = results.filter(result => result.isBroken);
  
  // Capture screenshots if broken links found
  let screenshotPaths: { fullPage: string | null; closeUps: string[] } | undefined;
  if (captureScreenshot && brokenLinks.length > 0) {
    console.log(`  ⏳ Capturing screenshots for ${brokenLinks.length} broken link(s)...`);
    try {
      screenshotPaths = await createBrokenLinkScreenshots(
        page,
        brokenLinks.map(link => ({
          selector: link.selector,
          linkText: link.linkText,
          url: link.url,
          status: link.status,
          location: link.location,
          modalTriggerSelector: link.modalTriggerSelector,
          modalTriggerText: link.modalTriggerText,
        })),
        'test-results'
      );
      console.log('  ✓ Screenshots captured');
    } catch (error) {
      console.warn('  ⚠️  Failed to capture broken link screenshots:', error);
    }
  }
  
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  ✓ Broken links check complete: ${brokenLinks.length} broken out of ${linksWithContext.length} (${totalElapsed}s total)`);
  
  return {
    brokenLinks,
    totalLinks: linksWithContext.length,
    screenshotPaths,
  };
}

/**
 * Format broken links results for reporting with readable table format
 */
export function formatBrokenLinksReport(
  brokenLinks: LinkCheckResult[],
  totalLinks?: number,
  url?: string
): string {
  const brokenCount = brokenLinks.length;
  const passedCount = totalLinks !== undefined ? totalLinks - brokenCount : undefined;

  // Build summary using unified template
  const summary: ReportItem[] = [];
  
  if (totalLinks !== undefined) {
    summary.push({
      label: 'Total Links Checked',
      value: totalLinks,
      status: 'info',
    });
    if (passedCount !== undefined) {
      summary.push({
        label: 'Working Links',
        value: passedCount,
        status: 'passed',
      });
    }
  }
  
  summary.push({
    label: 'Broken Links',
    value: brokenCount,
    status: brokenCount === 0 ? 'passed' : 'failed',
  });

  // Build sections for broken links
  const sections: ReportSection[] = [];
  
  if (brokenLinks.length > 0) {
    sections.push({
      title: 'Broken Links',
      items: brokenLinks.map((link) => {
        let details = `Status: ${link.status} ${link.statusText}`;
        if (link.error) {
          details += `\nError: ${link.error}`;
        }
        if (link.location) {
          details += `\nLocation: ${link.location}`;
        }
        if (link.linkText) {
          details += `\nLink Text: "${link.linkText}"`;
        }
        if (link.selector) {
          details += `\nSelector: ${link.selector}`;
        }
        
        const label = link.linkText 
          ? `${link.linkText} (${link.location || 'Page'})`
          : (link.url.length > 60 ? link.url.substring(0, 57) + '...' : link.url);
        
        return {
          label,
          value: `${link.status} ${link.statusText}`,
          status: 'failed' as const,
          details,
        };
      }),
    });
  }

  // Use unified template
  let report = formatUnifiedReport({
    testName: 'Broken Links Check',
    url,
    summary,
    sections,
  });
  
  // Add screenshot note if broken links found
  if (sections.length > 0 && sections[0].items.length > 0) {
    report += `\n📸 Screenshots have been captured and attached to the test report.\n`;
  }
  
  return report;
}

