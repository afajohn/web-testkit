#!/usr/bin/env node

/**
 * Test n8n webhook connection
 * This script sends a test payload to verify the connection works
 * 
 * Usage: node scripts/test-n8n-connection.js
 */

const http = require('http');
const https = require('https');

// Configuration
const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/playwright-results';
// For test connection, POST is used to match production setup
const WEBHOOK_METHOD = process.env.N8N_WEBHOOK_METHOD || 'POST';

/**
 * Parse webhook URL
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
    process.exit(1);
  }
}

/**
 * Send test data to n8n webhook
 */
function testConnection(webhookUrl, method = 'POST') {
  return new Promise((resolve, reject) => {
    const urlInfo = parseWebhookUrl(webhookUrl);
    const isHttps = urlInfo.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const testPayload = {
      timestamp: new Date().toISOString(),
      source: 'playwright-test',
      message: 'Test connection from Playwright',
      test: true,
      summary: {
        total: 1,
        passed: 1,
        failed: 0,
        skipped: 0,
        duration: 1000,
      },
    };
    
    const jsonData = JSON.stringify(testPayload, null, 2);
    
    console.log(`\n📤 Testing n8n webhook connection...`);
    console.log(`   URL: ${webhookUrl}`);
    console.log(`   Method: ${method}`);
    console.log(`   Payload:\n${jsonData}\n`);
    
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
    };

    const req = httpModule.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk.toString();
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Connection successful!`);
          console.log(`   Status: ${res.statusCode}`);
          if (responseData) {
            console.log(`   Response: ${responseData}`);
          }
          resolve({ statusCode: res.statusCode, response: responseData });
        } else {
          let errorMessage = `n8n returned status ${res.statusCode}: ${responseData}`;
          
          // Provide specific guidance for common errors
          if (res.statusCode === 500 && responseData.includes('Unused Respond to Webhook')) {
            errorMessage += `\n\n   💡 Fix: The "Respond to Webhook" node is not connected properly.`;
            errorMessage += `\n      1. In n8n, make sure "Respond to Webhook" node is connected AFTER the Webhook node`;
            errorMessage += `\n      2. The connection path must be: Webhook → [other nodes] → Respond to Webhook`;
            errorMessage += `\n      3. Or remove the "Respond to Webhook" node if you don't need a response`;
          } else if (res.statusCode === 404 && responseData.includes('not registered for POST requests')) {
            errorMessage += `\n\n   💡 Fix: The webhook is configured for GET, not POST.`;
            errorMessage += `\n      The script is already set to use GET method.`;
            errorMessage += `\n      Verify your n8n webhook node is set to GET method.`;
          }
          
          const error = new Error(errorMessage);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Connection failed:`);
      console.error(`   ${error.message}`);
      console.error(`\n   Troubleshooting:`);
      console.error(`   1. Make sure n8n is running: n8n`);
      console.error(`   2. Check the webhook URL is correct`);
      console.error(`   3. For /webhook/: Make sure workflow is ACTIVATED`);
      console.error(`   4. For /webhook/: Click "Execute Workflow" first`);
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout - n8n is not responding'));
    });

    // Only write body for POST requests
    if (method === 'POST') {
      req.write(jsonData);
    }
    req.end();
  });
}

// Main
if (!WEBHOOK_URL) {
  console.error('❌ N8N_WEBHOOK_URL environment variable is required');
  console.error('   Set it to your n8n webhook URL, e.g.:');
  console.error('   $env:N8N_WEBHOOK_URL="http://localhost:5678/webhook/playwright-results"');
  process.exit(1);
}

console.log('🧪 Testing n8n Webhook Connection\n');
testConnection(WEBHOOK_URL, WEBHOOK_METHOD)
  .then(() => {
    console.log('\n✅ Test passed! Your n8n webhook is working correctly.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n❌ Test failed: ${error.message}\n`);
    process.exit(1);
  });

