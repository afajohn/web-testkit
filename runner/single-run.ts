import * as fs from 'fs';
import * as path from 'path';
import { scanUrl } from './scan-url-core';

async function runSingle(url: string) {
    // Basic validation
    if (!url || !url.startsWith('http')) {
        console.error("❌ Usage: npx ts-node runner/single-run.ts <URL>");
        console.error("   Example: npx ts-node runner/single-run.ts https://example.com");
        process.exit(1);
    }

    console.log(`\n🚀 SINGLE TARGET LOCKED: ${url}\n`);

    const startTime = Date.now();

    // Fancy status printer (Same as batch)
    const printStatus = (status: string) => {
        const line = `      [chromium] › ${url} › \x1b[2m${status}...\x1b[0m`;
        process.stdout.write(`\r\x1b[K${line}`); 
    };

    try {
        const data = await scanUrl(url, (status) => printStatus(status));
        
        const isFailed = data.errors.some(e => e.category === "FUNC" && e.title.includes("System"));
        const symbol = isFailed ? '\x1b[31m✘\x1b[0m' : '\x1b[32m✓\x1b[0m'; 
        const duration = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
        
        const finalLine = `  ${symbol}   [chromium] › ${url} (${duration}) \x1b[33m[${data.errors.length} errors]\x1b[0m`;
        process.stdout.write(`\r\x1b[K${finalLine}\n`);

        // Save Logic (Critical for Dashboard to see it)
        const domainDir = path.join(__dirname, '../data', data.domain);
        if (!fs.existsSync(domainDir)) fs.mkdirSync(domainDir, { recursive: true });
        
        const urlObj = new URL(url);
        let slug = urlObj.pathname.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (!slug) slug = 'homepage';
        
        const fileName = `${slug}__${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const savePath = path.join(domainDir, fileName);
        
        fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
        console.log(`\n💾 Saved to: data/${data.domain}/${fileName}`);

    } catch (e: any) {
        console.error(`\n❌ FATAL ERROR: ${e.message}`);
    }
}

const targetUrl = process.argv[2];
runSingle(targetUrl);