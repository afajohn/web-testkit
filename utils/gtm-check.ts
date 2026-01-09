import { Page } from "@playwright/test";

/**
 * GTM check result with detailed verification
 */
export interface GTMCheckResult {
  hasGTM: boolean;
  containerId: string | null;
  hasLPTrackScript: boolean; // NEW: Track the specific script
  message: string;
  details?: {
    scriptFound: boolean;
    gtmJsLoaded: boolean;
    dataLayerExists: boolean;
    dataLayerPushFound: boolean;
    lpTrackScriptFound: boolean; // NEW: Detailed status
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
 * Check if Google Tag Manager (GTM) and LP Tracking script are implemented
 */
export async function checkGTMImplementation(
  page: Page
): Promise<GTMCheckResult> {
  const details = {
    scriptFound: false,
    gtmJsLoaded: false,
    dataLayerExists: false,
    dataLayerPushFound: false,
    lpTrackScriptFound: false, // Initialize
    verificationStatus: "",
  };

  try {
    // --- NEW: Check for lp_track.min.js script ---
    // We look for a script tag that contains the specific src path
    const lpTrackCount = await page
      .locator('script[src*="/members/scripts/lp_track.min.js"]')
      .count();
    details.lpTrackScriptFound = lpTrackCount > 0;

    // Step 1: Search for GTM using multiple methods
    const searchResult = await page.evaluate(() => {
      let containerId: string | null = null;
      let searchMethod = "";

      const gtmScripts = Array.from(document.scripts)
        .map((s) => s.src)
        .filter((src) => src.includes("googletagmanager"));

      if (gtmScripts.length > 0) {
        for (const scriptSrc of gtmScripts) {
          const match =
            scriptSrc.match(/id=(GTM-[A-Z0-9]+)/i) ||
            scriptSrc.match(/GTM-[A-Z0-9]{5,}/i);
          if (match) {
            containerId = match[1]
              ? match[1].toUpperCase()
              : match[0].toUpperCase();
            searchMethod = "script-src";
            break;
          }
        }
      }

      if (!containerId) {
        const htmlContent = document.documentElement.outerHTML;
        const noscriptPattern =
          /googletagmanager\.com\/ns\.html\?id=(GTM-[A-Z0-9]+)/i;
        const noscriptMatch = htmlContent.match(noscriptPattern);

        if (noscriptMatch && noscriptMatch[1]) {
          containerId = noscriptMatch[1].toUpperCase();
          searchMethod = "noscript-iframe-pattern";
        }
      }

      const htmlContent = document.documentElement.outerHTML;
      const hasGoogleTagManager = htmlContent.includes("googletagmanager.com");
      const allGtmMatches = htmlContent.match(/GTM-[A-Z0-9]+/gi) || [];
      const noscriptMatch = htmlContent.match(
        /googletagmanager\.com\/ns\.html\?id=(GTM-[A-Z0-9]+)/i
      );

      return {
        containerId,
        hasGoogleTagManager,
        noscriptMatchFound: !!noscriptMatch,
        gtmPatternsFound: allGtmMatches,
        searchMethod: searchMethod || "none",
        gtmScriptsFound: gtmScripts.length,
      };
    });

    const containerId = searchResult.containerId;
    details.verificationStatus = searchResult.searchMethod || "not-found";

    // Verify GTM is present
    details.scriptFound =
      searchResult.hasGoogleTagManager || searchResult.gtmScriptsFound > 0;

    // Step 4: Check if gtm.js is loaded
    await page.waitForTimeout(2000);

    let gtmJsScriptTagExists =
      (await page
        .locator('script[src*="googletagmanager.com/gtm.js"]')
        .count()) > 0;

    let gtmJsLoaded = await page
      .evaluate((gtmId: string) => {
        return (
          typeof (window as any).google_tag_manager !== "undefined" &&
          typeof (window as any).google_tag_manager[gtmId] !== "undefined"
        );
      }, containerId || "")
      .catch(() => false);

    const dataLayerCheck = await page.evaluate(() => {
      const hasDataLayer = typeof (window as any).dataLayer !== "undefined";
      const dataLayerLength = hasDataLayer
        ? ((window as any).dataLayer as any[]).length
        : 0;
      let hasGtmPush = false;
      if (hasDataLayer && dataLayerLength > 0) {
        const firstItem = ((window as any).dataLayer as any[])[0];
        hasGtmPush =
          firstItem &&
          typeof firstItem === "object" &&
          ("event" in firstItem ||
            "gtm.start" in firstItem ||
            "gtm.js" in firstItem);
      }
      return { exists: hasDataLayer, hasGtmPush };
    });

    details.dataLayerExists = dataLayerCheck.exists;
    details.dataLayerPushFound = dataLayerCheck.hasGtmPush;
    details.gtmJsLoaded =
      gtmJsScriptTagExists || gtmJsLoaded || details.dataLayerExists;

    const isSuccessfullyImplemented = containerId !== null;

    return {
      hasGTM: isSuccessfullyImplemented,
      containerId: containerId,
      hasLPTrackScript: details.lpTrackScriptFound, // Return the boolean here
      message: isSuccessfullyImplemented
        ? `GTM found (${containerId}). LP Track Script: ${
            details.lpTrackScriptFound ? "Present" : "Missing"
          }`
        : `GTM not found. LP Track Script: ${
            details.lpTrackScriptFound ? "Present" : "Missing"
          }`,
      details: {
        ...details,
        verificationStatus: isSuccessfullyImplemented
          ? "GTM Verified"
          : "GTM Missing",
        debugInfo: {
          htmlContainsGoogleTagManager: searchResult.hasGoogleTagManager,
          gtmPatternsFound: searchResult.gtmPatternsFound,
          noscriptMatchFound: searchResult.noscriptMatchFound,
          searchMethod: searchResult.searchMethod || "none",
          gtmScriptsFound: searchResult.gtmScriptsFound,
        },
      },
    };
  } catch (error: any) {
    return {
      hasGTM: false,
      containerId: null,
      hasLPTrackScript: details.lpTrackScriptFound,
      message: `Error: ${error.message}`,
      details: { ...details, verificationStatus: `Error: ${error.message}` },
    };
  }
}

/**
 * Format GTM and Tracking check result for reporting
 */
export function formatGTMReport(gtmResult: GTMCheckResult): string {
  const gtmIcon = gtmResult.hasGTM ? "✅" : "❌";
  const lpIcon = gtmResult.hasLPTrackScript ? "✅" : "❌";

  let report = `${gtmIcon} GTM: ${
    gtmResult.hasGTM ? gtmResult.containerId : "Not Found"
  }\n`;
  report += `${lpIcon} LP Track Script (/members/scripts/lp_track.min.js): ${
    gtmResult.hasLPTrackScript ? "Found" : "Missing"
  }`;

  if (gtmResult.details) {
    report += `\n\n   Verification Details:`;
    report += `\n     - GTM Script tag: ${
      gtmResult.details.scriptFound ? "✅" : "❌"
    }`;
    report += `\n     - GTM gtm.js loaded: ${
      gtmResult.details.gtmJsLoaded ? "✅" : "❌"
    }`;
    report += `\n     - LP Track Script tag: ${
      gtmResult.details.lpTrackScriptFound ? "✅" : "❌"
    }`;
    report += `\n     - dataLayer exists: ${
      gtmResult.details.dataLayerExists ? "✅" : "❌"
    }`;
  }

  return report;
}
