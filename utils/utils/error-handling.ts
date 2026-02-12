/**
 * Error handling utilities for tests
 */

export interface ErrorContext {
  url: string;
  operation: string;
  error: Error;
}

/**
 * Format error message with URL context
 */
export function formatErrorWithContext(
  url: string,
  operation: string,
  error: Error | string
): string {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? '' : error.stack;
  
  let message = `\n${'='.repeat(80)}\n`;
  message += `ERROR OCCURRED DURING TEST\n`;
  message += `${'='.repeat(80)}\n`;
  message += `URL: ${url}\n`;
  message += `Operation: ${operation}\n`;
  message += `Error: ${errorMessage}\n`;
  if (errorStack) {
    message += `\nStack Trace:\n${errorStack}\n`;
  }
  message += `${'='.repeat(80)}\n`;
  
  return message;
}

/**
 * Get current page URL safely
 */
export async function getCurrentUrl(page: any): Promise<string> {
  try {
    return page.url();
  } catch {
    return 'unknown';
  }
}

