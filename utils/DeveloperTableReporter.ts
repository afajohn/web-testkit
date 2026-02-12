import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

class DeveloperTableReporter implements Reporter {
  private issues = new Map<string, any>();

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'passed') return;

    const cleanMsg = (result.error?.message || '').replace(/\u001b\[.*?m/g, '');
    const url = test.title.match(/(https?:\/\/[^\s]+)/)?.[0] || 'Unknown';

    // Parse Broken Links with Selector
    if (cleanMsg.includes('Broken Link:')) {
      const matches = cleanMsg.matchAll(/❌ Broken Link: "([^"]+)" \(([^)]+)\)\s*\[([^\]]+)\]/g);
      for (const match of matches) {
        this.addIssue({
          context: match[2].includes('Navigation') ? 'GLOBAL NAV' : 'PAGE CONTENT',
          element: match[1],
          selector: match[3],
          fix: 'Update HREF',
          url
        });
      }
    }

    // Parse Accessibility
    if (cleanMsg.includes('Accessibility Violations')) {
      const matches = cleanMsg.matchAll(/⚠️\s*([^:]+):/g);
      for (const match of matches) {
        this.addIssue({
          context: 'ACCESSIBILITY',
          element: match[1],
          selector: 'Run Audit',
          fix: 'Add ARIA/Alt',
          url
        });
      }
    }
  }

  private addIssue(data: any) {
    const key = `${data.context}|${data.element}|${data.selector}`;
    if (!this.issues.has(key)) this.issues.set(key, { ...data, count: 0 });
    this.issues.get(key).count++;
  }

  onEnd() {
    console.log('\n' + '─'.repeat(100));
    console.log('🛠️  DEVELOPER ACTION MATRIX (Console View)');
    console.log('─'.repeat(100));
    console.log(
      this.pad('CONTEXT', 15) +
      this.pad('ELEMENT', 25) +
      this.pad('SELECTOR (Target)', 40) +
      this.pad('FIX', 15) +
      'PAGES'
    );
    console.log('─'.repeat(100));
    this.issues.forEach(i => {
      console.log(
        this.pad(i.context, 15) +
        this.pad(i.element.substring(0, 23), 25) +
        this.pad(i.selector.substring(0, 38), 40) +
        this.pad(i.fix, 15) +
        i.count
      );
    });
    console.log('─'.repeat(100) + '\n');
  }

  private pad(s: string, w: number) {
    return (s + ' '.repeat(w)).slice(0, w);
  }
}

export default DeveloperTableReporter;
