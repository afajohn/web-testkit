import { Page, APIRequestContext } from '@playwright/test';
import { URL } from 'url';

/**
 * Interface for link check results
 */
export interface LinkCheckResult {
  url: string;
  status: number;
  statusText: string;
  isBroken: boolean;
  error?: string;
}

/**
 * Extract all links from a page and normalize them to absolute URLs
 */
export async function extractLinks(page: Page, baseUrl?: string): Promise<string[]> {
  const currentUrl = page.url();
  const base = baseUrl || currentUrl;
  const baseUrlObj = new URL(base);

  // Extract all href attributes from <a> tags
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    return anchors.map(anchor => (anchor as HTMLAnchorElement).href);
  });

  // Normalize URLs and filter out invalid ones
  const normalizedLinks: string[] = [];
  const seen = new Set<string>();

  for (const link of links) {
    try {
      // Skip empty, javascript:, mailto:, tel:, and anchor-only links
      if (!link || link.startsWith('javascript:') || link.startsWith('mailto:') || link.startsWith('tel:') || link.startsWith('#')) {
        continue;
      }

      // Convert relative URLs to absolute
      const urlObj = new URL(link, base);
      const absoluteUrl = urlObj.href;

      // Only check links from the same origin (optional: remove to check external links)
      // Uncomment the next line to only check same-origin links:
      // if (urlObj.origin !== baseUrlObj.origin) continue;

      // Remove hash fragments and trailing slashes for consistency
      const normalizedUrl = absoluteUrl.split('#')[0].replace(/\/$/, '');

      // Deduplicate
      if (!seen.has(normalizedUrl)) {
        seen.add(normalizedUrl);
        normalizedLinks.push(normalizedUrl);
      }
    } catch (error) {
      // Skip invalid URLs
      console.warn(`Invalid URL skipped: ${link}`);
    }
  }

  return normalizedLinks;
}

/**
 * Check if a single link is broken using HEAD request (faster than GET)
 * Falls back to GET if HEAD is not supported
 */
export async function checkLink(
  request: APIRequestContext,
  url: string,
  timeout: number = 10000
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
    };
  } catch (error: any) {
    // Network errors, timeouts, etc.
    return {
      url,
      status: 0,
      statusText: 'Error',
      isBroken: true,
      error: error?.message || 'Unknown error',
    };
  }
}

/**
 * Check multiple links in parallel
 */
export async function checkLinks(
  request: APIRequestContext,
  urls: string[],
  concurrency: number = 10
): Promise<LinkCheckResult[]> {
  const results: LinkCheckResult[] = [];
  
  // Process links in batches to avoid overwhelming the server
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(url => checkLink(request, url))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Check all links on a page for broken links
 * Returns only broken links
 */
export async function checkBrokenLinks(
  page: Page,
  request: APIRequestContext,
  baseUrl?: string,
  concurrency: number = 10
): Promise<LinkCheckResult[]> {
  // Extract all links from the page
  const links = await extractLinks(page, baseUrl);
  
  console.log(`Found ${links.length} links to check`);

  // Check all links
  const results = await checkLinks(request, links, concurrency);

  // Filter to only broken links
  return results.filter(result => result.isBroken);
}

/**
 * Format broken links results for reporting
 */
export function formatBrokenLinksReport(brokenLinks: LinkCheckResult[]): string {
  if (brokenLinks.length === 0) {
    return '✅ No broken links found!';
  }

  let report = `❌ Found ${brokenLinks.length} broken link(s):\n\n`;
  
  for (const link of brokenLinks) {
    report += `  ${link.url}\n`;
    report += `    Status: ${link.status} ${link.statusText}\n`;
    if (link.error) {
      report += `    Error: ${link.error}\n`;
    }
    report += '\n';
  }

  return report;
}

