/**
 * GitLab API Service — Real API integration
 * Handles all communication with GitLab REST API v4
 */

const axios = require('axios');

class GitLabService {
  constructor() {
    this.baseUrl = (process.env.GITLAB_URL || 'https://gitlab.com').replace(/\/$/, '');
    this.token = process.env.GITLAB_TOKEN;
    this.projectId = process.env.GITLAB_PROJECT_ID;
    this.api = axios.create({
      baseURL: `${this.baseUrl}/api/v4`,
      headers: {
        'PRIVATE-TOKEN': this.token,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  isConfigured() {
    return !!(this.token && this.token !== 'your-gitlab-personal-access-token' && this.projectId && this.projectId !== 'your-project-id');
  }

  // ─── PROJECT INFO ───
  async getProject() {
    if (!this.isConfigured()) throw new Error('GitLab not configured');
    const { data } = await this.api.get(`/projects/${encodeURIComponent(this.projectId)}`);
    return data;
  }

  async getProjectLanguages() {
    if (!this.isConfigured()) throw new Error('GitLab not configured');
    const { data } = await this.api.get(`/projects/${encodeURIComponent(this.projectId)}/languages`);
    return data;
  }

  // ─── REPOSITORY FILES ───
  async getRepositoryTree(path = '', ref = 'main', recursive = true) {
    if (!this.isConfigured()) throw new Error('GitLab not configured');
    const params = { path, ref, recursive, per_page: 100 };
    const { data } = await this.api.get(`/projects/${encodeURIComponent(this.projectId)}/repository/tree`, { params });
    return data;
  }

  async getFileContent(filePath, ref = 'main') {
    if (!this.isConfigured()) throw new Error('GitLab not configured');
    const { data } = await this.api.get(
      `/projects/${encodeURIComponent(this.projectId)}/repository/files/${encodeURIComponent(filePath)}`,
      { params: { ref } }
    );
    return {
      ...data,
      decodedContent: Buffer.from(data.content, 'base64').toString('utf-8')
    };
  }

  async getMultipleFiles(filePaths, ref = 'main') {
    const results = {};
    const promises = filePaths.map(async (fp) => {
      try {
        const file = await this.getFileContent(fp, ref);
        results[fp] = { success: true, content: file.decodedContent, file };
      } catch (err) {
        results[fp] = { success: false, error: err.message };
      }
    });
    await Promise.all(promises);
    return results;
  }

  // ─── BRANCHES ───
  async getBranches() {
    if (!this.isConfigured()) throw new Error('GitLab not configured');
    const { data } = await this.api.get(`/projects/${encodeURIComponent(this.projectId)}/repository/branches`, {
      params: { per_page: 50 }
    });
    return data;
  }

  async createBranch(branchName, ref = 'main') {
    if (!this.isConfigured()) throw new Error('GitLab not configured');
    const { data } = await this.api.post(`/projects/${encodeURIComponent(this.projectId)}/repository/branches`, {
      branch: branchName,
      ref
    });
    return data;
  }

  // ─── COMMITS ───
  async createCommit(branchName, message, actions) {
    if (!this.isConfigured()) throw new Error('GitLab not configured');
    const { data } = await this.api.post(`/projects/${encodeURIComponent(this.projectId)}/repository/commits`, {
      branch: branchName,
      commit_message: message,
      actions
    });
    return data;
  }

  // ─── MERGE REQUESTS ───
  async createMergeRequest(sourceBranch, targetBranch, title, description, labels = []) {
    if (!this.isConfigured()) throw new Error('GitLab not configured');
    const { data } = await this.api.post(`/projects/${encodeURIComponent(this.projectId)}/merge_requests`, {
      source_branch: sourceBranch,
      target_branch: targetBranch,
      title,
      description,
      labels: labels.join(','),
      remove_source_branch: true,
      squash: true
    });
    return data;
  }

  async getMergeRequests(state = 'opened') {
    if (!this.isConfigured()) throw new Error('GitLab not configured');
    const { data } = await this.api.get(`/projects/${encodeURIComponent(this.projectId)}/merge_requests`, {
      params: { state, per_page: 20, order_by: 'updated_at', sort: 'desc' }
    });
    return data;
  }

  async addMergeRequestComment(mrIid, body) {
    if (!this.isConfigured()) throw new Error('GitLab not configured');
    const { data } = await this.api.post(
      `/projects/${encodeURIComponent(this.projectId)}/merge_requests/${mrIid}/notes`,
      { body }
    );
    return data;
  }

  async mergeMergeRequest(mrIid) {
    if (!this.isConfigured()) throw new Error('GitLab not configured');
    const { data } = await this.api.put(
      `/projects/${encodeURIComponent(this.projectId)}/merge_requests/${mrIid}/merge`,
      { should_remove_source_branch: true, squash: true }
    );
    return data;
  }

  // ─── PIPELINES ───
  async getPipelines(status) {
    if (!this.isConfigured()) throw new Error('GitLab not configured');
    const params = { per_page: 10, order_by: 'updated_at', sort: 'desc' };
    if (status) params.status = status;
    const { data } = await this.api.get(`/projects/${encodeURIComponent(this.projectId)}/pipelines`, { params });
    return data;
  }

  async getPipelineJobs(pipelineId) {
    if (!this.isConfigured()) throw new Error('GitLab not configured');
    const { data } = await this.api.get(
      `/projects/${encodeURIComponent(this.projectId)}/pipelines/${pipelineId}/jobs`
    );
    return data;
  }

  // ─── SAST REPORTS ───
  async getVulnerabilities() {
    if (!this.isConfigured()) throw new Error('GitLab not configured');
    try {
      const { data } = await this.api.get(`/projects/${encodeURIComponent(this.projectId)}/vulnerability_findings`, {
        params: { per_page: 100 }
      });
      return data;
    } catch (err) {
      // Fallback: vulnerability_findings may require Ultimate tier
      console.warn('GitLab vulnerability_findings API not available (may require Ultimate tier). Falling back to code scanning.');
      return [];
    }
  }

  // ─── ISSUES ───
  async getIssues(labels, state = 'opened') {
    if (!this.isConfigured()) throw new Error('GitLab not configured');
    const params = { state, per_page: 20, order_by: 'updated_at', sort: 'desc' };
    if (labels) params.labels = labels;
    const { data } = await this.api.get(`/projects/${encodeURIComponent(this.projectId)}/issues`, { params });
    return data;
  }

  async createIssue(title, description, labels = []) {
    if (!this.isConfigured()) throw new Error('GitLab not configured');
    const { data } = await this.api.post(`/projects/${encodeURIComponent(this.projectId)}/issues`, {
      title,
      description,
      labels: labels.join(',')
    });
    return data;
  }
}

module.exports = new GitLabService();
