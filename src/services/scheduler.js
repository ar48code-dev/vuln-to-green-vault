/**
 * Scheduler Service — Handles automated scan scheduling
 */

const gitlabService = require('./gitlab');
const securityScanner = require('../scanners/security');
const greenOptimizer = require('../scanners/green');
const reportGenerator = require('./report');

// In-memory scan history
const scanHistory = [];

async function runScheduledScan() {
  console.log('🔄 Starting scheduled Vuln-to-Green scan...');

  const scanResult = {
    id: `scan-${Date.now()}`,
    startTime: new Date().toISOString(),
    trigger: 'scheduled',
    status: 'running',
    security: null,
    green: null,
    error: null
  };

  try {
    if (!gitlabService.isConfigured()) {
      throw new Error('GitLab not configured. Set GITLAB_TOKEN and GITLAB_PROJECT_ID in .env');
    }

    // 1. Fetch repository tree
    console.log('  📂 Fetching repository files...');
    const tree = await gitlabService.getRepositoryTree();

    // 2. Identify scannable files
    const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'php', 'java', 'go', 'rs', 'cs'];
    const configFiles = ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', '.gitlab-ci.yml'];
    const infraExtensions = ['tf', 'hcl', 'yml', 'yaml'];

    const codeFiles = tree.filter(f => f.type === 'blob' && codeExtensions.some(ext => f.path.endsWith(`.${ext}`)));
    const infraFiles = tree.filter(f => f.type === 'blob' && (
      configFiles.some(cf => f.path.endsWith(cf)) ||
      infraExtensions.some(ext => f.path.endsWith(`.${ext}`))
    ));

    // 3. Fetch file contents (limit to avoid rate limiting)
    const filesToScan = [...codeFiles.slice(0, 50), ...infraFiles.slice(0, 20)];
    console.log(`  📄 Fetching ${filesToScan.length} files...`);

    const fileContents = await gitlabService.getMultipleFiles(filesToScan.map(f => f.path));

    const securityFiles = {};
    const greenFiles = {};

    for (const [path, result] of Object.entries(fileContents)) {
      if (result.success) {
        securityFiles[path] = result.content;
        greenFiles[path] = result.content;
      }
    }

    // 4. Run security scan
    console.log('  🔒 Running security scan...');
    scanResult.security = securityScanner.scanFiles(securityFiles);

    // 5. Run green optimization scan
    console.log('  🌱 Running green optimization scan...');
    scanResult.green = greenOptimizer.analyzeAll(greenFiles);

    // 6. Generate report
    const report = reportGenerator.generateFullReport(scanResult.security, scanResult.green);

    // 7. Create MR if there are findings
    if (scanResult.security.totalVulnerabilities > 0 || scanResult.green.totalOptimizations > 0) {
      try {
        const branchName = `vuln-to-green/scan-${Date.now()}`;
        const title = reportGenerator.generateMRTitle(scanResult.security, scanResult.green);

        // Create branch
        await gitlabService.createBranch(branchName);

        // Create MR
        const mr = await gitlabService.createMergeRequest(
          branchName, 'main', title, report,
          ['vuln-to-green', 'security', 'sustainability']
        );

        // Add detailed comment
        await gitlabService.addMergeRequestComment(mr.iid, report);

        scanResult.mergeRequest = {
          iid: mr.iid,
          url: mr.web_url,
          title: mr.title
        };

        console.log(`  📝 Created MR #${mr.iid}: ${mr.web_url}`);
      } catch (mrErr) {
        console.warn(`  ⚠️ Could not create MR: ${mrErr.message}`);
        scanResult.mrError = mrErr.message;
      }
    }

    scanResult.status = 'completed';
    scanResult.endTime = new Date().toISOString();
    scanResult.report = report;

    console.log(`✅ Scan completed. Found ${scanResult.security.totalVulnerabilities} vulnerabilities, ${scanResult.green.totalOptimizations} optimizations.`);
  } catch (err) {
    scanResult.status = 'failed';
    scanResult.error = err.message;
    scanResult.endTime = new Date().toISOString();
    console.error(`❌ Scan failed: ${err.message}`);
  }

  scanHistory.unshift(scanResult);
  if (scanHistory.length > 50) scanHistory.pop();

  return scanResult;
}

function getScanHistory() {
  return scanHistory;
}

function getLastScan() {
  return scanHistory[0] || null;
}

module.exports = { runScheduledScan, getScanHistory, getLastScan };
