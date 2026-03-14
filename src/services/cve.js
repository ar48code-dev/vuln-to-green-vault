/**
 * CVE Lookup Service — Real NVD (National Vulnerability Database) integration
 */

const axios = require('axios');

class CVEService {
  constructor() {
    this.baseUrl = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
    this.apiKey = process.env.NVD_API_KEY;
    this.cache = new Map();
  }

  /**
   * Search for CVEs related to a CWE
   */
  async searchByCWE(cweId, maxResults = 5) {
    const cacheKey = `cwe-${cweId}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    try {
      const params = {
        cweId: cweId,
        resultsPerPage: maxResults
      };
      const headers = {};
      if (this.apiKey) {
        headers['apiKey'] = this.apiKey;
      }

      const { data } = await axios.get(this.baseUrl, {
        params,
        headers,
        timeout: 15000
      });

      const results = (data.vulnerabilities || []).map(v => ({
        id: v.cve.id,
        description: v.cve.descriptions?.find(d => d.lang === 'en')?.value || 'No description',
        severity: this._extractSeverity(v.cve),
        score: this._extractScore(v.cve),
        published: v.cve.published,
        references: (v.cve.references || []).slice(0, 3).map(r => r.url)
      }));

      this.cache.set(cacheKey, results);
      return results;
    } catch (err) {
      console.warn(`CVE lookup failed for ${cweId}: ${err.message}`);
      return [];
    }
  }

  /**
   * Search for CVEs by keyword
   */
  async searchByKeyword(keyword, maxResults = 5) {
    const cacheKey = `kw-${keyword}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    try {
      const params = {
        keywordSearch: keyword,
        resultsPerPage: maxResults
      };
      const headers = {};
      if (this.apiKey) headers['apiKey'] = this.apiKey;

      const { data } = await axios.get(this.baseUrl, {
        params,
        headers,
        timeout: 15000
      });

      const results = (data.vulnerabilities || []).map(v => ({
        id: v.cve.id,
        description: v.cve.descriptions?.find(d => d.lang === 'en')?.value || 'No description',
        severity: this._extractSeverity(v.cve),
        score: this._extractScore(v.cve),
        published: v.cve.published,
        references: (v.cve.references || []).slice(0, 3).map(r => r.url)
      }));

      this.cache.set(cacheKey, results);
      return results;
    } catch (err) {
      console.warn(`CVE keyword search failed for "${keyword}": ${err.message}`);
      return [];
    }
  }

  _extractSeverity(cve) {
    const metrics = cve.metrics || {};
    if (metrics.cvssMetricV31?.length) return metrics.cvssMetricV31[0].cvssData.baseSeverity;
    if (metrics.cvssMetricV30?.length) return metrics.cvssMetricV30[0].cvssData.baseSeverity;
    if (metrics.cvssMetricV2?.length) return metrics.cvssMetricV2[0].baseSeverity;
    return 'UNKNOWN';
  }

  _extractScore(cve) {
    const metrics = cve.metrics || {};
    if (metrics.cvssMetricV31?.length) return metrics.cvssMetricV31[0].cvssData.baseScore;
    if (metrics.cvssMetricV30?.length) return metrics.cvssMetricV30[0].cvssData.baseScore;
    if (metrics.cvssMetricV2?.length) return metrics.cvssMetricV2[0].cvssData.baseScore;
    return null;
  }
}

module.exports = new CVEService();
