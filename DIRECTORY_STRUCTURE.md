# Directory Structure Guide

Your Playwright test results are automatically organized by URL structure. This ensures that when testing multiple URLs and websites, each report is kept separate and easy to find.

## Current Setup ✅

Your project is **already configured** to create this structure automatically:

```
test-results/
├── anewbride.com/
│   ├── test-results.json
│   └── <test-artifacts>/
├── anewbride.com/tour/
│   ├── test-results.json
│   └── <test-artifacts>/
└── example.com/
    ├── test-results.json
    └── <test-artifacts>/

playwright-report/
├── anewbride.com/
│   ├── index.html
│   └── data/
├── anewbride.com/tour/
│   ├── index.html
│   └── data/
└── example.com/
    ├── index.html
    └── data/
```

## How It Works

### Automatic Organization

1. **Test Results** (`test-results/`):
   - Organized automatically by Playwright config
   - Path based on URL: `test-results/<domain>/<path>/`

2. **HTML Reports** (`playwright-report/`):
   - Playwright writes to default `playwright-report/` first
   - `scripts/organize-html-report.js` runs automatically after tests
   - Moves report to URL-based directory: `playwright-report/<domain>/<path>/`

### URL Mapping Examples

| URL | test-results/ | playwright-report/ |
|-----|---------------|-------------------|
| `https://anewbride.com/` | `anewbride.com/` | `anewbride.com/` |
| `https://anewbride.com/tour/page.html` | `anewbride.com/tour/` | `anewbride.com/tour/` |
| `https://www.example.com/` | `example.com/` | `example.com/` |
| `https://example.com/about/team.html` | `example.com/about/` | `example.com/about/` |

## Verification

Check your current structure:

```bash
npm run verify:structure
```

This shows:
- Current directory structure
- All available reports
- Confirms URL-based organization

## Testing Multiple URLs

When you test multiple URLs, each creates its own directory:

```bash
# Test URL 1
npm run test:url -- https://anewbride.com/

# Test URL 2  
npm run test:url -- https://anewbride.com/tour/

# Test URL 3
npm run test:url -- https://example.com/
```

Result:
```
test-results/
├── anewbride.com/          # From URL 1
├── anewbride.com/tour/     # From URL 2
└── example.com/            # From URL 3

playwright-report/
├── anewbride.com/          # From URL 1
├── anewbride.com/tour/     # From URL 2
└── example.com/            # From URL 3
```

## Key Features

✅ **Automatic**: No manual organization needed
✅ **URL-based**: Structure matches the URLs you test
✅ **No overwriting**: Multiple test runs preserve all data
✅ **Scalable**: Works with unlimited URLs and websites
✅ **GitHub-ready**: Perfect structure for uploading to GitHub Pages

## Scripts

- `npm run test:url -- <URL>` - Test a specific URL (organizes reports automatically)
- `npm run verify:structure` - Verify directory structure
- `npm run prepare:github` - Prepare reports for GitHub Pages
- `npm run serve:reports` - Serve reports via HTTP

## Configuration Files

- `playwright.config.ts` - Sets `outputDir` based on URL
- `utils/url-path.js` - Generates URL-based paths
- `scripts/organize-html-report.js` - Organizes HTML reports (runs automatically)

Everything is already configured - just run your tests! 🚀

