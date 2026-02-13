import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkMobile(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];

    const getSurgicalSelector = (el: HTMLElement): string => {
        if (el.id) return `#${el.id}`;
        const tag = el.tagName.toLowerCase();
        const href = el.getAttribute('href');
        // If it's a link, use the href to make it unique
        if (tag === 'a' && href) return `a[href="${href.replace(/"/g, '\\"')}"]`;
        if (el.classList.length > 0) return `${tag}.${Array.from(el.classList)[0]}`;
        return tag;
    };

    // 1. Touch Target Size (This is what you couldn't locate!)
    document.querySelectorAll('button, a, input, [role="button"]').forEach(node => {
        const el = node as HTMLElement;
        const r = el.getBoundingClientRect();
        
        if (r.width > 0 && r.height > 0) {
            const area = r.width * r.height;
            // High-precision check: only flag if it's genuinely hard to hit
            const isTooSmall = (r.width < 32 || r.height < 32) && area < 1200;

            if (isTooSmall) {
                const selector = getSurgicalSelector(el);
                found.push({
                    url: pageUrl, category: 'A11Y', title: 'Small Touch Target',
                    message: `Interactive element is too small (${Math.round(r.width)}x${Math.round(r.height)}px). Path: ${selector}`,
                    selector: selector, // 🎯 THE UNIQUE SELECTOR
                    outerHTML: el.outerHTML.substring(0, 150),
                    severity: 'medium',
                    fix: 'Increase size or padding to at least 44x44px.',
                    boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height },
                    detectedAt: Date.now()
                });
            }
        }
    });

    // 2. Mobile Overflow
    const vw = window.innerWidth;
    if (document.documentElement.scrollWidth > vw) {
        let bully: HTMLElement | null = null;
        document.querySelectorAll('*').forEach((node) => {
            const el = node as HTMLElement;
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.right > vw) bully = el;
        });
        if (bully) {
            const r = (bully as HTMLElement).getBoundingClientRect();
            found.push({
                url: pageUrl, category: 'FUNC', title: 'Mobile Overflow',
                message: 'Element sticks out past the screen edge.',
                selector: getSurgicalSelector(bully as HTMLElement),
                outerHTML: (bully as HTMLElement).outerHTML.substring(0, 150),
                severity: 'high', fix: 'Apply max-width: 100%.',
                boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height },
                detectedAt: Date.now()
            });
        }
    }
    return found;
  }, url);

  return rawErrors.map(e => ({ ...e, id: generateErrorId(e), fingerprint: generateErrorId(e) })) as AuditError[];
}