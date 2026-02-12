import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkForms(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];
    
    document.querySelectorAll('form').forEach((form, i) => {
      // 1. Check for Submit Button
      const hasSubmit = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
      if (!hasSubmit) {
        const r = form.getBoundingClientRect();
        found.push({
          url: pageUrl, category: 'FUNC', title: 'Form Missing Submit',
          message: `Form #${i+1} has no detectable submit button. Users cannot send this data.`,
          selector: `form:nth-of-type(${i+1})`, outerHTML: form.outerHTML.substring(0, 100),
          severity: 'critical', fix: 'Add a <button type="submit"> to the form.',
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height }, detectedAt: Date.now()
        });
      }

      // 2. Check for Unlabeled Inputs
      form.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(input => {
        const id = input.id;
        const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
        const hasAriaLabel = !!(input.getAttribute('aria-label') || input.getAttribute('aria-labelledby'));
        const isWrapped = !!input.closest('label');

        if (!hasLabel && !hasAriaLabel && !isWrapped) {
          const r = input.getBoundingClientRect();
          found.push({
            url: pageUrl, category: 'FUNC', title: 'Missing Input Label',
            message: `Form input is missing an associated label or ARIA name.`,
            selector: input.id ? `#${input.id}` : 'input', outerHTML: input.outerHTML,
            severity: 'high', fix: 'Add a <label> with a "for" attribute matching the input ID.',
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