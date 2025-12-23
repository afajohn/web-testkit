# Playwright Test Setup

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

- `utils/broken-links.ts` - Broken link checking utilities
- `utils/seo-checks.ts` - SEO validation utilities
- `utils/accessibility.ts` - Accessibility testing utilities

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

### Workflow: Codegen → Run All Tests

1. Generate test code: `node codegen.js <URL>`
2. Save generated code to a new `.spec.ts` file in `tests/`
3. Run all tests: `npm test` (runs everything including your new test)

