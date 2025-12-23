#!/usr/bin/env node

/**
 * Send Playwright test results to n8n webhook
 * This script reads test-results.json and sends it to n8n webhook endpoint
 * 
 * Usage: node scripts/send-to-n8n.js
 * 
 * Environment variables:
 * - N8N_WEBHOOK_URL: Custom n8n webhook URL (default: http://localhost:5678/webhook-test/playwright-results)
 * - N8N_WEBHOOK_METHOD: HTTP method to use - GET or POST (default: POST - recommended for large payloads)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Configuration
// Note: Use /webhook/ for production (activated workflows), /webhook-test/ for testing
const DEFAULT_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/playwright-results';
// POST is recommended for large payloads (test results can be 30KB+)
// GET has URL length limitations and may fail with large data (HTTP 431 error)
const WEBHOOK_METHOD = process.env.N8N_WEBHOOK_METHOD || 'POST'; // GET or POST (POST recommended)

// Get URL-based path for test results file
const { getUrlBasedPath } = require('../utils/url-path');
const testUrl = process.env.TEST_URL || process.env.URL_AUDIT_URL;
const resultsDir = testUrl ? getUrlBasedPath(testUrl, 'test-results') : 'test-results';
const resultsDirPath = path.join(__dirname, '..', resultsDir);

// Find the most recent test-results JSON file (with or without timestamp)
function findLatestResultsFile() {
  if (!fs.existsSync(resultsDirPath)) {
    return null;
  }
  
  const files = fs.readdirSync(resultsDirPath);
  const jsonFiles = files.filter(f => f.startsWith('test-results') && f.endsWith('.json'));
  
  if (jsonFiles.length === 0) {
    return null;
  }
  
  // Sort by modification time, most recent first
  const jsonFilesWithStats = jsonFiles.map(f => ({
    name: f,
    path: path.join(resultsDirPath, f),
    mtime: fs.statSync(path.join(resultsDirPath, f)).mtime.getTime()
  })).sort((a, b) => b.mtime - a.mtime);
  
  return jsonFilesWithStats[0].path;
}

const RESULTS_FILE = findLatestResultsFile() || path.join(resultsDirPath, 'test-results.json');

/**
 * Parse webhook URL to extract protocol, hostname, port, and path
 */
function parseWebhookUrl(url) {
  try {
    const urlObj = new URL(url);
    return {
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
    };
  } catch (error) {
    console.error(`Invalid webhook URL: ${url}`);
    console.error('Expected format: http://localhost:5678/webhook/playwright-results');
    process.exit(1);
  }
}

/**
 * Send data to n8n webhook
 */
function sendToN8n(data, webhookUrl, method = 'POST') {
  return new Promise((resolve, reject) => {
    const urlInfo = parseWebhookUrl(webhookUrl);
    const isHttps = urlInfo.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const jsonData = JSON.stringify(data);
    let path = urlInfo.path;
    const headers = {};
    
    if (method === 'GET') {
      // For GET, encode JSON as query parameter
      const encodedData = encodeURIComponent(jsonData);
      path = `${urlInfo.path}?data=${encodedData}`;
    } else {
      // For POST, send JSON in body
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(jsonData);
    }
    
    const options = {
      hostname: urlInfo.hostname,
      port: urlInfo.port,
      path: path,
      method: method,
      headers: headers,
      timeout: 6000, // 6 seconds timeout for HTTP request
    };

    const req = httpModule.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk.toString();
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Successfully sent test results to n8n`);
          console.log(`   Status: ${res.statusCode}`);
          if (responseData) {
            console.log(`   Response: ${responseData}`);
          }
          resolve(responseData);
        } else {
          // HTTP error response (status code >= 300 or < 200)
          let errorMessage = `HTTP ${res.statusCode} Error: n8n returned an error status`;
          
          // Try to parse response for more details
          let parsedResponse = null;
          try {
            if (responseData) {
              parsedResponse = JSON.parse(responseData);
              if (parsedResponse.message) {
                errorMessage += ` - ${parsedResponse.message}`;
              }
            }
          } catch (e) {
          // Not JSON, use raw response (preserve full response to avoid truncating URLs)
          if (responseData) {
            errorMessage += ` - ${responseData}`;
          }
          }
          
          // Add status-specific guidance
          if (res.statusCode === 404) {
            errorMessage += `\n\n   🔍 TROUBLESHOOTING (404 - Not Found):`;
            if (webhookUrl.includes('/webhook-test/')) {
              errorMessage += `\n      1. Open your workflow in n8n`;
              errorMessage += `\n      2. Click "Execute Workflow" button (webhook-test requires manual activation)`;
              errorMessage += `\n      3. Try again immediately after clicking`;
            } else {
              errorMessage += `\n      1. Open your workflow in n8n`;
              errorMessage += `\n      2. Toggle the "Active" switch (top-right) to ON (green indicator)`;
              errorMessage += `\n      3. Verify the webhook path is exactly: playwright-results`;
              errorMessage += `\n      4. Check HTTP method is set to: ${method}`;
            }
          } else if (res.statusCode === 500) {
            errorMessage += `\n\n   🔍 TROUBLESHOOTING (500 - Internal Server Error):`;
            if (responseData && responseData.includes('Unused Respond to Webhook')) {
              errorMessage += `\n      Issue: "Respond to Webhook" node is not properly connected.`;
              errorMessage += `\n      Solution:`;
              errorMessage += `\n      1. In n8n, connect "Respond to Webhook" node AFTER the Webhook node`;
              errorMessage += `\n      2. Connection path: Webhook → [other nodes] → Respond to Webhook`;
              errorMessage += `\n      3. Or remove "Respond to Webhook" node if not needed`;
            } else {
              errorMessage += `\n      1. Check n8n workflow execution logs for errors`;
              errorMessage += `\n      2. Verify workflow nodes are properly configured`;
              errorMessage += `\n      3. Check n8n console for detailed error messages`;
            }
          } else if (res.statusCode === 400) {
            errorMessage += `\n\n   🔍 TROUBLESHOOTING (400 - Bad Request):`;
            errorMessage += `\n      1. Check if the payload format is correct`;
            errorMessage += `\n      2. Verify webhook is expecting JSON data`;
            errorMessage += `\n      3. Check n8n workflow for input validation errors`;
          } else if (res.statusCode === 431) {
            errorMessage += `\n\n   🔍 TROUBLESHOOTING (431 - Request Header Fields Too Large):`;
            errorMessage += `\n      Issue: Payload too large for GET method (URL length limit exceeded).`;
            errorMessage += `\n      Solution:`;
            errorMessage += `\n      1. In n8n, change webhook HTTP Method from GET to POST`;
            errorMessage += `\n      2. POST method has no size limitations`;
            errorMessage += `\n      3. Or set environment variable: N8N_WEBHOOK_METHOD=POST`;
          } else if (res.statusCode === 405) {
            errorMessage += `\n\n   🔍 TROUBLESHOOTING (405 - Method Not Allowed):`;
            errorMessage += `\n      Issue: Webhook is configured for a different HTTP method.`;
            errorMessage += `\n      Solution: In n8n, change webhook HTTP Method to: ${method}`;
          }
          
          const error = new Error(errorMessage);
          error.statusCode = res.statusCode;
          error.responseData = responseData;
          reject(error);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const error = new Error(`Request Timeout: Connection to n8n webhook timed out after ${options.timeout}ms`);
      error.code = 'ETIMEDOUT';
      error.guidance = 'Connection Timeout: n8n is not responding. Solution: Check if n8n is running and accessible.';
      error.webhookUrl = webhookUrl;
      error.method = method;
      reject(error);
    });

    req.on('error', (error) => {
      // Build comprehensive error message for network errors
      let errorMessage = `Network Error: Failed to connect to n8n webhook`;
      if (error.code) {
        errorMessage += ` (${error.code})`;
      }
      errorMessage += ` - ${error.message}`;
      
      // Preserve original error details in error object
      const enhancedError = new Error(errorMessage);
      enhancedError.code = error.code;
      enhancedError.originalError = error;
      enhancedError.webhookUrl = webhookUrl;
      enhancedError.method = method;
      
      // Add specific guidance based on error code
      if (error.code === 'ECONNREFUSED') {
        enhancedError.guidance = 'Connection Refused: n8n is not running or not accessible on this port. Solution: Start n8n with: n8n';
      } else if (error.code === 'ENOTFOUND') {
        enhancedError.guidance = `Host Not Found: The webhook URL hostname "${new URL(webhookUrl).hostname}" cannot be resolved. Solution: Check the webhook URL is correct.`;
      } else if (error.code === 'ETIMEDOUT') {
        enhancedError.guidance = 'Connection Timeout: n8n is not responding. Solution: Check if n8n is running and accessible.';
      } else if (error.code === 'ECONNRESET') {
        enhancedError.guidance = 'Connection Reset: The connection was closed by n8n. Solution: Check n8n logs for errors.';
      }
      
      reject(enhancedError);
    });

    // Only write body for POST requests
    if (method === 'POST') {
      req.write(jsonData);
    }
    req.end();
  });
}

/**
 * Main function
 */
async function main() {
  // Validate webhook URL is provided
  if (!DEFAULT_WEBHOOK_URL) {
    console.error('❌ N8N_WEBHOOK_URL environment variable is required');
    console.error('   Set it to your n8n webhook URL, e.g.:');
    console.error('   $env:N8N_WEBHOOK_URL="http://localhost:5678/webhook/playwright-results"');
    process.exit(1);
  }
  
  // Check if results file exists - try with retries
  // Wait for file to exist AND have content (not empty)
  let fileReady = false;
  let attempts = 0;
  const maxAttempts = 50; // 50 attempts * 200ms = 10 seconds max wait
  
  while (!fileReady && attempts < maxAttempts) {
    if (fs.existsSync(RESULTS_FILE)) {
      try {
        const stats = fs.statSync(RESULTS_FILE);
        // File exists and has content (size > 0)
        if (stats.size > 0) {
          // Try to parse it to ensure it's valid JSON
          try {
            const testContent = fs.readFileSync(RESULTS_FILE, 'utf8');
            JSON.parse(testContent); // Validate it's valid JSON
            fileReady = true;
            break;
          } catch (parseError) {
            // File exists but might still be writing, continue waiting
          }
        }
      } catch (statError) {
        // File might be in the process of being created, continue waiting
      }
    }
    attempts++;
    if (attempts < maxAttempts) {
      // Wait 200ms before retrying (using proper async wait)
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  if (!fileReady) {
    console.error(`\n${'='.repeat(70)}`);
    console.error(`❌ TEST RESULTS FILE NOT READY`);
    console.error(`${'='.repeat(70)}`);
    console.error(`   File: ${RESULTS_FILE}`);
    console.error(`   Full Path: ${path.resolve(RESULTS_FILE)}`);
    console.error(`   Wait Time: ${(maxAttempts * 200) / 1000} seconds`);
    console.error(`\n   🔍 POSSIBLE CAUSES:`);
    console.error(`      1. Tests are still running (file not written yet)`);
    console.error(`      2. Playwright JSON reporter failed to write the file`);
    console.error(`      3. File permissions issue (cannot read file)`);
    console.error(`      4. File is empty or corrupted`);
    console.error(`\n   💡 TROUBLESHOOTING:`);
    console.error(`      1. Wait for tests to complete: npm test`);
    console.error(`      2. Verify file exists: Check if ${path.resolve(RESULTS_FILE)} exists`);
    console.error(`      3. Check file permissions: Ensure file is readable`);
    console.error(`      4. Check Playwright config: Verify JSON reporter is enabled`);
    console.error(`      5. Try running tests again to regenerate the file`);
    console.error(`${'='.repeat(70)}\n`);
    process.exit(1);
  }

  // Read test results
  let testResults;
  try {
    const fileContent = fs.readFileSync(RESULTS_FILE, 'utf8');
    if (!fileContent || fileContent.trim().length === 0) {
      console.error(`❌ Error: Test results file is empty: ${RESULTS_FILE}`);
      console.error('   The file exists but contains no data.');
      console.error('   This may indicate the Playwright JSON reporter failed to write the results.');
      process.exit(1);
    }
    testResults = JSON.parse(fileContent);
  } catch (error) {
    console.error(`\n❌ Error reading or parsing test results file:`);
    console.error(`   File: ${RESULTS_FILE}`);
    console.error(`   Error Type: ${error.name}`);
    console.error(`   Error Message: ${error.message}`);
    if (error.message.includes('Unexpected token') || error.message.includes('JSON')) {
      console.error(`\n   💡 This appears to be a JSON parsing error.`);
      console.error(`   The file may be corrupted or incomplete.`);
      console.error(`   Try running the tests again to regenerate the file.`);
    } else if (error.code === 'ENOENT') {
      console.error(`\n   💡 File not found. Make sure tests have completed successfully.`);
    } else if (error.code === 'EACCES') {
      console.error(`\n   💡 Permission denied. Check file permissions.`);
    }
    process.exit(1);
  }

  // Extract stdout and stderr from all test results
  // IMPORTANT: Preserves ALL content including full URLs - NO TRUNCATION
  // Only trims whitespace from edges, never truncates content
  function extractOutput(testResults) {
    const stdout = [];
    const stderr = [];
    
    function traverseSuites(suites) {
      if (!Array.isArray(suites)) return;
      
      for (const suite of suites) {
        // Process specs in this suite
        if (suite.specs && Array.isArray(suite.specs)) {
          for (const spec of suite.specs) {
            if (spec.tests && Array.isArray(spec.tests)) {
              for (const test of spec.tests) {
                if (test.results && Array.isArray(test.results)) {
                  for (const result of test.results) {
                    // Extract stdout - preserve full content, only trim edge whitespace
                    if (result.stdout) {
                      const stdoutContent = result.stdout.trim();
                      if (stdoutContent.length > 0) {
                        stdout.push({
                          test: `${suite.title || ''} > ${spec.title || ''}`,
                          stdout: stdoutContent, // Full content preserved - no truncation
                        });
                      }
                    }
                    // Extract stderr - preserve full content, only trim edge whitespace
                    if (result.stderr) {
                      const stderrContent = result.stderr.trim();
                      if (stderrContent.length > 0) {
                        stderr.push({
                          test: `${suite.title || ''} > ${spec.title || ''}`,
                          stderr: stderrContent, // Full content preserved - no truncation
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
        
        // Recursively process nested suites
        if (suite.suites && Array.isArray(suite.suites)) {
          traverseSuites(suite.suites);
        }
      }
    }
    
    if (testResults.suites) {
      traverseSuites(testResults.suites);
    }
    
    // Join all stdout/stderr preserving ALL content including complete URLs
    // Uses double newline separator for readability but preserves all data
    return {
      stdout: stdout.map(item => item.stdout).join('\n\n'),
      stderr: stderr.map(item => item.stderr).join('\n\n'),
    };
  }
  
  const output = extractOutput(testResults);
  
  // Prepare data to send - only stdout and stderr
  const payload = {
    timestamp: new Date().toISOString(),
    source: 'playwright',
    url: testUrl || 'unknown',
    stdout: output.stdout,
    stderr: output.stderr,
    summary: {
      total: (testResults.stats?.expected || 0) + (testResults.stats?.unexpected || 0) + (testResults.stats?.skipped || 0),
      passed: testResults.stats?.expected || 0,
      failed: testResults.stats?.unexpected || 0,
      skipped: testResults.stats?.skipped || 0,
      duration: testResults.stats?.duration || 0,
      startTime: testResults.stats?.startTime || null,
    },
  };
  
  // Verify we have the essential data
  if (!testResults.suites || testResults.suites.length === 0) {
    console.warn('⚠️  Warning: No test suites found in results');
  }
  if (!testResults.stats) {
    console.warn('⚠️  Warning: No stats found in results');
  }

  console.log(`\n📤 Sending stdout and stderr to n8n...`);
  console.log(`   Webhook: ${DEFAULT_WEBHOOK_URL}`);
  console.log(`   Method: ${WEBHOOK_METHOD}`);
  console.log(`   Tests: ${payload.summary.total} (${payload.summary.passed} passed, ${payload.summary.failed} failed)`);
  console.log(`   Duration: ${(payload.summary.duration / 1000).toFixed(2)}s`);
  console.log(`   Payload size: ${(JSON.stringify(payload).length / 1024).toFixed(2)} KB`);
  console.log(`   File: ${RESULTS_FILE}`);
  console.log(`   URL: ${payload.url}`);
  console.log(`\n   Data structure:`);
  console.log(`   - timestamp: ${payload.timestamp}`);
  console.log(`   - source: ${payload.source}`);
  console.log(`   - url: ${payload.url}`);
  console.log(`   - stdout: ${payload.stdout.length} characters`);
  console.log(`   - stderr: ${payload.stderr.length} characters`);
  console.log(`   - summary: Test summary (${Object.keys(payload.summary).length} fields)`);

  // Send to n8n
  sendToN8n(payload, DEFAULT_WEBHOOK_URL, WEBHOOK_METHOD)
    .then(() => {
      console.log('✅ Done!\n');
      process.exit(0);
    })
    .catch((error) => {
      const timestamp = new Date().toISOString();
      console.error(`\n${'='.repeat(70)}`);
      console.error(`❌ FAILED TO SEND TEST RESULTS TO N8N WEBHOOK`);
      console.error(`${'='.repeat(70)}`);
      console.error(`   Timestamp: ${timestamp}`);
      console.error(`\n   ERROR DETAILS:`);
      console.error(`   ${'─'.repeat(66)}`);
      console.error(`   Error Type: ${error.name || 'Error'}`);
      console.error(`   Error Message: ${error.message}`);
      
      // Show HTTP status code if available
      if (error.statusCode) {
        console.error(`   HTTP Status Code: ${error.statusCode}`);
      }
      
      // Show response data if available (for HTTP errors)
      if (error.responseData) {
        console.error(`\n   N8N Response Data:`);
        console.error(`   ${'─'.repeat(66)}`);
        try {
          const parsed = JSON.parse(error.responseData);
          console.error(`   ${JSON.stringify(parsed, null, 2).split('\n').join('\n   ')}`);
        } catch (e) {
          // Not JSON, show raw response (preserve full response to avoid truncating URLs)
          console.error(`   ${error.responseData}`);
        }
      }
      
      // Show original error if wrapped
      if (error.originalError) {
        console.error(`\n   Original Error:`);
        console.error(`   ${'─'.repeat(66)}`);
        console.error(`   Code: ${error.originalError.code || 'N/A'}`);
        console.error(`   Message: ${error.originalError.message}`);
      }
      
      console.error(`\n   REQUEST DETAILS:`);
      console.error(`   ${'─'.repeat(66)}`);
      console.error(`   Webhook URL: ${DEFAULT_WEBHOOK_URL}`);
      console.error(`   HTTP Method: ${WEBHOOK_METHOD}`);
      console.error(`   Payload Size: ${(JSON.stringify(payload).length / 1024).toFixed(2)} KB`);
      console.error(`   Test Results File: ${RESULTS_FILE}`);
      console.error(`   File Exists: ${fs.existsSync(RESULTS_FILE) ? 'Yes' : 'No'}`);
      if (fs.existsSync(RESULTS_FILE)) {
        try {
          const stats = fs.statSync(RESULTS_FILE);
          console.error(`   File Size: ${(stats.size / 1024).toFixed(2)} KB`);
          console.error(`   File Modified: ${stats.mtime.toISOString()}`);
        } catch (e) {
          console.error(`   File Size: Unable to read`);
        }
      }
      
      // Show test summary from payload
      if (payload.summary) {
        console.error(`\n   TEST SUMMARY:`);
        console.error(`   ${'─'.repeat(66)}`);
        console.error(`   Total Tests: ${payload.summary.total}`);
        console.error(`   Passed: ${payload.summary.passed}`);
        console.error(`   Failed: ${payload.summary.failed}`);
        console.error(`   Skipped: ${payload.summary.skipped}`);
        console.error(`   Duration: ${(payload.summary.duration / 1000).toFixed(2)}s`);
      }
      
      // Provide context-specific troubleshooting
      console.error(`\n   TROUBLESHOOTING:`);
      console.error(`   ${'─'.repeat(66)}`);
      
      if (error.statusCode === 404 || error.message.includes('404')) {
        console.error(`   404 - Webhook Not Found`);
        console.error(`   • Verify n8n is running: Check http://localhost:5678`);
        console.error(`   • Ensure workflow is ACTIVATED (green toggle in top-right)`);
        console.error(`   • Verify webhook path matches exactly: playwright-results`);
        console.error(`   • Check webhook HTTP method is set to: ${WEBHOOK_METHOD}`);
        if (DEFAULT_WEBHOOK_URL.includes('/webhook-test/')) {
          console.error(`   • Note: /webhook-test/ requires clicking "Execute Workflow" button first`);
        }
      } else if (error.statusCode === 500 || error.message.includes('500')) {
        console.error(`   500 - Internal Server Error`);
        console.error(`   • Check n8n workflow execution logs for errors`);
        console.error(`   • Verify "Respond to Webhook" node is properly connected`);
        if (error.responseData && error.responseData.includes('Unused Respond to Webhook')) {
          console.error(`   • Fix: Connect "Respond to Webhook" node AFTER Webhook node`);
          console.error(`   • Or remove "Respond to Webhook" node if not needed`);
        }
        console.error(`   • Verify all workflow nodes are properly configured`);
      } else if (error.statusCode === 400 || error.message.includes('400')) {
        console.error(`   400 - Bad Request`);
        console.error(`   • Check if the payload format matches what n8n expects`);
        console.error(`   • Verify webhook is configured to accept JSON data`);
        console.error(`   • Check n8n workflow for input validation errors`);
      } else if (error.statusCode === 431 || error.message.includes('431')) {
        console.error(`   431 - Request Too Large`);
        console.error(`   • The payload is too large for GET method`);
        console.error(`   • Solution: Switch to POST method in n8n webhook configuration`);
        console.error(`   • Current method: ${WEBHOOK_METHOD}`);
      } else if (error.statusCode === 405 || error.message.includes('405')) {
        console.error(`   405 - Method Not Allowed`);
        console.error(`   • Webhook is configured for a different HTTP method`);
        console.error(`   • Solution: Change webhook HTTP Method to: ${WEBHOOK_METHOD}`);
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED') || error.message.includes('Connection Refused')) {
        console.error(`   Connection Refused`);
        if (error.guidance) {
          console.error(`   • ${error.guidance}`);
        } else {
          console.error(`   • n8n is not running or not accessible on this port`);
          console.error(`   • Solution: Start n8n with: n8n`);
          console.error(`   • Verify port ${new URL(DEFAULT_WEBHOOK_URL).port || 5678} is not in use`);
        }
      } else if (error.code === 'ENOTFOUND' || error.message.includes('ENOTFOUND')) {
        console.error(`   Host Not Found`);
        if (error.guidance) {
          console.error(`   • ${error.guidance}`);
        } else {
          console.error(`   • The webhook URL hostname cannot be resolved`);
          console.error(`   • Solution: Check the webhook URL is correct`);
          console.error(`   • Verify DNS resolution for: ${new URL(DEFAULT_WEBHOOK_URL).hostname}`);
        }
      } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        console.error(`   Connection Timeout`);
        if (error.guidance) {
          console.error(`   • ${error.guidance}`);
        } else {
          console.error(`   • n8n is not responding or taking too long`);
          console.error(`   • Check if n8n is running: n8n`);
          console.error(`   • Verify network connectivity`);
          console.error(`   • Check n8n execution logs for long-running workflows`);
        }
      } else if (error.code === 'ECONNRESET' || error.message.includes('ECONNRESET') || error.message.includes('Connection Reset')) {
        console.error(`   Connection Reset`);
        if (error.guidance) {
          console.error(`   • ${error.guidance}`);
        } else {
          console.error(`   • The connection was closed by n8n`);
          console.error(`   • Check n8n logs for errors`);
          console.error(`   • Verify workflow is handling the request correctly`);
        }
      } else {
        console.error(`   General Error`);
        console.error(`   • Verify n8n is running: n8n`);
        console.error(`   • Check webhook URL: ${DEFAULT_WEBHOOK_URL}`);
        console.error(`   • Ensure workflow is ACTIVATED (green toggle)`);
        console.error(`   • Check n8n execution logs for errors`);
        console.error(`   • Verify webhook path and HTTP method are correct`);
      }
      
      console.error(`\n   ADDITIONAL HELP:`);
      console.error(`   ${'─'.repeat(66)}`);
      console.error(`   • Documentation: N8N_TROUBLESHOOTING.md`);
      console.error(`   • Test connection: npm run test:n8n-connection`);
      console.error(`   • Verify file exists: Check ${path.resolve(RESULTS_FILE)}`);
      
      console.error(`\n${'='.repeat(70)}\n`);
      process.exit(1);
    });
}

// Run main function
main();

