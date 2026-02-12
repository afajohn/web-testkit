#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function cleanAnsi(text) {
    if (!text) return '';
    return text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim();
}

function aggregateErrors(baseDir = 'reports/aura-dashboard') {
    const vaultPath = path.resolve(process.cwd(), baseDir, 'vault');
    const allErrors = [];
    const errorsByUrl = {};

    if (!fs.existsSync(vaultPath)) return { totalErrors: 0, uniqueErrors: 0, errors: [], errorsByUrl: {} };

    const files = fs.readdirSync(vaultPath).filter(f => f.endsWith('.json'));

    files.forEach(file => {
        try {
            const domainData = JSON.parse(fs.readFileSync(path.join(vaultPath, file), 'utf-8'));
            
            // Loop through the pages array inside the domain JSON
            if (domainData.pages && Array.isArray(domainData.pages)) {
                domainData.pages.forEach(page => {
                    const url = page.url;
                    if (page.errors && page.errors.length > 0) {
                        page.errors.forEach(err => {
                            allErrors.push({
                                url: url,
                                errorMessage: cleanAnsi(err.description),
                                errorType: err.category,
                                selector: err.selector,
                                context: err
                            });
                        });
                    }
                    if (!errorsByUrl[url]) errorsByUrl[url] = [];
                });
            }
        } catch (e) { console.error(`Failed reading ${file}`); }
    });

    const uniqueMap = new Map();
    allErrors.forEach(err => {
        const key = `${err.errorType}|${err.errorMessage}|${err.selector || 'none'}`;
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, { ...err, affectedUrls: [err.url] });
        } else {
            const existing = uniqueMap.get(key);
            if (!existing.affectedUrls.includes(err.url)) {
                existing.affectedUrls.push(err.url);
            }
        }
    });

    return {
        totalErrors: allErrors.length,
        uniqueErrors: uniqueMap.size,
        errors: Array.from(uniqueMap.values()),
        errorsByUrl: errorsByUrl,
        totalFiles: files.length
    };
}

module.exports = { aggregateErrors };