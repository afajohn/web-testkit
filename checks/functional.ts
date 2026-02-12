import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkFunctional(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];

    // 1. Audit CTA Buttons (Too small or missing text)
    document.querySelectorAll('button, a.btn, .button, [role="button"]').forEach(btn => {
      const r = btn.getBoundingClientRect();
      const text = btn.textContent?.trim() || btn.getAttribute('aria-label');
      
      if (r.width > 0 && (r.width < 30 || r.height < 30)) {
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Tiny Click Target',
          message: `Button is too small for mobile users (${Math.round(r.width)}x${Math.round(r.height)}px).`,
          selector: 'button', outerHTML: btn.outerHTML.substring(0, 100),
          severity: 'medium', fix: 'Increase button size to at least 44x44px for accessibility.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
        });
      }

      if (!text) {
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Empty Button',
          message: 'Button or CTA has no visible text or ARIA label.',
          selector: 'button', outerHTML: btn.outerHTML.substring(0, 100),
          severity: 'high', fix: 'Add descriptive text or an aria-label to the button.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
        });
      }
    });

    // 2. External Link Security (rel="noopener")
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
      const rel = link.getAttribute('rel') || '';
      if (!rel.includes('noopener') && !rel.includes('noreferrer')) {
        const r = link.getBoundingClientRect();
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Insecure External Link',
          message: `External link opens in new tab without noopener/noreferrer security.`,
          selector: 'a[target="_blank"]', outerHTML: link.outerHTML.substring(0, 100),
          severity: 'low', fix: 'Add rel="noopener noreferrer" to the link.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
        });
      }
    });

    // 3. Advanced Video Embed Audit
    const videoFrames = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"]');
    for (const video of videoFrames) {
      const src = video.getAttribute('src') || '';
      const r = video.getBoundingClientRect();
      
      // Basic A11y Check
      if (!video.hasAttribute('title')) {
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Video Missing Title',
          message: 'Video iframe is missing a title attribute.',
          selector: 'iframe', outerHTML: video.outerHTML.substring(0, 100),
          severity: 'medium', fix: 'Add a title="..." attribute.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
        });
      }

      // Check for common "Placeholder" or broken URL patterns
      if (src.includes('insert_video_id') || src.length < 20) {
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Broken Video Embed',
          message: `Video source appears to be a placeholder or invalid: ${src}`,
          selector: 'iframe', outerHTML: video.outerHTML.substring(0, 100),
          severity: 'critical', fix: 'Replace the placeholder with a valid video URL.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
        });
      }
    }

    return found;
  }, url);

  return rawErrors.map(e => ({
    ...e, id: generateErrorId(e), fingerprint: generateErrorId(e)
  })) as AuditError[];
}