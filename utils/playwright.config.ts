import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import type { SeoAutoFixtures } from 'playwright-seo/fixture';
import seoUser from './playwright-seo.config';
import { toRuleConfig, toRunnerOptions } from 'playwright-seo';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Utility function to generate URL-based folder paths
 */
function getUrlBasedPath(url: string | undefined, baseDir: string): string {
  if (!url) {
    return baseDir; // Default if no URL provided
  }

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, ''); // Remove www. prefix
    
    // Get pathname and remove leading/trailing slashes
    const pathname = urlObj.pathname.replace(/^\/+|\/+$/g, '');
    let pathSegments = pathname ? pathname.split('/').filter(Boolean) : [];
    
    // Extract filename if it exists (for root-level files like index.html, page.html)
    let filename: string | null = null;
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1];
      // Check if last segment looks like a filename (has extension)
      if (lastSegment.includes('.') && !lastSegment.match(/^[a-zA-Z0-9_-]+$/)) {
        filename = lastSegment;
        // Remove the filename from pathSegments for directory structure
        pathSegments = pathSegments.slice(0, -1);
      }
    }
    
    // Build the path: baseDir/domain/...pathSegments/[filename-without-extension]/
    const pathParts: string[] = [baseDir, domain];
    
    // Add directory path segments
    if (pathSegments.length > 0) {
      pathParts.push(...pathSegments);
    }
    
    // Add filename (without extension) as directory name if it exists
    if (filename) {
      const filenameWithoutExt = filename.replace(/\.[^/.]+$/, ''); // Remove extension
      // Sanitize filename for filesystem (remove invalid chars)
      const sanitizedFilename = filenameWithoutExt.replace(/[<>:"|?*\x00-\x1F]/g, '-');
      pathParts.push(sanitizedFilename);
    }
    
    return path.join(...pathParts);
  } catch (error) {
    // Invalid URL, return default
    return baseDir;
  }
}

// Get URL from environment variable (set by test scripts or .env file)
// Priority: URL_AUDIT_URL > TEST_URL (from .env) > undefined
const testUrl = process.env.URL_AUDIT_URL || process.env.TEST_URL;
const outputDir = getUrlBasedPath(testUrl, 'test-results');
const reportOutputDir = getUrlBasedPath(testUrl, 'playwright-report');
// JSON file should be in the same directory as the test results artifacts
// Note: This will overwrite the previous test-results.json for the same URL
// Each test run's artifacts (videos, screenshots) are already in unique subdirectories
const jsonOutputFile = testUrl 
  ? path.join(outputDir, 'test-results.json')
  : 'test-results.json';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig<SeoAutoFixtures>({
  testDir: './tests',
  /* Maximum time one test can run for - STRICTLY ENFORCED: 60 seconds */
  timeout: 60000,
  /* Maximum time an action can take - STRICTLY ENFORCED: 60 seconds */
  expect: {
    timeout: 60000,
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.USE_BLOB_REPORTER === 'true'
    ? [
        // Blob reporter for multiple URL testing (prevents overwriting)
        // Blob reports are stored in the default 'blob-report' directory
        ['blob', { outputDir: 'blob-report' }],
        // JSON reporter - outputs to URL-based directory
        ['json', { outputFile: jsonOutputFile }],
      ]
    : [
        // HTML reporter - Note: HTML reporter doesn't support custom outputFolder,
        // but we use a post-processing script (scripts/organize-html-report.js) to organize reports by URL
        ['html'],
        // JSON reporter - outputs to URL-based directory
        ['json', { outputFile: jsonOutputFile }],
      ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Record video for each test - saved in test-results folder */
    video: 'on',

    /* Action timeout - STRICTLY ENFORCED: 60 seconds */
    actionTimeout: 60000,
    /* Navigation timeout - STRICTLY ENFORCED: 60 seconds */
    navigationTimeout: 60000,
  },

  /* Output directory for test artifacts (videos, screenshots, traces) */
  outputDir: outputDir,

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        /* Project-specific timeout - STRICTLY ENFORCED: 60 seconds */
        actionTimeout: 60000,
        navigationTimeout: 60000,
        /* SEO Audit Configuration */
        seoAudit: process.env.APP_ENV !== 'development', // Disable in development, enable in staging/production
        seoOptions: {
          config: toRuleConfig(seoUser),
          severity: toRunnerOptions(seoUser).severity,
        },
      },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },



    
    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
