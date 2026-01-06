#!/usr/bin/env node

/**
 * Post-process HTML report to organize it by URL structure
 * This script moves/copies the HTML report from playwright-report/ to URL-based directory
 */

const fs = require('fs');
const path = require('path');
const { getUrlBasedPath, getUniqueUrlBasedPath } = require('../utils/url-path');

const DEFAULT_REPORT_DIR = path.join(__dirname, '..', 'playwright-report');
const testUrl = process.env.URL_AUDIT_URL || process.env.TEST_URL;

if (!testUrl) {
  // No URL provided, exit silently (default behavior)
  process.exit(0);
}

try {
  // Get a unique report path to ensure no collisions
  // This ensures each URL gets its own unique folder even if paths are similar
  const targetReportDir = getUniqueUrlBasedPath(testUrl, 'playwright-report', { checkExists: true });
  const targetReportPath = path.join(__dirname, '..', targetReportDir);

  // Check if source report exists
  if (!fs.existsSync(DEFAULT_REPORT_DIR)) {
    console.warn(`⚠️  HTML report directory not found: ${DEFAULT_REPORT_DIR}`);
    process.exit(0);
  }

  // Check if index.html exists
  const sourceIndex = path.join(DEFAULT_REPORT_DIR, 'index.html');
  if (!fs.existsSync(sourceIndex)) {
    console.warn(`⚠️  HTML report index.html not found: ${sourceIndex}`);
    process.exit(0);
  }

  // Verify target directory is unique (check if it already exists with different content)
  if (fs.existsSync(targetReportPath)) {
    const existingIndex = path.join(targetReportPath, 'index.html');
    if (fs.existsSync(existingIndex)) {
      // Directory exists, this is expected for same URL re-runs
      // The merge logic will handle preserving existing files
      console.log(`ℹ️  Report directory already exists: ${targetReportDir}`);
      console.log(`   Merging new report data (existing files preserved)`);
    }
  }

  // Create target directory structure
  fs.mkdirSync(targetReportPath, { recursive: true });
  
  // Verify directory was created successfully
  if (!fs.existsSync(targetReportPath)) {
    console.error(`❌ Failed to create report directory: ${targetReportPath}`);
    process.exit(1);
  }

  // Add timestamp to index.html filename to prevent overwriting
  // Format: index-YYYYMMDD-HHMMSS.html
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // YYYY-MM-DDTHH-MM-SS
  const targetIndex = path.join(targetReportPath, `index-${timestamp}.html`);
  fs.copyFileSync(sourceIndex, targetIndex);
  
  // Also copy as index.html (latest)
  const targetIndexLatest = path.join(targetReportPath, 'index.html');
  fs.copyFileSync(sourceIndex, targetIndexLatest);

  // Merge data directory instead of overwriting
  const sourceDataDir = path.join(DEFAULT_REPORT_DIR, 'data');
  const targetDataDir = path.join(targetReportPath, 'data');
  
  if (fs.existsSync(sourceDataDir)) {
    // Merge data directory (copy new files, don't overwrite existing ones)
    mergeDirectorySync(sourceDataDir, targetDataDir);
  }

  console.log(`✅ HTML report organized successfully`);
  console.log(`   URL: ${testUrl}`);
  console.log(`   Report directory: ${targetReportDir}`);
  console.log(`   Full path: ${targetReportPath}`);
  console.log(`   Source: ${DEFAULT_REPORT_DIR}`);
  
  // Verify report was saved correctly
  if (!fs.existsSync(targetIndexLatest)) {
    console.warn(`   ⚠️  Warning: index.html not found in target directory`);
  } else {
    const indexStats = fs.statSync(targetIndexLatest);
    console.log(`   ✅ Copied index.html (latest) (${(indexStats.size / 1024).toFixed(2)} KB)`);
    console.log(`   ✅ Also saved as: index-${timestamp}.html (timestamped copy)`);
  }
  
  if (fs.existsSync(targetDataDir)) {
    const dataFiles = fs.readdirSync(targetDataDir);
    console.log(`   ✅ Merged data/ directory (${dataFiles.length} file(s) total)`);
    console.log(`   Note: Existing files preserved, new files added with timestamps if conflicts exist`);
  }
  
  // Confirm unique directory
  console.log(`   ✓ Each URL has its own unique report directory (no overwriting)`);

  // Copy Lighthouse HTML reports from test-results to playwright-report
  const testResultsDir = getUrlBasedPath(testUrl, 'test-results');
  const testResultsPath = path.join(__dirname, '..', testResultsDir);
  
  if (fs.existsSync(testResultsPath)) {
    // Find all Lighthouse HTML reports in test-results directory
    const lighthouseReports = findLighthouseReports(testResultsPath);
    
    if (lighthouseReports.length > 0) {
      console.log(`\n📊 Found ${lighthouseReports.length} Lighthouse report(s)`);
      
      for (const report of lighthouseReports) {
        const reportFilename = path.basename(report);
        const targetLighthousePath = path.join(targetReportPath, reportFilename);
        
        // Copy Lighthouse report to playwright-report directory
        fs.copyFileSync(report, targetLighthousePath);
        
        const stats = fs.statSync(targetLighthousePath);
        console.log(`   ✅ Copied Lighthouse report: ${reportFilename} (${(stats.size / 1024).toFixed(2)} KB)`);
      }
    }
  }
} catch (error) {
  console.error(`\n${'='.repeat(70)}`);
  console.error(`❌ ERROR ORGANIZING HTML REPORT`);
  console.error(`${'='.repeat(70)}`);
  console.error(`   Error Type: ${error.name || 'Error'}`);
  console.error(`   Error Message: ${error.message}`);
  console.error(`   Stack Trace: ${error.stack || 'N/A'}`);
  console.error(`\n   Context:`);
  console.error(`   ${'─'.repeat(66)}`);
  console.error(`   Test URL: ${testUrl || 'Not provided'}`);
  console.error(`   Source Report Dir: ${DEFAULT_REPORT_DIR}`);
  console.error(`   Source Exists: ${fs.existsSync(DEFAULT_REPORT_DIR) ? 'Yes' : 'No'}`);
  if (testUrl) {
    try {
      const targetReportDir = getUrlBasedPath(testUrl, 'playwright-report');
      console.error(`   Target Report Dir: ${targetReportDir}`);
      console.error(`   Target Path: ${path.join(__dirname, '..', targetReportDir)}`);
    } catch (e) {
      console.error(`   Target Report Dir: (Error calculating: ${e.message})`);
    }
  }
  console.error(`\n   💡 Troubleshooting:`);
  console.error(`      1. Check if source report directory exists: ${DEFAULT_REPORT_DIR}`);
  console.error(`      2. Verify file system permissions`);
  console.error(`      3. Check if disk space is available`);
  console.error(`      4. Verify the test URL is valid: ${testUrl || 'Not provided'}`);
  console.error(`\n   Note: This error will not fail the test run.`);
  console.error(`${'='.repeat(70)}\n`);
  // Don't fail the build if report organization fails
  process.exit(0);
}

/**
 * Recursively copy directory (for backwards compatibility)
 */
function copyDirectorySync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDirectorySync(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

/**
 * Check if two files are identical by comparing their content
 */
function filesAreIdentical(file1, file2) {
  try {
    const stats1 = fs.statSync(file1);
    const stats2 = fs.statSync(file2);
    
    // Quick check: different sizes mean different files
    if (stats1.size !== stats2.size) {
      return false;
    }
    
    // If sizes are same, compare content (for small files)
    // For large files, we'll assume they're different if names match but we'll preserve both
    if (stats1.size < 1024 * 1024) { // Only compare if < 1MB
      const content1 = fs.readFileSync(file1);
      const content2 = fs.readFileSync(file2);
      return content1.equals(content2);
    }
    
    // For large files, assume different (will add timestamp)
    return false;
  } catch (error) {
    // If we can't compare, assume different
    return false;
  }
}

/**
 * Find all Lighthouse HTML reports in a directory (recursively)
 */
function findLighthouseReports(dir, basePath = '') {
  const reports = [];
  
  if (!fs.existsSync(dir)) {
    return reports;
  }
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subReports = findLighthouseReports(fullPath, path.join(basePath, entry.name));
        reports.push(...subReports);
      } else if (entry.isFile() && entry.name.startsWith('lighthouse-report') && entry.name.endsWith('.html')) {
        reports.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore permission errors
  }
  
  return reports;
}

/**
 * Merge directory (copy new files, preserve existing ones)
 * This prevents overwriting when organizing reports for different URLs or same URL multiple times
 */
function mergeDirectorySync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const entries = fs.readdirSync(source, { withFileTypes: true });
  let newFilesCount = 0;
  let skippedFilesCount = 0;
  let timestampedFilesCount = 0;

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      mergeDirectorySync(sourcePath, targetPath);
    } else {
      // Check if file already exists
      if (!fs.existsSync(targetPath)) {
        // File doesn't exist, copy it
        fs.copyFileSync(sourcePath, targetPath);
        newFilesCount++;
      } else {
        // File exists, check if it's identical
        if (filesAreIdentical(sourcePath, targetPath)) {
          // Files are identical, skip copying
          skippedFilesCount++;
        } else {
          // Files are different, add timestamp to preserve both
          const ext = path.extname(entry.name);
          const nameWithoutExt = path.basename(entry.name, ext);
          const timestamp = Date.now();
          const newTargetPath = path.join(target, `${nameWithoutExt}-${timestamp}${ext}`);
          fs.copyFileSync(sourcePath, newTargetPath);
          timestampedFilesCount++;
        }
      }
    }
  }
  
  // Log merge statistics if there were any decisions made
  if (newFilesCount > 0 || skippedFilesCount > 0 || timestampedFilesCount > 0) {
    // Only log if not the first copy (when target was empty)
    const targetEntries = fs.existsSync(target) ? fs.readdirSync(target, { withFileTypes: true }).length : 0;
    if (targetEntries > entries.length) {
      // This means we had existing files, so log the merge stats
      // (Logging is done at the caller level)
    }
  }
}

