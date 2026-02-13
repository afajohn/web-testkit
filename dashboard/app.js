// dashboard/app.js - MINT STABLE (Unified + Deduplication + Eternal Memory)

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
        
        // Restore domain and state from LocalStorage on first run
        const saved = getSavedState();
        if (!window.CURRENT_DOMAIN_NAME && saved && saved.domain) {
            window.CURRENT_DOMAIN_NAME = saved.domain;
        }

        if (window.CURRENT_DOMAIN_NAME) {
            const activeDomain = data.domains.find(d => d.name === window.CURRENT_DOMAIN_NAME);
            if (activeDomain) {
                const sidebarEl = document.querySelector(`.domain-item[data-name="${sanitize(activeDomain.name).toLowerCase()}"]`);
                updateMainStage(activeDomain, sidebarEl, saved);
            }
        }
    } catch (e) { console.error("Sync Error:", e); }
}

// --- 2. STATE MANAGEMENT (Your Persistence Core) ---
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
    const totalErrors = data.domains.reduce((s, d) => s + d.totalErrors, 0);
    const totalPages = data.domains.reduce((s, d) => s + d.pageCount, 0);
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
            initDashboard();
        };
        container.appendChild(el);
    });
}

function updateMainStage(domain, sidebarEl, savedState) {
    const stage = document.getElementById('main-stage');
    const targetScroll = (savedState && savedState.domain === domain.name) ? savedState.stageScroll : stage.scrollTop;

    // Build HUD and Stage Structure
    stage.innerHTML = `
        <div class="stage-header">
            <div class="dh-title">${domain.name}</div>
            <div id="domain-metrics-hud" class="dh-grid"></div>
        </div>
        
        <div id="global-issues-area">
            ${domain.globalErrors && domain.globalErrors.length > 0 ? `
                <div class="cat-block" style="border: 2px solid var(--danger); border-radius: 8px; background: rgba(255, 92, 92, 0.05); margin-bottom: 20px;">
                    <div class="cat-title" style="padding:15px; color:var(--danger); font-size:14px; font-weight:bold;">
                        🚨 GLOBAL COMPONENT ERRORS (Header/Footer/Shared)
                    </div>
                    <div style="padding:0 15px 15px 15px;">
                        ${buildGlobalErrorRows(domain.globalErrors, sanitize(domain.name), savedState)}
                    </div>
                </div>
            ` : ''}
        </div>
        <div id="page-list-area"></div>
    `;

    // Update HUD Stats (Deduplicated Math)
    let stats = { SEC: 0, SEO: 0, A11Y: 0, FUNC: 0 };
    [...domain.globalErrors, ...domain.pages.flatMap(p => p.errors)].forEach(e => {
        if(e.status === 'FIXED') return;
        const c = (e.category || 'FUNC').toUpperCase();
        if(c.includes('SEC')) stats.SEC++; else if(c.includes('SEO')) stats.SEO++; else if(c.includes('A11Y')) stats.A11Y++; else stats.FUNC++;
    });

    document.getElementById('domain-metrics-hud').innerHTML = `
        <div class="metric-card"><div class="mc-label">Pages Scan</div><div class="mc-value">${domain.pageCount}</div></div>
        <div class="metric-card"><div class="mc-label">Security</div><div class="mc-value" style="color:var(--danger)">${stats.SEC}</div></div>
        <div class="metric-card"><div class="mc-label">Functional</div><div class="mc-value" style="color:var(--warning)">${stats.FUNC}</div></div>
        <div class="metric-card"><div class="mc-label">SEO</div><div class="mc-value" style="color:var(--info)">${stats.SEO}</div></div>
        <div class="metric-card"><div class="mc-label">A11y</div><div class="mc-value" style="color:var(--success)">${stats.A11Y}</div></div>
    `;

    // Render Page Rows
    const pageArea = document.getElementById('page-list-area');
    domain.pages.forEach(page => {
        const pageId = `pg-${sanitize(page.stableId)}`;
        const activeErrors = page.errors.filter(e => e.status !== 'FIXED');
        if (activeErrors.length === 0) return;

        const pageEl = document.createElement('div');
        pageEl.className = `page-row ${ (savedState?.openPages?.includes('row-'+pageId)) ? 'open' : '' }`;
        pageEl.id = `row-${pageId}`;
        pageEl.innerHTML = `
            <div class="pr-header" onclick="this.parentElement.classList.toggle('open'); saveDashboardState();">
                <div style="display:flex; align-items:center; gap:15px;">
                    <a href="${page.url}" target="_blank" class="pr-path" onclick="event.stopPropagation()">📄 ${new URL(page.url).pathname}</a>
                </div>
                <span class="badge err">${activeErrors.length} PAGE ISSUES</span>
            </div>
            <div class="pr-body">${buildErrorHtml(activeErrors, pageId, savedState)}</div>
        `;
        pageArea.appendChild(pageEl);
    });

    stage.scrollTop = targetScroll;
}

function buildGlobalErrorRows(errors, domainId, savedState) {
    return errors.map((e, idx) => {
        const cmdKey = `GLOBAL-${domainId}-${idx}`;
        const visual = isVisual(e);
        window.sniperMap[cmdKey] = visual ? generateSniperCommand(e, visual) : null;
        return renderErrorItem(e, cmdKey, visual, 'GLOBAL');
    }).join('');
}

function buildErrorHtml(errors, pageId, savedState) {
    const cats = { SECURITY: [], FUNCTIONAL: [], SEO: [], ACCESSIBILITY: [] };
    errors.forEach(err => {
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
            const visual = isVisual(e);
            window.sniperMap[cmdKey] = visual ? generateSniperCommand(e, visual) : null;
            return renderErrorItem(e, cmdKey, visual, e.severity);
        }).join('');

        return `<details class="cat-details" id="${catId}" ${isOpen} ontoggle="saveDashboardState()"><summary class="cat-header"><span>${label}</span><span class="badge">${list.length}</span></summary><div style="padding:10px 0;">${rows}</div></details>`;
    }).join('');
}

function renderErrorItem(e, cmdKey, visual, severity) {
    const sevColor = { 'critical': '#ff4444', 'high': '#ff8800', 'medium': '#ffbb33', 'low': '#64ffda', 'GLOBAL': '#ff4444' }[severity || 'low'];
    return `
        <div class="error-item" style="border-left: 3px solid ${sevColor}; margin-bottom:8px; padding:12px; display:flex; gap:15px; background:rgba(255,255,255,0.01)">
            <div style="flex:1">
                <div class="ei-msg"><b style="color:${sevColor}">[${severity?.toUpperCase()}]</b> ${escapeHtml(e.message)}</div>
                <div style="font-size:12px; margin-top:5px; color:var(--text-muted)"><span style="color:var(--mint-glow)">FIX:</span> ${escapeHtml(e.fix)}</div>
                ${e.outerHTML && e.outerHTML !== 'N/A' ? `<div class="ei-code">${escapeHtml(e.outerHTML)}</div>` : ''}
            </div>
            ${window.sniperMap[cmdKey] ? `<button class="sniper-btn" onclick="runSniper(this, '${cmdKey}')">${visual ? 'SNIPE' : 'LOG'}</button>` : ''}
        </div>`;
}

// --- 4. LOGIC GATES & UTILS ---
function isVisual(e) {
    const s = (e.selector || '').toLowerCase();
    if (!s || s === 'n/a' || s === 'head' || s === 'html') return false;
    return true;
}

function generateSniperCommand(e, visual) {
    const sel = e.selector.replace(/'/g, "\\'");
    return `(function(){ var el=document.querySelector('${sel}'); if(el){ el.style.outline='5px solid #64ffda'; el.scrollIntoView({behavior:'smooth',block:'center'}); } })();`;
}

function runSniper(btn, key) {
    navigator.clipboard.writeText(window.sniperMap[key]).then(() => {
        const old = btn.innerText; btn.innerText = "COPIED";
        setTimeout(() => btn.innerText = old, 1200);
    });
}

function sanitize(s) { return s ? s.replace(/[^a-zA-Z0-9]/g, '') : 'id'; }
function escapeHtml(s) { return s ? String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m])) : ""; }

initDashboard();
setInterval(() => { saveDashboardState(); initDashboard(); }, 30000);