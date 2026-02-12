# n8n Data Structure Documentation

## Payload Structure

When Playwright test results are sent to n8n, the payload has the following structure:

```json
{
  "timestamp": "2025-12-23T00:37:17.674Z",
  "source": "playwright",
  "results": {
    "config": { /* Playwright configuration */ },
    "suites": [ /* Array of test suites */ ],
    "errors": [ /* Array of errors */ ],
    "stats": {
      "startTime": "2025-12-23T00:33:03.741Z",
      "duration": 27425.346,
      "expected": 0,
      "skipped": 0,
      "unexpected": 4,
      "flaky": 0
    }
  },
  "summary": {
    "total": 4,
    "passed": 0,
    "failed": 4,
    "skipped": 0,
    "flaky": 0,
    "duration": 27425.346,
    "startTime": "2025-12-23T00:33:03.741Z"
  }
}
```

## Accessing Data in n8n

### Quick Summary Fields

Access summary fields directly:
- `{{ $json.summary.total }}` - Total number of tests
- `{{ $json.summary.passed }}` - Number of passed tests
- `{{ $json.summary.failed }}` - Number of failed tests
- `{{ $json.summary.skipped }}` - Number of skipped tests
- `{{ $json.summary.flaky }}` - Number of flaky tests
- `{{ $json.summary.duration }}` - Test duration in milliseconds
- `{{ $json.summary.startTime }}` - Test start timestamp

### Metadata Fields

- `{{ $json.timestamp }}` - When the data was sent to n8n
- `{{ $json.source }}` - Always "playwright"

### Full Test Results

#### Configuration
- `{{ $json.results.config }}` - Full Playwright configuration object

#### Test Statistics
- `{{ $json.results.stats.startTime }}` - Test run start time
- `{{ $json.results.stats.duration }}` - Test run duration (ms)
- `{{ $json.results.stats.expected }}` - Expected (passed) tests
- `{{ $json.results.stats.unexpected }}` - Unexpected (failed) tests
- `{{ $json.results.stats.skipped }}` - Skipped tests
- `{{ $json.results.stats.flaky }}` - Flaky tests

#### Test Suites

Access test suites array:
- `{{ $json.results.suites }}` - Array of all test suites

Each suite contains:
- `{{ $json.results.suites[0].title }}` - Suite title
- `{{ $json.results.suites[0].file }}` - Test file path
- `{{ $json.results.suites[0].specs }}` - Array of test specs

Each spec contains:
- `{{ $json.results.suites[0].specs[0].title }}` - Test title
- `{{ $json.results.suites[0].specs[0].tests }}` - Array of test results

Each test contains:
- `{{ $json.results.suites[0].specs[0].tests[0].timeout }}` - Test timeout
- `{{ $json.results.suites[0].specs[0].tests[0].results }}` - Array of test run results

Each result contains:
- `{{ $json.results.suites[0].specs[0].tests[0].results[0].status }}` - "passed", "failed", "skipped"
- `{{ $json.results.suites[0].specs[0].tests[0].results[0].duration }}` - Test duration (ms)
- `{{ $json.results.suites[0].specs[0].tests[0].results[0].error }}` - Error details (if failed)

#### Errors

- `{{ $json.results.errors }}` - Array of global errors (if any)

## Example n8n Workflow Usage

### Filter Failed Tests

Use a "IF" node to check for failures:
```javascript
{{ $json.summary.failed > 0 }}
```

### Get Failed Test Details

Loop through suites to find failed tests:
```javascript
// In a "Code" node or "Function" node
const failedTests = [];
for (const suite of $input.item.json.results.suites) {
  for (const spec of suite.specs) {
    for (const test of spec.tests) {
      for (const result of test.results) {
        if (result.status === 'failed') {
          failedTests.push({
            suite: suite.title,
            test: spec.title,
            error: result.error?.message || 'Unknown error',
            duration: result.duration
          });
        }
      }
    }
  }
}
return failedTests;
```

### Send Notification on Failure

Check summary and send notification:
```javascript
{{ $json.summary.failed > 0 ? 'Tests Failed!' : 'All Tests Passed' }}
```

Message body:
```
Test Run Results:
Total: {{ $json.summary.total }}
Passed: {{ $json.summary.passed }}
Failed: {{ $json.summary.failed }}
Duration: {{ ($json.summary.duration / 1000).toFixed(2) }}s
```

### Store Results in Database

Map the summary fields to database columns:
- `total` → `total_tests`
- `passed` → `passed_tests`
- `failed` → `failed_tests`
- `duration` → `duration_ms`
- `timestamp` → `created_at`

## Data Size

Typical payload sizes:
- Small test suite (1-5 tests): ~10-20 KB
- Medium test suite (10-20 tests): ~20-30 KB
- Large test suite (50+ tests): 50+ KB

The payload includes **all** test data including:
- Full configuration
- All test cases and their results
- Error messages and stack traces
- Timing information
- Test artifacts references

## Webhook Method

**POST method is used** because:
- Test results can be 30KB+ in size
- GET requests have URL length limitations (~2000 characters)
- POST sends data in request body (unlimited size)

The webhook URL should be:
```
http://localhost:5678/webhook/playwright-results
```

(Use `/webhook/` for production, `/webhook-test/` for testing)

