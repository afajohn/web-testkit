import { Page } from '@playwright/test';
import {
  formatUnifiedReport,
  type ReportItem,
  type ReportSection,
} from './formatting';

/**
 * Interface for social media check results
 */
export interface SocialMediaResult {
  check: string;
  passed: boolean;
  message: string;
  tag?: string;
  value?: string;
}

/**
 * Interface for social media check summary
 */
export interface SocialMediaSummary {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  results: SocialMediaResult[];
  passed: boolean;
}

/**
 * Check Twitter Card tags
 */
export async function checkTwitterCards(
  page: Page
): Promise<SocialMediaResult[]> {
  const results: SocialMediaResult[] = [];

  const twitterTags = {
    'twitter:card': { required: true, description: 'Card type (summary, summary_large_image, etc.)' },
    'twitter:title': { required: false, description: 'Twitter card title' },
    'twitter:description': { required: false, description: 'Twitter card description' },
    'twitter:image': { required: false, description: 'Twitter card image URL' },
    'twitter:site': { required: false, description: 'Twitter site username' },
    'twitter:creator': { required: false, description: 'Twitter creator username' },
  };

  for (const [tagName, config] of Object.entries(twitterTags)) {
    const tag = page.locator(`meta[name="${tagName}"]`);
    const tagExists = await tag.count() > 0;

    if (!tagExists) {
      if (config.required) {
        results.push({
          check: 'Twitter Card',
          passed: false,
          message: `Required Twitter tag missing: ${tagName}`,
          tag: tagName,
        });
      } else {
        results.push({
          check: 'Twitter Card',
          passed: true,
          message: `Twitter tag ${tagName} is optional (not present)`,
          tag: tagName,
        });
      }
    } else {
      const content = await tag.getAttribute('content');
      if (content && content.trim().length > 0) {
        results.push({
          check: 'Twitter Card',
          passed: true,
          message: `Twitter tag ${tagName} is present`,
          tag: tagName,
          value: content,
        });
      } else {
        results.push({
          check: 'Twitter Card',
          passed: false,
          message: `Twitter tag ${tagName} has empty content`,
          tag: tagName,
        });
      }
    }
  }

  return results;
}

/**
 * Enhanced Open Graph tag checking (beyond basic checks)
 */
export async function checkEnhancedOpenGraph(
  page: Page
): Promise<SocialMediaResult[]> {
  const results: SocialMediaResult[] = [];

  const ogTags = {
    'og:type': { required: false, description: 'Content type (website, article, etc.)' },
    'og:url': { required: false, description: 'Canonical URL' },
    'og:site_name': { required: false, description: 'Site name' },
    'og:locale': { required: false, description: 'Locale (e.g., en_US)' },
  };

  for (const [tagName, config] of Object.entries(ogTags)) {
    const tag = page.locator(`meta[property="${tagName}"]`);
    const tagExists = await tag.count() > 0;

    if (!tagExists) {
      results.push({
        check: 'Open Graph',
        passed: true,
        message: `Open Graph tag ${tagName} is optional (not present)`,
        tag: tagName,
      });
    } else {
      const content = await tag.getAttribute('content');
      if (content && content.trim().length > 0) {
        // Validate specific tags
        let isValid = true;
        let validationMessage = `Open Graph tag ${tagName} is present`;

        if (tagName === 'og:type') {
          const validTypes = ['website', 'article', 'blog', 'product', 'video', 'music', 'profile'];
          if (!validTypes.includes(content.toLowerCase())) {
            isValid = false;
            validationMessage = `Open Graph type should be one of: ${validTypes.join(', ')}, found: ${content}`;
          }
        } else if (tagName === 'og:url') {
          try {
            new URL(content);
          } catch {
            isValid = false;
            validationMessage = `Open Graph URL is invalid: ${content}`;
          }
        }

        results.push({
          check: 'Open Graph',
          passed: isValid,
          message: validationMessage,
          tag: tagName,
          value: content,
        });
      } else {
        results.push({
          check: 'Open Graph',
          passed: false,
          message: `Open Graph tag ${tagName} has empty content`,
          tag: tagName,
        });
      }
    }
  }

  return results;
}

/**
 * Validate social media links
 */
export async function validateSocialLinks(
  page: Page
): Promise<SocialMediaResult[]> {
  const results: SocialMediaResult[] = [];

  const socialPlatforms = {
    facebook: ['facebook.com', 'fb.com'],
    twitter: ['twitter.com', 'x.com'],
    linkedin: ['linkedin.com'],
    instagram: ['instagram.com'],
    youtube: ['youtube.com', 'youtu.be'],
    pinterest: ['pinterest.com'],
  };

  const socialLinks: { platform: string; url: string }[] = [];

  // Find all links
  const links = await page.locator('a[href]').all();

  for (const link of links) {
    const href = await link.getAttribute('href').catch(() => '');
    if (!href) continue;

    for (const [platform, domains] of Object.entries(socialPlatforms)) {
      if (domains.some(domain => href.includes(domain))) {
        socialLinks.push({ platform, url: href });
        break;
      }
    }
  }

  if (socialLinks.length === 0) {
    results.push({
      check: 'Social Media Links',
      passed: true,
      message: 'No social media links found (not applicable)',
    });
    return results;
  }

  // Group by platform
  const linksByPlatform: Record<string, string[]> = {};
  socialLinks.forEach(({ platform, url }) => {
    if (!linksByPlatform[platform]) {
      linksByPlatform[platform] = [];
    }
    linksByPlatform[platform].push(url);
  });

  for (const [platform, urls] of Object.entries(linksByPlatform)) {
    // Check if URLs are valid
    let allValid = true;
    for (const url of urls) {
      try {
        new URL(url);
      } catch {
        allValid = false;
      }
    }

    results.push({
      check: 'Social Media Links',
      passed: allValid,
      message: `Found ${urls.length} ${platform} link(s)`,
      tag: platform,
      value: urls[0], // Show first URL
    });
  }

  return results;
}

/**
 * Test social sharing functionality
 */
export async function testSocialSharing(
  page: Page
): Promise<SocialMediaResult> {
  // Look for social sharing buttons
  const sharingSelectors = [
    '[class*="share"]',
    '[class*="social-share"]',
    '[data-share]',
    'a[href*="share"]',
  ];

  let sharingButtonsFound = 0;

  for (const selector of sharingSelectors) {
    const buttons = await page.locator(selector).all();
    sharingButtonsFound += buttons.length;
  }

  if (sharingButtonsFound === 0) {
    return {
      check: 'Social Sharing',
      passed: true,
      message: 'No social sharing buttons found (not applicable)',
    };
  }

  return {
    check: 'Social Sharing',
    passed: true,
    message: `Found ${sharingButtonsFound} social sharing element(s)`,
  };
}

/**
 * Run all social media checks
 */
export async function checkSocialMediaTags(
  page: Page
): Promise<SocialMediaSummary> {
  const results: SocialMediaResult[] = [];

  // Twitter Cards
  results.push(...await checkTwitterCards(page));

  // Enhanced Open Graph
  results.push(...await checkEnhancedOpenGraph(page));

  // Social Links
  results.push(...await validateSocialLinks(page));

  // Social Sharing
  results.push(await testSocialSharing(page));

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
 * Format social media report
 */
export function formatSocialMediaReport(
  summary: SocialMediaSummary,
  url?: string
): string {
  const sections: ReportSection[] = [];

  if (summary.results.length > 0) {
    const items: ReportItem[] = summary.results.map(result => ({
      label: result.tag || result.check,
      value: result.passed ? 'Passed' : 'Failed',
      status: result.passed ? 'passed' : 'failed',
      details: result.value ? `${result.message} (${result.value})` : result.message,
    }));

    sections.push({
      title: 'Social Media Check Results',
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
    testName: 'Social Media',
    url,
    summary: summaryItems,
    sections,
  });
}
