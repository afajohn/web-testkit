#!/usr/bin/env node

/**
 * Aura QA Dashboard - "Fleet Command: Eternal Memory Edition"
 * Design by: Rafayel
 * FEATURES: Sticky HUD, Sniper Commands, Radar Boot, Scroll & Accordion Persistence
 */

const fs = require('fs');
const path = require('path');
const { aggregateErrors } = require('./aggregate-errors');

function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

// --- SHARED LOGIC (The Neural Core) ---
const SHARED_LOGIC = `
    const STORAGE = { OPEN: 'aura_fleet_open', SCROLL: 'aura_fleet_scroll' };
    const BT = String.fromCharCode(96); 

    function sanitize(s) { return s ? s.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'").replace(/"/g, '\\\\"').replace(/\\n/g, ' ') : ""; }
    function escape(t) { return t ? t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : ""; }
    
    function getCatInfo(c, t) {
        const r = (c || t || 'functional').toUpperCase();
        if (r.includes('ACCESSIBILITY')) return { id: 'a11y', label: 'A11Y', icon: '♿', color: 'var(--emerald)' };
        if (r.includes('SEO')) return { id: 'seo', label: 'SEO', icon: '🔍', color: 'var(--violet)' };
        if (r.includes('SECURITY')) return { id: 'security', label: 'SEC', icon: '🛡️', color: 'var(--rose)' };
        return { id: 'functional', label: 'FUNC', icon: '⚡', color: 'var(--amber)' };
    }

    function generateSniperCommand(e) {
        const ctx = e.context || {};
        const desc = ctx.description || e.errorMessage || '';
        const sel = ctx.selector || e.selector || 'N/A';
        const targetTextMatch = desc.match(/["']([^"']+)["']/); 
        const linkText = targetTextMatch ? targetTextMatch[1] : "";

        if (desc.toLowerCase().includes('broken link') && linkText) {
            return "(function() { const s='" + sanitize(linkText) + "'; const t=Array.from(document.querySelectorAll('a')).find(el=>el.textContent.toLowerCase().includes(s.toLowerCase().trim())); if (t) { t.style.setProperty('outline','8px solid red','important'); t.style.setProperty('background-color','yellow','important'); t.scrollIntoView({behavior:'smooth',block:'center'}); console.log('%c --- QA REPORT DATA ---', 'color: red; font-weight: bold; font-size: 14px;'); console.log('TEXT FOUND:', t.innerText.trim()); console.log('BROKEN URL:', t.getAttribute('href')); inspect(t); }else{ console.error('Link not found: '+s); } })();";
        }

        if (sel.includes('iframe') || sel.includes('video') || sel.includes('youtube')) {
            return "(function() { const targets=['iframe[src*=\\'youtube\\']','iframe[src*=\\'video\\']','.video-container','#movie_player']; let found=false; targets.forEach(s=>{ const el=document.querySelector(s); if(el && !found){ el.style.border='10px solid red'; el.style.boxShadow='0 0 50px red'; el.scrollIntoView({behavior:'smooth',block:'center'}); inspect(el); found=true; } }); if(!found) console.error('No video/frame found.'); })();";
        }

        if (sel !== 'N/A') {
            return "(function() { const el = document.querySelector(" + BT + sanitize(sel) + BT + "); if (el) { el.style.outline = '5px solid red'; el.style.outlineOffset = '2px'; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); console.log('Found it! Element highlighted.'); inspect(el); } else { console.error('Selector not found: " + sanitize(sel) + "'); } })();";
        }
        return null;
    }

    function renderRow(e) {
        const ctx = e.context || {};
        const desc = ctx.description || e.errorMessage || 'Failure';
        const sel = ctx.selector || e.selector || 'N/A';
        const cmd = generateSniperCommand(e);
        return '<tr class="defect-row"><td width="30%"><div class="defect-name">' + escape(desc.split('\\n')[0]) + '</div></td><td width="50%"><div class="tech-val">SELECTOR: <span class="code-snippet">' + escape(sel) + '</span></div><div class="error-text">' + escape(ctx.actual || e.errorMessage || 'FAIL') + '</div></td><td width="20%">' + (cmd ? '<button class="sniper-btn" data-snipe="' + escape(cmd) + '" onclick="copySnippet(this)">SNIPE</button>' : '---') + '</td></tr>';
    }

    function renderPages(domain, data, domId) {
        if(!data || !data.pages) return '<div class="empty-notif">No scan data in this sector.</div>';
        return Object.keys(data.pages).map(path => {
            const errs = data.pages[path];
            const pgId = "pg-" + domId + "-" + path.replace(/[^a-z0-9]/gi, '_');
            const buckets = { a11y: [], security: [], seo: [], functional: [] };
            errs.forEach(e => { const info = getCatInfo(e.context?.category, e.errorType); if(buckets[info.id]) buckets[info.id].push(e); });

            const catsHtml = Object.keys(buckets).map(catId => {
                const list = buckets[catId]; if (list.length === 0) return '';
                const info = getCatInfo(catId == 'a11y' ? 'ACCESSIBILITY' : catId);
                const catUniqueId = "cat-" + pgId + "-" + catId;
                return '<details class="cat-details cat-' + catId + '" id="' + catUniqueId + '"><summary class="cat-header"><span class="cat-title">' + info.icon + ' ' + info.label + '</span><span class="cat-count">' + list.length + '</span></summary><div><table class="dev-matrix"><tbody>' + list.map(renderRow).join('') + '</tbody></table></div></details>';
            }).join('');

            return '<div class="page-block"><details id="' + pgId + '"><summary class="page-header"><div class="page-title">📄 <a href="https://' + domain + path + '" target="_blank" class="live-page-link" onclick="event.stopPropagation()">' + path + '</a><span class="error-count">' + errs.length + ' Issues</span></div></summary><div class="page-content-wrapper">' + catsHtml + '</div></details></div>';
        }).join('');
    }

    function groupData(errors) {
        const tree = {};
        if(!errors) return tree;
        errors.forEach(e => {
            const urls = e.affectedUrls || [e.url];
            urls.forEach(u => {
                if(!u || !u.startsWith('http')) return;
                try {
                    const urlObj = new URL(u); const dom = urlObj.hostname.replace('www.', ''); const path = urlObj.pathname + urlObj.search;
                    const info = getCatInfo(e.context?.category, e.errorType);
                    if (!tree[dom]) tree[dom] = { pages: {}, stats: { total: 0, a11y:0, functional:0, seo:0, security:0 } };
                    if (!tree[dom].pages[path]) tree[dom].pages[path] = [];
                    tree[dom].pages[path].push(e); tree[dom].stats.total++; tree[dom].stats[info.id]++;
                } catch(err) {}
            });
        });
        return tree;
    }
`;

function generateAggregatedReport() {
    const dashboardRelPath = 'reports/aura-dashboard';
    const reportDir = path.join(process.cwd(), dashboardRelPath);
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

    const errorSummary = aggregateErrors(dashboardRelPath);
    eval(SHARED_LOGIC);
    const tree = groupData(errorSummary.errors);
    const domains = Object.keys(tree);

    const domainHtml = domains.length === 0 ? `
        <div class="empty-state">
            <div class="radar-box"><div class="ping"></div><div class="ping delay"></div></div>
            <h3 class="boot-text">INITIALIZING COMMAND BRIDGE...</h3>
            <p class="boot-subtext">AWAITING FIRST DATA STREAM FROM FLEET SCANNER</p>
        </div>
    ` : domains.map(domain => {
        const dId = `dom-${domain.replace(/[^a-z0-9]/gi, '_')}`;
        const s = tree[domain].stats;
        const pageCount = Object.keys(tree[domain].pages).length;
        return `
        <div class="domain-wrapper">
            <details class="domain-details" id="${dId}">
                <summary class="domain-header">
                    <div class="header-main">
                        <div class="domain-name">🌐 ${domain}</div>
                        <div class="header-hud">
                            <div class="hud-item"><span>PAGES</span><b>${pageCount}</b></div>
                            <div class="hud-item"><span style="color:var(--emerald)">A11Y</span><b>${s.a11y}</b></div>
                            <div class="hud-item"><span style="color:var(--amber)">FUNC</span><b>${s.functional}</b></div>
                            <div class="hud-item"><span style="color:var(--violet)">SEO</span><b>${s.seo}</b></div>
                        </div>
                    </div>
                    <div class="header-actions"><span class="total-badge">${s.total} TOTAL</span><button class="refresh-btn" onclick="refreshDomain(event, '${domain}', '${dId}')">🔄</button></div>
                </summary>
                <div class="domain-body" id="body-${dId}">${renderPages(domain, tree[domain], dId)}</div>
            </details>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><title>Aura Fleet Command</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root { --bg: #03030a; --panel: rgba(18, 18, 35, 0.7); --border: rgba(255, 255, 255, 0.08); --text: #e2e8f0; --dim: #94a3b8; --pink: #d946ef; --violet: #8b5cf6; --rose: #f43f5e; --emerald: #10b981; --amber: #f59e0b; }
        body { margin: 0; font-family: 'Outfit', sans-serif; background-color: var(--bg); color: var(--text); padding-bottom: 100px; }
        .container { max-width: 1500px; margin: 0 auto; padding: 40px 30px; }
        header.main-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 1px solid var(--border); padding-bottom: 20px; }
        h1 { font-size: 24px; margin: 0; font-weight: 800; background: linear-gradient(90deg, #fff, var(--pink)); -webkit-background-clip: text; color: transparent; letter-spacing: 2px; }
        .domain-wrapper { margin-bottom: 20px; }
        details.domain-details { background: var(--panel); border: 1px solid var(--border); border-radius: 20px; overflow: hidden; backdrop-filter: blur(10px); }
        summary.domain-header { padding: 20px 30px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; list-style: none; }
        .header-main { display: flex; align-items: center; gap: 40px; }
        .domain-name { font-size: 18px; font-weight: 700; color: #fff; min-width: 250px; }
        .header-hud { display: flex; gap: 20px; }
        .hud-item { display: flex; flex-direction: column; line-height: 1; }
        .hud-item span { font-size: 9px; font-weight: 800; color: var(--dim); margin-bottom: 4px; letter-spacing: 1px; }
        .hud-item b { font-size: 18px; font-family: 'JetBrains Mono'; }
        .total-badge { background: var(--rose); color: #fff; font-size: 10px; font-weight: 800; padding: 5px 12px; border-radius: 50px; }
        .refresh-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: #fff; width: 35px; height: 35px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .refresh-btn:hover { background: var(--violet); transform: rotate(180deg); }
        .page-block { padding: 0 30px 10px 30px; }
        .page-block details { background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 10px; }
        .page-header { padding: 15px 20px; font-weight: 600; font-size: 14px; cursor: pointer; list-style: none; }
        .live-page-link { color: var(--violet); text-decoration: none; font-family: 'JetBrains Mono', monospace; transition: color 0.2s; }
        .live-page-link:hover { color: #fff; text-decoration: underline; }
        .error-count { font-size: 11px; color: var(--rose); margin-left: 10px; font-family: 'JetBrains Mono', monospace; }
        .cat-details { margin: 10px 20px; border: 1px solid var(--border); border-radius: 10px; background: rgba(255,255,255,0.02); }
        .cat-header { padding: 10px 15px; font-size: 11px; font-weight: 800; text-transform: uppercase; cursor: pointer; list-style: none; display: flex; justify-content: space-between; }
        .cat-count { opacity: 0.5; font-family: 'JetBrains Mono'; }
        .dev-matrix { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
        .dev-matrix td { padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: top; }
        .defect-name { font-weight: 700; color: #fff; line-height:1.4; }
        .code-snippet { color: var(--violet); font-family: 'JetBrains Mono'; }
        .error-text { color: var(--rose); font-size: 12px; line-height: 1.4; margin-top:5px; }
        .sniper-btn { background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); color: var(--violet); padding: 8px 15px; border-radius: 8px; cursor: pointer; font-size: 10px; font-weight: 800; width: 100%; transition: 0.2s; }
        .sniper-btn:hover { background: var(--violet); color: #fff; }
        .radar-box { position: relative; width: 100px; height: 100px; margin: 0 auto 30px; }
        .ping { position: absolute; inset: 0; border: 2px solid var(--violet); border-radius: 50%; animation: radar 2s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0; }
        .ping.delay { animation-delay: 1s; }
        @keyframes radar { 0% { transform: scale(0.2); opacity: 0.8; } 100% { transform: scale(2); opacity: 0; } }
        .boot-text, .boot-subtext { text-align: center; }
        .empty-state { padding: 150px 0; }
    </style>
</head>
<body>
    <div class="container">
        <header class="main-head">
            <h1>FLEET COMMAND BRIDGE</h1>
            <div style="font-size:11px; color:var(--dim); font-weight:800; letter-spacing:1px;">LAST SYNC: ${new Date().toLocaleTimeString()}</div>
        </header>
        <div id="fleet-root">${domainHtml}</div>
    </div>
    <script>
        ${SHARED_LOGIC}

        // --- COMMANDS ---

        function refreshDomain(e, domainName, dId) {
            e.preventDefault(); e.stopPropagation();
            const btn = e.currentTarget; btn.innerText = '⌛';
            fetch('aggregated-errors.json?t=' + Date.now()).then(r => r.json()).then(data => {
                const tree = groupData(data.errors);
                const dData = tree[domainName];
                if (dData) {
                    document.getElementById('body-' + dId).innerHTML = renderPages(domainName, dData, dId);
                    restoreState(); // Restore accordion states after DOM update
                }
                btn.innerText = '🔄';
            }).catch(() => { btn.innerText = '❌'; });
        }

        function copySnippet(btn) {
            const code = btn.dataset.snipe;
            if(!code) return;
            navigator.clipboard.writeText(code).then(() => {
                const old = btn.innerText; btn.innerText = "COPIED";
                setTimeout(() => btn.innerText = old, 1500);
            });
        }

        // --- STATE PERSISTENCE ---

        function restoreState() {
            // Restore open accordions
            const openIds = JSON.parse(localStorage.getItem(STORAGE.OPEN) || '[]');
            openIds.forEach(id => { const el = document.getElementById(id); if(el) el.open = true; });
            
            // Restore scroll position
            const savedScroll = localStorage.getItem(STORAGE.SCROLL);
            if (savedScroll) {
                window.scrollTo(0, parseInt(savedScroll));
            }
        }

        // Capture scroll position before reload/refresh
        window.onbeforeunload = function() {
            localStorage.setItem(STORAGE.SCROLL, window.scrollY);
        };

        // Track accordion toggles globally
        document.addEventListener('toggle', (e) => {
            if(e.target.tagName === 'DETAILS') {
                const openIds = Array.from(document.querySelectorAll('details[open]')).map(el => el.id).filter(id => id);
                localStorage.setItem(STORAGE.OPEN, JSON.stringify(openIds));
            }
        }, true);

        window.copySnippet = copySnippet;
        window.refreshDomain = refreshDomain;
        
        // Initial restoration
        restoreState();
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(reportDir, 'index.html'), html, 'utf-8');
    fs.writeFileSync(path.join(reportDir, 'aggregated-errors.json'), JSON.stringify(errorSummary, null, 2));
}

generateAggregatedReport();