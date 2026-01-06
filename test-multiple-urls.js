#!/usr/bin/env node

/**
 * Test Multiple URLs Helper Script
 * Usage: node test-multiple-urls.js <filepath> [--n8n]
 *    or: npm run test:multiple-urls -- <filepath> [--n8n]
 * 
 * Reads URLs from a file (one per line), validates them,
 * runs tests sequentially, and provides a summary.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { getUrlBasedPath, getUniqueUrlBasedPath } = require('./utils/url-path');

const args = process.argv.slice(2);
const filePath = args.find(arg => !arg.startsWith('--'));
const useN8n = args.includes('--n8n');

// Validate file path provided
if (!filePath) {
  console.error('Usage: node test-multiple-urls.js <filepath> [--n8n]');
  console.error('   or: npm run test:multiple-urls -- <filepath> [--n8n]');
  console.error('');
  console.error('Example:');
  console.error('  node test-multiple-urls.js urls.txt');
  console.error('  node test-multiple-urls.js urls.txt --n8n');
  process.exit(1);
}

// Validate file exists
if (!fs.existsSync(filePath)) {
  console.error(`Error: File not found: ${filePath}`);
  console.error('Please provide a valid file path containing URLs (one per line)');
  process.exit(1);
}

// Read and parse URLs from file
let urls = [];
try {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  urls = fileContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#')); // Skip empty lines and comments
} catch (error) {
  console.error(`Error reading file: ${filePath}`);
  console.error(`Error: ${error.message}`);
  process.exit(1);
}

// Validate URLs
if (urls.length === 0) {
  console.error(`Error: No valid URLs found in file: ${filePath}`);
  console.error('File must contain at least one URL (one per line)');
  process.exit(1);
}

const invalidUrls = [];
const validUrls = [];

urls.forEach((url, index) => {
  try {
    new URL(url);
    validUrls.push(url);
  } catch (error) {
    invalidUrls.push({ url, line: index + 1 });
  }
});

if (invalidUrls.length > 0) {
  console.error(`Error: Found ${invalidUrls.length} invalid URL(s) in file:`);
  invalidUrls.forEach(({ url, line }) => {
    console.error(`  Line ${line}: ${url}`);
  });
  console.error('\nPlease fix the invalid URLs and try again');
  process.exit(1);
}

console.log(`Found ${validUrls.length} valid URL(s) in file: ${filePath}\n`);

// Track results
const results = {
  total: validUrls.length,
  passed: [],
  failed: [],
  reportPaths: new Map(), // Track final HTML report directory path for each URL (after organizing)
  tempReportPaths: new Map(), // Track temp report directories (before organizing) - URL -> temp directory path
};

/**
 * Wait for test results file to be created
 * Returns true if file exists, false if timeout
 */
function waitForResultsFile(resultsFile, maxWaitMs = 10000) {
  const startTime = Date.now();
  const checkInterval = 100; // Check every 100ms
  
  return new Promise((resolve) => {
    const checkFile = () => {
      if (fs.existsSync(resultsFile)) {
        try {
          const stats = fs.statSync(resultsFile);
          if (stats.size > 0) {
            resolve(true);
            return;
          }
        } catch (error) {
          // File might be in the process of being written, continue waiting
        }
      }
      
      if (Date.now() - startTime >= maxWaitMs) {
        resolve(false);
        return;
      }
      
      setTimeout(checkFile, checkInterval);
    };
    
    checkFile();
  });
}

/**
 * Wait for blob report file to be created and stable
 * Returns true if file exists and is stable, false if timeout
 */
function waitForBlobFile(blobFile, maxWaitMs = 15000) {
  const startTime = Date.now();
  const checkInterval = 200; // Check every 200ms
  
  return new Promise((resolve) => {
    const checkFile = () => {
      if (fs.existsSync(blobFile)) {
        try {
          const stats = fs.statSync(blobFile);
          // Check if file has content (size > 0) and hasn't been modified recently (stable)
          if (stats.size > 0) {
            const timeSinceModified = Date.now() - stats.mtimeMs;
            // If file hasn't been modified in last 500ms, consider it stable
            if (timeSinceModified > 500) {
              resolve(true);
              return;
            }
          }
        } catch (error) {
          // File might be in the process of being written, continue waiting
        }
      }
      
      if (Date.now() - startTime >= maxWaitMs) {
        resolve(false);
        return;
      }
      
      setTimeout(checkFile, checkInterval);
    };
    
    checkFile();
  });
}

/**
 * Organize HTML report for a URL
 * Returns the report directory path if successful, null otherwise
 */
function organizeReport(url) {
  return new Promise((resolve) => {
    // Get a unique report path to ensure no collisions
    // This ensures each URL gets its own unique folder even if paths are similar
    const expectedReportPath = getUniqueUrlBasedPath(url, 'playwright-report', { checkExists: true });
    
    const organizeProcess = spawn('node', ['scripts/organize-html-report.js'], {
      env: {
        ...process.env,
        URL_AUDIT_URL: url,
        TEST_URL: url,
      },
      shell: true,
      cwd: __dirname,
    });

    let organizeStdout = '';
    let organizeStderr = '';

    organizeProcess.stdout.on('data', (data) => {
      organizeStdout += data.toString();
    });

    organizeProcess.stderr.on('data', (data) => {
      organizeStderr += data.toString();
    });

    organizeProcess.on('close', (code) => {
      if (code === 0) {
        // Verify report directory was created
        const fullReportPath = path.join(__dirname, expectedReportPath);
        if (fs.existsSync(fullReportPath)) {
          resolve(expectedReportPath);
        } else {
          console.warn(`⚠️  Report directory not found after organization: ${expectedReportPath}`);
          resolve(null);
        }
      } else {
        console.error(`\n⚠️  Error organizing report for ${url} (exit code: ${code})`);
        resolve(null);
      }
    });

    organizeProcess.on('error', (error) => {
      console.error(`\n⚠️  Error organizing report for ${url}: ${error.message}`);
      resolve(null);
    });
  });
}

/**
 * Send test results to n8n
 */
function sendToN8n(url) {
  return new Promise((resolve) => {
    const resultsDir = getUrlBasedPath(url, 'test-results');
    const resultsFile = path.join(__dirname, resultsDir, 'test-results.json');

    // Wait for results file
    waitForResultsFile(resultsFile, 10000).then((fileExists) => {
      if (!fileExists) {
        console.error(`\n⚠️  Test results file not found for ${url}`);
        resolve(1);
        return;
      }

      const n8nProcess = spawn('node', ['scripts/send-to-n8n.js'], {
        env: {
          ...process.env,
          TEST_URL: url,
          URL_AUDIT_URL: url,
        },
        shell: true,
        cwd: __dirname,
      });

      let stdout = '';
      let stderr = '';

      n8nProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      n8nProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      n8nProcess.on('close', (code) => {
        resolve(code);
      });

      n8nProcess.on('error', (error) => {
        console.error(`\n⚠️  Error sending to n8n for ${url}: ${error.message}`);
        resolve(1);
      });
    });
  });
}

/**
 * Run Playwright test for a single URL
 */
function runTestForUrl(url, index, total) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Testing URL ${index + 1}/${total}: ${url}`);
    console.log('='.repeat(70));

    const testProcess = spawn('npx', [
      'playwright', 
      'test', 
      'tests/url-audit.spec.ts',
      '--workers=1'  // Use 1 worker to run tests sequentially per URL (prevents conflicts with link extraction)
      // Note: HTML reporter outputs to default 'playwright-report' directory, we'll organize it after test completes
    ], {
      env: {
        ...process.env,
        URL_AUDIT_URL: url,
        USE_BLOB_REPORTER: 'false', // Use HTML reporter directly (no blob/zip files)
        CI: 'true', // Prevent Playwright from starting interactive HTML report server
      },
      stdio: 'inherit',
      shell: true,
      cwd: __dirname,
    });

    testProcess.on('close', async (code) => {
      const testExitCode = code;

      // HTML reporter outputs to default 'playwright-report' directory
      // Wait for HTML report to be generated (Playwright writes it asynchronously)
      // IMPORTANT: Playwright generates reports even when tests fail, but it may take longer
      console.log('   ⏳ Waiting for HTML report to be generated...');
      
      const defaultReportDir = path.join(__dirname, 'playwright-report');
      const defaultIndex = path.join(defaultReportDir, 'index.html');
      
      // Wait for HTML report to appear (check every 200ms)
      // Increase wait time significantly when tests fail - Playwright may take longer to write failed test reports
      const maxWaitMs = testExitCode === 0 ? 30000 : 60000; // 60 seconds for failed tests (Playwright needs more time)
      const checkInterval = 200;
      const startTime = Date.now();
      let reportReady = false;
      let retryCount = 0;
      const maxRetries = 5; // Increased retries for failed tests
      
      // Additional wait after process closes - Playwright may still be writing
      console.log('   ⏳ Waiting for Playwright to finish writing report...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds after process closes
      
      // Retry logic: if report not found, wait a bit longer and try again
      while (retryCount < maxRetries && !reportReady && (Date.now() - startTime) < maxWaitMs) {
        while (!reportReady && (Date.now() - startTime) < maxWaitMs) {
          if (fs.existsSync(defaultIndex)) {
            // Verify file is stable (not being written)
            try {
              const stats = fs.statSync(defaultIndex);
              if (stats.size > 0) {
                const timeSinceModified = Date.now() - stats.mtimeMs;
                // Wait longer for stability when tests fail - Playwright takes more time
                const stabilityDelay = testExitCode === 0 ? 1000 : 2000; // 2 seconds for failed tests
                if (timeSinceModified > stabilityDelay) {
                  // Also check if data directory exists
                  const dataDir = path.join(defaultReportDir, 'data');
                  if (fs.existsSync(dataDir)) {
                    // Verify data directory has files
                    const dataFiles = fs.readdirSync(dataDir);
                    if (dataFiles.length > 0) {
                      reportReady = true;
                      console.log(`   ✅ Report is ready (${(stats.size / 1024).toFixed(2)} KB, ${dataFiles.length} data files)`);
                      break;
                    } else {
                      console.log(`   ⏳ Report exists but data directory is empty, waiting...`);
                    }
                  } else {
                    console.log(`   ⏳ Report exists but data directory not found yet, waiting...`);
                  }
                } else {
                  console.log(`   ⏳ Report file is still being written (modified ${timeSinceModified}ms ago), waiting...`);
                }
              } else {
                console.log(`   ⏳ Report file exists but is empty, waiting...`);
              }
            } catch (error) {
              // File might be in the process of being written, continue waiting
              console.log(`   ⏳ Error checking report: ${error.message}, waiting...`);
            }
          } else {
            // Report doesn't exist yet
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            if (Math.floor(elapsed) % 5 === 0 && (Date.now() - startTime) % 5000 < checkInterval) {
              console.log(`   ⏳ Still waiting for report... (${elapsed}s elapsed)`);
            }
          }
          if (!reportReady) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
          }
        }
        
        // If still not found and we have retries left, wait a bit longer and retry
        if (!reportReady && retryCount < maxRetries - 1) {
          retryCount++;
          console.log(`   ⏳ HTML report not found yet, retrying (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
        } else {
          break;
        }
      }
      
      // Move entire playwright-report directory to temp location (Option 1: Move entire directory)
      // This prevents the next test from overwriting this report
      // IMPORTANT: Try to move even if reportReady is false - Playwright may have generated it
      const reportExists = fs.existsSync(defaultIndex);
      
      if (reportReady || reportExists) {
        if (!reportReady && reportExists) {
          console.log('   ⚠️  Report found but verification incomplete - attempting move anyway...');
          // Give it one more moment to stabilize
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('   📦 Moving HTML report to temp directory...');
        console.log(`   Source: ${defaultReportDir}`);
        
        try {
          // Create temp directory name based on URL index (unique per test run)
          // Format: playwright-report-temp-{index}
          const tempReportDir = `playwright-report-temp-${index}`;
          const tempReportPath = path.join(__dirname, tempReportDir);
          
          // Check if temp directory already exists (shouldn't happen, but handle it)
          if (fs.existsSync(tempReportPath)) {
            console.warn(`   ⚠️  Temp directory already exists: ${tempReportDir}`);
            console.warn(`   ⚠️  Removing existing temp directory...`);
            fs.rmSync(tempReportPath, { recursive: true, force: true });
          }
          
          // Verify source report exists
          if (!fs.existsSync(defaultIndex)) {
            console.error(`   ❌ Source index.html not found: ${defaultIndex}`);
            console.error(`   ❌ Cannot move report - it may not have been generated`);
            
            // List what's actually in the default directory
            if (fs.existsSync(defaultReportDir)) {
              const files = fs.readdirSync(defaultReportDir);
              console.error(`   Directory contents: ${files.join(', ')}`);
            }
          } else {
            // Get source file stats before moving
            const sourceStats = fs.statSync(defaultIndex);
            console.log(`   Source index.html size: ${(sourceStats.size / 1024).toFixed(2)} KB`);
            
            // Verify data directory exists
            const sourceDataDir = path.join(defaultReportDir, 'data');
            if (fs.existsSync(sourceDataDir)) {
              const dataFiles = fs.readdirSync(sourceDataDir);
              console.log(`   Source data directory: ${dataFiles.length} file(s)`);
            }
            
            // Move entire playwright-report directory to temp location
            // This preserves the complete report structure (index.html + data/ + any other files)
            fs.renameSync(defaultReportDir, tempReportPath);
            
            // Verify move succeeded
            const tempIndex = path.join(tempReportPath, 'index.html');
            if (fs.existsSync(tempIndex)) {
              const tempStats = fs.statSync(tempIndex);
              if (tempStats.size === sourceStats.size && tempStats.size > 0) {
                console.log(`   ✅ Moved report to temp directory: ${tempReportDir}`);
                console.log(`   ✅ Preserved index.html (${(tempStats.size / 1024).toFixed(2)} KB)`);
                
                // Verify data directory was moved
                const tempDataDir = path.join(tempReportPath, 'data');
                if (fs.existsSync(tempDataDir)) {
                  const tempDataFiles = fs.readdirSync(tempDataDir);
                  console.log(`   ✅ Preserved data directory (${tempDataFiles.length} file(s))`);
                }
                
                // Store temp path for later organization
                results.tempReportPaths.set(url, tempReportDir);
                console.log(`   ✅ Temp report stored: ${tempReportDir}`);
              } else {
                throw new Error(`Move verification failed: size mismatch (source: ${sourceStats.size}, temp: ${tempStats.size})`);
              }
            } else {
              throw new Error('Move verification failed: temp index.html not found');
            }
            
            // Recreate empty playwright-report directory for next test
            // This ensures the next test can write to the default location
            try {
              fs.mkdirSync(defaultReportDir, { recursive: true });
              console.log(`   ✅ Recreated empty playwright-report directory for next test`);
            } catch (error) {
              console.warn(`   ⚠️  Could not recreate default report directory: ${error.message}`);
              console.warn(`   ⚠️  Next test may fail to write report - manual cleanup may be needed`);
            }
          }
        } catch (error) {
          console.error(`   ❌ Error moving report: ${error.message}`);
          console.error(`   Stack: ${error.stack}`);
          console.warn(`   ⚠️  Report may be lost if next test overwrites default directory`);
          
          // Try to ensure default directory exists for next test
          try {
            if (!fs.existsSync(defaultReportDir)) {
              fs.mkdirSync(defaultReportDir, { recursive: true });
            }
          } catch (mkdirError) {
            console.error(`   ❌ Could not recreate default directory: ${mkdirError.message}`);
          }
        }
      } else {
        console.error(`   ❌ HTML report not found after waiting ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
        console.error(`   ⚠️  Attempting fallback: check if JSON report exists to generate HTML...`);
        
        // Fallback: Check if JSON report exists (JSON reports are always generated, even for failed tests)
        const resultsDir = getUrlBasedPath(url, 'test-results');
        const jsonReportPath = path.join(__dirname, resultsDir, 'test-results.json');
        
        if (fs.existsSync(jsonReportPath)) {
          console.log(`   📋 JSON report found, but HTML report generation from JSON is complex`);
          console.log(`   ⚠️  HTML report may not be available for this URL`);
          console.log(`   ℹ️  JSON report available at: ${jsonReportPath}`);
        } else {
          console.error(`   ❌ JSON report also not found: ${jsonReportPath}`);
          console.error(`   ❌ No reports available for this URL`);
        }
        
        if (fs.existsSync(defaultReportDir)) {
          const files = fs.readdirSync(defaultReportDir);
          console.warn(`   ⚠️  Default report directory exists but index.html not found`);
          console.warn(`   ⚠️  Directory contents: ${files.join(', ')}`);
        } else {
          console.error(`   ❌ Default report directory does not exist`);
        }
      }

      // Send to n8n if enabled (wait for results file first)
      if (useN8n) {
        const resultsDir = getUrlBasedPath(url, 'test-results');
        const resultsFile = path.join(__dirname, resultsDir, 'test-results.json');
        await waitForResultsFile(resultsFile, 10000);
        await sendToN8n(url);
      }

      // Track result
      if (testExitCode === 0) {
        results.passed.push({ url, exitCode: testExitCode });
        console.log(`✅ URL ${index + 1}/${total} completed successfully`);
      } else {
        results.failed.push({ url, exitCode: testExitCode });
        console.log(`❌ URL ${index + 1}/${total} completed with errors (Exit code: ${testExitCode})`);
      }

      resolve(testExitCode);
    });

    testProcess.on('error', (error) => {
      console.error(`\n❌ Error running test for ${url}: ${error.message}`);
      results.failed.push({ url, exitCode: -1, error: error.message });
      resolve(-1);
    });
  });
}

/**
 * Organize all temp report directories to their final URL-based locations
 * This function moves temp directories (playwright-report-temp-{index}) to their final
 * URL-based directories (playwright-report/{domain}/{path}/)
 */
async function organizeTempReports(validUrls) {
  console.log('\n' + '='.repeat(70));
  console.log('Organizing Temp Reports to Final Locations');
  console.log('='.repeat(70));
  
  if (results.tempReportPaths.size === 0) {
    console.log('   ℹ️  No temp reports found to organize');
    return;
  }
  
  console.log(`   Found ${results.tempReportPaths.size} temp report(s) to organize\n`);
  
  let organizedCount = 0;
  let failedCount = 0;
  
  // Process each URL's temp report
  for (let i = 0; i < validUrls.length; i++) {
    const url = validUrls[i];
    const tempReportDir = results.tempReportPaths.get(url);
    
    if (!tempReportDir) {
      console.log(`   ⚠️  No temp report found for URL ${i + 1}/${validUrls.length}: ${url}`);
      continue;
    }
    
    const tempReportPath = path.join(__dirname, tempReportDir);
    
    // Verify temp directory exists
    if (!fs.existsSync(tempReportPath)) {
      console.error(`   ❌ Temp report directory not found: ${tempReportDir}`);
      console.error(`   ❌ URL: ${url}`);
      failedCount++;
      continue;
    }
    
    // Verify temp report has index.html
    const tempIndex = path.join(tempReportPath, 'index.html');
    if (!fs.existsSync(tempIndex)) {
      console.error(`   ❌ Temp report missing index.html: ${tempReportDir}`);
      console.error(`   ❌ URL: ${url}`);
      failedCount++;
      continue;
    }
    
    try {
      // Get unique target path for this URL
      const targetReportDir = getUniqueUrlBasedPath(url, 'playwright-report', { checkExists: true });
      const targetReportPath = path.join(__dirname, targetReportDir);
      
      console.log(`   📦 Organizing report ${i + 1}/${validUrls.length}: ${url}`);
      console.log(`      From: ${tempReportDir}`);
      console.log(`      To:   ${targetReportDir}`);
      
      // Ensure target directory parent exists
      const targetParent = path.dirname(targetReportPath);
      if (!fs.existsSync(targetParent)) {
        fs.mkdirSync(targetParent, { recursive: true });
      }
      
      // If target directory already exists, remove it first (shouldn't happen with getUniqueUrlBasedPath, but handle it)
      if (fs.existsSync(targetReportPath)) {
        console.warn(`      ⚠️  Target directory already exists, removing...`);
        fs.rmSync(targetReportPath, { recursive: true, force: true });
      }
      
      // Move temp directory to final location
      fs.renameSync(tempReportPath, targetReportPath);
      
      // Verify move succeeded
      const finalIndex = path.join(targetReportPath, 'index.html');
      if (fs.existsSync(finalIndex)) {
        const finalStats = fs.statSync(finalIndex);
        if (finalStats.size > 0) {
          // Store final path
          results.reportPaths.set(url, targetReportDir);
          organizedCount++;
          console.log(`      ✅ Organized successfully (${(finalStats.size / 1024).toFixed(2)} KB)`);
        } else {
          throw new Error('Final index.html is empty');
        }
      } else {
        throw new Error('Final index.html not found after move');
      }
    } catch (error) {
      console.error(`      ❌ Error organizing report: ${error.message}`);
      console.error(`      ❌ Stack: ${error.stack}`);
      failedCount++;
      
      // Try to restore temp directory if move failed
      if (!fs.existsSync(tempReportPath) && fs.existsSync(targetReportPath)) {
        try {
          fs.renameSync(targetReportPath, tempReportPath);
          console.warn(`      ⚠️  Restored temp directory after failed move`);
        } catch (restoreError) {
          console.error(`      ❌ Could not restore temp directory: ${restoreError.message}`);
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`Organization Summary:`);
  console.log(`   ✅ Organized: ${organizedCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);
  console.log(`   Total: ${results.tempReportPaths.size}`);
  console.log('='.repeat(70));
}

/**
 * Wait for file to be stable (not being written)
 * Returns true if file exists and is stable, false if timeout
 * A file is considered stable when its size hasn't changed for at least 1 second
 */
async function waitForFileStable(filePath, maxWaitMs = 3000, checkInterval = 200) {
  const startTime = Date.now();
  let lastSize = -1;
  let stableSince = null;
  const stabilityDuration = 1000; // File must be stable for 1 second
  
  while ((Date.now() - startTime) < maxWaitMs) {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const currentSize = stats.size;
        
        if (currentSize === lastSize && lastSize > 0) {
          // Size hasn't changed
          if (stableSince === null) {
            stableSince = Date.now();
          } else if (Date.now() - stableSince >= stabilityDuration) {
            // File has been stable for required duration
            return true;
          }
        } else {
          // Size changed, reset stability timer
          lastSize = currentSize;
          stableSince = null;
        }
      } else {
        // File doesn't exist yet
        stableSince = null;
      }
    } catch (error) {
      // File might be in the process of being written, continue waiting
      stableSince = null;
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  // Timeout - check if file exists at least
  return fs.existsSync(filePath) && lastSize > 0;
}

/**
 * Merge blob reports into HTML reports organized by URL
 * Runs merges sequentially to avoid conflicts with default playwright-report directory
 */
async function mergeBlobReports(validUrls) {
  console.log('\n' + '='.repeat(70));
  console.log('Merging Blob Reports to HTML');
  console.log('='.repeat(70));

  if (results.blobPaths.size === 0) {
    console.log('⚠️  No blob reports found to merge');
    return 0;
  }

  console.log(`Found ${results.blobPaths.size} blob report(s) to merge\n`);

  // Merge each blob report individually to its own HTML report directory
  // Run sequentially to avoid conflicts with default playwright-report directory
  let mergeCount = 0;
  let successCount = 0;

  for (const url of validUrls) {
    const blobPath = results.blobPaths.get(url);
    if (!blobPath) {
      console.warn(`⚠️  No blob report found for: ${url}`);
      
      // Fallback: Check if JSON report exists and log it
      const resultsDir = getUrlBasedPath(url, 'test-results');
      const jsonReportPath = path.join(__dirname, resultsDir, 'test-results.json');
      if (fs.existsSync(jsonReportPath)) {
        console.log(`   ℹ️  JSON report found at: ${jsonReportPath}`);
        console.log(`   ℹ️  Note: HTML report cannot be generated without blob report`);
      }
      continue;
    }

    // Check if blob file exists
    // blobPath is already a full path
    // Look for report.zip or report-*.zip files
    let blobFile = path.join(blobPath, 'report.zip');
    if (!fs.existsSync(blobFile)) {
      // Try to find report-*.zip file
      const files = fs.existsSync(blobPath) ? fs.readdirSync(blobPath) : [];
      const reportFile = files.find(f => f.startsWith('report-') && f.endsWith('.zip'));
      if (reportFile) {
        blobFile = path.join(blobPath, reportFile);
      } else {
        console.warn(`⚠️  Blob file not found in: ${blobPath}`);
        console.warn(`⚠️  Available files: ${files.join(', ') || 'none'}`);
        
        // Fallback: Check for JSON report
        const resultsDir = getUrlBasedPath(url, 'test-results');
        const jsonReportPath = path.join(__dirname, resultsDir, 'test-results.json');
        if (fs.existsSync(jsonReportPath)) {
          console.log(`   ℹ️  JSON report found, but blob is required for HTML merge`);
        }
        continue;
      }
    }

    // Get target HTML report directory for this URL
    const htmlReportDir = getUrlBasedPath(url, 'playwright-report');
    const htmlReportPath = path.join(__dirname, htmlReportDir);
    
    // Create HTML report directory
    if (!fs.existsSync(htmlReportPath)) {
      fs.mkdirSync(htmlReportPath, { recursive: true });
    }

    mergeCount++;
    
    const mergeCode = await new Promise((mergeResolve) => {
      console.log(`Merging blob for: ${url}`);
      console.log(`   Blob directory: ${blobPath}`);
      console.log(`   Blob file: ${blobFile}`);
      console.log(`   HTML: ${htmlReportDir}`);

      // Verify blob file exists before attempting merge
      if (!fs.existsSync(blobFile)) {
        console.error(`   ❌ Blob file does not exist: ${blobFile}`);
        mergeResolve(1);
        return;
      }

      // Merge blob to HTML report
      // merge-reports expects a directory containing blob files
      // Note: merge-reports always outputs to playwright-report by default, we'll move it after
      let mergeStdout = '';
      let mergeStderr = '';
      
      // Use absolute path - exec handles Windows paths with spaces when properly quoted
      // Use JSON.stringify to properly escape the path for the shell
      const quotedBlobPath = JSON.stringify(blobPath);
      
      // Use exec for better Windows compatibility with shell commands
      const mergeCommand = `npx playwright merge-reports --reporter=html ${quotedBlobPath}`;
      
      console.log(`   Running merge command for blob directory: ${blobPath}`);
      
      const mergeProcess = exec(mergeCommand, {
        env: {
          ...process.env,
        },
        cwd: __dirname,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      mergeProcess.stdout.on('data', (data) => {
        const output = data.toString();
        mergeStdout += output;
        process.stdout.write(output); // Still show output in real-time
      });

      mergeProcess.stderr.on('data', (data) => {
        const output = data.toString();
        mergeStderr += output;
        process.stderr.write(output); // Still show errors in real-time
      });

      mergeProcess.on('close', async (code) => {
        if (code === 0) {
          // Wait for file system to stabilize after merge completes
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if report was created in default playwright-report directory
          const defaultReportDir = path.join(__dirname, 'playwright-report');
          const defaultIndex = path.join(defaultReportDir, 'index.html');
          
          if (fs.existsSync(defaultIndex)) {
            // Wait for file to be stable before moving
            console.log(`   ⏳ Verifying report file is stable...`);
            const isStable = await waitForFileStable(defaultIndex, 3000, 200);
            
            if (!isStable) {
              console.warn(`   ⚠️  Report file may still be writing, proceeding anyway...`);
            }
            
            // List all files in playwright-report before moving
            let allFiles = [];
            try {
              const entries = fs.readdirSync(defaultReportDir, { withFileTypes: true });
              allFiles = entries.map(entry => ({
                name: entry.name,
                isDirectory: entry.isDirectory(),
                path: path.join(defaultReportDir, entry.name)
              }));
              console.log(`   📁 Found ${allFiles.length} items in report directory`);
            } catch (error) {
              console.warn(`   ⚠️  Could not list report directory contents: ${error.message}`);
            }
            
            // Move the report to URL-specific directory
            try {
              // Copy report files to URL-specific directory
              if (fs.existsSync(htmlReportPath)) {
                // Remove existing report if any
                fs.rmSync(htmlReportPath, { recursive: true, force: true });
              }
              fs.mkdirSync(htmlReportPath, { recursive: true });
              
              // Copy entire directory recursively (not just index.html and data/)
              // This ensures all files Playwright generates are copied
              try {
                fs.cpSync(defaultReportDir, htmlReportPath, { recursive: true });
                console.log(`   📋 Copied entire report directory`);
              } catch (cpError) {
                // Fallback: copy files individually if cpSync fails
                console.warn(`   ⚠️  Recursive copy failed, copying files individually: ${cpError.message}`);
                
                // Copy index.html
                fs.copyFileSync(defaultIndex, path.join(htmlReportPath, 'index.html'));
                
                // Copy all other files and directories
                for (const item of allFiles) {
                  try {
                    const sourcePath = item.path;
                    const targetPath = path.join(htmlReportPath, item.name);
                    
                    if (item.isDirectory) {
                      fs.cpSync(sourcePath, targetPath, { recursive: true });
                    } else {
                      fs.copyFileSync(sourcePath, targetPath);
                    }
                  } catch (itemError) {
                    console.warn(`   ⚠️  Could not copy ${item.name}: ${itemError.message}`);
                  }
                }
              }
              
              // Verify copy succeeded by checking for index.html in target
              const targetIndex = path.join(htmlReportPath, 'index.html');
              if (fs.existsSync(targetIndex)) {
                const targetStats = fs.statSync(targetIndex);
                const sourceStats = fs.statSync(defaultIndex);
                
                if (targetStats.size === sourceStats.size && targetStats.size > 0) {
                  // Copy verified successful - now safe to delete default directory
                  fs.rmSync(defaultReportDir, { recursive: true, force: true });
                  
                  results.reportPaths.set(url, htmlReportDir);
                  console.log(`   ✅ HTML report generated: ${htmlReportDir}\n`);
                  successCount++;
                } else {
                  console.error(`   ❌ Copy verification failed: size mismatch (source: ${sourceStats.size}, target: ${targetStats.size})\n`);
                  // Don't delete default directory if copy failed
                  console.warn(`   ⚠️  Keeping default report directory due to copy failure\n`);
                }
              } else {
                console.error(`   ❌ Copy verification failed: target index.html not found\n`);
                // Don't delete default directory if copy failed
                console.warn(`   ⚠️  Keeping default report directory due to copy failure\n`);
              }
            } catch (error) {
              console.error(`   ❌ Error moving report: ${error.message}\n`);
              // Don't delete default directory if move failed
              console.warn(`   ⚠️  Keeping default report directory due to error\n`);
            }
          } else {
            console.warn(`   ⚠️  HTML report not found at: ${defaultReportDir}\n`);
          }
        } else {
          console.error(`   ❌ Failed to merge blob report (exit code: ${code})\n`);
          if (mergeStderr) {
            console.error(`   Error details: ${mergeStderr}\n`);
          }
          if (mergeStdout) {
            console.error(`   Output: ${mergeStdout}\n`);
          }
        }
        mergeResolve(code);
      });

      mergeProcess.on('error', (error) => {
        console.error(`   ❌ Error merging blob report: ${error.message}\n`);
        if (mergeStderr) {
          console.error(`   Error details: ${mergeStderr}\n`);
        }
        mergeResolve(1);
      });
    });
  }

  console.log('='.repeat(70));
  console.log(`Merge Summary: ${successCount}/${mergeCount} reports merged successfully`);
  
  // Detailed summary
  if (successCount < mergeCount) {
    const failedCount = mergeCount - successCount;
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    
    // List which URLs succeeded and which failed
    const successfulUrls = [];
    const failedUrls = [];
    
    for (const url of validUrls) {
      if (results.reportPaths.has(url)) {
        successfulUrls.push(url);
      } else if (results.blobPaths.has(url)) {
        failedUrls.push(url);
      }
    }
    
    if (successfulUrls.length > 0) {
      console.log(`\n   ✅ Successfully merged reports for:`);
      successfulUrls.forEach(url => {
        const reportPath = results.reportPaths.get(url);
        console.log(`      - ${url}`);
        console.log(`        → ${reportPath}/index.html`);
      });
    }
    
    if (failedUrls.length > 0) {
      console.log(`\n   ❌ Failed to merge reports for:`);
      failedUrls.forEach(url => {
        console.log(`      - ${url}`);
        const resultsDir = getUrlBasedPath(url, 'test-results');
        const jsonReportPath = path.join(__dirname, resultsDir, 'test-results.json');
        if (fs.existsSync(jsonReportPath)) {
          console.log(`        ℹ️  JSON report available: ${jsonReportPath}`);
        }
      });
    }
  } else {
    console.log(`   ✅ All reports merged successfully!`);
  }
  
  console.log('='.repeat(70));
  return successCount === mergeCount ? 0 : 1;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Generate consolidated index page for multiple URL testing
 */
function generateConsolidatedIndex(results, validUrls) {
  const reportDir = path.join(__dirname, 'playwright-report');
  
  // Create report directory if it doesn't exist
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Create a map of URLs to their status
  const urlStatusMap = new Map();
  results.passed.forEach(({ url }) => {
    urlStatusMap.set(url, { status: 'passed', exitCode: 0 });
  });
  results.failed.forEach(({ url, exitCode, error }) => {
    urlStatusMap.set(url, { status: 'failed', exitCode, error });
  });

  // Build URL list in order, with status
  const urlList = validUrls.map(url => {
    const statusInfo = urlStatusMap.get(url) || { status: 'unknown', exitCode: -1 };
    
    // Use the actual merged report path from results.reportPaths
    let reportPath = results.reportPaths.get(url);
    
    // Fallback to generated path if not in results (shouldn't happen, but safety check)
    if (!reportPath) {
      reportPath = getUrlBasedPath(url, 'playwright-report');
    }
    
    // Verify report exists
    const fullReportPath = path.join(__dirname, reportPath);
    const reportIndexPath = path.join(fullReportPath, 'index.html');
    const reportExists = fs.existsSync(reportIndexPath);
    
    // Convert to relative path from playwright-report/
    // reportPath is already relative (e.g., "playwright-report/domain/path")
    // We need to get the relative path from playwright-report/ to the report directory
    const relativePath = path.relative(reportDir, fullReportPath);
    // Normalize path separators for web (use forward slashes)
    const webPath = relativePath.replace(/\\/g, '/');
    
    // Ensure webPath doesn't start with ../ (shouldn't happen, but safety check)
    if (webPath.startsWith('../')) {
      console.warn(`   ⚠️  Warning: Unexpected relative path for ${url}: ${webPath}`);
    }
    
    return {
      url,
      status: statusInfo.status,
      exitCode: statusInfo.exitCode,
      error: statusInfo.error,
      reportPath: webPath,
      reportExists: reportExists,
    };
  });

  // Generate HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multiple URL Test Reports - Playwright</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        header p {
            opacity: 0.9;
            font-size: 1.1em;
        }
        .content {
            padding: 40px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-card .number {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
        }
        .stat-card.passed .number {
            color: #28a745;
        }
        .stat-card.failed .number {
            color: #dc3545;
        }
        .stat-card .label {
            color: #666;
            margin-top: 5px;
        }
        .reports-section h2 {
            margin-bottom: 20px;
            color: #333;
            font-size: 1.8em;
        }
        .reports-list {
            display: grid;
            gap: 15px;
        }
        .report-item {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            transition: all 0.3s ease;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .report-item.passed {
            border-left: 4px solid #28a745;
        }
        .report-item.failed {
            border-left: 4px solid #dc3545;
        }
        .report-item:hover {
            border-color: #667eea;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
            transform: translateY(-2px);
        }
        .report-info {
            flex: 1;
        }
        .report-url {
            font-size: 1.1em;
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
            word-break: break-all;
        }
        .report-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
            margin-right: 10px;
        }
        .report-status.passed {
            background: #d4edda;
            color: #155724;
        }
        .report-status.failed {
            background: #f8d7da;
            color: #721c24;
        }
        .report-path {
            color: #666;
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
            margin-top: 5px;
        }
        .report-error {
            color: #dc3545;
            font-size: 0.85em;
            margin-top: 5px;
            font-style: italic;
        }
        .report-link {
            background: #667eea;
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            transition: background 0.3s ease;
            white-space: nowrap;
            margin-left: 20px;
        }
        .report-link:hover {
            background: #5568d3;
        }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }
        .empty-state p {
            font-size: 1.1em;
            margin-top: 10px;
        }
        footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            border-top: 1px solid #e9ecef;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎭 Multiple URL Test Reports</h1>
            <p>Comprehensive test results for ${results.total} URL(s)</p>
        </header>
        <div class="content">
            <div class="stats">
                <div class="stat-card">
                    <div class="number">${results.total}</div>
                    <div class="label">Total URLs</div>
                </div>
                <div class="stat-card passed">
                    <div class="number">${results.passed.length}</div>
                    <div class="label">Passed</div>
                </div>
                <div class="stat-card failed">
                    <div class="number">${results.failed.length}</div>
                    <div class="label">Failed</div>
                </div>
            </div>
            
            <div class="reports-section">
                <h2>Test Results</h2>
                ${urlList.length === 0 
                  ? '<div class="empty-state"><h3>No URLs tested</h3><p>Run tests to generate reports</p></div>'
                  : `<div class="reports-list">
                      ${urlList.map(item => {
                        const statusClass = item.status === 'passed' ? 'passed' : 'failed';
                        const statusText = item.status === 'passed' ? '✅ Passed' : '❌ Failed';
                        const reportUrl = item.reportPath ? `${item.reportPath}/index.html` : 'index.html';
                        return `
                        <div class="report-item ${statusClass}">
                            <div class="report-info">
                                <div class="report-url">${escapeHtml(item.url)}</div>
                                <div>
                                    <span class="report-status ${statusClass}">${statusText}</span>
                                    ${item.status === 'failed' && item.exitCode !== undefined ? `<span style="color: #666; font-size: 0.85em;">Exit code: ${item.exitCode}</span>` : ''}
                                </div>
                                ${item.error ? `<div class="report-error">Error: ${escapeHtml(item.error)}</div>` : ''}
                                <div class="report-path">Report: ${escapeHtml(item.reportPath || 'default')}</div>
                                ${!item.reportExists ? `<div class="report-error" style="margin-top: 5px;">⚠️ Report file not found</div>` : ''}
                            </div>
                            ${item.reportExists ? `<a href="${escapeHtml(reportUrl)}" class="report-link">View Report →</a>` : `<span class="report-link" style="opacity: 0.5; cursor: not-allowed;">Report Not Available</span>`}
                        </div>`;
                      }).join('')}
                    </div>`
                }
            </div>
        </div>
        <footer>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </footer>
    </div>
</body>
</html>`;

  // Write HTML to file
  const indexPath = path.join(reportDir, 'index.html');
  fs.writeFileSync(indexPath, html, 'utf-8');
  
  // Verify all report links are accessible
  const accessibleReports = urlList.filter(item => item.reportExists).length;
  const totalReports = urlList.length;
  
  console.log(`\n✅ Consolidated index page generated: ${indexPath}`);
  console.log(`   📊 Reports accessible: ${accessibleReports}/${totalReports}`);
  
  if (accessibleReports < totalReports) {
    console.log(`   ⚠️  Warning: ${totalReports - accessibleReports} report(s) not found`);
    urlList.forEach(item => {
      if (!item.reportExists) {
        console.log(`      - ${item.url}: ${item.reportPath || 'path not set'}`);
      }
    });
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log(`Starting tests for ${validUrls.length} URL(s)...`);
    if (useN8n) {
      console.log('n8n integration: ENABLED\n');
    } else {
      console.log('n8n integration: DISABLED\n');
    }

    // Run tests sequentially
    for (let i = 0; i < validUrls.length; i++) {
      const url = validUrls[i];
      await runTestForUrl(url, i, validUrls.length);
    }

    // Organize all temp reports to their final URL-based locations
    await organizeTempReports(validUrls);

    // Display summary
    console.log('\n' + '='.repeat(70));
    console.log('Multiple URL Test Results');
    console.log('='.repeat(70));
    console.log(`Total URLs: ${results.total}`);
    console.log(`Passed: ${results.passed.length}`);
    console.log(`Failed: ${results.failed.length}`);

    if (results.failed.length > 0) {
      console.log('\nFailed URLs:');
      results.failed.forEach(({ url, exitCode, error }) => {
        if (error) {
          console.log(`  - ${url} (Error: ${error})`);
        } else {
          console.log(`  - ${url} (Exit code: ${exitCode})`);
        }
      });
    }

    if (results.passed.length > 0 && results.failed.length === 0) {
      console.log('\n✅ All URLs passed!');
    }

    console.log('='.repeat(70));

    // Reports have been organized after all tests completed
    console.log('\n📋 HTML reports have been organized to URL-based directories');

    // Display report locations summary
    if (results.reportPaths.size > 0) {
      console.log('\n📁 Report Locations:');
      console.log('='.repeat(70));
      validUrls.forEach((url, index) => {
        const reportPath = results.reportPaths.get(url);
        if (reportPath) {
          console.log(`   ${index + 1}. ${url}`);
          console.log(`      → ${reportPath}/index.html`);
        } else {
          console.log(`   ${index + 1}. ${url}`);
          console.log(`      ⚠️  Report path not found`);
        }
      });
      console.log('='.repeat(70));
      console.log(`\n✅ All reports are saved in separate directories (no overwriting)`);
      console.log(`   Each URL has its own unique report directory`);
      console.log(`   Total reports organized: ${results.reportPaths.size}/${results.total}`);
    }

    // Generate consolidated index page
    generateConsolidatedIndex(results, validUrls);

    // Start report server to view reports
    console.log('\n📊 Starting HTML report server...');
    console.log('   Reports are organized by URL in: playwright-report/');
    console.log('   Consolidated index available at: playwright-report/index.html');
    
    const serveReportsProcess = spawn('node', ['scripts/serve-reports.js'], {
      stdio: 'inherit',
      shell: true,
      cwd: __dirname,
    });

    serveReportsProcess.on('error', (error) => {
      console.error(`\n⚠️  Could not start report server: ${error.message}`);
      console.error('   You can manually start it with: npm run serve:reports');
      const exitCode = results.failed.length > 0 ? 1 : 0;
      process.exit(exitCode);
    });

    // Don't exit - let the server run
    // User can press Ctrl+C to stop the server
  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ FATAL ERROR');
    console.error('='.repeat(70));
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error('='.repeat(70));
    process.exit(1);
  }
}

main();

