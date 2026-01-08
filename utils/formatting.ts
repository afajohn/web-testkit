/**
 * Shared formatting utilities for consistent report output
 */

const DEFAULT_WIDTH = 100;

/**
 * Format a section header with consistent styling
 */
export function formatSectionHeader(title: string, width: number = DEFAULT_WIDTH): string {
  let header = `\n${'='.repeat(width)}\n`;
  header += `${title.toUpperCase()}\n`;
  header += `${'='.repeat(width)}\n`;
  return header;
}

/**
 * Format a table row with consistent styling
 */
export function formatTableRow(columns: string[], widths: number[]): string {
  if (columns.length !== widths.length) {
    throw new Error('Columns and widths arrays must have the same length');
  }

  let row = '│';
  columns.forEach((col, index) => {
    const truncated = col.length > widths[index] 
      ? col.substring(0, widths[index] - 3) + '...' 
      : col;
    row += ` ${truncated.padEnd(widths[index])} │`;
  });
  return row;
}

/**
 * Format a table header row
 */
export function formatTableHeader(columns: string[], widths: number[]): string {
  let header = formatTableRow(columns, widths);
  header += '\n';
  
  // Add separator line
  header += '├';
  widths.forEach((width, index) => {
    header += '─'.repeat(width + 2);
    if (index < widths.length - 1) {
      header += '┤';
    }
  });
  header += '┤\n';
  
  return header;
}

/**
 * Format a separator line
 */
export function formatSeparator(char: string = '─', width: number = DEFAULT_WIDTH): string {
  return char.repeat(width);
}

/**
 * Format a test section header with URL
 */
export function formatTestHeader(testName: string, url: string, width: number = DEFAULT_WIDTH): string {
  let header = `\n${'='.repeat(width)}\n`;
  header += `${testName.toUpperCase()}\n`;
  header += `${'='.repeat(width)}\n`;
  header += `URL: ${url}\n`;
  header += `${'─'.repeat(width)}\n\n`;
  return header;
}

/**
 * Format a subsection header
 */
export function formatSubsectionHeader(title: string, width: number = DEFAULT_WIDTH): string {
  return `${title}\n${'─'.repeat(width)}\n`;
}

/**
 * Unified report template interface
 */
export interface ReportItem {
  label: string;
  value: string | number;
  status: 'passed' | 'failed' | 'warning' | 'info';
  details?: string;
}

export interface ReportSection {
  title: string;
  items: ReportItem[];
}

export interface UnifiedReportOptions {
  testName: string;
  url?: string;
  summary: ReportItem[];
  sections?: ReportSection[];
  footer?: string;
}

/**
 * Generate a unified report using a consistent template
 * This ensures all test outputs follow the same format
 * 
 * Usage:
 * ```typescript
 * const report = formatUnifiedReport({
 *   testName: 'SEO Check',
 *   url: 'https://example.com',
 *   summary: [
 *     { label: 'Total Checks', value: 6, status: 'info' },
 *     { label: 'Passed', value: 5, status: 'passed' },
 *     { label: 'Failed', value: 1, status: 'failed' }
 *   ],
 *   sections: [
 *     {
 *       title: 'Failed Checks',
 *       items: [
 *         { label: 'Meta Description', value: 'Too long (341 chars)', status: 'failed', details: 'Recommended: 50-160 chars' }
 *       ]
 *     }
 *   ]
 * });
 * ```
 */
export function formatUnifiedReport(options: UnifiedReportOptions): string {
  const { testName, url, summary, sections = [], footer } = options;
  
  let report = '';
  
  // Header
  report += formatSectionHeader(`${testName.toUpperCase()} RESULTS`);
  if (url) {
    report += `URL: ${url}\n`;
    report += `${formatSeparator()}\n\n`;
  }
  
  // Summary Section
  report += `SUMMARY:\n`;
  report += `${formatSeparator()}\n`;
  report += formatTableHeader(
    ['Metric', 'Value', 'Status'],
    [40, 20, 30]
  );
  
  summary.forEach(item => {
    const statusIcon = getStatusIcon(item.status);
    const statusText = getStatusText(item.status, item.value);
    report += formatTableRow(
      [item.label, String(item.value), `${statusIcon} ${statusText}`],
      [40, 20, 30]
    );
  });
  
  report += `${formatSeparator()}\n\n`;
  
  // Check if all passed
  const allPassed = summary.every(item => item.status === 'passed' || item.status === 'info');
  const hasFailures = summary.some(item => item.status === 'failed');
  
  if (allPassed && !hasFailures && sections.length === 0) {
    report += `✅ All checks passed!\n`;
    report += `\n${formatSeparator('=')}\n`;
    return report;
  }
  
  // Detail Sections
  sections.forEach(section => {
    if (section.items.length === 0) return;
    
    report += `${section.title.toUpperCase()}:\n`;
    report += `${formatSeparator()}\n`;
    
    section.items.forEach((item, index) => {
      const statusIcon = getStatusIcon(item.status);
      report += `\n${index + 1}. ${statusIcon} ${item.label}\n`;
      if (item.value) {
        report += `   Value: ${item.value}\n`;
      }
      if (item.details) {
        // Handle multi-line details
        const detailLines = item.details.split('\n');
        detailLines.forEach(line => {
          report += `   ${line}\n`;
        });
      }
    });
    
    report += `\n`;
  });
  
  // Footer
  if (footer) {
    report += `${formatSeparator()}\n`;
    report += `${footer}\n`;
  }
  
  report += `\n${formatSeparator('=')}\n`;
  return report;
}

/**
 * Get status icon based on status type
 */
function getStatusIcon(status: 'passed' | 'failed' | 'warning' | 'info'): string {
  switch (status) {
    case 'passed':
      return '✅';
    case 'failed':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return '•';
  }
}

/**
 * Get status text based on status type and value
 */
function getStatusText(status: 'passed' | 'failed' | 'warning' | 'info', value: string | number): string {
  switch (status) {
    case 'passed':
      return 'PASSED';
    case 'failed':
      return typeof value === 'number' && value > 0 ? `FAILED (${value})` : 'FAILED';
    case 'warning':
      return typeof value === 'number' && value > 0 ? `${value} need${value > 1 ? 's' : ''} review` : 'WARNING';
    case 'info':
      return 'INFO';
    default:
      return '';
  }
}

