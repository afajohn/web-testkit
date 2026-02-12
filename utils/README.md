# Playwright Test Setup

A comprehensive testing suite for web applications using Playwright, featuring SEO checks, broken link detection, accessibility audits, and **multiple URL batch testing with automatic report organization**.

## Setup

Follow these steps to set up the project on your local machine.

### Prerequisites

- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

### Installation Steps

#### Option 1: Automated Setup (Windows - Recommended)

For Windows users, use the automated setup script:

```bash
setup.bat
```

This script will:
- Check if Node.js and npm are installed
- Install all npm dependencies automatically
- Install Playwright browsers with system dependencies
- Verify the setup and check for required files
- Provide clear feedback on any issues

#### Option 2: Manual Setup

1. **Install project dependencies:**
   ```bash
   npm install
   ```
   This will install all required packages including Playwright, Lighthouse, and testing utilities.

2. **Install Playwright browsers:**
   ```bash
   npx playwright install chromium --with-deps
   ```
   This installs the Chromium browser and required system dependencies for running tests.

3. **Verify the setup:**
   ```bash
   npx playwright test --list
   ```
   This command lists all available tests to verify everything is set up correctly.

### Optional: Environment Variables

You can create a `.env` file in the project root to set default test URLs:

```env
TEST_URL=https://anewbride.com/
URL_AUDIT_URL=https://anewbride.com/
```

### Quick Start

Once setup is complete, you can immediately run tests:

**Windows users:**
```bash
# Use the interactive menu (recommended)
run-tests-menu.bat
```

**All platforms:**
```bash
# Run all tests
npm test

# Run tests with UI mode (recommended for first-time users)
npm run test:ui
```

---

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
npm run test:url:n8n -- https://anewbride.com/
```

Or use the script directly:
```bash
node test-url-n8n.js https://anewbride.com/
```

**Send existing test results to n8n:**
```bash
npm run send:n8n
```

**Custom webhook URL and method:**
```bash
# Windows PowerShell (POST is recommended for large test results)
$env:N8N_WEBHOOK_URL="http://localhost:5678/webhook/playwright-results"
$env:N8N_WEBHOOK_METHOD="POST"  # or "GET" (POST recommended)
npm run send:n8n

# Or use test mode (works once per execution)
$env:N8N_WEBHOOK_URL="http://localhost:5678/webhook-test/playwright-results"
$env:N8N_WEBHOOK_METHOD="GET"
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

## Usage

### Generate Test Code (Codegen)

Use codegen to record interactions and generate test code:

```bash
# Using the helper script
node codegen.js https://anewbride.com 1920 1080

# Or with viewport-size flag
node codegen.js https://anewbride.com --viewport-size="1920,1080"

# Or directly with Playwright
npx playwright codegen --viewport-size="1920,1080" https://anewbride.com
```

**Note:** No videos are saved during codegen - it only generates test code!

### Run Tests (Get Videos)

Run your tests to get videos saved:

```bash
# Run all tests
npm test

# Or directly
npx playwright test

# Run with UI mode
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Run specific test file
npx playwright test tests/example.spec.ts
```

Videos will be saved in `test-results/` folder after running tests.

## Video Configuration

Videos are configured in `playwright.config.ts`:
- `video: 'on'` - Records video for every test
- Videos are automatically saved to `test-results/<test-name>/video.webm`

## Test Scripts

- `npm test` - Run all tests
- `npm run test:n8n` - Run all tests and send results to n8n
- `npm run test:url` - Test a specific URL
- `npm run test:url:n8n` - Test a specific URL and send results to n8n
- `npm run test:ui` - Run tests with UI mode
- `npm run test:headed` - Run tests with visible browser
- `npm run test:debug` - Run tests in debug mode
- `npm run send:n8n` - Send existing test results to n8n
- `npm run codegen` - Start codegen (basic)
- `npm run codegen:url` - Start codegen with URL helper
- `node test-multiple-urls.js <file>` - Test multiple URLs from a file
- `node test-multiple-urls.js <file> --n8n` - Test multiple URLs and send to n8n

## Features

### Broken Link Checking

The project includes utilities for automated broken link detection:

- **Extracts all links** from a page automatically
- **Normalizes URLs** (converts relative to absolute)
- **Parallel link checking** for fast execution
- **Comprehensive reporting** of broken links

**Example usage:**
```typescript
import { checkBrokenLinks, formatBrokenLinksReport } from '../utils/broken-links';

test('check broken links', async ({ page, request }) => {
  await page.goto('https://anewbride.com/');
  const brokenLinks = await checkBrokenLinks(page, request);
  console.log(formatBrokenLinksReport(brokenLinks));
  expect(brokenLinks.length).toBe(0);
});
```

**Test files:**
- `tests/broken-links.spec.ts` - Examples of broken link checking

### SEO Testing

Basic SEO validation utilities are included:

- **Page title** validation
- **Meta description** length checking (recommended 50-160 characters)
- **Canonical URL** verification
- **Robots meta tag** validation (index, follow directives)
- **Image alt attributes** checking
- **Heading structure** validation (H1 presence and hierarchy)
- **Open Graph tags** validation (optional)

**Example usage:**
```typescript
import { runSEOChecks, formatSEOCheckReport } from '../utils/seo-checks';

test('check SEO', async ({ page }) => {
  await page.goto('https://anewbride.com/');
  const results = await runSEOChecks(page);
  console.log(formatSEOCheckReport(results));
  
  const failedChecks = results.filter(r => !r.passed);
  expect(failedChecks.length).toBe(0);
});
```

**Test files:**
- `tests/seo-checks.spec.ts` - Examples of SEO testing

### Automatic SEO Audits with playwright-seo

This project integrates the `playwright-seo` library for comprehensive, automatic SEO validation. The library provides additional checks and automatic audit capabilities.

**Features:**
- **Automatic SEO audits** - Runs after each test automatically (via Playwright fixtures)
- **Comprehensive checks** - HTML lang, viewport meta, title length, canonical validation, noindex detection, and more
- **Configurable rules** - Centralized configuration in `playwright-seo.config.ts`
- **Flexible severity** - Choose between `error` (fail tests) or `warning` (log only)
- **URL exclusion** - Skip SEO audit for specific URL patterns
- **Noindex skip** - Automatically skip audit on pages with noindex

**Configuration:**

The SEO rules are configured in `playwright-seo.config.ts`. You can customize:
- Which rules to enforce (on/off)
- Thresholds (title length, meta description length)
- Runner behavior (severity, deduplication)
- URL exclusions

**Using Automatic SEO Audits:**

Import the extended test from the fixture file:

```typescript
// Use automatic SEO audits
import { test, expect } from './support/seo.auto';

test('my test', async ({ page }) => {
  await page.goto('https://example.com');
  // SEO audit runs automatically after this test
});
```

**Using Manual SEO Checks:**

You can still use the manual approach with existing utilities:

```typescript
// Use manual SEO checks
import { test, expect } from '@playwright/test';
import { runSEOChecks } from '../utils/seo-checks';

test('my test', async ({ page }) => {
  await page.goto('https://example.com');
  const results = await runSEOChecks(page);
  // Handle results manually
});
```

**Disabling SEO Audit for Specific Tests:**

```typescript
import { test } from './support/seo.auto';

// Disable for this entire file
test.use({ seoAudit: false });

// Or disable for a specific test
test('test without SEO', async ({ page }) => {
  // ...
});
test.use({ seoAudit: false });
```

**Configuration File:**

Edit `playwright-seo.config.ts` to customize SEO rules:

```typescript
export default defineSeoConfig({
  enforceHtmlLang: true,
  enforceViewport: true,
  enforceSingleH1: true,
  enforceTitle: true,
  title: { min: 10, max: 70 },
  enforceMetaDescription: true,
  metaDescription: { min: 50, max: 160 },
  enforceCanonical: true,
  enforceImgAlt: true,
  forbidNoindexOnProd: true,
  checkMainResponseStatus: true,
  skipIfNoindex: true,
  excludeUrls: [], // e.g. ['/admin/*', /\/api\//]
  runner: {
    dedupePerWorker: true,
    severity: 'error' // or 'warning'
  }
});
```

### Accessibility Testing

Accessibility audits using axe-core:

- **Automated accessibility scanning** with axe-core
- **Violation detection** and reporting
- **Integration** with Playwright test suite

**Example usage:**
```typescript
import { runAccessibilityCheck, formatAccessibilityReport } from '../utils/accessibility';

test('check accessibility', async ({ page }) => {
  await page.goto('https://anewbride.com/');
  const scanResults = await runAccessibilityCheck(page);
  console.log(formatAccessibilityReport(scanResults));
  expect(scanResults.passed).toBe(true);
});
```

**Test files:**
- `tests/accessibility.spec.ts` - Basic accessibility testing
- `tests/interactive-accessibility.spec.ts` - Accessibility testing on hover, focus, and modals
- `tests/comprehensive-audit.spec.ts` - Combines SEO, broken links, and accessibility checks

## Utility Functions

All utility functions are located in the `utils/` folder:

- `utils/broken-links.ts` - Broken link checking utilities (with progress logging)
- `utils/seo-checks.ts` - SEO validation utilities
- `utils/accessibility.ts` - Accessibility testing utilities
- `utils/url-path.js` - URL to file path conversion utilities (for report organization)
- `utils/dom-helpers.ts` - DOM interaction helpers (with progress logging)

**Progress Logging:**

The broken link and DOM helper utilities include comprehensive progress logging:
- Real-time status updates during link extraction
- Scroll progress indicators
- Lazy content loading detection
- Modal interaction tracking
- Link count summaries

## Running Tests

### Quick Test: Run All Audits on a URL

Test any URL with all audit checks (SEO, broken links, accessibility) in one command:

```bash
npm test -- https://anewbride.com/tour/things-to-consider-on-singles-tours.html
```

Or use the dedicated script:

```bash
npm run test:url https://anewbride.com/tour/things-to-consider-on-singles-tours.html
```

This runs all audit tests against the provided URL without creating a test file.

**Note:** If you run `npm test` without a URL, it runs all test files.

### Run All Tests (Recommended)

By default, `npm test` runs **ALL** `.spec.ts` files in the `tests/` folder:

```bash
npm test
```

This includes:
- All codegen-generated tests
- All utility/audit tests (broken links, SEO, accessibility)

### Run Only Audit/Utility Tests

Run only the SEO, broken links, and accessibility tests:

```bash
npm run test:audits
```

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

# Run multiple specific files
npx playwright test tests/broken-links.spec.ts tests/seo-checks.spec.ts
```

### Multiple URL Testing

Test multiple URLs sequentially with automatic report organization:

**Create a URL list file:**
```bash
# Create urls.txt with one URL per line
echo "https://example.com/page1" > urls.txt
echo "https://example.com/page2" >> urls.txt
echo "https://example.com/page3" >> urls.txt
```

**Run tests for multiple URLs:**
```bash
node test-multiple-urls.js urls.txt
```

**With n8n integration:**
```bash
node test-multiple-urls.js urls.txt --n8n
```

**Features:**
- **Sequential execution** - Tests run one at a time to prevent conflicts
- **Automatic report organization** - Each URL gets its own report directory
- **No overwriting** - Reports are preserved using a temp directory system
- **Consolidated index** - View all reports from a single index page
- **Progress logging** - Real-time progress updates during test execution
- **Unique directories** - Automatic hash suffixes prevent path collisions

**Report Organization:**

Reports are automatically organized by URL structure:
```
playwright-report/
├── index.html (Consolidated index page)
├── example.com/
│   ├── page1/
│   │   ├── index.html
│   │   └── data/
│   └── page2/
│       ├── index.html
│       └── data/
└── anotherdomain.com/
    └── path/
        ├── index.html
        └── data/
```

**How It Works:**

1. **During Test Execution:**
   - Each test runs sequentially (prevents DOM conflicts)
   - After each test completes, the entire `playwright-report/` directory is moved to a temp location (`playwright-report-temp-{index}/`)
   - A fresh empty `playwright-report/` directory is created for the next test
   - This prevents any report overwriting

2. **After All Tests Complete:**
   - All temp directories are organized to final URL-based locations
   - Each report is moved to: `playwright-report/{domain}/{path}/`
   - A consolidated index page is generated at `playwright-report/index.html`
   - All individual reports are linked from the consolidated index

3. **Viewing Reports:**
   - Open `playwright-report/index.html` in your browser
   - Click "View Report →" links to access individual URL reports
   - Each report is fully functional with all data, videos, and artifacts preserved

**Progress Logging:**

The system includes comprehensive progress logging:
- DOM readiness status
- Scroll progress and height detection
- Lazy content loading status
- Modal interaction progress
- Link extraction counts
- Report generation status

**Example Output:**
```
======================================================================
Testing URL 1/3: https://example.com/page1
======================================================================
   ⏳ Waiting for HTML report to be generated...
   ✅ Report is ready (45.2 KB, 12 data files)
   📦 Moving HTML report to temp directory...
   ✅ Moved report to temp directory: playwright-report-temp-0
   ✅ Preserved index.html (45.2 KB)
   ✅ Preserved data directory (12 file(s))
   ✅ Recreated empty playwright-report directory for next test

======================================================================
Organizing Temp Reports to Final Locations
======================================================================
   📦 Organizing report 1/3: https://example.com/page1
      From: playwright-report-temp-0
      To:   playwright-report/example.com/page1
      ✅ Organized successfully (45.2 KB)

✅ Consolidated index page generated: playwright-report/index.html
   📊 Reports accessible: 3/3
```

**Troubleshooting:**

- **Reports not found:** Ensure the test completed successfully. Failed tests may not generate reports.
- **Path collisions:** The system automatically adds hash suffixes to prevent collisions.
- **Missing reports:** Check the console output for any errors during report organization.

### Workflow: Codegen → Run All Tests

1. Generate test code: `node codegen.js <URL>`
2. Save generated code to a new `.spec.ts` file in `tests/`
3. Run all tests: `npm test` (runs everything including your new test)

