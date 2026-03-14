/**
 * Report Generator — Creates MR descriptions and analysis reports
 */

class ReportGenerator {
  /**
   * Generate a full Vulnerability + Green report
   */
  generateFullReport(securityResults, greenResults) {
    const sections = [];

    sections.push('# 🛡️🌱 Vuln-to-Green Vault Analysis Report\n');
    sections.push(`**Scan Date:** ${new Date().toISOString()}`);
    sections.push(`**Files Scanned:** ${securityResults.scannedFiles || 0} (security) + ${greenResults.scannedFiles || 0} (green)\n`);

    // Security Section
    sections.push('---\n## 🔴 SECURITY FIXES\n');

    if (securityResults.findings && securityResults.findings.length > 0) {
      const grouped = this._groupBySeverity(securityResults.findings);

      for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
        if (grouped[severity] && grouped[severity].length > 0) {
          const emoji = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' }[severity];
          sections.push(`### ${emoji} ${severity} (${grouped[severity].length})\n`);

          grouped[severity].forEach((finding, idx) => {
            sections.push(`**${idx + 1}. ${finding.name}** in \`${finding.file}:${finding.line}\``);
            sections.push(`- **Severity:** ${finding.severity}`);
            sections.push(`- **CWE:** ${finding.cwe}`);
            sections.push(`- **Risk:** ${finding.description}`);
            sections.push(`- **Fix:** ${finding.fix}`);
            sections.push(`- **Code:** \`${finding.lineContent.substring(0, 100)}\``);
            sections.push('');
          });
        }
      }
    } else {
      sections.push('✅ No security vulnerabilities detected!\n');
    }

    // Green Section
    sections.push('---\n## 🌱 GREEN OPTIMIZATIONS\n');

    if (greenResults.docker && greenResults.docker.length > 0) {
      sections.push('### 🐳 Docker Image Optimization\n');
      greenResults.docker.forEach(finding => {
        if (finding.type === 'docker-image') {
          sections.push(`✅ **Image Optimization**`);
          sections.push(`- **Before:** \`${finding.current}\` (${finding.currentSize}MB)`);
          sections.push(`- **After:** \`${finding.recommended}\` (${finding.recommendedSize}MB)`);
          sections.push(`- **Reduction:** ${finding.sizeSavingMB}MB (${finding.sizeReductionPercent}% smaller)\n`);
        } else {
          sections.push(`✅ **${finding.description}**`);
          sections.push(`- Line ${finding.line}\n`);
        }
      });
    }

    if (greenResults.region && greenResults.region.length > 0) {
      sections.push('### 🌍 Region Optimization\n');
      greenResults.region.forEach(finding => {
        sections.push(`✅ **Region Migration**`);
        sections.push(`- **Current:** \`${finding.currentRegion}\` (${finding.currentCarbon} gCO2/kWh, ${finding.currentRenewable}% renewable) — ${finding.currentName}`);
        sections.push(`- **Recommended:** \`${finding.recommendedRegion}\` (${finding.recommendedCarbon} gCO2/kWh, ${finding.recommendedRenewable}% renewable) — ${finding.recommendedName}`);
        sections.push(`- **Carbon Reduction:** ${finding.carbonReductionPercent}%`);
        if (finding.alternatives && finding.alternatives.length > 1) {
          sections.push(`- **Other green alternatives:**`);
          finding.alternatives.slice(1, 3).forEach(alt => {
            sections.push(`  - \`${alt.region}\` (${alt.carbon} gCO2/kWh, ${alt.renewable}% renewable) — ${alt.name}`);
          });
        }
        sections.push('');
      });
    }

    if (greenResults.code && greenResults.code.length > 0) {
      sections.push('### ⚡ Code Efficiency\n');
      greenResults.code.forEach(finding => {
        sections.push(`✅ **${finding.description}**`);
        sections.push(`- File: \`${finding.file}:${finding.line}\``);
        sections.push(`- Fix: ${finding.fix}`);
        sections.push(`- Est. CPU reduction: ${finding.cpuReduction}%\n`);
      });
    }

    if (greenResults.totalOptimizations === 0) {
      sections.push('✅ Infrastructure is already well-optimized!\n');
    }

    // Impact Metrics
    sections.push('---\n## 📊 IMPACT METRICS\n');
    if (greenResults.impact) {
      const impact = greenResults.impact;
      sections.push(`| Metric | Value |`);
      sections.push(`|--------|-------|`);
      sections.push(`| 💰 Cost Savings | $${impact.costSavingPerMonth}/month |`);
      sections.push(`| 🌱 Carbon Reduction | ${impact.co2SavingKgPerMonth} kg CO2/month (${impact.co2SavingKgPerYear} kg/year) |`);
      sections.push(`| 🌳 Equivalent To | ${impact.treesEquivalent} trees planted per year |`);
      sections.push(`| ⚡ Energy Saved | ${impact.energySavingKwhPerMonth} kWh/month |`);
      sections.push(`| 📉 Performance | ${impact.performanceImprovement}% faster build/deploy |`);
    }

    // Summary
    sections.push('\n---\n## 🧪 SUMMARY\n');
    sections.push(`| Category | Count |`);
    sections.push(`|----------|-------|`);
    sections.push(`| 🔴 CRITICAL vulnerabilities | ${securityResults.summary?.CRITICAL || 0} |`);
    sections.push(`| 🟠 HIGH vulnerabilities | ${securityResults.summary?.HIGH || 0} |`);
    sections.push(`| 🟡 MEDIUM vulnerabilities | ${securityResults.summary?.MEDIUM || 0} |`);
    sections.push(`| 🟢 LOW vulnerabilities | ${securityResults.summary?.LOW || 0} |`);
    sections.push(`| 🌱 Green optimizations | ${greenResults.totalOptimizations || 0} |`);
    sections.push('');
    sections.push('---');
    sections.push('*Generated by 🛡️🌱 Vuln-to-Green Vault*');

    return sections.join('\n');
  }

  /**
   * Generate MR title
   */
  generateMRTitle(securityResults, greenResults) {
    const vulnCount = securityResults.totalVulnerabilities || 0;
    const greenCount = greenResults.totalOptimizations || 0;

    const parts = [];
    if (vulnCount > 0) {
      const topSeverity = securityResults.findings?.[0]?.name || 'vulnerabilities';
      parts.push(`🛡️ Security Fix: ${vulnCount} ${topSeverity}`);
    }
    if (greenCount > 0) {
      parts.push(`🌱 Green Optimization: ${greenCount} improvements`);
    }

    return parts.join(' + ') || '🛡️🌱 Vuln-to-Green Vault Scan';
  }

  _groupBySeverity(findings) {
    const grouped = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] };
    findings.forEach(f => {
      if (grouped[f.severity]) grouped[f.severity].push(f);
    });
    return grouped;
  }
}

module.exports = new ReportGenerator();
