import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { PageResult, AuditError, generateErrorId } from './types';
import { checkSEO } from '../checks/seo';
import { checkSecurity } from '../checks/security';
import { checkImages } from '../checks/images';
import { checkLinks } from '../checks/links';
import { checkA11y } from '../checks/a11y';
import { checkSchema } from '../checks/schema';
import { checkSocial } from '../checks/social';
import { checkForms } from '../checks/forms';
import { checkFunctional } from '../checks/functional';
import { checkVisual } from '../checks/visual';
import { checkMobile } from '../checks/mobile';
import { checkContent } from '../checks/content';
import { checkPerformance } from '../checks/performance';

const USER_AGENT = 'QA-Speed-Scanner/1.0 (Bot)';

export async function scanUrl(url: string, onStatus?: (status: string) => void): Promise<PageResult> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ userAgent: USER_AGENT });
  const page = await context.newPage();
  const allErrors: AuditError[] = [];
  
  // 🎯 TRACKING: Save the intended URL to catch redirects
  const originalUrl = url;

  try {
    if (onStatus) onStatus('Connecting');

    // 🎯 LISTENER: Catch "Dead Video" signals from the network
    page.on('requestfailed', request => {
      if (request.url().includes('youtube.com/error_204')) {
          const err: Partial<AuditError> = {
              url, category: 'FUNC', title: 'Dead Video Detected',
              message: `A YouTube video on this page returned an internal error (likely removed or private).`,
              selector: 'iframe[src*="youtube"]', outerHTML: 'N/A', severity: 'high',
              fix: 'Check video embeds; one or more may have been removed by the provider.',
              boundingBox: null, detectedAt: Date.now()
          };
          allErrors.push({ ...err, id: generateErrorId(err), fingerprint: 'vid-err' } as AuditError);
      }
    });
    
    // Increased timeout for stability & Wait for load
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    
    // 🎯 STABILITY: Give the page 1 second to settle (animations, lazy loads, redirects)
    await page.waitForTimeout(1000);

    if (!response || response.status() >= 400) throw new Error(`HTTP ${response?.status()}`);

    // --- EXECUTE CHECKS ---
    
    // Core 4
    allErrors.push(...await checkSecurity(page, response));
    allErrors.push(...await checkSEO(page));
    allErrors.push(...await checkImages(page));
    allErrors.push(...await checkLinks(page));
    allErrors.push(...await checkA11y(page));

    // Wave 2
    if (onStatus) onStatus('Marketing/Schema');
    allErrors.push(...await checkSchema(page));
    allErrors.push(...await checkSocial(page));

    // Wave 3
    if (onStatus) onStatus('Forms/Interactive');
    allErrors.push(...await checkForms(page));
    allErrors.push(...await checkFunctional(page));

    // Wave 4
    if (onStatus) onStatus('Visual/Mobile');
    allErrors.push(...await checkVisual(page));
    allErrors.push(...await checkMobile(page));
    allErrors.push(...await checkContent(page));
    allErrors.push(...await checkPerformance(page));

    // 🎯 NEW: PHANTOM REDIRECT CHECK
    // Compare where we started vs where we ended up
    const finalUrl = page.url();
    
    // Normalize: remove protocol (http/s), www, and trailing slash for a fair comparison
    const normOriginal = originalUrl.replace(/(^\w+:|^)\/\//, '').replace('www.', '').replace(/\/$/, '');
    const normFinal = finalUrl.replace(/(^\w+:|^)\/\//, '').replace('www.', '').replace(/\/$/, '');

    // Ignore if it's just an anchor link (same page)
    if (normOriginal !== normFinal && !finalUrl.includes('#')) {
        const err: Partial<AuditError> = {
            url: originalUrl, 
            category: 'SEO', 
            title: 'Unexpected Redirect',
            message: `Page auto-redirected to "${finalUrl}". This may confuse users and hurt SEO.`,
            selector: 'head', 
            outerHTML: `Target: ${originalUrl}\nResult: ${finalUrl}`, 
            severity: 'critical', 
            fix: 'Check for <meta refresh> tags or JavaScript window.location redirects.',
            boundingBox: null, 
            detectedAt: Date.now()
        };
        allErrors.push({ ...err, id: generateErrorId(err), fingerprint: 'phantom-redirect' } as AuditError);
    }

  } catch (e: any) {
    const err: Partial<AuditError> = {
        url, category: 'FUNC', title: 'System Error', message: e.message,
        selector: 'N/A', outerHTML: 'N/A', severity: 'critical', fix: 'Check connection.',
        boundingBox: null, fingerprint: 'system-error', detectedAt: Date.now()
    };
    allErrors.push({ ...err, id: generateErrorId(err) } as AuditError);
  } finally {
    await browser.close();
  }

  return { domain: new URL(url).hostname, url, errors: allErrors, timestamp: new Date().toISOString() };
}