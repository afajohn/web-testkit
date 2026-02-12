import { Page, APIRequestContext } from '@playwright/test';
import {
  formatUnifiedReport,
  type ReportItem,
  type ReportSection,
} from './formatting';

/**
 * Interface for extended SEO check results
 */
export interface ExtendedSEOResult {
  check: string;
  passed: boolean;
  message: string;
  value?: string;
}

/**
 * Interface for extended SEO summary
 */
export interface ExtendedSEOSummary {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  results: ExtendedSEOResult[];
  passed: boolean;
}

/**
 * Check XML Sitemap availability
 */
export async function checkSitemap(
  page: Page,
  baseUrl: string,
  request?: APIRequestContext
): Promise<ExtendedSEOResult> {
  try {
    const urlObj = new URL(baseUrl);
    const sitemapUrl = `${urlObj.origin}/sitemap.xml`;

    if (request) {
      try {
        const response = await request.get(sitemapUrl);
        const status = response.status();

        if (status === 200) {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('xml')) {
            return {
              check: 'XML Sitemap',
              passed: true,
              message: `Sitemap found at: ${sitemapUrl}`,
              value: sitemapUrl,
            };
          } else {
            return {
              check: 'XML Sitemap',
              passed: false,
              message: `Sitemap exists but wrong content-type: ${contentType}`,
              value: sitemapUrl,
            };
          }
        } else {
          return {
            check: 'XML Sitemap',
            passed: false,
            message: `Sitemap returned status ${status}`,
            value: sitemapUrl,
          };
        }
      } catch (error: any) {
        return {
          check: 'XML Sitemap',
          passed: false,
          message: `Sitemap not accessible: ${error.message}`,
          value: sitemapUrl,
        };
      }
    }

    // Fallback: check robots.txt for sitemap reference
    const robotsUrl = `${urlObj.origin}/robots.txt`;
    try {
      if (request) {
        const robotsResponse = await request.get(robotsUrl);
        const robotsText = await robotsResponse.text();
        if (robotsText.includes('Sitemap:')) {
          return {
            check: 'XML Sitemap',
            passed: true,
            message: 'Sitemap referenced in robots.txt',
          };
        }
      }
    } catch {
      // Ignore robots.txt errors
    }

    return {
      check: 'XML Sitemap',
      passed: false,
      message: `Sitemap not found at: ${sitemapUrl}`,
      value: sitemapUrl,
    };
  } catch (error: any) {
    return {
      check: 'XML Sitemap',
      passed: false,
      message: `Error checking sitemap: ${error.message}`,
    };
  }
}

/**
 * Validate robots.txt
 */
export async function validateRobotsTxt(
  page: Page,
  baseUrl: string,
  request?: APIRequestContext
): Promise<ExtendedSEOResult> {
  try {
    const urlObj = new URL(baseUrl);
    const robotsUrl = `${urlObj.origin}/robots.txt`;

    if (!request) {
      return {
        check: 'Robots.txt',
        passed: false,
        message: 'APIRequestContext required for robots.txt validation',
      };
    }

    try {
      const response = await request.get(robotsUrl);
      const status = response.status();

      if (status === 200) {
        const robotsText = await response.text();
        
        // Basic validation
        const hasUserAgent = robotsText.toLowerCase().includes('user-agent');
        const hasDisallow = robotsText.toLowerCase().includes('disallow');
        const hasSitemap = robotsText.toLowerCase().includes('sitemap:');

        if (!hasUserAgent && !hasDisallow && !hasSitemap) {
          return {
            check: 'Robots.txt',
            passed: false,
            message: 'Robots.txt exists but appears to be empty or invalid',
            value: robotsUrl,
          };
        }

        return {
          check: 'Robots.txt',
          passed: true,
          message: `Robots.txt is accessible and valid`,
          value: robotsUrl,
        };
      } else if (status === 404) {
        return {
          check: 'Robots.txt',
          passed: true,
          message: 'Robots.txt not found (not required, but recommended)',
        };
      } else {
        return {
          check: 'Robots.txt',
          passed: false,
          message: `Robots.txt returned status ${status}`,
          value: robotsUrl,
        };
      }
    } catch (error: any) {
      return {
        check: 'Robots.txt',
        passed: false,
        message: `Error accessing robots.txt: ${error.message}`,
        value: robotsUrl,
      };
    }
  } catch (error: any) {
    return {
      check: 'Robots.txt',
      passed: false,
      message: `Error validating robots.txt: ${error.message}`,
    };
  }
}

/**
 * Check URL structure
 */
export async function checkURLStructure(
  page: Page,
  url: string
): Promise<ExtendedSEOResult[]> {
  const results: ExtendedSEOResult[] = [];

  try {
    const urlObj = new URL(url);

    // Check for clean URL structure
    const pathname = urlObj.pathname;
    
    // Check for file extensions in path (not ideal for SEO)
    const hasFileExtension = /\.(html|htm|php|asp|aspx)$/i.test(pathname);
    if (hasFileExtension) {
      results.push({
        check: 'URL Structure',
        passed: false,
        message: 'URL contains file extension (consider using clean URLs)',
        value: pathname,
      });
    } else {
      results.push({
        check: 'URL Structure',
        passed: true,
        message: 'URL has clean structure (no file extension)',
        value: pathname,
      });
    }

    // Check URL length (recommended < 100 characters)
    const fullUrl = url.length;
    if (fullUrl > 100) {
      results.push({
        check: 'URL Length',
        passed: false,
        message: `URL is too long (${fullUrl} chars, recommended < 100)`,
        value: url.substring(0, 100) + '...',
      });
    } else {
      results.push({
        check: 'URL Length',
        passed: true,
        message: `URL length is acceptable (${fullUrl} chars)`,
      });
    }

    // Check for query parameters (not necessarily bad, but note it)
    if (urlObj.search) {
      results.push({
        check: 'URL Structure',
        passed: true,
        message: 'URL contains query parameters',
        value: urlObj.search,
      });
    }

    return results;
  } catch (error: any) {
    return [{
      check: 'URL Structure',
      passed: false,
      message: `Error checking URL structure: ${error.message}`,
    }];
  }
}

/**
 * Check language attributes
 */
export async function checkLanguageAttributes(
  page: Page
): Promise<ExtendedSEOResult> {
  try {
    const htmlLang = await page.locator('html').getAttribute('lang').catch(() => '');
    
    if (!htmlLang) {
      return {
        check: 'Language Attribute',
        passed: false,
        message: 'HTML lang attribute is missing. Add lang attribute to <html> tag (e.g., <html lang="en">)',
      };
    }

    if (htmlLang.length < 2) {
      return {
        check: 'Language Attribute',
        passed: false,
        message: `HTML lang attribute is invalid: ${htmlLang}`,
        value: htmlLang,
      };
    }

    return {
      check: 'Language Attribute',
      passed: true,
      message: `HTML lang attribute is set: ${htmlLang}`,
      value: htmlLang,
    };
  } catch (error: any) {
    return {
      check: 'Language Attribute',
      passed: false,
      message: `Error checking language attribute: ${error.message}`,
    };
  }
}

/**
 * Check breadcrumb navigation
 */
export async function checkBreadcrumbs(
  page: Page
): Promise<ExtendedSEOResult[]> {
  const results: ExtendedSEOResult[] = [];

  try {
    // Check for breadcrumb HTML structure
    const breadcrumbSelectors = [
      '[class*="breadcrumb"]',
      '[id*="breadcrumb"]',
      '[role="navigation"][aria-label*="breadcrumb" i]',
      'nav[aria-label*="breadcrumb" i]',
    ];

    let breadcrumbFound = false;
    let breadcrumbElement: any = null;

    for (const selector of breadcrumbSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        breadcrumbFound = true;
        breadcrumbElement = element;
        break;
      }
    }

    if (!breadcrumbFound) {
      results.push({
        check: 'Breadcrumb Navigation',
        passed: true,
        message: 'No breadcrumb navigation found (not required)',
      });
      return results;
    }

    // Check for breadcrumb links
    const breadcrumbLinks = await breadcrumbElement.locator('a').all();
    if (breadcrumbLinks.length === 0) {
      results.push({
        check: 'Breadcrumb Navigation',
        passed: false,
        message: 'Breadcrumb container found but no links present',
      });
      return results;
    }

    results.push({
      check: 'Breadcrumb Navigation',
      passed: true,
      message: `Breadcrumb navigation found with ${breadcrumbLinks.length} link(s)`,
    });

    // Check for structured data (JSON-LD or microdata)
    const hasStructuredData = await page.evaluate(() => {
      // Check for JSON-LD breadcrumb
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of jsonLdScripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          const schemas = Array.isArray(data) ? data : [data];
          for (const schema of schemas) {
            if (schema['@type'] === 'BreadcrumbList' || schema.type === 'BreadcrumbList') {
              return true;
            }
          }
        } catch {
          // Invalid JSON, skip
        }
      }

      // Check for microdata
      return document.querySelector('[itemtype*="BreadcrumbList"]') !== null;
    });

    if (hasStructuredData) {
      results.push({
        check: 'Breadcrumb Structured Data',
        passed: true,
        message: 'Breadcrumb has structured data markup',
      });
    } else {
        results.push({
          check: 'Breadcrumb Structured Data',
          passed: false,
          message: 'Breadcrumb navigation found but lacks structured data markup. Add JSON-LD or microdata for breadcrumb navigation',
        });
    }

    return results;
  } catch (error: any) {
    return [{
      check: 'Breadcrumb Navigation',
      passed: false,
      message: `Error checking breadcrumbs: ${error.message}`,
    }];
  }
}

/**
 * Run all extended SEO checks
 */
export async function runExtendedSEOChecks(
  page: Page,
  url: string,
  request?: APIRequestContext
): Promise<ExtendedSEOSummary> {
  const results: ExtendedSEOResult[] = [];

  // Sitemap
  results.push(await checkSitemap(page, url, request));

  // Robots.txt
  results.push(await validateRobotsTxt(page, url, request));

  // URL Structure
  results.push(...await checkURLStructure(page, url));

  // Language Attributes
  results.push(await checkLanguageAttributes(page));

  // Breadcrumbs
  results.push(...await checkBreadcrumbs(page));

  const passedChecks = results.filter(r => r.passed).length;
  const failedChecks = results.filter(r => !r.passed).length;

  return {
    totalChecks: results.length,
    passedChecks,
    failedChecks,
    results,
    passed: failedChecks === 0,
  };
}

/**
 * Format extended SEO report
 */
export function formatExtendedSEOReport(
  summary: ExtendedSEOSummary,
  url?: string
): string {
  const sections: ReportSection[] = [];

  if (summary.results.length > 0) {
    const items: ReportItem[] = summary.results.map(result => ({
      label: result.check,
      value: result.passed ? 'Passed' : 'Failed',
      status: result.passed ? 'passed' : 'failed',
      details: result.value ? `${result.message} (${result.value})` : result.message,
    }));

    sections.push({
      title: 'Extended SEO Check Results',
      items,
    });
  }

  const summaryItems: ReportItem[] = [
    {
      label: 'Total Checks',
      value: summary.totalChecks,
      status: 'info',
    },
    {
      label: 'Passed',
      value: summary.passedChecks,
      status: summary.passedChecks === summary.totalChecks ? 'passed' : 'warning',
    },
    {
      label: 'Failed',
      value: summary.failedChecks,
      status: summary.failedChecks === 0 ? 'passed' : 'failed',
    },
  ];

  return formatUnifiedReport({
    testName: 'Extended SEO Checks',
    url,
    summary: summaryItems,
    sections,
  });
}
