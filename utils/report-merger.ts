import { Page } from "@playwright/test";
import { SEOCheckResult } from "./seo-checks";
import { LinkCheckResult } from "./broken-links";
import { GTMCheckResult } from "./gtm-check";
import {
  formatAccessibilityReport,
  getSelectorFromTarget,
} from "./accessibility";

/**
 * Merged report structure containing all test results
 */
export interface MergedReport {
  url: string;
  timestamp: string;
  summary: {
    overallStatus: "passed" | "failed";
    seoPassed: boolean;
    brokenLinksCount: number;
    accessibilityPassed: boolean;
    gtmPassed: boolean;
  };
  seo: {
    results: SEOCheckResult[];
    passedCount: number;
    totalCount: number;
    failedChecks: SEOCheckResult[];
  };
  brokenLinks: {
    totalChecked: number;
    brokenCount: number;
    brokenLinks: LinkCheckResult[];
    linksForReview?: LinkCheckResult[];
  };
  accessibility: {
    passed: boolean;
    totalViolations: number;
    totalIncomplete: number;
    violations: any[];
    incomplete: any[];
    formattedReport?: string;
  };
  gtm: GTMCheckResult;
  metadata?: {
    pageTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    robotsMetaTag?: string;
  };
}

/**
 * Merge all test results into a single report structure
 */
export async function mergeTestResults(
  url: string,
  seoResults: SEOCheckResult[],
  brokenLinks: LinkCheckResult[],
  accessibilityResults: {
    violations: any[];
    incomplete: any[];
    passed: boolean;
    totalViolations: number;
    totalIncomplete: number;
  },
  page?: Page,
  gtmResult?: GTMCheckResult
): Promise<MergedReport> {
  const seoPassedCount = seoResults.filter((r) => r.passed).length;
  const seoFailedChecks = seoResults.filter((r) => !r.passed);
  const seoPassed = seoFailedChecks.length === 0;

  const brokenLinksCount = brokenLinks.filter((link) => link.isBroken).length;

  // Include links with warnings (e.g., social media links) for user review
  // These are links that are not broken but have warnings/errors that need review
  const linksForReview = brokenLinks.filter(
    (link) =>
      !link.isBroken &&
      link.error &&
      (link.error.includes("Social media") || link.error.includes("⚠️"))
  );

  // Default GTM result if not provided
  const gtmCheckResult: GTMCheckResult = gtmResult || {
    hasGTM: false,
    containerId: null,
    hasLPTrackScript: false,
    message: "GTM check not performed",
  };

  const overallStatus =
    seoPassed &&
    brokenLinksCount === 0 &&
    accessibilityResults.passed &&
    gtmCheckResult.hasGTM
      ? "passed"
      : "failed";

  const report: MergedReport = {
    url,
    timestamp: new Date().toISOString(),
    summary: {
      overallStatus,
      seoPassed,
      brokenLinksCount,
      accessibilityPassed: accessibilityResults.passed,
      gtmPassed: gtmCheckResult.hasGTM,
    },
    seo: {
      results: seoResults,
      passedCount: seoPassedCount,
      totalCount: seoResults.length,
      failedChecks: seoFailedChecks,
    },
    brokenLinks: {
      totalChecked: brokenLinks.length,
      brokenCount: brokenLinksCount,
      brokenLinks: brokenLinks.filter((link) => link.isBroken),
      ...(linksForReview.length > 0 && { linksForReview }),
    },
    accessibility: {
      passed: accessibilityResults.passed,
      totalViolations: accessibilityResults.totalViolations,
      totalIncomplete: accessibilityResults.totalIncomplete,
      violations: normalizeAccessibilityViolations(
        accessibilityResults.violations
      ),
      incomplete: normalizeAccessibilityViolations(
        accessibilityResults.incomplete
      ),
      formattedReport: formatAccessibilityReport(accessibilityResults),
    },
    gtm: gtmCheckResult,
  };

  // Add metadata if page is provided
  if (page) {
    try {
      const title = await page.title();
      const metaDescription = await page
        .locator('meta[name="description"]')
        .getAttribute("content")
        .catch(() => null);
      const canonicalUrl = await page
        .locator('link[rel="canonical"]')
        .getAttribute("href")
        .catch(() => null);
      const robotsMetaTag = await page
        .locator('meta[name="robots"]')
        .getAttribute("content")
        .catch(() => null);

      report.metadata = {
        pageTitle: title || undefined,
        metaDescription: metaDescription || undefined,
        canonicalUrl: canonicalUrl || undefined,
        robotsMetaTag: robotsMetaTag || undefined,
      };
    } catch (error) {
      // Metadata extraction failed, skip it
    }
  }

  return report;
}

/**
 * Normalize accessibility violations/incomplete results by adding selector to each node
 * This makes the selector more easily traceable in the JSON structure
 */
function normalizeAccessibilityViolations(items: any[]): any[] {
  if (!Array.isArray(items)) return items;

  return items.map((item: any) => {
    // Clone the item to avoid mutating the original
    const normalized: any = { ...item };

    // Normalize nodes array
    if (normalized.nodes && Array.isArray(normalized.nodes)) {
      normalized.nodes = normalized.nodes.map((node: any) => {
        const normalizedNode: any = { ...node };

        // Extract selector from target array and add it as a top-level property
        if (normalizedNode.target && Array.isArray(normalizedNode.target)) {
          normalizedNode.selector = getSelectorFromTarget(
            normalizedNode.target
          );
        } else {
          normalizedNode.selector = "";
        }

        // Also add selector to individual checks in 'any' array for better traceability
        if (normalizedNode.any && Array.isArray(normalizedNode.any)) {
          normalizedNode.any = normalizedNode.any.map((check: any) => ({
            ...check,
            // Note: The 'id' field is the axe-core check ID (e.g., "button-has-visible-text", "aria-label")
            // It identifies which specific accessibility check failed within this violation
            selector: normalizedNode.selector, // Add selector reference to each check
          }));
        }

        return normalizedNode;
      });
    }

    return normalized;
  });
}
