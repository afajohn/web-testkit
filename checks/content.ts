import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkContent(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];

    // 🎯 HELPER: Robust Selector
    const getSelector = (el: HTMLElement): string => {
        if (el.id) return `#${el.id}`;
        const tag = el.tagName.toLowerCase();
        if (el.classList.length > 0) return `${tag}.${Array.from(el.classList)[0]}`;
        return tag;
    };

    // 1. WORD COUNT & LINK DENSITY (Original logic preserved)
    const bodyText = document.body.innerText || '';
    const wordCount = bodyText.trim().split(/\s+/).filter(w => w.length > 0).length;
    const linkCount = document.querySelectorAll('a').length;

    if (wordCount < 300) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'Thin Content',
        message: `This page has low text volume (${wordCount} words). Search engines may rank it poorly.`,
        selector: 'body', outerHTML: 'N/A', severity: 'low',
        fix: 'Add at least 300 words of unique, descriptive content.',
        boundingBox: null, detectedAt: Date.now()
      });
    }

    const density = (linkCount / wordCount) * 100;
    if (density > 15 && wordCount > 100) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'High Link Density',
        message: `Link-to-word ratio is too high (${Math.round(density)}%). This can look like link spam.`,
        selector: 'body', outerHTML: 'N/A', severity: 'medium',
        fix: 'Increase the amount of descriptive text or remove non-essential links.',
        boundingBox: null, detectedAt: Date.now()
      });
    }

    // 2. LINE LENGTH (Readability Check)
    // Paragraphs wider than 1000px are very hard to read on desktop.
    document.querySelectorAll('p').forEach(p => {
        const r = p.getBoundingClientRect();
        if (r.width > 1000 && p.innerText.length > 150) {
            found.push({
                url: pageUrl, category: 'FUNC', title: 'Poor Readability',
                message: `Paragraph is too wide (${Math.round(r.width)}px). Optimal reading width is 600px-800px.`,
                selector: getSelector(p),
                outerHTML: p.outerHTML.substring(0, 150),
                severity: 'low',
                fix: 'Set a max-width on text containers to keep line lengths between 60-80 characters.',
                boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height },
                detectedAt: Date.now()
            });
        }
    });

    // 3. LIST STRUCTURE (Hardcoded Bullet Check)
    // Looks for paragraphs that start with hyphens or asterisks instead of using <ul>
    const listPatterns = /^(\s*[-*•]\s+)/;
    document.querySelectorAll('p, div').forEach(el => {
        const text = el.textContent?.trim() || '';
        // If the text block contains multiple lines starting with hyphens...
        if (listPatterns.test(text) && text.split('\n').length > 1) {
            const r = el.getBoundingClientRect();
            found.push({
                url: pageUrl, category: 'SEO', title: 'Improper List Structure',
                message: 'Hardcoded bullet points detected. This is inaccessible for screen readers.',
                selector: getSelector(el as HTMLElement),
                outerHTML: el.outerHTML.substring(0, 150),
                severity: 'medium',
                fix: 'Use proper HTML list tags: <ul> and <li>.',
                boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height },
                detectedAt: Date.now()
            });
        }
    });

    return found;
  }, url);

  return rawErrors.map(e => ({
    ...e,
    id: generateErrorId(e),
    fingerprint: generateErrorId(e)
  })) as AuditError[];
}