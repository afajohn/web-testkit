import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { FailureContext, FailureCategory } from './failure-schema';

type PartialContext = {
  id: string;
  category: FailureCategory;
  selector?: string;
  target?: string;
  timing: FailureContext['timing'];
  description: string;
  expected?: string;
  actual?: string;
  metadata?: Record<string, any>;
};

const ensureDirExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * Capture forensic evidence for a failure and return a complete FailureContext.
 * This function is side-effect safe and does not throw if evidence collection fails;
 * it still returns a best-effort context.
 */
export const reportFailure = async (
  page: Page,
  partial: PartialContext
): Promise<FailureContext> => {
  const viewportSize = page.viewportSize();
  const viewport = viewportSize
    ? `${viewportSize.width}x${viewportSize.height}`
    : 'unknown';

  let domSnapshot = '';
  try {
    domSnapshot = await page.content();
  } catch {
    domSnapshot = '';
  }

    // Screenshots disabled - no longer capturing playwright-report artifacts

  return {
    id: partial.id,
    category: partial.category,
    url: page.url(),
    selector: partial.selector,
    target: partial.target,
    timing: partial.timing,
    viewport,
    description: partial.description,
    expected: partial.expected,
    actual: partial.actual,
    evidence: {
      screenshot: undefined,
      domSnapshot,
    },
    metadata: partial.metadata ?? {},
  };
};
