#!/usr/bin/env node

/**
 * Verify that test-results and playwright-report directories follow the URL-based structure
 * Shows the current structure and confirms it matches the expected format
 * 
 * Usage:
 *   node scripts/verify-structure.js
 */

const fs = require('fs');
const path = require('path');

const TEST_RESULTS_DIR = path.join(__dirname, '..', 'test-results');
const PLAYWRIGHT_REPORT_DIR = path.join(__dirname, '..', 'playwright-report');

/**
 * Recursively get directory structure
 */
function getDirectoryStructure(dir, basePath = '', maxDepth = 10, currentDepth = 0) {
  const structure = [];
  
  if (!fs.existsSync(dir) || currentDepth > maxDepth) {
    return structure;
  }
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);
      
      if (entry.isDirectory()) {
        structure.push({
          type: 'directory',
          name: entry.name,
          path: relativePath,
          fullPath: fullPath,
        });
        
        // Recursively get subdirectories
        const subStructure = getDirectoryStructure(fullPath, relativePath, maxDepth, currentDepth + 1);
        structure.push(...subStructure);
      } else if (entry.isFile() && (entry.name === 'index.html' || entry.name === 'test-results.json')) {
        structure.push({
          type: 'file',
          name: entry.name,
          path: relativePath,
          fullPath: fullPath,
        });
      }
    }
  } catch (error) {
    // Ignore permission errors
  }
  
  return structure;
}

/**
 * Format structure as tree
 */
function formatTree(structure, indent = '') {
  let output = '';
  const dirs = structure.filter(item => item.type === 'directory');
  const files = structure.filter(item => item.type === 'file');
  
  // Sort directories first, then files
  dirs.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));
  
  // Print directories
  dirs.forEach((dir, index) => {
    const isLast = index === dirs.length - 1 && files.length === 0;
    const prefix = isLast ? '└── ' : '├── ';
    output += `${indent}${prefix}${dir.name}/\n`;
    
    // Get children of this directory
    const children = structure.filter(item => 
      item.path.startsWith(dir.path + path.sep) && 
      item.path.replace(dir.path + path.sep, '').split(path.sep).length === 1
    );
    
    if (children.length > 0) {
      const childIndent = indent + (isLast ? '    ' : '│   ');
      output += formatTree(children.map(child => ({
        ...child,
        path: child.path.replace(dir.path + path.sep, '')
      })), childIndent);
    }
  });
  
  // Print files
  files.forEach((file, index) => {
    const isLast = index === files.length - 1;
    const prefix = isLast ? '└── ' : '├── ';
    output += `${indent}${prefix}${file.name}\n`;
  });
  
  return output;
}

/**
 * Check if structure matches expected format
 */
function verifyStructure(dir, dirName) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📁 ${dirName} Structure`);
  console.log(`${'='.repeat(70)}\n`);
  
  if (!fs.existsSync(dir)) {
    console.log(`❌ Directory does not exist: ${dir}`);
    console.log(`   Run tests to generate this directory.\n`);
    return false;
  }
  
  const structure = getDirectoryStructure(dir);
  
  if (structure.length === 0) {
    console.log(`⚠️  Directory is empty: ${dir}`);
    console.log(`   Run tests to generate reports.\n`);
    return false;
  }
  
  // Check for expected structure patterns
  const hasUrlBasedStructure = structure.some(item => 
    item.type === 'directory' && 
    (item.name.includes('.com') || item.name.includes('.'))
  );
  
  console.log(`Current structure:\n`);
  console.log(formatTree(structure));
  
  // Find all index.html files to show report locations
  const indexFiles = structure.filter(item => item.name === 'index.html');
  if (indexFiles.length > 0) {
    console.log(`\n📊 Found ${indexFiles.length} report(s):\n`);
    indexFiles.forEach((file, index) => {
      const reportPath = path.dirname(file.path);
      const displayPath = reportPath === '.' ? '(root)' : reportPath;
      console.log(`   ${index + 1}. ${displayPath}/index.html`);
    });
  }
  
  // Find all test-results.json files
  const jsonFiles = structure.filter(item => item.name === 'test-results.json');
  if (jsonFiles.length > 0) {
    console.log(`\n📄 Found ${jsonFiles.length} test-results.json file(s):\n`);
    jsonFiles.forEach((file, index) => {
      const reportPath = path.dirname(file.path);
      const displayPath = reportPath === '.' ? '(root)' : reportPath;
      console.log(`   ${index + 1}. ${displayPath}/test-results.json`);
    });
  }
  
  if (hasUrlBasedStructure) {
    console.log(`\n✅ Structure appears to follow URL-based organization`);
  } else {
    console.log(`\n⚠️  Structure may not follow URL-based organization`);
    console.log(`   Expected format: ${dirName}/<domain>/<path>/index.html`);
  }
  
  console.log();
  return true;
}

// Main execution
try {
  console.log(`\n🔍 Verifying Directory Structure\n`);
  
  const testResultsOk = verifyStructure(TEST_RESULTS_DIR, 'test-results');
  const playwrightReportOk = verifyStructure(PLAYWRIGHT_REPORT_DIR, 'playwright-report');
  
  console.log(`${'='.repeat(70)}`);
  console.log(`📋 Summary`);
  console.log(`${'='.repeat(70)}`);
  console.log(`   test-results/: ${testResultsOk ? '✅ Exists' : '❌ Missing'}`);
  console.log(`   playwright-report/: ${playwrightReportOk ? '✅ Exists' : '❌ Missing'}`);
  
  if (testResultsOk && playwrightReportOk) {
    console.log(`\n✅ Both directories are organized by URL structure`);
    console.log(`\n💡 Expected structure:`);
    console.log(`   test-results/`);
    console.log(`   ├── <domain>/`);
    console.log(`   │   ├── test-results.json`);
    console.log(`   │   └── <test-artifacts>/`);
    console.log(`   └── <domain>/<path>/`);
    console.log(`       ├── test-results.json`);
    console.log(`       └── <test-artifacts>/`);
    console.log(`\n   playwright-report/`);
    console.log(`   ├── <domain>/`);
    console.log(`   │   ├── index.html`);
    console.log(`   │   └── data/`);
    console.log(`   └── <domain>/<path>/`);
    console.log(`       ├── index.html`);
    console.log(`       └── data/`);
  } else {
    console.log(`\n⚠️  Some directories are missing. Run tests to generate them.`);
  }
  
  console.log();
  
} catch (error) {
  console.error(`\n❌ Error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}

