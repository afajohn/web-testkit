import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkSchema(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const rawErrors = await page.evaluate((pageUrl) => {
    const found: any[] = [];
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');

    if (scripts.length === 0) {
      found.push({
        url: pageUrl, category: 'SEO', title: 'Missing JSON-LD',
        message: 'No Structured Data (JSON-LD) found. Rich snippets will not appear in search results.',
        selector: 'head', outerHTML: 'N/A', severity: 'low',
        fix: 'Add Schema.org JSON-LD for Organization, WebSite, or Product.',
        boundingBox: null, detectedAt: Date.now()
      });
    }

    scripts.forEach((script, i) => {
      try {
        const content = script.textContent || '';
        if (!content.trim()) throw new Error('Script is empty');
        
        const data = JSON.parse(content);
        const items = Array.isArray(data) ? data : [data];

        items.forEach(item => {
          const type = item['@type'] || item.type;
          if (!type) {
            found.push({
              url: pageUrl, category: 'SEO', title: 'Invalid Schema Type',
              message: `JSON-LD script #${i+1} is missing "@type".`,
              selector: 'script[type="application/ld+json"]', outerHTML: script.outerHTML.substring(0, 100),
              severity: 'medium', fix: 'Add a valid "@type" property to the schema object.',
              boundingBox: null, detectedAt: Date.now()
            });
          }
          
          // Basic Field Validation
          if (type === 'Organization' && !item.name) {
            found.push({
              url: pageUrl, category: 'SEO', title: 'Incomplete Schema',
              message: 'Organization schema missing "name".',
              selector: 'script', outerHTML: 'N/A', severity: 'low',
              fix: 'Add the "name" property to your Organization schema.',
              boundingBox: null, detectedAt: Date.now()
            });
          }
        });
      } catch (e: any) {
        found.push({
          url: pageUrl, category: 'SEO', title: 'Broken JSON-LD',
          message: `JSON-LD syntax error: ${e.message}`,
          selector: 'script', outerHTML: script.outerHTML.substring(0, 100),
          severity: 'high', fix: 'Fix the JSON syntax error in your schema script.',
          boundingBox: null, detectedAt: Date.now()
        });
      }
    });

    return found;
  }, url);

  return rawErrors.map(e => ({
    ...e, id: generateErrorId(e), fingerprint: generateErrorId(e)
  })) as AuditError[];
}