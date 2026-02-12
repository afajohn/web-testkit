import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkContent(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];
    
    // Clean text for word count
    const bodyText = document.body.innerText || '';
    const wordCount = bodyText.trim().split(/\s+/).filter(w => w.length > 0).length;
    const linkCount = document.querySelectorAll('a').length;

    // 1. Thin Content Check
    if (wordCount < 300) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'Thin Content',
        message: `This page only has ${wordCount} words. Search engines prefer at least 300.`,
        selector: 'body', outerHTML: 'N/A', severity: 'low',
        fix: 'Add more descriptive text content to this page.',
        boundingBox: null, detectedAt: Date.now()
      });
    }

    // 2. Link Density Check (Link-to-Word Ratio)
    const density = (linkCount / wordCount) * 100;
    if (density > 15 && wordCount > 100) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'High Link Density',
        message: `Link-to-word ratio is too high (${Math.round(density)}%). May look like spam.`,
        selector: 'body', outerHTML: 'N/A', severity: 'medium',
        fix: 'Increase text content or remove unnecessary links.',
        boundingBox: null, detectedAt: Date.now()
      });
    }

    return found;
  }, url);

  return rawErrors.map(e => ({ ...e, id: generateErrorId(e), fingerprint: generateErrorId(e) })) as AuditError[];
}