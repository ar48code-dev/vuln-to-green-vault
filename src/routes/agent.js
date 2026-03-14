/**
 * Agent Routes — Exposing AI tools to the frontend and judges
 */

const express = require('express');
const router = express.Router();
const { handleToolCall } = require('../index');
const fs = require('fs');
const path = require('path');

// Get the tool definitions (for the AI to know what it can do)
router.get('/tools', (req, res) => {
  try {
    const toolsPath = path.join(__dirname, '../agent/tools/gitlab_tools.json');
    if (fs.existsSync(toolsPath)) {
      const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
      res.json(tools);
    } else {
      res.status(404).json({ error: 'Tool definitions not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Execute a tool call (this is what the AI triggers)
router.post('/call', async (req, res) => {
  try {
    const { toolName, arguments: args } = req.body;
    if (!toolName) return res.status(400).json({ error: 'toolName is required' });

    const result = await handleToolCall(toolName, args || {});
    res.json({ success: true, result });
  } catch (err) {
    console.error(`Tool call [${req.body.toolName}] failed:`, err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      hint: 'Ensure your GitLab token and Google Cloud Project are configured.'
    });
  }
});

module.exports = router;
