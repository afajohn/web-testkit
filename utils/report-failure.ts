import { Page, TestInfo } from '@playwright/test';
import { FailureContext, FailureCategory } from './failure-schema';

/**
 * ULTRA-FAST METADATA ONLY REPORTING
 * No screenshots, no disk writes. Pure data.
 */
export async function reportFailure(
  page: Page,
  partial: any
): Promise<FailureContext> {
  // Capture outerHTML if a selector exists to help the manual inspection
  let domSnippet = 'N/A';
  try {
    if (partial.selector && partial.selector !== 'N/A') {
        const locator = page.locator(partial.selector).first();
        if (await locator.count() > 0) {
            domSnippet = await locator.evaluate(el => el.outerHTML.substring(0, 500));
        }
    }
  } catch (e) {}

  return {
    ...partial,
    url: page.url(),
    snippet: domSnippet,
    evidence: { screenshot: undefined } // Explicitly no screenshot
  } as any;
}

export async function attachFailureContexts(testInfo: TestInfo, contexts: FailureContext[]) {
  if (!contexts || contexts.length === 0) return;
  await testInfo.attach('failure-contexts', {
    body: JSON.stringify(contexts, null, 2),
    contentType: 'application/json'
  });
}