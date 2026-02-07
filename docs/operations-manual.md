# GovPulse Operations Manual

> User guide for policy teams and product managers

---

## 1. System Overview

### 1.1 What is GovPulse?

GovPulse is a **regulatory compliance platform** that helps teams:

- **Discover**: Automatically scan target markets for the latest regulatory developments
- **Assess**: AI-powered analysis of policy impact on business operations
- **Act**: Generate compliance gap reports and product remediation recommendations

### 1.2 Who should use this system?

| Role | Use Case |
|------|----------|
| **Policy Analyst** | Initiate scans, review policy details, assess risk levels |
| **Policy Lead** | Review AI analysis results, confirm priorities, push to PM |
| **Product Manager** | View pushed compliance requirements, estimate product change effort |

### 1.3 System Entry Points

- **Production**: https://jdzhrch.github.io/GovPulse
- **Local Development**: http://localhost:3000/GovPulse

---

## 2. Core Concepts

### 2.1 Mission (Scan Task)

A scan mission = selected market + policy domain + time range

The system searches for policy developments matching this combination and outputs a Mission Report.

### 2.2 Impact Assessment

For each discovered policy signal, AI generates an impact assessment report containing:

| Field | Description |
|------|------|
| **Risk Level** | Risk rating (Critical / High / Medium / Low) |
| **Risk Rationale** | Why this risk level was assigned |
| **Business Impact** | Specific impact on business operations |
| **Compliance Gaps** | Gaps with current practices (what needs to change) |
| **Remediations** | Recommended remediation measures (how to change) |
| **Deadline** | Compliance deadline (if applicable) |

### 2.3 Risk Level Definitions

| Level | Definition | Response Time | Typical Scenarios |
|------|------|----------|----------|
| **Critical** | Regulation is effective or imminent, directly impacts core business | 24-48 hours | Bans, major fines, mandatory takedowns |
| **High** | Regulation is certain to pass, requires product changes | 1-2 weeks | New age verification, data localization |
| **Medium** | Draft stage, may impact business | 1-3 months | Proposals under review |
| **Low** | Early discussion or limited impact | Quarterly review | Industry initiatives, other market references |

### 2.4 Supported Markets and Domains

**Markets**:
- Brazil | South Korea | Mexico | Philippines
- (More markets can be added via code)

**Policy Domains**:
| Icon | Domain | Description |
|------|------|------|
| All Domains | Scan all domains |
| Youth Safety | Minor protection |
| Digital Commerce | E-commerce, payments, livestream gifting |
| Data & Privacy | Data protection, localization, cross-border transfer |
| Content Policy | Content moderation, harmful information |

---

## 3. Operations Guide

### 3.1 Dashboard (Home Page)

The default page upon entering the system, displaying:

**Statistics Cards**:
- **Critical Alerts**: Number of high-risk policies requiring immediate attention
- **Policies Tracked**: Total number of scanned policy signals
- **Markets Monitored**: Number of markets covered
- **Pending Actions**: Number of compliance gaps pending action

**Recent Assessments List**:
- Impact assessment reports sorted by risk level
- Click to view details

### 3.2 Initiating a New Scan (New Policy Scan)

Click **"New Scan"** in the top navigation

#### Steps:

1. **Provide scan context (optional)**
   - Describe what triggered this scan
   - Example: "Brazil youth protection regulation update"

2. **Select target market**
   - Click a country flag card to select a market
   - Only one market per scan (to ensure analysis depth)

3. **Select policy domain**
   - Default "All Domains" covers all domains
   - Or specify a particular domain for focused scanning

4. **Select lookback period**
   - 30 days: Recent developments (quick scan)
   - 90 days: Quarterly review (recommended)
   - 180 days: Semi-annual review
   - 365 days: Annual panorama

5. **Click "Start Live Scan"**
   - The system triggers GitHub Actions to execute the scan
   - A progress bar shows current status
   - Automatically redirects to the report list upon completion

#### Scan Process Overview:

| Phase | Duration | Description |
|------|------|------|
| Queued | ~10s | Waiting for GitHub Actions to start |
| Scout Engine | ~30s | Searching policy sources, discovering signals |
| Impact Analyzer | ~60s | AI analyzing the impact of each signal |
| Deploy Results | ~20s | Saving results and updating the page |

**Total time is approximately 2-3 minutes**, please be patient.

### 3.3 Viewing Scan Reports

Click **"Scan Reports"** in the top navigation

#### Report List:
- Displays all historical scan missions
- Supports filtering by market and date range
- Click any mission to view details

#### Mission Detail Page:
- **Mission Summary**: Market, domain, scan time
- **Discovered Policies**: All policy signals from this mission
- **Risk Distribution**: Statistics by risk level

### 3.4 Viewing Policy Details

Click **"Policy Details"** in the top navigation

#### List Page:
- Displays all impact assessment reports
- Supports filtering:
  - **By Market**: Select a specific country
  - **By Risk Level**: View only Critical/High
  - **By Time**: Last 7 days / 30 days / 90 days

#### Detail Page:

**Top Information Bar**:
- Policy title
- Risk level badge
- Source market
- Analysis timestamp

**Three-Column Summary**:
| Risk Rationale | Business Impact | Compliance Deadline |
|----------|----------|--------------|
| Why this risk level | Specific business impact | When compliance must be achieved |

**Compliance Gaps**:
- Lists each gap requiring attention
- Shows severity (Critical / Major / Minor)
- Explains specific content

**Remediations**:
- Recommended measures for each gap
- Shows priority (P0 / P1 / P2)
- Estimated effort (engineering days)
- Recommended responsible team

### 3.5 Pushing to PM

On the policy detail page, click the **"Mark as Reviewed"** button in the upper right corner.

- Indicates the Policy Lead has confirmed this assessment
- Button turns green with "Reviewed" status and timestamp
- This status can be used to track which policies have been processed

---

## 4. Best Practices

### 4.1 Recommended Scan Frequency

| Market Type | Recommended Frequency | Rationale |
|----------|----------|------|
| Tier 1 (Priority Markets) | Weekly | Fast-changing policies, high impact |
| Tier 2 (Secondary) | Biweekly | Maintain awareness without high frequency |
| Tier 3 (Watch Markets) | Monthly | Trend monitoring only |

### 4.2 Risk Response Workflow

```
Critical policy discovered
       |
Policy Lead confirms (within 24h)
       |
Align relevant PMs and Legal
       |
Develop response plan (within 48h)
       |
Initiate product changes
```

### 4.3 Integration with Existing Workflows

**Recommended approach**:
1. Initiate Tier 1 market scans on Monday
2. Policy Lead reviews AI analysis results on Tuesday
3. After confirmation, align with PMs in Wednesday sync meeting
4. High/Critical items enter product backlog

---

## 5. Technical Notes

### 5.1 Data Sources

- **Scout Engine** uses Tavily API to search:
  - Government website announcements
  - Authoritative news media
  - Industry analysis reports

### 5.2 AI Analysis Methodology

- Uses GPT-4o for impact assessment
- Compares against current company status in `knowledge/internal_baseline.md`
- Outputs structured JSON format for system processing

### 5.3 Data Storage

- All scan results are saved in the `data/history/` directory
- File formats:
  - `MISSION-{market}-{timestamp}.json`: Mission metadata
  - `IMPACT-{ID}.json`: Impact assessment details
  - `SUMMARY-{missionID}.md`: Human-readable summary

### 5.4 Internal Baseline Maintenance

File location: `knowledge/internal_baseline.md`

Contents include:
- Current product feature status (age gating, data storage, etc.)
- Existing compliance measures
- Organizational structure and owners

**Update method**: Periodically reviewed by the Policy team, updates submitted via Git.

---

## 6. FAQ

### Q: Scan stuck on "Running" for too long?
A: GitHub Actions execution may take 2-3 minutes, please be patient. If it exceeds 5 minutes, refresh the page or check the GitHub Actions page.

### Q: AI analysis results seem inaccurate?
A: AI output is a recommendation, not a decision. Policy Lead should review before confirming. If systematic bias is found, provide feedback to the team to optimize the prompt.

### Q: How to add a new market?
A: This requires code configuration. Contact the engineering team. You need to provide: market code, display name, and primary policy sources.

### Q: How long is historical data retained?
A: All data is permanently stored in the Git repository and can be traced at any time.

### Q: Can multiple markets be scanned in batch?
A: The current version scans one market at a time. For batch scanning, initiate multiple scans or wait for future version support.

---

## 7. Contact

| Scenario | Contact Method |
|------|----------|
| Critical policy discovery | Immediately notify Policy Lead |
| System usage issues | Contact engineering support |
| Feature suggestions | Submit to product backlog |
| Baseline updates | Submit after internal Policy team review |

---

**Version**: V2.0
**Last Updated**: December 2025
**Maintained by**: Global Public Policy & Government Relations
