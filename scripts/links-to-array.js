#!/usr/bin/env node

/**
 * Links to Array Converter
 * Reads links from the same file and replaces the file content with a formatted array
 * 
 * Usage:
 *   1. Paste your links in this file (below this comment block)
 *   2. Run: node scripts/links-to-array.js
 *   3. The file will be replaced with the formatted array
 * 
 * Or specify a different file:
 *   node scripts/links-to-array.js my-links.txt
 *   node scripts/links-to-array.js my-links.txt -v myLinksArray
 *   npm run transform:links
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_VAR_NAME = 'linksArray';

/**
 * Extract links from text (handles various formats)
 */
function extractLinks(text) {
  const lines = text.split('\n');
  const links = [];
  
  // JavaScript keywords and code patterns to skip
  const jsKeywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'require', 'module', 'exports', 'import', 'export', 'class', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'typeof', 'instanceof'];
  const jsPatterns = [/^const\s+/, /^let\s+/, /^var\s+/, /^function\s+/, /^class\s+/, /^import\s+/, /^export\s+/, /^async\s+/, /^await\s+/, /^return\s+/, /^if\s*\(/, /^for\s*\(/, /^while\s*\(/, /^try\s*\{/, /^catch\s*\(/, /^throw\s+/, /^new\s+/, /^this\./, /^typeof\s+/, /^instanceof\s+/, /^\/\//, /^\/\*/, /^\*\//, /^#!/, /^require\(/, /^module\./, /^exports\./];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Skip comment lines
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('#!/')) {
      continue;
    }
    
    // Skip JavaScript code patterns
    let isJsCode = false;
    for (const pattern of jsPatterns) {
      if (pattern.test(trimmed)) {
        isJsCode = true;
        break;
      }
    }
    
    // Check for JavaScript keywords at the start
    if (!isJsCode) {
      const firstWord = trimmed.split(/\s+/)[0];
      if (jsKeywords.includes(firstWord)) {
        isJsCode = true;
      }
    }
    
    if (isJsCode) {
      continue;
    }
    
    // Only extract complete URLs that start with http:// or https://
    // This ensures we don't accidentally parse code
    if (trimmed.match(/^https?:\/\/[^\s]+/)) {
      let url = trimmed.trim();
      
      // Clean up URL (remove trailing punctuation, quotes, etc.)
      url = url.replace(/[.,;:!?)\]}'"`]+$/, '');
      
      // Validate it's a complete URL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        if (!links.includes(url)) {
          links.push(url);
        }
      }
    } else if (trimmed.match(/^www\.[^\s]+/)) {
      // Handle www. URLs
      let url = trimmed.trim();
      url = url.replace(/[.,;:!?)\]}'"`]+$/, '');
      url = 'https://' + url;
      if (!links.includes(url)) {
        links.push(url);
      }
    }
  }
  
  return links;
}

/**
 * Convert links array to JavaScript array format
 */
function formatAsArray(links, varName = DEFAULT_VAR_NAME) {
  const indent = '  ';
  const formatted = links.map(link => {
    return `${indent}'${link.replace(/'/g, "\\'")}',`;
  }).join('\n');
  
  return `const ${varName} = [\n${formatted}\n];\n\nmodule.exports = ${varName};`;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  let filePath = __filename; // Default to this script file
  let varName = DEFAULT_VAR_NAME;
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--var' || arg === '-v') {
      varName = args[++i] || DEFAULT_VAR_NAME;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Links to Array Converter

Usage:
  node scripts/links-to-array.js [file] [options]

Arguments:
  file                  File to process (default: the script file itself)

Options:
  -v, --var NAME        Variable name (default: linksArray)
  -h, --help            Show this help message

Examples:
  # Process this script file (paste links in the file, then run):
  node scripts/links-to-array.js
  
  # Process a specific file:
  node scripts/links-to-array.js my-links.txt
  
  # Custom variable name:
  node scripts/links-to-array.js my-links.txt -v myLinksArray
      `);
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      // Assume it's a file path
      filePath = path.resolve(arg);
    }
  }
  
  // Read file
  let fileContent;
  try {
    fileContent = fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file: ${error.message}`);
    process.exit(1);
  }
  
  // Extract links
  const links = extractLinks(fileContent);
  
  if (links.length === 0) {
    console.error('No links found in the file.');
    console.error('Please paste your links in the file and try again.');
    process.exit(1);
  }
  
  // Format as array
  const arrayCode = formatAsArray(links, varName);
  
  // Write back to the same file
  try {
    fs.writeFileSync(filePath, arrayCode, 'utf-8');
    console.log(`✅ Converted ${links.length} links to array format in ${path.basename(filePath)}`);
    console.log(`   Variable name: ${varName}`);
  } catch (error) {
    console.error(`Error writing file: ${error.message}`);
    process.exit(1);
  }
}

// Run main function
main();
