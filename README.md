# GovPulse

**Regulatory Compliance Platform**

A mission-driven compliance gap analysis system designed for policy teams to assess regulatory changes against internal compliance baselines.

## Architecture

```
GovPulse/
├── knowledge/              # Compliance baseline knowledge base
│   └── internal_baseline.md   # TikTok global policy standards
├── engines/                # Python analysis engines
│   ├── scout_engine.py        # Regulatory signal detection
│   └── impact_analyzer.py     # Gap analysis & remediation
├── frontend/               # React dashboard (Vite + Tailwind)
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.tsx      # War room overview
│       │   ├── MissionLauncher.tsx # Mission configuration
│       │   ├── GapAnalysis.tsx    # Side-by-side comparison
│       │   └── AuditTrail.tsx     # History & PM handoffs
│       └── components/
├── data/history/           # Mission results (auto-committed)
└── .github/workflows/      # CI/CD automation
    ├── scout_worker.yml       # Mission execution
    └── deploy.yml             # Dashboard deployment
```

## Core Concept: Compliance Gap Comparison

The system's core logic is **not simple monitoring** but **"Compliance Gap Comparison"**:

1. **Internal Baseline** (`knowledge/internal_baseline.md`): Structured reference of current global compliance standards across:
   - Minor Protection (age-gating, algorithmic safeguards, ad restrictions)
   - E-Commerce (platform separation, cross-border settlement)
   - Data Sovereignty (localization, access controls, transfer mechanisms)

2. **Regulatory Signals**: External policy changes detected via scout missions

3. **Gap Analysis**: AI-driven comparison producing:
   - Conflict identification
   - Risk classification (P0-P3)
   - Product remediation recommendations for PMs

## Quick Start

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Run Analysis Engine

```bash
cd engines
python scout_engine.py      # Test signal detection
python impact_analyzer.py   # Test gap analysis
```

### Trigger Mission via GitHub Actions

Navigate to Actions > Scout Mission Worker > Run workflow:
- Select target market (US, EU, ID, etc.)
- Choose policy domain
- Set lookback period
- Describe trigger event

Results auto-commit to `data/history/` and dashboard redeploys.

## Risk Classification

| Level | Definition | Response SLA |
|-------|------------|--------------|
| **P0** | Existential threat (ban, >$100M fine) | Immediate CEO escalation |
| **P1** | Material compliance gap | 72h cross-functional war room |
| **P2** | Moderate risk, quarterly addressable | 2 weeks |
| **P3** | Low risk, monitoring | Quarterly review |

## Technology Stack

- **Backend**: Python 3.11+ (scout_engine, impact_analyzer)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons
- **CI/CD**: GitHub Actions + GitHub Pages
- **Data**: JSON files in `data/history/`

## Roadmap

- [ ] OpenAI GPT-4 integration for live regulatory search
- [ ] LexisNexis/Westlaw API connectors
- [ ] Slack/Teams notifications for P0/P1 alerts
- [ ] JIRA integration for remediation tracking
- [ ] Multi-language regulatory document parsing
