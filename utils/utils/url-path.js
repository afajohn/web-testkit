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
 * Creates structure: baseDir/domain/page-name/
 * Example: https://honduraswomen.com/matchmaking-in-honduras.html
 *   => playwright-report/honduraswomen.com/matchmaking-in-honduras/
 * 
 * This ensures each page gets its own folder under the domain folder,
 * preventing reports from overriding each other.
 * 
 * @param {string} url - The URL being tested
 * @param {string} baseDir - Base directory (e.g., 'test-results' or 'playwright-report')
 * @returns {string} - Full folder path
 */
function getUrlBasedPath(url, baseDir = 'test-results') {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, ''); // Remove www. prefix
    const path = require('path');
    
    // Get pathname and remove leading/trailing slashes
    const pathname = urlObj.pathname.replace(/^\/+|\/+$/g, '');
    let pathSegments = pathname ? pathname.split('/').filter(Boolean) : [];
    
    // Extract filename if it exists (for root-level files like index.html, page.html)
    let filename = null;
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1];
      // Check if last segment looks like a filename (has extension)
      if (lastSegment.includes('.') && !lastSegment.match(/^[a-zA-Z0-9_-]+$/)) {
        filename = lastSegment;
        // Remove the filename from pathSegments for directory structure
        pathSegments = pathSegments.slice(0, -1);
      }
    }
    
    // Build the path: baseDir/domain/...pathSegments/[filename-without-extension]/
    const pathParts = [baseDir, domain];
    
    // Add directory path segments
    if (pathSegments.length > 0) {
      pathParts.push(...pathSegments);
    }
    
    // Add filename (without extension) as directory name if it exists
    if (filename) {
      const filenameWithoutExt = filename.replace(/\.[^/.]+$/, ''); // Remove extension
      // Sanitize filename for filesystem (remove invalid chars)
      const sanitizedFilename = filenameWithoutExt.replace(/[<>:"|?*\x00-\x1F]/g, '-');
      pathParts.push(sanitizedFilename);
    }
    
    return path.join(...pathParts);
  } catch (error) {
    throw new Error(`Invalid URL: ${url} - ${error.message}`);
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

/**
 * Generate a unique folder path for test results based on URL
 * Checks if the path exists, and if so, adds a unique suffix
 * Creates structure: baseDir/domain/page-name[-unique-suffix]/
 * 
 * This prevents folder collisions when multiple URLs map to the same path,
 * or when the same URL is tested multiple times.
 * 
 * @param {string} url - The URL being tested
 * @param {string} baseDir - Base directory (e.g., 'test-results' or 'playwright-report')
 * @param {object} options - Options object
 * @param {boolean} options.checkExists - Whether to check if path exists and make it unique (default: true)
 * @returns {string} - Unique folder path
 */
function getUniqueUrlBasedPath(url, baseDir = 'test-results', options = {}) {
  const { checkExists = true } = options;
  const crypto = require('crypto');
  const fs = require('fs');
  const path = require('path');
  
  // Get base path
  let basePath = getUrlBasedPath(url, baseDir);
  
  // If we don't need to check for uniqueness, return base path
  if (!checkExists) {
    return basePath;
  }
  
  // Check if path exists
  const fullBasePath = path.isAbsolute(basePath) ? basePath : path.join(process.cwd(), basePath);
  
  if (!fs.existsSync(fullBasePath)) {
    // Path doesn't exist, it's unique - return as-is
    return basePath;
  }
  
  // Path exists, need to make it unique
  // Generate a short hash from the full URL to ensure uniqueness
  const urlHash = crypto.createHash('md5').update(url).digest('hex').substring(0, 6);
  
  // Extract the last part of the path (the page name)
  const pathParts = basePath.split(path.sep);
  const lastPart = pathParts[pathParts.length - 1];
  
  // Add hash suffix to the last part
  const uniqueLastPart = `${lastPart}-${urlHash}`;
  pathParts[pathParts.length - 1] = uniqueLastPart;
  
  let uniquePath = path.join(...pathParts);
  let fullUniquePath = path.isAbsolute(uniquePath) ? uniquePath : path.join(process.cwd(), uniquePath);
  
  // Double-check the unique path doesn't exist (very unlikely but possible)
  let counter = 0;
  while (fs.existsSync(fullUniquePath)) {
    // If it still exists (collision), add counter
    counter++;
    pathParts[pathParts.length - 1] = `${lastPart}-${urlHash}-${counter}`;
    uniquePath = path.join(...pathParts);
    fullUniquePath = path.isAbsolute(uniquePath) ? uniquePath : path.join(process.cwd(), uniquePath);
  }
  
  return uniquePath;
}

module.exports = {
  parseUrlToPath,
  getUrlBasedPath,
  getUrlDirectoryName,
  getUniqueUrlBasedPath,
};

