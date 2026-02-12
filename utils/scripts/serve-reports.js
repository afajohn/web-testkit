#!/usr/bin/env node

/**
 * Serve Playwright HTML reports via HTTP server
 * Allows developers to access test reports via a shared URL
 * 
 * Usage:
 *   node scripts/serve-reports.js [port] [report-path]
 *   node scripts/serve-reports.js                    # Auto-detect reports, use default port 9323
 *   node scripts/serve-reports.js 8080               # Use custom port
 *   node scripts/serve-reports.js 8080 playwright-report/anewbride.com  # Serve specific report
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const os = require('os');

const PORT = parseInt(process.argv[2]) || 9323;
const SPECIFIC_REPORT = process.argv[3] || null;

const REPORTS_BASE_DIR = path.join(__dirname, '..', 'playwright-report');

/**
 * Get local network IP addresses
 */
function getNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  
  return ips;
}

/**
 * Find all available HTML reports
 */
function findAvailableReports() {
  const reports = [];
  
  if (!fs.existsSync(REPORTS_BASE_DIR)) {
    return reports;
  }
  
  function scanDirectory(dir, relativePath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relative = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        // Check if this directory contains an index.html
        const indexPath = path.join(fullPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          reports.push({
            path: relative,
            fullPath: fullPath,
            name: entry.name,
          });
        }
        // Also scan subdirectories
        scanDirectory(fullPath, relative);
      }
    }
  }
  
  // Check if root playwright-report has index.html (default report)
  const rootIndex = path.join(REPORTS_BASE_DIR, 'index.html');
  if (fs.existsSync(rootIndex)) {
    reports.unshift({
      path: '',
      fullPath: REPORTS_BASE_DIR,
      name: 'default (latest)',
    });
  }
  
  // Scan for URL-based reports
  scanDirectory(REPORTS_BASE_DIR);
  
  return reports;
}

/**
 * Get MIME type for file
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webm': 'video/webm',
    '.mp4': 'video/mp4',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Create HTTP server to serve reports
 */
function createServer(reportPath, reportFullPath) {
  const server = http.createServer((req, res) => {
    try {
      // Parse URL
      const url = new URL(req.url, `http://${req.headers.host}`);
      let filePath = url.pathname;
      
      // Remove leading slash
      if (filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }
      
      // If root path, serve index.html
      if (filePath === '' || filePath === '/') {
        filePath = 'index.html';
      }
      
      // Construct full file path
      const fullFilePath = path.join(reportFullPath, filePath);
      
      // Security check: ensure file is within report directory
      const normalizedFullPath = path.normalize(fullFilePath);
      const normalizedReportPath = path.normalize(reportFullPath);
      if (!normalizedFullPath.startsWith(normalizedReportPath)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden: Access denied');
        return;
      }
      
      // Check if file exists
      if (!fs.existsSync(fullFilePath)) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>404 - Report Not Found</title></head>
          <body>
            <h1>404 - File Not Found</h1>
            <p>The requested file was not found in the report.</p>
            <p><a href="/">Back to Report</a></p>
          </body>
          </html>
        `);
        return;
      }
      
      const stats = fs.statSync(fullFilePath);
      
      // Handle directories
      if (stats.isDirectory()) {
        const indexPath = path.join(fullFilePath, 'index.html');
        if (fs.existsSync(indexPath)) {
          filePath = path.join(filePath, 'index.html');
          fullFilePath = path.join(reportFullPath, filePath);
        } else {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('403 Forbidden: Directory listing not allowed');
          return;
        }
      }
      
      // Read and serve file
      const fileContent = fs.readFileSync(fullFilePath);
      const mimeType = getMimeType(fullFilePath);
      
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Length': fileContent.length,
      });
      res.end(fileContent);
      
    } catch (error) {
      console.error(`Error serving file: ${error.message}`);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`500 Internal Server Error: ${error.message}`);
    }
  });
  
  return server;
}

// Main execution
try {
  // Find available reports
  const availableReports = findAvailableReports();
  
  if (availableReports.length === 0) {
    console.error(`\n❌ No HTML reports found in: ${REPORTS_BASE_DIR}`);
    console.error(`   Run tests first to generate reports.`);
    console.error(`   Example: npm run test:url -- https://example.com`);
    process.exit(1);
  }
  
  let reportPath, reportFullPath, reportName;
  
  if (SPECIFIC_REPORT) {
    // User specified a report path
    reportFullPath = path.resolve(REPORTS_BASE_DIR, SPECIFIC_REPORT);
    
    if (!fs.existsSync(reportFullPath)) {
      console.error(`\n❌ Report path not found: ${SPECIFIC_REPORT}`);
      console.error(`   Full path: ${reportFullPath}`);
      process.exit(1);
    }
    
    const indexPath = path.join(reportFullPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      console.error(`\n❌ index.html not found in: ${SPECIFIC_REPORT}`);
      process.exit(1);
    }
    
    reportPath = SPECIFIC_REPORT;
    reportName = path.basename(reportFullPath);
  } else if (availableReports.length === 1) {
    // Only one report, use it
    reportPath = availableReports[0].path;
    reportFullPath = availableReports[0].fullPath;
    reportName = availableReports[0].name;
  } else {
    // Multiple reports - use the default/latest one, or first one
    const defaultReport = availableReports.find(r => r.path === '') || availableReports[0];
    reportPath = defaultReport.path;
    reportFullPath = defaultReport.fullPath;
    reportName = defaultReport.name;
    
    console.log(`\n📊 Found ${availableReports.length} available reports:`);
    availableReports.forEach((report, index) => {
      const marker = report.path === reportPath ? '👉' : '  ';
      console.log(`${marker} ${index + 1}. ${report.name} (${report.path || 'default'})`);
    });
    console.log(`\n   Serving: ${reportName}`);
    console.log(`   To serve a specific report, use: node scripts/serve-reports.js ${PORT} <report-path>`);
  }
  
  // Create and start server
  const server = createServer(reportPath, reportFullPath);
  
  server.listen(PORT, () => {
    const networkIPs = getNetworkIPs();
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ Playwright HTML Report Server Running`);
    console.log(`${'='.repeat(70)}`);
    console.log(`\n📁 Report: ${reportName}`);
    console.log(`   Path: ${reportPath || 'default'}`);
    console.log(`\n🌐 Access URLs:`);
    console.log(`   Local:     http://localhost:${PORT}/`);
    
    if (networkIPs.length > 0) {
      networkIPs.forEach(ip => {
        console.log(`   Network:   http://${ip}:${PORT}/`);
      });
      console.log(`\n💡 Share the Network URL(s) above with your team members`);
      console.log(`   (They must be on the same network)`);
    } else {
      console.log(`\n⚠️  No network interfaces found - only accessible locally`);
    }
    
    console.log(`\n⏹️  Press Ctrl+C to stop the server\n`);
    console.log(`${'='.repeat(70)}\n`);
  });
  
  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use.`);
      console.error(`   Try a different port: node scripts/serve-reports.js ${PORT + 1}`);
      process.exit(1);
    } else {
      console.error(`\n❌ Server error: ${error.message}`);
      process.exit(1);
    }
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(`\n\n⏹️  Stopping server...`);
    server.close(() => {
      console.log(`✅ Server stopped.\n`);
      process.exit(0);
    });
  });
  
} catch (error) {
  console.error(`\n❌ Error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}

