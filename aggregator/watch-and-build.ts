import * as fs from 'fs';
import * as path from 'path';
import { aggregate } from './aggregate-logic';
import { DATA_DIR } from './aggregate-logic';

const OUTPUT_DIR = path.join(__dirname, '../dashboard/data'); // 🔑 NEW: Define the output path

console.log("The 👁️  is watching for new scan results...");

// --- 🛠️ GUARDIAN CHECK 1: Ensure RAW DATA directory exists ---
if(!fs.existsSync(DATA_DIR)) {
    console.log(`[Watcher] Data directory ${DATA_DIR} not found. Creating it...`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// --- 🛠️ GUARDIAN CHECK 2: Ensure AGGREGATED REPORT directory exists ---
if(!fs.existsSync(OUTPUT_DIR)) {
    console.log(`[Watcher] Dashboard report directory ${OUTPUT_DIR} not found. Creating it...`);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Windows is a bit sensitive, so we use a simple debounce to avoid double-firing
let debounceTimer: NodeJS.Timeout;

fs.watch(DATA_DIR, { recursive: true }, (event, filename) => {
    if (filename && filename.endsWith('.json') && !filename.includes('aggregated.json')) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            console.log(`🚀 New data in ${filename}. Rebuilding dashboard...`);
            aggregate();
        }, 500); // Wait 0.5s for file to finish writing
    }
});