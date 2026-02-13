import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkLinks(page: Page): Promise<AuditError[]> {
  const pageUrl = page.url();
  const errors: AuditError[] = [];

  // 1. Extract VISIBLE links
  const links = await page.evaluate(() => {
    const getLinkSelector = (el: HTMLElement): string => {
        if (el.id) return `#${el.id}`;
        const tag = el.tagName.toLowerCase();
        const attrHref = el.getAttribute('href');
        const allMatching = document.querySelectorAll(`${tag}[href="${attrHref}"]`);
        if (allMatching.length > 1) {
            const index = Array.from(allMatching).indexOf(el) + 1;
            return `${tag}[href="${attrHref}"]:nth-of-type(${index})`;
        }
        return `${tag}[href="${attrHref}"]`;
    };

    return Array.from(document.querySelectorAll('a[href]')).map(a => {
      const el = a as HTMLElement;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      let location = 'Content';
      const parent = el.closest('nav, header, footer, aside, .menu');
      if (parent) {
        const tag = parent.tagName.toLowerCase();
        location = tag.charAt(0).toUpperCase() + tag.slice(1);
      }
      return {
        href: a.getAttribute('href'),
        outerHTML: a.outerHTML,
        selector: getLinkSelector(el),
        text: (a.textContent || a.getAttribute('aria-label') || 'Link').trim().substring(0, 40),
        isVisible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, top: rect.top },
        location: location
      };
    });
  });

  // 🎯 FIX: Filter moved here, after links are extracted
  const uniqueLinks = Array.from(new Map(links.map(item => [item.href, item])).values())
    .filter(l => l.isVisible && l.href && 
            !l.href.toLowerCase().startsWith('javascript:') && 
            !l.href.startsWith('#') && 
            !l.href.startsWith('mailto:'));

  const MAX_CONCURRENT = 5; 
  const checkUrl = async (targetUrl: string): Promise<{ status: number, err?: string }> => {
    try {
      const absUrl = new URL(targetUrl, pageUrl).href;
      let res = await page.request.fetch(absUrl, { method: 'HEAD', timeout: 6000 });
      if (!res.ok()) res = await page.request.fetch(absUrl, { method: 'GET', timeout: 6000 });
      if (!res.ok() && (res.status() === 404 || res.status() === 0)) {
        const altUrl = absUrl.endsWith('/') ? absUrl.slice(0, -1) : absUrl + '/';
        const resAlt = await page.request.fetch(altUrl, { method: 'GET', timeout: 5000 });
        if (resAlt.ok()) return { status: 200 }; 
      }
      return { status: res.status(), err: res.ok() ? undefined : res.statusText() };
    } catch (e: any) { return { status: 0, err: e.message }; }
  };

  for (let i = 0; i < uniqueLinks.length; i += MAX_CONCURRENT) {
    const batch = uniqueLinks.slice(i, i + MAX_CONCURRENT);
    await Promise.all(batch.map(async (link) => {
      const result = await checkUrl(link.href!);
      if (result.status >= 400 || result.status === 0) {
        const errBase: Partial<AuditError> = {
          url: pageUrl, category: 'FUNC', title: 'Broken Link',
          message: `${link.text || 'Link'} -> ${result.status === 0 ? 'Timeout' : result.status} on ${link.href}`,
          selector: link.selector, outerHTML: link.outerHTML.substring(0, 150),
          severity: 'high', fix: `Update link in ${link.location}. Destination is unreachable.`,
          boundingBox: { x: link.rect.x, y: link.rect.y, width: link.rect.width, height: link.rect.height },
          detectedAt: Date.now()
        };
        errors.push({ ...errBase, id: generateErrorId(errBase), fingerprint: generateErrorId(errBase) } as AuditError);
      }
    }));
  }
  return errors;
}