import { Page, APIRequestContext } from '@playwright/test';
import {
  formatUnifiedReport,
  type ReportItem,
  type ReportSection,
} from './formatting';

/**
 * Interface for security check results
 */
export interface SecurityCheckResult {
  check: string;
  passed: boolean;
  message: string;
  header?: string;
  value?: string;
  recommendation?: string;
}

/**
 * Interface for security check summary
 */
export interface SecurityCheckSummary {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  results: SecurityCheckResult[];
  passed: boolean;
}

/**
 * Security headers to check
 */
const SECURITY_HEADERS = {
  'Content-Security-Policy': {
    required: false,
    recommendation: 'Implement CSP to prevent XSS attacks',
  },
  'Strict-Transport-Security': {
    required: true,
    recommendation: 'Use HSTS to enforce HTTPS connections',
  },
  'X-Frame-Options': {
    required: false,
    recommendation: 'Use X-Frame-Options or CSP frame-ancestors to prevent clickjacking',
  },
  'X-Content-Type-Options': {
    required: true,
    recommendation: 'Set to "nosniff" to prevent MIME type sniffing',
  },
  'Referrer-Policy': {
    required: false,
    recommendation: 'Set Referrer-Policy to control referrer information',
  },
  'Permissions-Policy': {
    required: false,
    recommendation: 'Use Permissions-Policy to restrict browser features',
  },
};

/**
 * Check HTTPS enforcement
 */
export async function checkHTTPSEnforcement(
  page: Page,
  url: string
): Promise<SecurityCheckResult> {
  if (!url.startsWith('https://')) {
    return {
      check: 'HTTPS Enforcement',
      passed: false,
      message: 'URL does not use HTTPS',
      recommendation: 'Always use HTTPS for secure connections',
    };
  }

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (!response) {
      return {
        check: 'HTTPS Enforcement',
        passed: false,
        message: 'Failed to load page',
      };
    }

    const finalUrl = response.url();
    if (!finalUrl.startsWith('https://')) {
      return {
        check: 'HTTPS Enforcement',
        passed: false,
        message: `Page redirected to non-HTTPS URL: ${finalUrl}`,
        recommendation: 'Ensure all redirects maintain HTTPS',
      };
    }

    return {
      check: 'HTTPS Enforcement',
      passed: true,
      message: 'Page uses HTTPS',
    };
  } catch (error: any) {
    return {
      check: 'HTTPS Enforcement',
      passed: false,
      message: `Error checking HTTPS: ${error.message}`,
    };
  }
}

/**
 * Check security headers
 */
export async function checkSecurityHeaders(
  page: Page,
  url: string
): Promise<SecurityCheckResult[]> {
  const results: SecurityCheckResult[] = [];

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (!response) {
      return [{
        check: 'Security Headers',
        passed: false,
        message: 'Failed to load page',
      }];
    }

    const headers = response.headers();

    for (const [headerName, config] of Object.entries(SECURITY_HEADERS)) {
      const headerValue = headers[headerName.toLowerCase()] || headers[headerName];

      if (!headerValue) {
        if (config.required) {
          results.push({
            check: headerName,
            passed: false,
            message: `${headerName} header is missing`,
            header: headerName,
            recommendation: config.recommendation,
          });
        } else {
          results.push({
            check: headerName,
            passed: true,
            message: `${headerName} header is optional (not present)`,
            header: headerName,
            recommendation: config.recommendation,
          });
        }
      } else {
        // Validate header values
        let isValid = true;
        let validationMessage = `${headerName} header is present`;

        if (headerName === 'X-Content-Type-Options' && headerValue.toLowerCase() !== 'nosniff') {
          isValid = false;
          validationMessage = `${headerName} should be "nosniff", found: ${headerValue}`;
        }

        if (headerName === 'X-Frame-Options') {
          const validValues = ['DENY', 'SAMEORIGIN'];
          if (!validValues.includes(headerValue.toUpperCase())) {
            isValid = false;
            validationMessage = `${headerName} should be DENY or SAMEORIGIN, found: ${headerValue}`;
          }
        }

        if (headerName === 'Strict-Transport-Security') {
          if (!headerValue.includes('max-age')) {
            isValid = false;
            validationMessage = `${headerName} should include max-age directive`;
          }
        }

        results.push({
          check: headerName,
          passed: isValid,
          message: validationMessage,
          header: headerName,
          value: headerValue,
          recommendation: !isValid ? config.recommendation : undefined,
        });
      }
    }

    return results;
  } catch (error: any) {
    return [{
      check: 'Security Headers',
      passed: false,
      message: `Error checking security headers: ${error.message}`,
    }];
  }
}

/**
 * Check cookie security attributes
 */
export async function checkCookieSecurity(
  page: Page,
  url: string
): Promise<SecurityCheckResult[]> {
  const results: SecurityCheckResult[] = [];

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    const cookies = await page.context().cookies();
    
    if (cookies.length === 0) {
      return [{
        check: 'Cookie Security',
        passed: true,
        message: 'No cookies found (or cookies not accessible)',
      }];
    }

    for (const cookie of cookies) {
      const issues: string[] = [];
      
      // Check Secure flag (should be true for HTTPS sites)
      if (url.startsWith('https://') && !cookie.secure) {
        issues.push('Missing Secure flag');
      }

      // Check HttpOnly flag (recommended for session cookies)
      if (!cookie.httpOnly) {
        // Not necessarily a failure, but worth noting
        issues.push('Missing HttpOnly flag (recommended)');
      }

      // Check SameSite attribute
      if (!cookie.sameSite || cookie.sameSite === 'None') {
        if (cookie.secure) {
          issues.push('SameSite=None requires Secure flag (present)');
        } else {
          issues.push('SameSite=None requires Secure flag (missing)');
        }
      }

      if (issues.length > 0) {
        results.push({
          check: 'Cookie Security',
          passed: false,
          message: `Cookie "${cookie.name}" has security issues: ${issues.join(', ')}`,
          value: cookie.name,
          recommendation: 'Ensure cookies use Secure, HttpOnly, and appropriate SameSite attributes',
        });
      }
    }

    if (results.length === 0) {
      results.push({
        check: 'Cookie Security',
        passed: true,
        message: `All ${cookies.length} cookie(s) have proper security attributes`,
      });
    }

    return results;
  } catch (error: any) {
    return [{
      check: 'Cookie Security',
      passed: false,
      message: `Error checking cookie security: ${error.message}`,
    }];
  }
}

/**
 * Detect mixed content (HTTP resources on HTTPS pages)
 */
export async function detectMixedContent(
  page: Page,
  url: string
): Promise<SecurityCheckResult> {
  if (!url.startsWith('https://')) {
    return {
      check: 'Mixed Content',
      passed: true,
      message: 'Not applicable for HTTP pages',
    };
  }

  try {
    const mixedContentUrls: string[] = [];

    // Listen for requests to HTTP resources
    page.on('request', (request) => {
      const requestUrl = request.url();
      if (requestUrl.startsWith('http://') && !requestUrl.startsWith('http://localhost')) {
        mixedContentUrls.push(requestUrl);
      }
    });

    await page.goto(url, { waitUntil: 'networkidle' });

    // Also check for HTTP resources in page source
    const pageContent = await page.content();
    const httpMatches = pageContent.match(/http:\/\/[^\s"'>]+/g);
    if (httpMatches) {
      for (const match of httpMatches) {
        if (!match.includes('localhost') && !mixedContentUrls.includes(match)) {
          mixedContentUrls.push(match);
        }
      }
    }

    if (mixedContentUrls.length > 0) {
      return {
        check: 'Mixed Content',
        passed: false,
        message: `Found ${mixedContentUrls.length} HTTP resource(s) on HTTPS page`,
        value: mixedContentUrls.slice(0, 5).join(', '), // Show first 5
        recommendation: 'Replace all HTTP resources with HTTPS to prevent mixed content warnings',
      };
    }

    return {
      check: 'Mixed Content',
      passed: true,
      message: 'No mixed content detected',
    };
  } catch (error: any) {
    return {
      check: 'Mixed Content',
      passed: false,
      message: `Error detecting mixed content: ${error.message}`,
    };
  }
}

/**
 * Run all security checks
 */
export async function runSecurityChecks(
  page: Page,
  url: string
): Promise<SecurityCheckSummary> {
  const results: SecurityCheckResult[] = [];

  // HTTPS Enforcement
  results.push(await checkHTTPSEnforcement(page, url));

  // Security Headers
  results.push(...await checkSecurityHeaders(page, url));

  // Cookie Security
  results.push(...await checkCookieSecurity(page, url));

  // Mixed Content
  results.push(await detectMixedContent(page, url));

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
 * Format security check report
 */
export function formatSecurityCheckReport(
  summary: SecurityCheckSummary,
  url?: string
): string {
  const sections: ReportSection[] = [];

  if (summary.results.length > 0) {
    const items: ReportItem[] = summary.results.map(result => ({
      label: result.check,
      value: result.passed ? 'Passed' : 'Failed',
      status: result.passed ? 'passed' : 'failed',
      details: result.recommendation ? `${result.message}. ${result.recommendation}` : result.message,
    }));

    sections.push({
      title: 'Security Check Results',
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
    testName: 'Security Checks',
    url,
    summary: summaryItems,
    sections,
  });
}
