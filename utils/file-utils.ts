import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';

/**
 * Generate a safe filename from a URL (legacy function - only returns filename)
 * Example: https://example.com/page.html -> page.json
 * Example: https://example.com/about -> about.json
 * 
 * @deprecated Use getFilePathFromUrl for folder-based organization
 */
export function getFilenameFromUrl(url: string, extension: string = 'json'): string {
  try {
    const urlObj = new URL(url);
    let filename = urlObj.pathname;
    
    // Remove leading slash
    if (filename.startsWith('/')) {
      filename = filename.substring(1);
    }
    
    // If empty (root path), use domain name
    if (!filename || filename === '/') {
      filename = urlObj.hostname.replace(/\./g, '-');
    } else {
      // Extract just the last part of the path (the filename)
      const pathParts = filename.split('/').filter(part => part.length > 0);
      filename = pathParts[pathParts.length - 1];
      
      // Remove .html extension if present
      if (filename.endsWith('.html')) {
        filename = filename.substring(0, filename.length - 5);
      }
      
      // If no extension was present and it's still a path, use the last part
      if (filename.includes('/')) {
        const parts = filename.split('/');
        filename = parts[parts.length - 1];
      }
    }
    
    // Sanitize filename: remove invalid characters
    filename = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    
    // Ensure filename is not empty
    if (!filename || filename.trim().length === 0) {
      filename = 'index';
    }
    
    // Add extension
    return `${filename}.${extension}`;
  } catch (error) {
    // If URL parsing fails, use a default name
    return `report-${Date.now()}.${extension}`;
  }
}

/**
 * Generate a full file path from a URL with folder structure based on URL path
 * Example: https://mexicocitydating.com/invar/ssi-common/advanced-search/
 *          -> mexicocitydating.com/invar/ssi-common/advanced-search.json
 * Example: https://mexicocitydating.com/about-mexico-city-dating.html 
 *          -> mexicocitydating.com/root/about-mexico-city-dating.json
 * Example: https://example.com/ -> example.com/root/index.json
 * 
 * @param url - The URL to convert
 * @param baseDir - Base directory for reports (default: 'reports')
 * @param extension - File extension (default: 'json')
 * @returns Full file path relative to baseDir
 */
export function getFilePathFromUrl(url: string, baseDir: string = 'reports', extension: string = 'json'): string {
  try {
    const urlObj = new URL(url);
    
    // Get domain (remove www. prefix)
    const domain = urlObj.hostname.replace(/^www\./, '');
    
    // Get pathname and remove leading/trailing slashes
    let urlPath = urlObj.pathname.replace(/^\/+|\/+$/g, '');
    
    // Split path into segments
    const pathSegments = urlPath ? urlPath.split('/').filter(part => part.length > 0) : [];
    
    // Process the last segment (filename)
    let filename = 'index'; // Default for root URLs
    
    if (pathSegments.length > 0) {
      let lastSegment = pathSegments[pathSegments.length - 1];
      
      // Check if last segment has an extension (is a file)
      if (lastSegment.includes('.') && !lastSegment.match(/^[a-zA-Z0-9_-]+$/)) {
        // It's a filename, remove extension for our JSON filename
        const extMatch = lastSegment.match(/\.([^.]+)$/);
        if (extMatch) {
          filename = lastSegment.substring(0, lastSegment.lastIndexOf('.'));
          // Remove this segment from path (it's the filename, not a directory)
          pathSegments.pop();
        } else {
          filename = lastSegment;
          pathSegments.pop();
        }
      } else {
        // Last segment is a directory, use it as filename
        filename = lastSegment;
        pathSegments.pop();
      }
      
      // Sanitize filename
      filename = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
      
      // Ensure filename is not empty
      if (!filename || filename.trim().length === 0) {
        filename = 'index';
      }
    }
    
    // Sanitize path segments (directory names)
    const sanitizedSegments = pathSegments.map(segment => 
      segment.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    );
    
    // Build the full path: baseDir/domain/path/segments/filename.ext
    // If no path segments (root-level file), use 'root' folder
    const folderPath = sanitizedSegments.length > 0
      ? path.join(domain, ...sanitizedSegments)
      : path.join(domain, 'root');
    
    return path.join(folderPath, `${filename}.${extension}`);
  } catch (error) {
    // If URL parsing fails, use a default name
    return path.join(`report-${Date.now()}.${extension}`);
  }
}

/**
 * Ensure directory exists, create if it doesn't
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Write JSON data to a file
 */
export function writeJsonFile(filePath: string, data: any): void {
  ensureDirectoryExists(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Write text data to a file
 */
export function writeTextFile(filePath: string, data: string): void {
  ensureDirectoryExists(path.dirname(filePath));
  fs.writeFileSync(filePath, data, 'utf8');
}
