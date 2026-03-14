/**
 * Green Routes — Carbon footprint and sustainability endpoints
 */

const express = require('express');
const router = express.Router();
const liveCarbonService = require('../services/liveCarbon');
const greenOptimizer = require('../scanners/green');

// Get all green GCP regions ranked by carbon intensity
router.get('/regions', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const data = await liveCarbonService.getAllRegions(forceRefresh);
    
    res.json({
      ...data,
      greenest: data.regions.slice(0, 5),
      dirtiest: data.regions.slice(-5).reverse()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analyze a Dockerfile
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

// Analyze region config
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

// Calculate carbon impact
router.post('/impact', (req, res) => {
  try {
    const { findings } = req.body;
    if (!findings || !Array.isArray(findings)) {
      return res.status(400).json({ error: 'Provide findings array' });
    }

    const impact = greenOptimizer.calculateCarbonImpact(findings);
    res.json(impact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Compare two regions
router.get('/compare', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Provide from and to region query params' });

  const regions = greenOptimizer.gcpRegions;
  const fromInfo = regions[from];
  const toInfo = regions[to];

  if (!fromInfo) return res.status(404).json({ error: `Region ${from} not found` });
  if (!toInfo) return res.status(404).json({ error: `Region ${to} not found` });

  const carbonDiff = fromInfo.carbon - toInfo.carbon;
  const avgMonthlyKwh = 100;
  const monthlySavingKg = (carbonDiff * avgMonthlyKwh) / 1000;

  res.json({
    from: { region: from, ...fromInfo },
    to: { region: to, ...toInfo },
    carbonDifference: carbonDiff,
    carbonReductionPercent: Math.round((carbonDiff / fromInfo.carbon) * 100),
    monthlySavingKg: Math.round(monthlySavingKg * 100) / 100,
    yearlySavingKg: Math.round(monthlySavingKg * 12 * 100) / 100,
    treesEquivalent: Math.round((monthlySavingKg * 12) / 22 * 10) / 10,
    isGreener: carbonDiff > 0
  });
});

module.exports = router;
