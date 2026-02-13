import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkMobile(page: Page): Promise<AuditError[]> {
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

    // 1. Viewport Meta Tag (SEO/Invisible)
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'Missing Viewport Tag',
        message: 'No viewport meta tag found. The site will look broken on mobile devices.',
        selector: 'head', outerHTML: 'N/A', severity: 'critical',
        fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">.',
        boundingBox: null, detectedAt: Date.now()
      });
    }

    // 2. Mobile Overflow Culprit Hunt (The "Bully" Element)
    const vw = window.innerWidth;
    if (document.documentElement.scrollWidth > vw) {
        // Find the specific element pushing the width
        const elements = document.body.querySelectorAll('*');
        let biggestBully: HTMLElement | null = null;
        let maxRight = vw;

        elements.forEach((node) => {
            const el = node as HTMLElement;
            const rect = el.getBoundingClientRect();
            // Check if element is visible and sticking out past the right edge
            if (rect.width > 0 && rect.right > maxRight) {
                maxRight = rect.right;
                biggestBully = el;
            }
        });

        if (biggestBully) {
            const el = biggestBully as HTMLElement;
            const rect = el.getBoundingClientRect();
            found.push({
                url: pageUrl, category: 'FUNC', title: 'Mobile Overflow',
                message: `Element causes horizontal scroll by sticking out ${Math.round(rect.right - vw)}px.`,
                selector: getSelector(el),
                outerHTML: el.outerHTML.substring(0, 150),
                severity: 'high',
                fix: 'Apply max-width: 100% or overflow: hidden to this element or its parent.',
                boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                detectedAt: Date.now()
            });
        }
    }

    // 3. Touch Target Size (WCAG 44x44px Rule)
    const interactives = document.querySelectorAll('button, a, input, [role="button"]');
    interactives.forEach(node => {
        const el = node as HTMLElement;
        const rect = el.getBoundingClientRect();
        
        // Only check visible elements that are significantly too small
        if (rect.width > 0 && rect.height > 0 && (rect.width < 32 || rect.height < 32)) {
            found.push({
                url: pageUrl, category: 'A11Y', title: 'Small Touch Target',
                message: `Interactive element is too small for reliable mobile tapping (${Math.round(rect.width)}x${Math.round(rect.height)}px).`,
                selector: getSelector(el),
                outerHTML: el.outerHTML.substring(0, 100),
                severity: 'medium',
                fix: 'Ensure interactive elements are at least 44x44px for mobile accessibility.',
                boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
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