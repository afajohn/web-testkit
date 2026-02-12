import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkMobile(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];

    // 1. Viewport Meta Tag
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'Missing Viewport Tag',
        message: 'No viewport meta tag found. The site will look broken on mobile.',
        selector: 'head', outerHTML: 'N/A', severity: 'critical',
        fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">.',
        boundingBox: null, detectedAt: Date.now()
      });
    }

    // 2. Horizontal Scroll Detection (Overflow)
    const hasOverflow = document.documentElement.scrollWidth > window.innerWidth;
    if (hasOverflow) {
      found.push({
        url: pageUrl, category: 'FUNC', title: 'Mobile Overflow',
        message: 'Page has horizontal scrolling (content is wider than the screen).',
        selector: 'body', outerHTML: 'N/A', severity: 'high',
        fix: 'Use CSS max-width: 100% on images/containers to prevent horizontal overflow.',
        boundingBox: null, detectedAt: Date.now()
      });
    }

    return found;
  }, url);

  return rawErrors.map(e => ({ ...e, id: generateErrorId(e), fingerprint: generateErrorId(e) })) as AuditError[];
}