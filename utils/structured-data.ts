import { Page } from '@playwright/test';
import {
  formatUnifiedReport,
  type ReportItem,
  type ReportSection,
} from './formatting';

/**
 * Interface for structured data results
 */
export interface StructuredDataResult {
  check: string;
  passed: boolean;
  message: string;
  schemaType?: string;
  value?: string;
}

/**
 * Interface for structured data summary
 */
export interface StructuredDataSummary {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  results: StructuredDataResult[];
  schemasFound: string[];
  passed: boolean;
}

/**
 * Check JSON-LD structured data
 */
export async function validateJSONLD(
  page: Page
): Promise<StructuredDataResult[]> {
  const results: StructuredDataResult[] = [];

  try {
    const jsonLdScripts = await page.locator('script[type="application/ld+json"]').all();

    if (jsonLdScripts.length === 0) {
      results.push({
        check: 'JSON-LD Schema',
        passed: false,
        message: 'No JSON-LD structured data found. Consider adding JSON-LD schema markup for better SEO',
      });
      return results;
    }

    for (let i = 0; i < jsonLdScripts.length; i++) {
      const script = jsonLdScripts[i];
      try {
        const jsonContent = await script.textContent();
        if (!jsonContent) {
          results.push({
            check: 'JSON-LD Schema',
            passed: false,
            message: `JSON-LD script ${i + 1} is empty`,
          });
          continue;
        }

        // Parse JSON
        const schema = JSON.parse(jsonContent);

        // Check if it's an array or object
        const schemas = Array.isArray(schema) ? schema : [schema];

        for (const item of schemas) {
          const schemaType = item['@type'] || item.type;
          
          if (!schemaType) {
            results.push({
              check: 'JSON-LD Schema Type',
              passed: false,
              message: 'JSON-LD schema missing @type property',
              value: JSON.stringify(item).substring(0, 100),
            });
            continue;
          }

          // Validate common required properties based on type
          let validationMessage = `JSON-LD schema found: ${schemaType}`;
          let passed = true;

          if (schemaType === 'Organization') {
            if (!item.name && !item.legalName) {
              passed = false;
              validationMessage = 'Organization schema missing required "name" or "legalName"';
            }
          } else if (schemaType === 'Article' || schemaType === 'BlogPosting') {
            if (!item.headline && !item.name) {
              passed = false;
              validationMessage = `${schemaType} schema missing required "headline" or "name"`;
            }
          } else if (schemaType === 'BreadcrumbList') {
            if (!item.itemListElement || !Array.isArray(item.itemListElement)) {
              passed = false;
              validationMessage = 'BreadcrumbList schema missing required "itemListElement" array';
            }
          } else if (schemaType === 'WebSite') {
            if (!item.url && !item.name) {
              passed = false;
              validationMessage = 'WebSite schema missing required "url" or "name"';
            }
          }

          results.push({
            check: 'JSON-LD Schema',
            passed,
            message: validationMessage,
            schemaType,
            value: schemaType,
          });
        }
      } catch (parseError: any) {
        results.push({
          check: 'JSON-LD Schema',
          passed: false,
          message: `Invalid JSON in JSON-LD script ${i + 1}: ${parseError.message}`,
        });
      }
    }

    return results;
  } catch (error: any) {
    return [{
      check: 'JSON-LD Schema',
      passed: false,
      message: `Error validating JSON-LD: ${error.message}`,
    }];
  }
}

/**
 * Check for microdata
 */
export async function checkMicrodata(
  page: Page
): Promise<StructuredDataResult> {
  try {
    const itemsWithItemscope = await page.locator('[itemscope]').count();

    if (itemsWithItemscope === 0) {
      return {
        check: 'Microdata',
        passed: true,
        message: 'No microdata found (using JSON-LD instead, which is preferred)',
      };
    }

    // Check if items have itemtype
    const itemsWithItemtype = await page.locator('[itemscope][itemtype]').count();

    if (itemsWithItemtype < itemsWithItemscope) {
      return {
        check: 'Microdata',
        passed: false,
        message: `${itemsWithItemscope - itemsWithItemtype} itemscope element(s) missing itemtype attribute`,
      };
    }

    return {
      check: 'Microdata',
      passed: true,
      message: `Found ${itemsWithItemtype} microdata item(s) with proper itemtype attributes`,
    };
  } catch (error: any) {
    return {
      check: 'Microdata',
      passed: false,
      message: `Error checking microdata: ${error.message}`,
    };
  }
}

/**
 * Check for specific schema types
 */
export async function checkSchemaTypes(
  page: Page,
  expectedTypes: string[]
): Promise<StructuredDataResult[]> {
  const results: StructuredDataResult[] = [];
  const foundTypes: string[] = [];

  try {
    // Check JSON-LD
    const jsonLdScripts = await page.locator('script[type="application/ld+json"]').all();
    
    for (const script of jsonLdScripts) {
      try {
        const jsonContent = await script.textContent();
        if (!jsonContent) continue;

        const schema = JSON.parse(jsonContent);
        const schemas = Array.isArray(schema) ? schema : [schema];

        for (const item of schemas) {
          const schemaType = item['@type'] || item.type;
          if (schemaType && !foundTypes.includes(schemaType)) {
            foundTypes.push(schemaType);
          }
        }
      } catch {
        // Skip invalid JSON
      }
    }

    // Check microdata
    for (const expectedType of expectedTypes) {
      const itemtypeSelector = `[itemtype*="${expectedType}"]`;
      const count = await page.locator(itemtypeSelector).count();
      if (count > 0 && !foundTypes.includes(expectedType)) {
        foundTypes.push(expectedType);
      }
    }

    // Report on expected types
    for (const expectedType of expectedTypes) {
      if (foundTypes.includes(expectedType)) {
        results.push({
          check: 'Schema Type',
          passed: true,
          message: `Schema type "${expectedType}" found`,
          schemaType: expectedType,
          value: expectedType,
        });
      } else {
        results.push({
          check: 'Schema Type',
          passed: false,
          message: `Expected schema type "${expectedType}" not found`,
          schemaType: expectedType,
        });
      }
    }

    return results;
  } catch (error: any) {
    return [{
      check: 'Schema Type',
      passed: false,
      message: `Error checking schema types: ${error.message}`,
    }];
  }
}

/**
 * Check structured data on page
 */
export async function checkStructuredData(
  page: Page,
  options?: {
    expectedTypes?: string[];
  }
): Promise<StructuredDataSummary> {
  const results: StructuredDataResult[] = [];
  const schemasFound: string[] = [];

  // Validate JSON-LD
  const jsonLdResults = await validateJSONLD(page);
  results.push(...jsonLdResults);

  // Extract schema types from JSON-LD results
  jsonLdResults.forEach(result => {
    if (result.schemaType && !schemasFound.includes(result.schemaType)) {
      schemasFound.push(result.schemaType);
    }
  });

  // Check microdata
  results.push(await checkMicrodata(page));

  // Check for expected schema types
  if (options?.expectedTypes && options.expectedTypes.length > 0) {
    const schemaTypeResults = await checkSchemaTypes(page, options.expectedTypes);
    results.push(...schemaTypeResults);
  }

  const passedChecks = results.filter(r => r.passed).length;
  const failedChecks = results.filter(r => !r.passed).length;

  return {
    totalChecks: results.length,
    passedChecks,
    failedChecks,
    results,
    schemasFound: [...new Set(schemasFound)],
    passed: failedChecks === 0,
  };
}

/**
 * Format structured data report
 */
export function formatStructuredDataReport(
  summary: StructuredDataSummary,
  url?: string
): string {
  const sections: ReportSection[] = [];

  if (summary.results.length > 0) {
    const items: ReportItem[] = summary.results.map(result => ({
      label: result.schemaType || result.check,
      value: result.passed ? 'Passed' : 'Failed',
      status: result.passed ? 'passed' : 'failed',
      details: result.value ? `${result.message} (${result.value})` : result.message,
    }));

    sections.push({
      title: 'Structured Data Results',
      items,
    });
  }

  const summaryItems: ReportItem[] = [
    {
      label: 'Total Checks',
      value: summary.totalChecks,
      status: 'info',
    },
    {
      label: 'Schemas Found',
      value: summary.schemasFound.length > 0 ? summary.schemasFound.join(', ') : 'None',
      status: summary.schemasFound.length > 0 ? 'passed' : 'warning',
    },
    {
      label: 'Passed',
      value: summary.passedChecks,
      status: summary.passedChecks === summary.totalChecks ? 'passed' : 'warning',
    },
    {
      label: 'Failed',
      value: summary.failedChecks,
      status: summary.failedChecks === 0 ? 'passed' : 'failed',
    },
  ];

  return formatUnifiedReport({
    testName: 'Structured Data',
    url,
    summary: summaryItems,
    sections,
  });
}
