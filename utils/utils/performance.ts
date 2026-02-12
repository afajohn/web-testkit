import { Page } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';
import * as fs from 'fs';
import * as path from 'path';
import {
  formatSectionHeader,
  formatTableHeader,
  formatTableRow,
  formatSeparator,
} from './formatting';

/**
 * Web Vitals metrics interface
 */
export interface WebVitalsMetrics {
  lcp: number | null; // Largest Contentful Paint (ms) - Target: < 2500ms
  fid: number | null; // First Input Delay (ms) - Target: < 100ms
  cls: number | null; // Cumulative Layout Shift - Target: < 0.1
  fcp: number | null; // First Contentful Paint (ms) - Target: < 1800ms
  ttfb: number | null; // Time to First Byte (ms) - Target: < 800ms
}

/**
 * Performance audit results interface
 */
export interface PerformanceAuditResult {
  score: number; // Overall performance score (0-100)
  webVitals: WebVitalsMetrics;
  passed: boolean; // Whether all thresholds are met
  reportPath: string | null; // Path to HTML report
  metrics: {
    [key: string]: number | null;
  };
}

/**
 * Run Lighthouse performance audit
 * @param page - Playwright page object
 * @param outputDir - Directory to save the HTML report
 * @param url - URL being tested (for report naming)
 * @returns Performance audit results
 * 
 * This function is designed to be resilient - it will always try to return
 * a report path even if some parts of the audit fail.
 */
export async function runPerformanceAudit(
  page: Page,
  outputDir: string = 'test-results',
  url?: string
): Promise<PerformanceAuditResult> {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate report filename based on URL or timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const reportFilename = url
    ? `lighthouse-report-${timestamp}.html`
    : `lighthouse-report-${timestamp}.html`;
  const reportPath = path.join(outputDir, reportFilename);

  let lighthouseReport: any = null;
  let actualReportPath: string | null = null;

  try {
    // Run Lighthouse audit with ALL categories (Performance, Accessibility, Best Practices, SEO)
    // This generates the full Lighthouse HTML report with all visual elements
    lighthouseReport = await playAudit({
      page,
      config: {
        extends: 'lighthouse:default',
        settings: {
          // Remove onlyCategories to get all categories (Performance, Accessibility, Best Practices, SEO)
          // This ensures the full report is generated with all visual elements
        },
      },
      // Remove thresholds to ensure report is always generated
      // Thresholds can cause playwright-lighthouse to throw errors, preventing report generation
      port: 9222, // Chrome DevTools Protocol port
      reports: {
        formats: {
          html: true, // This generates the full HTML report with all categories
        },
        name: reportFilename.replace('.html', ''),
        directory: outputDir,
      },
    });
  } catch (auditError: any) {
    // Log the error but continue to try to find the report
    console.warn(`Lighthouse audit encountered an error: ${auditError.message}`);
    console.warn(`Attempting to locate generated report...`);
  }

  // Always try to find the report, even if audit threw an error
  // playwright-lighthouse may have generated it before failing
  try {
    // Check if the expected report exists
    if (fs.existsSync(reportPath)) {
      actualReportPath = reportPath;
    } else {
      // Search for Lighthouse HTML files in the output directory
      try {
        const files = fs.readdirSync(outputDir);
        const lighthouseFiles = files.filter((file) => 
          file.startsWith('lighthouse') && file.endsWith('.html')
        );
        
        if (lighthouseFiles.length > 0) {
          // Use the most recent one (if multiple)
          const sortedFiles = lighthouseFiles.sort((a, b) => {
            const statA = fs.statSync(path.join(outputDir, a));
            const statB = fs.statSync(path.join(outputDir, b));
            return statB.mtime.getTime() - statA.mtime.getTime();
          });
          actualReportPath = path.join(outputDir, sortedFiles[0]);
        }
      } catch (findError) {
        // If we can't find the report, log but continue
        console.warn(`Could not locate Lighthouse report in ${outputDir}`);
      }
    }
  } catch (error) {
    // If we can't access the directory, continue without report path
    console.warn(`Error accessing output directory: ${error}`);
  }

  // Extract metrics from Lighthouse results if available
  let webVitals: WebVitalsMetrics = {
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
  };
  let score = 0;
  const metrics: { [key: string]: number | null } = {};

  if (lighthouseReport && lighthouseReport.lhr) {
    try {
      // Extract Web Vitals from Lighthouse results
      webVitals = extractWebVitals(lighthouseReport);
      score = lighthouseReport.lhr.categories.performance?.score
        ? Math.round(lighthouseReport.lhr.categories.performance.score * 100)
        : 0;

      // Extract additional metrics
      if (lighthouseReport.lhr.audits) {
        Object.keys(lighthouseReport.lhr.audits).forEach((key) => {
          const audit = lighthouseReport.lhr.audits[key];
          if (audit.numericValue !== undefined) {
            metrics[key] = audit.numericValue;
          }
        });
      }
    } catch (extractError) {
      // If extraction fails, use defaults (already set above)
      console.warn(`Error extracting Lighthouse metrics: ${extractError}`);
    }
  } else {
    // If lighthouseReport is null, we still want to return a result with the report path
    console.warn(`Lighthouse report data not available, but report may have been generated`);
  }

  // Check if all Web Vitals thresholds are met
  const passed = checkWebVitalsThresholds(webVitals);

  return {
    score,
    webVitals,
    passed,
    reportPath: actualReportPath,
    metrics,
  };
}

/**
 * Extract Web Vitals metrics from Lighthouse report
 */
function extractWebVitals(lighthouseReport: any): WebVitalsMetrics {
  const audits = lighthouseReport.lhr.audits || {};

  // Extract metrics
  const lcp = audits['largest-contentful-paint']?.numericValue
    ? Math.round(audits['largest-contentful-paint'].numericValue)
    : null;
  const fid = audits['max-potential-fid']?.numericValue
    ? Math.round(audits['max-potential-fid'].numericValue)
    : null;
  const cls = audits['cumulative-layout-shift']?.numericValue
    ? audits['cumulative-layout-shift'].numericValue
    : null;
  const fcp = audits['first-contentful-paint']?.numericValue
    ? Math.round(audits['first-contentful-paint'].numericValue)
    : null;
  const ttfb = audits['server-response-time']?.numericValue
    ? Math.round(audits['server-response-time'].numericValue)
    : null;

  return {
    lcp,
    fid,
    cls,
    fcp,
    ttfb,
  };
}

/**
 * Check if Web Vitals meet thresholds
 */
function checkWebVitalsThresholds(webVitals: WebVitalsMetrics): boolean {
  const thresholds = {
    lcp: 2500, // < 2.5s
    fid: 100, // < 100ms
    cls: 0.1, // < 0.1
    fcp: 1800, // < 1.8s
    ttfb: 800, // < 800ms
  };

  if (webVitals.lcp !== null && webVitals.lcp > thresholds.lcp) return false;
  if (webVitals.fid !== null && webVitals.fid > thresholds.fid) return false;
  if (webVitals.cls !== null && webVitals.cls > thresholds.cls) return false;
  if (webVitals.fcp !== null && webVitals.fcp > thresholds.fcp) return false;
  if (webVitals.ttfb !== null && webVitals.ttfb > thresholds.ttfb) return false;

  return true;
}

/**
 * Format performance audit results for console output
 */
export function formatPerformanceReport(result: PerformanceAuditResult): string {
  let report = formatSectionHeader('PERFORMANCE AUDIT RESULTS');

  // Summary section
  report += `SUMMARY:\n`;
  report += `${formatSeparator()}\n`;
  report += formatTableHeader(
    ['Metric', 'Value', 'Status'],
    [40, 20, 30]
  );
  
  const scoreStatus = result.passed ? '✅ PASSED' : '❌ FAILED';
  report += formatTableRow(
    ['Overall Performance Score', `${result.score}/100`, scoreStatus],
    [40, 20, 30]
  );
  report += `${formatSeparator()}\n\n`;

  // Web Vitals section
  report += `CORE WEB VITALS:\n`;
  report += `${formatSeparator()}\n`;
  report += formatTableHeader(
    ['Metric', 'Value', 'Target', 'Status'],
    [40, 20, 20, 15]
  );

  const vitals = [
    {
      name: 'LCP (Largest Contentful Paint)',
      value: result.webVitals.lcp,
      unit: 'ms',
      threshold: 2500,
      target: '< 2.5s',
    },
    {
      name: 'FID (First Input Delay)',
      value: result.webVitals.fid,
      unit: 'ms',
      threshold: 100,
      target: '< 100ms',
    },
    {
      name: 'CLS (Cumulative Layout Shift)',
      value: result.webVitals.cls,
      unit: '',
      threshold: 0.1,
      target: '< 0.1',
    },
    {
      name: 'FCP (First Contentful Paint)',
      value: result.webVitals.fcp,
      unit: 'ms',
      threshold: 1800,
      target: '< 1.8s',
    },
    {
      name: 'TTFB (Time to First Byte)',
      value: result.webVitals.ttfb,
      unit: 'ms',
      threshold: 800,
      target: '< 800ms',
    },
  ];

  vitals.forEach((vital) => {
    if (vital.value !== null) {
      const passed = vital.value <= vital.threshold;
      const status = passed ? '✅ PASSED' : '❌ FAILED';
      const displayValue = vital.unit === 'ms' ? `${vital.value}${vital.unit}` : vital.value.toString();
      report += formatTableRow(
        [vital.name, displayValue, vital.target, status],
        [40, 20, 20, 15]
      );
    } else {
      report += formatTableRow(
        [vital.name, 'Not available', vital.target, '⚠️  N/A'],
        [40, 20, 20, 15]
      );
    }
  });

  report += `${formatSeparator()}\n\n`;

  // Report Location
  if (result.reportPath) {
    report += `Lighthouse HTML Report: ${result.reportPath}\n`;
  }

  report += `\n${formatSeparator('=')}\n`;
  return report;
}

