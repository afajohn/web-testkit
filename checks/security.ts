import { Page, Response } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkSecurity(page: Page, response: Response): Promise<AuditError[]> {
  const url = page.url();
  const errors: AuditError[] = [];
  const headers = response.headers();
  const timestamp = Date.now();

  // 1. HEADER INTEGRITY
  const securityHeaders = [
    { name: 'Strict-Transport-Security', title: 'HSTS Check', severity: 'high' as const, mustInclude: 'max-age' },
    { name: 'X-Content-Type-Options', title: 'MIME Sniffing', severity: 'medium' as const, mustEqual: 'nosniff' },
    { name: 'X-Frame-Options', title: 'Clickjacking Protection', severity: 'high' as const, mustIncludeAny: ['DENY', 'SAMEORIGIN'] },
    { name: 'Content-Security-Policy', title: 'CSP Missing', severity: 'critical' as const },
    { name: 'Referrer-Policy', title: 'Referrer Privacy', severity: 'low' as const }
  ];

  securityHeaders.forEach(config => {
    const value = headers[config.name.toLowerCase()];
    let issue = '';

    if (!value) {
      issue = `${config.name} header is missing.`;
    } else if (config.mustInclude && !value.includes(config.mustInclude)) {
      issue = `${config.name} is present but missing "${config.mustInclude}" directive.`;
    } else if (config.mustEqual && value.toLowerCase() !== config.mustEqual.toLowerCase()) {
      issue = `${config.name} should be "${config.mustEqual}", found: "${value}".`;
    } else if (config.mustIncludeAny && !config.mustIncludeAny.some(v => value.toUpperCase().includes(v))) {
      issue = `${config.name} has invalid value: "${value}". Use ${config.mustIncludeAny.join(' or ')}.`;
    }

    if (issue) {
      const err: Partial<AuditError> = {
        url, category: 'SECURITY', title: config.title, message: issue,
        selector: 'head', outerHTML: 'N/A', severity: config.severity,
        fix: `Update server configuration (Nginx/Apache) to send valid ${config.name} headers.`,
        boundingBox: null, detectedAt: timestamp
      };
      errors.push({ ...err, id: generateErrorId(err), fingerprint: generateErrorId(err) } as AuditError);
    }
  });

  // 2. COOKIE SURVEILLANCE
  const cookies = await page.context().cookies(url);
  cookies.forEach(cookie => {
    const cookieIssues: string[] = [];
    if (url.startsWith('https://') && !cookie.secure) cookieIssues.push('Missing "Secure" flag');
    if (!cookie.httpOnly) cookieIssues.push('Missing "HttpOnly" flag');

    if (cookieIssues.length > 0) {
      const err: Partial<AuditError> = {
        url, category: 'SECURITY', title: 'Insecure Cookie',
        message: `Cookie "${cookie.name}" is vulnerable: ${cookieIssues.join(', ')}.`,
        selector: 'head', outerHTML: 'N/A', severity: 'medium',
        fix: 'Set Secure and HttpOnly flags on all sensitive cookies.',
        boundingBox: null, detectedAt: timestamp
      };
      errors.push({ ...err, id: generateErrorId(err), fingerprint: generateErrorId(err) } as AuditError);
    }
  });

  // 3. MIXED CONTENT DETECTION (With Bounding Box Support!)
  if (url.startsWith('https://')) {
    const mixedItems = await page.evaluate(() => {
      const results: any[] = [];
      const tags = { 'img': 'src', 'link': 'href', 'script': 'src', 'iframe': 'src' };
      
      Object.entries(tags).forEach(([tag, attr]) => {
        document.querySelectorAll(`${tag}[${attr}^="http://"]`).forEach(el => {
          const rect = el.getBoundingClientRect();
          results.push({
            tag: tag.toUpperCase(),
            attrValue: el.getAttribute(attr),
            selector: `${tag}[${attr}="${el.getAttribute(attr)}"]`,
            outerHTML: el.outerHTML.substring(0, 100),
            boundingBox: rect.width > 0 ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null
          });
        });
      });
      return results;
    });

    mixedItems.forEach(item => {
      const err: Partial<AuditError> = {
        url, category: 'SECURITY', title: 'Mixed Content',
        message: `Insecure ${item.tag} resource loaded over HTTP: ${item.attrValue}`,
        selector: item.selector, outerHTML: item.outerHTML, severity: 'high',
        fix: 'Change the resource URL to use HTTPS.',
        boundingBox: item.boundingBox, detectedAt: timestamp
      };
      errors.push({ ...err, id: generateErrorId(err), fingerprint: generateErrorId(err) } as AuditError);
    });
  }

  return errors;
}