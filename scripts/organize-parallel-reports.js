#!/usr/bin/env node

/**
 * Organize parallel test reports by URL
 * This script splits the default Playwright report into individual URL-based reports
 * and matches the sequential test script's output structure
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { getUrlBasedPath, getUniqueUrlBasedPath } = require('../utils/url-path');

// Read URLs from urls.txt
const urlFilePath = path.join(__dirname, '..', 'urls.txt');
let validUrls = [];

if (fs.existsSync(urlFilePath)) {
  const content = fs.readFileSync(urlFilePath, 'utf-8');
  validUrls = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));
} else {
  console.error('❌ urls.txt not found!');
  process.exit(1);
}

const DEFAULT_REPORT_DIR = path.join(__dirname, '..', 'playwright-report');
const reportPaths = new Map();

/**
 * Organize HTML report for a single URL
 * Uses the same organize-html-report.js script as sequential tests
 */
function organizeReportForUrl(url) {
  return new Promise((resolve) => {
    const organizeProcess = spawn('node', ['scripts/organize-html-report.js'], {
      env: {
        ...process.env,
        URL_AUDIT_URL: url,
        TEST_URL: url,
      },
      shell: true,
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    organizeProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    organizeProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    organizeProcess.on('close', (code) => {
      if (code === 0) {
        // Get the expected report path
        const expectedReportPath = getUniqueUrlBasedPath(url, 'playwright-report', { checkExists: true });
        const fullReportPath = path.join(__dirname, '..', expectedReportPath);
        
        if (fs.existsSync(fullReportPath)) {
          reportPaths.set(url, expectedReportPath);
          resolve(expectedReportPath);
        } else {
          console.warn(`⚠️  Report directory not found after organization: ${expectedReportPath}`);
          resolve(null);
        }
      } else {
        console.error(`⚠️  Error organizing report for ${url} (exit code: ${code})`);
        if (stderr) {
          console.error(`   Error details: ${stderr}`);
        }
        resolve(null);
      }
    });

    organizeProcess.on('error', (error) => {
      console.error(`⚠️  Error organizing report for ${url}: ${error.message}`);
      resolve(null);
    });
  });
}

/**
 * Main function to organize all reports
 */
async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('Organizing Parallel Test Reports by URL');
  console.log('='.repeat(70));
  console.log(`\n   Found ${validUrls.length} URL(s) to process\n`);

  // Check if default report exists
  if (!fs.existsSync(DEFAULT_REPORT_DIR)) {
    console.warn(`⚠️  Default Playwright report directory not found: ${DEFAULT_REPORT_DIR}`);
    console.warn(`   Skipping report organization.`);
    return;
  }

  const defaultIndex = path.join(DEFAULT_REPORT_DIR, 'index.html');
  if (!fs.existsSync(defaultIndex)) {
    console.warn(`⚠️  Default Playwright report index.html not found: ${defaultIndex}`);
    console.warn(`   Skipping report organization.`);
    return;
  }

  // For parallel tests, we need to organize the default report for each URL
  // Since Playwright creates one report for all parallel tests, we'll:
  // 1. For each URL, organize the default report to its URL-based directory
  // 2. The organize-html-report.js script will copy the default report to the URL-specific location
  // Note: This means each URL will get a copy of the full report (which contains all URLs)
  // This matches the sequential behavior where each URL has its own report directory

  let organizedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < validUrls.length; i++) {
    const url = validUrls[i];
    console.log(`   📦 Organizing report ${i + 1}/${validUrls.length}: ${url}`);
    
    const reportPath = await organizeReportForUrl(url);
    
    if (reportPath) {
      organizedCount++;
      console.log(`      ✅ Organized to: ${reportPath}`);
    } else {
      failedCount++;
      console.log(`      ❌ Failed to organize report`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`   Total: ${validUrls.length} | Organized: ${organizedCount} | Failed: ${failedCount}`);
  console.log('='.repeat(70));

  // Return report paths for use by calling script
  return reportPaths;
}

// Run if called directly
if (require.main === module) {
  main()
    .then((paths) => {
      if (paths && paths.size > 0) {
        console.log('\n✅ Report organization complete!');
        
        // After organizing, generate aggregated report (same as sequential)
        const fs = require('fs');
        const path = require('path');
        const { generateAggregatedReport } = require('./generate-aggregated-report');
        const { getUrlBasedPath } = require('../utils/url-path');
        
        // Read URLs from urls.txt
        const urlFilePath = path.join(__dirname, '..', 'urls.txt');
        let validUrls = [];
        
        if (fs.existsSync(urlFilePath)) {
          const content = fs.readFileSync(urlFilePath, 'utf-8');
          validUrls = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'));
        }
        
        if (validUrls.length > 0) {
          // Build results object (same format as sequential)
          const results = {
            total: validUrls.length,
            passed: [],
            failed: [],
            reportPaths: paths || new Map()
          };
          
          // Ensure all URLs have report paths
          validUrls.forEach(url => {
            if (!results.reportPaths.has(url)) {
              results.reportPaths.set(url, getUrlBasedPath(url, 'playwright-report'));
            }
          });
          
          // Generate aggregated report (same function as sequential)
          console.log('\n📊 Generating aggregated error summary dashboard...');
          try {
            generateAggregatedReport(results, validUrls);
            console.log('\n✅ Aggregated report generated successfully!');
            console.log('   View it at: playwright-report/index.html');
            console.log('   📸 Structured FailureContext data (screenshots, DOM snapshots) included in dashboard');
          } catch (error) {
            console.error('\n⚠️  Warning: Could not generate aggregated report:');
            console.error(error.message);
          }
        }
        
        process.exit(0);
      } else {
        console.log('\n⚠️  No reports were organized.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n❌ Error organizing reports:');
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = { organizeReportsByUrl: main };
