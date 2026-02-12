import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkVisual(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];

    // 1. Broken Image Detection (NaturalWidth Logic)
    document.querySelectorAll('img').forEach(img => {
      if (img.naturalWidth === 0 && img.src && !img.src.startsWith('data:')) {
        const r = img.getBoundingClientRect();
        found.push({
          url: pageUrl, category: 'A11Y', title: 'Rendered Image Error',
          message: `Image failed to render (0px width). Source: ${img.src.substring(0, 50)}...`,
          selector: 'img', outerHTML: img.outerHTML.substring(0, 100),
          severity: 'high', fix: 'Check if the image file is corrupted or the path is incorrect.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
        });
      }
    });

    // 2. Layout Structure Check
    const hasHeader = !!document.querySelector('header, .header, #header, [role="banner"]');
    const hasFooter = !!document.querySelector('footer, .footer, #footer, [role="contentinfo"]');

    if (!hasHeader) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'Missing Header',
        message: 'No semantic <header> or banner role found. Layout may be broken.',
        selector: 'body', outerHTML: 'N/A', severity: 'medium',
        fix: 'Add a semantic <header> tag for better SEO and accessibility.',
        boundingBox: null, detectedAt: Date.now()
      });
    }
    if (!hasFooter) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'Missing Footer',
        message: 'No semantic <footer> or contentinfo role found.',
        selector: 'body', outerHTML: 'N/A', severity: 'medium',
        fix: 'Add a semantic <footer> tag.',
        boundingBox: null, detectedAt: Date.now()
      });
    }

    return found;
  }, url);

  return rawErrors.map(e => ({ ...e, id: generateErrorId(e), fingerprint: generateErrorId(e) })) as AuditError[];
}