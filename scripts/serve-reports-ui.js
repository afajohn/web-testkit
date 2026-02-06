#!/usr/bin/env node

/**
 * Serve Reports UI
 * 
 * Web UI for browsing and viewing JSON audit reports
 * 
 * Usage:
 *   node scripts/serve-reports-ui.js [port]
 *   node scripts/serve-reports-ui.js 3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const os = require('os');
const { spawn } = require('child_process');

const PORT = parseInt(process.argv[2]) || 3000;
const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const REPORTS_BIN_DIR = path.join(__dirname, '..', 'Reports Bin');

/**
 * Get MIME type for file
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webm': 'video/webm',
    '.mp4': 'video/mp4',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Find all JSON report files recursively
 */
function findReportFiles(dir, baseDir = dir) {
  const files = [];
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      files.push(...findReportFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push({
        path: relativePath.replace(/\\/g, '/'),
        fullPath,
        name: entry.name,
        domain: path.relative(REPORTS_DIR, fullPath).split(path.sep)[0],
      });
    }
  }

  return files;
}

/**
 * Get domain structure
 */
function getDomainStructure() {
  const domains = {};
  const reportsDir = REPORTS_DIR;

  if (!fs.existsSync(reportsDir)) {
    return domains;
  }

  const domainDirs = fs.readdirSync(reportsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  for (const domain of domainDirs) {
    const domainPath = path.join(reportsDir, domain);
    const files = findReportFiles(domainPath, domainPath);
    
    // Group files by directory structure
    const structure = {};
    files.forEach(file => {
      const dirPath = path.dirname(file.path);
      if (!structure[dirPath]) {
        structure[dirPath] = [];
      }
      structure[dirPath].push({
        name: file.name,
        path: file.path,
        fullPath: path.join(domain, file.path).replace(/\\/g, '/'),
      });
    });

    domains[domain] = {
      totalFiles: files.length,
      structure,
    };
  }

  return domains;
}

/**
 * Get summary statistics
 */
function getSummaryStats() {
  const domains = {};
  const reportsDir = REPORTS_DIR;

  if (!fs.existsSync(reportsDir)) {
    return domains;
  }

  const domainDirs = fs.readdirSync(reportsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  for (const domain of domainDirs) {
    const domainPath = path.join(reportsDir, domain);
    const files = findReportFiles(domainPath, domainPath);
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalIssues = 0;

    files.forEach((file, index) => {
      try {
        // Check if file exists before reading
        if (!fs.existsSync(file.fullPath)) {
          console.warn(`File not found: ${file.fullPath}`);
          totalFailed++;
          return;
        }

        const content = fs.readFileSync(file.fullPath, 'utf8');
        if (!content || content.trim().length === 0) {
          totalFailed++;
          return;
        }

        const report = JSON.parse(content);
        
        // Determine if report passed or failed
        // Priority: error flags > summary.overallStatus > individual checks
        
        let counted = false;
        
        // First check for explicit error flags (these reports failed)
        if (report.error === true || report.testFailed === true) {
          totalFailed++;
          counted = true;
        }
        // Check summary.overallStatus if available
        else if (report.summary && typeof report.summary.overallStatus === 'string') {
          const status = report.summary.overallStatus.toLowerCase();
          if (status === 'passed') {
            totalPassed++;
            counted = true;
          } else {
            // Any other status counts as failed
            totalFailed++;
            counted = true;
          }
        }
        // If no overallStatus string, infer from summary flags
        else if (report.summary && typeof report.summary === 'object') {
          // Check if any checks failed based on summary flags
          const hasFailures = 
            report.summary.seoPassed === false ||
            (typeof report.summary.brokenLinksCount === 'number' && report.summary.brokenLinksCount > 0) ||
            report.summary.accessibilityPassed === false ||
            report.summary.gtmPassed === false;
          
          if (hasFailures) {
            totalFailed++;
            counted = true;
          } else if (
            report.summary.seoPassed === true &&
            (!report.summary.brokenLinksCount || report.summary.brokenLinksCount === 0) &&
            report.summary.accessibilityPassed === true &&
            (report.summary.gtmPassed === true || report.summary.gtmPassed === undefined)
          ) {
            // All checks passed
            totalPassed++;
            counted = true;
          }
        }
        
        // If not counted yet, check individual sections
        if (!counted && (report.url || report.timestamp)) {
          // Check if there are any issues in individual sections
          const hasIssues = 
            (report.seo?.results && Array.isArray(report.seo.results) && report.seo.results.some(r => r.passed === false)) ||
            (report.brokenLinks?.brokenLinks && Array.isArray(report.brokenLinks.brokenLinks) && report.brokenLinks.brokenLinks.length > 0) ||
            (report.accessibility?.violations && Array.isArray(report.accessibility.violations) && report.accessibility.violations.length > 0) ||
            (report.gtm && report.gtm.hasGTM === false);
          
          if (hasIssues) {
            totalFailed++;
            counted = true;
          } else {
            // No issues found, assume passed if report has structure
            totalPassed++;
            counted = true;
          }
        }
        
        // If still not counted and it's a valid report structure, default to failed to be safe
        if (!counted && (report.url || report.timestamp || report.error !== undefined)) {
          totalFailed++;
        }

        // Count issues for statistics (only if report structure exists)
        if (report.seo?.results && Array.isArray(report.seo.results)) {
          totalIssues += report.seo.results.filter(r => r.passed === false).length;
        }
        if (report.brokenLinks?.brokenLinks && Array.isArray(report.brokenLinks.brokenLinks)) {
          totalIssues += report.brokenLinks.brokenLinks.length;
        }
        if (report.accessibility?.violations && Array.isArray(report.accessibility.violations)) {
          totalIssues += report.accessibility.violations.length;
        }
        if (report.gtm && report.gtm.hasGTM === false) {
          totalIssues += 1;
        }
      } catch (error) {
        // Invalid JSON files or read errors - count as failed
        totalFailed++;
      }
    });

    domains[domain] = {
      totalFiles: files.length,
      totalPassed,
      totalFailed,
      totalIssues,
    };
  }

  return domains;
}

/**
 * Get markdown summary files grouped by domain (only from Reports Bin)
 */
function getMarkdownSummaries() {
  const summariesByDomain = {};
  
  // Only check Reports Bin directory
  if (!fs.existsSync(REPORTS_BIN_DIR)) {
    return summariesByDomain;
  }

  const files = fs.readdirSync(REPORTS_BIN_DIR, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.md') && entry.name.startsWith('Report_Summary_'))
    .map(entry => {
      // Extract domain from filename: Report_Summary_domain_com_timestamp.md
      // Pattern: Report_Summary_<domain_with_underscores>_<timestamp>.md
      // e.g., Report_Summary_barranquilladating_com_2026-01-14_08-45.md
      // e.g., Report_Summary_mexicocitydating_com_2026-01-15_07-56.md
      
      // Match everything after "Report_Summary_" until the timestamp pattern starts
      // Timestamp pattern: YYYY-MM-DD_HH-MM
      const nameMatch = entry.name.match(/Report_Summary_(.+?)_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})\.md$/);
      
      if (nameMatch) {
        // Convert underscores to dots: barranquilladating_com -> barranquilladating.com
        const domain = nameMatch[1].replace(/_/g, '.');
        const timestamp = nameMatch[2];
        
        return {
          name: entry.name,
          path: path.join(REPORTS_BIN_DIR, entry.name),
          domain,
          timestamp,
        };
      } else {
        // Fallback: try to extract domain from any pattern
        const fallbackMatch = entry.name.match(/Report_Summary_([^_]+(?:_[^_]+)*?)_/);
        const domain = fallbackMatch ? fallbackMatch[1].replace(/_/g, '.') : 'unknown';
        return {
          name: entry.name,
          path: path.join(REPORTS_BIN_DIR, entry.name),
          domain,
          timestamp: '',
        };
      }
    });
  
  files.forEach(file => {
    if (!summariesByDomain[file.domain]) {
      summariesByDomain[file.domain] = [];
    }
    summariesByDomain[file.domain].push(file);
  });

  return summariesByDomain;
}

/**
 * Create HTTP server
 */
function createServer() {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;

      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // API endpoints
      if (pathname === '/api/domains') {
        const structure = getDomainStructure();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(structure, null, 2));
        return;
      }

      if (pathname === '/api/stats') {
        const stats = getSummaryStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats, null, 2));
        return;
      }

      if (pathname.startsWith('/api/report/')) {
        const reportPath = decodeURIComponent(pathname.replace('/api/report/', ''));
        // Normalize path separators (handle both / and \)
        const normalizedPath = reportPath.replace(/\\/g, '/');
        const fullPath = path.join(REPORTS_DIR, normalizedPath);
        
        // Security check
        const normalizedFullPath = path.normalize(fullPath);
        const normalizedReportsDir = path.normalize(REPORTS_DIR);
        if (!normalizedFullPath.startsWith(normalizedReportsDir)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden', requestedPath: reportPath, fullPath }));
          return;
        }

        if (!fs.existsSync(fullPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Report not found', 
            requestedPath: reportPath,
            fullPath,
            exists: fs.existsSync(REPORTS_DIR)
          }));
          return;
        }

        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const report = JSON.parse(content);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(report, null, 2));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message, fullPath }));
        }
        return;
      }

      if (pathname === '/api/summaries') {
        const summariesByDomain = getMarkdownSummaries();
        
        // Convert to array format with domain grouping and file contents
        const result = {};
        for (const domain in summariesByDomain) {
          result[domain] = summariesByDomain[domain].map(file => {
            try {
              const content = fs.readFileSync(file.path, 'utf8');
              
              return {
                name: file.name,
                content,
                timestamp: file.timestamp || '',
                path: file.path,
              };
            } catch (error) {
              return {
                name: file.name,
                error: error.message,
                timestamp: file.timestamp || '',
                path: file.path,
              };
            }
          }).sort((a, b) => {
            // Sort by timestamp (newest first), empty timestamps go last
            if (!a.timestamp && !b.timestamp) return 0;
            if (!a.timestamp) return 1;
            if (!b.timestamp) return -1;
            return b.timestamp.localeCompare(a.timestamp);
          });
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result, null, 2));
        return;
      }

      // API endpoint to re-run test for a URL
      if (pathname === '/api/rerun-test' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', () => {
          try {
            const { url } = JSON.parse(body);
            
            if (!url) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'URL is required' }));
              return;
            }

            // Validate URL format
            try {
              new URL(url);
            } catch (error) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid URL format' }));
              return;
            }

            // Get project root directory (parent of scripts directory)
            const projectRoot = path.join(__dirname, '..');
            const testScript = path.join(projectRoot, 'test-url.js');

            // Check if test script exists
            if (!fs.existsSync(testScript)) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: `Test script not found: ${testScript}` }));
              return;
            }

            // Spawn test process
            const testProcess = spawn('node', [testScript, url], {
              cwd: projectRoot,
              env: {
                ...process.env,
                CI: 'true',
                BATCH_MODE: 'true',
              },
              shell: true,
            });

            let stdout = '';
            let stderr = '';

            testProcess.stdout.on('data', (data) => {
              stdout += data.toString();
            });

            testProcess.stderr.on('data', (data) => {
              stderr += data.toString();
            });

            // Return immediately with job ID (using URL as identifier)
            const jobId = Buffer.from(url).toString('base64');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              jobId,
              message: 'Test started',
              url 
            }));

            // Handle test completion in background
            testProcess.on('close', (code) => {
              // Test completed, report file should be updated
              console.log(`Test completed for ${url} with exit code ${code}`);
              if (code !== 0) {
                console.error(`Test failed for ${url}. Exit code: ${code}`);
                if (stderr) {
                  console.error(`Error output: ${stderr}`);
                }
              }
            });

            testProcess.on('error', (error) => {
              console.error(`Error running test for ${url}:`, error);
            });

          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }

      // Serve static files or UI
      if (pathname === '/' || pathname === '/index.html') {
        // Serve the UI HTML
        const uiPath = path.join(__dirname, 'reports-ui', 'index.html');
        if (fs.existsSync(uiPath)) {
          const content = fs.readFileSync(uiPath, 'utf8');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end('<h1>UI not found</h1><p>Please ensure reports-ui/index.html exists</p>');
        }
        return;
      }

      // Serve static assets from reports-ui directory
      if (pathname.startsWith('/css/') || pathname.startsWith('/js/')) {
        // Remove leading slash for path.join
        const cleanPath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
        const assetPath = path.join(__dirname, 'reports-ui', cleanPath);
        
        // Security check
        const normalizedAssetPath = path.normalize(assetPath);
        const normalizedUIDir = path.normalize(path.join(__dirname, 'reports-ui'));
        if (!normalizedAssetPath.startsWith(normalizedUIDir)) {
          res.writeHead(403, { 'Content-Type': 'text/html' });
          res.end('<h1>403 - Forbidden</h1>');
          return;
        }

        if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
          const content = fs.readFileSync(assetPath);
          const mimeType = getMimeType(assetPath);
          res.writeHead(200, { 'Content-Type': mimeType });
          res.end(content);
          return;
        }
      }

      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - Not Found</h1>');
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>500 - Server Error</h1><p>${error.message}</p>`);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    const networkIPs = getNetworkIPs();
    console.log('\n' + '='.repeat(80));
    console.log('📊 REPORTS UI SERVER');
    console.log('='.repeat(80));
    console.log(`\n✅ Server running at:`);
    console.log(`   Local:   http://localhost:${PORT}`);
    if (networkIPs.length > 0) {
      console.log(`   Network: http://${networkIPs[0]}:${PORT}`);
    }
    console.log(`\n📁 Serving reports from: ${REPORTS_DIR}`);
    console.log(`📄 Markdown summaries from: ${REPORTS_BIN_DIR}`);
    console.log('\n' + '='.repeat(80));
    console.log('Press Ctrl+C to stop the server\n');
  });

  return server;
}

/**
 * Get network IP addresses
 */
function getNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  
  return ips;
}

// Create and start server
const server = createServer();

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
