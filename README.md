# 🛡️🌱 Vuln-to-Green Vault

> An autonomous AI-powered agent that acts as a **Senior Security & Sustainability Engineer** for GitLab repositories. Detects security vulnerabilities, fixes them, AND optimizes your codebase for lower carbon footprint and cost — all in a single automated workflow.

![Status](https://img.shields.io/badge/status-production-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

## ✨ Features

🛡️🌱 Vuln-to-Green Vault — GitLab Hackathon submission
Real working app for GitLab security + sustainability agent:

✅ Security Scanner — 20+ rules (SQLi, XSS, secrets, cmd injection, etc.)
✅ Real NVD CVE API integration (https://services.nvd.nist.gov)
✅ Real GitLab API v4 integration (fetch files, create MR, comments)
✅ Green optimizer — 33 GCP regions with real carbon data
✅ Docker image optimizer — recommends slim/alpine alternatives
✅ Carbon impact calculator (kg CO2, trees, kWh, cost savings)
✅ Premium dark dashboard SPA — 9 pages, glassmorphism UI
✅ Auto-scheduled scans (cron) + direct code paste scanner
✅ Fix: GitLab config hot-reload (singleton reinit bug fixed)

Built for: GitLab Hackathon 2026

---

## 🚀 Quick Start (One Command)
Run this in your terminal to clone, install, and launch securely:

```bash
# Clone (if not already there), install, and launch securely
[ -d vuln-to-green-vault ] || git clone https://github.com/ar48code-dev/vuln-to-green-vault
cd vuln-to-green-vault && npm install && cp .env.example .env && npm run start:safe
```

**That's it!** The dashboard will automatically open in your browser at `http://localhost:3000`.

### ⚙️ Easy Configuration
Once the dashboard opens:
1. Click the **⚙️ Config** button (top right)
2. Paste your **GitLab Personal Access Token**
3. Enter your **Project ID**
4. Click **Save & Connect**
5. Start scanning! 🛡️🌱

---

## 🔑 Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `GITLAB_URL` | No | GitLab instance URL (default: `https://gitlab.com`) |
| `GITLAB_TOKEN` | For GitLab scans | Personal access token with `api` scope |
| `GITLAB_PROJECT_ID` | For GitLab scans | Your project's numeric ID |
| `PORT` | No | Server port (default: `3000`) |
| `SCAN_CRON` | No | Cron schedule for auto-scans (default: `0 2 * * 1`) |
| `NVD_API_KEY` | No | NVD API key for CVE lookups |

---

## 📖 How It Works

1. **Trigger** → Scan via dashboard, schedule, or `/vault-scan` command
2. **Fetch** → Pulls source files from your GitLab repository
3. **Analyze** → Runs 20+ security rules + green optimization analysis
4. **Report** → Generates detailed report with severity, CVEs, impact metrics
5. **Remediate** → Creates GitLab Merge Request with fixes
6. **Approve** → Human reviews and approves via "Vault Approve"

---

## 🏗️ Architecture

```
vuln-to-green-vault/
├── server.js                 # Express server + middleware + scheduler
├── src/
│   ├── routes/
│   │   ├── api.js           # Dashboard data + history endpoints
│   │   ├── gitlab.js        # GitLab API proxy endpoints
│   │   ├── scan.js          # Scan triggers + CVE lookups
│   │   └── green.js         # Carbon footprint + region data
│   ├── services/
│   │   ├── gitlab.js        # GitLab API v4 client (real API)
│   │   ├── cve.js           # NVD CVE lookup service (real API)
│   │   ├── report.js        # Markdown report generator
│   │   └── scheduler.js     # Automated scan orchestrator
│   └── scanners/
│       ├── security.js      # 20+ vulnerability detection rules
│       └── green.js         # Carbon + Docker + region optimizer
├── public/
│   ├── index.html           # SPA dashboard
│   ├── css/styles.css       # Premium dark theme
│   └── js/app.js            # Frontend logic
└── .env                     # Configuration
```

---

## 📝 License

MIT License — use freely for any purpose.
