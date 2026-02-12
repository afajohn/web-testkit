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

  try {
    if (onStatus) onStatus('Connecting');
    
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    if (!response || response.status() >= 400) throw new Error(`HTTP ${response?.status()}`);

    // Core 4
    allErrors.push(...await checkSecurity(page, response));
    allErrors.push(...await checkSEO(page));
    allErrors.push(...await checkImages(page));
    allErrors.push(...await checkLinks(page));
    allErrors.push(...await checkA11y(page));

    // Wave 2
    if (onStatus) onStatus('Metadata/Schema');
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