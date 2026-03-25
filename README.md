# 🛡️🌱 Vuln-to-Green Vault

> An autonomous AI-powered agent that acts as a **Senior Security & Sustainability Engineer** for GitLab repositories. Detects security vulnerabilities, fixes them, AND optimizes your codebase for lower carbon footprint and cost — all in a single automated workflow.

![Status](https://img.shields.io/badge/status-production-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

## ✨ Features

🛡️🌱 Vuln-to-Green Vault — GitLab Hackathon submission
Real working app for GitLab security + sustainability agent:

✅ **AI Orchestrator** — Powered by Anthropic Claude 4.6 & Google Cloud Vertex AI
✅ **Automatic Remediation** — AI generates secure fixes and creates GitLab Merge Requests
✅ **Sustainability Auditor** — Vertex AI powered auditing of carbon impact and cost
✅ **Security Scanner** — 20+ rules (SQLi, XSS, secrets, cmd injection, etc.)
✅ **Real NVD CVE API integration** (https://services.nvd.nist.gov)
✅ **Real GitLab API v4 integration** (fetch files, create MR, comments)
✅ **Green Optimizer** — 33 GCP regions with real carbon data (Electricity Maps API)
✅ **Docker image optimizer** — recommends slim/alpine alternatives
✅ **Carbon impact calculator** (kg CO2, trees, kWh, cost savings)
✅ **Premium dark dashboard SPA** — 9 pages with real-time glassmorphism UI
✅ **Auto-scheduled scans** (cron) + direct code paste scanner

Built for: GitLab Hackathon 2026

---

## 🚀 Quick Start (One Command)
Run this in your terminal to clone, install, and launch securely:

```bash
# Clone (if not already there), install, and launch securely
[ -d vuln-to-green-vault ] || git clone https://github.com/ar48code-dev/vuln-to-green-vault
cd vuln-to-green-vault && npm install && cp .env.example .env && npm run start:safe
```

**Note:** The dashboard will automatically attempt to open in your browser at `http://localhost:3000`. If it doesn't open, please visit the link manually.

### ⚙️ Easy Configuration
Once the dashboard opens:
1. Click the **⚙️ Config** button (top right)
2. Paste your **GitLab Personal Access Token**
3. Enter your **Project ID**
4. Paste your **Vertex AI** or **Anthropic** keys if using AI features
5. Click **Save & Connect**
6. Start scanning! 🛡️🌱

---

## 🔑 Configuration (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `GITLAB_URL` | No | GitLab instance URL (default: `https://gitlab.com`) |
| `GITLAB_TOKEN` | For GitLab scans | Personal access token with `api` scope |
| `GITLAB_PROJECT_ID` | For GitLab scans | Your project's numeric ID |
| `ANTHROPIC_API_KEY` | For AI Fixes | Claude 4.6 Sonnet API key |
| `GOOGLE_CLOUD_PROJECT` | For Green AI | GCP Project ID for Vertex AI |
| `NVD_API_KEY` | No | NVD API key for CVE lookups |
| `ELECTRICITY_MAPS_API_KEY` | No | For live carbon data (optional) |

---

## 🏗️ Architecture

```
vuln-to-green-vault/
├── server.js                 # Express server + middleware + scheduler
├── src/
│   ├── index.js             # 🤖 AI Orchestrator & Tool Handler
│   ├── agent/               # 🛠️ AI Tool Definitions
│   │   └── tools/
│   │       └── gitlab_tools.json
│   ├── routes/
│   │   ├── agent.js         # AI Agent interaction endpoints
│   │   ├── api.js           # Dashboard data + history endpoints
│   │   ├── gitlab.js        # GitLab API proxy endpoints
│   │   ├── scan.js          # Scan triggers + CVE lookups
│   │   └── green.js         # Carbon footprint + region data
│   ├── services/
│   │   ├── anthropic.js     # Anthropic Claude 4.6 integration
│   │   ├── googleCloud.js   # Vertex AI Sustainability Auditor
│   │   ├── gitlab.js        # GitLab API v4 client
│   │   ├── cve.js           # NVD CVE lookup service
│   │   ├── liveCarbon.js    # Electricity Maps API integration
│   │   ├── report.js        # Markdown report generator
│   │   └── scheduler.js     # Automated scan orchestrator
│   └── scanners/
│       ├── security.js      # 20+ vulnerability detection rules
│       └── green.js         # Carbon + Docker optimizer
└── public/
    ├── index.html           # SPA dashboard
    ├── css/styles.css       # Premium dark theme
    └── js/app.js            # Frontend logic
```

---

## 📝 License

MIT License — use freely for any purpose.

