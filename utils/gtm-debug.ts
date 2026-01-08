import { Page } from '@playwright/test';

/**
 * Debug helper to see what's in the HTML
 */
export async function debugGTMInHTML(page: Page): Promise<void> {
  console.log('\n=== GTM DEBUG INFO ===\n');
  
  // Get HTML content
  const htmlContent = await page.content();
  const outerHTML = await page.evaluate(() => document.documentElement.outerHTML);
  
  console.log('1. Checking HTML content length:');
  console.log(`   - page.content() length: ${htmlContent.length}`);
  console.log(`   - outerHTML length: ${outerHTML.length}\n`);
  
  // Check for googletagmanager.com
  const hasGoogleTagManager = htmlContent.includes('googletagmanager.com');
  console.log(`2. Contains "googletagmanager.com": ${hasGoogleTagManager ? '✅ YES' : '❌ NO'}`);
  
  // Check for GTM- pattern
  const gtmPattern = /GTM-[A-Z0-9]+/gi;
  const gtmMatches = htmlContent.match(gtmPattern);
  console.log(`3. GTM patterns found: ${gtmMatches ? gtmMatches.length : 0}`);
  if (gtmMatches) {
    gtmMatches.forEach((match, i) => {
      console.log(`   ${i + 1}. ${match}`);
    });
  }
  
  // Check for noscript iframe
  const hasNoscriptIframe = htmlContent.includes('<noscript>') && htmlContent.includes('ns.html');
  console.log(`\n4. Contains noscript iframe pattern: ${hasNoscriptIframe ? '✅ YES' : '❌ NO'}`);
  
  // Look for the specific pattern
  const noscriptPattern = /googletagmanager\.com\/ns\.html\?id=(GTM-[A-Z0-9]+)/i;
  const noscriptMatch = htmlContent.match(noscriptPattern);
  console.log(`5. Noscript pattern match: ${noscriptMatch ? `✅ Found: ${noscriptMatch[1]}` : '❌ NOT FOUND'}`);
  
  // Show relevant HTML snippets
  console.log('\n6. HTML snippets containing GTM:');
  const lines = htmlContent.split('\n');
  let snippetCount = 0;
  for (let i = 0; i < lines.length && snippetCount < 10; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes('gtm') || line.includes('googletagmanager.com')) {
      console.log(`   Line ${i + 1}: ${line.trim().substring(0, 200)}${line.length > 200 ? '...' : ''}`);
      snippetCount++;
    }
  }
  
  // Check noscript tags
  const noscriptTags = await page.evaluate(() => {
    const noscripts = Array.from(document.querySelectorAll('noscript'));
    return noscripts.map(n => n.innerHTML).filter(h => h.includes('gtm') || h.includes('googletagmanager'));
  });
  
  console.log(`\n7. Noscript tags found: ${noscriptTags.length}`);
  noscriptTags.forEach((tag, i) => {
    console.log(`   Noscript ${i + 1}: ${tag.substring(0, 200)}${tag.length > 200 ? '...' : ''}`);
  });
  
  // Check iframe tags
  const iframeTags = await page.evaluate(() => {
    const iframes = Array.from(document.querySelectorAll('iframe'));
    return iframes.map(iframe => iframe.src).filter(src => src.includes('googletagmanager'));
  });
  
  console.log(`\n8. Iframe tags with googletagmanager: ${iframeTags.length}`);
  iframeTags.forEach((src, i) => {
    console.log(`   Iframe ${i + 1}: ${src}`);
  });
  
  console.log('\n=== END DEBUG INFO ===\n');
}

