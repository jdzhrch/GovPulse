# Policy Dog Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the existing frontend as an editorial, executive-facing policy radar without changing any underlying workflows, routes, or data interactions.

**Architecture:** Keep the existing React/Tailwind page structure and business logic intact while introducing a new typography system, design tokens, shared shell styling, and page-specific layout treatments for the dashboard, scan launcher, impact report, and share card. The redesign is enforced with a lightweight file-based regression script plus the normal build/lint checks.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite, Node.js validation script

---

### Task 1: Add a failing design regression check

**Files:**
- Create: `frontend/scripts/check-editorial-redesign.mjs`
- Modify: `frontend/package.json`

- [ ] **Step 1: Write the failing design check**

Create `frontend/scripts/check-editorial-redesign.mjs` with assertions for the approved visual direction:
- `frontend/index.html` loads `Newsreader` and `IBM Plex Sans`
- `frontend/src/index.css` defines `.app-shell`, `.masthead-shell`, `.briefing-title`, `.section-kicker`, `.editorial-panel`
- `frontend/src/components/Layout.tsx` uses `masthead-shell`
- `frontend/src/pages/Dashboard.tsx` uses `hero-summary-grid`
- `frontend/src/pages/MissionLauncher.tsx` uses `scan-workbench`
- `frontend/src/pages/GapAnalysis.tsx` uses `report-hero`

- [ ] **Step 2: Run the design check to verify it fails**

Run: `node scripts/check-editorial-redesign.mjs`
Expected: `AssertionError` because the new tokens and class hooks do not exist yet

- [ ] **Step 3: Add a package script for the check**

Update `frontend/package.json` scripts with:

```json
"check:design": "node scripts/check-editorial-redesign.mjs"
```

- [ ] **Step 4: Re-run the failing check**

Run: `npm run check:design`
Expected: FAIL with missing redesign markers

### Task 2: Introduce the new global visual language

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/components/HelpGuide.tsx`
- Modify: `frontend/src/components/RiskBadge.tsx`

- [ ] **Step 1: Update the font stack**

Replace the current Google Fonts import in `frontend/index.html` with `Newsreader`, `IBM Plex Sans`, and `JetBrains Mono`.

- [ ] **Step 2: Extend Tailwind fonts**

Add `serif` and replace the default `sans` stack in `frontend/tailwind.config.js` so the redesign can use the new editorial typography consistently.

- [ ] **Step 3: Replace the shared CSS language**

Update `frontend/src/index.css` to define paper/ink color variables plus shared classes for:
- `app-shell`
- `masthead-shell`
- `briefing-title`
- `section-kicker`
- `editorial-panel`
- updated button, card, input, badge, risk, and gap-comparison styles

- [ ] **Step 4: Restyle the shell and help modal**

Update `frontend/src/components/Layout.tsx` and `frontend/src/components/HelpGuide.tsx` so the header, navigation, and modal use the new masthead/editorial treatment without changing behavior.

- [ ] **Step 5: Restyle risk badges**

Update `frontend/src/components/RiskBadge.tsx` so badges look like status markers instead of soft SaaS chips.

### Task 3: Restyle the dashboard and scan launcher

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`
- Modify: `frontend/src/pages/MissionLauncher.tsx`

- [ ] **Step 1: Rebuild the dashboard hierarchy**

Keep the same data and links, but change the layout to:
- editorial header
- one dominant summary region for urgent signals
- supporting metrics with stronger hierarchy
- briefing-style report list
- right-rail scan activity panel

- [ ] **Step 2: Reframe the scan launcher as a mission workbench**

Keep the same fields, launch handler, progress states, and completion paths, but restyle them into:
- intro masthead
- numbered decision sections
- right-side mission summary panel
- mission-tracker styling for running/error/complete states

- [ ] **Step 3: Run the design check**

Run: `npm run check:design`
Expected: PASS for dashboard and launcher markers

### Task 4: Restyle the report surfaces and share card

**Files:**
- Modify: `frontend/src/pages/GapAnalysis.tsx`
- Modify: `frontend/src/components/ShareCard.tsx`

- [ ] **Step 1: Rebuild the report list and report hero**

Keep existing filters, review actions, and content sections, but update the presentation to:
- archival filter rail/list styling for the report list
- report hero that leads with risk, title, market, and timing
- less uniform summary cards
- more report-like section framing for gaps, remediations, and next steps

- [ ] **Step 2: Redesign the share card**

Keep the same content and QR behavior, but shift it to a paper-briefing visual style using the new fonts and palette.

- [ ] **Step 3: Re-run the design check**

Run: `npm run check:design`
Expected: PASS for report and share card markers

### Task 5: Verify the redesign end to end

**Files:**
- Verify only

- [ ] **Step 1: Run the branding regression**

Run: `node scripts/check-visible-branding.mjs`
Expected: PASS

- [ ] **Step 2: Run the redesign regression**

Run: `npm run check:design`
Expected: PASS

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: Vite build succeeds with exit code 0

- [ ] **Step 4: Run the linter**

Run: `npm run lint`
Expected: ESLint exits with code 0
