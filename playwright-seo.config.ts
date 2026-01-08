// Config for playwright-seo — generated for you.
// true = on, false = off. Adjust thresholds as needed.
import { defineSeoConfig } from 'playwright-seo';

export default defineSeoConfig({
  // Rules (on/off)
  enforceHtmlLang: true,
  enforceViewport: true,
  enforceSingleH1: true,

  enforceTitle: true,
  title: { min: 10, max: 70 },

  enforceMetaDescription: true,
  metaDescription: { min: 50, max: 160 },

  enforceCanonical: true,
  enforceImgAlt: true,
  forbidNoindexOnProd: true,
  checkMainResponseStatus: true,

  // Behavior
  skipIfNoindex: true,
  maxNodesPerIssue: 5,
  excludeUrls: [], // e.g. ['/', '/admin/*', /\/api\//]
  waitFor: 'domcontentloaded', // 'load' | 'domcontentloaded' | 'networkidle'

  // Runner (how the audit is executed)
  runner: {
    // Avoid running the same URL more than once per worker
    dedupePerWorker: true,
    // 'error' => fail test on violations; 'warning' => log only
    severity: 'error'
  }
});
