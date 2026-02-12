# Project Codespace Summary

## Overview

**Playwright QA Automation** is a comprehensive web testing suite that audits URLs for SEO, accessibility, security, broken links, and functional issues. It generates detailed reports and can integrate with n8n for automated workflows.

**Key Capability:** Run one command to audit a URL across 13 different test categories and get actionable reports.

---

## What This Project Does

- **Comprehensive URL Audits** - Tests any URL against 13 different quality checks
- **Multiple URL Batch Testing** - Test hundreds of URLs automatically with organized reports
- **Report Generation** - Creates HTML, JSON, and console reports with developer action matrices
- **n8n Integration** - Send test results to workflows for further processing
- **Error Aggregation** - Deduplicates and categorizes errors across multiple tests

---

## Quick Start

### 1. Setup (Windows)
```bash
setup.bat
```

### 2. Run Tests
```bash
# Single URL audit (most common)
npm run test:url https://example.com

# All tests (if you have .spec.ts files)
npm test

# Multiple URLs from file
node test-multiple-urls.js urls.txt

# With UI mode (interactive)
npm run test:ui
```

### 3. View Reports
```bash
# Start report server
npm run serve:reports

# Then open browser to localhost:3000
```

---

## The 13 Test Categories

| # | Test | What It Checks | File |
|---|------|---|---|
| 1 | SEO Checks | Title, meta description, canonical, robots, headings, alt text | `utils/seo-checks.ts` |
| 2 | Broken Links | All page links for 404/410 errors with trailing slash logic | `utils/broken-links.ts` |
| 3 | Accessibility | WCAG violations using axe-core | `utils/accessibility.ts` |
| 4 | Security | HTTPS, security headers, CSP, XSS protection | `utils/security-checks.ts` |
| 5 | Structured Data | JSON-LD and Microdata schema validation | `utils/structured-data.ts` |
| 6 | Social Media | Open Graph and Twitter Card tags | `utils/social-media.ts` |
| 7 | Extended SEO | Sitemap, robots.txt, hreflang, breadcrumbs | `utils/seo-extended.ts` |
| 8 | Form Validation | Required fields, email/phone formats | `utils/form-validation.ts` |
| 9 | Functional Tests | CTA buttons, navigation, external links, modals, videos | `utils/functional-tests.ts` |
| 10 | Visual Tests | Element visibility, layout structure, resource loading | `utils/visual-tests.ts` |
| 11 | Mobile Testing | Responsive layout across viewports (375px, 768px, etc.) | `utils/mobile-testing.ts` |
| 12 | Content Quality | Content length, broken images, link density | `utils/content-checks.ts` |
| 13 | User Flows | Contact forms, phone click-to-call, profile browsing | `utils/user-flows.ts` |

---

## Project Structure

```
project-root/
│
├─ 📋 DOCUMENTATION & CONFIG
│  ├── README.md                           # Full documentation (1000+ lines)
│  ├── CODESPACE_SUMMARY.md                # This file - quick reference
│  ├── QUICK_START.md                      # Quick setup guide
│  ├── TESTING_GUIDE.md                    # Testing best practices
│  ├── N8N_SETUP.md                        # n8n integration setup
│  ├── N8N_DATA_STRUCTURE.md               # Data format sent to n8n
│  ├── N8N_TROUBLESHOOTING.md              # n8n troubleshooting guide
│  ├── DIRECTORY_STRUCTURE.md              # Project directory reference
│  ├── REPORT_STRUCTURE.md                 # Report file organization
│  ├── VERIFICATION_REPORT.md              # Test verification guide
│  ├── mapplan.txt                         # Project map/plan
│  ├── testlist.txt                        # List of tests to run
│  ├── urls.txt                            # URLs for batch testing
│  ├── package.json                        # npm dependencies
│  └── playwright.config.ts                # Main Playwright configuration
│
├─ 🎬 CONFIGURATION FILES
│  ├── playwright-seo.config.ts            # SEO audit rules
│  ├── config/
│  │  └── sensitive-data.example.json      # Template for sensitive data
│  └── .env                                # Optional environment variables
│
├─ 🧪 TEST FILES
│  ├── tests/
│  │  ├── url-audit.spec.ts                # Main audit test (all 13 checks)
│  │  ├── accessibility.spec.ts            # WCAG compliance tests
│  │  ├── broken-links.spec.ts             # Broken link detection tests
│  │  ├── seo-checks.spec.ts               # SEO validation tests
│  │  ├── comprehensive-audit.spec.ts      # Combined audit tests
│  │  ├── interactive-accessibility.spec.ts # Hover/focus/modal a11y tests
│  │  ├── example.spec.ts                  # Example test template
│  │  └── [other generated .spec.ts files] # User-generated tests
│
├─ 🛠️ UTILITY MODULES (Core Testing Functions)
│  └── utils/
│     ├── seo-checks.ts                    # [1] SEO validation
│     ├── broken-links.ts                  # [2] Broken link detection
│     ├── accessibility.ts                 # [3] Accessibility scanning (axe-core)
│     ├── security-checks.ts               # [4] Security validation
│     ├── structured-data.ts               # [5] Structured data/Schema validation
│     ├── social-media.ts                  # [6] Social media tags validation
│     ├── seo-extended.ts                  # [7] Extended SEO checks
│     ├── form-validation.ts               # [8] Form field validation
│     ├── functional-tests.ts              # [9] Functional element testing
│     ├── visual-tests.ts                  # [10] Visual/layout testing
│     ├── mobile-testing.ts                # [11] Mobile responsive testing
│     ├── content-checks.ts                # [12] Content quality checks
│     ├── user-flows.ts                    # [13] User flow/journey testing
│     ├── DeveloperTableReporter.ts        # Custom console output formatter
│     ├── dom-helpers.ts                   # DOM interaction utilities
│     ├── screenshot-helpers.ts            # Screenshot utilities
│     ├── error-handling.ts                # Error handling & formatting
│     ├── formatting.ts                    # Report formatting utilities
│     ├── page-load.ts                     # Page loading utilities
│     ├── performance.ts                   # Performance metrics
│     └── url-path.js                      # URL to file path conversion
│
├─ 📊 SCRIPTS & TOOLS
│  ├── scripts/
│  │  ├── README.md                        # Scripts documentation
│  │  ├── aggregate-errors.js              # Error deduplication & categorization
│  │  ├── generate-aggregated-report.js    # HTML report generation
│  │  ├── organize-html-report.js          # Report organization utility
│  │  ├── organize-parallel-reports.js     # Multi-URL report organization
│  │  ├── prepare-github-reports.js        # GitHub report preparation
│  │  ├── send-to-n8n.js                   # n8n webhook sender
│  │  ├── serve-reports.js                 # Local report server
│  │  ├── test-n8n-connection.js           # n8n connection tester
│  │  ├── verify-structure.js              # Report structure validator
│  │  ├── GITHUB_REPORTS.md                # GitHub integration guide
│  │  └── SHARE_REPORTS.md                 # Report sharing guide
│  │
│  ├── codegen.js                          # Playwright codegen helper
│  ├── run-tests.js                        # Test runner script
│  ├── test-url.js                         # Single URL test script
│  ├── test-url-n8n.js                     # Single URL test + n8n sender
│  ├── test-multiple-urls.js               # Batch URL test script
│  ├── diagnose-reports.js                 # Report diagnostics
│  ├── fix-report.js                       # Report repair utility
│  ├── replace.js                          # Text replacement utility
│  │
│  ├── setup.bat                           # Windows automated setup
│  ├── run-tests.bat                       # Windows test runner
│  ├── run-audit.bat                       # Windows audit runner
│  └── run-tests-menu.bat                  # Windows interactive menu
│
├─ 📈 REPORTS & RESULTS
│  ├── playwright-report/                  # Generated Playwright HTML reports
│  │  ├── failures/                        # Failed test artifacts
│  │  ├── index.html                       # Report index page
│  │  ├── [domain]/[path]/                 # Per-URL organized reports
│  │  ├── aggregated-report.html           # Developer action matrix
│  │  └── test-results.json                # Raw test data (JSON)
│  │
│  ├── test-results/                       # Detailed test result directories
│  │  ├── scaled-audit-Audit-https-*.*/    # Individual URL test results
│  │  ├── [test-name]*/                    # Named test result folders
│  │  └── *.json                           # Test output files
│  │
│  └── reports/
│     └── aura-dashboard/                  # Dashboard report files
│
└─ ⚙️ PROJECT FILES
   └── [generated node_modules/]           # Dependencies (npm install)
```

### 📂 Key Directories Explained

| Directory | Purpose | Contents |
|-----------|---------|----------|
| `tests/` | Test specifications | `.spec.ts` files for Playwright tests |
| `utils/` | Shared utilities | Reusable functions for all tests (13 core modules) |
| `scripts/` | Automation scripts | Error aggregation, report generation, helpers |
| `playwright-report/` | Test reports | HTML reports, JSON data, videos, traces |
| `test-results/` | Raw results | Per-URL test results and artifacts |
| `config/` | Configuration | Sensitive data templates |

---

## Common Commands

### Running Tests
```bash
npm run test:url <URL>              # Single URL comprehensive audit
npm test                            # Run all .spec.ts files
npm run test:ui                     # Interactive UI mode
npm run test:headed                 # Show browser during tests
npm run test:debug                  # Debug mode
npm run test:audits                 # Only audit/utility tests
node test-multiple-urls.js urls.txt # Multiple URLs from file
```

### Code Generation
```bash
npm run codegen                     # Start interactive codegen
npm run codegen:url                 # Codegen with URL helper
node codegen.js <URL>              # Direct codegen command
```

### n8n Integration
```bash
npm run test:n8n                    # Test all URLs and send to n8n
npm run test:url:n8n -- <URL>       # Test single URL and send to n8n
npm run send:n8n                    # Send existing results to n8n
npm run test:n8n-connection         # Test n8n webhook connection
```

### Report Management
```bash
npm run serve:reports               # Start report server (http://localhost:3000)
npm run prepare:github              # Format reports for GitHub
npm run verify:structure             # Check report structure validity
```

---

## How Tests Execute (Simplified Flow)

1. **Entry Point**
   ```bash
   npm run test:url https://example.com
   ```

2. **Configuration Loading** (`playwright.config.ts`)
   - Loads environment variables
   - Sets up reporters (HTML, JSON, Console)
   - Configures timeouts and retry logic

3. **Test Execution** (`tests/url-audit.spec.ts`)
   - Navigates to URL
   - **Phase 1:** Runs 10 passive checks sequentially (SEO, links, a11y, security, etc.)
   - **Phase 2:** Runs 3 sequential checks (mobile testing, content, user flows)
   - Collects all results

4. **Report Generation**
   - **JSON Report:** Machine-readable test data
   - **HTML Report:** Interactive report with videos/screenshots
   - **Console Output:** Real-time Developer Action Matrix

5. **Error Aggregation** (post-test)
   - `scripts/aggregate-errors.js` - Groups similar errors
   - `scripts/generate-aggregated-report.js` - Creates HTML matrix
   - Deduplicates across multiple URL tests

6. **Report Organization** (for multiple URLs)
   - Each report moves to `playwright-report/{domain}/{path}/`
   - Creates consolidated index page
   - All reports linked and accessible

---

## Configuration Files

### `.env` (Optional)
Set default test URLs:
```env
TEST_URL=https://example.com
URL_AUDIT_URL=https://example.com
```

### `config/sensitive-data.local.json` (Gitignored)
For phone numbers and private data:
```json
{
  "EXPECTED_PHONE_NUMBER": "+1234567890",
  "PHONE_TEST_US": "+1234567890",
  "PHONE_TEST_INTL": "+442071234567"
}
```

### `playwright.config.ts`
Main test configuration:
- Timeout settings (60s per action)
- Reporter configuration
- Retry logic (disabled for real failures)
- Output paths

### `playwright-seo.config.ts`
SEO audit rules (can customize):
- Title length (10-70 chars)
- Meta description length (50-160 chars)
- h1 uniqueness
- Canonical requirement
- noindex handling

---

## Developer Action Matrix (Console Output)

When tests run, you'll see a table like:

```
┌─────────────────────┬──────────────────┬──────────────┬────────────────┐
│ Context             │ Element          │ Error        │ Fix            │
├─────────────────────┼──────────────────┼──────────────┼────────────────┤
│ Broken Links (5)    │ a.external-link  │ 404 Not Found│ Update href    │
│ SEO                 │ <head>           │ Missing h1   │ Add <h1>       │
│ Accessibility       │ img#hero         │ No alt text  │ Add alt attr   │
└─────────────────────┴──────────────────┴──────────────┴────────────────┘
```

This shows exactly what failed and how to fix it.

---

## Report Dashboard Wireframe

### 1. Consolidated Index Page (Multiple URLs)

```
╔════════════════════════════════════════════════════════════════════════╗
║  🏠 Playwright QA Automation - Test Results Dashboard                  ║
║  Generated: Feb 9, 2026 | 3 URLs tested | Execution time: 4m 32s     ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  📊 SUMMARY STATISTICS                                                ║
║  ├─ Total URLs Tested: 3                                             ║
║  ├─ Total Tests Run: 39 (13 checks × 3 URLs)                        ║
║  ├─ Passed: 34                                                       ║
║  ├─ Failed: 5                                                        ║
║  └─ Success Rate: 87.2%                                              ║
║                                                                        ║
║  🔴 FAILED REPORTS (5 issues across 2 URLs)                          ║
║  ├─ ✓ example.com/page1        [View Report →]  3 issues             ║
║  ├─ ✓ example.com/page2        [View Report →]  0 issues             ║
║  └─ ✓ anotherdomain.com/path   [View Report →]  2 issues             ║
║                                                                        ║
║  📈 ERROR BREAKDOWN BY CATEGORY                                       ║
║  ├─ 🔗 Broken Links: 2 (1 on page1, 1 on anotherdomain)             ║
║  ├─ ♿ Accessibility: 1 (on page1)                                    ║
║  ├─ 📝 SEO: 1 (on anotherdomain)                                     ║
║  └─ 🔒 Security: 1 (on page1)                                        ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝
```

### 2. Individual Report Detail Page

```
╔════════════════════════════════════════════════════════════════════════╗
║  📋 Audit Report: example.com/page1                                    ║
║  Tested: Feb 9, 2026 02:15 PM | Duration: 1m 34s                     ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  [← Back to Summary]  [📹 Videos] [🖼️ Screenshots] [📊 Raw JSON]      ║
║                                                                        ║
║  ✅ QUICK STATS                                                       ║
║  ┌────────────────┬────────────────┬────────────────┬────────────────┐
║  │ ✅ Passed: 10  │ ❌ Failed: 3   │ ⚠️  Warnings: 0 │ ⏭️  Skipped: 0  │
║  └────────────────┴────────────────┴────────────────┴────────────────┘
║                                                                        ║
║  🎯 DEVELOPER ACTION MATRIX                                           ║
║  ┌──────────────────┬──────────────────┬─────────────┬──────────────┐
║  │ Context (3)      │ Element          │ Error       │ Fix          │
║  ├──────────────────┼──────────────────┼─────────────┼──────────────┤
║  │ [1] Broken Links │ a.external       │ 404 on /old │ Update href  │
║  │ [2] SEO          │ <head>           │ No h1       │ Add <h1>     │
║  │ [3] Accessibility│ img#hero         │ No alt text │ Add alt attr │
║  └──────────────────┴──────────────────┴─────────────┴──────────────┘
║                                                                        ║
║  📌 DETAILED TEST RESULTS BY CATEGORY                                 ║
║                                                                        ║
║  ├─ [1] ✅ SEO CHECKS                                                 ║
║  │  ├─ ✅ Title: "Welcome to Example"                                ║
║  │  ├─ ✅ Meta Description: 155 characters                           ║
║  │  ├─ ❌ H1 Tag: MISSING (required)                                 ║
║  │  └─ ⚠️  Alt Text: 8/12 images missing alt                         ║
║  │                                                                    ║
║  ├─ [2] ❌ BROKEN LINKS (1 found)                                    ║
║  │  ├─ GET /old-page → 404 Not Found                                ║
║  │  │  └─ Selector: a.external-link                                 ║
║  │  │  └─ Link text: "Learn More"                                   ║
║  │  └─ Other 45 links: OK                                          ║
║  │                                                                    ║
║  ├─ [3] ✅ ACCESSIBILITY (WCAG 2.1 AA)                               ║
║  │  ├─ ✅ Color contrast: All pass                                   ║
║  │  ├─ ✅ Form labels: All present                                   ║
║  │  ├─ ❌ Button roles: <div> with button role missing aria-label   ║
║  │  └─ ✅ Focus management: OK                                       ║
║  │                                                                    ║
║  ├─ [4] ✅ SECURITY                                                  ║
║  │  ├─ ✅ HTTPS: Enforced                                            ║
║  │  ├─ ✅ Security headers: CSP, X-Frame-Options present            ║
║  │  └─ ❌ Missing: Strict-Transport-Security header                  ║
║  │                                                                    ║
║  ├─ [5] ✅ STRUCTURED DATA                                           ║
║  │  ├─ ✅ JSON-LD: Organization schema valid                        ║
║  │  └─ ✅ 4 structured data blocks found                             ║
║  │                                                                    ║
║  ├─ [6] ✅ SOCIAL MEDIA TAGS                                         ║
║  │  ├─ ✅ Open Graph: All 6 tags present                             ║
║  │  └─ ✅ Twitter Card: Type "summary_large_image"                   ║
║  │                                                                    ║
║  ├─ [7] ✅ EXTENDED SEO                                              ║
║  │  ├─ ✅ Sitemap: Found and valid                                   ║
║  │  ├─ ✅ robots.txt: Accessible                                     ║
║  │  └─ ⚠️  hreflang: Not implemented                                 ║
║  │                                                                    ║
║  ├─ [8] ✅ FORM VALIDATION                                           ║
║  │  ├─ ✅ Contact form: All fields validated                         ║
║  │  ├─ ✅ Email validation: Working                                  ║
║  │  └─ ✅ Success message: Displayed correctly                       ║
║  │                                                                    ║
║  ├─ [9] ✅ FUNCTIONAL TESTS                                          ║
║  │  ├─ ✅ CTA buttons: All clickable                                 ║
║  │  ├─ ✅ Navigation: Menu responsive                                ║
║  │  ├─ ✅ External links: Working                                    ║
║  │  └─ ✅ Modals: Close buttons functional                           ║
║  │                                                                    ║
║  ├─ [10] ✅ VISUAL TESTS                                             ║
║  │  ├─ ✅ Hero image: Visible                                        ║
║  │  ├─ ✅ Text contrast: PASS                                        ║
║  │  └─ ✅ Layout structure: Valid                                    ║
║  │                                                                    ║
║  ├─ [11] ✅ MOBILE TESTING (3 viewports)                             ║
║  │  ├─ ✅ Mobile (375×667): Responsive                               ║
║  │  ├─ ✅ Tablet (768×1024): Responsive                              ║
║  │  ├─ ✅ Touch targets: 44×44px minimum                             ║
║  │  └─ ✅ Hamburger menu: Working                                    ║
║  │                                                                    ║
║  ├─ [12] ✅ CONTENT QUALITY                                          ║
║  │  ├─ ✅ Content length: 2,847 words (above minimum)                ║
║  │  ├─ ✅ All images loaded                                          ║
║  │  └─ ✅ Link density: 3.2% (acceptable)                            ║
║  │                                                                    ║
║  └─ [13] ✅ USER FLOWS                                               ║
║     ├─ ✅ Contact form: Complete flow working                        ║
║     ├─ ✅ Phone click-to-call: tel: link present                     ║
║     └─ ✅ Profile browsing: Gallery navigation working               ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝
```

### 3. Browser View - Report Dashboard Layout

```
╔═══════════════════════════════════════════════════════════════════════════╗
║ 🏠 Playwright Test Report                                    [⚙️] [🔧] [×]║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │ 📊 Test Results Summary                                             │ ║
║  │ ═══════════════════════════════════════════════════════════════     │ ║
║  │                                                                     │ ║
║  │  1 of 1 passed (100%)  ⏱️  1m 34s duration  👁️  3 workers         │ ║
║  │                                                                     │ ║
║  │  Test: "Audit https://example.com/page1"                          │ ║
║  │  ├─ Status: ✅ PASSED                                              │ ║
║  │  ├─ Issues Found: 3                                                │ ║
║  │  ├─ Duration: 1m 34s                                               │ ║
║  │  └─ Artifacts:                                                     │ ║
║  │     ├─ 📊 Trace file                                               │ ║
║  │     └─ 📋 Step details                                             │ ║
║  │                                                                     │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │ 🎯 Developer Action Matrix (HTML Aggregated Report)                 │ ║
║  │ ═══════════════════════════════════════════════════════════════     │ ║
║  │                                                                     │ ║
║  │  [Search]  [Filter by Category] [Export to CSV]                   │ ║
║  │                                                                     │ ║
║  │  ┌──────────────┬──────────────┬─────────────┬──────────────────┐ ║
║  │  │ Context      │ Element      │ Error       │ Fix              │ ║
║  │  ├──────────────┼──────────────┼─────────────┼──────────────────┤ ║
║  │  │ Broken Links │ a.btn--learn │ 404 Not     │ Update href      │ ║
║  │  │ (affected 1) │              │ Found       │ to valid path    │ ║
║  │  ├──────────────┼──────────────┼─────────────┼──────────────────┤ ║
║  │  │ SEO          │ <head>       │ Missing h1  │ Add h1 tag in    │ ║
║  │  │ (affected 1) │              │             │ main content     │ ║
║  │  ├──────────────┼──────────────┼─────────────┼──────────────────┤ ║
║  │  │ Accessibility│ img#hero     │ No alt text │ Add descriptive  │ ║
║  │  │ (affected 1) │              │             │ alt attribute    │ ║
║  │  └──────────────┴──────────────┴─────────────┴──────────────────┘ ║
║  │                                                                     │ ║
║  │  💡 Tip: Click on any row to see full error details and affected  │ ║
║  │          elements in the test trace.                              │ ║
║  │                                                                     │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │ 📁 Report Files & Artifacts                                          │ ║
║  │ ═══════════════════════════════════════════════════════════════     │ ║
║  │                                                                     │ ║
║  │  📊 test-results.json (1.2 MB)        [Download]                  │ ║
║  │  📋 aggregated-report.html (2.4 MB)   [Download]                  │ ║
║  │  📹 test-video.webm (4.2 MB)          [Download]                  │ ║
║  │  🔍 trace.zip (15 MB)                 [Download]                  │ ║
║  │                                                                     │ ║
║  │  [View Timeline] [View Trace] [Raw JSON] [HTML Report]            │ ║
║  │                                                                     │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

### 4. Directory Structure of Generated Reports

```
playwright-report/
│
├── index.html                      # Consolidated index (multiple URLs)
│
├── example.com/
│   └── page1/
│       ├── index.html              # 📊 Main report page (interactive)
│       ├── aggregated-report.html  # 📋 Developer action matrix
│       ├── test-results.json       # Raw test data
│       ├── trace.zip               # Playwright trace (videos, screenshots)
│       ├── data/
│       │   ├── test-1-output.json
│       │   ├── test-results.json
│       │   └── ... (metadata files)
│       └── screenshot_*.png        # 📸 Screenshot artifacts
│
└── anotherdomain.com/
    └── path/
        ├── index.html
        ├── aggregated-report.html
        ├── test-results.json
        └── ... (same structure)
```

### 5. Report Interaction Flow

```
User Opens Report
       ↓
   index.html (Consolidated Index)
       │
       ├─→ [View Report] → example.com/page1/index.html
       │                       ↓
       │                   ┌─────────────────────┐
       │                   │ - Test summary      │
       │                   │ - Videos/Screenshots│
       │                   │ - Trace viewer      │
       │                   │ - Raw results       │
       │                   └─────────────────────┘
       │                       ↓
       │                   [View Action Matrix]
       │                   aggregated-report.html
       │                       ↓
       │                   ┌──────────────────────────┐
       │                   │ - Developer Matrix table │
       │                   │ - Searchable/Filterable  │
       │                   │ - Actionable fixes       │
       │                   │ - Context & elements     │
       │                   └──────────────────────────┘
       │
       ├─→ [View Report] → anotherdomain.com/path/index.html
       │
       └─→ [Statistics] → Summary dashboard
```

---

## Key Features Explained

### Broken Link Trailing Slash Logic
If a link returns 404, the system tries again with/without trailing slash:
- `example.com/page` → 404? → Try `example.com/page/` 
- Only marks as broken if BOTH fail

This prevents false positives.

### Error Deduplication
When testing multiple URLs, similar errors are grouped:
- Normalizes error messages (removes URLs, timestamps)
- Groups identical errors
- Shows how many URLs are affected
- Prevents duplicate rows in reports

### Report Organization
Tests automatically organize by domain and path:
```
playwright-report/
├── example.com/
│   ├── page1/index.html
│   └── page2/index.html
└── anotherdomain.com/
    └── path/index.html
```

### Mobile Testing
Automatically tests responsive design:
- Mobile: 375 × 667
- Tablet: 768 × 1024
- Desktop: 1920 × 1080

Then resets viewport before continuing tests.

---

## n8n Integration

### Quick Setup
1. Install n8n: `npm install -g n8n`
2. Start n8n: `n8n`
3. Create webhook workflow in UI
4. Activate the workflow
5. Run: `npm run test:n8n`

### What Gets Sent
- Test results (JSON format)
- Error categories
- Screenshot/video URLs (if configured)
- Aggregated report data

See `N8N_DATA_STRUCTURE.md` for complete data format.

---

## Most Common Workflows

### Workflow 1: Quick Website Audit
```bash
npm run test:url https://mysite.com
# Open playwright-report/index.html
```

### Workflow 2: Batch Test All URLs
```bash
# Create urls.txt with your URLs
node test-multiple-urls.js urls.txt
# Open playwright-report/index.html
```

### Workflow 3: Automated n8n Workflow
```bash
npm run test:n8n
# Webhook receives results automatically
```

### Workflow 4: Code Generation + Test
```bash
npm run codegen https://mysite.com
# Record user interactions
# Save to tests/my-test.spec.ts
npm test
# All tests including your new one
```

### Workflow 5: Local Report Server
```bash
npm run serve:reports
# Visit http://localhost:3000
# Browse all generated reports
```

---

## Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| `setup.bat` fails | Run: `npm install` manually |
| Tests timeout | Increase timeout in `playwright.config.ts` (timeout: 120000) |
| Broken links false positives | Check trailing slash logic in `utils/broken-links.ts` |
| Reports not generating | Check `playwright-report/` directory permissions |
| n8n webhook not found | Verify webhook is activated in n8n UI |
| Mobile tests failing | Check viewport sizes in `utils/mobile-testing.ts` |

See full documentation in README.md for detailed troubleshooting.

---

## Key Files to Edit

| Need | Edit This | Purpose |
|------|-----------|---------|
| Add new test | `tests/my-test.spec.ts` | Create custom test file |
| Change test URL | `.env` file or CLI arg | Set default test URL |
| Customize SEO rules | `playwright-seo.config.ts` | Configure SEO audit strictness |
| Adjust timeouts | `playwright.config.ts` | Change test timeouts |
| Add sensitive data | `config/sensitive-data.local.json` | Phone numbers, private URLs |
| Create test list | `urls.txt` | Add URLs for batch testing |

---

## Next Steps

1. **First Time?** Run setup: `setup.bat`
2. **Try It Out:** `npm run test:url https://example.com`
3. **View Report:** Open `playwright-report/index.html`
4. **Read Full Docs:** See `README.md` for comprehensive guide
5. **Set Up n8n:** Follow `N8N_SETUP.md` for workflow integration

---

## Support Files

- **README.md** - Complete 1000+ line documentation
- **N8N_SETUP.md** - n8n integration setup guide
- **N8N_DATA_STRUCTURE.md** - Data format sent to n8n
- **TESTING_GUIDE.md** - Testing best practices and patterns
- **QUICK_START.md** - Quick setup for new users
- **scripts/README.md** - Detailed script documentation

---

## Environment Variables Reference

```env
# Test URLs
TEST_URL=https://example.com
URL_AUDIT_URL=https://example.com
BASE_URL=https://example.com

# n8n Configuration
N8N_WEBHOOK_URL=http://localhost:5678/webhook/playwright-results
N8N_WEBHOOK_METHOD=POST  # or GET

# Accessibility Options
ACCESSIBILITY_LEVEL=wcag2a  # wcag2a, wcag2aa, wcag21a, wcag21aa

# Performance/Behavior
PARALLEL_LINKS=5        # Number of links to check in parallel
RETRY_FAILED_LINKS=true # Retry failed links with trailing slash
```

---

**Last Updated:** February 9, 2026
**Project Type:** Playwright QA Automation
**Node Version:** 16+
**Browsers:** Chromium (via Playwright)
