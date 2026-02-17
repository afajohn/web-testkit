// dashboard/app.js - MINT ULTIMATE (Hardened Patterns + Nested Accordions)

window.sniperMap = {}; 
window.GLOBAL_DATA = null;
window.CURRENT_DOMAIN_NAME = null; 
const STATE_KEY = 'qa_dashboard_state';

// --- 1. INITIALIZATION ---
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
                const sidebarEl = document.querySelector(`.domain-item[data-name="${sanitizeId(activeDomain.name).toLowerCase()}"]`);
                updateMainStage(activeDomain, sidebarEl, saved);
            }
        }
    } catch (e) { 
        console.error("Critical System Failure:", e); 
    }
}

// --- 2. STATE MANAGEMENT ---
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

// --- 3. RENDERERS ---

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
        const dId = sanitizeId(d.name).toLowerCase();
        el.className = `domain-item ${window.CURRENT_DOMAIN_NAME === d.name ? 'active' : ''}`;
        el.dataset.name = dId;
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

function updateMainStage(domain, sidebarEl, savedState) {
    const stage = document.getElementById('main-stage');
    const targetScroll = (savedState && savedState.domain === domain.name) ? savedState.stageScroll : 0;

    // Reset Structure
    stage.innerHTML = `
        <div class="stage-header">
            <div class="dh-title">${domain.name}</div>
            <div id="domain-metrics-hud" class="dh-grid"></div>
        </div>
        <div id="unique-summary-area" style="margin-bottom:40px;"></div>
        <div style="margin-bottom:15px; font-size:11px; color:var(--text-muted); font-weight:800; letter-spacing:1px; text-transform:uppercase; border-bottom: 1px solid var(--border); padding-bottom:10px;">Individual Page Audit</div>
        <div id="page-list-area"></div>
    `;

    updateHUD(domain);
    
    // 1. UNIQUE ACTION MATRIX
    const matrixArea = document.getElementById('unique-summary-area');
    if (domain.uniqueErrors && domain.uniqueErrors.length > 0) {
        matrixArea.innerHTML = `
            <details class="cat-details" style="border: 1px solid var(--accent); background: rgba(100, 255, 218, 0.05);" id="action-matrix" ${savedState?.openCats?.includes('action-matrix') ? 'open' : ''} ontoggle="saveDashboardState()">
                <summary class="cat-header" style="padding:15px; color:var(--mint-glow); font-weight:bold;">
                    📊 UNIQUE ERROR ACTION MATRIX
                    <span class="badge" style="background:var(--accent); color:#000;">${domain.uniqueErrors.length} UNIQUE ISSUES</span>
                </summary>
                <div id="matrix-body-content" style="padding:10px;">
                    ${buildCategorizedMatrix(domain.uniqueErrors, domain.name, savedState)}
                </div>
            </details>
        `;
    }

    // 2. DETAILED PAGE LIST
    const pageArea = document.getElementById('page-list-area');
    domain.pages.forEach(page => {
        const pageId = `pg-${sanitizeId(page.stableId || page.url)}`;
        const rowId = `row-${pageId}`;
        const activeErrors = page.errors.filter(e => e.status !== 'FIXED');
        if (activeErrors.length === 0) return;

        let pageEl = document.getElementById(rowId);
        if (pageEl && pageEl.dataset.ts === page.timestamp) return;

        const keyAll = `MASTER-ALL-${pageId}`;
        window.sniperMap[keyAll] = generateMasterScript(activeErrors.filter(isVisual), "ALL", "#ff00ff");

        const innerHtml = `
            <div class="pr-header" onclick="toggleRow('${rowId}')">
                <div style="display:flex; align-items:center; gap:15px;">
                    <a href="${page.url}" target="_blank" class="pr-path" onclick="event.stopPropagation()">📄 ${extractPath(page.url)}</a>
                    <button class="snipe-all-btn s-all" onclick="event.stopPropagation(); runSniper(this, '${keyAll}')">🎯 ALL</button>
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

    if (targetScroll > 0) stage.scrollTop = targetScroll;
}

// --- 4. BUILDERS ---

function buildCategorizedMatrix(uniqueErrors, domainName, savedState) {
    const cats = { SECURITY: [], FUNCTIONAL: [], SEO: [], ACCESSIBILITY: [] };
    uniqueErrors.forEach(err => {
        const t = (err.category || 'FUNC').toUpperCase();
        if (t.includes('SEC')) cats.SECURITY.push(err); else if (t.includes('SEO')) cats.SEO.push(err);
        else if (t.includes('A11Y') || t.includes('ACC')) cats.ACCESSIBILITY.push(err); else cats.FUNCTIONAL.push(err);
    });

    return Object.entries(cats).map(([label, list]) => {
        if (list.length === 0) return '';
        const catId = `matrix-${sanitizeId(domainName)}-${label}`;
        const isOpen = (savedState?.openCats?.includes(catId)) ? 'open' : '';
        const rows = list.map((e, idx) => {
            const cmdKey = `UNIQUE-${label}-${idx}`;
            window.sniperMap[cmdKey] = isVisual(e) ? generateSniperCommand(e, true) : null;
            const sevColor = { 'critical': '#ff4444', 'high': '#ff8800', 'medium': '#ffbb33', 'low': '#64ffda' }[e.severity || 'low'];

            return `
                <div class="error-item" style="border-left: 3px solid ${sevColor}; background:rgba(255,255,255,0.01); margin-bottom:12px; display:flex; gap:15px; padding:12px; border-radius:0 4px 4px 0;">
                    <div class="ei-content" style="flex:1">
                        <div class="ei-msg"><b style="color:${sevColor}">[${e.severity?.toUpperCase()}]</b> ${escapeHtml(e.message)}</div>
                        <div class="fix-box" style="font-size:12px; margin:5px 0; color:var(--text-muted)"><span style="color:var(--mint-glow)">FIX:</span> ${escapeHtml(e.fix)}</div>
                        
                        <div style="margin-top:10px; border-top:1px solid var(--border); padding-top:10px;">
                            ${renderAffectedGroups(e.affectedUrls, `aff-${cmdKey}`, savedState)}
                        </div>
                    </div>
                    ${window.sniperMap[cmdKey] ? `<button class="sniper-btn" onclick="runSniper(this, '${cmdKey}')">SNIPE</button>` : ''}
                </div>`;
        }).join('');

        return `<details class="cat-details" id="${catId}" ${isOpen} ontoggle="saveDashboardState()"><summary class="cat-header"><span>${label}</span><span class="badge">${list.length}</span></summary><div style="padding:10px;">${rows}</div></details>`;
    }).join('');
}

// 🎯 PATTERN LOGIC: Crash-Proof and Grouped
function renderAffectedGroups(urls, baseId, savedState) {
    if (!urls || urls.length === 0) return 'Global/Header Issue';
    
    const groups = {};
    urls.sort().forEach(u => {
        const path = extractPath(u);
        const parts = path.split('/').filter(p => p);
        const folder = parts.length > 1 ? `/${parts[0]}/*` : 'Common Root Pages';
        
        if (!groups[folder]) groups[folder] = [];
        groups[folder].push(path);
    });

    return Object.entries(groups).map(([name, list]) => {
        const foldId = `${baseId}-${sanitizeId(name)}`;
        const isOpen = savedState?.openCats?.includes(foldId) ? 'open' : '';
        const isRoot = name === 'Common Root Pages';
        
        return `
            <details style="margin-bottom:5px; background:rgba(255,255,255,0.03); border-radius:4px;" id="${foldId}" ${isOpen} ontoggle="saveDashboardState()">
                <summary style="padding:5px 10px; font-size:11px; cursor:pointer; color:var(--text-main); display:flex; justify-content:space-between;">
                    <span>${isRoot ? '📄' : '📂'} <b>${name}</b></span>
                    <span style="opacity:0.6">${list.length}</span>
                </summary>
                <div style="padding:5px 15px; border-left:1px solid ${isRoot ? 'var(--text-muted)' : 'var(--accent)'}; margin-left:10px; max-height:150px; overflow-y:auto;">
                    ${list.map(p => `<div style="margin-bottom:2px; font-size:10px; color:#888;">📄 ${p}</div>`).join('')}
                </div>
            </details>
        `;
    }).join('');
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
                <div class="error-item" style="border-left: 3px solid ${sevColor}; margin-bottom:8px; padding:12px; display:flex; gap:15px; background:rgba(255,255,255,0.01)">
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

// --- 5. LOGIC HELPERS ---

function updateHUD(domain) {
    let stats = { SEC: 0, SEO: 0, A11Y: 0, FUNC: 0 };
    const allErrors = [...(domain.uniqueErrors || []), ...(domain.pages.flatMap(p => p.errors))];
    allErrors.forEach(e => {
        if(e.status === 'FIXED') return;
        const c = (e.category || 'FUNC').toUpperCase();
        if(c.includes('SEC')) stats.SEC++; else if(c.includes('SEO')) stats.SEO++; else if(c.includes('A11Y')) stats.A11Y++; else stats.FUNC++;
    });
    document.getElementById('domain-metrics-hud').innerHTML = `
        <div class="metric-card"><div class="mc-label">Audit Scope</div><div class="mc-value">${domain.pageCount} Pages</div></div>
        <div class="metric-card"><div class="mc-label">Security</div><div class="mc-value" style="color:var(--danger)">${stats.SEC}</div></div>
        <div class="metric-card"><div class="mc-label">Functional</div><div class="mc-value" style="color:var(--warning)">${stats.FUNC}</div></div>
        <div class="metric-card"><div class="mc-label">SEO</div><div class="mc-value" style="color:var(--info)">${stats.SEO}</div></div>
        <div class="metric-card"><div class="mc-label">A11y</div><div class="mc-value" style="color:var(--success)">${stats.A11Y}</div></div>
    `;
}

function extractPath(url) {
    try {
        if (url.startsWith('http')) return new URL(url).pathname;
        return url;
    } catch(e) { return url; }
}

function isVisual(e) {
    const s = (e.selector || '').toLowerCase();
    if (!s || s === 'n/a' || s === 'head' || s === 'html' || s === 'body') return false;
    return true;
}

function generateSniperCommand(e, visual) {
    const sel = e.selector.replace(/'/g, "\\'");
    return `(function(){ var el=document.querySelector('${sel}'); if(el){ el.style.outline='5px solid #64ffda'; el.scrollIntoView({behavior:'smooth',block:'center'}); } })();`;
}

function runSniper(btn, key) {
    const cmd = window.sniperMap[key];
    navigator.clipboard.writeText(cmd).then(() => {
        const old = btn.innerText; btn.innerText = "COPIED";
        setTimeout(() => btn.innerText = old, 1200);
    });
}

function toggleRow(id) {
    const el = document.getElementById(id);
    if(el) { el.classList.toggle('open'); saveDashboardState(); }
}

function sanitizeId(s) { return s ? s.replace(/[^a-zA-Z0-9-]/g, '') : 'id'; }
function escapeHtml(s) { return s ? String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m])) : ""; }

initDashboard();
setInterval(() => { saveDashboardState(); initDashboard(); }, 30000);