// dashboard/app.js

window.sniperMap = {}; 
window.GLOBAL_DATA = null;
window.CURRENT_DOMAIN_NAME = null; 

// --- STATE MANAGEMENT ---
const STATE_KEY = 'qa_dashboard_state';

function saveDashboardState() {
    const stage = document.getElementById('main-stage');
    const sidebar = document.querySelector('.domain-list');
    
    // 1. Capture Open Page Rows (IDs)
    const openPages = [];
    document.querySelectorAll('.page-row.open').forEach(el => {
        if(el.id) openPages.push(el.id);
    });

    // 2. Capture Open Categories (IDs)
    const openCats = [];
    document.querySelectorAll('.cat-details[open]').forEach(el => {
        if(el.id) openCats.push(el.id);
    });

    const state = {
        domain: window.CURRENT_DOMAIN_NAME,
        stageScroll: stage ? stage.scrollTop : 0,
        sidebarScroll: sidebar ? sidebar.scrollTop : 0,
        openPages: openPages,
        openCats: openCats,
        searchVal: document.getElementById('domain-search').value
    };
    
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function getSavedState() {
    try {
        const s = localStorage.getItem(STATE_KEY);
        return s ? JSON.parse(s) : null;
    } catch(e) { return null; }
}

// --- INITIALIZATION ---
async function initDashboard() {
    try {
        // NOTE: In production, ensure this path is correct
        const response = await fetch('data/aggregated.json?t=' + Date.now());
        const data = await response.json();
        window.GLOBAL_DATA = data;
        
        renderGlobalStats(data);
        renderSidebar(data.domains);
        
        // --- RESTORE STATE LOGIC ---
        const saved = getSavedState();
        
        // A. If we are just loading up (first run) and have a saved state
        if (!window.CURRENT_DOMAIN_NAME && saved && saved.domain) {
            window.CURRENT_DOMAIN_NAME = saved.domain;
            
            // Restore Search
            if(saved.searchVal) {
                document.getElementById('domain-search').value = saved.searchVal;
                filterDomains();
            }

            // Restore Sidebar Scroll
            const sidebar = document.querySelector('.domain-list');
            if(sidebar) sidebar.scrollTop = saved.sidebarScroll || 0;
        }

        // B. Update the view
        if (window.CURRENT_DOMAIN_NAME) {
            const activeDomain = data.domains.find(d => d.name === window.CURRENT_DOMAIN_NAME);
            if (activeDomain) {
                const sidebarEl = document.querySelector(`.domain-item[data-name="${sanitize(activeDomain.name).toLowerCase()}"]`);
                
                // Pass the saved state to the renderer so it knows what to keep open
                updateMainStage(activeDomain, sidebarEl, saved);
            }
        }
        
    } catch (e) {
        console.error("Sync Error:", e);
    }
}

// --- RENDERERS ---

function renderGlobalStats(data) {
    const totalErrors = data.domains.reduce((s, d) => s + d.totalErrors, 0);
    const totalPages = data.domains.reduce((s, d) => s + d.pageCount, 0);
    document.getElementById('global-stats').innerHTML = `
        <span>DOMAINS: <b>${data.domains.length}</b></span>
        <span>PAGES: <b>${totalPages}</b></span>
        <span style="color:var(--danger)">ACTIVE ISSUES: <b>${totalErrors}</b></span>
        <span style="color:var(--text-muted); margin-left:10px;">// SYNC: ${new Date().toLocaleTimeString()}</span>
    `;
}

function renderSidebar(domains) {
    const container = document.getElementById('domain-list-container');
    // Only clear if empty to prevent jitter, but since we replace content, 
    // we need to be careful. For this implementation, we rebuild.
    container.innerHTML = '';
    
    domains.forEach(d => {
        const el = document.createElement('div');
        el.className = 'domain-item';
        if (window.CURRENT_DOMAIN_NAME === d.name) el.classList.add('active');
        el.dataset.name = sanitize(d.name).toLowerCase();
        
        let status = d.totalErrors > 10 ? 'risk' : (d.totalErrors > 0 ? 'warn' : 'safe');
        
        el.innerHTML = `
            <span>${d.name}</span>
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="color:var(--text-muted); font-size:11px;">${d.totalErrors}</span>
                <div class="status-dot ${status}"></div>
            </div>
        `;
        el.onclick = () => {
            // Save state of previous domain before switching
            saveDashboardState();
            window.CURRENT_DOMAIN_NAME = d.name;
            updateMainStage(d, el, null); // Pass null state to reset view for new domain
        };
        container.appendChild(el);
    });
    
    // Re-apply filter if exists
    filterDomains();
}

function updateMainStage(domain, clickedEl, savedState) {
    document.querySelectorAll('.domain-item').forEach(e => e.classList.remove('active'));
    if(clickedEl) clickedEl.classList.add('active');

    const stage = document.getElementById('main-stage');
    
    // If we have a saved state for this domain, use it. Otherwise use current scroll.
    const targetScroll = (savedState && savedState.domain === domain.name) 
        ? savedState.stageScroll 
        : (window.CURRENT_DOMAIN_NAME === domain.name ? stage.scrollTop : 0);

    stage.innerHTML = `
        <div class="stage-header">
            <div class="dh-title">${domain.name}</div>
            <div class="dh-grid">
                <div class="metric-card"><div class="mc-label">Total Pages</div><div class="mc-value">${domain.pageCount}</div></div>
                <div class="metric-card"><div class="mc-label">Issues Found</div><div class="mc-value" style="color:var(--danger)">${domain.totalErrors}</div></div>
            </div>
        </div>
        <div id="page-list-area"></div>
    `;

    const pageArea = document.getElementById('page-list-area');
    
    domain.pages.forEach(page => {
        const pageId = `pg-${sanitize(page.stableId)}`;
        const rowId = `row-${pageId}`; // Unique ID for the wrapper
        const activeErrors = page.errors.filter(e => e.status !== 'FIXED');
        
        if (activeErrors.length === 0) return;

        const pageEl = document.createElement('div');
        pageEl.className = 'page-row';
        pageEl.id = rowId; // IMPORTANT for State Persistence
        
        // Check if this was open in saved state
        if (savedState && savedState.openPages && savedState.openPages.includes(rowId)) {
            pageEl.classList.add('open');
        }

        // Master Script Logic
        const masterKey = `MASTER-${pageId}`;
        window.sniperMap[masterKey] = generateMasterScript(activeErrors);

        pageEl.innerHTML = `
            <div class="pr-header" onclick="toggleRow('${rowId}')">
                <div style="display:flex; align-items:center; gap:15px;">
                    <a href="${page.url}" target="_blank" class="pr-path" onclick="event.stopPropagation()">
                        ${new URL(page.url).pathname}
                    </a>
                    ${window.sniperMap[masterKey] ? `<button class="snipe-all-btn" onclick="event.stopPropagation(); runSniper(this, '${masterKey}')">🎯 SNIPE ALL</button>` : ''}
                </div>
                <span class="badge err">${activeErrors.length} ISSUES</span>
            </div>
            <div class="pr-body" id="${pageId}-body">
                ${buildNestedCategories(activeErrors, pageId, savedState)}
            </div>
        `;
        pageArea.appendChild(pageEl);
    });
    
    // Restore Scroll Position
    setTimeout(() => {
        stage.scrollTop = targetScroll;
    }, 0);
}

function buildNestedCategories(errors, pageId, savedState) {
    const cats = { SECURITY: [], FUNCTIONAL: [], SEO: [], ACCESSIBILITY: [] };
    errors.forEach(e => {
        const c = (e.category || 'FUNC').toUpperCase();
        if (c.includes('SEC')) cats.SECURITY.push(e);
        else if (c.includes('SEO')) cats.SEO.push(e);
        else if (c.includes('A11Y') || c.includes('ACC')) cats.ACCESSIBILITY.push(e);
        else cats.FUNCTIONAL.push(e);
    });

    return Object.entries(cats).map(([label, list]) => {
        if (list.length === 0) return '';
        const catId = `${pageId}-${label}`;
        
        // Check if category was open
        const isOpen = (savedState && savedState.openCats && savedState.openCats.includes(catId)) ? 'open' : '';

        const rows = list.map((e, idx) => {
            const cmdKey = `${catId}-${idx}`;
            const visual = isVisual(e);
            window.sniperMap[cmdKey] = visual ? generateSniperCommand(e) : null;

            return `
                <div class="error-item ${e.severity === 'critical' ? 'ei-critical' : 'ei-low'}">
                    <div class="ei-content">
                        <div class="ei-msg"><b>[${e.severity?.toUpperCase()}]</b> ${escapeHtml(e.message)}</div>
                        <div class="fix-box" style="font-size:12px; margin-top:5px; color:var(--text-muted)">
                            <span style="color:var(--mint-glow)">FIX:</span> ${escapeHtml(e.fix)}
                        </div>
                        ${e.outerHTML && e.outerHTML !== 'N/A' ? `<div class="ei-code">${escapeHtml(e.outerHTML)}</div>` : ''}
                    </div>
                    ${window.sniperMap[cmdKey] ? `<button class="sniper-btn" onclick="runSniper(this, '${cmdKey}')">SNIPE</button>` : ''}
                </div>
            `;
        }).join('');

        return `
            <details class="cat-details" id="${catId}" ${isOpen}>
                <summary class="cat-header">
                    <span>${label}</span>
                    <span class="badge" style="opacity:0.5">${list.length}</span>
                </summary>
                <div style="padding:10px 0;">${rows}</div>
            </details>
        `;
    }).join('');
}

// --- LOGIC GATES & UTILS ---

function toggleRow(id) {
    const el = document.getElementById(id);
    if(el) el.classList.toggle('open');
}

function isVisual(e) {
    const sel = (e.selector || '').toLowerCase();
    const cat = (e.category || '').toUpperCase();
    if (!sel || sel === 'n/a' || sel === 'head' || sel === 'html') return false;
    if (cat === 'SECURITY' && !sel.includes('img') && !sel.includes('iframe') && !sel.includes('form')) return false;
    return true;
}

function generateSniperCommand(e) {
    const sel = e.selector.replace(/'/g, "\\'");
    return `(function(){ var el=document.querySelector('${sel}'); if(el){ el.style.outline='5px solid #64ffda'; el.scrollIntoView({behavior:'smooth',block:'center'}); } else { console.log('Element not found'); } })();`;
}

function generateMasterScript(errors) {
    const targets = errors.filter(isVisual).map(e => ({ sel: e.selector, msg: e.message }));
    if (targets.length === 0) return null;
    return `(function(){ console.clear(); var t=${JSON.stringify(targets)}; var found=0; t.forEach(function(x){ var el=document.querySelector(x.sel); if(el){ el.style.outline='4px solid #ff00ff'; el.style.boxShadow='0 0 15px rgba(255,0,255,0.5)'; el.title=x.msg; found++; }}); console.log('🎯 Marked '+found+' elements.'); })();`;
}

function runSniper(btn, key) {
    const cmd = window.sniperMap[key];
    navigator.clipboard.writeText(cmd).then(() => {
        const old = btn.innerText; btn.innerText = "COPIED";
        setTimeout(() => btn.innerText = old, 1200);
    });
}

function sanitize(s) { return s ? s.replace(/[^a-zA-Z0-9]/g, '') : 'id'; }
function escapeHtml(s) { return s ? String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m])) : ""; }
function filterDomains() {
    const term = document.getElementById('domain-search').value.toLowerCase();
    document.querySelectorAll('.domain-item').forEach(el => {
        el.style.display = el.dataset.name.includes(term) ? 'flex' : 'none';
    });
}

// ⚠️ EVENT LISTENERS FOR PERSISTENCE
window.addEventListener('beforeunload', saveDashboardState);

initDashboard();
setInterval(() => {
    saveDashboardState(); // Save state before re-rendering
    initDashboard();
}, 30000);