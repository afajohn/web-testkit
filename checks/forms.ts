import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkForms(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];
    
    document.querySelectorAll('form').forEach((form, i) => {
      // 🎯 Form Selector
      const formSelector = form.id ? `#${form.id}` : `form:nth-of-type(${i+1})`;

      // 1. Check for Submit Button
      const hasSubmit = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
      if (!hasSubmit) {
        const r = form.getBoundingClientRect();
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Form Missing Submit',
          message: `Form has no submit button. Users cannot complete this action.`,
          selector: formSelector, outerHTML: form.outerHTML.substring(0, 150),
          severity: 'critical', fix: 'Add a <button type="submit">.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
        });
      }

      // 2. Check for Unlabeled Inputs (Precision Targeting)
      form.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(input => {
        const el = input as HTMLElement;
        const id = el.id;
        // Generate selector for the specific field
        const inputSelector = id ? `#${id}` : `${formSelector} ${el.tagName.toLowerCase()}[name="${el.getAttribute('name') || ''}"]`;
        
        const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
        const hasAriaLabel = !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'));
        const isWrapped = !!el.closest('label');

        if (!hasLabel && !hasAriaLabel && !isWrapped) {
          const r = el.getBoundingClientRect();
          // 🎯 FIX: Using getAttribute('placeholder') instead of el.placeholder
          const identifier = el.getAttribute('name') || el.getAttribute('placeholder') || 'input field';
          
          found.push({
            url: pageUrl, category: 'FUNC', title: 'Missing Input Label',
            message: `Field "${identifier}" lacks a label.`,
            selector: inputSelector, outerHTML: el.outerHTML.substring(0, 150),
            severity: 'high', fix: 'Associate a <label> or add an aria-label.',
            boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
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