import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkVisual(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];

    // 🎯 HELPER: Robust Selector for visual elements
    const getVisualSelector = (el: HTMLElement): string => {
        if (el.id) return `#${el.id}`;
        const tag = el.tagName.toLowerCase();
        
        if (tag === 'img') {
            const src = el.getAttribute('src');
            const allWithSameSrc = document.querySelectorAll(`img[src="${src}"]`);
            if (allWithSameSrc.length > 1) {
                const index = Array.from(allWithSameSrc).indexOf(el) + 1;
                return `img[src="${src}"]:nth-of-type(${index})`;
            }
            return `img[src="${src}"]`;
        }

        if (el.classList.length > 0) return `${tag}.${Array.from(el.classList)[0]}`;
        return tag;
    };

    // 1. Broken Image Detection (Render failure)
    // This catches images that return 200 OK but are corrupt or 0-byte files.
    document.querySelectorAll('img').forEach(img => {
      const el = img as HTMLImageElement;
      // Skip tracking pixels (1x1) but catch intended images that failed (0x0)
      if (el.naturalWidth === 0 && el.src && !el.src.startsWith('data:')) {
        const r = el.getBoundingClientRect();
        const selector = getVisualSelector(el);

        found.push({
          url: pageUrl, category: 'A11Y', title: 'Image Render Failure',
          message: `Image failed to render (0px natural width). Likely a corrupt file or path error.`,
          selector: selector,
          outerHTML: el.outerHTML.substring(0, 150),
          severity: 'high',
          fix: 'Verify the image source file exists and is not corrupted.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height },
          detectedAt: Date.now()
        });
      }
    });

    // 2. Semantic Layout Integrity
    const hasHeader = !!document.querySelector('header, .header, #header, [role="banner"]');
    const hasFooter = !!document.querySelector('footer, .footer, #footer, [role="contentinfo"]');
    const hasMain = !!document.querySelector('main, [role="main"], #content, .content');

    if (!hasHeader) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'Missing Header',
        message: 'No semantic <header> or banner role found. This hurts SEO and site structure.',
        selector: 'body', outerHTML: 'N/A', severity: 'medium',
        fix: 'Wrap your navigation/logo area in a <header> tag.',
        boundingBox: null, detectedAt: Date.now()
      });
    }

    if (!hasFooter) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'Missing Footer',
        message: 'No semantic <footer> or contentinfo role found.',
        selector: 'body', outerHTML: 'N/A', severity: 'medium',
        fix: 'Wrap your copyright and bottom links in a <footer> tag.',
        boundingBox: null, detectedAt: Date.now()
      });
    }

    if (!hasMain) {
        found.push({
          url: pageUrl, category: 'SEO', title: 'Missing Main Content Area',
          message: 'The page lacks a <main> tag. Search engines use this to find unique content.',
          selector: 'body', outerHTML: 'N/A', severity: 'low',
          fix: 'Wrap the primary unique content of the page in a <main> tag.',
          boundingBox: null, detectedAt: Date.now()
        });
      }

    return found;
  }, url);

  return rawErrors.map(e => ({
    ...e,
    id: generateErrorId(e),
    fingerprint: generateErrorId(e)
  })) as AuditError[];
}