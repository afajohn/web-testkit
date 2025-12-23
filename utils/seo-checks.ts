import { Page, expect } from '@playwright/test';

/**
 * Interface for SEO check results
 */
export interface SEOCheckResult {
  check: string;
  passed: boolean;
  message: string;
  value?: string;
}

/**
 * Check if page title exists and is not empty
 */
export async function checkPageTitle(page: Page, expectedTitle?: string | RegExp): Promise<SEOCheckResult> {
  const title = await page.title();
  
  if (!title || title.trim().length === 0) {
    return {
      check: 'Page Title',
      passed: false,
      message: 'Page title is missing or empty',
    };
  }

  if (expectedTitle) {
    try {
      await expect(page).toHaveTitle(expectedTitle);
      return {
        check: 'Page Title',
        passed: true,
        message: `Page title matches expected: "${expectedTitle}"`,
        value: title,
      };
    } catch (error) {
      return {
        check: 'Page Title',
        passed: false,
        message: `Page title does not match expected: "${expectedTitle}"`,
        value: title,
      };
    }
  }

  return {
    check: 'Page Title',
    passed: true,
    message: `Page title is present: "${title}"`,
    value: title,
  };
}

/**
 * Check if meta description exists and has appropriate length (recommended: 50-160 characters)
 */
export async function checkMetaDescription(
  page: Page,
  minLength: number = 50,
  maxLength: number = 160
): Promise<SEOCheckResult> {
  const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');

  if (!metaDescription) {
    return {
      check: 'Meta Description',
      passed: false,
      message: 'Meta description is missing',
    };
  }

  const length = metaDescription.length;

  if (length < minLength) {
    return {
      check: 'Meta Description',
      passed: false,
      message: `Meta description is too short (${length} chars, recommended: ${minLength}-${maxLength})`,
      value: metaDescription,
    };
  }

  if (length > maxLength) {
    return {
      check: 'Meta Description',
      passed: false,
      message: `Meta description is too long (${length} chars, recommended: ${minLength}-${maxLength})`,
      value: metaDescription,
    };
  }

  return {
    check: 'Meta Description',
    passed: true,
    message: `Meta description has appropriate length (${length} chars)`,
    value: metaDescription,
  };
}

/**
 * Check if canonical URL exists
 */
export async function checkCanonicalURL(page: Page, expectedCanonical?: string): Promise<SEOCheckResult> {
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');

  if (!canonical) {
    return {
      check: 'Canonical URL',
      passed: false,
      message: 'Canonical URL is missing',
    };
  }

  if (expectedCanonical && canonical !== expectedCanonical) {
    return {
      check: 'Canonical URL',
      passed: false,
      message: `Canonical URL does not match expected: "${expectedCanonical}"`,
      value: canonical,
    };
  }

  return {
    check: 'Canonical URL',
    passed: true,
    message: `Canonical URL is present: "${canonical}"`,
    value: canonical,
  };
}

/**
 * Interface for detailed image information
 */
export interface ImageInfo {
  src: string;
  alt: string | null;
  title?: string | null;
  width?: string | null;
  height?: string | null;
}

/**
 * Get detailed information about all images on the page
 */
export async function getAllImageInfo(page: Page): Promise<ImageInfo[]> {
  const images = await page.locator('img').all();
  const imageInfo: ImageInfo[] = [];

  for (const img of images) {
    const src = (await img.getAttribute('src')) || 'unknown';
    const alt = await img.getAttribute('alt');
    const title = await img.getAttribute('title');
    const width = await img.getAttribute('width');
    const height = await img.getAttribute('height');
    
    imageInfo.push({
      src,
      alt,
      title: title || null,
      width: width || null,
      height: height || null,
    });
  }

  return imageInfo;
}

/**
 * Check if all images have alt attributes (accessibility + SEO)
 */
export async function checkImageAltAttributes(page: Page): Promise<SEOCheckResult> {
  const images = await page.locator('img').all();
  const imagesWithoutAlt: string[] = [];

  for (const img of images) {
    const alt = await img.getAttribute('alt');
    if (alt === null) {
      const src = (await img.getAttribute('src')) || 'unknown';
      imagesWithoutAlt.push(src);
    }
  }

  if (imagesWithoutAlt.length > 0) {
    return {
      check: 'Image Alt Attributes',
      passed: false,
      message: `${imagesWithoutAlt.length} image(s) missing alt attribute`,
      value: imagesWithoutAlt.join(', '),
    };
  }

  return {
    check: 'Image Alt Attributes',
    passed: true,
    message: `All ${images.length} images have alt attributes`,
  };
}

/**
 * Check heading structure (H1 should exist, proper hierarchy)
 */
export async function checkHeadingStructure(page: Page): Promise<SEOCheckResult> {
  const h1Count = await page.locator('h1').count();
  const headings = await page.evaluate(() => {
    const h1 = Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim() || '');
    const h2 = Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim() || '');
    return { h1, h2 };
  });

  const issues: string[] = [];

  if (h1Count === 0) {
    issues.push('No H1 heading found');
  } else if (h1Count > 1) {
    issues.push(`Multiple H1 headings found (${h1Count}), should have only one`);
  }

  if (issues.length > 0) {
    return {
      check: 'Heading Structure',
      passed: false,
      message: issues.join('; '),
      value: `H1: ${headings.h1.join(', ')}`,
    };
  }

  return {
    check: 'Heading Structure',
    passed: true,
    message: `Proper heading structure: 1 H1 found`,
    value: `H1: ${headings.h1[0]}`,
  };
}

/**
 * Check robots meta tag for index,follow directives
 */
export async function checkRobotsMetaTag(
  page: Page,
  requireIndex: boolean = true,
  requireFollow: boolean = true
): Promise<SEOCheckResult> {
  const robotsContent = await page.locator('meta[name="robots"]').getAttribute('content');

  if (!robotsContent) {
    // If no robots meta tag, it defaults to index,follow (search engines can index and follow)
    // So if we require index and follow, it passes; otherwise we might want to explicitly set it
    const passesByDefault = requireIndex && requireFollow;
    return {
      check: 'Robots Meta Tag',
      passed: passesByDefault,
      message: passesByDefault
        ? 'Robots meta tag is missing (defaults to index,follow)'
        : 'Robots meta tag is missing - consider adding explicit robots meta tag',
      value: 'default (no robots meta tag)',
    };
  }

  const robotsLower = robotsContent.toLowerCase();
  const hasIndex = robotsLower.includes('index') && !robotsLower.includes('noindex');
  const hasFollow = robotsLower.includes('follow') && !robotsLower.includes('nofollow');
  const hasNoIndex = robotsLower.includes('noindex');
  const hasNoFollow = robotsLower.includes('nofollow');

  const issues: string[] = [];

  if (requireIndex) {
    if (hasNoIndex) {
      issues.push('contains noindex (should be index)');
    } else if (!hasIndex && !robotsLower.includes('all')) {
      issues.push('missing index directive');
    }
  }

  if (requireFollow) {
    if (hasNoFollow) {
      issues.push('contains nofollow (should be follow)');
    } else if (!hasFollow && !robotsLower.includes('all')) {
      issues.push('missing follow directive');
    }
  }

  if (issues.length > 0) {
    return {
      check: 'Robots Meta Tag',
      passed: false,
      message: `Robots meta tag ${issues.join('; ')}`,
      value: robotsContent,
    };
  }

  return {
    check: 'Robots Meta Tag',
    passed: true,
    message: `Robots meta tag is properly configured: "${robotsContent}"`,
    value: robotsContent,
  };
}

/**
 * Check for Open Graph meta tags
 */
export async function checkOpenGraphTags(page: Page): Promise<SEOCheckResult> {
  const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
  const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
  const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
  const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');

  const missing: string[] = [];
  if (!ogTitle) missing.push('og:title');
  if (!ogDescription) missing.push('og:description');
  if (!ogImage) missing.push('og:image');
  if (!ogUrl) missing.push('og:url');

  if (missing.length > 0) {
    return {
      check: 'Open Graph Tags',
      passed: false,
      message: `Missing Open Graph tags: ${missing.join(', ')}`,
    };
  }

  return {
    check: 'Open Graph Tags',
    passed: true,
    message: 'All essential Open Graph tags are present',
  };
}

/**
 * Run all basic SEO checks on a page
 */
export async function runSEOChecks(
  page: Page,
  options: {
    checkTitle?: boolean;
    checkMetaDescription?: boolean;
    checkCanonical?: boolean;
    checkRobots?: boolean;
    checkImageAlt?: boolean;
    checkHeadings?: boolean;
    checkOpenGraph?: boolean;
    expectedTitle?: string | RegExp;
    expectedCanonical?: string;
    requireIndex?: boolean;
    requireFollow?: boolean;
  } = {}
): Promise<SEOCheckResult[]> {
  const {
    checkTitle = true,
    checkMetaDescription: shouldCheckMetaDescription = true,
    checkCanonical = true,
    checkRobots = false,
    checkImageAlt = true,
    checkHeadings = true,
    checkOpenGraph = false,
    expectedTitle,
    expectedCanonical,
    requireIndex = true,
    requireFollow = true,
  } = options;

  const results: SEOCheckResult[] = [];

  if (checkTitle) {
    results.push(await checkPageTitle(page, expectedTitle));
  }

  if (shouldCheckMetaDescription) {
    results.push(await checkMetaDescription(page));
  }

  if (checkCanonical) {
    results.push(await checkCanonicalURL(page, expectedCanonical));
  }

  if (checkRobots) {
    results.push(await checkRobotsMetaTag(page, requireIndex, requireFollow));
  }

  if (checkImageAlt) {
    results.push(await checkImageAltAttributes(page));
  }

  if (checkHeadings) {
    results.push(await checkHeadingStructure(page));
  }

  if (checkOpenGraph) {
    results.push(await checkOpenGraphTags(page));
  }

  return results;
}

/**
 * Get detailed SEO metadata for tabular reporting
 */
export async function getSEOMetadata(page: Page): Promise<{
  title: string;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robotsMetaTag: string | null;
  openGraphTags: {
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    ogUrl: string | null;
  };
  images: ImageInfo[];
}> {
  const title = await page.title();
  const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
  const canonicalUrl = await page.locator('link[rel="canonical"]').getAttribute('href');
  const robotsMetaTag = await page.locator('meta[name="robots"]').getAttribute('content');
  
  const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
  const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
  const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
  const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
  
  const images = await getAllImageInfo(page);

  return {
    title,
    metaDescription,
    canonicalUrl,
    robotsMetaTag,
    openGraphTags: {
      ogTitle,
      ogDescription,
      ogImage,
      ogUrl,
    },
    images,
  };
}

/**
 * Format SEO metadata as a detailed table
 */
export function formatSEOMetadataTable(metadata: {
  title: string;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robotsMetaTag: string | null;
  openGraphTags: {
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    ogUrl: string | null;
  };
  images: ImageInfo[];
}): string {
  let table = `\n${'='.repeat(100)}\n`;
  table += `SEO METADATA TABLE\n`;
  table += `${'='.repeat(100)}\n\n`;

  // Meta Tags Section
  table += `META TAGS:\n`;
  table += `${'─'.repeat(100)}\n`;
  
  // Meta tags table with proper formatting
  table += `│ ${'Tag Name'.padEnd(28)} │ ${'Value'.padEnd(50)} │ ${'Status'.padEnd(15)} │\n`;
  table += `├${'─'.repeat(30)}┤${'─'.repeat(52)}┤${'─'.repeat(17)}┤\n`;
  
  // Title row
  const titleDisplay = metadata.title || '(missing)';
  const titleStatus = metadata.title ? '✅ Present' : '❌ Missing';
  table += `│ ${'Title'.padEnd(28)} │ ${titleDisplay.substring(0, 50).padEnd(50)} │ ${titleStatus.padEnd(15)} │\n`;
  
  // Meta Description row
  const descDisplay = metadata.metaDescription ? 
    (metadata.metaDescription.length > 50 ? 
      metadata.metaDescription.substring(0, 47) + '...' : 
      metadata.metaDescription) : 
    '(missing)';
  const descStatus = metadata.metaDescription ? 
    (metadata.metaDescription.length >= 50 && metadata.metaDescription.length <= 160 ? 
      '✅ Valid' : 
      `⚠️  ${metadata.metaDescription.length} chars`) : 
    '❌ Missing';
  table += `│ ${'Meta Description'.padEnd(28)} │ ${descDisplay.padEnd(50)} │ ${descStatus.padEnd(15)} │\n`;
  
  // Canonical URL row - show full URL on next line if truncated
  const canonicalStatus = metadata.canonicalUrl ? '✅ Present' : '❌ Missing';
  if (metadata.canonicalUrl && metadata.canonicalUrl.length > 50) {
    table += `│ ${'Canonical URL'.padEnd(28)} │ ${'See full URL below'.padEnd(50)} │ ${canonicalStatus.padEnd(15)} │\n`;
  } else {
    const canonicalDisplay = metadata.canonicalUrl || '(missing)';
    table += `│ ${'Canonical URL'.padEnd(28)} │ ${canonicalDisplay.padEnd(50)} │ ${canonicalStatus.padEnd(15)} │\n`;
  }
  
  // Robots Meta Tag row
  const robotsDisplay = metadata.robotsMetaTag || 'default (index,follow)';
  const robotsStatus = metadata.robotsMetaTag ? '✅ Present' : '⚠️  Default';
  table += `│ ${'Robots Meta Tag'.padEnd(28)} │ ${robotsDisplay.padEnd(50)} │ ${robotsStatus.padEnd(15)} │\n`;
  
  table += `${'─'.repeat(100)}\n\n`;

  // Open Graph Tags Section
  table += `OPEN GRAPH TAGS:\n`;
  table += `${'─'.repeat(100)}\n`;
  
  // Open Graph tags table
  table += `│ ${'Tag Name'.padEnd(28)} │ ${'Value'.padEnd(50)} │ ${'Status'.padEnd(15)} │\n`;
  table += `├${'─'.repeat(30)}┤${'─'.repeat(52)}┤${'─'.repeat(17)}┤\n`;
  
  // og:title
  const ogTitleDisplay = metadata.openGraphTags.ogTitle || '(missing)';
  const ogTitleStatus = metadata.openGraphTags.ogTitle ? '✅ Present' : '❌ Missing';
  table += `│ ${'og:title'.padEnd(28)} │ ${ogTitleDisplay.substring(0, 50).padEnd(50)} │ ${ogTitleStatus.padEnd(15)} │\n`;
  
  // og:description
  const ogDescDisplay = metadata.openGraphTags.ogDescription ? 
    (metadata.openGraphTags.ogDescription.length > 50 ? 
      metadata.openGraphTags.ogDescription.substring(0, 47) + '...' : 
      metadata.openGraphTags.ogDescription) : 
    '(missing)';
  const ogDescStatus = metadata.openGraphTags.ogDescription ? '✅ Present' : '❌ Missing';
  table += `│ ${'og:description'.padEnd(28)} │ ${ogDescDisplay.padEnd(50)} │ ${ogDescStatus.padEnd(15)} │\n`;
  
  // og:image - show full URL on next line if truncated
  const ogImageStatus = metadata.openGraphTags.ogImage ? '✅ Present' : '❌ Missing';
  if (metadata.openGraphTags.ogImage && metadata.openGraphTags.ogImage.length > 50) {
    table += `│ ${'og:image'.padEnd(28)} │ ${'See full URL below'.padEnd(50)} │ ${ogImageStatus.padEnd(15)} │\n`;
  } else {
    const ogImageDisplay = metadata.openGraphTags.ogImage || '(missing)';
    table += `│ ${'og:image'.padEnd(28)} │ ${ogImageDisplay.padEnd(50)} │ ${ogImageStatus.padEnd(15)} │\n`;
  }
  
  // og:url - show full URL on next line if truncated
  const ogUrlStatus = metadata.openGraphTags.ogUrl ? '✅ Present' : '❌ Missing';
  if (metadata.openGraphTags.ogUrl && metadata.openGraphTags.ogUrl.length > 50) {
    table += `│ ${'og:url'.padEnd(28)} │ ${'See full URL below'.padEnd(50)} │ ${ogUrlStatus.padEnd(15)} │\n`;
  } else {
    const ogUrlDisplay = metadata.openGraphTags.ogUrl || '(missing)';
    table += `│ ${'og:url'.padEnd(28)} │ ${ogUrlDisplay.padEnd(50)} │ ${ogUrlStatus.padEnd(15)} │\n`;
  }
  
  table += `${'─'.repeat(100)}\n\n`;

  // Full URLs Section (for truncated URLs)
  const fullUrls = [];
  if (metadata.canonicalUrl && metadata.canonicalUrl.length > 50) {
    fullUrls.push({ label: 'Canonical URL', url: metadata.canonicalUrl });
  }
  if (metadata.openGraphTags.ogImage && metadata.openGraphTags.ogImage.length > 50) {
    fullUrls.push({ label: 'Open Graph Image (og:image)', url: metadata.openGraphTags.ogImage });
  }
  if (metadata.openGraphTags.ogUrl && metadata.openGraphTags.ogUrl.length > 50) {
    fullUrls.push({ label: 'Open Graph URL (og:url)', url: metadata.openGraphTags.ogUrl });
  }
  
  if (fullUrls.length > 0) {
    table += `FULL URLS (for reference - complete, non-truncated):\n`;
    table += `${'─'.repeat(100)}\n`;
    fullUrls.forEach(item => {
      table += `${item.label}:\n  ${item.url}\n\n`;
    });
  }

  // Images Section
  table += `IMAGES (${metadata.images.length} total):\n`;
  table += `${'─'.repeat(100)}\n`;
  
  if (metadata.images.length === 0) {
    table += `No images found on the page.\n\n`;
  } else {
    // Table header
    table += `│ ${'#'.padEnd(4)} │ ${'Image URL (src)'.padEnd(55)} │ ${'Alt Text'.padEnd(25)} │ ${'Status'.padEnd(10)} │\n`;
    table += `├${'─'.repeat(6)}┤${'─'.repeat(57)}┤${'─'.repeat(27)}┤${'─'.repeat(12)}┤\n`;
    
    // Image rows - show first 20 images to avoid overwhelming output
    const maxImagesToShow = 20;
    const imagesToShow = metadata.images.slice(0, maxImagesToShow);
    
    imagesToShow.forEach((img, index) => {
      // Show indication if URL is truncated, full URL will be in section below
      const imgSrcDisplay = img.src.length > 55 ? `See #${index + 1} below (${img.src.length} chars)` : img.src;
      const altText = img.alt ? (img.alt.length > 25 ? img.alt.substring(0, 22) + '...' : img.alt) : '(missing)';
      const status = img.alt ? '✅' : '❌';
      
      table += `│ ${String(index + 1).padEnd(4)} │ ${imgSrcDisplay.padEnd(55)} │ ${altText.padEnd(25)} │ ${status.padEnd(10)} │\n`;
    });
    
    if (metadata.images.length > maxImagesToShow) {
      table += `│ ... │ ${`(${metadata.images.length - maxImagesToShow} more images)`.padEnd(55)} │ ${''.padEnd(25)} │ ${''.padEnd(10)} │\n`;
    }
    
    table += `${'─'.repeat(100)}\n\n`;
    
    // Full Image URLs Section (all URLs, complete and non-truncated)
    table += `FULL IMAGE URLS (complete, non-truncated - all ${imagesToShow.length} images):\n`;
    table += `${'─'.repeat(100)}\n`;
    imagesToShow.forEach((img, index) => {
      const altInfo = img.alt ? ` [alt: "${img.alt}"]` : ' [no alt text]';
      table += `Image #${index + 1}:${altInfo}\n  ${img.src}\n\n`;
    });
    
    // Summary statistics
    const imagesWithAlt = metadata.images.filter(img => img.alt !== null && img.alt !== '').length;
    const imagesWithoutAlt = metadata.images.length - imagesWithAlt;
    table += `Image Summary:\n`;
    table += `  • Total Images: ${metadata.images.length}\n`;
    table += `  • With Alt Text: ${imagesWithAlt} ${imagesWithAlt === metadata.images.length ? '✅' : '⚠️'}\n`;
    table += `  • Without Alt Text: ${imagesWithoutAlt} ${imagesWithoutAlt === 0 ? '✅' : '❌'}\n`;
    if (imagesWithoutAlt > 0) {
      const imagesMissingAlt = metadata.images.filter(img => !img.alt || img.alt === '');
      table += `\n  Images Missing Alt Text (full URLs):\n`;
      imagesMissingAlt.slice(0, 10).forEach((img, idx) => {
        // Show full URL, no truncation
        table += `    ${idx + 1}. ${img.src}\n`;
      });
      if (imagesMissingAlt.length > 10) {
        table += `    ... and ${imagesMissingAlt.length - 10} more\n`;
      }
    }
    table += `\n`;
  }

  table += `${'='.repeat(100)}\n`;

  return table;
}

/**
 * Format SEO check results for reporting (includes both summary and detailed table)
 * @param results - SEO check results array
 * @param page - Optional page object to generate detailed metadata table
 * @returns Formatted report string
 */
export async function formatSEOCheckReport(
  results: SEOCheckResult[],
  page?: Page
): Promise<string> {
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  let report = `SEO Check Results: ${passed}/${total} passed\n\n`;

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    report += `${icon} ${result.check}: ${result.message}\n`;
    if (result.value) {
      report += `   Value: ${result.value}\n`;
    }
    report += '\n';
  }

  // Add detailed tabular metadata if page is provided
  if (page) {
    try {
      const metadata = await getSEOMetadata(page);
      report += formatSEOMetadataTable(metadata);
    } catch (error) {
      report += `\n⚠️  Could not generate detailed metadata table: ${error}\n`;
    }
  }

  return report;
}

