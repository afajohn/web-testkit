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

    // 1. Audit CTA Buttons
    document.querySelectorAll('button, a.btn, .button, [role="button"]').forEach(btn => {
      const el = btn as HTMLElement;
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      const text = el.textContent?.trim() || el.getAttribute('aria-label');
      const selector = getSelector(el);
      
      if (r.width > 0 && r.height > 0) {
        const isTooSmall = (r.width < 32 || r.height < 32) && area < 1000; 
        if (isTooSmall) {
              found.push({
                url: pageUrl, category: 'FUNC', title: 'Tiny Click Target',
                message: `Button "${text?.substring(0, 15)}" is too small for thumbs.`,
                selector: selector, outerHTML: el.outerHTML.substring(0, 200),
                severity: 'medium', fix: 'Ensure the button is at least 44px tall/wide for mobile.',
                boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
            });
        }

        if (!text) {
          found.push({
            url: pageUrl, category: 'FUNC', title: 'Empty Button',
            message: 'Button has no accessible text. Users don\'t know what it does.',
            selector: selector, outerHTML: el.outerHTML.substring(0, 200),
            severity: 'high', fix: 'Add descriptive text inside the button or an aria-label.',
            boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
          });
        }
      }
    });

    // 2. External Link Security (Now with BoundingBox!)
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
      const el = link as HTMLElement;
      const rel = el.getAttribute('rel') || '';
      if (!rel.includes('noopener') && !rel.includes('noreferrer')) {
        const r = el.getBoundingClientRect();
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Insecure Link',
          message: `Link to "${el.getAttribute('href')?.substring(0,25)}" opens in new tab without security headers.`,
          selector: getSelector(el), outerHTML: el.outerHTML.substring(0, 200),
          severity: 'low', fix: 'Add rel="noopener noreferrer" to prevent security vulnerabilities.',
          boundingBox: r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, 
          detectedAt: Date.now()
        });
      }
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
          message: 'Iframe is missing a title. Screen readers cannot describe the video.',
          selector: selector, outerHTML: el.outerHTML.substring(0, 200),
          severity: 'medium', fix: 'Add a title="..." attribute describing the content.',
          boundingBox: r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, 
          detectedAt: Date.now()
        });
      }

      if (src.includes('insert_video_id')) {
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Broken Video Embed',
          message: `The video source URL is a placeholder and won't play.`,
          selector: selector, outerHTML: el.outerHTML.substring(0, 200),
          severity: 'critical', fix: 'Update the iframe src with the actual video ID.',
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