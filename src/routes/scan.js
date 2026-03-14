/**
 * Scan Routes — Trigger and manage security scans
 */

const express = require('express');
const router = express.Router();
const gitlabService = require('../services/gitlab');
const securityScanner = require('../scanners/security');
const greenOptimizer = require('../scanners/green');
const reportGenerator = require('../services/report');
const cveService = require('../services/cve');
const { runScheduledScan, getScanHistory, getLastScan } = require('../services/scheduler');

// Run full scan (fetches from GitLab)
router.post('/full', async (req, res) => {
  try {
    const result = await runScheduledScan();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Scan provided code directly (no GitLab needed)
router.post('/code', async (req, res) => {
  try {
    const { files } = req.body;
    if (!files || typeof files !== 'object' || Object.keys(files).length === 0) {
      return res.status(400).json({ error: 'Provide files as { "filename": "content", ... }' });
    }

    const securityResults = securityScanner.scanFiles(files);
    const greenResults = greenOptimizer.analyzeAll(files);
    const report = reportGenerator.generateFullReport(securityResults, greenResults);

    // Try CVE lookups for found vulnerabilities
    const cveResults = {};
    const cwes = [...new Set(securityResults.findings.map(f => f.cwe))];
    for (const cwe of cwes.slice(0, 5)) { // Limit to 5 CVE lookups
      try {
        cveResults[cwe] = await cveService.searchByCWE(cwe, 3);
      } catch (e) {
        cveResults[cwe] = [];
      }
    }

    // Enrich findings with CVE data
    securityResults.findings = securityResults.findings.map(f => ({
      ...f,
      relatedCVEs: cveResults[f.cwe] || []
    }));

    res.json({
      security: securityResults,
      green: greenResults,
      report,
      cves: cveResults
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Scan a single file
router.post('/file', async (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename || !content) {
      return res.status(400).json({ error: 'Provide filename and content' });
    }

    const findings = securityScanner.scanFile(filename, content);
    const greenFindings = greenOptimizer.analyzeAll({ [filename]: content });

    res.json({
      filename,
      security: {
        totalVulnerabilities: findings.length,
        findings
      },
      green: greenFindings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get scan rules
router.get('/rules', (req, res) => {
  const rules = securityScanner._buildRules();
  res.json({
    totalRules: rules.length,
    rules: rules.map(r => ({
      id: r.id,
      name: r.name,
      severity: r.severity,
      category: r.category,
      cwe: r.cwe,
      languages: r.languages,
      description: r.description,
      fix: r.fix
    }))
  });
});

// CVE lookup
router.get('/cve/:cweId', async (req, res) => {
  try {
    const results = await cveService.searchByCWE(req.params.cweId);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create MR from last scan
router.post('/create-mr', async (req, res) => {
  try {
    const lastScan = getLastScan();
    if (!lastScan || !lastScan.report) {
      return res.status(400).json({ error: 'No scan results available. Run a scan first.' });
    }

    if (!gitlabService.isConfigured()) {
      return res.status(400).json({ error: 'GitLab not configured' });
    }

    const branchName = `vuln-to-green/fix-${Date.now()}`;
    const title = reportGenerator.generateMRTitle(lastScan.security, lastScan.green);

    await gitlabService.createBranch(branchName);

    const mr = await gitlabService.createMergeRequest(
      branchName, 'main', title, lastScan.report,
      ['vuln-to-green', 'security', 'sustainability']
    );

    await gitlabService.addMergeRequestComment(mr.iid, lastScan.report);

    res.json({
      success: true,
      mergeRequest: {
        iid: mr.iid,
        url: mr.web_url,
        title: mr.title
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
