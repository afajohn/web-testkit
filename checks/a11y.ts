import { Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkA11y(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const errors: AuditError[] = [];

  try {
    if (page.isClosed()) return [];

    await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(r => setTimeout(r, 400));
      window.scrollTo(0, 0);
    }).catch(() => {});

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a'])
      .exclude('[style*="display: none"], [hidden], [aria-hidden="true"]')
      .analyze()
      .catch(() => null);

    if (!results) return [];

    for (const violation of results.violations) {
      for (const node of violation.nodes) {
        const axeSelector = Array.isArray(node.target) ? node.target.join(' ') : node.target;
        
        const info = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            const getRobust = (e: Element) => e.id ? `#${e.id}` : (e.classList.length ? `${e.tagName.toLowerCase()}.${e.classList[0]}` : e.tagName.toLowerCase());
            return { selector: getRobust(el), box: { x: r.x, y: r.y, width: r.width, height: r.height }, html: el.outerHTML.substring(0, 150) };
        }, axeSelector).catch(() => null);

        if (!info) continue;

        const errBase: Partial<AuditError> = {
            url, category: 'A11Y', title: violation.id,
            message: `${violation.help}: ${node.failureSummary}`,
            selector: info.selector, outerHTML: info.html,
            severity: violation.impact === 'critical' ? 'critical' : 'high',
            fix: `WCAG: ${violation.helpUrl}`,
            boundingBox: info.box, detectedAt: Date.now()
        };
        errors.push({ ...errBase, id: generateErrorId(errBase), fingerprint: generateErrorId(errBase) } as AuditError);
      }
    }
  } catch (e: any) {}
  return errors;
}