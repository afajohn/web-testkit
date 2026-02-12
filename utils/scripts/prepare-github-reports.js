#!/usr/bin/env node

/**
 * Prepare Playwright HTML reports for GitHub Pages
 * Creates an index page listing all available reports and organizes them for GitHub Pages
 * 
 * Usage:
 *   node scripts/prepare-github-reports.js [output-dir]
 *   node scripts/prepare-github-reports.js                # Uses 'gh-pages-reports' directory
 *   node scripts/prepare-github-reports.js docs/reports   # Custom output directory
 */

const fs = require('fs');
const path = require('path');

const REPORTS_SOURCE_DIR = path.join(__dirname, '..', 'playwright-report');
const DEFAULT_OUTPUT_DIR = path.join(__dirname, '..', 'gh-pages-reports');
const OUTPUT_DIR = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUTPUT_DIR;

/**
 * Find all HTML reports in the source directory
 */
function findReports(sourceDir, basePath = '') {
  const reports = [];
  
  if (!fs.existsSync(sourceDir)) {
    return reports;
  }
  
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(sourceDir, entry.name);
    const relativePath = path.join(basePath, entry.name);
    
    if (entry.isDirectory()) {
      // Check if this directory has an index.html
      const indexPath = path.join(fullPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        // Get timestamp from index.html if available
        const stats = fs.statSync(indexPath);
        const timestamp = stats.mtime;
        
        reports.push({
          name: entry.name,
          path: relativePath,
          fullPath: fullPath,
          timestamp: timestamp,
          displayPath: relativePath || 'default',
        });
      }
      
      // Recursively scan subdirectories
      const subReports = findReports(fullPath, relativePath);
      reports.push(...subReports);
    }
  }
  
  // Check root directory for index.html (default report)
  const rootIndexPath = path.join(sourceDir, 'index.html');
  if (fs.existsSync(rootIndexPath) && basePath === '') {
    const stats = fs.statSync(rootIndexPath);
    reports.unshift({
      name: 'default (latest)',
      path: '',
      fullPath: sourceDir,
      timestamp: stats.mtime,
      displayPath: 'default',
    });
  }
  
  return reports;
}

/**
 * Copy directory recursively
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
 * Generate index.html page listing all reports
 */
function generateIndexPage(reports) {
  // Sort reports by timestamp (newest first)
  const sortedReports = [...reports].sort((a, b) => b.timestamp - a.timestamp);
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Playwright Test Reports</title>
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
        .report-item:hover {
            border-color: #667eea;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
            transform: translateY(-2px);
        }
        .report-info {
            flex: 1;
        }
        .report-name {
            font-size: 1.2em;
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }
        .report-path {
            color: #666;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        .report-time {
            color: #999;
            font-size: 0.85em;
            margin-top: 5px;
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
            <h1>🎭 Playwright Test Reports</h1>
            <p>Comprehensive test results for multiple websites and URLs</p>
        </header>
        <div class="content">
            <div class="stats">
                <div class="stat-card">
                    <div class="number">${reports.length}</div>
                    <div class="label">Total Reports</div>
                </div>
                <div class="stat-card">
                    <div class="number">${new Set(reports.map(r => r.path.split('/')[0] || 'default')).size}</div>
                    <div class="label">Websites Tested</div>
                </div>
            </div>
            
            <div class="reports-section">
                <h2>Available Reports</h2>
                ${sortedReports.length === 0 
                  ? '<div class="empty-state"><h3>No reports found</h3><p>Run tests to generate reports</p></div>'
                  : `<div class="reports-list">
                      ${sortedReports.map(report => {
                        const urlPath = report.path ? `${report.path}/` : '';
                        const date = new Date(report.timestamp).toLocaleString();
                        return `
                        <div class="report-item">
                            <div class="report-info">
                                <div class="report-name">${escapeHtml(report.name)}</div>
                                <div class="report-path">${escapeHtml(report.displayPath)}</div>
                                <div class="report-time">Last updated: ${date}</div>
                            </div>
                            <a href="${urlPath}index.html" class="report-link">View Report →</a>
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

  return html;
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

// Main execution
try {
  console.log(`\n📦 Preparing reports for GitHub...`);
  console.log(`   Source: ${REPORTS_SOURCE_DIR}`);
  console.log(`   Output: ${OUTPUT_DIR}\n`);
  
  // Find all reports
  const reports = findReports(REPORTS_SOURCE_DIR);
  
  if (reports.length === 0) {
    console.error(`❌ No HTML reports found in: ${REPORTS_SOURCE_DIR}`);
    console.error(`   Run tests first to generate reports.`);
    process.exit(1);
  }
  
  console.log(`📊 Found ${reports.length} report(s):\n`);
  reports.forEach((report, index) => {
    console.log(`   ${index + 1}. ${report.displayPath} (${report.name})`);
  });
  
  // Create output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    console.log(`\n⚠️  Output directory exists: ${OUTPUT_DIR}`);
    console.log(`   Cleaning existing files...`);
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
  
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  // Copy all reports
  console.log(`\n📋 Copying reports...`);
  for (const report of reports) {
    const targetPath = path.join(OUTPUT_DIR, report.path || 'default');
    console.log(`   Copying: ${report.displayPath}`);
    copyDirectorySync(report.fullPath, targetPath);
  }
  
  // Generate index page
  console.log(`\n📄 Generating index page...`);
  const indexHtml = generateIndexPage(reports);
  const indexPath = path.join(OUTPUT_DIR, 'index.html');
  fs.writeFileSync(indexPath, indexHtml);
  
  console.log(`\n✅ Reports prepared successfully!`);
  console.log(`\n📁 Output directory: ${OUTPUT_DIR}`);
  console.log(`   - ${reports.length} report(s) copied`);
  console.log(`   - Index page generated: index.html`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review the reports in: ${OUTPUT_DIR}`);
  console.log(`   2. Commit to git: git add ${path.relative(process.cwd(), OUTPUT_DIR)}`);
  console.log(`   3. Push to GitHub`);
  console.log(`   4. Enable GitHub Pages in repository settings`);
  console.log(`   5. Set source to: ${path.basename(OUTPUT_DIR)}/`);
  console.log(`\n`);
  
} catch (error) {
  console.error(`\n❌ Error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}

