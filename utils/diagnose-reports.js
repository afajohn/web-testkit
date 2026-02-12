#!/usr/bin/env node

/**
 * Diagnostic script to verify report generation issues
 * This script checks each step of the report generation process
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { getUrlBasedPath } = require('./utils/url-path');

const urls = [
  'https://honduraswomen.com/new-honduras-women-profiles.html',
  'https://honduraswomen.com/more-about-honduras-women.html',
  'https://honduraswomen.com/matchmaking-in-honduras.html'
];

console.log('='.repeat(70));
console.log('DIAGNOSTIC REPORT - Verifying Report Generation Issues');
console.log('='.repeat(70));

// Step 1: Check if blob reports exist
console.log('\n📦 STEP 1: Checking Blob Reports');
console.log('-'.repeat(70));
let blobReportsFound = 0;
const blobPaths = new Map();

for (const url of urls) {
  const blobReportDir = getUrlBasedPath(url, 'blob-reports');
  const blobReportPath = path.join(__dirname, blobReportDir);
  
  console.log(`\nURL: ${url}`);
  console.log(`  Expected blob path: ${blobReportPath}`);
  
  if (fs.existsSync(blobReportPath)) {
    const files = fs.readdirSync(blobReportPath);
    const zipFiles = files.filter(f => f.endsWith('.zip'));
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
    
    console.log(`  ✅ Directory exists`);
    console.log(`  Files found: ${files.length} total`);
    console.log(`    - ZIP files: ${zipFiles.length} (${zipFiles.join(', ')})`);
    console.log(`    - JSONL files: ${jsonlFiles.length}`);
    
    if (zipFiles.length > 0) {
      blobReportsFound++;
      blobPaths.set(url, blobReportPath);
      console.log(`  ✅ Blob report found - will be used for merge`);
    } else {
      console.log(`  ❌ No ZIP files found in blob directory`);
    }
  } else {
    console.log(`  ❌ Directory does not exist`);
  }
}

console.log(`\n📊 Summary: ${blobReportsFound}/${urls.length} blob reports found`);

// Step 2: Test merge command for each blob report
console.log('\n\n🔄 STEP 2: Testing Merge Commands');
console.log('-'.repeat(70));

let mergeTestsPassed = 0;

for (const url of urls) {
  const blobPath = blobPaths.get(url);
  if (!blobPath) {
    console.log(`\n⚠️  Skipping ${url} - no blob report found`);
    continue;
  }
  
  console.log(`\nURL: ${url}`);
  console.log(`  Blob path: ${blobPath}`);
  
  // Test the exact command that would be generated
  const quotedBlobPath = JSON.stringify(blobPath);
  const mergeCommand = `npx playwright merge-reports --reporter=html ${quotedBlobPath}`;
  
  console.log(`  Command: ${mergeCommand}`);
  
  // Check if playwright-report exists before merge
  const defaultReportDir = path.join(__dirname, 'playwright-report');
  const hadReportBefore = fs.existsSync(defaultReportDir);
  if (hadReportBefore) {
    console.log(`  ⚠️  playwright-report directory already exists (will be overwritten)`);
  }
  
  // Run merge command
  console.log(`  Running merge command...`);
  
  exec(mergeCommand, {
    cwd: __dirname,
    maxBuffer: 10 * 1024 * 1024,
  }, (error, stdout, stderr) => {
    if (error) {
      console.log(`  ❌ Merge failed: ${error.message}`);
      if (stderr) {
        console.log(`  Error output: ${stderr}`);
      }
    } else {
      console.log(`  ✅ Merge command executed`);
      if (stdout) {
        const lines = stdout.split('\n').filter(l => l.trim());
        console.log(`  Output: ${lines.slice(0, 5).join(' | ')}`);
      }
      
      // Check if report was created
      const defaultIndex = path.join(defaultReportDir, 'index.html');
      if (fs.existsSync(defaultIndex)) {
        const stats = fs.statSync(defaultIndex);
        console.log(`  ✅ HTML report created: ${defaultIndex}`);
        console.log(`     Size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`     Modified: ${stats.mtime}`);
        mergeTestsPassed++;
      } else {
        console.log(`  ❌ HTML report NOT found at: ${defaultIndex}`);
      }
    }
  });
}

// Step 3: Check expected HTML report locations
console.log('\n\n📁 STEP 3: Checking Expected HTML Report Locations');
console.log('-'.repeat(70));

let htmlReportsFound = 0;

for (const url of urls) {
  const htmlReportDir = getUrlBasedPath(url, 'playwright-report');
  const htmlReportPath = path.join(__dirname, htmlReportDir);
  const indexPath = path.join(htmlReportPath, 'index.html');
  
  console.log(`\nURL: ${url}`);
  console.log(`  Expected path: ${htmlReportPath}`);
  console.log(`  Expected index: ${indexPath}`);
  
  if (fs.existsSync(indexPath)) {
    const stats = fs.statSync(indexPath);
    console.log(`  ✅ HTML report exists`);
    console.log(`     Size: ${(stats.size / 1024).toFixed(2)} KB`);
    htmlReportsFound++;
  } else {
    console.log(`  ❌ HTML report NOT found`);
    if (fs.existsSync(htmlReportPath)) {
      const files = fs.readdirSync(htmlReportPath);
      console.log(`     Directory exists but contains: ${files.join(', ')}`);
    } else {
      console.log(`     Directory does not exist`);
    }
  }
}

console.log(`\n📊 Summary: ${htmlReportsFound}/${urls.length} HTML reports found`);

// Step 4: Check consolidated index
console.log('\n\n📄 STEP 4: Checking Consolidated Index');
console.log('-'.repeat(70));

const consolidatedIndex = path.join(__dirname, 'playwright-report', 'index.html');
if (fs.existsSync(consolidatedIndex)) {
  const stats = fs.statSync(consolidatedIndex);
  console.log(`✅ Consolidated index exists: ${consolidatedIndex}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   Modified: ${stats.mtime}`);
  
  // Read and check content
  const content = fs.readFileSync(consolidatedIndex, 'utf-8');
  const reportCount = (content.match(/Report file not found/g) || []).length;
  const availableCount = (content.match(/View Report/g) || []).length;
  
  console.log(`   Contains: ${reportCount} "Report file not found" warnings`);
  console.log(`   Contains: ${availableCount} "View Report" links`);
} else {
  console.log(`❌ Consolidated index NOT found`);
}

// Final Summary
console.log('\n\n' + '='.repeat(70));
console.log('DIAGNOSTIC SUMMARY');
console.log('='.repeat(70));
console.log(`Blob Reports Found: ${blobReportsFound}/${urls.length}`);
console.log(`HTML Reports Found: ${htmlReportsFound}/${urls.length}`);
console.log(`Merge Tests Passed: ${mergeTestsPassed}/${blobReportsFound}`);

if (blobReportsFound > 0 && htmlReportsFound === 0) {
  console.log('\n🔍 ISSUE IDENTIFIED:');
  console.log('   Blob reports exist but HTML reports are missing.');
  console.log('   This suggests the merge process is failing or not completing.');
} else if (blobReportsFound === 0) {
  console.log('\n🔍 ISSUE IDENTIFIED:');
  console.log('   No blob reports found. Tests may be failing before blob generation.');
} else if (htmlReportsFound === blobReportsFound) {
  console.log('\n✅ All reports generated successfully!');
}

console.log('='.repeat(70));

