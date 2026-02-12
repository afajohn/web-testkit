import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { checkBrokenLinks } from '../utils/broken-links';
import { runAccessibilityCheck } from '../utils/accessibility';
import { runSecurityChecks } from '../utils/security-checks';
import { runSEOChecks } from '../utils/seo-checks';
import { FailureContext } from '../utils/failure-schema';
import { attachFailureContexts, reportFailure } from '../utils/report-failure';
import { exec } from 'child_process';

const urlFilePath = process.env.URLS_FILE || path.join(process.cwd(), 'urls.txt');
let urls: string[] = [];
try {
    if (existsSync(urlFilePath)) {
        urls = readFileSync(urlFilePath, 'utf-8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    } else { urls = ['https://anewbride.com/']; }
} catch (e) { urls = ['https://anewbride.com/']; }

// WE RUN SEQUENTIALLY TO PROTECT THE DOMAIN JSON
test.describe.configure({ mode: 'parallel' });

urls.forEach((url) => {
  test(`Audit: ${url}`, async ({ page, request }, testInfo) => {
    test.setTimeout(120000); 
    console.log(`🚀 Processing: ${url}`);

    let accessibilityResults: any = null;
    let brokenLinksResults: any = null;
    let securityResults: any = null;
    let seoResults: any = null;
    let timedOut = false;

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await test.step('Security', async () => { securityResults = await runSecurityChecks(page, url); });
        await test.step('SEO', async () => { seoResults = await runSEOChecks(page, { checkRobots: true, skipPageLoad: true }); });
        await test.step('Accessibility', async () => { accessibilityResults = await runAccessibilityCheck(page); });
        await test.step('Broken Links', async () => { brokenLinksResults = await checkBrokenLinks(page, request, undefined, 10, true); });
    } catch (error) {
        if ((error as Error).message.includes('Timeout')) timedOut = true;
        else console.error(`   ❌ Error:`, (error as Error).message);
    } finally {
        const contexts: FailureContext[] = [];

        if (timedOut) contexts.push({ id: `timeout-${Date.now()}`, category: 'performance', description: `Test Timeout`, url, timing: 'initial-render', actual: 'Timeout', expected: 'Pass', viewport: 'desktop', evidence: {} } as any);
        if (seoResults) seoResults.forEach((res: any) => { if (!res.passed) contexts.push({ id: `seo-${Math.random().toString(36).substr(2, 9)}`, category: 'seo', description: `SEO: ${res.check}`, url, timing: 'initial-render', actual: res.message, expected: 'Pass', viewport: 'desktop', evidence: {} } as any); });
        if (brokenLinksResults?.brokenLinks) {
            for (const link of brokenLinksResults.brokenLinks) {
                try {
                    const context = await reportFailure(page, { id: `link-${Date.now()}`, category: 'functional', description: `Broken Link: ${link.url}`, url, timing: 'initial-render', actual: `${link.status}`, expected: '200', selector: link.selector || 'a' });
                    contexts.push(context);
                } catch(e) {}
            }
        }
        if (accessibilityResults?.failureContexts) contexts.push(...accessibilityResults.failureContexts.slice(0, 5));
        if (securityResults?.results) securityResults.results.forEach((res: any) => { if (!res.passed) contexts.push({ id: `sec-${Date.now()}`, category: 'security', description: res.check, url, timing: 'initial-render', actual: res.message, expected: 'Pass', viewport: 'desktop', evidence: {} } as any); });

        if (contexts.length > 0) await attachFailureContexts(testInfo, contexts);

        // --- DOMAIN-GROUPED JSON LOGIC ---
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '').replace(/\./g, '-');
        const vaultDir = path.join(process.cwd(), 'reports', 'aura-dashboard', 'vault');
        const recordPath = path.join(vaultDir, `${domain}.json`);
        
        if (!existsSync(vaultDir)) mkdirSync(vaultDir, { recursive: true });

        // Load existing data or start fresh
        let domainData: any = { hostname: domain, lastUpdated: "", pages: [] };
        if (existsSync(recordPath)) {
            try {
                domainData = JSON.parse(readFileSync(recordPath, 'utf-8'));
            } catch (e) { /* corrupted file, restart */ }
        }

        // Update or Add current page results
        const pageEntry = {
            url: url,
            path: urlObj.pathname,
            timestamp: new Date().toISOString(),
            status: contexts.length > 0 ? 'failed' : 'passed',
            errors: contexts
        };

        const existingIndex = domainData.pages.findIndex((p: any) => p.url === url);
        if (existingIndex > -1) {
            domainData.pages[existingIndex] = pageEntry; // Update existing
        } else {
            domainData.pages.push(pageEntry); // Add new
        }

        domainData.lastUpdated = new Date().toISOString();

        // Write the unified domain file
        writeFileSync(recordPath, JSON.stringify(domainData, null, 2));

        // Trigger Generator
        exec(`node scripts/generate-aggregated-report.js`);
    }
  });
});