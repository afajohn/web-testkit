import * as fs from 'fs';
import * as path from 'path';
import { PageResult, AuditError } from '../runner/types';

export const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(__dirname, '../dashboard/data/aggregated.json');
export const KEEP_COUNT = 3;

export async function aggregate() {
    if (!fs.existsSync(DATA_DIR)) return;
    const domains = fs.readdirSync(DATA_DIR).filter(f => fs.statSync(path.join(DATA_DIR, f)).isDirectory());
    const report: any = { lastUpdated: new Date().toISOString(), domains: [] };

    for (const domainName of domains) {
        const domainPath = path.join(DATA_DIR, domainName);
        const files = fs.readdirSync(domainPath).filter(f => f.endsWith('.json')).sort();
        
        const urlGroups = new Map<string, string[]>();
        files.forEach(file => {
            try {
                const content = JSON.parse(fs.readFileSync(path.join(domainPath, file), 'utf-8'));
                if (!urlGroups.has(content.url)) urlGroups.set(content.url, []);
                urlGroups.get(content.url)!.push(file);
            } catch (e) {}
        });

        const latestPageResults: PageResult[] = [];
        urlGroups.forEach((fileList) => {
            try {
                const latestFile = fileList[fileList.length - 1];
                const data = JSON.parse(fs.readFileSync(path.join(domainPath, latestFile), 'utf-8')) as PageResult;
                latestPageResults.push(data);
            } catch (e) {}
        });

        // 🎯 GLOBAL ERROR DEDUPLICATION
        const errorFrequency = new Map<string, { count: number, error: AuditError }>();
        latestPageResults.forEach(page => {
            page.errors.forEach(err => {
                const existing = errorFrequency.get(err.id) || { count: 0, error: err };
                existing.count++;
                errorFrequency.set(err.id, existing);
            });
        });

        const globalErrorIds = new Set<string>();
        const domainGlobalErrors: AuditError[] = [];
        errorFrequency.forEach((val, id) => {
            if (val.count > (latestPageResults.length * 0.3) && latestPageResults.length > 2) {
                globalErrorIds.add(id);
                domainGlobalErrors.push(val.error);
            }
        });

        const pages: any[] = [];
        urlGroups.forEach((fileList, url) => {
            try {
                const latestFile = fileList[fileList.length - 1];
                const prevFile = fileList.length > 1 ? fileList[fileList.length - 2] : null;

                const latestData = JSON.parse(fs.readFileSync(path.join(domainPath, latestFile), 'utf-8')) as PageResult;
                const prevData = prevFile ? JSON.parse(fs.readFileSync(path.join(domainPath, prevFile), 'utf-8')) as PageResult : null;

                const processedErrors = latestData.errors
                    .filter(e => !globalErrorIds.has(e.id)) // REMOVE GLOBALS FROM PAGE
                    .map(err => {
                        const wasInPrev = prevData?.errors.some(pErr => pErr.id === err.id);
                        return { ...err, status: wasInPrev ? 'STILL_BROKEN' : 'NEW' };
                    });

                pages.push({
                    url: latestData.url,
                    timestamp: latestData.timestamp,
                    stableId: url.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
                    errors: processedErrors
                });

                if (fileList.length > KEEP_COUNT) {
                    fileList.slice(0, fileList.length - KEEP_COUNT).forEach(f => {
                        try { fs.unlinkSync(path.join(domainPath, f)); } catch(e) {}
                    });
                }
            } catch (e) {}
        });

        report.domains.push({
            name: domainName,
            totalErrors: globalErrorIds.size + pages.reduce((sum, p) => sum + p.errors.length, 0),
            pageCount: pages.length,
            globalErrors: domainGlobalErrors,
            pages: pages
        });
    }

    const outDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
    console.log(`✅ Dashboard Sync Complete: ${new Date().toLocaleTimeString()}`);
}

export function getStorageStats() {
    let totalSize = 0, totalFiles = 0;
    const walk = (dir: string) => {
        fs.readdirSync(dir).forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) walk(filePath);
            else if (file.endsWith('.json')) { totalSize += fs.statSync(filePath).size; totalFiles++; }
        });
    };
    if (fs.existsSync(DATA_DIR)) walk(DATA_DIR);
    return { sizeMB: (totalSize / 1024 / 1024).toFixed(2), fileCount: totalFiles };
}