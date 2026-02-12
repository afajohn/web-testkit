# Quick Start Guide: Broken Links & SEO Testing

## Quick Examples

### Broken Link Checking

```typescript
import { checkBrokenLinks, formatBrokenLinksReport } from '../utils/broken-links';

test('check homepage links', async ({ page, request }) => {
  await page.goto('https://anewbride.com/');
  const brokenLinks = await checkBrokenLinks(page, request);
  
  console.log(formatBrokenLinksReport(brokenLinks));
  expect(brokenLinks.length).toBe(0);
});
```

### SEO Testing

```typescript
import { runSEOChecks, formatSEOCheckReport } from '../utils/seo-checks';

test('check homepage SEO', async ({ page }) => {
  await page.goto('https://anewbride.com/');
  const results = await runSEOChecks(page);
  
  console.log(formatSEOCheckReport(results));
  
  const failedChecks = results.filter(r => !r.passed);
  expect(failedChecks.length).toBe(0);
});
```

### Accessibility Testing

```typescript
import { runAccessibilityCheck, formatAccessibilityReport } from '../utils/accessibility';

test('check homepage accessibility', async ({ page }) => {
  await page.goto('https://anewbride.com/');
  const scanResults = await runAccessibilityCheck(page);
  
  console.log(formatAccessibilityReport(scanResults));
  expect(scanResults.passed).toBe(true);
});
```

### Comprehensive Audit (All Checks)

```typescript
import { runSEOChecks } from '../utils/seo-checks';
import { checkBrokenLinks } from '../utils/broken-links';
import { runAccessibilityCheck } from '../utils/accessibility';

test('full audit', async ({ page, request }) => {
  await page.goto('https://anewbride.com/');
  
  const [seoResults, brokenLinks, accessibilityResults] = await Promise.all([
    runSEOChecks(page),
    checkBrokenLinks(page, request),
    runAccessibilityCheck(page),
  ]);
  
  expect(seoResults.filter(r => !r.passed).length).toBe(0);
  expect(brokenLinks.length).toBe(0);
  expect(accessibilityResults.passed).toBe(true);
});
```

## Run Tests

```bash
# Run all tests
npm test

# Run specific test suite
npx playwright test tests/broken-links.spec.ts
npx playwright test tests/seo-checks.spec.ts
npx playwright test tests/accessibility.spec.ts
npx playwright test tests/comprehensive-audit.spec.ts

# Run with UI mode
npm run test:ui
```

## What Gets Checked

### Broken Links
- ✅ All `<a href="">` links on the page
- ✅ Status code validation (400+ = broken)
- ✅ Parallel checking for speed
- ✅ Skips javascript:, mailto:, tel: links

### SEO Checks
- ✅ Page title presence and content
- ✅ Meta description length (50-160 chars)
- ✅ Canonical URL
- ✅ Robots meta tag (index, follow)
- ✅ Image alt attributes
- ✅ Heading structure (H1, hierarchy)
- ✅ Open Graph tags (optional)

### Accessibility
- ✅ WCAG compliance via axe-core
- ✅ Violation detection
- ✅ Impact levels
- ✅ Affected elements identification
- ✅ **Interactive states**: Hover, focus, active button testing
- ✅ **Modal/popup testing**: Accessibility checks on open modals

