import { Page, APIRequestContext } from '@playwright/test';
import { URL } from 'url';

/**
 * Interface for link element information
 */
export interface LinkElement {
  selector: string;
  linkText: string;
  html: string;
  href: string;
}

/**
 * Interface for link check results
 */
export interface LinkCheckResult {
  url: string;
  status: number;
  statusText: string;
  isBroken: boolean;
  error?: string;
  elements?: LinkElement[];
}

/**
 * Extract all links from a page with element information
 */
export async function extractLinksWithElements(page: Page, baseUrl?: string): Promise<{ url: string; elements: LinkElement[] }[]> {
  const currentUrl = page.url();
  const base = baseUrl || currentUrl;
  const baseUrlObj = new URL(base);

  // Extract all link elements with their information
  const linkData = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    return anchors.map(anchor => {
      const element = anchor as HTMLAnchorElement;
      const href = element.href;
      
      // Generate selector
      let selector = '';
      if (element.id) {
        selector = `#${element.id}`;
      } else if (element.className && typeof element.className === 'string') {
        const classes = element.className.trim().split(/\s+/).filter(c => c);
        if (classes.length > 0) {
          selector = `a.${classes.join('.')}`;
        }
      }
      if (!selector) {
        selector = element.tagName.toLowerCase();
        if (element.getAttribute('role')) {
          selector += `[role="${element.getAttribute('role')}"]`;
        }
      }
      
      // Get link text (trimmed)
      const linkText = (element.textContent || '').trim();
      
      // Get outer HTML
      const html = element.outerHTML;
      
      return {
        href,
        selector,
        linkText,
        html,
      };
    });
  });

  // Group by normalized URL
  const urlMap = new Map<string, LinkElement[]>();

  for (const link of linkData) {
    try {
      const href = link.href;
      
      // Skip empty, javascript:, mailto:, tel:, and anchor-only links
      if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
        continue;
      }

      // Convert relative URLs to absolute
      const urlObj = new URL(href, base);
      const absoluteUrl = urlObj.href;

      // Only check links from the same origin (optional: remove to check external links)
      // Uncomment the next line to only check same-origin links:
      // if (urlObj.origin !== baseUrlObj.origin) continue;

      // Remove hash fragments and trailing slashes for consistency
      const normalizedUrl = absoluteUrl.split('#')[0].replace(/\/$/, '');

      // Group elements by normalized URL
      if (!urlMap.has(normalizedUrl)) {
        urlMap.set(normalizedUrl, []);
      }
      urlMap.get(normalizedUrl)!.push({
        selector: link.selector,
        linkText: link.linkText,
        html: link.html,
        href: link.href,
      });
    } catch (error) {
      // Skip invalid URLs
      console.warn(`Invalid URL skipped: ${link.href}`);
    }
  }

  // Convert map to array
  return Array.from(urlMap.entries()).map(([url, elements]) => ({
    url,
    elements,
  }));
}

/**
 * Extract all links from a page and normalize them to absolute URLs
 * @deprecated Use extractLinksWithElements for element information
 */
export async function extractLinks(page: Page, baseUrl?: string): Promise<string[]> {
  const linksWithElements = await extractLinksWithElements(page, baseUrl);
  return linksWithElements.map(link => link.url);
}

/**
 * Check if a URL has a file extension (like .html, .php, .jpg, etc.)
 */
function hasFileExtension(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    // Check if pathname ends with a file extension (has a dot followed by 1-5 alphanumeric chars)
    return /\.\w{1,5}$/.test(pathname);
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a social media domain that might block automated requests
 */
function isSocialMediaDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const socialDomains = [
      'facebook.com',
      'www.facebook.com',
      'fb.com',
      'twitter.com',
      'www.twitter.com',
      'x.com',
      'www.x.com',
      'instagram.com',
      'www.instagram.com',
      'linkedin.com',
      'www.linkedin.com',
      'youtube.com',
      'www.youtube.com',
      'youtu.be',
      'tiktok.com',
      'www.tiktok.com',
      'pinterest.com',
      'www.pinterest.com',
      'reddit.com',
      'www.reddit.com',
      'snapchat.com',
      'www.snapchat.com',
    ];
    return socialDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

/**
 * Check if a single link is broken using HEAD request (faster than GET)
 * Falls back to GET if HEAD is not supported
 * If URL returns 404 and has no file extension, retries with trailing slash
 * For social media links, uses browser-like headers to avoid blocking
 */
export async function checkLink(
  request: APIRequestContext,
  url: string,
  timeout: number = 10000
): Promise<LinkCheckResult> {
  // Prepare headers that mimic a real browser to avoid blocking
  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };

  const isSocial = isSocialMediaDomain(url);
  
  const attemptCheck = async (checkUrl: string): Promise<{ response: any; success: boolean } | null> => {
    try {
      // Check if the URL being checked is a social media domain
      const checkIsSocial = isSocialMediaDomain(checkUrl);
      
      // For social media links, always use GET with headers (they often block HEAD requests)
      // For other links, try HEAD first (faster, doesn't download body)
      let response;
      
      if (checkIsSocial) {
        // Social media sites often block HEAD requests, so use GET with browser headers
        response = await request.get(checkUrl, { 
          timeout,
          headers: browserHeaders,
          maxRedirects: 10, // Follow redirects
        });
      } else {
        try {
          response = await request.head(checkUrl, { 
            timeout,
            headers: browserHeaders,
            maxRedirects: 10,
          });
        } catch (error) {
          // If HEAD fails, try GET
          response = await request.get(checkUrl, { 
            timeout,
            headers: browserHeaders,
            maxRedirects: 10,
          });
        }
      }

      const status = response.status();
      // Consider 3xx redirects as success (they're being followed)
      const isSuccess = status < 400;
      
      return { response, success: isSuccess };
    } catch (error: any) {
      return null;
    }
  };

  // First attempt with original URL
  const firstAttempt = await attemptCheck(url);
  
  if (firstAttempt && firstAttempt.success) {
    // URL works as-is
    return {
      url,
      status: firstAttempt.response.status(),
      statusText: firstAttempt.response.statusText(),
      isBroken: false,
    };
  }

  // If first attempt failed with 404 and URL has no file extension, try with trailing slash
  if (
    firstAttempt && 
    firstAttempt.response && 
    firstAttempt.response.status() === 404 && 
    !hasFileExtension(url) && 
    !url.endsWith('/')
  ) {
    const urlWithSlash = url + '/';
    const secondAttempt = await attemptCheck(urlWithSlash);
    
    if (secondAttempt && secondAttempt.success) {
      // URL works with trailing slash - return success but note the fix
      return {
        url, // Keep original URL in report
        status: secondAttempt.response.status(),
        statusText: secondAttempt.response.statusText(),
        isBroken: false,
        error: `⚠️ Works with trailing slash: ${urlWithSlash}`,
      };
    }
  }

  // Both attempts failed - return the first attempt's error or create error result
  if (firstAttempt && firstAttempt.response) {
    const status = firstAttempt.response.status();
    const statusText = firstAttempt.response.statusText();
    
    // Special handling for social media links that return 400/403
    // These often work in browsers but block automated requests
    if (isSocial && (status === 400 || status === 403)) {
      return {
        url,
        status,
        statusText,
        isBroken: false, // Mark as not broken since it likely works in browser
        error: `⚠️ Social media link may block automated requests (${status} ${statusText}), but should work in browser`,
      };
    }
    
    return {
      url,
      status,
      statusText,
      isBroken: true,
    };
  } else {
    // Network errors, timeouts, etc. - try one more time to get error details
    try {
      // For social media, use GET with headers; for others, try HEAD first
      if (isSocial) {
        await request.get(url, { timeout, headers: browserHeaders, maxRedirects: 10 });
      } else {
        await request.head(url, { timeout, headers: browserHeaders, maxRedirects: 10 });
      }
    } catch (error: any) {
      // For social media links with network errors, be more lenient
      // They might work in browser but fail automated checks
      if (isSocial) {
        return {
          url,
          status: 0,
          statusText: 'Error',
          isBroken: false, // Mark as potentially valid
          error: `⚠️ Social media link failed automated check (${error?.message || 'Unknown error'}), but should work in browser`,
        };
      }
      
      return {
        url,
        status: 0,
        statusText: 'Error',
        isBroken: true,
        error: error?.message || 'Unknown error',
      };
    }
    return {
      url,
      status: 0,
      statusText: 'Error',
      isBroken: true,
      error: 'Unknown error',
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
 * Returns only broken links with element information
 */
export async function checkBrokenLinks(
  page: Page,
  request: APIRequestContext,
  baseUrl?: string,
  concurrency: number = 10
): Promise<LinkCheckResult[]> {
  // Extract all links from the page with element information
  const linksWithElements = await extractLinksWithElements(page, baseUrl);
  const links = linksWithElements.map(link => link.url);
  
  console.log(`Found ${links.length} links to check`);

  // Create a map of URL to elements
  const urlToElementsMap = new Map<string, LinkElement[]>();
  linksWithElements.forEach(({ url, elements }) => {
    urlToElementsMap.set(url, elements);
  });

  // Check all links
  const results = await checkLinks(request, links, concurrency);

  // Add element information to results
  const resultsWithElements = results.map(result => ({
    ...result,
    elements: urlToElementsMap.get(result.url) || [],
  }));

  // Log warnings for links that work with trailing slash
  const needsSlash = resultsWithElements.filter(result => !result.isBroken && result.error && result.error.includes('trailing slash'));
  if (needsSlash.length > 0) {
    console.log(`\n⚠️  ${needsSlash.length} link(s) work but need trailing slash:`);
    needsSlash.forEach(link => {
      console.log(`   ${link.url} → ${link.error?.replace('⚠️ Works with trailing slash: ', '')}`);
    });
  }

  // Filter to only broken links
  return resultsWithElements.filter(result => result.isBroken);
}

/**
 * Format broken links results for reporting
 */
export function formatBrokenLinksReport(brokenLinks: LinkCheckResult[]): string {
  if (brokenLinks.length === 0) {
    return '✅ No broken links found!';
  }

  let report = '';
  
  brokenLinks.forEach((link, index) => {
    const number = index + 1;
    report += `${number}. **${link.url}**\n`;
    report += `  - Status: ${link.status} ${link.statusText}\n`;
    
    if (link.elements && link.elements.length > 0) {
      report += `  - Found on page (${link.elements.length} element(s)):\n`;
      link.elements.forEach((element, elemIndex) => {
        report += `    ${elemIndex + 1}. Selector: \`${element.selector}\`\n`;
        if (element.linkText) {
          report += `       - Link Text: "${element.linkText}"\n`;
        }
        report += `       - HTML: \`${element.html.replace(/`/g, '\\`')}\`\n`;
      });
    }
    
    if (link.error) {
      report += `  - Error: ${link.error}\n`;
    }
    
    report += '\n';
  });

  return report;
}

