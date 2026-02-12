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
// Output directly to the dashboard folder
const jsonOutputFile = 'reports/aura-dashboard/test-results.json';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig<SeoAutoFixtures>({
  testDir: './tests',
  // --- CRITICAL SETTINGS FOR STABILITY (SEQUENTIAL EXECUTION) ---
  timeout: 0, // 0 = Infinite. Never kill the test globally.
  expect: {
    timeout: 60000, // 1 mins per site max
  },
  fullyParallel: true,
  workers: 1,
  retries: 0, // No retries to keep logs clean
  // -------------------------------------------------------------
  
  reporter: [
    ['list'], // Console progress
    ['json', { outputFile: jsonOutputFile }], // The data file
    [path.join(__dirname, 'utils', 'DeveloperTableReporter.ts')],
  ],

  quiet: true,
  
  use: {
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 0,
    navigationTimeout: 0,
  },

  /* Output directory for test artifacts (videos, screenshots, traces) */

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        actionTimeout: 0,
        navigationTimeout: 0,
        seoAudit: process.env.APP_ENV !== 'development', 
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
