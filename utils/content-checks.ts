import { Page, APIRequestContext } from '@playwright/test';
import {
  formatUnifiedReport,
  type ReportItem,
  type ReportSection,
} from './formatting';

/**
 * Interface for content check results
 */
export interface ContentCheckResult {
  check: string;
  passed: boolean;
  message: string;
  value?: string;
}

/**
 * Interface for content check summary
 */
export interface ContentCheckSummary {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  results: ContentCheckResult[];
  passed: boolean;
}

/**
 * Check content length
 */
export async function checkContentLength(
  page: Page,
  minWords: number = 300
): Promise<ContentCheckResult> {
  try {
    // Get main content text
    const contentText = await page.evaluate(() => {
      // Try to get main content area
      const main = document.querySelector('main, [role="main"], .content, #content, article');
      const element = main || document.body;
      
      // Remove script and style tags
      const scripts = element.querySelectorAll('script, style, nav, header, footer');
      scripts.forEach(el => el.remove());
      
      return element.textContent || '';
    });

    const wordCount = contentText.trim().split(/\s+/).filter(word => word.length > 0).length;

    if (wordCount < minWords) {
      return {
        check: 'Content Length',
        passed: false,
        message: `Content is too short (${wordCount} words, recommended minimum: ${minWords} words)`,
        value: `${wordCount} words`,
      };
    }

    return {
      check: 'Content Length',
      passed: true,
      message: `Content length is adequate (${wordCount} words)`,
      value: `${wordCount} words`,
    };
  } catch (error: any) {
    return {
      check: 'Content Length',
      passed: false,
      message: `Error checking content length: ${error.message}`,
    };
  }
}

/**
 * Check for broken images
 */
export async function checkBrokenImages(
  page: Page
): Promise<ContentCheckResult[]> {
  const results: ContentCheckResult[] = [];

  try {
    const images = await page.locator('img').all();
    let brokenCount = 0;
    const brokenImages: string[] = [];

    for (const img of images) {
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => {
        return el.naturalWidth;
      }).catch(() => 0);

      if (naturalWidth === 0) {
        brokenCount++;
        const src = await img.getAttribute('src').catch(() => '');
        brokenImages.push(src || 'unknown');
      }
    }

    if (brokenCount === 0) {
      results.push({
        check: 'Broken Images',
        passed: true,
        message: `All ${images.length} image(s) loaded successfully`,
      });
    } else {
      for (const src of brokenImages.slice(0, 5)) { // Report first 5
        results.push({
          check: 'Broken Images',
          passed: false,
          message: `Broken image detected: ${src}`,
          value: src,
        });
      }
      if (brokenImages.length > 5) {
        results.push({
          check: 'Broken Images',
          passed: false,
          message: `... and ${brokenImages.length - 5} more broken image(s)`,
        });
      }
    }

    return results;
  } catch (error: any) {
    return [{
      check: 'Broken Images',
      passed: false,
      message: `Error checking broken images: ${error.message}`,
    }];
  }
}

/**
 * Analyze link density
 */
export async function analyzeLinkDensity(
  page: Page
): Promise<ContentCheckResult> {
  try {
    const contentData = await page.evaluate(() => {
      const main = document.querySelector('main, [role="main"], .content, #content, article');
      const element = main || document.body;
      
      // Remove script and style tags
      const scripts = element.querySelectorAll('script, style, nav, header, footer');
      scripts.forEach(el => el.remove());
      
      const text = element.textContent || '';
      const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
      const linkCount = element.querySelectorAll('a').length;
      
      return { wordCount, linkCount };
    });

    const linkDensity = contentData.wordCount > 0
      ? (contentData.linkCount / contentData.wordCount) * 100
      : 0;

    // Recommended link density: 1-5% (too many links can hurt SEO)
    if (linkDensity > 5) {
      return {
        check: 'Link Density',
        passed: false,
        message: `Link density is too high (${linkDensity.toFixed(2)}%, recommended: 1-5%)`,
        value: `${linkDensity.toFixed(2)}%`,
      };
    } else if (linkDensity < 1 && contentData.linkCount > 0) {
      return {
        check: 'Link Density',
        passed: true,
        message: `Link density is low (${linkDensity.toFixed(2)}%, ${contentData.linkCount} links in ${contentData.wordCount} words)`,
        value: `${linkDensity.toFixed(2)}%`,
      };
    } else {
      return {
        check: 'Link Density',
        passed: true,
        message: `Link density is within recommended range (${linkDensity.toFixed(2)}%)`,
        value: `${linkDensity.toFixed(2)}%`,
      };
    }
  } catch (error: any) {
    return {
      check: 'Link Density',
      passed: false,
      message: `Error analyzing link density: ${error.message}`,
    };
  }
}

/**
 * Run all content checks
 */
export async function runContentChecks(
  page: Page,
  options?: {
    minWords?: number;
  }
): Promise<ContentCheckSummary> {
  const results: ContentCheckResult[] = [];

  // Content Length
  results.push(await checkContentLength(page, options?.minWords));

  // Broken Images
  results.push(...await checkBrokenImages(page));

  // Link Density
  results.push(await analyzeLinkDensity(page));

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
 * Format content check report
 */
export function formatContentCheckReport(
  summary: ContentCheckSummary,
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
      title: 'Content Check Results',
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
    testName: 'Content Quality Checks',
    url,
    summary: summaryItems,
    sections,
  });
}
