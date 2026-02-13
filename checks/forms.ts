import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkForms(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];
    
    // 🎯 HELPER: Robust selector within form context
    const getFormItemSelector = (form: HTMLFormElement, el: HTMLElement): string => {
        if (el.id) return `#${el.id}`;
        const name = el.getAttribute('name');
        const formId = form.id ? `#${form.id}` : 'form';
        if (name) return `${formId} [name="${name}"]`;
        return `${formId} ${el.tagName.toLowerCase()}`;
    };

    document.querySelectorAll('form').forEach((form, i) => {
      const formSelector = form.id ? `#${form.id}` : `form:nth-of-type(${i+1})`;

      // 1. Check for Submit Button
      const hasSubmit = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
      if (!hasSubmit) {
        const r = form.getBoundingClientRect();
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Form Missing Submit',
          message: `Form has no detectable submit button. Users are trapped.`,
          selector: formSelector, 
          outerHTML: form.outerHTML.substring(0, 200),
          severity: 'critical', 
          fix: 'Insert a <button type="submit">Submit</button> inside the form tags.',
          boundingBox: r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, 
          detectedAt: Date.now()
        });
      }

      // 2. Check for Unlabeled Inputs
      form.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(input => {
        const el = input as HTMLElement;
        const type = (el as any).type ? (el as any).type.toLowerCase() : '';
        if (['submit', 'button', 'reset', 'image'].includes(type)) return;

        const id = el.id;
        const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
        const hasAriaLabel = !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'));
        const isWrapped = !!el.closest('label');

        if (!hasLabel && !hasAriaLabel && !isWrapped) {
          const r = el.getBoundingClientRect();
          const identifier = el.getAttribute('name') || el.getAttribute('placeholder') || 'input field';
          const selector = getFormItemSelector(form, el);
          
          found.push({
            url: pageUrl, category: 'FUNC', title: 'Missing Input Label',
            message: `The "${identifier}" field has no label. Screen readers will ignore it.`,
            selector: selector, 
            outerHTML: el.outerHTML.substring(0, 200),
            severity: 'high', 
            fix: `Use <label for="${id || 'ID_HERE'}"> or add an aria-label attribute.`,
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