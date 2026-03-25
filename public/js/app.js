/**
 * Vuln-to-Green Vault — Frontend Application
 * Handles all UI interactions, API calls, and state management
 */

// ═══ STATE ═══
let state = {
  lastScan: null,
  scanHistory: [],
  gitlabConnected: false,
  currentPage: 'dashboard',
  regions: [],
  rules: [],
  lastReport: null
};

// ═══ INITIALIZATION ═══
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  checkHealth();
  checkGitLabStatus();
  loadRegions(false);
  loadRules();
  loadDashboard();
});

// ═══ NAVIGATION ═══
function setupNavigation() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      navigateTo(page);
    });
  });
}

function navigateTo(page) {
  // Update nav
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

  // Update pages
  document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');

  // Update title
  const titles = {
    dashboard: 'Overview', scan: 'Run Scan', history: 'Scan History',
    security: 'Security Analysis', green: 'Green Score', regions: 'Region Explorer',
    gitlab: 'GitLab Integration', report: 'Analysis Report', rules: 'Scan Rules'
  };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  state.currentPage = page;

  // Load page-specific data
  if (page === 'history') loadHistory();
  if (page === 'gitlab') loadGitLabInfo();
  if (page === 'regions') loadRegions(false);
}

// ═══ API HELPERS ═══
async function apiFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  } catch (err) {
    if (err.message.includes('Failed to fetch')) {
      throw new Error('Server not reachable. Is the backend running?');
    }
    throw err;
  }
}

// ═══ HEALTH CHECK ═══
async function checkHealth() {
  try {
    const data = await apiFetch('/api/health');
    console.log('✅ Server healthy:', data);
  } catch (err) {
    showToast('Server not reachable. Make sure the backend is running.', 'error');
  }
}

// ═══ GITLAB STATUS ═══
async function checkGitLabStatus() {
  try {
    const data = await apiFetch('/api/gitlab/status');
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');

    if (data.connected) {
      state.gitlabConnected = true;
      dot.className = 'status-dot connected';
      text.textContent = data.project.name;
      text.title = data.project.webUrl;
    } else {
      state.gitlabConnected = false;
      dot.className = 'status-dot disconnected';
      text.textContent = data.message ? 'Not configured' : 'Disconnected';
    }
  } catch (err) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    dot.className = 'status-dot disconnected';
    text.textContent = 'Server offline';
  }
}

// ═══ DASHBOARD ═══
async function loadDashboard() {
  try {
    const data = await apiFetch('/api/dashboard');

    document.getElementById('totalScans').textContent = data.scanCount || 0;

    if (data.lastScan) {
      state.lastScan = data.lastScan;

      document.getElementById('totalVulns').textContent = data.lastScan.security?.totalVulnerabilities || 0;
      document.getElementById('greenOptCount').textContent = data.lastScan.green?.totalOptimizations || 0;

      if (data.lastScan.green?.impact) {
        const impact = data.lastScan.green.impact;
        document.getElementById('co2Saved').textContent = impact.co2SavingKgPerMonth || 0;
        document.getElementById('costSaved').textContent = `$${impact.costSavingPerMonth || 0}`;
        document.getElementById('impactTrees').textContent = impact.treesEquivalent || 0;
        document.getElementById('impactEnergy').textContent = impact.energySavingKwhPerMonth || 0;
        document.getElementById('impactPerf').textContent = `${impact.performanceImprovement || 0}%`;
        document.getElementById('impactYearly').textContent = impact.co2SavingKgPerYear || 0;
      }

      document.getElementById('filesScanned').textContent =
        (data.lastScan.security?.scannedFiles || 0) + (data.lastScan.green?.scannedFiles || 0);

      // Severity chart
      if (data.lastScan.security?.summary) {
        renderSeverityChart(data.lastScan.security.summary);
      }

      // Update badges
      if (data.lastScan.security?.totalVulnerabilities > 0) {
        const badge = document.getElementById('securityBadge');
        badge.textContent = data.lastScan.security.totalVulnerabilities;
        badge.style.display = 'inline';
      }
      if (data.lastScan.green?.totalOptimizations > 0) {
        const badge = document.getElementById('greenBadge');
        badge.textContent = data.lastScan.green.totalOptimizations;
        badge.style.display = 'inline';
      }
    }

    // Recent scans table
    if (data.recentScans && data.recentScans.length > 0) {
      renderRecentScans(data.recentScans);
    }
  } catch (err) {
    console.log('Dashboard load error:', err.message);
  }
}

// ═══ SEVERITY CHART ═══
function renderSeverityChart(summary) {
  const total = (summary.CRITICAL || 0) + (summary.HIGH || 0) + (summary.MEDIUM || 0) + (summary.LOW || 0);
  const bar = document.getElementById('severityBar');
  const legend = document.getElementById('severityLegend');
  const noData = document.getElementById('noSecurityData');

  if (total === 0) {
    bar.innerHTML = '';
    legend.innerHTML = '';
    noData.style.display = 'block';
    return;
  }

  noData.style.display = 'none';

  const segments = [
    { label: 'Critical', count: summary.CRITICAL || 0, cls: 'critical' },
    { label: 'High', count: summary.HIGH || 0, cls: 'high' },
    { label: 'Medium', count: summary.MEDIUM || 0, cls: 'medium' },
    { label: 'Low', count: summary.LOW || 0, cls: 'low' }
  ].filter(s => s.count > 0);

  bar.innerHTML = segments.map(s =>
    `<div class="severity-bar-segment ${s.cls}" style="width:${(s.count/total)*100}%"></div>`
  ).join('');

  legend.innerHTML = segments.map(s =>
    `<div class="severity-legend-item">
      <span class="severity-dot ${s.cls}"></span>
      <span>${s.label}: ${s.count}</span>
    </div>`
  ).join('');
}

// ═══ RECENT SCANS TABLE ═══
function renderRecentScans(scans) {
  const tbody = document.getElementById('recentScansBody');
  tbody.innerHTML = scans.map(scan => `
    <tr>
      <td><code style="font-size:0.75rem">${scan.id.substring(0, 16)}...</code></td>
      <td><span class="status-badge ${scan.status}">${scan.status}</span></td>
      <td>${scan.trigger || 'manual'}</td>
      <td style="color:${scan.vulnerabilities > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}">${scan.vulnerabilities}</td>
      <td style="color:${scan.optimizations > 0 ? 'var(--accent-yellow)' : 'var(--accent-green)'}">${scan.optimizations}</td>
      <td>${new Date(scan.startTime).toLocaleString()}</td>
    </tr>
  `).join('');
}

// ═══ FULL SCAN ═══
async function runFullScan() {
  const overlay = document.getElementById('scanningOverlay');
  const scanText = document.getElementById('scanningText');
  const scanSub = document.getElementById('scanningSub');

  overlay.classList.add('active');
  scanText.textContent = 'Connecting to GitLab...';
  scanSub.textContent = 'Fetching repository files and preparing scan';

  try {
    if (!state.gitlabConnected) {
      scanText.textContent = 'GitLab not configured';
      scanSub.textContent = 'Falling back to direct code scan mode...';
      await new Promise(r => setTimeout(r, 1000));
      overlay.classList.remove('active');
      showToast('GitLab not configured. Use "Scan Code Below" to scan code directly.', 'warning');
      navigateTo('scan');
      return;
    }

    scanText.textContent = 'Scanning repository...';
    scanSub.textContent = 'Running security analysis + green optimization on all files';

    const result = await apiFetch('/api/scan/full', { method: 'POST' });
    overlay.classList.remove('active');

    if (result.error) {
      showToast(`Scan failed: ${result.error}`, 'error');
      return;
    }

    state.lastScan = result;
    showToast(`Scan complete! Found ${result.security?.totalVulnerabilities || 0} issues.`, 'success');
    loadDashboard();
    if (result.security) renderSecurityPage(result.security);
    if (result.green) renderGreenPage(result.green);
    if (result.report) {
      state.lastReport = result.report;
      renderReport(result.report);
    }
    navigateTo('dashboard');
  } catch (err) {
    overlay.classList.remove('active');
    showToast(`Scan error: ${err.message}`, 'error');
  }
}

// ═══ DIRECT CODE SCAN ═══
async function scanDirectCode() {
  const filename = document.getElementById('codeFilename').value || 'app.js';
  const code = document.getElementById('codeEditor').value;

  if (!code.trim()) {
    showToast('Please paste some code to scan', 'warning');
    return;
  }

  const btn = document.getElementById('scanCodeBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Scanning...';

  try {
    const files = { [filename]: code };
    const result = await apiFetch('/api/scan/code', {
      method: 'POST',
      body: JSON.stringify({ files })
    });

    state.lastScan = result;
    const resultsCard = document.getElementById('scanResults');
    const resultsBody = document.getElementById('scanResultsBody');
    resultsCard.style.display = 'block';

    let html = '';
    if (result.security && result.security.findings.length > 0) {
      html += `<h3 style="margin-bottom:12px">🔴 Security Issues (${result.security.totalVulnerabilities})</h3><ul class="vuln-list">`;
      result.security.findings.forEach(f => {
        html += `
          <li class="vuln-item">
            <span class="vuln-severity-badge ${f.severity.toLowerCase()}">${f.severity}</span>
            <div class="vuln-info">
              <div class="vuln-name">${f.name}</div>
              <div class="vuln-file">${f.file}:${f.line}</div>
              <div class="vuln-desc">${f.description}</div>
            </div>
          </li>`;
      });
      html += '</ul>';
    } else {
      html += '<div style="padding:16px;color:var(--accent-green)">✅ No security issues found!</div>';
    }

    resultsBody.innerHTML = html;
    loadDashboard();
  } catch (err) {
    showToast(`Scan error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '📝 Scan Code Below';
  }
}

// ═══ RENDER GREEN FINDING ═══
function renderGreenFinding(finding) {
  if (finding.type === 'docker-image') {
    return `
      <div class="green-item-header">
        <span class="green-type-badge docker">Docker</span>
        <strong>Image Optimization</strong>
      </div>
      <div class="green-comparison">
        <span class="green-before">${finding.current}</span>
        <span class="green-arrow">→</span>
        <span class="green-after">${finding.recommended}</span>
      </div>
      <div class="green-savings">📦 Save ${finding.sizeSavingMB}MB</div>`;
  }
  if (finding.type === 'region') {
    return `
      <div class="green-item-header">
        <span class="green-type-badge region">Region</span>
        <strong>Region Migration</strong>
      </div>
      <div class="green-comparison">
        <span class="green-before">${finding.currentRegion}</span>
        <span class="green-arrow">→</span>
        <span class="green-after">${finding.recommendedRegion}</span>
      </div>
      <div class="green-savings">🌱 ${finding.carbonReductionPercent}% carbon reduction</div>`;
  }
  return `<div>${finding.description || 'Optimization found'}</div>`;
}

// ═══ SECURITY PAGE RENDERER ═══
function renderSecurityPage(securityData) {
  const list = document.getElementById('vulnList');
  const count = document.getElementById('securityCount');

  if (!securityData.findings || securityData.findings.length === 0) {
    list.innerHTML = '<div class="empty-state">✅ No Vulnerabilities Found</div>';
    count.textContent = '0 issues';
    return;
  }

  count.textContent = `${securityData.totalVulnerabilities} issues found`;
  list.innerHTML = securityData.findings.map(f => `
    <li class="vuln-item">
      <span class="vuln-severity-badge ${f.severity.toLowerCase()}">${f.severity}</span>
      <div class="vuln-info">
        <div class="vuln-name">${f.name}</div>
        <div class="vuln-file">${f.file}:${f.line}</div>
        <div class="vuln-desc">${f.description}</div>
      </div>
    </li>`
  ).join('');
}

// ═══ GREEN PAGE RENDERER ═══
function renderGreenPage(greenData) {
  const statsGrid = document.getElementById('greenStatsGrid');
  if (greenData.impact) {
    const i = greenData.impact;
    statsGrid.innerHTML = `
      <div class="stat-card green"><div class="stat-value">${greenData.totalOptimizations}</div><div class="stat-label">Optimizations</div></div>
      <div class="stat-card cyan"><div class="stat-value">${i.co2SavingKgPerMonth}</div><div class="stat-label">kg CO₂/Month</div></div>
      <div class="stat-card purple"><div class="stat-value">$${i.costSavingPerMonth}</div><div class="stat-label">Saved/Month</div></div>
      <div class="stat-card orange"><div class="stat-value">${i.treesEquivalent}</div><div class="stat-label">Trees</div></div>`;
  }
}

// ═══ REPORT ═══
function renderReport(reportMarkdown) {
  const container = document.getElementById('reportContainer');
  let html = reportMarkdown
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.*$)/gm, '<li>$1</li>');
  container.innerHTML = html;
}

// ═══ REGIONS ═══
async function loadRegions(forceRefresh = false) {
  try {
    const grid = document.getElementById('regionGrid');
    const banner = document.getElementById('regionsBanner');
    
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)"><div class="spinner spinner-lg"></div><p style="margin-top:12px">Fetching live carbon data...</p></div>';
    
    const url = forceRefresh ? '/api/green/regions?refresh=true' : '/api/green/regions';
    const data = await apiFetch(url);
    state.regions = data.regions;
    
    const liveCount = data.liveRegions || 0;
    if (banner) {
      if (liveCount > 0) {
        banner.innerHTML = `<span style="color:var(--accent-green)">🟢 LIVE</span> — Real-time carbon data active`;
        banner.className = 'banner-live';
        banner.style.color = 'var(--accent-green)';
      } else {
        banner.innerHTML = `<span style="color:var(--accent-yellow)">Add ELECTRICITY_MAPS_API_KEY to .env for live data</span>`;
        banner.className = 'banner-baseline';
        banner.style.color = 'var(--accent-yellow)';
      }
    }
    
    renderRegions(data.regions);
  } catch (err) {
    console.error('Failed to load regions:', err);
  }
}

function renderRegions(regions) {
  const grid = document.getElementById('regionGrid');
  grid.innerHTML = regions.map(r => {
    const tier = r.carbon < 100 ? 'green-tier' : r.carbon < 300 ? 'yellow-tier' : 'red-tier';
    const carbonColor = r.carbon < 100 ? 'var(--accent-green)' : r.carbon < 300 ? 'var(--accent-yellow)' : 'var(--accent-red)';
    const liveBadge = r.liveData 
      ? `<span class="badge-live">🟢 LIVE</span>`
      : ``;
    const freshness = r.fetchedAt 
      ? `<div class="freshness-text">Updated: ${new Date(r.fetchedAt).toLocaleTimeString()}</div>`
      : '';
    
    return `
      <div class="region-card ${tier}" title="${r.dataSource || ''}">
        <div class="region-header">
          <div class="region-name">${r.region}</div>
          ${liveBadge}
        </div>
        <div class="region-location">${r.name}</div>
        <div class="region-stats">
          <div class="region-stat">
            <span class="region-stat-value" style="color:${carbonColor}">${r.carbon}</span>
            <span class="region-stat-unit">gCO₂/kWh</span>
          </div>
          <div class="region-stat">
            <span class="region-stat-value" style="color:var(--accent-green)">${r.renewable}%</span>
            <span class="region-stat-unit">Renewable</span>
          </div>
        </div>
        ${freshness}
      </div>`;
  }).join('');
}

// ═══ GITLAB INFO ═══
async function loadGitLabInfo() {
  try {
    const data = await apiFetch('/api/gitlab/status');
    const container = document.getElementById('gitlabInfo');
    if (data.connected) {
      container.innerHTML = `<div>Connected to ${data.project.name}</div>`;
      // Ensure refresh button exists on regions page
      const regionPage = document.getElementById('page-regions');
      if (regionPage && !document.getElementById('manual-refresh-btn')) {
        const btn = document.createElement('button');
        btn.id = 'manual-refresh-btn';
        btn.innerHTML = '🔄 Refresh Carbon Data';
        btn.className = 'btn btn-ghost btn-sm';
        btn.onclick = () => loadRegions(true);
        regionPage.prepend(btn);
      }
    }
  } catch (err) { /* silent */ }
}

async function loadHistory() {
  try {
    const data = await apiFetch('/api/history');
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = data.scans.map(scan => `<tr><td>${scan.id.substring(0,8)}</td><td>${scan.status}</td><td>${scan.vulnerabilities}</td><td>${scan.optimizations}</td><td>${new Date(scan.startTime).toLocaleString()}</td></tr>`).join('');
  } catch (err) {}
}

async function loadRules() {
  try {
    const data = await apiFetch('/api/scan/rules');
    state.rules = data.rules;
  } catch (err) {}
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function openConfigModal() { document.getElementById('configModal').classList.add('active'); }
function closeConfigModal() { document.getElementById('configModal').classList.remove('active'); }

async function saveConfig() {
  const url = document.getElementById('configGitlabUrl').value.trim();
  const token = document.getElementById('configToken').value.trim();
  const projectId = document.getElementById('configProjectId').value.trim();
  const anthropicKey = document.getElementById('configAnthropicKey') ? document.getElementById('configAnthropicKey').value.trim() : '';
  const googleKey = document.getElementById('configGoogleKey') ? document.getElementById('configGoogleKey').value.trim() : '';
  const nvdKey = document.getElementById('configNvdKey') ? document.getElementById('configNvdKey').value.trim() : '';
  const electricityKey = document.getElementById('configElectricityKey') ? document.getElementById('configElectricityKey').value.trim() : '';
  await apiFetch('/api/gitlab/config', { 
    method: 'POST', 
    body: JSON.stringify({ gitlabUrl: url, token, projectId, anthropicKey, googleKey, nvdKey, electricityKey }) 
  });
  closeConfigModal();
  checkGitLabStatus();
}
