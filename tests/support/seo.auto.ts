import { test as base } from '@playwright/test';
import { seoAuto } from 'playwright-seo/fixture';
import type { SeoAutoFixtures } from 'playwright-seo/fixture';
import seoUser from '../../playwright-seo.config';
import { toRuleConfig, toRunnerOptions } from 'playwright-seo';

export const test = base.extend<SeoAutoFixtures>({
  ...seoAuto({
    defaults: {
      config: toRuleConfig(seoUser),
    },
    dedupePerWorker: toRunnerOptions(seoUser).dedupePerWorker,
    severity: toRunnerOptions(seoUser).severity,
  }),
});

export { expect } from '@playwright/test';

