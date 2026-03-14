/**
 * GitLab API Routes
 */

const express = require('express');
const router = express.Router();
const gitlabService = require('../services/gitlab');

// Check GitLab connection
router.get('/status', async (req, res) => {
  try {
    if (!gitlabService.isConfigured()) {
      return res.json({
        connected: false,
        message: 'GitLab not configured. Set GITLAB_TOKEN and GITLAB_PROJECT_ID in .env file.',
        configuredUrl: process.env.GITLAB_URL || 'https://gitlab.com',
        hasToken: !!process.env.GITLAB_TOKEN && process.env.GITLAB_TOKEN !== 'your-gitlab-personal-access-token',
        hasProjectId: !!process.env.GITLAB_PROJECT_ID && process.env.GITLAB_PROJECT_ID !== 'your-project-id'
      });
    }

    const project = await gitlabService.getProject();
    const languages = await gitlabService.getProjectLanguages();

    res.json({
      connected: true,
      project: {
        id: project.id,
        name: project.name,
        nameWithNamespace: project.name_with_namespace,
        webUrl: project.web_url,
        defaultBranch: project.default_branch,
        visibility: project.visibility,
        lastActivity: project.last_activity_at,
        createdAt: project.created_at,
        avatarUrl: project.avatar_url,
        starCount: project.star_count,
        forksCount: project.forks_count
      },
      languages
    });
  } catch (err) {
    res.status(500).json({
      connected: false,
      error: err.message,
      hint: err.response?.status === 401 ? 'Invalid GitLab token. Check your GITLAB_TOKEN.' :
            err.response?.status === 404 ? 'Project not found. Check your GITLAB_PROJECT_ID.' :
            'Check your GitLab URL and network connection.'
    });
  }
});

// Get project info
router.get('/project', async (req, res) => {
  try {
    const project = await gitlabService.getProject();
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get repository tree
router.get('/tree', async (req, res) => {
  try {
    const { path = '', ref = 'main' } = req.query;
    const tree = await gitlabService.getRepositoryTree(path, ref);
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get file content
router.get('/file', async (req, res) => {
  try {
    const { path, ref = 'main' } = req.query;
    if (!path) return res.status(400).json({ error: 'path query parameter required' });
    const file = await gitlabService.getFileContent(path, ref);
    res.json(file);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get branches
router.get('/branches', async (req, res) => {
  try {
    const branches = await gitlabService.getBranches();
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get merge requests
router.get('/merge-requests', async (req, res) => {
  try {
    const { state = 'opened' } = req.query;
    const mrs = await gitlabService.getMergeRequests(state);
    res.json(mrs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get pipelines
router.get('/pipelines', async (req, res) => {
  try {
    const { status } = req.query;
    const pipelines = await gitlabService.getPipelines(status);
    res.json(pipelines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get vulnerability findings
router.get('/vulnerabilities', async (req, res) => {
  try {
    const vulns = await gitlabService.getVulnerabilities();
    res.json(vulns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update GitLab config (dynamically reinitialize the singleton)
router.post('/config', (req, res) => {
  const { gitlabUrl, token, projectId } = req.body;

  if (gitlabUrl) process.env.GITLAB_URL = gitlabUrl;
  if (token) process.env.GITLAB_TOKEN = token;
  if (projectId) process.env.GITLAB_PROJECT_ID = projectId;

  // Reinitialize the axios client and credentials on the singleton
  const axios = require('axios');
  const svc = require('../services/gitlab');
  svc.baseUrl = (process.env.GITLAB_URL || 'https://gitlab.com').replace(/\/$/, '');
  svc.token = process.env.GITLAB_TOKEN;
  svc.projectId = process.env.GITLAB_PROJECT_ID;
  svc.api = axios.create({
    baseURL: `${svc.baseUrl}/api/v4`,
    headers: {
      'PRIVATE-TOKEN': svc.token,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  const configured = svc.isConfigured();
  res.json({
    message: 'GitLab configuration updated',
    configured,
    gitlabUrl: svc.baseUrl,
    hasToken: !!svc.token && svc.token !== 'your-gitlab-personal-access-token',
    hasProjectId: !!svc.projectId && svc.projectId !== 'your-project-id'
  });
});

module.exports = router;
