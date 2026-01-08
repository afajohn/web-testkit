#!/usr/bin/env node

/**
 * Generate Domain Summary Report
 * 
 * Scans all JSON report files recursively in reports/{domain}/
 * Extracts only failures/issues from each report
 * Aggregates and deduplicates issues
 * Generates a markdown summary report
 * 
 * Usage:
 *   node scripts/generate-domain-summary.js [domain]
 * 
 * Example:
 *   node scripts/generate-domain-summary.js mexicocitydating.com
 */

const fs = require('fs');
const path = require('path');

// Get domain from command line argument or default
const domain = process.argv[2] || 'mexicocitydating.com';
const REPORTS_DIR = path.join(__dirname, '..', 'reports', domain);

if (!fs.existsSync(REPORTS_DIR)) {
  console.error(`❌ Reports directory not found: ${REPORTS_DIR}`);
  console.error(`   Usage: node scripts/generate-domain-summary.js [domain]`);
  process.exit(1);
}

/**
 * Recursively find all JSON files in a directory
 */
function findJsonFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findJsonFiles(filePath, fileList);
    } else if (file.endsWith('.json') && !file.startsWith('error-')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Extract issues from a single report
 */
function extractIssues(report) {
  const issues = {
    url: report.url,
    timestamp: report.timestamp,
    hasIssues: false,
    seo: [],
    brokenLinks: [],
    linksForReview: [],
    accessibility: [],
    gtm: null,
  };

  // SEO failures
  if (report.seo && report.seo.failedChecks && report.seo.failedChecks.length > 0) {
    issues.seo = report.seo.failedChecks;
    issues.hasIssues = true;
  }

  // Broken links
  if (report.brokenLinks && report.brokenLinks.brokenLinks && report.brokenLinks.brokenLinks.length > 0) {
    issues.brokenLinks = report.brokenLinks.brokenLinks;
    issues.hasIssues = true;
  }

  // Links for review (social media links with warnings)
  if (report.brokenLinks && report.brokenLinks.linksForReview && report.brokenLinks.linksForReview.length > 0) {
    issues.linksForReview = report.brokenLinks.linksForReview;
    issues.hasIssues = true;
  }

  // Accessibility violations
  if (report.accessibility && report.accessibility.violations && report.accessibility.violations.length > 0) {
    issues.accessibility = report.accessibility.violations;
    issues.hasIssues = true;
  }

  // GTM missing (if considered an issue)
  if (report.gtm && !report.gtm.hasGTM) {
    issues.gtm = {
      hasGTM: false,
      message: report.gtm.message || 'GTM not found',
    };
    issues.hasIssues = true;
  }

  return issues;
}

/**
 * Deduplicate broken links by URL
 */
function deduplicateBrokenLinks(allIssues) {
  const linkMap = new Map();
  
  allIssues.forEach(issue => {
    issue.brokenLinks.forEach(link => {
      if (!linkMap.has(link.url)) {
        linkMap.set(link.url, {
          url: link.url,
          status: link.status,
          statusText: link.statusText,
          error: link.error,
          foundOnPages: [],
        });
      }
      linkMap.get(link.url).foundOnPages.push({
        url: issue.url,
        elements: link.elements || [],
      });
    });
  });
  
  return Array.from(linkMap.values());
}

/**
 * Extract a clean issue message from a node
 */
function extractIssueMessage(node) {
  // Try to get the most specific message from the 'any' array first
  if (node.any && Array.isArray(node.any) && node.any.length > 0) {
    const message = node.any[0].message;
    if (message && message !== 'N/A') {
      // Clean up the message - remove common prefixes
      return message.trim();
    }
  }
  
  // Fallback to failureSummary, but extract the key part
  if (node.failureSummary) {
    // Extract the first actionable line (usually after "Fix any of the following:")
    const lines = node.failureSummary.split('\n').filter(line => line.trim());
    if (lines.length > 1) {
      // Usually the first actionable line is after the "Fix..." line
      return lines[1].trim();
    }
    return lines[0] || 'N/A';
  }
  
  return 'N/A';
}

/**
 * Group accessibility violations by rule ID, then by issue message
 */
function groupAccessibilityViolations(allIssues) {
  const violationMap = new Map();
  
  allIssues.forEach(issue => {
    issue.accessibility.forEach(violation => {
      const ruleKey = violation.id;
      
      // Initialize rule if not exists
      if (!violationMap.has(ruleKey)) {
        violationMap.set(ruleKey, {
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          help: violation.help,
          helpUrl: violation.helpUrl,
          tags: violation.tags || [],
          issues: new Map(), // Map of issue message -> pages
        });
      }
      
      const rule = violationMap.get(ruleKey);
      
      // Group nodes by issue message
      violation.nodes.forEach(node => {
        const issueMessage = extractIssueMessage(node);
        const selector = node.selector || (node.target && node.target[node.target.length - 1]) || 'N/A';
        
        if (!rule.issues.has(issueMessage)) {
          rule.issues.set(issueMessage, {
            message: issueMessage,
            pages: new Set(), // Use Set to avoid duplicate URLs
            selectors: [], // Keep track of selectors for reference
          });
        }
        
        const issueGroup = rule.issues.get(issueMessage);
        issueGroup.pages.add(issue.url);
        // Add selector if not already in list
        if (!issueGroup.selectors.includes(selector)) {
          issueGroup.selectors.push(selector);
        }
      });
    });
  });
  
  // Convert to array format
  return Array.from(violationMap.values()).map(rule => ({
    id: rule.id,
    impact: rule.impact,
    description: rule.description,
    help: rule.help,
    helpUrl: rule.helpUrl,
    tags: rule.tags,
    issues: Array.from(rule.issues.values()).map(issue => ({
      message: issue.message,
      pages: Array.from(issue.pages),
      selectors: issue.selectors,
    })),
  }));
}

/**
 * Generate markdown report
 */
function generateMarkdown(summary) {
  const lines = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  
  // Header
  lines.push(`# Domain Summary Report: ${summary.domain}`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString().replace('T', ' ').slice(0, -5)}`);
  lines.push(`**Total Pages Tested:** ${summary.totalPagesTested}`);
  lines.push(`**Pages with Issues:** ${summary.pagesWithIssues}`);
  lines.push(`**Pages Passed:** ${summary.pagesPassed}`);
  lines.push(`**Total Issues Found:** ${summary.totalIssues}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Overview
  if (summary.totalIssues === 0) {
    lines.push('## ✅ No Issues Found!');
    lines.push('');
    lines.push('All pages passed all checks successfully.');
    lines.push('');
    return lines.join('\n');
  }

  // SEO Issues
  if (summary.seo.totalFailures > 0) {
    lines.push('## 🔍 SEO Issues');
    lines.push('');
    lines.push(`**Total SEO Failures:** ${summary.seo.totalFailures}`);
    lines.push('');
    
    summary.seo.pages.forEach((page, index) => {
      lines.push(`### ${index + 1}. ${page.url}`);
      lines.push('');
      page.failedChecks.forEach(check => {
        lines.push(`- **${check.check}**: ${check.message || 'Failed'}`);
        if (check.value) {
          lines.push(`  - Value: ${check.value}`);
        }
      });
      lines.push('');
    });
    lines.push('---');
    lines.push('');
  }

  // Broken Links
  if (summary.brokenLinks.totalBroken > 0) {
    lines.push('## 🔗 Broken Links');
    lines.push('');
    lines.push(`**Total Broken Links:** ${summary.brokenLinks.totalBroken} unique URLs`);
    lines.push('');
    
    summary.brokenLinks.uniqueBrokenUrls.forEach((link, index) => {
      lines.push(`### ${index + 1}. ${link.url}`);
      lines.push(`- **Status:** ${link.status} ${link.statusText}`);
      if (link.error) {
        lines.push(`- **Error:** ${link.error}`);
      }
      lines.push(`- **Found on ${link.foundOnPages.length} page(s):**`);
      link.foundOnPages.forEach(page => {
        lines.push(`  - ${page.url}`);
        if (page.elements && page.elements.length > 0) {
          page.elements.forEach((elem, elemIdx) => {
            lines.push(`    - Element ${elemIdx + 1}: \`${elem.selector}\``);
            if (elem.linkText) {
              lines.push(`      - Link Text: "${elem.linkText}"`);
            }
          });
        }
      });
      lines.push('');
    });
    lines.push('---');
    lines.push('');
  }

  // Links for Review
  if (summary.linksForReview.total > 0) {
    lines.push('## ⚠️ Links for Review');
    lines.push('');
    lines.push(`**Total Links for Review:** ${summary.linksForReview.total}`);
    lines.push('');
    lines.push('These links may work in browsers but block automated requests (e.g., social media links).');
    lines.push('');
    
    summary.linksForReview.pages.forEach((page, index) => {
      lines.push(`### ${index + 1}. ${page.url}`);
      lines.push('');
      page.linksForReview.forEach(link => {
        lines.push(`- **${link.url}**`);
        lines.push(`  - Status: ${link.status} ${link.statusText}`);
        if (link.error) {
          lines.push(`  - Note: ${link.error}`);
        }
      });
      lines.push('');
    });
    lines.push('---');
    lines.push('');
  }

  // Accessibility Violations
  if (summary.accessibility.totalViolations > 0) {
    lines.push('## ♿ Accessibility Violations');
    lines.push('');
    lines.push(`**Total Violations:** ${summary.accessibility.totalViolations} instances`);
    lines.push(`**Unique Rule Types:** ${summary.accessibility.violationsByRule.length}`);
    lines.push('');
    
    // Sort by impact (critical, serious, moderate, minor)
    const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    const sortedViolations = summary.accessibility.violationsByRule.sort((a, b) => {
      return (impactOrder[a.impact] || 99) - (impactOrder[b.impact] || 99);
    });
    
    sortedViolations.forEach((violation, index) => {
      lines.push(`### ${index + 1}. ${violation.id} (${violation.impact})`);
      lines.push('');
      lines.push(`**Description:** ${violation.description}`);
      lines.push(`**Help:** ${violation.help}`);
      if (violation.helpUrl) {
        lines.push(`**Help URL:** ${violation.helpUrl}`);
      }
      
      // Count total instances across all issues
      const totalInstances = violation.issues.reduce((sum, issue) => sum + issue.pages.length, 0);
      lines.push(`**Total Instances:** ${totalInstances}`);
      lines.push('');
      
      // Group by issue message
      violation.issues.forEach((issue, issueIndex) => {
        lines.push(`#### Issue ${issueIndex + 1}: ${issue.message}`);
        lines.push('');
        lines.push(`**Affected Pages (${issue.pages.length}):**`);
        issue.pages.forEach(pageUrl => {
          lines.push(`- ${pageUrl}`);
        });
        if (issue.selectors.length > 0 && issue.selectors.length <= 5) {
          lines.push('');
          lines.push(`**Selectors:** ${issue.selectors.map(s => `\`${s}\``).join(', ')}`);
        } else if (issue.selectors.length > 5) {
          lines.push('');
          lines.push(`**Selectors:** ${issue.selectors.length} unique selector(s) (e.g., \`${issue.selectors[0]}\`, \`${issue.selectors[1]}\`, ...)`);
        }
        lines.push('');
      });
    });
    lines.push('---');
    lines.push('');
  }

  // GTM Missing
  if (summary.gtm.pagesWithoutGTM.length > 0) {
    lines.push('## 📊 Missing Google Tag Manager');
    lines.push('');
    lines.push(`**Pages without GTM:** ${summary.gtm.pagesWithoutGTM.length}`);
    lines.push('');
    summary.gtm.pagesWithoutGTM.forEach(page => {
      lines.push(`- ${page.url}`);
      if (page.message) {
        lines.push(`  - ${page.message}`);
      }
    });
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Summary Statistics
  lines.push('## 📊 Summary Statistics');
  lines.push('');
  lines.push('| Category | Count |');
  lines.push('|----------|-------|');
  if (summary.seo.totalFailures > 0) {
    lines.push(`| SEO Failures | ${summary.seo.totalFailures} |`);
  }
  if (summary.brokenLinks.totalBroken > 0) {
    lines.push(`| Broken Links | ${summary.brokenLinks.totalBroken} |`);
  }
  if (summary.linksForReview.total > 0) {
    lines.push(`| Links for Review | ${summary.linksForReview.total} |`);
  }
  if (summary.accessibility.totalViolations > 0) {
    lines.push(`| Accessibility Violations | ${summary.accessibility.totalViolations} |`);
  }
  if (summary.gtm.pagesWithoutGTM.length > 0) {
    lines.push(`| Pages without GTM | ${summary.gtm.pagesWithoutGTM.length} |`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Main function
 */
function main() {
  console.log(`\n🔍 Scanning reports for domain: ${domain}`);
  console.log(`   Directory: ${REPORTS_DIR}`);

  // Find all JSON files
  const jsonFiles = findJsonFiles(REPORTS_DIR);
  
  if (jsonFiles.length === 0) {
    console.error(`\n❌ No JSON report files found in ${REPORTS_DIR}`);
    process.exit(1);
  }

  console.log(`   Found ${jsonFiles.length} report file(s)\n`);

  // Process all reports
  const allIssues = [];
  let totalPagesTested = 0;
  let pagesWithIssues = 0;
  let pagesPassed = 0;

  jsonFiles.forEach(filePath => {
    try {
      const reportContent = fs.readFileSync(filePath, 'utf8');
      const report = JSON.parse(reportContent);
      totalPagesTested++;

      const issues = extractIssues(report);
      
      if (issues.hasIssues) {
        allIssues.push(issues);
        pagesWithIssues++;
      } else {
        pagesPassed++;
      }
    } catch (error) {
      console.warn(`⚠️  Error reading ${filePath}: ${error.message}`);
    }
  });

  // Aggregate issues
  const summary = {
    domain,
    generatedAt: new Date().toISOString(),
    totalPagesTested,
    pagesWithIssues,
    pagesPassed,
    totalIssues: 0,
    seo: {
      totalFailures: 0,
      pages: [],
    },
    brokenLinks: {
      totalBroken: 0,
      uniqueBrokenUrls: [],
    },
    linksForReview: {
      total: 0,
      pages: [],
    },
    accessibility: {
      totalViolations: 0,
      violationsByRule: [],
    },
    gtm: {
      pagesWithoutGTM: [],
    },
  };

  // Aggregate SEO issues
  allIssues.forEach(issue => {
    if (issue.seo.length > 0) {
      summary.seo.totalFailures += issue.seo.length;
      summary.seo.pages.push({
        url: issue.url,
        failedChecks: issue.seo,
      });
    }
  });

  // Aggregate broken links (deduplicated)
  const brokenLinks = deduplicateBrokenLinks(allIssues);
  summary.brokenLinks.totalBroken = brokenLinks.length;
  summary.brokenLinks.uniqueBrokenUrls = brokenLinks;

  // Aggregate links for review
  allIssues.forEach(issue => {
    if (issue.linksForReview.length > 0) {
      summary.linksForReview.total += issue.linksForReview.length;
      summary.linksForReview.pages.push({
        url: issue.url,
        linksForReview: issue.linksForReview,
      });
    }
  });

  // Aggregate accessibility violations (grouped by rule and issue)
  const violations = groupAccessibilityViolations(allIssues);
  summary.accessibility.violationsByRule = violations;
  // Count total instances (sum of all pages across all issues)
  summary.accessibility.totalViolations = violations.reduce((sum, rule) => {
    return sum + rule.issues.reduce((issueSum, issue) => issueSum + issue.pages.length, 0);
  }, 0);

  // Aggregate GTM issues
  allIssues.forEach(issue => {
    if (issue.gtm) {
      summary.gtm.pagesWithoutGTM.push({
        url: issue.url,
        message: issue.gtm.message,
      });
    }
  });

  // Calculate total issues
  summary.totalIssues = 
    summary.seo.totalFailures +
    summary.brokenLinks.totalBroken +
    summary.linksForReview.total +
    summary.accessibility.totalViolations +
    summary.gtm.pagesWithoutGTM.length;

  // Generate markdown
  const markdown = generateMarkdown(summary);

  // Generate filename with timestamp (Philippines local time)
  const now = new Date();
  
  // Convert to Philippines timezone (Asia/Manila, UTC+8)
  // Use Intl.DateTimeFormat to get date parts in Philippines timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // Use 24-hour format
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const hours = parts.find(p => p.type === 'hour').value;
  const minutes = parts.find(p => p.type === 'minute').value;
  
  // Format as yyyy-mm-dd_hh:mm (use dash instead of colon for Windows compatibility)
  const timestamp = `${year}-${month}-${day}_${hours}-${minutes}`;
  const filename = `Report_Summary_${domain.replace(/\./g, '_')}_${timestamp}.md`;
  const outputPath = path.join(REPORTS_DIR, filename);

  // Write markdown file
  fs.writeFileSync(outputPath, markdown, 'utf8');

  // Output summary in a clean, single block
  console.log(`\n✅ Summary report generated successfully!`);
  console.log(`   File: ${outputPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Total Pages: ${totalPagesTested}`);
  console.log(`   - Pages with Issues: ${pagesWithIssues}`);
  console.log(`   - Pages Passed: ${pagesPassed}`);
  console.log(`   - Total Issues: ${summary.totalIssues}`);
  console.log(`   - SEO Failures: ${summary.seo.totalFailures}`);
  console.log(`   - Broken Links: ${summary.brokenLinks.totalBroken}`);
  console.log(`   - Links for Review: ${summary.linksForReview.total}`);
  console.log(`   - Accessibility Violations: ${summary.accessibility.totalViolations}`);
  console.log(`   - Pages without GTM: ${summary.gtm.pagesWithoutGTM.length}\n`);
}

// Run the script
main();

