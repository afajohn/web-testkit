// API base URL
const API_BASE = '';

// State
let domains = {};
let stats = {};
let summaries = {}; // Object grouped by domain

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    // Add timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
        const domainsList = document.getElementById('domainsList');
        if (domainsList && domainsList.innerHTML.includes('Loading')) {
            domainsList.innerHTML = '<div class="error">Loading timeout. Please check if the server is running and refresh the page.</div>';
        }
    }, 10000); // 10 second timeout
    
    loadData().finally(() => {
        clearTimeout(loadingTimeout);
    });
    setupModal();
});

// Setup tab switching
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;

            // Update buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update contents
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`${tabName}Tab`).classList.add('active');

            // Load data for active tab
            if (tabName === 'summaries') {
                loadSummaries();
            }
        });
    });
}

// Load all data
async function loadData() {
    try {
        // Load domains first, then stats (stats will trigger renderDomains)
        await loadDomains();
        await loadStats();
        
        // Ensure domains are rendered even if stats didn't trigger it
        const domainsList = document.getElementById('domainsList');
        if (Object.keys(domains).length > 0) {
            renderDomains();
        } else {
            // If no domains, show message
            if (domainsList) {
                domainsList.innerHTML = '<div class="error">No domains found in reports directory.<br><small>Please ensure the reports directory exists and contains JSON report files.</small></div>';
            }
        }
    } catch (error) {
        console.error('Error loading data:', error);
        const domainsList = document.getElementById('domainsList');
        if (domainsList) {
            domainsList.innerHTML = `<div class="error">Failed to load data: ${error.message}<br><small>Please check the browser console for details.</small></div>`;
        }
        console.error('Error loading data:', error);
    }
}

// Load domains structure
async function loadDomains() {
    try {
        console.log('Loading domains from:', `${API_BASE}/api/domains`);
        const response = await fetch(`${API_BASE}/api/domains`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to load domains:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        domains = await response.json();
        console.log('Loaded domains:', Object.keys(domains).length, 'domains', domains);
        // Don't render here - wait for stats to be loaded first
    } catch (error) {
        console.error('Error loading domains:', error);
        const domainsList = document.getElementById('domainsList');
        if (domainsList) {
            domainsList.innerHTML = 
                `<div class="error">Failed to load domains: ${error.message}<br>` +
                `<small>Please check if the server is running and the reports directory exists.</small></div>`;
        }
        throw error; // Re-throw so loadData can handle it
    }
}

// Load statistics
async function loadStats() {
    try {
        console.log('Loading stats from:', `${API_BASE}/api/stats`);
        const response = await fetch(`${API_BASE}/api/stats`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to load stats:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        stats = await response.json();
        console.log('Loaded stats:', Object.keys(stats).length, 'domain stats', stats);
        renderStats();
        // Render domains after stats are loaded
        if (Object.keys(domains).length > 0) {
            renderDomains();
        } else {
            console.warn('Domains loaded but empty, stats loaded successfully');
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        // Still try to render domains even if stats fail
        if (Object.keys(domains).length > 0) {
            renderDomains();
        }
        // Don't throw - stats are optional, domains are more important
    }
}

// Load summaries
async function loadSummaries() {
    try {
        const response = await fetch(`${API_BASE}/api/summaries`);
        if (!response.ok) throw new Error('Failed to load summaries');
        summaries = await response.json();
        renderSummaries();
    } catch (error) {
        console.error('Error loading summaries:', error);
        document.getElementById('summariesList').innerHTML = 
            '<div class="error">Failed to load summary reports.</div>';
    }
}

// Render statistics bar
function renderStats() {
    const statsBar = document.getElementById('statsBar');
    const domainNames = Object.keys(stats);
    
    let totalFiles = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalIssues = 0;

    domainNames.forEach(domain => {
        const stat = stats[domain];
        totalFiles += stat.totalFiles || 0;
        totalPassed += stat.totalPassed || 0;
        totalFailed += stat.totalFailed || 0;
        totalIssues += stat.totalIssues || 0;
    });

    statsBar.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Total Domains</span>
            <span class="stat-value">${domainNames.length}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Reports</span>
            <span class="stat-value">${totalFiles}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Passed</span>
            <span class="stat-value success">${totalPassed}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Failed</span>
            <span class="stat-value error">${totalFailed}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Issues</span>
            <span class="stat-value">${totalIssues}</span>
        </div>
    `;
}

// Render domains list
function renderDomains() {
    const domainsList = document.getElementById('domainsList');
    const domainNames = Object.keys(domains).sort();

    if (domainNames.length === 0) {
        domainsList.innerHTML = '<div class="error">No domains found in reports directory.</div>';
        return;
    }

    domainsList.innerHTML = domainNames.map(domain => {
        const domainData = domains[domain];
        const domainStats = stats[domain] || { totalPassed: 0, totalFailed: 0, totalIssues: 0 };
        const passRate = domainData.totalFiles > 0 
            ? ((domainStats.totalPassed / domainData.totalFiles) * 100).toFixed(1)
            : 0;

        // Get directory structure
        const directories = Object.keys(domainData.structure || {}).sort();
        const structureHTML = directories.map(dir => {
            const files = domainData.structure[dir];
            return `
                <div class="directory-item">
                    <div class="directory-path">${dir || '/'}</div>
                    <div class="report-list">
                        ${files.map(file => {
                            const reportPath = file.fullPath || `${domain}/${file.path}`.replace(/\/\//g, '/');
                            return `
                            <div class="report-item" onclick="loadReport('${reportPath.replace(/'/g, "\\'")}')">
                                <span class="report-name">${file.name}</span>
                                <span class="report-status loading-status" data-path="${reportPath.replace(/"/g, '&quot;')}">Loading...</span>
                            </div>
                        `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="domain-card">
                <div class="domain-header" onclick="toggleDomain('${domain}')">
                    <div>
                        <div class="domain-name">${domain}</div>
                        <div class="domain-stats">
                            <div class="domain-stat">
                                <span class="domain-stat-label">Files:</span>
                                <span class="domain-stat-value">${domainData.totalFiles}</span>
                            </div>
                            <div class="domain-stat">
                                <span class="domain-stat-label">Passed:</span>
                                <span class="domain-stat-value success">${domainStats.totalPassed}</span>
                            </div>
                            <div class="domain-stat">
                                <span class="domain-stat-label">Failed:</span>
                                <span class="domain-stat-value error">${domainStats.totalFailed}</span>
                            </div>
                            <div class="domain-stat">
                                <span class="domain-stat-label">Issues:</span>
                                <span class="domain-stat-value">${domainStats.totalIssues}</span>
                            </div>
                            <div class="domain-stat">
                                <span class="domain-stat-label">Pass Rate:</span>
                                <span class="domain-stat-value ${passRate >= 80 ? 'success' : passRate >= 50 ? '' : 'error'}">${passRate}%</span>
                            </div>
                        </div>
                    </div>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="domain-structure" id="domain-${domain}">
                    ${structureHTML}
                </div>
            </div>
        `;
    }).join('');

    // Load report statuses
    domainNames.forEach(domain => {
        const domainData = domains[domain];
        Object.values(domainData.structure || {}).flat().forEach(file => {
            const reportPath = file.fullPath || `${domain}/${file.path}`.replace(/\/\//g, '/');
            loadReportStatus(reportPath);
        });
    });
}

// Toggle domain expansion
function toggleDomain(domain) {
    const structure = document.getElementById(`domain-${domain}`);
    structure.classList.toggle('expanded');
    
    const header = structure.previousElementSibling;
    const icon = header.querySelector('.toggle-icon');
    icon.textContent = structure.classList.contains('expanded') ? '▲' : '▼';
}

// Load report status
async function loadReportStatus(reportPath) {
    try {
        const response = await fetch(`${API_BASE}/api/report/${encodeURIComponent(reportPath)}`);
        if (!response.ok) return;
        
        const report = await response.json();
        // Find status element by data-path attribute
        const statusElement = document.querySelector(`[data-path="${reportPath.replace(/"/g, '&quot;')}"]`);
        
        if (statusElement) {
            statusElement.classList.remove('loading-status');
            if (report.summary?.overallStatus === 'passed') {
                statusElement.classList.add('report-status', 'passed');
                statusElement.textContent = '✅ Passed';
            } else {
                statusElement.classList.add('report-status', 'failed');
                statusElement.textContent = '❌ Failed';
            }
        }
    } catch (error) {
        console.error('Error loading report status:', error);
    }
}

// Store current report data for re-run functionality
let currentReportData = null;
let currentReportPath = null;

// Load and display report
async function loadReport(reportPath) {
    const modal = document.getElementById('reportModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modal.classList.add('active');
    modalTitle.textContent = `Report: ${reportPath}`;
    modalBody.innerHTML = '<div class="loading">Loading report...</div>';

    try {
        const encodedPath = encodeURIComponent(reportPath);
        const response = await fetch(`${API_BASE}/api/report/${encodedPath}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            const errorMsg = errorData.error || `HTTP ${response.status}`;
            console.error('API Error:', { status: response.status, errorData, reportPath, encodedPath });
            throw new Error(errorMsg);
        }

        const report = await response.json();
        currentReportData = report;
        currentReportPath = reportPath;
        
        // Store URL in re-run button data attribute for easy access
        const rerunButton = document.getElementById('rerunTestButton');
        if (rerunButton) {
            // Show the button for individual reports
            rerunButton.style.display = 'inline-flex';
            
            if (report.url) {
                rerunButton.setAttribute('data-report-url', report.url);
                console.log('Stored URL in button data attribute:', report.url);
            } else if (currentReportPath) {
                // Fallback: construct URL from path and store it
                try {
                    const pathParts = currentReportPath.split('/');
                    if (pathParts.length > 0) {
                        const domain = pathParts[0];
                        const filePath = pathParts.slice(1).join('/');
                        const fileName = filePath.replace(/\.json$/, '');
                        
                        let constructedUrl = '';
                        if (fileName.startsWith('root/')) {
                            const baseFileName = fileName.replace(/^root\//, '');
                            constructedUrl = baseFileName ? `https://${domain}/${baseFileName}.html` : `https://${domain}/`;
                        } else if (fileName === 'root') {
                            constructedUrl = `https://${domain}/`;
                        } else {
                            let urlPath = fileName.replace(/\//g, '/');
                            if (urlPath && !urlPath.match(/\.[a-z]+$/i)) {
                                urlPath += '.html';
                            }
                            constructedUrl = `https://${domain}/${urlPath}`;
                        }
                        rerunButton.setAttribute('data-report-url', constructedUrl);
                        console.log('Constructed and stored URL in button:', constructedUrl);
                    }
                } catch (error) {
                    console.error('Error setting URL in button data attribute:', error);
                }
            }
        }
        
        renderReportDetails(report);
    } catch (error) {
        console.error('Error loading report:', error, { reportPath });
        modalBody.innerHTML = `<div class="error">
            <strong>Failed to load report</strong><br>
            Error: ${error.message}<br>
            Path: ${reportPath}<br>
            <small>Check the browser console for more details.</small>
        </div>`;
    }
}

// Re-run test for current report (exposed globally for onclick handler)
window.rerunTest = async function rerunTest() {
    console.log('rerunTest function called');
    console.log('currentReportData:', currentReportData);
    console.log('currentReportPath:', currentReportPath);
    
    // Try 0: Get URL from button data attribute (most reliable, set when report loads)
    let url = null;
    let rerunButton = document.getElementById('rerunTestButton');
    if (rerunButton) {
        const dataUrl = rerunButton.getAttribute('data-report-url');
        if (dataUrl) {
            url = dataUrl;
            console.log('Got URL from button data attribute:', url);
        }
    }
    
    // If currentReportData is missing but we have a path, try to reload it
    if (!url && !currentReportData && currentReportPath) {
        console.log('currentReportData missing, attempting to reload report...');
        try {
            const encodedPath = encodeURIComponent(currentReportPath);
            const response = await fetch(`${API_BASE}/api/report/${encodedPath}`);
            if (response.ok) {
                currentReportData = await response.json();
                console.log('Report reloaded:', currentReportData);
            }
        } catch (error) {
            console.error('Error reloading report:', error);
        }
    }
    
    // Try multiple sources to get the URL
    if (!url && currentReportData) {
        // Try 1: Direct URL field
        if (currentReportData.url) {
            url = currentReportData.url;
            console.log('Got URL from currentReportData.url:', url);
        }
        // Try 2: Metadata canonical URL
        else if (currentReportData.metadata && currentReportData.metadata.canonicalUrl) {
            url = currentReportData.metadata.canonicalUrl;
            console.log('Got URL from metadata.canonicalUrl:', url);
        }
    }
    
    // Try 3: Extract from rendered report details (from Report Information section)
    if (!url) {
        try {
            // Try multiple selectors to find the URL in the Report Information section
            let urlElement = document.querySelector('#section-info .detail-value code');
            if (!urlElement) {
                // Try alternative selector
                urlElement = document.querySelector('#section-info code');
            }
            if (!urlElement) {
                // Try finding any code element with a URL pattern in the modal
                const allCodeElements = document.querySelectorAll('#reportModal code');
                for (const codeEl of allCodeElements) {
                    const text = codeEl.textContent.trim();
                    if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                        urlElement = codeEl;
                        break;
                    }
                }
            }
            
            if (urlElement && urlElement.textContent) {
                const extractedUrl = urlElement.textContent.trim();
                if (extractedUrl && (extractedUrl.startsWith('http://') || extractedUrl.startsWith('https://'))) {
                    url = extractedUrl;
                    console.log('Extracted URL from DOM:', url);
                }
            }
        } catch (error) {
            console.error('Error extracting URL from DOM:', error);
        }
    }
    
    // Try 4: Construct from report path as last resort
    if (!url && currentReportPath) {
        try {
            // Report path format: domain/path/to/file.json or domain/root/filename.json
            // Extract domain and path to construct URL
            const pathParts = currentReportPath.split('/');
            if (pathParts.length > 0) {
                const domain = pathParts[0];
                // Remove domain and file extension, reconstruct path
                const filePath = pathParts.slice(1).join('/');
                const fileName = filePath.replace(/\.json$/, '');
                
                // Convert filename back to URL path
                // Files in 'root' folder go to domain root with .html extension
                if (fileName.startsWith('root/')) {
                    // Remove 'root/' prefix and add .html extension
                    const baseFileName = fileName.replace(/^root\//, '');
                    url = baseFileName ? `https://${domain}/${baseFileName}.html` : `https://${domain}/`;
                } else if (fileName === 'root') {
                    // Just 'root' means the index page
                    url = `https://${domain}/`;
                } else {
                    // Regular path structure
                    let urlPath = fileName.replace(/\//g, '/');
                    // Add .html if it looks like a page name (no extension)
                    if (urlPath && !urlPath.match(/\.[a-z]+$/i)) {
                        urlPath += '.html';
                    }
                    url = `https://${domain}/${urlPath}`;
                }
                console.log('Constructed URL from path:', url, '(from path:', currentReportPath, ')');
            }
        } catch (error) {
            console.error('Error constructing URL from path:', error);
        }
    }
    
    if (!url) {
        console.error('No URL available from report data or path');
        alert('Unable to determine URL for this report. The report may be missing URL information.');
        return;
    }

    console.log('Using URL for re-run:', url);
    
    // Get rerunButton (may have been retrieved earlier)
    if (!rerunButton) {
        rerunButton = document.getElementById('rerunTestButton');
    }
    
    if (!rerunButton) {
        console.error('Re-run button not found');
        alert('Re-run button not found. Please refresh the page.');
        return;
    }
    
    const originalText = rerunButton.innerHTML;
    
    // Disable button and show loading state
    rerunButton.disabled = true;
    rerunButton.innerHTML = '<span class="spinner"></span> Running...';
    rerunButton.classList.add('running');

    try {
        console.log('Starting test re-run for URL:', url);
        const response = await fetch(`${API_BASE}/api/rerun-test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            console.error('API error response:', errorData);
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('Test start response:', result);
        
        // Show success message
        rerunButton.innerHTML = '✓ Test Started';
        rerunButton.classList.remove('running');
        rerunButton.classList.add('success');

        // Poll for test completion
        pollForTestCompletion(url, currentReportPath);

    } catch (error) {
        console.error('Error re-running test:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            url: url,
            currentReportData: currentReportData
        });
        rerunButton.disabled = false;
        rerunButton.innerHTML = originalText;
        rerunButton.classList.remove('running');
        alert(`Failed to start test: ${error.message}\n\nCheck browser console (F12) for details.`);
    }
}

// Poll for test completion
async function pollForTestCompletion(url, reportPath, maxAttempts = 60) {
    let attempts = 0;
    const pollInterval = 3000; // Poll every 3 seconds
    const maxWaitTime = maxAttempts * pollInterval; // Maximum wait time in ms

    const startTime = Date.now();
    
    // Ensure status div exists
    let statusDiv = document.getElementById('testStatus');
    if (!statusDiv) {
        // Create status div if it doesn't exist
        const modalBody = document.getElementById('modalBody');
        statusDiv = document.createElement('div');
        statusDiv.id = 'testStatus';
        statusDiv.className = 'test-status';
        if (modalBody.firstChild) {
            modalBody.insertBefore(statusDiv, modalBody.firstChild);
        } else {
            modalBody.appendChild(statusDiv);
        }
    }

    const updateStatus = (message, isComplete = false) => {
        const statusDiv = document.getElementById('testStatus');
        if (statusDiv) {
            statusDiv.innerHTML = message;
            statusDiv.className = `test-status ${isComplete ? 'complete' : 'running'}`;
            statusDiv.style.display = 'block';
        }
    };

    updateStatus('⏳ Test is running... This may take a minute.');

    const poll = async () => {
        attempts++;
        const elapsed = Date.now() - startTime;

        if (elapsed > maxWaitTime) {
            updateStatus('⚠️ Test is taking longer than expected. Please refresh manually.', true);
            return;
        }

        try {
            // Try to reload the report to check if it's been updated
            const encodedPath = encodeURIComponent(reportPath);
            const response = await fetch(`${API_BASE}/api/report/${encodedPath}?t=${Date.now()}`);
            
            if (response.ok) {
                const updatedReport = await response.json();
                const newTimestamp = new Date(updatedReport.timestamp).getTime();
                const oldTimestamp = currentReportData ? new Date(currentReportData.timestamp).getTime() : 0;

                // If timestamp is newer, test completed
                if (newTimestamp > oldTimestamp) {
                    updateStatus('✅ Test completed! Refreshing report...', true);
                    
                    // Reload the report after a short delay
                    setTimeout(() => {
                        loadReport(reportPath);
                        const rerunButton = document.getElementById('rerunTestButton');
                        if (rerunButton) {
                            rerunButton.disabled = false;
                            rerunButton.innerHTML = '🔄 Re-run Test';
                            rerunButton.classList.remove('running', 'success');
                        }
                    }, 1000);
                    return;
                }
            }

            // Continue polling
            updateStatus(`⏳ Test is running... (${Math.floor(elapsed / 1000)}s elapsed)`);
            setTimeout(poll, pollInterval);

        } catch (error) {
            console.error('Error polling for test completion:', error);
            updateStatus('⚠️ Error checking test status. Please refresh manually.', true);
        }
    };

    // Start polling after initial delay
    setTimeout(poll, pollInterval);
}

// Render report details
function renderReportDetails(report) {
    const modalBody = document.getElementById('modalBody');
    
    const sections = [];

    // Summary section
    if (report.summary) {
        const status = report.summary.overallStatus === 'passed' ? 'success' : 'error';
        sections.push(`
            <div class="report-section ${status}">
                <div class="report-section-header" onclick="toggleReportSection('section-summary')">
                    <span>📊 Summary</span>
                    <span class="section-toggle-icon">▼</span>
                </div>
                <div class="report-section-content" id="section-summary">
                <div class="detail-item">
                    <div class="detail-label">Overall Status</div>
                    <div class="detail-value">
                        <span class="report-status ${status}">${report.summary.overallStatus === 'passed' ? '✅ ' : report.summary.overallStatus === 'failed' ? '❌ ' : ''}${report.summary.overallStatus || 'Unknown'}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">SEO</div>
                    <div class="detail-value">${report.summary.seoPassed ? '✅ Passed' : '❌ Failed'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Broken Links</div>
                    <div class="detail-value">${report.summary.brokenLinksCount || 0}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Accessibility</div>
                    <div class="detail-value">${report.summary.accessibilityPassed ? '✅ Passed' : '❌ Failed'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">GTM</div>
                    <div class="detail-value">${report.summary.gtmPassed ? '✅ Passed' : '❌ Failed'}</div>
                </div>
                </div>
            </div>
        `);
    }

    // SEO section
    if (report.seo && report.seo.results) {
        const failed = report.seo.results.filter(r => !r.passed);
        const status = failed.length === 0 ? 'success' : 'warning';
        sections.push(`
            <div class="report-section ${status}">
                <div class="report-section-header" onclick="toggleReportSection('section-seo')">
                    <span>🔍 SEO Checks <span style="font-weight: normal; font-size: 0.875rem;">(${failed.length} failed / ${report.seo.results.length} total)</span></span>
                    <span class="section-toggle-icon">▼</span>
                </div>
                <div class="report-section-content" id="section-seo">
                ${report.seo.results.map(check => `
                    <div class="detail-item">
                        <div class="detail-label">${check.check}</div>
                        <div class="detail-value">
                            <span class="report-status ${check.passed ? 'passed' : 'failed'}">
                                ${check.passed ? '✅' : '❌'} ${check.message || 'N/A'}
                            </span>
                            ${check.value ? `<div style="margin-top: 0.5rem;"><code>${check.value}</code></div>` : ''}
                        </div>
                    </div>
                `).join('')}
                </div>
            </div>
        `);
    }

    // Broken Links section
    if (report.brokenLinks && report.brokenLinks.brokenLinks && report.brokenLinks.brokenLinks.length > 0) {
        sections.push(`
            <div class="report-section error">
                <div class="report-section-header" onclick="toggleReportSection('section-broken-links')">
                    <span>🔗 Broken Links <span style="font-weight: normal; font-size: 0.875rem;">(${report.brokenLinks.brokenLinks.length} found)</span></span>
                    <span class="section-toggle-icon">▼</span>
                </div>
                <div class="report-section-content" id="section-broken-links">
                ${report.brokenLinks.brokenLinks.slice(0, 10).map(link => `
                    <div class="detail-item">
                        <div class="detail-label">URL</div>
                        <div class="detail-value"><code>${link.url}</code></div>
                        <div class="detail-label" style="margin-top: 0.5rem;">Status</div>
                        <div class="detail-value">${link.status} ${link.statusText || ''}</div>
                        ${link.error ? `<div class="detail-value" style="color: var(--error-color); margin-top: 0.5rem;">${link.error}</div>` : ''}
                    </div>
                `).join('')}
                ${report.brokenLinks.brokenLinks.length > 10 ? `<div class="detail-item"><em>... and ${report.brokenLinks.brokenLinks.length - 10} more</em></div>` : ''}
                </div>
            </div>
        `);
    }

    // Accessibility section
    if (report.accessibility && report.accessibility.violations && report.accessibility.violations.length > 0) {
        sections.push(`
            <div class="report-section error">
                <div class="report-section-header" onclick="toggleReportSection('section-accessibility')">
                    <span>♿ Accessibility Violations <span style="font-weight: normal; font-size: 0.875rem;">(${report.accessibility.violations.length} found)</span></span>
                    <span class="section-toggle-icon">▼</span>
                </div>
                <div class="report-section-content" id="section-accessibility">
                ${report.accessibility.violations.slice(0, 5).map(violation => `
                    <div class="detail-item">
                        <div class="detail-label">${violation.id} (${violation.impact || 'unknown'})</div>
                        <div class="detail-value">${violation.description || violation.help || 'N/A'}</div>
                    </div>
                `).join('')}
                ${report.accessibility.violations.length > 5 ? `<div class="detail-item"><em>... and ${report.accessibility.violations.length - 5} more</em></div>` : ''}
                </div>
            </div>
        `);
    }

    // GTM section
    if (report.gtm) {
        const status = report.gtm.hasGTM ? 'success' : 'warning';
        sections.push(`
            <div class="report-section ${status}">
                <div class="report-section-header" onclick="toggleReportSection('section-gtm')">
                    <span>📊 Google Tag Manager</span>
                    <span class="section-toggle-icon">▼</span>
                </div>
                <div class="report-section-content" id="section-gtm">
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">${report.gtm.hasGTM ? '✅ GTM Found' : '❌ GTM Not Found'}</div>
                </div>
                ${report.gtm.containerId ? `
                    <div class="detail-item">
                        <div class="detail-label">Container ID</div>
                        <div class="detail-value"><code>${report.gtm.containerId}</code></div>
                    </div>
                ` : ''}
                ${report.gtm.message ? `
                    <div class="detail-item">
                        <div class="detail-label">Message</div>
                        <div class="detail-value">${report.gtm.message}</div>
                    </div>
                ` : ''}
                </div>
            </div>
        `);
    }

    // URL and timestamp
    sections.unshift(`
        <div class="report-section">
            <div class="report-section-header" onclick="toggleReportSection('section-info')">
                <span>ℹ️ Report Information</span>
                <span class="section-toggle-icon">▼</span>
            </div>
            <div class="report-section-content" id="section-info">
            <div class="detail-item">
                <div class="detail-label">URL</div>
                <div class="detail-value"><code>${report.url || 'N/A'}</code></div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Timestamp</div>
                <div class="detail-value">${report.timestamp ? new Date(report.timestamp).toLocaleString() : 'N/A'}</div>
            </div>
            </div>
        </div>
    `);

    modalBody.innerHTML = `
        <div id="testStatus" class="test-status" style="display: none;"></div>
        <div class="report-details">${sections.join('')}</div>
    `;
    
    // Ensure the re-run button is visible and enabled
    const rerunBtn = document.getElementById('rerunTestButton');
    if (rerunBtn) {
        rerunBtn.disabled = false;
        rerunBtn.innerHTML = '🔄 Re-run Test';
        rerunBtn.classList.remove('running', 'success');
        rerunBtn.style.display = 'flex';
    }
}

// Toggle report section accordion
function toggleReportSection(sectionId) {
    const content = document.getElementById(sectionId);
    const header = content?.previousElementSibling;
    const icon = header?.querySelector('.section-toggle-icon');
    
    if (content && header) {
        content.classList.toggle('collapsed');
        
        if (icon) {
            icon.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
        }
    }
}

// Render summaries grouped by domain
function renderSummaries() {
    const summariesList = document.getElementById('summariesList');

    // Check if summaries is an array (old format) or object (new format)
    const summariesByDomain = Array.isArray(summaries) ? {} : summaries;
    const domainNames = Object.keys(summariesByDomain).sort();

    if (domainNames.length === 0) {
        summariesList.innerHTML = '<div class="error">No summary reports found.</div>';
        return;
    }

    summariesList.innerHTML = domainNames.map(domain => {
        const domainSummaries = summariesByDomain[domain] || [];
        
        return `
            <div class="domain-card">
                <div class="domain-header" onclick="toggleSummaryDomain('${domain}')">
                    <div>
                        <div class="domain-name">${domain}</div>
                        <div class="domain-stats">
                            <div class="domain-stat">
                                <span class="domain-stat-label">Summary Reports:</span>
                                <span class="domain-stat-value">${domainSummaries.length}</span>
                            </div>
                        </div>
                    </div>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="domain-structure" id="summary-domain-${domain}">
                    <div class="report-list">
                        ${domainSummaries.map(summary => `
                            <div class="report-item" onclick="loadSummary('${domain}', '${summary.name.replace(/'/g, "\\'")}')" style="cursor: pointer;">
                                <span class="report-name">${summary.name}</span>
                                ${summary.timestamp ? `<span class="report-status" style="font-size: 0.75rem; color: var(--text-secondary);">${formatTimestamp(summary.timestamp)}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Toggle summary domain expansion
function toggleSummaryDomain(domain) {
    const structure = document.getElementById(`summary-domain-${domain}`);
    structure.classList.toggle('expanded');
    
    const header = structure.previousElementSibling;
    const icon = header.querySelector('.toggle-icon');
    icon.textContent = structure.classList.contains('expanded') ? '▲' : '▼';
}

// Parse markdown and convert to HTML with collapsible sections
function parseMarkdownToAccordions(markdown) {
    if (!markdown) return '<div class="error">No content available</div>';
    
    const lines = markdown.split('\n');
    const sections = [];
    let currentSection = null;
    let currentContent = [];
    
    // First, extract the main header and intro content (before first ##)
    let introContent = [];
    let foundFirstSection = false;
    
    // Process each line
    lines.forEach((line) => {
        // Check if line is a ## heading (main section)
        const sectionMatch = line.match(/^##\s+(.+)$/);
        
        if (sectionMatch) {
            // If this is the first section, save intro content
            if (!foundFirstSection) {
                if (introContent.length > 0) {
                    const introText = introContent.join('\n').trim();
                    if (introText) {
                        sections.push({
                            title: 'Overview',
                            content: introText
                        });
                    }
                }
                foundFirstSection = true;
            }
            
            // Save previous section if exists
            if (currentSection !== null) {
                sections.push({
                    title: currentSection,
                    content: currentContent.join('\n').trim()
                });
            }
            
            // Start new section
            currentSection = sectionMatch[1].trim();
            currentContent = [];
        } else {
            if (!foundFirstSection) {
                // Collect intro content
                introContent.push(line);
            } else {
                // Add line to current section content
                currentContent.push(line);
            }
        }
    });
    
    // Don't forget the last section
    if (currentSection !== null) {
        sections.push({
            title: currentSection,
            content: currentContent.join('\n').trim()
        });
    }
    
    // If no sections found, return the whole content as a single section
    if (sections.length === 0) {
        sections.push({
            title: 'Summary Report',
            content: markdown.trim()
        });
    }
    
    // Convert to HTML with accordions
    return sections.map((section, index) => {
        const sectionId = `section-summary-${index}`;
        const htmlContent = convertMarkdownToHTML(section.content);
        
        return `
            <div class="report-section">
                <div class="report-section-header" onclick="toggleReportSection('${sectionId}')">
                    <span>${escapeHtml(section.title)}</span>
                    <span class="section-toggle-icon">▼</span>
                </div>
                <div class="report-section-content" id="${sectionId}">
                    <div class="markdown-content">${htmlContent}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Convert markdown to HTML (basic conversion)
function convertMarkdownToHTML(markdown) {
    if (!markdown) return '';
    
    // Split into lines for processing
    const lines = markdown.split('\n');
    const processedLines = [];
    let inList = false;
    let listItems = [];
    
    lines.forEach((line) => {
        // Check for list items
        const listMatch = line.match(/^(\s*)- (.+)$/);
        const h3Match = line.match(/^### (.+)$/);
        const hrMatch = line.match(/^---$/);
        
        if (h3Match) {
            // Close any open list
            if (inList && listItems.length > 0) {
                processedLines.push(`<ul class="markdown-ul">${listItems.map(item => `<li class="markdown-li">${processInlineMarkdown(item)}</li>`).join('')}</ul>`);
                listItems = [];
                inList = false;
            }
            processedLines.push(`<h3 class="markdown-h3">${processInlineMarkdown(h3Match[1])}</h3>`);
        } else if (hrMatch) {
            // Close any open list
            if (inList && listItems.length > 0) {
                processedLines.push(`<ul class="markdown-ul">${listItems.map(item => `<li class="markdown-li">${processInlineMarkdown(item)}</li>`).join('')}</ul>`);
                listItems = [];
                inList = false;
            }
            processedLines.push('<hr class="markdown-hr">');
        } else if (listMatch) {
            // Start or continue list
            inList = true;
            listItems.push(listMatch[2]);
        } else {
            // Close any open list
            if (inList && listItems.length > 0) {
                processedLines.push(`<ul class="markdown-ul">${listItems.map(item => `<li class="markdown-li">${processInlineMarkdown(item)}</li>`).join('')}</ul>`);
                listItems = [];
                inList = false;
            }
            
            // Process regular line
            if (line.trim()) {
                processedLines.push(`<p class="markdown-p">${processInlineMarkdown(line)}</p>`);
            } else {
                processedLines.push('<br>');
            }
        }
    });
    
    // Close any remaining list
    if (inList && listItems.length > 0) {
        processedLines.push(`<ul class="markdown-ul">${listItems.map(item => `<li class="markdown-li">${processInlineMarkdown(item)}</li>`).join('')}</ul>`);
    }
    
    return processedLines.join('\n');
}

// Process inline markdown (bold, links, code, etc.)
function processInlineMarkdown(text) {
    if (!text) return '';
    
    // Escape HTML first
    let html = escapeHtml(text);
    
    // Convert bold (**text** or __text__)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // Convert inline code (`code`)
    html = html.replace(/`([^`]+)`/g, '<code class="markdown-code">$1</code>');
    
    // Convert links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="markdown-link">$1</a>');
    
    return html;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load and display summary in modal
function loadSummary(domain, summaryName) {
    const modal = document.getElementById('reportModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modal.classList.add('active');
    modalTitle.textContent = `Summary Report: ${summaryName}`;
    modalBody.innerHTML = '<div class="loading">Loading summary...</div>';
    
    // Clear current report data and hide re-run button for summaries
    currentReportData = null;
    currentReportPath = null;
    const rerunButton = document.getElementById('rerunTestButton');
    if (rerunButton) {
        rerunButton.style.display = 'none';
        rerunButton.removeAttribute('data-report-url');
    }

    // Find the summary in our data
    const domainSummaries = summaries[domain] || [];
    const summary = domainSummaries.find(s => s.name === summaryName);

    if (summary) {
        if (summary.error) {
            modalBody.innerHTML = `<div class="error">Error loading summary: ${summary.error}</div>`;
        } else {
            // Parse markdown and render with accordions
            const accordionHTML = parseMarkdownToAccordions(summary.content);
            modalBody.innerHTML = `<div class="report-details">${accordionHTML}</div>`;
        }
    } else {
        modalBody.innerHTML = '<div class="error">Summary not found</div>';
    }
}

// Format timestamp for display
function formatTimestamp(timestamp) {
    // Format: 2026-01-15_07-56
    if (!timestamp) return '';
    const parts = timestamp.split('_');
    if (parts.length !== 2) return timestamp;
    
    const date = parts[0]; // 2026-01-15
    const time = parts[1].replace(/-/g, ':'); // 07:56
    
    return `${date} ${time}`;
}

// Setup modal
function setupModal() {
    const modal = document.getElementById('reportModal');
    const closeButton = document.getElementById('closeModal');

    closeButton.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });
}

// Show error
function showError(message) {
    console.error(message);
    // You can add a toast notification here if needed
}
