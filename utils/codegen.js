#!/usr/bin/env node

/**
 * Playwright Codegen Helper Script
 * 
 * IMPORTANT: Codegen is for GENERATING test code, NOT running tests.
 * Videos are only saved when you RUN tests with: npm test or npx playwright test
 * 
 * Usage:
 *   node codegen.js <URL> [viewportWidth] [viewportHeight]
 *   node codegen.js <URL> --viewport-size="width,height"
 * 
 * Examples:
 *   node codegen.js https://example.com 1920 1080
 *   node codegen.js https://example.com --viewport-size="1920,1080"
 *   node codegen.js https://example.com (defaults to 1280x720)
 */

const { spawn } = require('child_process');
const args = process.argv.slice(2); 

if (args.length === 0) {
  console.error('Usage: node codegen.js <URL> [viewportWidth] [viewportHeight]');
  console.error('   or: node codegen.js <URL> --viewport-size="width,height"');
  console.error('');
  console.error('Examples:');
  console.error('  node codegen.js https://anewbride.com/tour/things-to-consider-on-singles-tours.html 1920 1080');
  console.error('  node codegen.js https://anewbride.com/tour/things-to-consider-on-singles-tours.html --viewport-size="1920,1080"');
  console.error('  node codegen.js https://anewbride.com/tour/things-to-consider-on-singles-tours.html (defaults to 1280x720)');
  console.error('');
  console.error('NOTE: Codegen generates test code only. Videos are saved when you RUN tests:');
  console.error('  npm test');
  console.error('  npx playwright test');
  process.exit(1);
}

const url = args[0];
let viewportWidth = '1280';
let viewportHeight = '720';

// Check if viewport-size flag is provided
const viewportSizeIndex = args.findIndex(arg => arg.startsWith('--viewport-size'));
if (viewportSizeIndex !== -1) {
  const viewportSizeArg = args[viewportSizeIndex];
  const sizeMatch = viewportSizeArg.match(/--viewport-size=["']?(\d+),(\d+)/);
  if (sizeMatch) {
    viewportWidth = sizeMatch[1];
    viewportHeight = sizeMatch[2];
  }
} else {
  // Use positional arguments
  if (args[1] && !isNaN(args[1])) viewportWidth = args[1];
  if (args[2] && !isNaN(args[2])) viewportHeight = args[2];
}

const codegenArgs = [
  'codegen',
  url,
  '--viewport-size',
  `${viewportWidth},${viewportHeight}`
];

console.log(`Starting Playwright codegen with:`);
console.log(`  URL: ${url}`);
console.log(`  Viewport: ${viewportWidth}x${viewportHeight}`);
console.log('');
console.log('⚠️  Remember: Codegen generates test code. Videos are saved when you RUN tests.');
console.log('   Run: npm test  or  npx playwright test\n');

const codegen = spawn('npx', ['playwright', ...codegenArgs], {
  stdio: 'inherit',
  shell: true
});

codegen.on('close', (code) => {
  process.exit(code);
});

