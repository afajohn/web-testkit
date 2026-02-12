import { test, expect, request } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { runSEOChecks, formatSEOCheckReport } from '../utils/seo-checks';
import { checkBrokenLinks, formatBrokenLinksReport } from '../utils/broken-links';
import { runAccessibilityCheck, formatAccessibilityReport } from '../utils/accessibility';
import { validateForms, formatFormValidationReport } from '../utils/form-validation';
import { runSecurityChecks, formatSecurityCheckReport } from '../utils/security-checks';
import { runFunctionalTests, formatFunctionalTestReport } from '../utils/functional-tests';
import { testMobileResponsiveness, formatMobileTestReport } from '../utils/mobile-testing';
import { checkStructuredData, formatStructuredDataReport } from '../utils/structured-data';
import { checkSocialMediaTags, formatSocialMediaReport } from '../utils/social-media';
import { runUserFlowTests, formatUserFlowReport } from '../utils/user-flows';
import { runExtendedSEOChecks, formatExtendedSEOReport } from '../utils/seo-extended';
import { runVisualTests, formatVisualTestReport } from '../utils/visual-tests';
import { runContentChecks, formatContentCheckReport } from '../utils/content-checks';
import { gotoAndWaitForDOMContentLoaded } from '../utils/page-load';
import { formatErrorWithContext, getCurrentUrl } from '../utils/error-handling';
import { formatTestHeader, formatSubsectionHeader } from '../utils/formatting';
import { FailureContext } from '../utils/failure-schema';

const TEST_URL = process.env.URL_AUDIT_URL || process.env.TEST_URL || process.env.BASE_URL || 'https://anewbride.com/';

test.describe(`Audit Test for: ${TEST_URL}`, () => {
  test.setTimeout(180000); // 3 mins for full coverage

  test('comprehensive audit - critical flows, visual, and functionality', async ({ page }) => {
    let currentUrl = TEST_URL;
    
    try {
      console.log(`\nNavigating to: ${TEST_URL}`);
      await gotoAndWaitForDOMContentLoaded(page, TEST_URL);
      currentUrl = await getCurrentUrl(page);

      console.log('\n🚀 STARTING FULL SYSTEM AUDIT...');
      const apiRequest = await request.newContext();

      // --- PHASE 1: PASSIVE SCANS ---
      // 1. SEO
      const seoResults = await runSEOChecks(page, { checkRobots: true, skipPageLoad: true });
      // 2. Security
      const securityResults = await runSecurityChecks(page, currentUrl);
      // 3. Accessibility (Strict)
      const accessibilityResults = await runAccessibilityCheck(page); 
      // 4. Broken Links
      const brokenLinksResult = await checkBrokenLinks(page, apiRequest, undefined, 10, true);

      // --- PHASE 2: FUNCTIONAL & BUSINESS LOGIC ---
      // 5. Form Validation (Required fields, formats)
      console.log('📝 [5/10] Validating Forms...');
      const formResults = await validateForms(page);

      // 6. Visual Layout Tests
      console.log('🎨 [6/10] Running Visual & Layout Tests...');
      const visualResults = await runVisualTests(page);

      // 7. Mobile Responsiveness
      console.log('📱 [7/10] Checking Mobile Layouts...');
      const mobileResults = await testMobileResponsiveness(page);
      await page.setViewportSize({ width: 1920, height: 1080 }); // Reset

      // 8. User Flows (Profile browsing, interactions)
      console.log('👥 [8/10] Testing Critical User Flows...');
      const userFlowResults = await runUserFlowTests(page, {
        expectedPhoneNumber: '602-553-8178', // From your requirements
        request: apiRequest
      });

      // 9. Functional Components (CTA, Sidebar, External Links)
      console.log('⚙️ [9/10] Testing Functional Components...');
      // We run this carefully as it might click external links
      let funcResults: Awaited<ReturnType<typeof runFunctionalTests>>;
      try {
          funcResults = await runFunctionalTests(page);
      } catch (e) { 
        console.log('⚠️ Functional test navigation handled.');
        funcResults = { totalTests: 0, passedTests: 0, failedTests: 0, results: [], passed: false };
      }

      // --- FAILURE CONTEXT ATTACHMENT ---
      const failureContexts: FailureContext[] = [
        ...(accessibilityResults.failureContexts || []),
        ...(userFlowResults.failureContexts || []),
      ];

      if (failureContexts.length > 0) {
        try {
          await test.info().attach('failure-contexts', {
            contentType: 'application/json',
            body: Buffer.from(JSON.stringify(failureContexts, null, 2)),
          });
        } catch {
          // attachment is best-effort
        }
      }

      // --- REPORTING TO CONSOLE ---
      console.log(formatTestHeader('Audit Report', TEST_URL));
      console.log(await formatSEOCheckReport(seoResults, page));
    console.log(formatBrokenLinksReport(brokenLinksResult.brokenLinks, brokenLinksResult.totalLinks, TEST_URL));

      // --- FINAL ASSERTION COLLECTION ---
      // This aggregates ALL failures into one big error message
      const allFailures: string[] = [];

      // A. SEO
      const failedSeo = seoResults.filter(r => !r.passed);
      if (failedSeo.length) allFailures.push(`SEO Failures:\n${failedSeo.map(c => `❌ SEO: ${c.check}`).join('\n')}`);

      // B. Broken Links
      if (brokenLinksResult.brokenLinks.length) {
        const links = brokenLinksResult.brokenLinks.map(l => 
            `❌ Broken Link: "${l.linkText}" (${l.location||'Page'}) [${l.selector}] → ${l.url}`
        ).join('\n');
        allFailures.push(`Broken Links Found:\n${links}`);
      }

      // C. Accessibility
      if (!accessibilityResults.passed) {
        const violations = (accessibilityResults as any).violations || [];
        const vDetails = violations.map((v: any) => 
            `⚠️ ${v.id}: ${v.description} (Example Selector: ${v.nodes?.[0]?.target?.join(' ')})`
        ).join('\n');
        allFailures.push(`Accessibility Violations:\n${vDetails}`);
      }

      // D. Forms (NEW)
      if (!formResults.passed) {
          const fErrors = formResults.results.filter((r: any) => !r.passed).map((r: any) => 
            `❌ FORM: ${r.check} - ${r.message} [form]`
          ).join('\n');
          allFailures.push(`Form Validation Failures:\n${fErrors}`);
      }

      // E. User Flows (NEW - Profile browsing, etc)
      if (!userFlowResults.passed) {
          const uErrors = userFlowResults.results.filter((r: any) => !r.passed).map((r: any) =>
            `❌ FLOW: ${r.check} - ${r.message || 'Failed'} [${r.element || 'flow'}]`
          ).join('\n');
          allFailures.push(`User Flow Failures:\n${uErrors}`);
      }

      // F. Functional
      if (!funcResults.passed) {
        const funcErrors = funcResults.results.filter((r: any) => !r.passed).map((r: any) =>
          `❌ FUNCTIONAL: ${r.check} - ${r.message} [${r.element || 'component'}]`
        ).join('\n');
        allFailures.push(`Functional Test Failures:\n${funcErrors}`);
      }

      // G. Visual/Mobile (NEW)
      if (!visualResults.passed) {
          allFailures.push(`❌ VISUAL: Layout instability detected [viewport]`);
      }
      if (!mobileResults.passed) {
          allFailures.push(`❌ MOBILE: Responsive layout broken [viewport]`);
      }

      // FAIL THE TEST IF ANYTHING IS WRONG
      if (allFailures.length > 0) {
        throw new Error(allFailures.join('\n\n'));
      }

    } catch (error: any) {
      const errorMessage = formatErrorWithContext(TEST_URL, 'comprehensive audit', error);
      console.error(errorMessage);
      throw error;
    }
  });
});
