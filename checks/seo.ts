import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkSEO(page: Page): Promise<AuditError[]> {
  const url = page.url();

  // Run all logic inside the browser for maximum speed
  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];
    const timestamp = Date.now();

    // 1. Page Title
    const title = document.title;
    if (!title || title.trim().length === 0) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'Missing Title',
        message: 'Page title is missing or empty.',
        selector: 'head', outerHTML: 'N/A', severity: 'high',
        fix: 'Add a <title> tag in the <head>.',
        boundingBox: null, detectedAt: timestamp
      });
    }

    // 2. Meta Description
    const metaDesc = document.querySelector('meta[name="description"]');
    const descContent = metaDesc?.getAttribute('content') || '';
    if (!metaDesc) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'Missing Meta Description',
        message: 'Meta description is missing.',
        selector: 'head', outerHTML: 'N/A', severity: 'medium',
        fix: 'Add a <meta name="description" content="..."> tag.',
        boundingBox: null, detectedAt: timestamp
      });
    } else if (descContent.length < 50 || descContent.length > 160) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'Meta Description Length',
        message: `Meta description is ${descContent.length} chars. Recommended: 50-160.`,
        selector: 'head', outerHTML: metaDesc.outerHTML, severity: 'low',
        fix: 'Adjust description length to be between 50 and 160 characters.',
        boundingBox: null, detectedAt: timestamp
      });
    }

    // 3. Canonical URL
    if (!document.querySelector('link[rel="canonical"]')) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'Missing Canonical URL',
        message: 'Canonical URL is missing.',
        selector: 'head', outerHTML: 'N/A', severity: 'medium',
        fix: 'Add <link rel="canonical" href="..."> to prevent duplicate content issues.',
        boundingBox: null, detectedAt: timestamp
      });
    }

    // 4. Robots Meta
    const robots = document.querySelector('meta[name="robots"]');
    if (robots && robots.getAttribute('content')?.toLowerCase().includes('noindex')) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'NoIndex Directive',
        message: 'Robots meta tag contains "noindex". Search engines will not show this page.',
        selector: 'head', outerHTML: robots.outerHTML, severity: 'high',
        fix: 'Remove "noindex" if you want this page to be searchable.',
        boundingBox: null, detectedAt: timestamp
      });
    }

    // 5. Open Graph Tags (The Big 4)
    const ogTags = ['og:title', 'og:description', 'og:image', 'og:url'];
    const missingOg = ogTags.filter(tag => !document.querySelector(`meta[property="${tag}"]`));
    if (missingOg.length > 0) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'Missing Social Meta',
        message: `Missing Open Graph tags: ${missingOg.join(', ')}`,
        selector: 'head', outerHTML: 'N/A', severity: 'low',
        fix: 'Add social media meta tags for better sharing visibility.',
        boundingBox: null, detectedAt: timestamp
      });
    }

    // 6. Heading Structure
    const h1s = document.querySelectorAll('h1');
    if (h1s.length === 0) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'Missing H1',
        message: 'No H1 heading found.',
        selector: 'body', outerHTML: 'N/A', severity: 'high',
        fix: 'Add one <h1> tag for the main topic.',
        boundingBox: null, detectedAt: timestamp
      });
    } else if (h1s.length > 1) {
      h1s.forEach((el, i) => {
        if (i === 0) return;
        const r = el.getBoundingClientRect();
        found.push({
          url: pageUrl, category: 'SEO', title: 'Multiple H1s',
          message: `Secondary H1 found (Index: ${i}).`,
          selector: `h1:nth-of-type(${i + 1})`,
          outerHTML: el.outerHTML.substring(0, 100),
          severity: 'medium',
          fix: 'Change secondary H1s to H2s.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height },
          detectedAt: timestamp
        });
      });
    }

    // 7. Image SEO (Missing Alts)
    document.querySelectorAll('img').forEach(img => {
      if (img.width < 10 || img.height < 10) return; // Skip tiny pixels
      if (!img.hasAttribute('alt') || img.getAttribute('alt')?.trim() === '') {
        const r = img.getBoundingClientRect();
        found.push({
          url: pageUrl, category: 'SEO', title: 'Image Missing Alt',
          message: 'Visible image is missing alt text.',
          selector: `img[src*="${img.getAttribute('src')?.substring(0, 15)}"]`,
          outerHTML: img.outerHTML.substring(0, 100),
          severity: 'medium',
          fix: 'Add a descriptive alt="..." attribute.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height },
          detectedAt: timestamp
        });
      }
    });

    return found;
  }, url);

  // Return mapped errors with Deterministic IDs
  return rawErrors.map(e => ({
    ...e,
    id: generateErrorId(e),
    fingerprint: generateErrorId(e)
  })) as AuditError[];
}