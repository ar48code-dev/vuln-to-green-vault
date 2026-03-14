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
    console.log('Dashboard load error (may be initial state):', err.message);
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
    // Check if GitLab is configured
    if (!state.gitlabConnected) {
      scanText.textContent = 'GitLab not configured';
      scanSub.textContent = 'Falling back to direct code scan mode...';
      await new Promise(r => setTimeout(r, 1000));
      overlay.classList.remove('active');
      showToast('GitLab not configured. Use "Scan Code Below" to scan code directly, or configure GitLab in Settings.', 'warning');
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

    // Update UI
    showToast(
      `Scan complete! Found ${result.security?.totalVulnerabilities || 0} vulnerabilities and ${result.green?.totalOptimizations || 0} optimizations.`,
      result.security?.totalVulnerabilities > 0 ? 'warning' : 'success'
    );

    // Refresh dashboard
    loadDashboard();

    // Show results
    if (result.security) renderSecurityPage(result.security);
    if (result.green) renderGreenPage(result.green);
    if (result.report) {
      state.lastReport = result.report;
      renderReport(result.report);
    }

    // Update badges
    if (result.security?.totalVulnerabilities > 0) {
      const badge = document.getElementById('securityBadge');
      badge.textContent = result.security.totalVulnerabilities;
      badge.style.display = 'inline';
    }

    if (result.mergeRequest) {
      showToast(`MR created: ${result.mergeRequest.url}`, 'success');
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

    // Show results inline
    const resultsCard = document.getElementById('scanResults');
    const resultsBody = document.getElementById('scanResultsBody');
    resultsCard.style.display = 'block';

    let html = '';

    // Security results
    if (result.security && result.security.findings.length > 0) {
      html += `<h3 style="margin-bottom:12px">🔴 Security Issues (${result.security.totalVulnerabilities})</h3>`;
      html += '<ul class="vuln-list" style="margin-bottom:20px">';
      result.security.findings.forEach(f => {
        html += `
          <li class="vuln-item">
            <span class="vuln-severity-badge ${f.severity.toLowerCase()}">${f.severity}</span>
            <div class="vuln-info">
              <div class="vuln-name">${f.name}</div>
              <div class="vuln-file">${f.file}:${f.line}</div>
              <div class="vuln-desc">${f.description}</div>
              <div class="vuln-fix">💡 Fix: ${f.fix}</div>
              <div class="vuln-cwe">${f.cwe}${f.relatedCVEs && f.relatedCVEs.length > 0 ? ` | Related CVEs: ${f.relatedCVEs.map(c => c.id).join(', ')}` : ''}</div>
            </div>
          </li>`;
      });
      html += '</ul>';
    } else {
      html += '<div style="padding:16px;color:var(--accent-green)">✅ No security vulnerabilities found!</div>';
    }

    // Green results
    if (result.green && result.green.totalOptimizations > 0) {
      html += `<h3 style="margin:20px 0 12px">🌱 Green Optimizations (${result.green.totalOptimizations})</h3>`;

      if (result.green.docker?.length > 0) {
        result.green.docker.forEach(f => {
          html += `<div class="green-item">${renderGreenFinding(f)}</div>`;
        });
      }
      if (result.green.region?.length > 0) {
        result.green.region.forEach(f => {
          html += `<div class="green-item">${renderGreenFinding(f)}</div>`;
        });
      }
      if (result.green.code?.length > 0) {
        result.green.code.forEach(f => {
          html += `<div class="green-item">${renderGreenFinding(f)}</div>`;
        });
      }

      // Impact
      if (result.green.impact) {
        html += renderImpactSection(result.green.impact);
      }
    }

    resultsBody.innerHTML = html;

    // Also update other pages
    if (result.security) renderSecurityPage(result.security);
    if (result.green) renderGreenPage(result.green);
    if (result.report) {
      state.lastReport = result.report;
      renderReport(result.report);
    }

    // Update badges
    if (result.security?.totalVulnerabilities > 0) {
      const badge = document.getElementById('securityBadge');
      badge.textContent = result.security.totalVulnerabilities;
      badge.style.display = 'inline';
    }
    if (result.green?.totalOptimizations > 0) {
      const badge = document.getElementById('greenBadge');
      badge.textContent = result.green.totalOptimizations;
      badge.style.display = 'inline';
    }

    showToast(
      `Found ${result.security?.totalVulnerabilities || 0} vulnerabilities, ${result.green?.totalOptimizations || 0} green optimizations`,
      result.security?.totalVulnerabilities > 0 ? 'warning' : 'success'
    );

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
        <span class="green-before">${finding.current} (${finding.currentSize}MB)</span>
        <span class="green-arrow">→</span>
        <span class="green-after">${finding.recommended} (${finding.recommendedSize}MB)</span>
      </div>
      <div class="green-savings">📦 Save ${finding.sizeSavingMB}MB (${finding.sizeReductionPercent}% smaller)</div>`;
  }
  if (finding.type === 'region') {
    return `
      <div class="green-item-header">
        <span class="green-type-badge region">Region</span>
        <strong>Region Migration</strong>
      </div>
      <div class="green-comparison">
        <span class="green-before">${finding.currentRegion} (${finding.currentCarbon} gCO₂/kWh)</span>
        <span class="green-arrow">→</span>
        <span class="green-after">${finding.recommendedRegion} (${finding.recommendedCarbon} gCO₂/kWh)</span>
      </div>
      <div class="green-savings">🌱 ${finding.carbonReductionPercent}% carbon reduction | ${finding.recommendedName}</div>`;
  }
  if (finding.type === 'docker-pattern') {
    return `
      <div class="green-item-header">
        <span class="green-type-badge docker">Docker</span>
        <strong>${finding.description}</strong>
      </div>
      <div style="font-size:0.82rem;color:var(--text-secondary);margin-top:6px">Line ${finding.line}</div>`;
  }
  if (finding.type === 'code-efficiency') {
    return `
      <div class="green-item-header">
        <span class="green-type-badge code">Code</span>
        <strong>${finding.description}</strong>
      </div>
      <div style="font-size:0.82rem;color:var(--text-muted)">File: ${finding.file}:${finding.line}</div>
      <div class="green-savings">💡 Fix: ${finding.fix} | Est. CPU reduction: ${finding.cpuReduction}%</div>`;
  }
  return `<div>${finding.description || JSON.stringify(finding)}</div>`;
}

// ═══ RENDER IMPACT SECTION ═══
function renderImpactSection(impact) {
  return `
    <div style="margin-top:20px">
      <h4 style="margin-bottom:12px">📊 Environmental Impact</h4>
      <div class="impact-grid">
        <div class="impact-card">
          <div class="impact-icon">💰</div>
          <div class="impact-value">$${impact.costSavingPerMonth}</div>
          <div class="impact-label">Saved/Month</div>
        </div>
        <div class="impact-card">
          <div class="impact-icon">🌱</div>
          <div class="impact-value">${impact.co2SavingKgPerMonth}</div>
          <div class="impact-label">kg CO₂/Month</div>
        </div>
        <div class="impact-card">
          <div class="impact-icon">🌳</div>
          <div class="impact-value">${impact.treesEquivalent}</div>
          <div class="impact-label">Trees/Year</div>
        </div>
        <div class="impact-card">
          <div class="impact-icon">⚡</div>
          <div class="impact-value">${impact.energySavingKwhPerMonth}</div>
          <div class="impact-label">kWh/Month</div>
        </div>
      </div>
    </div>`;
}

// ═══ SECURITY PAGE RENDERER ═══
function renderSecurityPage(securityData) {
  const list = document.getElementById('vulnList');
  const count = document.getElementById('securityCount');

  if (!securityData.findings || securityData.findings.length === 0) {
    list.innerHTML = `
      <li class="vuln-item">
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <div class="empty-state-title">No Vulnerabilities</div>
          <div class="empty-state-desc">Your code is clean! No security issues detected.</div>
        </div>
      </li>`;
    count.textContent = '0 issues';
    return;
  }

  count.textContent = `${securityData.totalVulnerabilities} issues found`;

  list.innerHTML = securityData.findings.map(f => `
    <li class="vuln-item">
      <span class="vuln-severity-badge ${f.severity.toLowerCase()}">${f.severity}</span>
      <div class="vuln-info">
        <div class="vuln-name">${f.name}</div>
        <div class="vuln-file">📂 ${f.file}:${f.line} | col ${f.column}</div>
        <div class="vuln-desc">${f.description}</div>
        <div class="vuln-fix">💡 ${f.fix}</div>
        <div class="vuln-cwe">${f.cwe}${f.relatedCVEs && f.relatedCVEs.length > 0 ?
          ` | CVEs: ${f.relatedCVEs.map(c => `<a href="https://nvd.nist.gov/vuln/detail/${c.id}" target="_blank">${c.id}</a>`).join(', ')}` : ''}</div>
        ${f.lineContent ? `<div style="margin-top:6px;padding:6px 10px;background:var(--bg-primary);border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:0.75rem;color:var(--accent-red);overflow-x:auto;white-space:pre">${escapeHtml(f.lineContent)}</div>` : ''}
      </div>
    </li>`
  ).join('');
}

// ═══ GREEN PAGE RENDERER ═══
function renderGreenPage(greenData) {
  // Stats
  const statsGrid = document.getElementById('greenStatsGrid');
  if (greenData.impact) {
    const i = greenData.impact;
    statsGrid.innerHTML = `
      <div class="stat-card green">
        <div class="stat-header"><span class="stat-label">Optimizations</span><div class="stat-icon">🌱</div></div>
        <div class="stat-value">${greenData.totalOptimizations}</div>
        <div class="stat-change">found in scan</div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-header"><span class="stat-label">CO₂ Saved</span><div class="stat-icon">🌳</div></div>
        <div class="stat-value">${i.co2SavingKgPerMonth}</div>
        <div class="stat-change">kg CO₂/month</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-header"><span class="stat-label">Cost Saved</span><div class="stat-icon">💰</div></div>
        <div class="stat-value">$${i.costSavingPerMonth}</div>
        <div class="stat-change">per month</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-header"><span class="stat-label">Trees</span><div class="stat-icon">🌲</div></div>
        <div class="stat-value">${i.treesEquivalent}</div>
        <div class="stat-change">equivalent/year</div>
      </div>`;
  }

  // Docker
  const dockerList = document.getElementById('dockerOptList');
  if (greenData.docker && greenData.docker.length > 0) {
    dockerList.innerHTML = greenData.docker.map(f => `<div class="green-item">${renderGreenFinding(f)}</div>`).join('');
  }

  // Region
  const regionList = document.getElementById('regionOptList');
  if (greenData.region && greenData.region.length > 0) {
    regionList.innerHTML = greenData.region.map(f => `<div class="green-item">${renderGreenFinding(f)}</div>`).join('');
  }

  // Code
  const codeList = document.getElementById('codeOptList');
  if (greenData.code && greenData.code.length > 0) {
    codeList.innerHTML = greenData.code.map(f => `<div class="green-item">${renderGreenFinding(f)}</div>`).join('');
  }
}

// ═══ REPORT ═══
function renderReport(reportMarkdown) {
  const container = document.getElementById('reportContainer');
  // Simple markdown to HTML
  let html = reportMarkdown
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^\*\*(.*?)\*\*/gm, '<strong>$1</strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/^  - (.*$)/gm, '<li style="margin-left:20px">$1</li>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/^\|(.*)\|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => c.trim().match(/^-+$/))) return '';
      const tag = match.includes('---') ? 'th' : 'td';
      return `<tr>${cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('')}</tr>`;
    });

  // Wrap tables
  html = html.replace(/(<tr>.*<\/tr>\n?)+/g, '<table>$&</table>');

  container.innerHTML = html;
}

async function copyReport() {
  if (!state.lastReport) {
    showToast('No report to copy. Run a scan first.', 'warning');
    return;
  }
  try {
    await navigator.clipboard.writeText(state.lastReport);
    showToast('Report copied to clipboard!', 'success');
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = state.lastReport;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Report copied to clipboard!', 'success');
  }
}

// ═══ CREATE MR ═══
async function createMR() {
  if (!state.gitlabConnected) {
    showToast('GitLab not configured. Set up your connection first.', 'warning');
    openConfigModal();
    return;
  }

  try {
    showToast('Creating merge request...', 'info');
    const result = await apiFetch('/api/scan/create-mr', { method: 'POST' });
    showToast(`MR #${result.mergeRequest.iid} created! ${result.mergeRequest.url}`, 'success');
  } catch (err) {
    showToast(`Failed to create MR: ${err.message}`, 'error');
  }
}

// ═══ HISTORY ═══
async function loadHistory() {
  try {
    const data = await apiFetch('/api/history');
    const tbody = document.getElementById('historyBody');
    const count = document.getElementById('historyCount');

    count.textContent = `${data.total} scans`;

    if (data.scans.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">No scan history yet</td></tr>';
      return;
    }

    tbody.innerHTML = data.scans.map(scan => {
      const duration = scan.startTime && scan.endTime ?
        `${Math.round((new Date(scan.endTime) - new Date(scan.startTime)) / 1000)}s` : '-';
      return `
        <tr>
          <td><code style="font-size:0.75rem">${scan.id}</code></td>
          <td><span class="status-badge ${scan.status}">${scan.status}</span></td>
          <td>${scan.trigger || 'manual'}</td>
          <td style="color:${scan.vulnerabilities > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}">
            ${scan.vulnerabilities}
          </td>
          <td style="color:${scan.optimizations > 0 ? 'var(--accent-yellow)' : 'var(--accent-green)'}">
            ${scan.optimizations}
          </td>
          <td>${duration}</td>
          <td>${new Date(scan.startTime).toLocaleString()}</td>
        </tr>`;
    }).join('');
  } catch (err) {
    console.error('Failed to load history:', err);
  }
}

// ═══ REGIONS ═══
async function loadRegions(forceRefresh = false) {
  try {
    const grid = document.getElementById('regionGrid');
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)"><div class="spinner spinner-lg" style="border-top-color:var(--accent-blue)"></div><p style="margin-top:12px">Fetching live carbon data...</p></div>';
    
    const url = forceRefresh ? '/api/green/regions?refresh=true' : '/api/green/regions';
    const data = await apiFetch(url);
    state.regions = data.regions;
    
    // Show data freshness banner
    const liveCount = data.liveRegions || 0;
    const banner = document.getElementById('regionsBanner');
    if (banner) {
      if (liveCount > 0) {
        banner.innerHTML = `<span style="color:var(--accent-green)">🟢 LIVE</span> — ${liveCount}/${data.totalRegions} regions have real-time data · Updated ${new Date().toLocaleTimeString()} · Sources: ${data.sources?.join(', ') || 'multiple'}`;
        banner.style.background = 'rgba(16,185,129,0.08)';
      } else {
        banner.innerHTML = `<span style="color:var(--accent-yellow)">📅 2024 Baseline</span> — Add <code>ELECTRICITY_MAPS_API_KEY</code> to .env for real-time data · <a href="https://www.electricitymap.org/api" target="_blank">Get free key →</a>`;
        banner.style.background = 'rgba(234,179,8,0.08)';
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
      ? `<span style="font-size:0.6rem;background:rgba(16,185,129,0.15);color:var(--accent-green);padding:2px 6px;border-radius:4px;float:right">🟢 LIVE</span>`
      : `<span style="font-size:0.6rem;background:rgba(234,179,8,0.1);color:var(--accent-yellow);padding:2px 6px;border-radius:4px;float:right">📅 2024</span>`;
    const freshness = r.fetchedAt 
      ? `<div style="font-size:0.6rem;color:var(--text-muted);margin-top:4px">Updated: ${new Date(r.fetchedAt).toLocaleTimeString()}</div>`
      : '';
    return `
      <div class="region-card ${tier}" title="${r.dataSource || ''}">
        <div class="region-name">${r.region} ${liveBadge}</div>
        <div class="region-location">${r.name}</div>
        <div class="region-stats">
          <div class="region-stat">
            <span>CO₂:</span>
            <span class="region-stat-value" style="color:${carbonColor}">${r.carbon}</span>
            <span style="font-size:0.65rem;color:var(--text-muted)">g/kWh</span>
          </div>
          <div class="region-stat">
            <span>♻️</span>
            <span class="region-stat-value" style="color:var(--accent-green)">${r.renewable}%</span>
          </div>
        </div>
        ${freshness}
      </div>`;
  }).join('');
}

// ═══ RULES ═══
async function loadRules() {
  try {
    const data = await apiFetch('/api/scan/rules');
    state.rules = data.rules;
    renderRules(data.rules);
  } catch (err) {
    console.error('Failed to load rules:', err);
  }
}

function renderRules(rules) {
  const list = document.getElementById('rulesList');
  const count = document.getElementById('rulesCount');
  count.textContent = `${rules.length} rules`;

  list.innerHTML = rules.map(r => `
    <li class="vuln-item">
      <span class="vuln-severity-badge ${r.severity.toLowerCase()}">${r.severity}</span>
      <div class="vuln-info">
        <div class="vuln-name">${r.id}: ${r.name}</div>
        <div class="vuln-cwe">${r.cwe} | Languages: ${r.languages.join(', ')}</div>
        <div class="vuln-desc">${r.description}</div>
        <div class="vuln-fix">💡 ${r.fix}</div>
      </div>
    </li>`
  ).join('');
}

// ═══ GITLAB ═══
async function loadGitLabInfo() {
  try {
    const data = await apiFetch('/api/gitlab/status');
    const container = document.getElementById('gitlabInfo');

    if (data.connected) {
      const p = data.project;
      container.innerHTML = `
        <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap">
          <div style="flex:1;min-width:250px">
            <h3 style="margin-bottom:12px">📦 ${p.nameWithNamespace}</h3>
            <div style="display:grid;gap:8px;font-size:0.85rem">
              <div><strong>ID:</strong> <code>${p.id}</code></div>
              <div><strong>URL:</strong> <a href="${p.webUrl}" target="_blank">${p.webUrl}</a></div>
              <div><strong>Default Branch:</strong> ${p.defaultBranch}</div>
              <div><strong>Visibility:</strong> ${p.visibility}</div>
              <div><strong>Last Activity:</strong> ${new Date(p.lastActivity).toLocaleString()}</div>
              <div><strong>⭐ Stars:</strong> ${p.starCount} | <strong>🍴 Forks:</strong> ${p.forksCount}</div>
            </div>
          </div>
          ${data.languages ? `
          <div style="flex:1;min-width:200px">
            <h4 style="margin-bottom:8px">🔤 Languages</h4>
            <div style="display:flex;flex-direction:column;gap:6px">
              ${Object.entries(data.languages).map(([lang, pct]) => `
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-size:0.82rem;width:100px">${lang}</span>
                  <div class="progress-bar" style="flex:1">
                    <div class="progress-fill blue" style="width:${pct}%"></div>
                  </div>
                  <span style="font-size:0.75rem;color:var(--text-muted);width:40px">${pct.toFixed(1)}%</span>
                </div>`).join('')}
            </div>
          </div>` : ''}
        </div>`;

      loadRepoTree();
      loadMergeRequests();
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🦊</div>
          <div class="empty-state-title">GitLab Not Connected</div>
          <div class="empty-state-desc">${data.message || data.error || 'Configure your GitLab token and project ID'}</div>
          <button class="btn btn-primary" onclick="openConfigModal()">Configure GitLab</button>
        </div>`;
    }
  } catch (err) {
    document.getElementById('gitlabInfo').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <div class="empty-state-title">Connection Error</div>
        <div class="empty-state-desc">${err.message}</div>
      </div>`;
  }
}

async function loadRepoTree() {
  try {
    const tree = await apiFetch('/api/gitlab/tree');
    const container = document.getElementById('repoTree');

    if (tree.length === 0) {
      container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Empty repository</div>';
      return;
    }

    const folders = tree.filter(t => t.type === 'tree').sort((a, b) => a.path.localeCompare(b.path));
    const files = tree.filter(t => t.type === 'blob').sort((a, b) => a.path.localeCompare(b.path));

    container.innerHTML = `
      <ul class="file-tree">
        ${folders.slice(0, 30).map(f => `<li class="file-tree-item"><span class="file-icon">📁</span>${f.path}</li>`).join('')}
        ${files.slice(0, 50).map(f => `<li class="file-tree-item"><span class="file-icon">${getFileIcon(f.path)}</span>${f.path}</li>`).join('')}
        ${tree.length > 80 ? `<li class="file-tree-item" style="color:var(--text-muted)">... and ${tree.length - 80} more</li>` : ''}
      </ul>`;
  } catch (err) {
    document.getElementById('repoTree').innerHTML = `<div style="padding:20px;color:var(--text-muted)">${err.message}</div>`;
  }
}

async function loadMergeRequests() {
  try {
    const mrs = await apiFetch('/api/gitlab/merge-requests');
    const container = document.getElementById('mrList');

    if (mrs.length === 0) {
      container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">No open merge requests</div>';
      return;
    }

    container.innerHTML = mrs.map(mr => `
      <div style="padding:12px 16px;border-bottom:1px solid var(--border-default);cursor:pointer" onclick="window.open('${mr.web_url}','_blank')">
        <div style="font-weight:600;font-size:0.85rem">!${mr.iid}: ${mr.title}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">
          ${mr.author?.name || 'Unknown'} • ${new Date(mr.updated_at).toLocaleDateString()}
          ${mr.labels?.length ? `• ${mr.labels.map(l => `<span style="color:var(--accent-purple)">${l}</span>`).join(' ')}` : ''}
        </div>
      </div>`
    ).join('');
  } catch (err) {
    document.getElementById('mrList').innerHTML = `<div style="padding:20px;color:var(--text-muted)">${err.message}</div>`;
  }
}

// ═══ CONFIG MODAL ═══
function openConfigModal() {
  document.getElementById('configModal').classList.add('active');
}

function closeConfigModal() {
  document.getElementById('configModal').classList.remove('active');
}

async function saveConfig() {
  const url = document.getElementById('configGitlabUrl').value.trim();
  const token = document.getElementById('configToken').value.trim();
  const projectId = document.getElementById('configProjectId').value.trim();

  if (!token) {
    showToast('GitLab token is required', 'warning');
    return;
  }
  if (!projectId) {
    showToast('Project ID is required', 'warning');
    return;
  }

  try {
    await apiFetch('/api/gitlab/config', {
      method: 'POST',
      body: JSON.stringify({
        gitlabUrl: url || 'https://gitlab.com',
        token,
        projectId
      })
    });

    closeConfigModal();
    showToast('GitLab configuration saved!', 'success');

    // Re-check connection
    await checkGitLabStatus();
    if (state.currentPage === 'gitlab') loadGitLabInfo();
  } catch (err) {
    showToast(`Failed to save config: ${err.message}`, 'error');
  }
}

// ═══ TOAST NOTIFICATIONS ═══
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;

  container.appendChild(toast);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100px)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

// ═══ UTILITIES ═══
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getFileIcon(path) {
  const ext = path.split('.').pop().toLowerCase();
  const icons = {
    js: '📜', ts: '📘', py: '🐍', rb: '💎', php: '🐘', java: '☕', go: '🔷',
    rs: '🦀', yml: '📋', yaml: '📋', json: '📦', md: '📝', html: '🌐',
    css: '🎨', dockerfile: '🐳', tf: '🏗️', sh: '🐚', sql: '🗄️',
    env: '🔐', lock: '🔒', gitignore: '👁️'
  };
  return icons[ext] || '📄';
}

// Close modal on overlay click
document.getElementById('configModal')?.addEventListener('click', function(e) {
  if (e.target === this) closeConfigModal();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeConfigModal();
  if (e.ctrlKey && e.key === 'Enter' && state.currentPage === 'scan') scanDirectCode();
});
