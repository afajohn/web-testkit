import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkFunctional(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];

    const getSelector = (el: HTMLElement): string => {
        if (el.id) return `#${el.id}`;
        const tag = el.tagName.toLowerCase();
        if (tag === 'a' && el.getAttribute('href')) return `a[href="${el.getAttribute('href')}"]`;
        if (el.getAttribute('name')) return `${tag}[name="${el.getAttribute('name')}"]`;
        if (el.classList.length > 0) return `${tag}.${Array.from(el.classList)[0]}`;
        return tag;
    };

    // 1. Audit CTA Buttons (Human Finger Logic)
    document.querySelectorAll('button, a.btn, .button, [role="button"]').forEach(btn => {
      const el = btn as HTMLElement;
      const r = el.getBoundingClientRect();
      const text = el.textContent?.trim() || el.getAttribute('aria-label');
      const selector = getSelector(el);
      
      if (r.width > 0 && r.height > 0) {
        // 🎯 SMART MATH: Only flag if it's genuinely hard to hit. 
        // A wide menu link is fine even if it's only 24px tall.
        const isTooNarrow = r.width < 44;
        const isTooShort = r.height < 24;
        const isTinySquare = r.width < 32 && r.height < 32;

        if (isTinySquare || (isTooNarrow && isTooShort)) {
            found.push({
                url: pageUrl, category: 'FUNC', title: 'Tiny Click Target',
                message: `Target "${text?.substring(0, 15)}" is too small for mobile thumbs.`,
                selector: selector, outerHTML: el.outerHTML.substring(0, 150),
                severity: 'medium', fix: 'Increase size or padding to at least 44x44px.',
                boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
            });
        }

        if (!text) {
          found.push({
            url: pageUrl, category: 'FUNC', title: 'Empty Button',
            message: 'Button has no accessible text or label.',
            selector: selector, outerHTML: el.outerHTML.substring(0, 150),
            severity: 'high', fix: 'Add descriptive text or an aria-label.',
            boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
          });
        }
      }
    });

    // 2. External Link Security
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
      const el = link as HTMLElement;
      const href = el.getAttribute('href') || '';
      
      // 🎯 THE INTELLIGENT FILTER:
      // Skip if: 1. It's a relative path (/path)
      //         2. it's internal (contains current hostname)
      //         3. it's an anchor (#) or javascript
      const isExternal = href.startsWith('http') && !href.includes(window.location.hostname);
      const isInternal = !href.startsWith('http') || href.includes(window.location.hostname);

      if (isExternal) {
        const rel = el.getAttribute('rel') || '';
        if (!rel.includes('noopener')) {
          const r = el.getBoundingClientRect();
          found.push({
            url: pageUrl, category: 'FUNC', title: 'Insecure External Link',
            message: `External link to "${href.substring(0,30)}..." missing noopener.`,
            selector: getSelector(el), outerHTML: el.outerHTML.substring(0, 200),
            severity: 'low', fix: 'Add rel="noopener" for third-party security.',
            boundingBox: r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
            detectedAt: Date.now()
          });
        }
      } 
      // 🛡️ INTERNAL LINKS with target="_blank" are now IGNORED. No more noise.
    });

    // 3. Video Embeds
    const videoFrames = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"]');
    videoFrames.forEach(video => {
      const el = video as HTMLIFrameElement;
      const src = el.getAttribute('src') || '';
      const r = el.getBoundingClientRect();
      const selector = getSelector(el);
      
      if (!el.hasAttribute('title')) {
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Video Missing Title',
          message: 'Video iframe is missing a title attribute.',
          selector: selector, outerHTML: el.outerHTML.substring(0, 150),
          severity: 'medium', fix: 'Add a title="..." attribute.',
          boundingBox: r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
          detectedAt: Date.now()
        });
      }

      if (src.includes('insert_video_id')) {
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Broken Video Embed',
          message: `Video source is a placeholder.`,
          selector: selector, outerHTML: el.outerHTML.substring(0, 150),
          severity: 'critical', fix: 'Replace with a valid video ID.',
          boundingBox: r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
          detectedAt: Date.now()
        });
      }
    });

    return found;
  }, url);

  return rawErrors.map(e => ({
    ...e, id: generateErrorId(e), fingerprint: generateErrorId(e)
  })) as AuditError[];
}