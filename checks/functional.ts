import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkFunctional(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];

    // 🎯 SMART SELECTOR HELPER
    const getSelector = (el: HTMLElement): string => {
        if (el.id) return `#${el.id}`;
        const tag = el.tagName.toLowerCase();
        if (tag === 'a' && el.getAttribute('href')) return `a[href="${el.getAttribute('href')}"]`;
        if (el.getAttribute('name')) return `${tag}[name="${el.getAttribute('name')}"]`;
        if (el.classList.length > 0) return `${tag}.${Array.from(el.classList)[0]}`;
        return tag;
    };

    // 1. Audit CTA Buttons (Original Logic + Smart Selectors)
    document.querySelectorAll('button, a.btn, .button, [role="button"]').forEach(btn => {
      const el = btn as HTMLElement;
      const r = el.getBoundingClientRect();
      const text = el.textContent?.trim() || el.getAttribute('aria-label');
      const selector = getSelector(el);
      
      if (r.width > 0 && (r.width < 30 || r.height < 30)) {
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Tiny Click Target',
          message: `Button "${text?.substring(0, 15)}" is too small (${Math.round(r.width)}x${Math.round(r.height)}px).`,
          selector: selector, outerHTML: el.outerHTML.substring(0, 150),
          severity: 'medium', fix: 'Increase button size to at least 44x44px.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
        });
      }

      if (!text) {
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Empty Button',
          message: 'Button or CTA has no visible text or ARIA label.',
          selector: selector, outerHTML: el.outerHTML.substring(0, 150),
          severity: 'high', fix: 'Add descriptive text or an aria-label.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
        });
      }
    });

    // 2. External Link Security (Original Logic + Smart Selectors)
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
      const el = link as HTMLElement;
      const rel = el.getAttribute('rel') || '';
      if (!rel.includes('noopener') && !rel.includes('noreferrer')) {
        const r = el.getBoundingClientRect();
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Insecure External Link',
          message: `External link to "${el.getAttribute('href')?.substring(0,20)}..." missing noopener.`,
          selector: getSelector(el), outerHTML: el.outerHTML.substring(0, 150),
          severity: 'low', fix: 'Add rel="noopener noreferrer" to the link.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
        });
      }
    });

    // 3. Advanced Video Embed Audit (Original Logic + Smart Selectors)
    const videoFrames = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"]');
    videoFrames.forEach(video => {
      const el = video as HTMLIFrameElement;
      const src = el.getAttribute('src') || '';
      const r = el.getBoundingClientRect();
      const selector = getSelector(el);
      
      if (!el.hasAttribute('title')) {
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Video Missing Title',
          message: 'Video iframe is missing a title attribute for screen readers.',
          selector: selector, outerHTML: el.outerHTML.substring(0, 150),
          severity: 'medium', fix: 'Add a title="..." attribute.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
        });
      }

      if (src.includes('insert_video_id') || src.length < 20) {
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Broken Video Embed',
          message: `Video source appears to be invalid or a placeholder.`,
          selector: selector, outerHTML: el.outerHTML.substring(0, 150),
          severity: 'critical', fix: 'Replace with a valid video ID.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
        });
      }
    });

    return found;
  }, url);

  return rawErrors.map(e => ({
    ...e, id: generateErrorId(e), fingerprint: generateErrorId(e)
  })) as AuditError[];
}