# Playwright Utilities

This directory contains reusable utility functions for common testing scenarios.

## Broken Link Checking (`broken-links.ts`)

Utilities for detecting broken links on web pages.

### Functions

- `extractLinks(page, baseUrl?)` - Extract all links from a page and normalize to absolute URLs
- `checkLink(request, url, timeout?)` - Check if a single link is broken (returns status code)
- `checkLinks(request, urls, concurrency?)` - Check multiple links in parallel
- `checkBrokenLinks(page, request, baseUrl?, concurrency?)` - Complete broken link check for a page
- `formatBrokenLinksReport(brokenLinks)` - Format results for console output

### Example

```typescript
import { checkBrokenLinks, formatBrokenLinksReport } from '../utils/broken-links';

const brokenLinks = await checkBrokenLinks(page, request);
console.log(formatBrokenLinksReport(brokenLinks));
```

### Features

- Automatically extracts all `<a href="">` tags
- Normalizes relative URLs to absolute URLs
- Skips javascript:, mailto:, tel:, and anchor-only links
- Uses HEAD requests (faster) with GET fallback
- Parallel checking for performance
- Configurable concurrency

## SEO Checks (`seo-checks.ts`)

Utilities for basic SEO validation.

### Functions

- `checkPageTitle(page, expectedTitle?)` - Validate page title exists and optionally matches expected
- `checkMetaDescription(page, minLength?, maxLength?)` - Check meta description length (default: 50-160 chars)
- `checkCanonicalURL(page, expectedCanonical?)` - Verify canonical URL exists
- `checkRobotsMetaTag(page, requireIndex?, requireFollow?)` - Check robots meta tag for index,follow directives
- `checkImageAltAttributes(page)` - Ensure all images have alt attributes
- `checkHeadingStructure(page)` - Validate H1 presence and structure
- `checkOpenGraphTags(page)` - Check for Open Graph meta tags
- `runSEOChecks(page, options?)` - Run all SEO checks with customizable options
- `formatSEOCheckReport(results)` - Format results for console output

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
});

console.log(formatSEOCheckReport(results));
```

### SEO Checks Included

1. **Page Title** - Presence and optional pattern matching
2. **Meta Description** - Length validation (50-160 characters recommended)
3. **Canonical URL** - Presence and optional value validation
4. **Robots Meta Tag** - Validates index,follow directives (optional)
5. **Image Alt Attributes** - All images must have alt text
6. **Heading Structure** - Exactly one H1, proper hierarchy
7. **Open Graph Tags** - og:title, og:description, og:image, og:url (optional)

## Accessibility (`accessibility.ts`)

Accessibility testing using axe-core, including static and interactive state testing.

### Functions

- `runAccessibilityCheck(page)` - Run full accessibility audit on the page
- `runAccessibilityCheckOnElement(page, selector)` - Check accessibility of a specific element
- `runAccessibilityCheckOnHover(page, selector)` - Check accessibility when element is hovered
- `runAccessibilityCheckOnFocus(page, selector)` - Check accessibility when element is focused/active
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
- Detects WCAG violations
- Reports impact levels
- Identifies affected elements
- Flags incomplete checks that need manual review
- **Interactive state testing**: Hover, focus, and modal states
- **Element-specific testing**: Test individual components

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

## Usage Tips

1. **Page Load**: Always use `gotoAndWait()` instead of `page.goto()` to ensure pages are fully loaded
2. **Parallel Execution**: Use `Promise.all()` to run multiple checks simultaneously for better performance
3. **Selective Checks**: Use the options parameter in `runSEOChecks()` to only run specific checks
4. **Custom Thresholds**: Adjust meta description length limits based on your requirements
5. **External Links**: By default, broken link checking only checks same-origin links. Modify `extractLinks()` to include external links if needed
6. **Performance**: Adjust concurrency in `checkBrokenLinks()` based on server capacity (default: 10 parallel requests)

