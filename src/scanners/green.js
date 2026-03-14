/**
 * Green Optimizer — Real carbon footprint analysis
 * Uses actual GCP region carbon data and Docker image analysis
 */

const yaml = require('js-yaml');

class GreenOptimizer {
  constructor() {
    // Real GCP region carbon intensity data (gCO2eq/kWh)
    // Source: Google Cloud Carbon Footprint methodology & electricity maps
    this.gcpRegions = {
      'us-central1':        { carbon: 494, renewable: 32, name: 'Iowa, USA', cost_factor: 1.0 },
      'us-east1':           { carbon: 479, renewable: 18, name: 'South Carolina, USA', cost_factor: 1.0 },
      'us-east4':           { carbon: 379, renewable: 10, name: 'Northern Virginia, USA', cost_factor: 1.1 },
      'us-west1':           { carbon: 78,  renewable: 89, name: 'Oregon, USA', cost_factor: 1.0 },
      'us-west2':           { carbon: 240, renewable: 33, name: 'Los Angeles, USA', cost_factor: 1.1 },
      'us-west3':           { carbon: 564, renewable: 12, name: 'Salt Lake City, USA', cost_factor: 1.1 },
      'us-west4':           { carbon: 469, renewable: 25, name: 'Las Vegas, USA', cost_factor: 1.0 },
      'us-south1':          { carbon: 431, renewable: 20, name: 'Dallas, USA', cost_factor: 1.0 },
      'northamerica-northeast1': { carbon: 25, renewable: 98, name: 'Montréal, Canada', cost_factor: 1.0 },
      'northamerica-northeast2': { carbon: 35, renewable: 95, name: 'Toronto, Canada', cost_factor: 1.0 },
      'southamerica-east1': { carbon: 92,  renewable: 83, name: 'São Paulo, Brazil', cost_factor: 1.2 },
      'europe-west1':       { carbon: 186, renewable: 42, name: 'Belgium', cost_factor: 1.1 },
      'europe-west2':       { carbon: 257, renewable: 35, name: 'London, UK', cost_factor: 1.2 },
      'europe-west3':       { carbon: 338, renewable: 42, name: 'Frankfurt, Germany', cost_factor: 1.2 },
      'europe-west4':       { carbon: 410, renewable: 17, name: 'Netherlands', cost_factor: 1.1 },
      'europe-west6':       { carbon: 29,  renewable: 97, name: 'Zürich, Switzerland', cost_factor: 1.4 },
      'europe-west8':       { carbon: 282, renewable: 30, name: 'Milan, Italy', cost_factor: 1.2 },
      'europe-west9':       { carbon: 55,  renewable: 92, name: 'Paris, France', cost_factor: 1.2 },
      'europe-north1':      { carbon: 28,  renewable: 97, name: 'Finland', cost_factor: 1.1 },
      'europe-central2':    { carbon: 614, renewable: 15, name: 'Warsaw, Poland', cost_factor: 1.0 },
      'asia-east1':         { carbon: 541, renewable: 6,  name: 'Taiwan', cost_factor: 1.0 },
      'asia-east2':         { carbon: 453, renewable: 8,  name: 'Hong Kong', cost_factor: 1.2 },
      'asia-northeast1':    { carbon: 506, renewable: 15, name: 'Tokyo, Japan', cost_factor: 1.2 },
      'asia-northeast2':    { carbon: 401, renewable: 12, name: 'Osaka, Japan', cost_factor: 1.2 },
      'asia-northeast3':    { carbon: 450, renewable: 5,  name: 'Seoul, South Korea', cost_factor: 1.1 },
      'asia-south1':        { carbon: 708, renewable: 12, name: 'Mumbai, India', cost_factor: 0.8 },
      'asia-south2':        { carbon: 672, renewable: 10, name: 'Delhi, India', cost_factor: 0.8 },
      'asia-southeast1':    { carbon: 408, renewable: 5,  name: 'Singapore', cost_factor: 1.1 },
      'asia-southeast2':    { carbon: 580, renewable: 12, name: 'Jakarta, Indonesia', cost_factor: 0.9 },
      'australia-southeast1': { carbon: 550, renewable: 18, name: 'Sydney, Australia', cost_factor: 1.2 },
      'australia-southeast2': { carbon: 96,  renewable: 80, name: 'Melbourne, Australia', cost_factor: 1.2 },
      'me-west1':           { carbon: 600, renewable: 5,  name: 'Tel Aviv, Israel', cost_factor: 1.2 },
      'me-central1':        { carbon: 550, renewable: 3,  name: 'Doha, Qatar', cost_factor: 1.1 }
    };

    // Docker base image sizes (realistic MB values)
    this.dockerImages = {
      'ubuntu': { size: 72, efficient: false },
      'ubuntu:latest': { size: 72, efficient: false },
      'ubuntu:22.04': { size: 72, efficient: false },
      'ubuntu:20.04': { size: 72, efficient: false },
      'debian': { size: 124, efficient: false },
      'debian:bullseye': { size: 124, efficient: false },
      'debian:bookworm': { size: 138, efficient: false },
      'debian:bookworm-slim': { size: 74, efficient: true },
      'debian:bullseye-slim': { size: 80, efficient: true },
      'node': { size: 910, efficient: false },
      'node:18': { size: 910, efficient: false },
      'node:20': { size: 1030, efficient: false },
      'node:18-slim': { size: 180, efficient: true },
      'node:20-slim': { size: 195, efficient: true },
      'node:18-alpine': { size: 115, efficient: true },
      'node:20-alpine': { size: 126, efficient: true },
      'python': { size: 920, efficient: false },
      'python:3.11': { size: 920, efficient: false },
      'python:3.12': { size: 980, efficient: false },
      'python:3.11-slim': { size: 130, efficient: true },
      'python:3.12-slim': { size: 138, efficient: true },
      'python:3.11-alpine': { size: 52, efficient: true },
      'python:3.12-alpine': { size: 55, efficient: true },
      'golang': { size: 795, efficient: false },
      'golang:1.21': { size: 795, efficient: false },
      'golang:1.21-alpine': { size: 250, efficient: true },
      'ruby': { size: 850, efficient: false },
      'ruby:3.2': { size: 850, efficient: false },
      'ruby:3.2-slim': { size: 185, efficient: true },
      'ruby:3.2-alpine': { size: 70, efficient: true },
      'openjdk': { size: 470, efficient: false },
      'openjdk:17': { size: 470, efficient: false },
      'eclipse-temurin:17-jdk': { size: 365, efficient: false },
      'eclipse-temurin:17-jre-alpine': { size: 145, efficient: true },
      'nginx': { size: 142, efficient: false },
      'nginx:alpine': { size: 23, efficient: true },
      'alpine': { size: 7, efficient: true },
      'busybox': { size: 4, efficient: true },
      'scratch': { size: 0, efficient: true },
      'distroless': { size: 20, efficient: true },
      'gcr.io/distroless/base': { size: 20, efficient: true },
      'gcr.io/distroless/base-debian12': { size: 22, efficient: true }
    };

    // Efficient alternatives
    this.imageAlternatives = {
      'ubuntu': 'debian:bookworm-slim',
      'ubuntu:latest': 'debian:bookworm-slim',
      'ubuntu:22.04': 'debian:bookworm-slim',
      'ubuntu:20.04': 'debian:bullseye-slim',
      'debian': 'debian:bookworm-slim',
      'debian:bullseye': 'debian:bullseye-slim',
      'debian:bookworm': 'debian:bookworm-slim',
      'node': 'node:20-alpine',
      'node:18': 'node:18-alpine',
      'node:20': 'node:20-alpine',
      'node:18-slim': 'node:18-alpine',
      'node:20-slim': 'node:20-alpine',
      'python': 'python:3.12-slim',
      'python:3.11': 'python:3.11-slim',
      'python:3.12': 'python:3.12-slim',
      'golang': 'golang:1.21-alpine',
      'golang:1.21': 'golang:1.21-alpine',
      'ruby': 'ruby:3.2-alpine',
      'ruby:3.2': 'ruby:3.2-alpine',
      'openjdk': 'eclipse-temurin:17-jre-alpine',
      'openjdk:17': 'eclipse-temurin:17-jre-alpine',
      'nginx': 'nginx:alpine'
    };
  }

  /**
   * Analyze Dockerfile content for green optimizations
   */
  analyzeDockerfile(content) {
    const findings = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check FROM instruction for base image
      const fromMatch = line.match(/^FROM\s+(\S+)/i);
      if (fromMatch) {
        const image = fromMatch[1].toLowerCase();
        const baseImage = image.split('@')[0]; // Remove digest
        const currentInfo = this._findImageInfo(baseImage);
        const alternative = this.imageAlternatives[baseImage];

        if (alternative && currentInfo && !currentInfo.efficient) {
          const altInfo = this.dockerImages[alternative];
          const sizeSaving = currentInfo.size - (altInfo ? altInfo.size : 0);
          findings.push({
            type: 'docker-image',
            severity: sizeSaving > 500 ? 'HIGH' : sizeSaving > 100 ? 'MEDIUM' : 'LOW',
            line: i + 1,
            current: baseImage,
            recommended: alternative,
            currentSize: currentInfo.size,
            recommendedSize: altInfo ? altInfo.size : 0,
            sizeSavingMB: sizeSaving,
            sizeReductionPercent: Math.round((sizeSaving / currentInfo.size) * 100),
            description: `Replace ${baseImage} (${currentInfo.size}MB) with ${alternative} (${altInfo ? altInfo.size : 0}MB) — save ${sizeSaving}MB (${Math.round((sizeSaving / currentInfo.size) * 100)}% smaller)`
          });
        }
      }

      // Check for inefficient patterns
      if (/^RUN\s+apt-get\s+install/i.test(line) && !/--no-install-recommends/.test(line)) {
        findings.push({
          type: 'docker-pattern',
          severity: 'LOW',
          line: i + 1,
          description: 'Add --no-install-recommends to apt-get install to reduce image size',
          current: line,
          recommended: line.replace('apt-get install', 'apt-get install --no-install-recommends')
        });
      }

      if (/^RUN\s+apt-get\s+install/i.test(line) && !/&&\s*(?:rm\s+-rf|apt-get\s+clean)/.test(content)) {
        findings.push({
          type: 'docker-pattern',
          severity: 'LOW',
          line: i + 1,
          description: 'Clean up apt cache in the same RUN layer to reduce image size',
          current: line,
          recommended: `${line} && apt-get clean && rm -rf /var/lib/apt/lists/*`
        });
      }

      // Check for COPY before dependency install (cache invalidation)
      if (/^COPY\s+\.\s/.test(line) && i < lines.length - 1) {
        const nextLines = lines.slice(i + 1).join('\n');
        if (/RUN\s+(?:npm|pip|bundle|yarn)\s+install/i.test(nextLines)) {
          findings.push({
            type: 'docker-pattern',
            severity: 'MEDIUM',
            line: i + 1,
            description: 'Copy dependency files first, then install, then copy rest — improves Docker layer caching',
            current: 'COPY . .',
            recommended: 'COPY package*.json ./ (then RUN npm install, then COPY . .)'
          });
        }
      }
    }

    return findings;
  }

  /**
   * Analyze infrastructure config files for region optimization
   */
  analyzeRegion(configContent, fileName) {
    const findings = [];

    // Try various config formats
    let currentRegion = null;

    // Terraform
    const tfRegionMatch = configContent.match(/region\s*=\s*["']([^"']+)["']/i);
    if (tfRegionMatch) currentRegion = tfRegionMatch[1];

    // Docker Compose / YAML
    if (!currentRegion && (fileName.endsWith('.yml') || fileName.endsWith('.yaml'))) {
      try {
        const parsed = yaml.load(configContent);
        currentRegion = this._findRegionInObject(parsed);
      } catch (e) { /* ignore parse errors */ }
    }

    // Generic region pattern
    if (!currentRegion) {
      const genericMatch = configContent.match(/(?:region|location|zone)\s*[:=]\s*["']?([a-z]+-[a-z]+\d+(?:-[a-z])?)/i);
      if (genericMatch) currentRegion = genericMatch[1];
    }

    if (currentRegion) {
      const regionBase = currentRegion.replace(/-[a-z]$/, '');
      const currentInfo = this.gcpRegions[regionBase] || this.gcpRegions[currentRegion];

      if (currentInfo) {
        // Find greener alternatives
        const greenRegions = Object.entries(this.gcpRegions)
          .filter(([region]) => region !== regionBase)
          .sort((a, b) => a[1].carbon - b[1].carbon)
          .slice(0, 3);

        if (greenRegions.length > 0 && greenRegions[0][1].carbon < currentInfo.carbon) {
          const [bestRegion, bestInfo] = greenRegions[0];
          const carbonSaving = currentInfo.carbon - bestInfo.carbon;
          const carbonReduction = Math.round((carbonSaving / currentInfo.carbon) * 100);

          findings.push({
            type: 'region',
            severity: carbonReduction > 50 ? 'HIGH' : 'MEDIUM',
            file: fileName,
            currentRegion: currentRegion,
            currentCarbon: currentInfo.carbon,
            currentRenewable: currentInfo.renewable,
            currentName: currentInfo.name,
            recommendedRegion: bestRegion,
            recommendedCarbon: bestInfo.carbon,
            recommendedRenewable: bestInfo.renewable,
            recommendedName: bestInfo.name,
            carbonSavingPerKwh: carbonSaving,
            carbonReductionPercent: carbonReduction,
            alternatives: greenRegions.map(([r, info]) => ({
              region: r,
              carbon: info.carbon,
              renewable: info.renewable,
              name: info.name
            })),
            description: `Move from ${currentRegion} (${currentInfo.carbon} gCO2/kWh, ${currentInfo.renewable}% renewable) to ${bestRegion} (${bestInfo.carbon} gCO2/kWh, ${bestInfo.renewable}% renewable) — ${carbonReduction}% carbon reduction`
          });
        }
      }
    }

    return findings;
  }

  /**
   * Calculate estimated carbon footprint
   */
  calculateCarbonImpact(findings) {
    let totalCO2Saving = 0; // kg CO2/month
    let totalCostSaving = 0; // $/month
    let totalEnergySaving = 0; // kWh/month

    // Assume average cloud workload: 100 kWh/month
    const avgMonthlyKwh = 100;

    for (const finding of findings) {
      if (finding.type === 'region' && finding.carbonSavingPerKwh) {
        const co2Saving = (finding.carbonSavingPerKwh * avgMonthlyKwh) / 1000; // Convert g to kg
        totalCO2Saving += co2Saving;
        totalEnergySaving += avgMonthlyKwh * 0.1; // ~10% efficiency gain from modern regions
      }
      if (finding.type === 'docker-image' && finding.sizeSavingMB) {
        // Smaller images = faster pulls, less storage, less network
        const buildSavings = (finding.sizeSavingMB / 1000) * 0.5; // Rough: 0.5 kg CO2 per GB storage/transfer per month
        totalCO2Saving += buildSavings;
        totalCostSaving += (finding.sizeSavingMB / 1000) * 2; // ~$2/GB storage cost
      }
    }

    // Trees equivalent: average tree absorbs ~22 kg CO2 per year
    const treesEquivalent = Math.round((totalCO2Saving * 12) / 22 * 10) / 10;

    return {
      co2SavingKgPerMonth: Math.round(totalCO2Saving * 100) / 100,
      co2SavingKgPerYear: Math.round(totalCO2Saving * 12 * 100) / 100,
      costSavingPerMonth: Math.round(totalCostSaving * 100) / 100,
      energySavingKwhPerMonth: Math.round(totalEnergySaving * 100) / 100,
      treesEquivalent,
      performanceImprovement: findings.filter(f => f.type === 'docker-image').length > 0 ? 
        Math.min(40, findings.filter(f => f.type === 'docker-image').reduce((acc, f) => acc + (f.sizeReductionPercent || 0), 0) / findings.filter(f => f.type === 'docker-image').length) : 0
    };
  }

  /**
   * Full green analysis of all config files
   */
  analyzeAll(files) {
    const dockerFindings = [];
    const regionFindings = [];
    const codeFindings = [];

    for (const [filePath, content] of Object.entries(files)) {
      const lowerPath = filePath.toLowerCase();

      // Dockerfile analysis
      if (lowerPath.includes('dockerfile') || lowerPath.endsWith('.dockerfile')) {
        dockerFindings.push(...this.analyzeDockerfile(content));
      }

      // Region analysis for various config files
      if (lowerPath.endsWith('.tf') || lowerPath.endsWith('.hcl') ||
          lowerPath.endsWith('.yml') || lowerPath.endsWith('.yaml') ||
          lowerPath.includes('app.json') || lowerPath.includes('deploy') ||
          lowerPath.includes('terraform') || lowerPath.includes('cloud')) {
        regionFindings.push(...this.analyzeRegion(content, filePath));
      }

      // Code efficiency patterns
      codeFindings.push(...this._analyzeCodeEfficiency(content, filePath));
    }

    const allFindings = [...dockerFindings, ...regionFindings, ...codeFindings];
    const impact = this.calculateCarbonImpact(allFindings);

    return {
      docker: dockerFindings,
      region: regionFindings,
      code: codeFindings,
      totalOptimizations: allFindings.length,
      impact,
      scannedFiles: Object.keys(files).length,
      scanTimestamp: new Date().toISOString()
    };
  }

  _analyzeCodeEfficiency(content, filePath) {
    const findings = [];
    const lines = content.split('\n');

    // Check for inefficient patterns
    const inefficientPatterns = [
      {
        pattern: /SELECT\s+\*/gi,
        description: 'SELECT * fetches all columns — specify only needed columns to reduce data transfer and CPU',
        fix: 'SELECT only the columns you need',
        cpuReduction: 15
      },
      {
        pattern: /\.forEach\s*\(\s*async/gi,
        description: 'async forEach does not await iterations — use for...of or Promise.all() for proper async handling and efficiency',
        fix: 'Use for...of loop or Promise.all(array.map(...))',
        cpuReduction: 20
      },
      {
        pattern: /N\+1|for\s*\([^)]+\)\s*\{[^}]*(?:await|query|fetch)\s*\(/gi,
        description: 'Potential N+1 query pattern — database call inside a loop',
        fix: 'Batch queries or use JOINs to reduce database round trips',
        cpuReduction: 50
      }
    ];

    for (const patternDef of inefficientPatterns) {
      for (let i = 0; i < lines.length; i++) {
        patternDef.pattern.lastIndex = 0;
        if (patternDef.pattern.test(lines[i])) {
          findings.push({
            type: 'code-efficiency',
            severity: patternDef.cpuReduction > 30 ? 'MEDIUM' : 'LOW',
            file: filePath,
            line: i + 1,
            description: patternDef.description,
            fix: patternDef.fix,
            cpuReduction: patternDef.cpuReduction
          });
        }
      }
    }

    return findings;
  }

  _findImageInfo(imageName) {
    // Direct match first
    if (this.dockerImages[imageName]) return this.dockerImages[imageName];
    // Try without tag
    const base = imageName.split(':')[0];
    if (this.dockerImages[base]) return this.dockerImages[base];
    return null;
  }

  _findRegionInObject(obj, depth = 0) {
    if (depth > 5 || !obj || typeof obj !== 'object') return null;
    for (const [key, value] of Object.entries(obj)) {
      if (['region', 'location', 'zone'].includes(key.toLowerCase()) && typeof value === 'string') {
        return value;
      }
      if (typeof value === 'object') {
        const found = this._findRegionInObject(value, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Get all green region recommendations
   */
  getGreenRegions() {
    return Object.entries(this.gcpRegions)
      .map(([region, info]) => ({ region, ...info }))
      .sort((a, b) => a.carbon - b.carbon);
  }
}

module.exports = new GreenOptimizer();
