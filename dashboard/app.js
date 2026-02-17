// dashboard/app.js - DIAGNOSTIC MODE (Finds the Crash)

window.sniperMap = {}; 
window.GLOBAL_DATA = null;
window.CURRENT_DOMAIN_NAME = null; 
const STATE_KEY = 'qa_dashboard_state';

async function initDashboard() {
    try {
        const response = await fetch('data/aggregated.json?t=' + Date.now());
        const data = await response.json();
        window.GLOBAL_DATA = data;
        
        renderGlobalStats(data);
        renderSidebar(data.domains);
        
        const saved = getSavedState();
        if (!window.CURRENT_DOMAIN_NAME && saved && saved.domain) {
            window.CURRENT_DOMAIN_NAME = saved.domain;
        }

        if (window.CURRENT_DOMAIN_NAME) {
            const activeDomain = data.domains.find(d => d.name === window.CURRENT_DOMAIN_NAME);
            if (activeDomain) {
                updateMainStage(activeDomain, saved);
            }
        }
    } catch (e) { 
        document.getElementById('main-stage').innerHTML = `<div style="padding:20px; color:red; font-family:monospace;">CRITICAL INIT FAILURE: ${e.message}</div>`;
        console.error(e);
    }
}

// --- RENDERERS ---

function renderGlobalStats(data) {
    const totalErrors = data.domains.reduce((s, d) => s + (d.totalErrors || 0), 0);
    const totalPages = data.domains.reduce((s, d) => s + (d.pageCount || 0), 0);
    document.getElementById('global-stats').innerHTML = `
        <span>DOMAINS: <b>${data.domains.length}</b></span> | 
        <span>PAGES: <b>${totalPages}</b></span> | 
        <span style="color:var(--danger)">ACTIVE ISSUES: <b>${totalErrors}</b></span>
    `;
}

function renderSidebar(domains) {
    const container = document.getElementById('domain-list-container');
    container.innerHTML = '';
    domains.forEach(d => {
        const el = document.createElement('div');
        el.className = `domain-item ${window.CURRENT_DOMAIN_NAME === d.name ? 'active' : ''}`;
        el.dataset.name = sanitize(d.name).toLowerCase();
        el.innerHTML = `
            <span>${d.name}</span>
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="color:var(--text-muted); font-size:11px;">${d.totalErrors}</span>
                <div class="status-dot ${d.totalErrors > 10 ? 'risk' : 'safe'}"></div>
            </div>
        `;
        el.onclick = () => {
            saveDashboardState();
            window.CURRENT_DOMAIN_NAME = d.name;
            document.getElementById('main-stage').innerHTML = ''; 
            initDashboard();
        };
        container.appendChild(el);
    });
}

function updateMainStage(domain, savedState) {
    const stage = document.getElementById('main-stage');
    const targetScroll = (savedState && savedState.domain === domain.name) ? savedState.stageScroll : stage.scrollTop;

    // BUILD SHELL IF MISSING
    if (!stage.querySelector('.dh-title') || stage.querySelector('.dh-title').innerText !== domain.name) {
        stage.innerHTML = `
            <div class="stage-header">
                <div class="dh-title">${domain.name}</div>
                <div id="domain-metrics-hud" class="dh-grid"></div>
            </div>
            <div id="unique-summary-area" style="margin-bottom:40px;"></div>
            <div id="page-audit-header" style="margin-bottom:15px; font-size:11px; color:var(--text-muted); font-weight:800; letter-spacing:1px; text-transform:uppercase; border-bottom: 1px solid var(--border); padding-bottom:10px;">Individual Page Audit</div>
            <div id="page-list-area"></div>
        `;
    }

    updateHUD(domain);
    
    // 1. RENDER ACTION MATRIX
    const matrixArea = document.getElementById('unique-summary-area');
    if (domain.uniqueErrors && domain.uniqueErrors.length > 0) {
        matrixArea.innerHTML = `
            <details class="cat-details" style="border: 1px solid var(--accent); background: rgba(100, 255, 218, 0.05);" id="action-matrix" ${savedState?.openCats?.includes('action-matrix') ? 'open' : ''} ontoggle="saveDashboardState()">
                <summary class="cat-header" style="padding:15px; color:var(--mint-glow); font-weight:bold;">
                    📊 UNIQUE ERROR ACTION MATRIX
                    <span class="badge matrix-count" style="background:var(--accent); color:#000;">${domain.uniqueErrors.length} UNIQUE ISSUES</span>
                </summary>
                <div id="matrix-body-content" style="padding:10px;">
                    ${buildCategorizedMatrix(domain.uniqueErrors, domain.name, savedState)}
                </div>
            </details>
        `;
    }

    // 2. RENDER PAGE LIST (With Tactical Buttons Restored)
    const pageArea = document.getElementById('page-list-area');
    domain.pages.forEach(page => {
        const pageId = `pg-${sanitize(page.stableId || page.url)}`;
        const rowId = `row-${pageId}`;
        const activeErrors = page.errors.filter(e => e.status !== 'FIXED');
        if (activeErrors.length === 0) return;

        let pageEl = document.getElementById(rowId);
        if (pageEl && pageEl.dataset.ts === page.timestamp) return;

        // 🎯 TACTICAL BUTTON LOGIC RESTORED
        const visualAll = activeErrors.filter(isVisual);
        const visualA11y = activeErrors.filter(e => isVisual(e) && (e.category || '').includes('A11Y'));
        const visualFunc = activeErrors.filter(e => isVisual(e) && (e.category || '').includes('FUNC'));

        const keyAll = `MASTER-ALL-${pageId}`;
        const keyA11y = `MASTER-A11Y-${pageId}`;
        const keyFunc = `MASTER-FUNC-${pageId}`;

        window.sniperMap[keyAll] = generateMasterScript(visualAll, "ALL ISSUES", "#ff00ff");
        window.sniperMap[keyA11y] = generateMasterScript(visualA11y, "ACCESSIBILITY", "#64ffda");
        window.sniperMap[keyFunc] = generateMasterScript(visualFunc, "FUNCTIONAL", "#ffd166");

        const innerHtml = `
            <div class="pr-header" onclick="toggleRow('${rowId}')">
                <div style="display:flex; align-items:center; gap:10px; flex-wrap: wrap;">
                    <a href="${page.url}" target="_blank" class="pr-path" onclick="event.stopPropagation()">📄 ${extractPath(page.url)}</a>
                    
                    <div class="snipe-group" style="display:flex; gap:5px;">
                        ${window.sniperMap[keyAll] ? `<button class="snipe-all-btn s-all" onclick="event.stopPropagation(); runSniper(this, '${keyAll}')">🎯 ALL</button>` : ''}
                        ${visualA11y.length > 0 ? `<button class="snipe-all-btn s-a11y" onclick="event.stopPropagation(); runSniper(this, '${keyA11y}')">♿ A11Y (${visualA11y.length})</button>` : ''}
                        ${visualFunc.length > 0 ? `<button class="snipe-all-btn s-func" onclick="event.stopPropagation(); runSniper(this, '${keyFunc}')">⚡ FUNC (${visualFunc.length})</button>` : ''}
                    </div>
                </div>
                <span class="badge err">${activeErrors.length} ISSUES</span>
            </div>
            <div class="pr-body" id="${pageId}-body">${buildErrorHtml(activeErrors, pageId, savedState)}</div>
        `;

        if (!pageEl) {
            pageEl = document.createElement('div');
            pageEl.className = 'page-row';
            pageEl.id = rowId;
            pageArea.appendChild(pageEl);
        }
        const wasOpen = (savedState?.openPages?.includes(rowId));
        pageEl.innerHTML = innerHtml;
        pageEl.dataset.ts = page.timestamp;
        if (wasOpen) pageEl.classList.add('open');
    });

    if (savedState && savedState.domain === domain.name) {
        stage.scrollTop = savedState.stageScroll;
    }
}

// --- BUILDERS ---

function buildCategorizedMatrix(uniqueErrors, domainName, savedState) {
    const cats = { SECURITY: [], FUNCTIONAL: [], SEO: [], ACCESSIBILITY: [] };
    uniqueErrors.forEach(err => {
        const t = (err.category || 'FUNC').toUpperCase();
        if (t.includes('SEC')) cats.SECURITY.push(err); else if (t.includes('SEO')) cats.SEO.push(err);
        else if (t.includes('A11Y') || t.includes('ACC')) cats.ACCESSIBILITY.push(err); else cats.FUNCTIONAL.push(err);
    });

    return Object.entries(cats).map(([label, list]) => {
        if (list.length === 0) return '';
        const catId = `matrix-${sanitize(domainName)}-${label}`;
        const isOpen = (savedState?.openCats?.includes(catId)) ? 'open' : '';
        const rows = list.map((e, idx) => {
            const cmdKey = `UNIQUE-${label}-${idx}`;
            const reportKey = `REPORT-${label}-${idx}`;
            window.sniperMap[cmdKey] = isVisual(e) ? generateSniperCommand(e, true) : null;
            window.sniperMap[reportKey] = generateGroupedTextReport(e);
            const sevColor = { 'critical': '#ff4444', 'high': '#ff8800', 'medium': '#ffbb33', 'low': '#64ffda' }[e.severity || 'low'];

            return `
                <div class="error-item" style="border-left: 3px solid ${sevColor}; background:rgba(255,255,255,0.01); margin-bottom:12px; display:flex; gap:15px; padding:12px;">
                    <div class="ei-content" style="flex:1">
                        <div class="ei-msg"><b style="color:${sevColor}">[${e.severity?.toUpperCase()}]</b> ${escapeHtml(e.message)}</div>
                        <div class="fix-box" style="font-size:12px; margin:5px 0; color:var(--text-muted)"><span style="color:var(--mint-glow)">FIX:</span> ${escapeHtml(e.fix)}</div>
                        <details style="margin-top:10px; border-top:1px solid var(--border); padding-top:10px;">
                            <summary style="font-size:11px; color:var(--accent); cursor:pointer;">📍 Affects ${e.affectedUrls.length} pages (Pattern View)</summary>
                            <div style="font-size:10px; font-family:monospace; padding:10px; background:rgba(0,0,0,0.2); margin-top:5px; max-height:150px; overflow-y:auto; color:#888;">
                                ${renderAffectedGroups(e.affectedUrls)}
                            </div>
                        </details>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:5px;">
                        ${window.sniperMap[cmdKey] ? `<button class="sniper-btn" onclick="runSniper(this, '${cmdKey}')">SNIPE</button>` : ''}
                        <button class="sniper-btn" style="border-color:var(--text-muted); color:var(--text-muted)" onclick="runSniper(this, '${reportKey}')">📋 COPY SUMMARY</button>
                    </div>
                </div>`;
        }).join('');

        return `<details class="cat-details" id="${catId}" ${isOpen} ontoggle="saveDashboardState()"><summary class="cat-header"><span>${label}</span><span class="badge">${list.length}</span></summary><div style="padding:10px;">${rows}</div></details>`;
    }).join('');
}

function renderAffectedGroups(urls) {
    if (!urls) return '';
    const folders = {};
    const rootFiles = [];
    urls.sort().forEach(u => {
        try {
            const path = new URL(u).pathname;
            const parts = path.split('/').filter(p => p);
            if (parts.length > 1) {
                const folder = `/${parts[0]}/*`;
                if (!folders[folder]) folders[folder] = [];
                folders[folder].push(u);
            } else { rootFiles.push(u); }
        } catch(e) { rootFiles.push(u); }
    });
    let html = '';
    for (const [name, list] of Object.entries(folders)) {
        html += `<details style="margin-bottom:5px; background:rgba(255,255,255,0.03); border-radius:4px;"><summary style="padding:5px 10px; font-size:11px; cursor:pointer; color:var(--text-main);">📂 <b>${name}</b> (${list.length} pages)</summary><div style="padding:5px 15px; border-left:1px solid var(--accent); margin-left:10px; max-height:150px; overflow-y:auto;">${list.map(url => `<div style="margin-bottom:3px; font-size:10px;">📄 ${extractPath(url)}</div>`).join('')}</div></details>`;
    }
    if (rootFiles.length > 0) {
        html += `<details style="margin-bottom:5px; background:rgba(255,255,255,0.03); border-radius:4px;"><summary style="padding:5px 10px; font-size:11px; cursor:pointer; color:var(--text-main);">📄 <b>Common Root Pages</b> (${rootFiles.length} pages)</summary><div style="padding:5px 15px; border-left:1px solid var(--text-muted); margin-left:10px; max-height:150px; overflow-y:auto;">${rootFiles.map(url => `<div style="margin-bottom:3px; font-size:10px;">📄 ${extractPath(url)}</div>`).join('')}</div></details>`;
    }
    return html;
}

function generateGroupedTextReport(e) {
    const urls = e.affectedUrls || [];
    const groups = {};
    urls.forEach(u => {
        try {
            const path = new URL(u).pathname;
            const parts = path.split('/').filter(p => p);
            const key = parts.length > 1 ? `/${parts[0]}/*` : 'Root';
            if (!groups[key]) groups[key] = 0;
            groups[key]++;
        } catch(err) { groups['Other'] = (groups['Other'] || 0) + 1; }
    });
    let report = `ISSUE: ${e.message}\nFIX: ${e.fix}\n\nAFFECTED SECTIONS:\n`;
    for (const [f, count] of Object.entries(groups)) report += `- ${f} (${count} pages)\n`;
    return report;
}

function buildErrorHtml(activeErrors, pageId, savedState) {
    const cats = { SECURITY: [], FUNCTIONAL: [], SEO: [], ACCESSIBILITY: [] };
    activeErrors.forEach(err => {
        const t = (err.category || 'FUNC').toUpperCase();
        if (t.includes('SEC')) cats.SECURITY.push(err); else if (t.includes('SEO')) cats.SEO.push(err);
        else if (t.includes('A11Y') || t.includes('ACC')) cats.ACCESSIBILITY.push(err); else cats.FUNCTIONAL.push(err);
    });

    return Object.entries(cats).map(([label, list]) => {
        if (list.length === 0) return '';
        const catId = `${pageId}-${label}`;
        const isOpen = (savedState?.openCats?.includes(catId)) ? 'open' : '';
        const rows = list.map((e, idx) => {
            const cmdKey = `${catId}-${idx}`;
            window.sniperMap[cmdKey] = isVisual(e) ? generateSniperCommand(e, true) : null;
            const sevColor = { 'critical': '#ff4444', 'high': '#ff8800', 'medium': '#ffbb33', 'low': '#64ffda' }[e.severity || 'low'];

            return `
                <div class="error-item" style="border-left: 3px solid ${sevColor}; margin-bottom:8px; padding:12px; display:flex; gap:15px; background:rgba(255,255,255,0.01); border-radius:0 4px 4px 0;">
                    <div class="ei-content" style="flex:1">
                        <div class="ei-msg"><b style="color:${sevColor}">[${e.severity?.toUpperCase()}]</b> ${escapeHtml(e.message)}</div>
                        <div class="fix-box" style="font-size:12px; margin:5px 0; color:var(--text-muted)"><span style="color:var(--mint-glow)">FIX:</span> ${escapeHtml(e.fix)}</div>
                        ${e.outerHTML && e.outerHTML !== 'N/A' ? `<div class="ei-code" style="background:#000; padding:10px; border-radius:4px; font-family:monospace; font-size:11px; color:#88b4e2; margin-top:8px; border:1px solid #222; white-space:pre-wrap; word-break:break-all;">${escapeHtml(e.outerHTML)}</div>` : ''}
                    </div>
                    ${window.sniperMap[cmdKey] ? `<button class="sniper-btn" onclick="runSniper(this, '${cmdKey}')">${isVisual(e) ? 'SNIPE' : 'LOG'}</button>` : ''}
                </div>`;
        }).join('');

        return `<details class="cat-details" id="${catId}" ${isOpen} ontoggle="saveDashboardState()"><summary class="cat-header"><span>${label}</span><span class="badge">${list.length}</span></summary><div style="padding:10px;">${rows}</div></details>`;
    }).join('');
}

function updateHUD(domain) {
    let stats = { SEC: 0, SEO: 0, A11Y: 0, FUNC: 0 };
    const allErrors = [...(domain.uniqueErrors || []), ...(domain.pages.flatMap(p => p.errors))];
    allErrors.forEach(e => {
        if(e.status === 'FIXED') return;
        const c = (e.category || 'FUNC').toUpperCase();
        if(c.includes('SEC')) stats.SEC++; else if(c.includes('SEO')) stats.SEO++; else if(c.includes('A11Y')) stats.A11Y++; else stats.FUNC++;
    });
    document.getElementById('domain-metrics-hud').innerHTML = `
        <div class="metric-card"><div class="mc-label">Scope</div><div class="mc-value">${domain.pageCount} Pages</div></div>
        <div class="metric-card"><div class="mc-label">Security</div><div class="mc-value" style="color:var(--danger)">${stats.SEC}</div></div>
        <div class="metric-card"><div class="mc-label">Functional</div><div class="mc-value" style="color:var(--warning)">${stats.FUNC}</div></div>
        <div class="metric-card"><div class="mc-label">SEO</div><div class="mc-value" style="color:var(--info)">${stats.SEO}</div></div>
        <div class="metric-card"><div class="mc-label">A11y</div><div class="mc-value" style="color:var(--success)">${stats.A11Y}</div></div>
    `;
}

// --- UTILS ---
function saveDashboardState() {
    const stage = document.getElementById('main-stage');
    const openPages = [];
    document.querySelectorAll('.page-row.open').forEach(el => { if(el.id) openPages.push(el.id); });
    const openCats = [];
    document.querySelectorAll('details[open]').forEach(el => { if(el.id) openCats.push(el.id); });

    const state = {
        domain: window.CURRENT_DOMAIN_NAME,
        stageScroll: stage ? stage.scrollTop : 0,
        openPages: openPages,
        openCats: openCats
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function getSavedState() {
    try {
        const s = localStorage.getItem(STATE_KEY);
        return s ? JSON.parse(s) : null;
    } catch(e) { return null; }
}

function toggleRow(id) {
    const el = document.getElementById(id);
    if(el) { el.classList.toggle('open'); saveDashboardState(); }
}

function extractPath(url) {
    try { return url.includes('//') ? new URL(url).pathname : url; } catch(e) { return url; }
}

function isVisual(e) {
    const s = (e.selector || '').toLowerCase();
    if (!s || s === 'n/a' || s === 'head' || s === 'html' || s === 'body') return false;
    return true;
}

function generateSniperCommand(e, visual) {
    const sel = e.selector.replace(/'/g, "\\'");
    if (!visual) return `console.log("ISSUE: ${e.message.replace(/"/g, "'")}");`;
    return `(function(){ var el=document.querySelector('${sel}'); if(el){ el.style.outline='5px solid #64ffda'; el.scrollIntoView({behavior:'smooth',block:'center'}); } })();`;
}

function generateMasterScript(filteredErrors, label, color) {
    if (filteredErrors.length === 0) return null;
    const targets = filteredErrors.map(e => ({ sel: e.selector.replace(/'/g, "\\'"), msg: e.message.replace(/'/g, "") }));
    return `(function(){ console.clear(); console.log("%c STRIKE: ${label} ", "background:${color}; color:#000; font-weight:bold;"); var t=${JSON.stringify(targets)}; t.forEach(function(x){ var el=document.querySelector(x.sel); if(el){ el.style.outline='4px solid ${color}'; el.style.boxShadow='0 0 15px ${color}'; }}); })();`;
}

function runSniper(btn, key) {
    const cmd = window.sniperMap[key];
    navigator.clipboard.writeText(cmd).then(() => {
        const old = btn.innerText; btn.innerText = "COPIED";
        setTimeout(() => btn.innerText = old, 1200);
    });
}

function sanitize(s) { return s ? s.replace(/[^a-zA-Z0-9-]/g, '') : 'id'; }
function escapeHtml(s) { return s ? String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m])) : ""; }

initDashboard();
setInterval(() => { saveDashboardState(); initDashboard(); }, 30000);