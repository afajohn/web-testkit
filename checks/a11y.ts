import { Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkA11y(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const errors: AuditError[] = [];

  try {
    // 1. Trigger Lazy Content (Reference Logic: Scroll to Bottom)
    await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for lazy render
      window.scrollTo(0, 0);
    });

    // 2. Configure Axe (Reference Logic: Exclude Hidden)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a'])
      .exclude('[style*="display: none"], [hidden], [aria-hidden="true"]')
      .analyze();

    // 3. Process Results surgically
    for (const violation of results.violations) {
      for (const node of violation.nodes) {
        const selector = node.target[0] as string;
        
        // 🎯 FETCH BOUNDING BOX (Precision for Snipe Button)
        const box = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
        }, selector);

        const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
            'minor': 'low',
            'moderate': 'medium',
            'serious': 'high',
            'critical': 'critical'
        };

        const errBase: Partial<AuditError> = {
            url,
            category: 'A11Y',
            title: violation.id,
            message: `${violation.help}: ${node.failureSummary}`,
            selector: selector,
            outerHTML: node.html.substring(0, 150),
            severity: severityMap[violation.impact || 'serious'] || 'high',
            fix: `Check guidelines at: ${violation.helpUrl}`,
            boundingBox: box,
            detectedAt: Date.now()
        };

        errors.push({
          ...errBase,
          id: generateErrorId(errBase),
          fingerprint: generateErrorId(errBase)
        } as AuditError);
      }
    }
  } catch (e: any) {
    console.error("Axe Critical Failure:", e.message);
  }

  return errors;
}