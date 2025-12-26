# TikTok Global Compliance Baseline v2024.1

> **Document Classification**: Internal Policy Reference
> **Last Updated**: 2024-12-25
> **Owner**: Global Public Policy & Government Relations
> **Review Cycle**: Quarterly

---

## 1. MINOR PROTECTION STANDARDS (未成年人保护)

### 1.1 Age-Gated Account Controls

| Policy ID | Requirement | Global Default | Regional Variations |
|-----------|-------------|----------------|---------------------|
| MP-001 | Minimum registration age | 13 years | KR: 14, IT: 14, ID: 13 with parental consent |
| MP-002 | Account privacy for 13-15 years | **Private by default** | No opt-out allowed |
| MP-003 | Account privacy for 16-17 years | Public optional | EU: Requires explicit consent |
| MP-004 | Direct messaging for <16 | **Disabled** | Contacts-only exception in select markets |
| MP-005 | Live streaming eligibility | 18+ only | 16+ with restrictions in JP, KR |
| MP-006 | Virtual gifting (receive) | 18+ only | Universal, no exceptions |
| MP-007 | Virtual gifting (send) | 18+ only | Universal, no exceptions |

### 1.2 Content & Algorithm Safeguards

| Policy ID | Requirement | Implementation |
|-----------|-------------|----------------|
| MP-010 | Screen time management | 60-min default for <18, with bypass code |
| MP-011 | Sleep reminders | Push notifications at 22:00-06:00 local |
| MP-012 | Algorithm personalization | **Reduced personalization for <16** |
| MP-013 | Restricted Mode | Available; auto-enabled for <13 flagged accounts |
| MP-014 | Content maturity filtering | No mature content surfaced to minors |

### 1.3 Advertising to Minors

| Policy ID | Requirement | Compliance Mechanism |
|-----------|-------------|---------------------|
| MP-020 | Personalized ads to <18 | **Prohibited globally** |
| MP-021 | Contextual ads to <16 | Limited categories only (education, entertainment) |
| MP-022 | Influencer disclosure for minors | Mandatory #ad labeling |
| MP-023 | Gambling/alcohol ads exposure | Age-gated, not shown to declared <21 |
| MP-024 | Weight-loss/cosmetic surgery ads | **Banned for <18 audience** |

### 1.4 Parental Controls & Family Pairing

| Policy ID | Requirement | Features |
|-----------|-------------|----------|
| MP-030 | Family Pairing availability | Global rollout complete |
| MP-031 | Parent dashboard visibility | Screen time, search history (anonymized) |
| MP-032 | Parent override authority | Can restrict DMs, set time limits |
| MP-033 | Teen notification of linking | Mandatory transparency notice |

---

## 2. E-COMMERCE & PAYMENTS COMPLIANCE (电商准入)

### 2.1 Platform Structural Separation

| Policy ID | Requirement | Rationale |
|-----------|-------------|-----------|
| EC-001 | Social-commerce separation | Content feed ≠ Transaction interface |
| EC-002 | TikTok Shop entity isolation | Separate legal entity where required |
| EC-003 | Payment processor independence | No in-house payment processing in regulated markets |
| EC-004 | Merchant verification | KYC mandatory before onboarding |

### 2.2 Cross-Border Settlement

| Policy ID | Requirement | Implementation |
|-----------|-------------|----------------|
| EC-010 | Currency conversion transparency | Real-time FX disclosure at checkout |
| EC-011 | Settlement jurisdiction | Funds held in buyer's jurisdiction until delivery confirmation |
| EC-012 | Remittance licensing | Partner with licensed MSBs/EMIs per market |
| EC-013 | Sanctions screening | OFAC, EU consolidated list, UN sanctions |

### 2.3 Consumer Protection

| Policy ID | Requirement | Standard |
|-----------|-------------|----------|
| EC-020 | Return policy minimum | 7-day no-questions-asked (14 in EU) |
| EC-021 | Dispute resolution | In-app arbitration + local ODR compliance |
| EC-022 | Price transparency | All-in pricing including duties/taxes |
| EC-023 | Counterfeit liability | Proactive brand protection program |
| EC-024 | Live commerce disclosures | Real-time "sponsored" overlay |

### 2.4 Seller Compliance

| Policy ID | Requirement | Enforcement |
|-----------|-------------|-------------|
| EC-030 | Business license verification | Mandatory for all sellers |
| EC-031 | Product safety certification | Category-specific (cosmetics, electronics, food) |
| EC-032 | Prohibited products list | Weapons, drugs, wildlife, regulated substances |
| EC-033 | Tax compliance declaration | Seller attestation + platform reporting |

---

## 3. DATA SOVEREIGNTY & LOCALIZATION (数据主权)

### 3.1 Data Residency Requirements

| Market | Data Type | Residency Requirement | Current Status |
|--------|-----------|----------------------|----------------|
| 🇺🇸 US | All US user data | Domestic (Project Texas) | Oracle Cloud, Texas |
| 🇪🇺 EU | EU user data | EEA localization | Dublin + Norway DCs |
| 🇨🇳 CN | All CN user data | Mainland China | Separate infrastructure (Douyin) |
| 🇮🇩 ID | Indonesian user data | Local residency pending | Singapore with mirroring |
| 🇻🇳 VN | Vietnamese user data | Local storage mandate | Compliance in progress |
| 🇷🇺 RU | Russian user data | Federal Law 242-FZ | Service suspended |
| 🇮🇳 IN | Indian user data | N/A | Service banned |
| 🇧🇷 BR | Brazilian user data | LGPD compliance | São Paulo mirroring |

### 3.2 Cross-Border Data Transfer Mechanisms

| Policy ID | Requirement | Mechanism |
|-----------|-------------|-----------|
| DS-010 | EU-US transfers | EU-US Data Privacy Framework + SCCs |
| DS-011 | EU-UK transfers | UK Adequacy Decision |
| DS-012 | APAC transfers | APEC CBPR where applicable |
| DS-013 | Government access transparency | Annual transparency report |

### 3.3 Access Control Architecture

| Policy ID | Requirement | Implementation |
|-----------|-------------|----------------|
| DS-020 | Employee access to US data | US-based personnel only (CFIUS commitment) |
| DS-021 | Source code audits | Third-party review (Oracle, external auditors) |
| DS-022 | Algorithm transparency | Regulator access upon formal request |
| DS-023 | Recommendation system explainability | User-facing "Why this video" feature |

### 3.4 Regulatory Engagement Protocols

| Policy ID | Requirement | SLA |
|-----------|-------------|-----|
| DS-030 | Law enforcement requests | 24-hour acknowledgment, jurisdiction verification |
| DS-031 | National security orders | Legal challenge protocol defined |
| DS-032 | Content takedown requests | NetzDG: 24h (illegal), 7d (borderline) |
| DS-033 | User data access requests | GDPR: 30 days |

---

## 4. CONTENT MODERATION ALIGNMENT (内容审核)

### 4.1 Proactive Detection

| Policy ID | Requirement | Capability |
|-----------|-------------|------------|
| CM-001 | CSAM detection | PhotoDNA + proprietary classifiers |
| CM-002 | Terrorism content | GIFCT hash-sharing membership |
| CM-003 | Misinformation during elections | Prebunking partnerships, fact-check labels |
| CM-004 | Self-harm/suicide content | Intervention workflows, crisis resources |

### 4.2 Transparency Obligations

| Policy ID | Requirement | Deliverable |
|-----------|-------------|-------------|
| CM-010 | DSA transparency report | Biannual (EU) |
| CM-011 | Community Guidelines report | Quarterly global |
| CM-012 | Government request report | Biannual global |
| CM-013 | Ad library | Searchable political ads archive |

---

## 5. COMPLIANCE ESCALATION MATRIX

### Risk Classification

| Level | Definition | Response SLA | Escalation Path |
|-------|------------|--------------|-----------------|
| **P0** | Existential regulatory threat (ban, heavy fine >$100M) | Immediate | CEO + Board |
| **P1** | Material compliance gap requiring product change | 72 hours | VP Policy + CPO |
| **P2** | Moderate risk, addressable within quarter | 2 weeks | Regional Policy Lead |
| **P3** | Low risk, monitoring only | Quarterly review | Policy Analyst |

### Trigger Events for Re-Assessment

- New legislation enacted or formally proposed
- Regulatory enforcement action against platform
- Judicial ruling with precedential value
- Material change in political leadership
- Competitor enforcement creating regulatory precedent

---

## APPENDIX A: Jurisdiction Priority Matrix

| Tier | Markets | Rationale |
|------|---------|-----------|
| Tier 1 | US, EU, UK, ID, BR | High revenue + regulatory intensity |
| Tier 2 | JP, KR, AU, MX, PH | Growing markets with active regulators |
| Tier 3 | MENA, SSA, Latam ex-BR/MX | Emerging regulatory frameworks |

---

## APPENDIX B: Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2024.1 | 2024-12-25 | Global Policy Team | Initial V1 baseline |

---

*This document serves as the authoritative internal reference for GovPulse compliance gap analysis. All regulatory change assessments must be benchmarked against these baselines.*
