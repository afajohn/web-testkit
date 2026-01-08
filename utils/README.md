# Playwright Utilities

This directory contains reusable utility functions for common testing scenarios.

## Broken Link Checking (`broken-links.ts`)

Utilities for detecting broken links on web pages.

### Interfaces

- `LinkElement` - Contains selector, linkText, html, and href for each link element
- `LinkCheckResult` - Contains url, status, statusText, isBroken, error, and elements array

### Functions

- `extractLinksWithElements(page, baseUrl?)` - Extract all links from a page with element information
- `checkLink(request, url, timeout?)` - Check if a single link is broken (returns status code)
- `checkLinks(request, urls, concurrency?)` - Check multiple links in parallel
- `checkBrokenLinks(page, request, baseUrl?, concurrency?)` - Complete broken link check for a page (returns only broken links)
- `formatBrokenLinksReport(brokenLinks)` - Format results for console output

### Example

```typescript
import { checkBrokenLinks, formatBrokenLinksReport } from '../utils/broken-links';

const brokenLinks = await checkBrokenLinks(page, request);
console.log(formatBrokenLinksReport(brokenLinks));
expect(brokenLinks.length).toBe(0);
```

### Features

- Automatically extracts all `<a href="">` tags with element information (selector, text, HTML)
- Normalizes relative URLs to absolute URLs
- Skips javascript:, mailto:, tel:, and anchor-only links
- Uses HEAD requests (faster) with GET fallback
- Parallel checking for performance (default: 10 concurrent requests)
- Configurable concurrency
- Groups multiple elements linking to the same URL
- Identifies links that work but need trailing slash
- Returns detailed element information for each broken link

## SEO Checks (`seo-checks.ts`)

Utilities for basic SEO validation.

### Interfaces

- `SEOCheckResult` - Contains check name, passed status, message, and optional value
- `ImageInfo` - Contains src, alt, title, width, and height for images

### Functions

- `checkPageTitle(page, expectedTitle?)` - Validate page title exists and optionally matches expected (string or RegExp)
- `checkMetaDescription(page, minLength?, maxLength?)` - Check meta description length (default: 50-160 chars)
- `checkCanonicalURL(page, expectedCanonical?)` - Verify canonical URL exists and optionally matches expected
- `checkRobotsMetaTag(page, requireIndex?, requireFollow?)` - Check robots meta tag for index,follow directives
- `checkImageAltAttributes(page)` - Ensure all images have alt text
- `getAllImageInfo(page)` - Get detailed information about all images on the page
- `checkHeadingStructure(page)` - Validate H1 presence (exactly one) and structure
- `checkOpenGraphTags(page)` - Check for Open Graph meta tags (og:title, og:description, og:image, og:url)
- `runSEOChecks(page, options?)` - Run all SEO checks with customizable options
- `getSEOMetadata(page)` - Get detailed SEO metadata for tabular reporting
- `formatSEOMetadataTable(metadata)` - Format SEO metadata as a detailed table
- `formatSEOCheckReport(results, page?)` - Format results for console output (includes detailed metadata table if page provided)

### Example

```typescript
import { runSEOChecks, formatSEOCheckReport } from '../utils/seo-checks';

const results = await runSEOChecks(page, {
  checkTitle: true,
  checkMetaDescription: true,
  checkCanonical: true,
  checkRobots: true, // Check robots meta tag for index,follow
  checkImageAlt: true,
  checkHeadings: true,
  checkOpenGraph: false,
  expectedTitle: /My Site/i,
  expectedCanonical: 'https://example.com/',
  requireIndex: true,
  requireFollow: true,
});

console.log(await formatSEOCheckReport(results, page)); // Pass page for detailed metadata table
```

### SEO Checks Included

1. **Page Title** - Presence and optional pattern matching (supports string or RegExp)
2. **Meta Description** - Length validation (50-160 characters recommended, customizable)
3. **Canonical URL** - Presence and optional value validation
4. **Robots Meta Tag** - Validates index,follow directives (optional, customizable requirements)
5. **Image Alt Attributes** - All images must have alt text, provides detailed image information
6. **Heading Structure** - Exactly one H1 required, proper hierarchy validation
7. **Open Graph Tags** - og:title, og:description, og:image, og:url (optional)

### Detailed Metadata Table

When `formatSEOCheckReport()` is called with a `page` parameter, it generates a comprehensive metadata table including:
- All meta tags (title, description, canonical, robots)
- Open Graph tags
- Complete image list with alt text status
- Full URLs (non-truncated) for reference

## Accessibility (`accessibility.ts`)

Accessibility testing using axe-core, including static and interactive state testing.

### Interfaces

- `AccessibilityScanResults` - Contains violations, incomplete, passed, totalViolations, totalIncomplete

### Functions

- `getSelectorFromTarget(target)` - Get a CSS selector string from an axe target array
- `runAccessibilityCheck(page)` - Run full accessibility audit on the page
- `runAccessibilityCheckOnElement(page, selector)` - Check accessibility of a specific element (string selector)
- `runAccessibilityCheckOnHover(page, element)` - Check accessibility when element is hovered
- `runAccessibilityCheckOnFocus(page, element)` - Check accessibility when element is focused/active
- `runAccessibilityCheckOnModal(page, openSelector, modalSelector, closeSelector?)` - Check modal accessibility (opens modal, checks it, closes it)
- `formatAccessibilityReport(scanResults)` - Format results for console output

### Examples

**Basic page audit:**
```typescript
import { runAccessibilityCheck, formatAccessibilityReport } from '../utils/accessibility';

const scanResults = await runAccessibilityCheck(page);
console.log(formatAccessibilityReport(scanResults));
expect(scanResults.passed).toBe(true);
```

**Test button on hover:**
```typescript
import { runAccessibilityCheckOnHover } from '../utils/accessibility';

const button = page.locator('button.submit');
const scanResults = await runAccessibilityCheckOnHover(page, button);
expect(scanResults.passed).toBe(true);
```

**Test button on focus:**
```typescript
import { runAccessibilityCheckOnFocus } from '../utils/accessibility';

const button = page.locator('button.primary');
const scanResults = await runAccessibilityCheckOnFocus(page, button);
expect(scanResults.passed).toBe(true);
```

**Test modal/popup:**
```typescript
import { runAccessibilityCheckOnModal } from '../utils/accessibility';

const scanResults = await runAccessibilityCheckOnModal(
  page,
  'button[data-open-modal]',  // Button that opens modal
  '.modal-content',            // Modal container selector
  '.modal-close'               // Button that closes modal (optional)
);
expect(scanResults.passed).toBe(true);
```

### Features

- Full accessibility audit using axe-core
- Detects WCAG violations with impact levels
- Reports affected elements with selectors
- Flags incomplete checks that need manual review
- **Interactive state testing**: Hover, focus, and modal states
- **Element-specific testing**: Test individual components (requires string selector)
- Automatic modal opening/closing for accessibility testing
- Detailed violation reports with selectors, HTML, and failure summaries

## Google Tag Manager (`gtm-check.ts`)

Utilities for checking Google Tag Manager (GTM) implementation.

### Interfaces

- `GTMCheckResult` - Contains hasGTM, containerId, message, and detailed verification information

### Functions

- `checkGTMImplementation(page)` - Check if GTM is successfully implemented on the page
- `formatGTMReport(gtmResult)` - Format GTM check result for reporting

### Example

```typescript
import { checkGTMImplementation, formatGTMReport } from '../utils/gtm-check';

const gtmResult = await checkGTMImplementation(page);
console.log(formatGTMReport(gtmResult));
expect(gtmResult.hasGTM).toBe(true);
```

### Features

- Multiple detection methods (script tags, noscript iframe, HTML pattern matching)
- Validates GTM container ID format (GTM-XXXXX)
- Checks if gtm.js is loaded (script tag existence, google_tag_manager object, performance API, dataLayer)
- Verifies dataLayer exists and has data
- Detects dataLayer push events
- Provides detailed verification status

## Page Load (`page-load.ts`)

Utilities for ensuring pages are fully loaded before testing.

### Functions

- `waitForPageLoad(page, options?)` - Wait for page to be fully loaded
- `gotoAndWait(page, url, options?)` - Navigate to URL and wait for full page load

### Example

```typescript
import { gotoAndWait } from '../utils/page-load';

// Navigate and wait for page to be fully loaded
await gotoAndWait(page, 'https://example.com');

// With custom options
await gotoAndWait(page, 'https://example.com', {
  waitUntil: 'networkidle',  // Wait for network to be idle
  timeout: 60000,             // 60 second timeout (STRICTLY ENFORCED)
  waitForSelector: 'main'     // Wait for specific selector
});
```

### Options

- `waitUntil`: `'load' | 'domcontentloaded' | 'networkidle'` - Default: `'networkidle'`
- `timeout`: Number of milliseconds to wait (default: 60000 - STRICTLY ENFORCED)
- `waitForSelector`: CSS selector for element that must be visible

### Features

- Enhanced error handling with URL context (shows before/after navigation URLs)
- Handles redirects gracefully
- Automatic delay for dynamic content loading
- Optional selector-based waiting

## File Utilities (`file-utils.ts`)

Utilities for generating file paths and writing files.

### Functions

- `getFilenameFromUrl(url, extension?)` - Generate a safe filename from a URL (legacy - returns filename only)
- `getFilePathFromUrl(url, baseDir?, extension?)` - Generate full file path with folder structure based on URL path
  - Creates nested folder structure: `domain/path/to/filename.json`
  - Handles root URLs: `domain/root/filename.json`
  - Sanitizes filenames and paths
- `ensureDirectoryExists(dirPath)` - Ensure directory exists, create if it doesn't
- `writeJsonFile(filePath, data)` - Write JSON data to a file (auto-creates directories)
- `writeTextFile(filePath, data)` - Write text data to a file (auto-creates directories)

### Example

```typescript
import { getFilePathFromUrl, writeJsonFile } from '../utils/file-utils';

// Generate nested path: mexicocitydating.com/root/about-page.json
const filePath = getFilePathFromUrl('https://mexicocitydating.com/about-page.html', 'reports', 'json');
writeJsonFile(filePath, reportData);
```

## Report Merger (`report-merger.ts`)

Utilities for merging test results into a single report structure.

### Interfaces

- `MergedReport` - Complete merged report structure with summary, SEO, broken links, accessibility, and GTM results

### Functions

- `mergeTestResults(url, seoResults, brokenLinks, accessibilityResults, page?, gtmResult?)` - Merge all test results into a single report structure

### Example

```typescript
import { mergeTestResults } from '../utils/report-merger';

const mergedReport = await mergeTestResults(
  currentUrl,
  seoResults,
  brokenLinks,
  accessibilityResults,
  page,  // Optional: for metadata extraction
  gtmResult  // Optional: GTM check result
);
```

### Features

- Aggregates SEO, broken links, accessibility, and GTM results
- Calculates overall status
- Extracts page metadata (title, meta description, canonical, robots) if page provided
- Normalizes accessibility violations with selectors for easier traceability
- Includes links for review (e.g., social media links with warnings)

## Error Handling (`error-handling.ts`)

Utilities for enhanced error reporting with context.

### Interfaces

- `ErrorContext` - Contains url, operation, error message, and stack trace

### Functions

- `formatErrorWithContext(url, operation, error)` - Format error with URL and operation context
- `getCurrentUrl(page)` - Safely get current page URL with error handling

### Example

```typescript
import { formatErrorWithContext, getCurrentUrl } from '../utils/error-handling';

try {
  await page.goto(url);
} catch (error) {
  const currentUrl = await getCurrentUrl(page);
  const errorMessage = formatErrorWithContext(url, 'navigation', error);
  console.error(errorMessage);
}
```

## Usage Tips

1. **Page Load**: Always use `gotoAndWait()` instead of `page.goto()` to ensure pages are fully loaded
2. **Parallel Execution**: Use `Promise.all()` to run multiple checks simultaneously for better performance
3. **Selective Checks**: Use the options parameter in `runSEOChecks()` to only run specific checks
4. **Custom Thresholds**: Adjust meta description length limits based on your requirements
5. **External Links**: By default, broken link checking checks all links. Modify `extractLinksWithElements()` to filter by origin if needed
6. **Performance**: Adjust concurrency in `checkBrokenLinks()` based on server capacity (default: 10 parallel requests)
7. **Accessibility**: Use string selectors with `runAccessibilityCheckOnElement()` for element-specific testing
8. **File Organization**: Use `getFilePathFromUrl()` to maintain organized nested folder structures for reports
