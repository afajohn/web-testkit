import { Page } from 'playwright';
import { AuditError, generateErrorId } from '../runner/types';

export async function checkPerformance(page: Page): Promise<AuditError[]> {
  const url = page.url();
  const timestamp = Date.now();

  const metrics = await page.evaluate(() => {
    const [nav] = performance.getEntriesByType('navigation') as any;
    return {
      loadTime: nav?.loadEventEnd || 0,
      domReady: nav?.domContentLoadedEventEnd || 0,
      pageSize: performance.getEntriesByType('resource').reduce((acc, r: any) => acc + (r.transferSize || 0), 0)
    };
  });

  const errors: AuditError[] = [];

  if (metrics.loadTime > 3000) {
    const err: Partial<AuditError> = {
      url, category: 'FUNC', title: 'Slow Load Time',
      message: `Page took ${(metrics.loadTime / 1000).toFixed(2)}s to fully load.`,
      selector: 'window', outerHTML: 'N/A', severity: 'medium',
      fix: 'Optimize images and reduce heavy third-party scripts.',
      boundingBox: null, detectedAt: timestamp
    };
    errors.push({ ...err, id: generateErrorId(err), fingerprint: 'perf-slow' } as AuditError);
  }

  return errors;
}