import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkImages(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];

    // 🎯 SMART SELECTOR HELPER for Images
    const getImageSelector = (el: HTMLImageElement): string => {
        if (el.id) return `#${el.id}`;
        
        const src = el.getAttribute('src');
        if (src) {
            // If multiple images share the same source, we must index them
            const allWithSameSrc = document.querySelectorAll(`img[src="${src}"]`);
            if (allWithSameSrc.length > 1) {
                const index = Array.from(allWithSameSrc).indexOf(el) + 1;
                // We use nth-of-type on the whole document match to be certain
                return `img[src="${src}"]:nth-of-type(${index})`;
            }
            return `img[src="${src}"]`;
        }
        
        return 'img'; // Fallback
    };

    const images = document.querySelectorAll('img');

    images.forEach((img) => {
      const el = img as HTMLImageElement;
      
      // Ignore tiny tracking pixels or hidden icons
      if (el.width < 10 || el.height < 10) return;
      
      const hasAlt = el.hasAttribute('alt');
      const altText = el.getAttribute('alt');

      if (!hasAlt || (hasAlt && altText?.trim() === '')) {
         const rect = el.getBoundingClientRect();
         const selector = getImageSelector(el); // 🎯 GET PRECISION SELECTOR

         found.push({
           url: pageUrl,
           category: 'A11Y',
           title: 'Missing Alt Text',
           message: `Image is missing descriptive alternative text. Path: ${selector}`,
           selector: selector,
           outerHTML: el.outerHTML.substring(0, 150),
           severity: 'medium',
           fix: "Add an alt='...' attribute describing the image content.",
           boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
           detectedAt: Date.now()
         });
      }
    });
    return found;
  }, url);

  // Apply the Deterministic IDs
  return rawErrors.map(e => ({
    ...e,
    id: generateErrorId(e),
    fingerprint: generateErrorId(e)
  })) as AuditError[];
}