import * as fs from 'fs';
import * as path from 'path';
import { scanUrl } from './scan-url-core';
import { getStorageStats, KEEP_COUNT } from '../aggregator/aggregate-logic';

const MAX_CONCURRENT = 4;

async function runBatch(filename: string) {
    const filePath = path.join(__dirname, '../urls', filename);
    if (!fs.existsSync(filePath)) { console.error(`File not found: ${filePath}`); return; }
    const urls = fs.readFileSync(filePath, 'utf-8').split('\n').map(u => u.trim()).filter(u => u.length > 0);

    console.log(`\n🚀 DEPLOYED: Auditing ${urls.length} URLs...\n`);
    const startTimeTotal = Date.now();
    const queue = [...urls];
    
    const workers = Array(MAX_CONCURRENT).fill(null).map(async () => {
        while (queue.length > 0) {
            const url = queue.shift();
            if (!url) break;
            const index = urls.indexOf(url) + 1;
            const startTime = Date.now();
            const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;

            try {
                const data = await scanUrl(url);
                const isFailed = data.errors.some(e => e.category === "FUNC" && e.title.includes("System"));
                const symbol = isFailed ? '\x1b[31m✘\x1b[0m' : '\x1b[32m✓\x1b[0m'; 
                const duration = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
                console.log(`  ${symbol}   ${index}/${urls.length} › ${displayUrl} (${duration}) \x1b[33m[${data.errors.length} errors]\x1b[0m`);

                const domainDir = path.join(__dirname, '../data', data.domain);
                if (!fs.existsSync(domainDir)) fs.mkdirSync(domainDir, { recursive: true });
                const slug = new URL(url).pathname.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'homepage';
                const fileName = `${slug}__${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
                fs.writeFileSync(path.join(domainDir, fileName), JSON.stringify(data, null, 2));
            } catch (e) { console.log(`  \x1b[31m✘\x1b[0m   ${index} › ${displayUrl} (FAILED)`); }
        }
    });

    await Promise.all(workers);
    console.log(`\n✨ Batch Complete in ${((Date.now() - startTimeTotal)/1000).toFixed(1)}s.`);
    const stats = getStorageStats();
    console.log(`\n-----------------------------------------\n🛡️  STORAGE MONITOR\n   Total JSON Records: ${stats.fileCount}\n   Disk Space Used:    ${stats.sizeMB} MB\n   Retention Policy:   ${KEEP_COUNT} versions/URL\n-----------------------------------------\n`);
}

const fileArg = process.argv[2];
if (fileArg) runBatch(fileArg);