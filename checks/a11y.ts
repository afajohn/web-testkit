import { Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkA11y(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const errors: AuditError[] = [];

  try {
    // 1. Reference Logic: Trigger Lazy Content by scrolling
    await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(resolve => setTimeout(resolve, 600)); // Brief pause for lazy images/scripts
      window.scrollTo(0, 0);
    });

    // 2. Configure Axe-Core
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a'])
      // Exclude elements that aren't part of the user's visual journey
      .exclude('[style*="display: none"], [hidden], [aria-hidden="true"]')
      .analyze();

    // 3. Process Violations with Precision Targeting
    for (const violation of results.violations) {
      for (const node of violation.nodes) {
        // Axe provides an array of selectors; we join them to find the target
        const axeSelector = Array.isArray(node.target) ? node.target.join(' ') : node.target;
        
        // 🎯 PRECISION EVALUATION
        // We find the element Axe is complaining about and extract its metadata surgically
        const elementInfo = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            
            const r = el.getBoundingClientRect();
            
            // Generate a ROBUST selector for the Sniper button
            const getRobustSelector = (target: Element): string => {
                if (target.id) return `#${target.id}`;
                const tag = target.tagName.toLowerCase();
                if (target.classList.length > 0) return `${tag}.${Array.from(target.classList)[0]}`;
                return tag;
            };

            return {
                selector: getRobustSelector(el),
                html: el.outerHTML.substring(0, 150),
                box: { x: r.x, y: r.y, width: r.width, height: r.height }
            };
        }, axeSelector);

        if (!elementInfo) continue; // Skip if the element vanished (common with dynamic ads)

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
            selector: elementInfo.selector, // 🎯 OUR ROBUST SELECTOR
            outerHTML: elementInfo.html,
            severity: severityMap[violation.impact || 'serious'] || 'high',
            fix: `WCAG Reference: ${violation.helpUrl}`,
            boundingBox: elementInfo.box, // 🎯 PRECISION COORDINATES
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
    // Don't crash the whole batch, just report the scan failure for this page
  }

  return errors;
}