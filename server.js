/**
 * Vuln-to-Green Vault — Main Server
 * An autonomous AI agent for security vulnerability detection + green optimization
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cron = require('node-cron');

const apiRoutes = require('./src/routes/api');
const gitlabRoutes = require('./src/routes/gitlab');
const scanRoutes = require('./src/routes/scan');
const greenRoutes = require('./src/routes/green');
const agentRoutes = require('./src/routes/agent');
const { runScheduledScan } = require('./src/services/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/gitlab', gitlabRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/green', greenRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api', apiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'Vuln-to-Green Vault',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    gitlabConfigured: !!process.env.GITLAB_TOKEN && process.env.GITLAB_TOKEN !== 'your-gitlab-personal-access-token',
    uptime: process.uptime()
  });
});

// SPA fallback
app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API endpoint not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Scheduled scan (every Monday at 2 AM UTC by default)
const cronSchedule = process.env.SCAN_CRON || '0 2 * * 1';
if (cron.validate(cronSchedule)) {
  cron.schedule(cronSchedule, async () => {
    console.log('🔄 Running scheduled Vuln-to-Green scan...');
    try {
      await runScheduledScan();
      console.log('✅ Scheduled scan completed');
    } catch (err) {
      console.error('❌ Scheduled scan failed:', err.message);
    }
  });
  console.log(`⏰ Scheduled scan configured: ${cronSchedule}`);
}

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n🛡️🌱 Vuln-to-Green Vault running on ${url}`);
  console.log(`   GitLab: ${process.env.GITLAB_URL || 'https://gitlab.com'}`);
  console.log(`   Project ID: ${process.env.GITLAB_PROJECT_ID || 'Not configured'}`);
  console.log(`   GitLab Token: ${process.env.GITLAB_TOKEN && process.env.GITLAB_TOKEN !== 'your-gitlab-personal-access-token' ? '✅ Configured' : '❌ Not configured'}\n`);

  // Auto-open browser
  if (process.env.NODE_ENV !== 'test') {
    const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    require('child_process').exec(`${start} ${url}`, (err) => {
      if (err) console.log(`👉 Please open ${url} in your browser`);
    });
  }
});

module.exports = app;
