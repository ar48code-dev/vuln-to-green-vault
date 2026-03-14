/**
 * Main API Routes
 */

const express = require('express');
const router = express.Router();
const { getScanHistory, getLastScan } = require('../services/scheduler');

// Dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const lastScan = getLastScan();
    const history = getScanHistory();

    res.json({
      status: 'ok',
      lastScan: lastScan ? {
        id: lastScan.id,
        status: lastScan.status,
        startTime: lastScan.startTime,
        endTime: lastScan.endTime,
        trigger: lastScan.trigger,
        security: lastScan.security ? {
          totalVulnerabilities: lastScan.security.totalVulnerabilities,
          summary: lastScan.security.summary,
          scannedFiles: lastScan.security.scannedFiles
        } : null,
        green: lastScan.green ? {
          totalOptimizations: lastScan.green.totalOptimizations,
          impact: lastScan.green.impact,
          scannedFiles: lastScan.green.scannedFiles
        } : null,
        mergeRequest: lastScan.mergeRequest || null,
        error: lastScan.error
      } : null,
      scanCount: history.length,
      recentScans: history.slice(0, 10).map(s => ({
        id: s.id,
        status: s.status,
        startTime: s.startTime,
        trigger: s.trigger,
        vulnerabilities: s.security?.totalVulnerabilities || 0,
        optimizations: s.green?.totalOptimizations || 0
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get scan history
router.get('/history', (req, res) => {
  const history = getScanHistory();
  res.json({
    total: history.length,
    scans: history.map(s => ({
      id: s.id,
      status: s.status,
      startTime: s.startTime,
      endTime: s.endTime,
      trigger: s.trigger,
      vulnerabilities: s.security?.totalVulnerabilities || 0,
      optimizations: s.green?.totalOptimizations || 0,
      mergeRequest: s.mergeRequest || null,
      error: s.error
    }))
  });
});

// Get specific scan details
router.get('/scan/:scanId', (req, res) => {
  const history = getScanHistory();
  const scan = history.find(s => s.id === req.params.scanId);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  res.json(scan);
});

// Get last report
router.get('/report', (req, res) => {
  const lastScan = getLastScan();
  if (!lastScan || !lastScan.report) {
    return res.status(404).json({ error: 'No report available. Run a scan first.' });
  }
  res.json({ report: lastScan.report, scan: lastScan });
});

module.exports = router;
