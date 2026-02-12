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

### Sensitive Data (keep out of git)

- Copy `config/sensitive-data.example.json` to `config/sensitive-data.local.json` (gitignored) and fill in non-public values (e.g., phone numbers for click-to-call and validation). Code will also read `config/sensitive-data.json` if present (also gitignored).
- Or set env vars:
  - `EXPECTED_PHONE_NUMBER`
  - `PHONE_TEST_US`
  - `PHONE_TEST_INTL`
  - `PHONE_TEST_FLEX`
- Do not commit real phone numbers or private URLs. The code falls back to placeholders if nothing is provided. The aggregated HTML and console matrix now show Selector + Target, so keep real targets in the gitignored config/env only.

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

## Test Execution Flow & Architecture

This section explains the internal structure and execution flow of the test suite - how tests run, in what order, and how results are processed.

### Function Code Flow (Key Calls)

- Entry scripts (`run-tests.js`, `test-url.js`, `test-multiple-urls.js`) set `URL_AUDIT_URL` and start Playwright (the multi-URL script runs URLs one-by-one for safety).
- `playwright.config.ts` loads env, sets reporters (`DeveloperTableReporter`, HTML, JSON), timeouts, and URL-based output paths (per-URL subfolders).
- `tests/url-audit.spec.ts` current flow (sequential phases):
  - Phase 1: SEO (`runSEOChecks`), Security (`runSecurityChecks`), Accessibility (`runAccessibilityCheck`), Broken links (`checkBrokenLinks`).
  - Phase 2: Forms (`validateForms`), Visual/layout (`runVisualTests`), Mobile responsiveness (`testMobileResponsiveness` + reset viewport), User flows (`runUserFlowTests` with expected phone), Functional components (`runFunctionalTests`).
- Reporters emit JSON/HTML/console output; `scripts/aggregate-errors.js` + `scripts/generate-aggregated-report.js` show Technical Specs boxes (Selector + Target URL); `test-multiple-urls.js` organizes per-URL reports sequentially.

### High-Level Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTRY POINT                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ npm test          │  │ npm run         │  │ node test-       │ │
│  │                 │  │ test:url <URL>   │  │ multiple-urls.js │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘ │
│           │                      │                       │           │
└───────────┼──────────────────────┼───────────────────────┼───────────┘
            │                      │                       │
            └──────────────────────┴───────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Playwright Config Load    │
                    │  (playwright.config.ts)     │
                    │  • Loads .env variables     │
                    │  • Sets retries: 0          │
                    │  • Configures reporters     │
                    │  • Sets timeouts (60s)      │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Test File Execution       │
                    │  (tests/url-audit.spec.ts)  │
                    │  • Reads URL from env       │
                    │  • Navigates to page        │
                    │  • Waits for DOM ready      │
                    └──────────────┬──────────────┘
                                   │
        ┌──────────────────────────┴──────────────────────────┐
        │                                                      │
        │         PHASE 1: PARALLEL CHECKS (10 checks)        │
        │         All run simultaneously for speed             │
        │                                                      │
        └──────────────────────────┬──────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
   ┌────▼────┐  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
   │   [1]   │  │   [2]   │  │   [3]   │  │   [4]   │  │   [5]   │
   │   SEO   │  │ Broken  │  │Accessi- │  │Security │  │Struct-  │
   │ Checks  │  │  Links  │  │ bility  │  │ Checks  │  │ ured    │
   │         │  │         │  │         │  │         │  │  Data   │
   └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
        │                          │                          │
   ┌────▼────┐  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
   │   [6]   │  │   [7]   │  │   [8]   │  │   [9]   │  │  [10]   │
   │ Social  │  │Extended │  │  Form   │  │Functional│  │ Visual  │
   │ Media   │  │   SEO   │  │Validate │  │  Tests  │  │  Tests  │
   └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
        │                          │                          │
        └──────────────────────────┴──────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  Wait for all parallel      │
                    │  checks to complete        │
                    │  (Promise.all)             │
                    └──────────────┬──────────────┘
                                   │
        ┌──────────────────────────┴──────────────────────────┐
        │                                                      │
        │    PHASE 2: SEQUENTIAL CHECKS (3 checks)            │
        │    Must run in order (viewport changes, state)      │
        │                                                      │
        └──────────────────────────┬──────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  [11] Mobile Responsiveness │
                    │  • Changes viewport         │
                    │  • Tests touch targets      │
                    │  • Checks responsive layout │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  Reset viewport to 1920x1080│
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  [12] Content Quality Checks │
                    │  • Content length            │
                    │  • Broken images             │
                    │  • Link density              │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  [13] User Flow Tests       │
                    │  • Contact forms            │
                    │  • Phone click-to-call       │
                    │  • Phone number images      │
                    │  • Profile browsing         │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Results Collection        │
                    │   • All 13 check results    │
                    │   • Error messages          │
                    │   • Status codes            │
                    └──────────────┬──────────────┘
                                   │
        ┌──────────────────────────┴──────────────────────────┐
        │                                                      │
        │              REPORT GENERATION PHASE                │
        │                                                      │
        └──────────────────────────┬──────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
   ┌────▼────┐              ┌─────▼─────┐            ┌─────▼─────┐
   │  JSON   │              │    HTML   │            │  Console  │
   │Reporter │              │  Reporter │            │ Reporter  │
   │         │              │           │            │(Developer │
   │Creates  │              │Creates    │            │  Table)   │
   │test-    │              │playwright-│            │           │
   │results. │              │report/    │            │Shows      │
   │json     │              │index.html │            │Action     │
   └────┬────┘              └─────┬─────┘            │Matrix     │
        │                         │                  └────────────┘
        │                         │
        └─────────────────────────┴─────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  Error Aggregation           │
                    │  (scripts/aggregate-errors.js)│
                    │  • Reads JSON report data     │
                    │  • Categorizes errors         │
                    │  • Deduplicates similar errors│
                    │  • Groups by URL              │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  HTML Report Generation      │
                    │  (scripts/generate-          │
                    │   aggregated-report.js)      │
                    │  • Parses error messages     │
                    │  • Creates Developer Matrix  │
                    │  • Formats actionable fixes  │
                    │  • Generates final HTML      │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  Report Organization         │
                    │  (if multiple URLs)         │
                    │  • Moves reports to URL-based│
                    │    directories               │
                    │  • Creates consolidated     │
                    │    index page               │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │      FINAL OUTPUT            │
                    │  • HTML reports in browser  │
                    │  • Console summary           │
                    │  • JSON data for automation  │
                    └─────────────────────────────┘
```

### Detailed Execution Flow

#### 1. Entry Points

**Single URL Test:**
```bash
npm run test:url https://example.com
```
- Sets `URL_AUDIT_URL` environment variable
- Runs Playwright with single URL
- Generates report in `playwright-report/`

**Multiple URL Test:**
```bash
node test-multiple-urls.js urls.txt
```
- Reads URLs from file (one per line)
- For each URL:
  - Sets `URL_AUDIT_URL` environment variable
  - Runs Playwright test
  - Moves report to temp directory
  - Creates fresh report directory
- After all tests: organizes reports by URL structure

**All Tests:**
```bash
npm test
```
- Runs all `.spec.ts` files in `tests/` directory
- Uses default URL from `.env` or `playwright.config.ts`

#### 2. Configuration Loading (`playwright.config.ts`)

**What happens:**
1. Loads `.env` file (if exists) and reads `URL_AUDIT_URL`/`TEST_URL`.
2. Generates URL-based output directories:
   - `playwright-report/{domain}/{path}/` - HTML reports.
3. Configures reporters:
   - **List Reporter** (progress)
   - **DeveloperTableReporter** (console Action Matrix)
   - **HTML Reporter** (interactive report)
   - **JSON Reporter** (centralized dashboard)
4. Sets timeouts: 60 seconds (actions/navigation).
5. **Retries: 0** (real failures, not flaky).
6. **Workers:** 1 on CI, 2 locally (adjust `workers` if you parallelize; current `test-multiple-urls.js` still runs sequentially).

#### 3. Test Execution (`tests/url-audit.spec.ts`)

**Step-by-step:**

1. **Page Navigation:**
   - Reads URL from `process.env.URL_AUDIT_URL`
   - Calls `gotoAndWaitForDOMContentLoaded()` - waits for DOM ready
   - Captures final URL (after redirects)

2. **Phase 1: Passive Checks (runs sequentially in current flow)**

   These checks run in a controlled order for stability:

   - **[1] SEO Checks** (`utils/seo-checks.ts`)
     - Page title, meta description, canonical URLs
     - Robots tags, image alt attributes, heading structure
   
   - **[2] Broken Links** (`utils/broken-links.ts`)
     - Extracts all links from page
     - Checks each link with trailing slash fallback logic:
       - Try original URL first
       - If fails (404/410), try alternate (with/without `/`)
       - Only marks broken if BOTH variants fail
     - Parallel link checking (configurable concurrency)
   
   - **[3] Accessibility** (`utils/accessibility.ts`)
     - Runs axe-core scan
     - Detects WCAG violations
     - Reports impact levels (critical, serious, moderate)
   
   - **[4] Security Checks** (`utils/security-checks.ts`)
     - HTTPS enforcement
     - Security headers (CSP, XSS protection)
     - Cookie security flags
     - Mixed content detection
   
   - **[5] Structured Data** (`utils/structured-data.ts`)
     - Validates JSON-LD schemas
     - Checks Microdata markup
     - Verifies schema types
   
   - **[6] Social Media Tags** (`utils/social-media.ts`)
     - Open Graph tags
     - Twitter Card validation
     - Social link validation
   
   - **[7] Extended SEO** (`utils/seo-extended.ts`)
     - Sitemap validation
     - robots.txt checks
     - URL structure validation
     - Language attributes
     - Breadcrumbs
   
   - **[8] Form Validation** (`utils/form-validation.ts`)
     - Email field validation
     - Phone field validation
     - Required field checks
     - Form submission testing
   
   - **[9] Functional Tests** (`utils/functional-tests.ts`)
     - CTA button functionality
     - Navigation menu testing
     - External link validation
     - Modal functionality
     - Video embed checks
   
   - **[10] Visual Tests** (`utils/visual-tests.ts`)
     - Element visibility checks
     - Layout structure verification
     - Resource loading validation
     - Layout shift measurement

3. **Phase 2: Sequential Checks (3 checks run in order)**

   These must run sequentially because they modify page state:

   - **[11] Mobile Responsiveness** (`utils/mobile-testing.ts`)
     - Changes viewport to mobile sizes (375x667, 768x1024, etc.)
     - Tests touch target sizes
     - Checks responsive layout
     - Tests mobile navigation
     - **After completion:** Resets viewport to 1920x1080
   
   - **[12] Content Quality** (`utils/content-checks.ts`)
     - Checks content length
     - Detects broken images
     - Analyzes link density
     - Runs after viewport reset
   
   - **[13] User Flow Tests** (`utils/user-flows.ts`)
     - Contact form flow testing
     - Phone click-to-call (tel: and callto: links)
     - **Phone Number Image Detection:**
       - Finds images in phone-related contexts
       - Checks if image URLs are broken (404/410)
       - If broken → marks as failed test
       - Optionally uses OCR (tesseract.js) to extract phone numbers
     - Profile browsing flow
     - Registration flow

4. **Results Collection:**
   - All 13 check results are collected
   - Errors are formatted with context
   - Results are logged to console
   - Assertions are evaluated (some optional, some required)

#### 4. Report Generation

**During Test Execution:**

1. **Console Reporter (DeveloperTableReporter):**
   - Parses error messages in real-time
   - Categorizes errors (broken-link, accessibility, security, etc.)
   - Formats as Developer Action Matrix
   - Shows: Context | Element | Error | Fix suggestion

2. **JSON Reporter:**
   - Creates `test-results.json` file
   - Contains all test results, errors, and metadata
   - Output to dashboard folder

3. **HTML Reporter:**
   - Generates `playwright-report/index.html`
   - Interactive test report with videos, screenshots
   - Shows test timeline and results

**After Test Execution (Post-Processing):**

1. **Error Aggregation** (`scripts/aggregate-errors.js`):
   - Reads JSON report data
   - Extracts all errors from test results
   - **Categorizes errors:**
     - `broken-link` - Link returns 404/410/network error
     - `accessibility` - WCAG violations
     - `seo` - SEO issues (missing title, meta, etc.)
     - `security` - Security header/HTTPS issues
     - `form-validation` - Form field issues
     - `functional` - Interactive element failures
     - `mobile` - Mobile responsiveness issues
     - `structured-data` - Schema validation failures
     - `social-media` - Missing meta tags
     - `seo-extended` - Advanced SEO issues
     - `visual` - Layout/visibility issues
     - `content` - Content quality issues
     - `user-flow` - User journey failures
   - **Deduplicates errors:**
     - Normalizes error messages (removes URLs, paths, timestamps)
     - Groups similar errors across multiple URLs
     - Counts affected URLs
   - Returns structured error summary

2. **HTML Report Generation** (`scripts/generate-aggregated-report.js`):
   - Reads aggregated error data
   - **Parses error messages:**
     - Strips ANSI color codes
     - Extracts link text from broken link errors
     - Extracts element selectors
     - Extracts status codes
   - **Creates Developer Action Matrix:**
     - Context (where error occurred)
     - Element (what element failed)
     - Error (what went wrong)
     - Fix (actionable suggestion)
   - **Deduplicates table rows:**
     - Uses `context|element|error` as unique key
     - Takes maximum `affected` count
   - Generates final HTML report with:
     - Summary statistics
     - Developer Action Matrix table
     - Filterable/searchable interface

3. **Report Organization** (if multiple URLs via `test-multiple-urls.js`):
- Moves each report to a URL-based directory structure sequentially
- Creates consolidated index page
- Links all individual reports

### Key Processing Details

#### Broken Link Trailing Slash Logic

The broken link checker implements intelligent URL normalization:

1. **Check original URL first**
2. **If fails (404/410/network error):**
   - Parse URL to check if it has a path component
   - If URL ends with `/` → try without `/`
   - If URL doesn't end with `/` → try with `/`
3. **If alternate works → link is NOT broken**
4. **If both fail → link IS broken**

This prevents false positives from URL normalization differences.

#### Error Deduplication Strategy

Errors are deduplicated using normalized error messages:

1. **Normalization:**
   - Convert to lowercase
   - Remove URLs (replace with `[url]`)
   - Remove file paths (replace with `[path]`)
   - Remove timestamps
   - Remove durations/sizes
   - Keep link text in quotes (important for parsing)

2. **Grouping:**
   - Same normalized error = same issue
   - Count affected URLs
   - Track all URLs where error occurred

3. **Table Deduplication:**
   - Use `context|element|error` as unique key
   - Take maximum `affected` count
   - Skip errors without meaningful link text

#### Retry Behavior

**Retries are disabled (`retries: 0`):**
- Broken links are real failures, not flaky tests
- Accessibility issues are consistent
- SEO problems don't resolve on retry

This ensures accurate reporting without false retry noise.

### File Structure

```
project-root/
├── playwright.config.ts          # Main configuration
├── tests/
│   └── url-audit.spec.ts        # Main test file (orchestrates all checks)
├── utils/
│   ├── seo-checks.ts            # [1] SEO checks
│   ├── broken-links.ts           # [2] Broken links (with trailing slash logic)
│   ├── accessibility.ts          # [3] Accessibility
│   ├── security-checks.ts        # [4] Security
│   ├── structured-data.ts        # [5] Structured data
│   ├── social-media.ts           # [6] Social media
│   ├── seo-extended.ts           # [7] Extended SEO
│   ├── form-validation.ts        # [8] Form validation
│   ├── functional-tests.ts      # [9] Functional tests
│   ├── visual-tests.ts           # [10] Visual tests
│   ├── mobile-testing.ts         # [11] Mobile testing
│   ├── content-checks.ts         # [12] Content checks
│   ├── user-flows.ts             # [13] User flows (phone image detection)
│   └── DeveloperTableReporter.ts # Console reporter
├── scripts/
│   ├── aggregate-errors.js      # Error aggregation & deduplication
│   └── generate-aggregated-report.js # HTML report generation
└── test-multiple-urls.js         # Batch URL testing script
```

### Test Checklist (from `testlist.txt`)

- Critical user flows: contact form submission; phone click-to-call (use local sensitive config for number); navigation menu; profile browsing; video interactions.
- Visual & layout: overall layout and visual checks.
- Functional tests: CTA buttons; social media links; external links (CBS, Netflix, CNN, etc.); sidebar widgets; mobile responsiveness (hamburger/menu/layout).
- Form validation: required fields; email format; phone format; success/error messaging.
- Accessibility: missing alt text; heading order; contrast; form labels; interactive roles (div acting as button).
- Snapshot vs assertion guidance: see https://playwright.dev/docs/aria-snapshots#when-to-use.
- Reference links: https://playwright.dev/; https://cruxvis.withgoogle.com/; https://github.com/GoogleChrome/web-vitals; https://devhints.io/xpath.

## Important Concepts

### Codegen vs Running Tests

**`playwright codegen`** - This tool **generates test code** by recording your browser interactions. It does NOT:
- Run tests
- Save videos
- Generate reports

**`playwright test`** - This **runs your tests** and will:
- Execute test files
- Generate test reports
- Organize output by URL

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

Test artifacts will be saved in the report directories after running tests.

## Report Configuration

Reports are configured in `playwright.config.ts`:
- HTML reports are saved to `playwright-report/{domain}/{path}/`
- Reports are organized automatically by URL being tested

## Test Scripts

### Core Test Commands
- `npm test` - Run all tests
- `npm run test:url` - Test a specific URL with comprehensive audit
- `npm run test:multiple-urls` - Test multiple URLs from a file
- `npm run test:ui` - Run tests with UI mode (recommended for first-time users)
- `npm run test:headed` - Run tests with visible browser
- `npm run test:debug` - Run tests in debug mode
- `npm run test:audits` - Run only audit/utility tests (SEO, broken links, accessibility)
- `npm run test:all-specs` - Run all `.spec.ts` files explicitly

### Codegen Commands
- `npm run codegen` - Start codegen (basic)
- `npm run codegen:url` - Start codegen with URL helper

### n8n Integration Commands
- `npm run test:n8n` - Run all tests and send results to n8n
- `npm run test:url:n8n` - Test a specific URL and send results to n8n
- `npm run send:n8n` - Send existing test results to n8n
- `npm run test:n8n-connection` - Test n8n connection

### Report Management Commands
- `npm run serve:reports` - Serve test reports locally
- `npm run prepare:github` - Prepare reports for GitHub
- `npm run verify:structure` - Verify report structure

### Direct Script Usage
- `node test-multiple-urls.js <file>` - Test multiple URLs from a file
- `node test-multiple-urls.js <file> --n8n` - Test multiple URLs and send to n8n

## Features

This testing suite provides comprehensive web quality assurance capabilities including SEO validation, accessibility auditing, security checks, functional testing, and more.

### Comprehensive URL Audit

The `tests/url-audit.spec.ts` test runs a streamlined audit suite on any URL, including:

1. **SEO Checks** - Title, meta description, canonical, robots, headings, alt
2. **Security Checks** - HTTPS, security headers, CSP
3. **Accessibility** - axe-core scan for WCAG issues
4. **Broken Links** - Detects failed HREFs with selector context
5. **Form Validation** - Required fields, email/phone formats
6. **Visual/Layout** - Element visibility, layout structure, resource loading
7. **Mobile Testing** - Responsive layout across viewports
8. **User Flows** - Contact/phone/profile flows (uses expected phone from config/env)
9. **Functional Components** - CTA buttons, nav, external links, modals, video embeds

**Usage:**
```bash
npm run test:url https://example.com/
```

### Broken Link Checking

Automated broken link detection with comprehensive reporting:

- **Extracts all links** from a page automatically
- **Normalizes URLs** (converts relative to absolute)
- **Parallel link checking** for fast execution (configurable concurrency)
- **Comprehensive reporting** with status codes and error details
- **Progress logging** for real-time status updates

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

Accessibility audits using axe-core with interactive state testing:

- **Automated accessibility scanning** with axe-core
- **Violation detection** and reporting with impact levels
- **Interactive state testing** - Hover, focus, and active states
- **Modal/popup testing** - Accessibility checks on open modals
- **Element-specific testing** - Test individual components
- **WCAG compliance** validation

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

**Interactive state testing:**
```typescript
import { runAccessibilityCheckOnHover, runAccessibilityCheckOnModal } from '../utils/accessibility';

// Test button on hover
const hoverResults = await runAccessibilityCheckOnHover(page, 'button.submit');

// Test modal accessibility
const modalResults = await runAccessibilityCheckOnModal(
  page,
  'button[data-open-modal]',  // Button that opens modal
  '.modal-content',            // Modal container
  '.modal-close'               // Close button (optional)
);
```

**Test files:**
- `tests/accessibility.spec.ts` - Basic accessibility testing
- `tests/interactive-accessibility.spec.ts` - Accessibility testing on hover, focus, and modals
- `tests/comprehensive-audit.spec.ts` - Combines SEO, broken links, and accessibility checks

## Utility Functions

All utility functions are located in the `utils/` folder. See `utils/README.md` for detailed documentation.

### Core Testing Utilities

- **`utils/broken-links.ts`** - Broken link checking with parallel execution and progress logging
- **`utils/seo-checks.ts`** - Basic SEO validation (title, meta description, canonical, robots, images, headings)
- **`utils/seo-extended.ts`** - Advanced SEO checks (sitemap, robots.txt, page speed, hreflang tags)
- **`utils/accessibility.ts`** - Accessibility testing with axe-core (static and interactive states)
- **`utils/page-load.ts`** - Page load utilities with configurable wait conditions

### Security & Performance

- **`utils/security-checks.ts`** - Security validation (HTTPS, secure headers, CSP, XSS protection)
- **`utils/performance.ts`** - Performance metrics and Core Web Vitals

### Content & Structure

- **`utils/structured-data.ts`** - JSON-LD schema validation and structured data checks
- **`utils/social-media.ts`** - Open Graph and Twitter Card tag validation
- **`utils/content-checks.ts`** - Content quality and structure validation
- **`utils/visual-tests.ts`** - Visual testing (element visibility, layout structure, resource loading)

### Functional Testing

- **`utils/functional-tests.ts`** - Functional testing (CTA buttons, navigation, external links, modals, videos)
- **`utils/form-validation.ts`** - Form validation and accessibility checks
- **`utils/user-flows.ts`** - User flow testing (contact forms, phone click-to-call, profile browsing, registration)
- **`utils/mobile-testing.ts`** - Mobile responsiveness testing across multiple viewports

### Helper Utilities

- **`utils/dom-helpers.ts`** - DOM interaction helpers with progress logging
- **`utils/screenshot-helpers.ts`** - Screenshot utilities
- **`utils/error-handling.ts`** - Error handling and context formatting
- **`utils/formatting.ts`** - Report formatting utilities
- **`utils/url-path.js`** - URL to file path conversion (for report organization)
- **`utils/DeveloperTableReporter.ts`** - Custom Playwright reporter for table-formatted output

**Progress Logging:**

Many utilities include comprehensive progress logging:
- Real-time status updates during operations
- Scroll progress indicators
- Lazy content loading detection
- Modal interaction tracking
- Link count summaries
- Test execution progress

## Running Tests

### Quick Test: Comprehensive URL Audit

Run a comprehensive audit on any URL with all checks (SEO, broken links, accessibility, security, structured data, social media, forms, functional tests, visual tests, mobile, content, and user flows) in one command:

```bash
npm run test:url https://anewbride.com/tour/things-to-consider-on-singles-tours.html
```

Or use npm test with URL argument:

```bash
npm test -- https://anewbride.com/tour/things-to-consider-on-singles-tours.html
```

This runs the comprehensive `url-audit.spec.ts` test against the provided URL without creating a test file. The URL can also be set via environment variables:
- `URL_AUDIT_URL`
- `TEST_URL`
- `BASE_URL`

**Note:** If you run `npm test` without a URL, it runs all test files in the `tests/` folder.

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

Test multiple URLs sequentially with automatic report organization (`test-multiple-urls.js` runs one URL at a time, so seeing 1 worker is expected):

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

