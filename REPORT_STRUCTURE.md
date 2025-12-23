# Playwright Report Directory Structure

This document explains how test results and HTML reports are organized by URL structure.

## Overview

When testing multiple URLs and websites, reports are automatically organized into a URL-based directory structure:

```
test-results/
├── anewbride.com/
│   ├── test-results.json
│   └── <test-artifacts>/
└── anewbride.com/tour/
    ├── test-results.json
    └── <test-artifacts>/

playwright-report/
├── anewbride.com/
│   ├── index.html
│   └── data/
└── anewbride.com/tour/
    ├── index.html
    └── data/
```

## How It Works

### Test Results (`test-results/`)

Test results are automatically organized based on the URL being tested:

- **Root URLs**: `test-results/<domain>/`
  - Example: `https://anewbride.com/` → `test-results/anewbride.com/`

- **URLs with paths**: `test-results/<domain>/<path>/`
  - Example: `https://anewbride.com/tour/page.html` → `test-results/anewbride.com/tour/`

Each directory contains:
- `test-results.json` - JSON report file
- Test artifacts (videos, screenshots, traces) in unique subdirectories

### HTML Reports (`playwright-report/`)

HTML reports follow the same URL-based structure:

- **Root URLs**: `playwright-report/<domain>/`
  - Example: `https://anewbride.com/` → `playwright-report/anewbride.com/`

- **URLs with paths**: `playwright-report/<domain>/<path>/`
  - Example: `https://anewbride.com/tour/page.html` → `playwright-report/anewbride.com/tour/`

Each directory contains:
- `index.html` - Main HTML report
- `data/` - Report data files (markdown, videos, etc.)

**Note:** Playwright's HTML reporter writes to the default `playwright-report/` directory first. The `scripts/organize-html-report.js` script automatically moves it to the URL-based location after each test run.

## URL Path Rules

The system uses the following rules to organize reports:

1. **Domain extraction**: Removes `www.` prefix
   - `https://www.anewbride.com/` → `anewbride.com`

2. **Path extraction**: Splits URL path into directory segments
   - `https://anewbride.com/tour/things.html` → `anewbride.com/tour/`

3. **Filename removal**: Removes filenames, keeps directory structure
   - `https://example.com/page.html` → `example.com/`
   - `https://example.com/tour/page.html` → `example.com/tour/`

## Examples

### Example 1: Root URL
```
URL: https://anewbride.com/

test-results/
└── anewbride.com/
    ├── test-results.json
    └── url-audit-...-chromium/
        ├── video.webm
        └── error-context.md

playwright-report/
└── anewbride.com/
    ├── index.html
    └── data/
        ├── *.md
        └── *.webm
```

### Example 2: URL with Path
```
URL: https://anewbride.com/tour/things-to-consider.html

test-results/
└── anewbride.com/
    └── tour/
        ├── test-results.json
        └── url-audit-...-chromium/
            └── video.webm

playwright-report/
└── anewbride.com/
    └── tour/
        ├── index.html
        └── data/
```

### Example 3: Multiple URLs
```
URLs tested:
- https://anewbride.com/
- https://anewbride.com/tour/
- https://example.com/

Result:

test-results/
├── anewbride.com/
│   ├── test-results.json
│   └── <artifacts>/
└── anewbride.com/
    └── tour/
        ├── test-results.json
        └── <artifacts>/
└── example.com/
    ├── test-results.json
    └── <artifacts>/

playwright-report/
├── anewbride.com/
│   ├── index.html
│   └── data/
├── anewbride.com/
│   └── tour/
│       ├── index.html
│       └── data/
└── example.com/
    ├── index.html
    └── data/
```

## Verification

To verify your directory structure matches the expected format:

```bash
npm run verify:structure
```

This will:
- Show the current structure of both directories
- List all available reports
- Confirm the structure follows URL-based organization

## Benefits

✅ **Organized by URL**: Easy to find reports for specific pages/websites
✅ **No overwriting**: Multiple test runs for the same URL preserve all data
✅ **Scalable**: Works with any number of URLs and websites
✅ **GitHub-ready**: Structure is perfect for uploading to GitHub Pages
✅ **Clear separation**: Each URL has its own report directory

## Scripts

- `scripts/organize-html-report.js` - Automatically organizes HTML reports (runs after tests)
- `scripts/verify-structure.js` - Verifies directory structure
- `scripts/prepare-github-reports.js` - Prepares reports for GitHub Pages
- `scripts/serve-reports.js` - Serves reports via HTTP server

## Configuration

The structure is controlled by:
- `playwright.config.ts` - Sets `outputDir` based on URL
- `utils/url-path.js` - Generates URL-based paths
- `scripts/organize-html-report.js` - Organizes HTML reports post-test

No manual configuration needed - it works automatically! 🎉

