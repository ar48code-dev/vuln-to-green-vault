// FILE: src/routes/green.js
const express = require('express');
const router = express.Router();
const liveCarbon = require('../services/live-carbon');
const greenOptimizer = require('../scanners/green');

router.get('/regions', async (req, res) => {
  try {
    if (req.query.refresh === 'true') {
      liveCarbon.clearCache();
    }
    const data = await liveCarbon.getAllRegionsLive();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/regions/:regionId', async (req, res) => {
  try {
    const data = await liveCarbon.getCarbonForRegion(req.params.regionId);
    if (!data) return res.status(404).json({ error: 'Region not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sources', (req, res) => {
  res.json(liveCarbon.getSourceStatus());
});

router.get('/cache', (req, res) => {
  res.json(liveCarbon.getCacheStatus());
});

router.post('/cache/clear', (req, res) => {
  liveCarbon.clearCache();
  res.json({ success: true, message: 'Cache cleared' });
});

router.get('/compare', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'Provide from and to region query params' });

    const [fromData, toData] = await Promise.all([
      liveCarbon.getCarbonForRegion(from),
      liveCarbon.getCarbonForRegion(to)
    ]);

    if (!fromData) return res.status(404).json({ error: `Region ${from} not found` });
    if (!toData) return res.status(404).json({ error: `Region ${to} not found` });

    const carbonDiff = fromData.carbon - toData.carbon;
    const avgMonthlyKwh = 100;
    const savingsKg = (carbonDiff * avgMonthlyKwh) / 1000;
    const treesEquivalent = Math.round((savingsKg * 12) / 22 * 10) / 10;

    res.json({
      from: { region: from, carbon: fromData.carbon, name: fromData.regionName },
      to: { region: to, carbon: toData.carbon, name: toData.regionName },
      carbonDiff,
      savingsKg: Math.round(savingsKg * 100) / 100,
      treesEquivalent,
      isGreener: carbonDiff > 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/docker', (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Provide Dockerfile content' });
    const findings = greenOptimizer.analyzeDockerfile(content);
    res.json({ totalFindings: findings.length, findings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/region', (req, res) => {
  try {
    const { content, filename = 'config.yml' } = req.body;
    if (!content) return res.status(400).json({ error: 'Provide config content' });
    const findings = greenOptimizer.analyzeRegion(content, filename);
    res.json({ totalFindings: findings.length, findings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/impact', (req, res) => {
  try {
    const { findings } = req.body;
    if (!findings || !Array.isArray(findings)) return res.status(400).json({ error: 'Provide findings array' });
    const impact = greenOptimizer.calculateCarbonImpact(findings);
    res.json(impact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
