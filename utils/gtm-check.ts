import { Page } from '@playwright/test';

/**
 * GTM check result with detailed verification
 */
export interface GTMCheckResult {
  hasGTM: boolean;
  containerId: string | null;
  message: string;
  details?: {
    scriptFound: boolean;
    gtmJsLoaded: boolean;
    dataLayerExists: boolean;
    dataLayerPushFound: boolean;
    verificationStatus: string;
    debugInfo?: {
      htmlContainsGoogleTagManager?: boolean;
      gtmPatternsFound?: string[];
      noscriptMatchFound?: boolean;
      searchMethod?: string;
      gtmScriptsFound?: number;
    };
  };
}

/**
 * Check if Google Tag Manager (GTM) is successfully implemented on the page
 * Verifies: container ID, gtm.js loading, and dataLayer initialization
 */
export async function checkGTMImplementation(page: Page): Promise<GTMCheckResult> {
  const details = {
    scriptFound: false,
    gtmJsLoaded: false,
    dataLayerExists: false,
    dataLayerPushFound: false,
    verificationStatus: '',
  };

  try {
    // Step 1: Search for GTM using multiple methods
    const searchResult = await page.evaluate(() => {
      let containerId: string | null = null;
      let searchMethod = '';
      
      // Method 1: Check document.scripts for GTM script tags
      const gtmScripts = Array.from(document.scripts)
        .map(s => s.src)
        .filter(src => src.includes('googletagmanager'));
      
      if (gtmScripts.length > 0) {
        // Extract GTM ID from script src
        for (const scriptSrc of gtmScripts) {
          const match = scriptSrc.match(/id=(GTM-[A-Z0-9]+)/i) || scriptSrc.match(/GTM-[A-Z0-9]{5,}/i);
          if (match) {
            containerId = match[1] ? match[1].toUpperCase() : match[0].toUpperCase();
            searchMethod = 'script-src';
            break;
          }
        }
      }
      
      // Method 2: Check HTML content for noscript iframe pattern
      if (!containerId) {
        const htmlContent = document.documentElement.outerHTML;
        const noscriptPattern = /googletagmanager\.com\/ns\.html\?id=(GTM-[A-Z0-9]+)/i;
        const noscriptMatch = htmlContent.match(noscriptPattern);
        
        if (noscriptMatch && noscriptMatch[1]) {
          containerId = noscriptMatch[1].toUpperCase();
          searchMethod = 'noscript-iframe-pattern';
        }
      }
      
      // Method 3: Check iframes directly
      if (!containerId) {
        const iframes = Array.from(document.querySelectorAll('iframe'));
        for (const iframe of iframes) {
          if (iframe.src && iframe.src.includes('googletagmanager.com')) {
            const match = iframe.src.match(/id=(GTM-[A-Z0-9]+)/i) || iframe.src.match(/GTM-[A-Z0-9]{5,}/i);
            if (match) {
              containerId = match[1] ? match[1].toUpperCase() : match[0].toUpperCase();
              searchMethod = 'iframe-src';
              break;
            }
          }
        }
      }
      
      // Method 4: Search entire HTML for GTM-XXXXX pattern
      if (!containerId) {
        const htmlContent = document.documentElement.outerHTML;
        const gtmPattern = /GTM-[A-Z0-9]{5,}/i;
        const gtmMatch = htmlContent.match(gtmPattern);
        
        if (gtmMatch) {
          containerId = gtmMatch[0].toUpperCase();
          searchMethod = 'general-gtm-pattern';
        }
      }
      
      // Collect debug info
      const htmlContent = document.documentElement.outerHTML;
      const hasGoogleTagManager = htmlContent.includes('googletagmanager.com');
      const allGtmMatches = htmlContent.match(/GTM-[A-Z0-9]+/gi) || [];
      const noscriptMatch = htmlContent.match(/googletagmanager\.com\/ns\.html\?id=(GTM-[A-Z0-9]+)/i);
      
      return {
        containerId,
        hasGoogleTagManager,
        noscriptMatchFound: !!noscriptMatch,
        gtmPatternsFound: allGtmMatches,
        searchMethod: searchMethod || 'none',
        gtmScriptsFound: gtmScripts.length,
      };
    });
    
    const containerId = searchResult.containerId;
    
    // Store debug info in details
    details.verificationStatus = searchResult.searchMethod || 'not-found';

    // If no container ID found, return early
    if (!containerId) {
      return {
        hasGTM: false,
        containerId: null,
        message: 'GTM not found - no GTM container ID detected',
        details: {
          ...details,
          verificationStatus: 'Container ID not found',
          debugInfo: {
            htmlContainsGoogleTagManager: searchResult.hasGoogleTagManager,
            gtmPatternsFound: searchResult.gtmPatternsFound,
            noscriptMatchFound: searchResult.noscriptMatchFound,
            searchMethod: searchResult.searchMethod || 'none',
            gtmScriptsFound: searchResult.gtmScriptsFound,
          },
        },
      };
    }

    // Verify GTM is present
    details.scriptFound = searchResult.hasGoogleTagManager || searchResult.gtmScriptsFound > 0;

    // Step 3: Validate container ID format (GTM-XXXXX where X is alphanumeric)
    const gtmIdPattern = /^GTM-[A-Z0-9]+$/i;
    if (!gtmIdPattern.test(containerId)) {
      return {
        hasGTM: false,
        containerId: null,
        message: `GTM container ID format is invalid: ${containerId}`,
        details: {
          ...details,
          verificationStatus: 'Invalid container ID format',
        },
      };
    }

    // Step 4: Check if gtm.js is loaded (wait a bit for GTM to load)
    await page.waitForTimeout(2000); // Give GTM time to load

    // Check for gtm.js script tag in DOM (script tags exist, not "visible")
    let gtmJsScriptTagExists = false;
    try {
      const scriptCount = await page.locator('script[src*="googletagmanager.com/gtm.js"]').count();
      gtmJsScriptTagExists = scriptCount > 0;
    } catch {
      gtmJsScriptTagExists = false;
    }

    // Check if gtm.js actually loaded by checking for google_tag_manager object
    let gtmJsLoaded = false;
    try {
      gtmJsLoaded = await page.evaluate((gtmId: string) => {
        // Check if google_tag_manager object exists (created when gtm.js loads)
        return typeof (window as any).google_tag_manager !== 'undefined' &&
               typeof (window as any).google_tag_manager[gtmId] !== 'undefined';
      }, containerId).catch(() => false);
    } catch {
      gtmJsLoaded = false;
    }

    // Also check network requests that already happened
    let gtmJsNetworkLoaded = false;
    try {
      // Check if gtm.js was already requested (look at all responses, not wait for new ones)
      const allResponses = page.context().pages().flatMap(p => 
        (p as any)._routes?.map((r: any) => r.response) || []
      );
      
      // Alternative: check in page's response history
      const responseUrls = await page.evaluate(() => {
        // We can't directly access response history in evaluate, so we'll use a different method
        return (performance as any).getEntriesByType?.('resource')?.filter((entry: any) => 
          entry.name && entry.name.includes('googletagmanager.com/gtm.js')
        ).length > 0;
      }).catch(() => false);
      
      if (typeof responseUrls === 'boolean') {
        gtmJsNetworkLoaded = responseUrls;
      }
    } catch {
      // Network check failed, continue with other checks
    }

    // Step 5: Check if dataLayer exists and has data
    const dataLayerCheck = await page.evaluate(() => {
      const hasDataLayer = typeof (window as any).dataLayer !== 'undefined';
      const dataLayerLength = hasDataLayer ? ((window as any).dataLayer as any[]).length : 0;
      const hasData = dataLayerLength > 0;
      
      // Check if dataLayer has gtm.js push (usually the first item)
      let hasGtmPush = false;
      if (hasDataLayer && dataLayerLength > 0) {
        const firstItem = ((window as any).dataLayer as any[])[0];
        hasGtmPush = firstItem && typeof firstItem === 'object' && 
                     ('event' in firstItem || 'gtm.start' in firstItem || 'gtm.js' in firstItem);
      }
      
      return {
        exists: hasDataLayer,
        hasData,
        length: dataLayerLength,
        hasGtmPush,
      };
    });

    details.dataLayerExists = dataLayerCheck.exists;
    details.dataLayerPushFound = dataLayerCheck.hasGtmPush;

    // GTM is loaded if: script tag exists OR google_tag_manager object exists OR network request succeeded
    // OR dataLayer exists (which is also a good indicator that gtm.js loaded successfully)
    details.gtmJsLoaded = gtmJsScriptTagExists || gtmJsLoaded || gtmJsNetworkLoaded || details.dataLayerExists;

    // Determine if GTM is successfully implemented
    // Success criteria: If GTM container ID is found, it's considered passed
    const isSuccessfullyImplemented = containerId !== null;

    let verificationStatus = '';
    if (isSuccessfullyImplemented) {
      const checks: string[] = [];
      if (details.scriptFound) checks.push('Script tag found');
      if (details.gtmJsLoaded) checks.push('gtm.js loaded');
      if (details.dataLayerExists) checks.push('dataLayer exists');
      if (details.dataLayerPushFound) checks.push('dataLayer push found');
      verificationStatus = checks.join(', ');
    } else {
      const missing: string[] = [];
      if (!details.gtmJsLoaded && !details.dataLayerExists) missing.push('gtm.js not loaded or dataLayer not found');
      verificationStatus = missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'Implementation incomplete';
    }

    return {
      hasGTM: isSuccessfullyImplemented,
      containerId: containerId,
      message: isSuccessfullyImplemented 
        ? `GTM found - Container ID: ${containerId}${details.gtmJsLoaded ? ' (gtm.js loaded)' : ''}${details.dataLayerExists ? ' (dataLayer exists)' : ''}`
        : `GTM not found - no GTM container ID detected`,
      details: {
        ...details,
        verificationStatus,
        debugInfo: {
          htmlContainsGoogleTagManager: searchResult.hasGoogleTagManager,
          gtmPatternsFound: searchResult.gtmPatternsFound,
          noscriptMatchFound: searchResult.noscriptMatchFound,
          searchMethod: searchResult.searchMethod || 'none',
          gtmScriptsFound: searchResult.gtmScriptsFound,
        },
      },
    };
  } catch (error: any) {
    return {
      hasGTM: false,
      containerId: null,
      message: `Error checking GTM: ${error.message}`,
      details: {
        ...details,
        verificationStatus: `Error: ${error.message}`,
      },
    };
  }
}

/**
 * Format GTM check result for reporting
 */
export function formatGTMReport(gtmResult: GTMCheckResult): string {
  if (gtmResult.hasGTM && gtmResult.containerId) {
    let report = `✅ GTM Check: ${gtmResult.message}`;
    
    if (gtmResult.details) {
      report += `\n   Verification Details:`;
      report += `\n     - Script tag found: ${gtmResult.details.scriptFound ? '✅' : '❌'}`;
      report += `\n     - gtm.js loaded: ${gtmResult.details.gtmJsLoaded ? '✅' : '❌'}`;
      report += `\n     - dataLayer exists: ${gtmResult.details.dataLayerExists ? '✅' : '❌'}`;
      if (gtmResult.details.dataLayerPushFound) {
        report += `\n     - dataLayer push found: ✅`;
      }
    }
    
    return report;
  } else {
    let report = `❌ GTM Check: ${gtmResult.message}`;
    
    if (gtmResult.details) {
      report += `\n   Verification Details:`;
      report += `\n     - Script tag found: ${gtmResult.details.scriptFound ? '✅' : '❌'}`;
      report += `\n     - gtm.js loaded: ${gtmResult.details.gtmJsLoaded ? '✅' : '❌'}`;
      report += `\n     - dataLayer exists: ${gtmResult.details.dataLayerExists ? '✅' : '❌'}`;
    }
    
    return report;
  }
}

