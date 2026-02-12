import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkLinks(page: Page): Promise<AuditError[]> {
  const pageUrl = page.url();
  const errors: AuditError[] = [];

  // 1. Extract VISIBLE links with Location Context
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    return anchors.map(a => {
      const el = a as HTMLElement;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      
      // Determine Location Context (from reference logic)
      let location = 'Content';
      const parent = el.closest('nav, header, footer, aside, .menu');
      if (parent) {
        const tag = parent.tagName.toLowerCase();
        location = tag.charAt(0).toUpperCase() + tag.slice(1);
      }

      return {
        href: a.getAttribute('href'),
        outerHTML: a.outerHTML,
        text: (a.textContent || a.getAttribute('aria-label') || 'Link').trim().substring(0, 40),
        isVisible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, top: rect.top },
        location: location
      };
    }).filter(l => l.isVisible && l.href && !l.href.startsWith('javascript:') && !l.href.startsWith('#') && !l.href.startsWith('mailto:'));
  });

  // Deduplicate URLs
  const uniqueLinks = Array.from(new Map(links.map(item => [item.href, item])).values());
  const MAX_CONCURRENT = 5; 

  // 2. The Check Logic (with Trailing Slash & HEAD Fallback)
  const checkUrl = async (targetUrl: string): Promise<{ status: number, err?: string }> => {
    try {
      const absUrl = new URL(targetUrl, pageUrl).href;
      
      // Try HEAD first
      let res = await page.request.fetch(absUrl, { method: 'HEAD', timeout: 6000 });
      
      // If HEAD fails or is a 405/404, try GET (some servers hate HEAD)
      if (!res.ok()) {
        res = await page.request.fetch(absUrl, { method: 'GET', timeout: 6000 });
      }

      // If still failing, try the Trailing Slash variant (The Reference Trick)
      if (!res.ok() && (res.status() === 404 || res.status() === 0)) {
        const altUrl = absUrl.endsWith('/') ? absUrl.slice(0, -1) : absUrl + '/';
        const resAlt = await page.request.fetch(altUrl, { method: 'GET', timeout: 5000 });
        if (resAlt.ok()) return { status: 200 }; 
      }

      return { status: res.status(), err: res.ok() ? undefined : res.statusText() };
    } catch (e: any) {
      return { status: 0, err: e.message };
    }
  };

  // 3. Execute in Batches
  for (let i = 0; i < uniqueLinks.length; i += MAX_CONCURRENT) {
    const batch = uniqueLinks.slice(i, i + MAX_CONCURRENT);
    await Promise.all(batch.map(async (link) => {
      const result = await checkUrl(link.href!);
      
      if (result.status >= 400 || result.status === 0) {
        const errBase: Partial<AuditError> = {
          url: pageUrl,
          category: 'FUNC',
          title: 'Broken Link',
          message: `${link.text} -> ${result.status === 0 ? 'Timeout/Network Error' : result.status} on ${link.href}`,
          selector: `a[href="${link.href}"]`,
          outerHTML: link.outerHTML.substring(0, 150),
          severity: 'high',
          fix: `Verify the URL destination. This link in the ${link.location} is unreachable.`,
          boundingBox: { x: link.rect.x, y: link.rect.y, width: link.rect.width, height: link.rect.height },
          detectedAt: Date.now()
        };

        errors.push({
          ...errBase,
          id: generateErrorId(errBase),
          fingerprint: generateErrorId(errBase)
        } as AuditError);
      }
    }));
  }

  return errors;
}