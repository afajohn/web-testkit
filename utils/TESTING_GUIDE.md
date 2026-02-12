# Testing Guide

## Quick Start: Test Any URL

### Option 1: Using npm test (Recommended)

Run all audit tests on any URL directly with `npm test`:

```bash
npm test -- https://anewbride.com/tour/things-to-consider-on-singles-tours.html
```

The `--` tells npm to pass the URL as an argument to the test script.

### Option 2: Using test:url script

Alternatively, use the dedicated script:

```bash
npm run test:url https://anewbride.com/tour/things-to-consider-on-singles-tours.html
```

Both commands run:
- SEO checks (title, meta description, canonical, robots, images, headings)
- Broken links check
- Accessibility check

All in one command!

**Note:** If you run `npm test` without a URL, it runs all test files in the `tests/` folder.

## Running All Tests

### Run All Test Files at Once

By default, `npm test` runs **ALL** `.spec.ts` files in the `tests/` folder:

```bash
npm test
```

This will run:
- All your codegen-generated tests
- All utility tests (broken-links, seo-checks, accessibility, comprehensive-audit)
- Any other `.spec.ts` files in the `tests/` folder

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

### Run All Spec Files Explicitly

```bash
npm run test:all-specs
```

This explicitly runs all `.spec.ts` files matching the pattern.

## Workflow: Codegen → Testing

### Step 1: Generate Test Code with Codegen

Use codegen to generate test code for a URL:

```bash
# Using the helper script with custom viewport
node codegen.js https://anewbride.com/tour/things-to-consider-on-singles-tours.html 1920 1080

# Or directly with Playwright
npx playwright codegen --viewport-size="1920,1080" https://anewbride.com/tour/things-to-consider-on-singles-tours.html
```

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
- All audit/utility tests (broken links, SEO, accessibility)

## Running Specific Test Files

```bash
# Run a specific test file
npx playwright test tests/seo-checks.spec.ts

# Run multiple specific files
npx playwright test tests/broken-links.spec.ts tests/seo-checks.spec.ts

# Run tests matching a pattern
npx playwright test --grep "homepage"

# Run tests in a specific file with a pattern
npx playwright test tests/seo-checks.spec.ts --grep "homepage"
```

## Running Tests with Options

```bash
# Run with UI mode (interactive)
npm run test:ui

# Run with visible browser
npm run test:headed

# Run in debug mode
npm run test:debug

# Run with specific browser
npx playwright test --project=chromium

# Run in parallel (default) or sequential
npx playwright test --workers=1  # Sequential
npx playwright test --workers=4  # 4 parallel workers
```

## Recommended Workflow

1. **Generate test code** using codegen for a specific URL
2. **Create a new test file** in `tests/` folder with the generated code
3. **Run all tests** with `npm test` to ensure everything works
4. **Run audit tests separately** with `npm run test:audits` to check SEO, broken links, and accessibility

## Test File Organization

Your `tests/` folder contains:

- **Codegen-generated tests**: Your custom tests created with codegen
  - `__tour__things-to-consider-on-singles-tours.spec.ts`
  - `a-new-bride-single-tours-vacation.spec.ts`

- **Utility/Audit tests**: Automated checks
  - `broken-links.spec.ts` - Broken link checking
  - `seo-checks.spec.ts` - SEO validation
  - `accessibility.spec.ts` - Accessibility testing
  - `comprehensive-audit.spec.ts` - All checks combined

All test files ending with `.spec.ts` will be automatically discovered and run when you execute `npm test`.

