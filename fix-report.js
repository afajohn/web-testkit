const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'scripts', 'generate-aggregated-report.js');

console.log(`👨‍⚕️ Examining: ${filePath}`);

try {
    let buffer = fs.readFileSync(filePath);

    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        console.log('🔴 BOM Found! The file is infected.');
        buffer = buffer.slice(3);
        fs.writeFileSync(filePath, buffer);
        console.log('✅ BOM removed successfully.');
    } else {
        console.log('✨ No BOM detected (The file is clean of invisible characters).');
    }

    const content = buffer.toString('utf8');
    const shebangCount = (content.match(/#!\/usr\/bin\/env node/g) || []).length;
    
    if (shebangCount > 1) {
        console.log(`⚠️  WARNING: You pasted the code ${shebangCount} times!`);
        console.log('✂️  Trimming file to single instance...');
        
        const lastExport = content.lastIndexOf('module.exports = { generateAggregatedReport };');
        if (lastExport !== -1) {
            const cleanContent = content.substring(0, lastExport + 46);
            fs.writeFileSync(filePath, cleanContent, 'utf8');
            console.log('✅ File trimmed to correct length.');
        }
    } else {
        console.log('✨ Code looks structured correctly (no double paste).');
    }

} catch (err) {
    console.error('❌ Error reading file:', err);
}
