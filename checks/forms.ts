import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkForms(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];
    
    document.querySelectorAll('form').forEach((form, i) => {
      const formSelector = form.id ? `#${form.id}` : `form:nth-of-type(${i+1})`;

      // 1. Check for Submit Button
      const hasSubmit = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
      if (!hasSubmit) {
        const r = form.getBoundingClientRect();
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Form Missing Submit',
          message: `Form has no submit button. Users cannot complete this action.`,
          selector: formSelector, outerHTML: form.outerHTML.substring(0, 150),
          severity: 'critical', fix: 'Add a <button type="submit"> to the form.',
          boundingBox: r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
          detectedAt: Date.now()
        });
      }

      // 2. Check for Unlabeled Inputs (Precision Targeting)
      form.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(input => {
        const el = input as HTMLElement;
        const type = el.getAttribute('type')?.toLowerCase() || '';

        // 🎯 MERCY RULE: Skip buttons, resets, and submits (they label themselves via value/text)
        if (['submit', 'button', 'reset', 'image'].includes(type)) return;

        const id = el.id;
        const inputSelector = id ? `#${id}` : `${formSelector} ${el.tagName.toLowerCase()}[name="${el.getAttribute('name') || ''}"]`;
        
        const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
        const hasAriaLabel = !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'));
        const isWrapped = !!el.closest('label');

        if (!hasLabel && !hasAriaLabel && !isWrapped) {
          const r = el.getBoundingClientRect();
          const identifier = el.getAttribute('name') || el.getAttribute('placeholder') || 'input field';
          
          found.push({
            url: pageUrl, category: 'FUNC', title: 'Missing Input Label',
            message: `Field "${identifier}" lacks an associated <label> or aria-label.`,
            selector: inputSelector, outerHTML: el.outerHTML.substring(0, 150),
            severity: 'high', fix: 'Associate a <label> with a "for" attribute matching the input ID.',
            boundingBox: r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null,
            detectedAt: Date.now()
          });
        }
      });
    });

    return found;
  }, url);

  return rawErrors.map(e => ({
    ...e, id: generateErrorId(e), fingerprint: generateErrorId(e)
  })) as AuditError[];
}