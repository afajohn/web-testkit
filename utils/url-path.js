/**
 * Utility functions for generating folder paths based on URLs
 */

/**
 * Generate a safe folder name from a URL
 * @param {string} url - The URL to parse
 * @returns {object} - Object with domain and pathSegments
 */
function parseUrlToPath(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, ''); // Remove www. prefix
    
    // Get pathname and remove leading/trailing slashes, then split
    const pathname = urlObj.pathname.replace(/^\/+|\/+$/g, '');
    let pathSegments = pathname ? pathname.split('/').filter(Boolean) : [];
    
    // Remove filename if it exists (has extension like .html, .php, etc.)
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1];
      // Check if last segment looks like a filename (has extension and no special chars that suggest it's a directory)
      if (lastSegment.includes('.') && !lastSegment.match(/^[a-zA-Z0-9_-]+$/)) {
        // Remove the filename, keep only directory structure
        pathSegments = pathSegments.slice(0, -1);
      }
    }
    
    return {
      domain,
      pathSegments,
      fullPath: pathSegments.length > 0 ? pathSegments.join('/') : '',
    };
  } catch (error) {
    throw new Error(`Invalid URL: ${url} - ${error.message}`);
  }
}

/**
 * Generate folder path for test results based on URL
 * @param {string} url - The URL being tested
 * @param {string} baseDir - Base directory (e.g., 'test-results' or 'playwright-report')
 * @returns {string} - Full folder path
 */
function getUrlBasedPath(url, baseDir = 'test-results') {
  const { domain, pathSegments } = parseUrlToPath(url);
  const path = require('path');
  
  if (pathSegments.length === 0) {
    // Root URL, just use domain
    return path.join(baseDir, domain);
  } else {
    // Has path, use domain as root and path segments as subdirectories
    return path.join(baseDir, domain, ...pathSegments);
  }
}

/**
 * Get the directory name (last segment) for file naming
 * @param {string} url - The URL being tested
 * @returns {string} - Directory name (last path segment or 'root')
 */
function getUrlDirectoryName(url) {
  const { pathSegments } = parseUrlToPath(url);
  return pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : 'root';
}

module.exports = {
  parseUrlToPath,
  getUrlBasedPath,
  getUrlDirectoryName,
};

