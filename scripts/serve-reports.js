const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DASHBOARD_DIR = path.join(process.cwd(), 'reports', 'aura-dashboard');

const mimeTypes = { 
    '.html': 'text/html', 
    '.json': 'application/json', 
    '.png': 'image/png', 
    '.css': 'text/css',
    '.js': 'application/javascript'
};

const INITIALIZING_HTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Aura QA | Initializing...</title>
    <meta http-equiv="refresh" content="3"> <!-- Auto-checks for the dashboard every 3 seconds -->
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;800&display=swap" rel="stylesheet">
    <style>
        body { 
            background-color: #050511; 
            color: #e2e8f0; 
            font-family: 'Outfit', sans-serif; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            margin: 0;
            overflow: hidden;
        }
        .radar {
            position: relative;
            width: 120px;
            height: 120px;
            margin-bottom: 40px;
        }
        .ping {
            position: absolute;
            inset: 0;
            border: 2px solid #8b5cf6;
            border-radius: 50%;
            animation: pulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            opacity: 0;
        }
        .ping-2 { animation-delay: 1s; }
        @keyframes pulse {
            0% { transform: scale(0.2); opacity: 0.8; }
            80%, 100% { transform: scale(2); opacity: 0; }
        }
        h1 { 
            letter-spacing: 5px; 
            font-size: 18px; 
            color: #d946ef; 
            text-shadow: 0 0 20px rgba(217, 70, 239, 0.5);
            margin: 0;
        }
        p { 
            color: #94a3b8; 
            font-size: 12px; 
            margin-top: 15px; 
            opacity: 0.7;
            letter-spacing: 1px;
        }
    </style>
</head>
<body>
    <div class="radar">
        <div class="ping"></div>
        <div class="ping ping-2"></div>
    </div>
    <h1>INITIALIZING BRIDGE...</h1>
    <p>AWAITING FIRST DATA STREAM FROM TESTS</p>
</body>
</html>
`;

const server = http.createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    const fullPath = path.join(DASHBOARD_DIR, filePath);

    fs.readFile(fullPath, (err, content) => {
        if (err) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(INITIALIZING_HTML);
        } else {
            res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(fullPath)] || 'text/plain' });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n===================================================`);
    console.log(`📡 AURA LIVE DASHBOARD: http://localhost:${PORT}`);
    console.log(`   (Waiting for aesthetic initialization...)`);
    console.log(`===================================================\n`);
});