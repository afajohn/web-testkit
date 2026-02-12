import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkImages(page: Page): Promise<AuditError[]> {
  const url = page.url();
  
  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];
    const images = document.querySelectorAll('img');

    images.forEach((img) => {
      // Ignore tiny tracking pixels or hidden icons
      if (img.width < 10 || img.height < 10) return;
      
      const hasAlt = img.hasAttribute('alt');
      const altText = img.getAttribute('alt');

      if (!hasAlt || (hasAlt && altText?.trim() === '')) {
         const rect = img.getBoundingClientRect();
         found.push({
           url: pageUrl,
           category: 'A11Y',
           title: 'Missing Alt Text',
           message: `Image is missing descriptive alternative text. Source: ${img.getAttribute('src')?.substring(0, 30)}...`,
           selector: `img[src="${img.getAttribute('src')}"]`,
           outerHTML: img.outerHTML.substring(0, 150),
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