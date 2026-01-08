# Playwright Web TestKit

A comprehensive Playwright-based testing toolkit for automated website quality audits. This project provides utilities for SEO validation, broken link detection, accessibility testing, GTM verification, and more.

## Features

### 🧪 Testing Capabilities

- **SEO Testing** - Validates page titles, meta descriptions, canonical URLs, heading structure, robots meta tags, image alt attributes, and Open Graph tags
- **Broken Link Detection** - Automatically checks all links on pages with parallel processing for fast execution
- **Accessibility Auditing** - WCAG compliance testing using axe-core, including interactive state testing (hover, focus, modals)
- **GTM Verification** - Checks Google Tag Manager implementation and validates container ID, gtm.js loading, and dataLayer
- **Performance Testing** - Page load metrics and performance analysis
- **Comprehensive Reporting** - Generates detailed JSON and HTML reports organized by URL structure

### 📊 Report Organization

Reports are automatically organized into URL-based nested folders:
- `reports/<domain>/<path>/filename.json` - JSON reports with merged test results
- `test-results/<domain>/<path>/` - Playwright test artifacts (videos, screenshots)
- `playwright-report/<domain>/<path>/` - HTML reports for easy viewing

### 🔄 Workflow Integration

- **n8n Integration** - Automatically sends test results to n8n workflows for further processing
- **Batch URL Testing** - Test multiple URLs sequentially with progress tracking
- **GitHub Pages Ready** - Prepare reports for GitHub Pages deployment

## Quick Start

### Installation

```bash
npm install
npx playwright install
```

### Basic Usage

**Test a single URL:**
```bash
npm run test:url https://example.com
```

**Test multiple URLs (batch):**
```bash
npm run test:url:batch
```

**Run all tests:**
```bash
npm test
```

**Run with UI mode:**
```bash
npm run test:ui
```

## Test Scripts

### Core Test Commands

- `npm test` - Run all tests in `tests/` folder
- `npm run test:url <URL>` - Test a specific URL with all audit checks
- `npm run test:url:batch` - Test multiple URLs from `run-batch-url-tests.js`
- `npm run test:audits` - Run only audit tests (SEO, broken links, accessibility)
- `npm run test:gtm` - Test Google Tag Manager specifically
- `npm run test:ui` - Run tests with Playwright UI mode
- `npm run test:headed` - Run tests with visible browser
- `npm run test:debug` - Run tests in debug mode

### n8n Integration

- `npm run test:n8n` - Run all tests and send results to n8n
- `npm run test:url:n8n <URL>` - Test URL and send results to n8n
- `npm run send:n8n` - Send existing test results to n8n
- `npm run test:n8n-connection` - Test n8n webhook connection

### Report Management

- `npm run serve:reports` - Serve HTML reports via HTTP server
- `npm run prepare:github` - Prepare reports for GitHub Pages
- `npm run verify:structure` - Verify report directory structure

### Code Generation

- `npm run codegen` - Start Playwright codegen
- `npm run codegen:url <URL>` - Start codegen with URL helper

## n8n Integration

This project integrates with n8n for automated workflow processing of test results.

### Setup

1. **Install n8n** (if not already installed):
   ```bash
   npm install -g n8n
   ```

2. **Start n8n**:
   ```bash
   n8n
   ```
   Access n8n UI at: http://localhost:5678

3. **Create webhook workflow** in n8n:
   - Add "Webhook" node with path: `playwright-results`
   - HTTP Method: POST
   - Add "Respond to Webhook" node
   - **IMPORTANT: Activate the workflow** (toggle switch in top-right)
   - The webhook URL will be: `http://localhost:5678/webhook/playwright-results`

### Usage

**Run tests and send to n8n:**
```bash
npm run test:n8n
```

**Test specific URL and send to n8n:**
```bash
npm run test:url:n8n https://example.com
```

**Send existing test results to n8n:**
```bash
npm run send:n8n
```

**Test n8n connection:**
```bash
npm run test:n8n-connection
```

**Custom webhook URL and method:**
```bash
# Windows PowerShell
$env:N8N_WEBHOOK_URL="http://localhost:5678/webhook/playwright-results"
$env:N8N_WEBHOOK_METHOD="POST"  # or "GET" (POST recommended)
npm run send:n8n
```

See `scripts/README.md` for detailed documentation.

**Troubleshooting**: If you get "webhook not registered" error, see `N8N_TROUBLESHOOTING.md` for step-by-step solutions.

**Data Structure**: See `N8N_DATA_STRUCTURE.md` for complete documentation on what data is sent to n8n and how to access it.

## Important Concepts

### Codegen vs Running Tests

**`playwright codegen`** - This tool **generates test code** by recording your browser interactions. It does NOT:
- Run tests
- Save videos
- Create test-results folder

**`playwright test`** - This **runs your tests** and will:
- Execute test files
- Save videos to `test-results/` folder
- Generate test reports

## Test Files

### Audit Tests

- `tests/url-audit.spec.ts` - Dynamic URL audit test (comprehensive: SEO, broken links, accessibility, GTM)
- `tests/comprehensive-audit.spec.ts` - Full site audit combining all checks
- `tests/seo-checks.spec.ts` - SEO validation examples
- `tests/broken-links.spec.ts` - Broken link checking examples
- `tests/accessibility.spec.ts` - Basic accessibility testing
- `tests/interactive-accessibility.spec.ts` - Accessibility testing on hover, focus, and modals
- `tests/gtm-check.spec.ts` - Google Tag Manager verification

### Utility Tests

- `tests/multi-url-audit.spec.ts` - Multiple URL audit testing
- `tests/seo-auto-test.spec.ts` - Automated SEO testing

## Features

### Broken Link Checking

The project includes utilities for automated broken link detection:

- **Extracts all links** from a page automatically with element information (selector, text, HTML)
- **Normalizes URLs** (converts relative to absolute)
- **Parallel link checking** for fast execution (configurable concurrency)
- **Comprehensive reporting** of broken links with element details
- **Identifies links** that work but need trailing slash
- **Groups multiple elements** linking to the same URL

**Example usage:**
```typescript
import { checkBrokenLinks, formatBrokenLinksReport } from '../utils/broken-links';

test('check broken links', async ({ page, request }) => {
  await page.goto('https://example.com/');
  const brokenLinks = await checkBrokenLinks(page, request);
  console.log(formatBrokenLinksReport(brokenLinks));
  expect(brokenLinks.length).toBe(0);
});
```

### SEO Testing

Comprehensive SEO validation utilities:

- **Page title** validation (with optional pattern matching)
- **Meta description** length checking (recommended 50-160 characters)
- **Canonical URL** verification
- **Robots meta tag** validation (index, follow directives)
- **Image alt attributes** checking with detailed image information
- **Heading structure** validation (H1 presence and hierarchy)
- **Open Graph tags** validation (optional)
- **Detailed metadata tables** for comprehensive reporting

**Example usage:**
```typescript
import { runSEOChecks, formatSEOCheckReport } from '../utils/seo-checks';

test('check SEO', async ({ page }) => {
  await page.goto('https://example.com/');
  const results = await runSEOChecks(page, {
    checkRobots: true, // Include robots meta tag check
  });
  console.log(await formatSEOCheckReport(results, page)); // Pass page for detailed table
  
  const failedChecks = results.filter(r => !r.passed);
  expect(failedChecks.length).toBe(0);
});
```

### Accessibility Testing

Accessibility audits using axe-core:

- **Automated accessibility scanning** with axe-core
- **Violation detection** and reporting with impact levels
- **Interactive state testing**: Hover, focus, and modal states
- **Element-specific testing**: Test individual components
- **Integration** with Playwright test suite

**Example usage:**
```typescript
import { runAccessibilityCheck, formatAccessibilityReport } from '../utils/accessibility';

test('check accessibility', async ({ page }) => {
  await page.goto('https://example.com/');
  const scanResults = await runAccessibilityCheck(page);
  console.log(formatAccessibilityReport(scanResults));
  expect(scanResults.passed).toBe(true);
});
```

**Interactive accessibility testing:**
```typescript
import { runAccessibilityCheckOnHover } from '../utils/accessibility';

const button = page.locator('button.submit');
const scanResults = await runAccessibilityCheckOnHover(page, button);
expect(scanResults.passed).toBe(true);
```

### GTM Verification

Google Tag Manager implementation checking:

- **Multiple detection methods** (script tags, noscript iframe, HTML pattern matching)
- **Container ID validation** (GTM-XXXXX format)
- **gtm.js loading verification** (script tag, google_tag_manager object, performance API, dataLayer)
- **dataLayer verification** with push event detection
- **Detailed verification status** reporting

**Example usage:**
```typescript
import { checkGTMImplementation, formatGTMReport } from '../utils/gtm-check';

test('check GTM', async ({ page }) => {
  await page.goto('https://example.com/');
  const gtmResult = await checkGTMImplementation(page);
  console.log(formatGTMReport(gtmResult));
  expect(gtmResult.hasGTM).toBe(true);
});
```

## Report Organization

Reports are automatically organized by URL structure:

### JSON Reports

- Location: `reports/<domain>/<path>/filename.json`
- Contains: Merged test results (SEO, broken links, accessibility, GTM)
- Structure: Organized by domain and URL path hierarchy
- Error reports: Saved with `error-` prefix in same nested structure

### Test Results

- Location: `test-results/<domain>/<path>/`
- Contains: Test artifacts (videos, screenshots, traces), `test-results.json`
- Organized by: URL structure matching tested URLs

### HTML Reports

- Location: `playwright-report/<domain>/<path>/`
- Contains: Interactive HTML reports with videos and detailed test information
- Organized by: URL structure (automatically moved after tests)

### Example Structure

```
reports/
├── mexicocitydating.com/
│   ├── root/
│   │   ├── about-page.json
│   │   └── error-404.json
│   └── mexico-city-dating-tour-vacations/
│       └── tour-schedule.json
```

See `REPORT_STRUCTURE.md` and `DIRECTORY_STRUCTURE.md` for detailed documentation.

## Utility Functions

All utility functions are located in the `utils/` folder:

- `utils/broken-links.ts` - Broken link checking utilities
- `utils/seo-checks.ts` - SEO validation utilities
- `utils/accessibility.ts` - Accessibility testing utilities
- `utils/gtm-check.ts` - Google Tag Manager verification utilities
- `utils/page-load.ts` - Page loading utilities
- `utils/file-utils.ts` - File path and writing utilities
- `utils/report-merger.ts` - Report merging utilities
- `utils/error-handling.ts` - Error formatting utilities

See `utils/README.md` for detailed API documentation.

## Scripts

Utility scripts are located in the `scripts/` folder:

- `scripts/send-to-n8n.js` - Send test results to n8n webhook
- `scripts/test-n8n-connection.js` - Test n8n webhook connection
- `scripts/organize-html-report.js` - Organize HTML reports by URL (auto-runs)
- `scripts/generate-domain-summary.js` - Generate domain-wide summary reports
- `scripts/prepare-github-reports.js` - Prepare reports for GitHub Pages
- `scripts/serve-reports.js` - Serve HTML reports via HTTP server
- `scripts/verify-structure.js` - Verify report directory structure

See `scripts/README.md` for detailed script documentation.

## Running Tests

### Quick Test: Run All Audits on a URL

Test any URL with all audit checks (SEO, broken links, accessibility, GTM) in one command:

```bash
npm run test:url https://example.com/page.html
```

Or directly:
```bash
node test-url.js https://example.com/page.html
```

This runs all audit tests against the provided URL and saves results to `reports/` with nested folder structure.

**Note:** If you run `npm test` without a URL, it runs all test files in the `tests/` folder.

### Run All Tests (Recommended)

By default, `npm test` runs **ALL** `.spec.ts` files in the `tests/` folder:

```bash
npm test
```

This includes:
- All codegen-generated tests
- All utility/audit tests (broken links, SEO, accessibility, GTM)

### Run Only Audit/Utility Tests

If you want to run only the SEO, broken links, and accessibility tests:

```bash
npm run test:audits
```

This runs:
- `tests/broken-links.spec.ts`
- `tests/seo-checks.spec.ts`
- `tests/accessibility.spec.ts`
- `tests/comprehensive-audit.spec.ts`

### Run Specific Test Files

```bash
# Run only broken link tests
npx playwright test tests/broken-links.spec.ts

# Run only SEO tests
npx playwright test tests/seo-checks.spec.ts

# Run only accessibility tests
npx playwright test tests/accessibility.spec.ts

# Run comprehensive audit
npx playwright test tests/comprehensive-audit.spec.ts

# Run URL audit (dynamic URL)
npx playwright test tests/url-audit.spec.ts

# Run multiple specific files
npx playwright test tests/broken-links.spec.ts tests/seo-checks.spec.ts
```

### Batch URL Testing

Test multiple URLs sequentially:

1. Edit `run-batch-url-tests.js` and add your URLs to the `URLS` array
2. Run batch tests:
   ```bash
   npm run test:url:batch
   ```

The script:
- Runs tests for each URL sequentially
- Tracks progress and statistics
- Organizes reports by URL structure
- Provides summary of passed/failed tests

## Workflow: Codegen → Testing

### Step 1: Generate Test Code with Codegen

Use codegen to generate test code for a URL:

```bash
# Using the helper script with custom viewport
node codegen.js https://example.com 1920 1080

# Or with viewport-size flag
node codegen.js https://example.com --viewport-size="1920,1080"

# Or directly with Playwright
npx playwright codegen --viewport-size="1920,1080" https://example.com
```

**Note:** No videos are saved during codegen - it only generates test code!

### Step 2: Save Generated Code to a Test File

Copy the generated code from the codegen window and save it to a new file in the `tests/` folder, for example:
- `tests/my-page-test.spec.ts`

### Step 3: Run All Tests

After creating your test file, run all tests:

```bash
npm test
```

This will run:
- Your newly created test file
- All existing test files
- All audit/utility tests (broken links, SEO, accessibility, GTM)

## Video Configuration

Videos are configured in `playwright.config.ts`:
- `video: 'on'` - Records video for every test
- Videos are automatically saved to `test-results/<test-name>/video.webm`
- Organized by URL structure when using URL-based testing

## Report Generation

### Domain Summary Reports

Generate domain-wide summary reports:

```bash
node scripts/generate-domain-summary.js example.com
```

Creates a markdown report summarizing:
- Total pages tested
- Pages with issues vs pages passed
- Aggregated SEO failures
- Unique broken links (deduplicated)
- Accessibility violations grouped by rule
- Pages without GTM

### Serving Reports Locally

Serve HTML reports via HTTP server:

```bash
npm run serve:reports
```

Access reports at:
- Local: `http://localhost:9323`
- Network: `http://<your-ip>:9323` (shown in console)

### GitHub Pages Deployment

Prepare reports for GitHub Pages:

```bash
npm run prepare:github
```

See `scripts/GITHUB_REPORTS.md` for detailed deployment instructions.

## Documentation

- `README.md` - This file - Main project documentation
- `utils/README.md` - Utility functions API documentation
- `scripts/README.md` - Scripts usage documentation
- `REPORT_STRUCTURE.md` - Report organization structure
- `DIRECTORY_STRUCTURE.md` - Directory structure guide
- `TESTING_GUIDE.md` - Testing guide and examples
- `QUICK_START.md` - Quick start examples
- `N8N_SETUP.md` - n8n integration setup
- `N8N_DATA_STRUCTURE.md` - n8n data structure documentation
- `N8N_TROUBLESHOOTING.md` - n8n troubleshooting guide
- `scripts/GITHUB_REPORTS.md` - GitHub Pages deployment guide
- `scripts/SHARE_REPORTS.md` - Sharing reports guide

## Requirements

- Node.js 16+ 
- Playwright (installed via `npx playwright install`)
- n8n (optional, for workflow integration)

## Dependencies

- `@playwright/test` - Playwright testing framework
- `@axe-core/playwright` - Accessibility testing with axe-core
