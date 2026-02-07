# TikTok Internal Baseline (Reality-Checked) v2026.03

> **Document Classification**: Internal Policy Reference  
> **Last Updated**: 2026-02-07  
> **Owner**: Global Public Policy & Government Relations  
> **Review Cycle**: Monthly (all domains)

---

## 0. Scope

This revision replaces prior synthetic assumptions with source-backed facts from:

- TikTok official Support / Newsroom / Legal pages
- EU data protection regulator (Irish DPC)

Priority scope for this version:

- Youth Safety
- Data Privacy
- E-commerce & Payments
- Content Moderation

---

## 1. Youth Safety Baseline

### 1.1 Age and account defaults (current public policy)

| Topic | Current baseline (as of 2026-02-07) | Region notes |
|---|---|---|
| Minimum age | TikTok states service is for age 13+ (or higher where local law requires) | Global principle |
| Under-13 experience | In the US, under-13 users are routed to an age-appropriate limited experience and a 1-hour screen-time limit is stated | US-specific implementation disclosed by TikTok |
| Default privacy for teens | Accounts for ages 13-17 are private by default | Applies across teen cohort |
| Direct messages | DM is only available for users age 16+; for 16-17, default DM setting is restrictive and can be managed in settings | Teen safety default |
| LIVE eligibility | Hosting LIVE is 18+ | In South Korea, 19+ |
| Virtual gifts | Sending/receiving gifts is 18+ | In South Korea, 19+ |
| Video downloads | Disabled for ages 13-15; 16-17 defaults are more restrictive and depend on account privacy state | Teen safety default |

### 1.2 Time-use and nighttime safeguards

| Topic | Current baseline (as of 2026-02-07) | Notes |
|---|---|---|
| Daily screen-time default | TikTok says under-18 accounts are set to a 60-minute daily limit by default (parents can set stricter controls via Family Pairing) | Publicly reaffirmed March 2025 |
| Night push notifications | Family Pairing docs state push notifications are muted by default: 13-15 (9:00 PM-8:00 AM), 16-17 (10:00 PM-8:00 AM) | Parent cannot weaken some teen defaults |
| Wind-down reminder | TikTok announced wind-down prompts for under-16 users after 10:00 PM, with additional full-screen reminders and meditation elements | Announced March 2025 |

### 1.3 Family Pairing (latest product state)

| Capability | Current baseline (as of 2026-02-07) | Rollout status |
|---|---|---|
| Parent visibility of teen social graph controls | Parent can view teen follower/following context and blocked-account settings (features announced/expanded in 2025 updates) | Available/expanded in 2025 |
| Time Away scheduling | Parent can set recurring unavailable periods for teen usage | Publicly documented in Family Pairing |
| Teen reporting escalation to trusted adult | Teen can choose to notify parent/guardian/trusted adult when reporting content | Global availability announced July 2025 |
| Parent visibility into selected teen privacy settings | Parent can view selected teen settings (e.g., downloads, likes visibility, topic preferences) | Announced July 2025 (with regional rollout details) |
| Block specific accounts from teen feed | Parent-level block controls announced for teen feed management | Initially Europe per July 2025 update |

### 1.4 Ads and age-based personalization

| Topic | Current baseline (as of 2026-02-07) |
|---|---|
| Personalized ads for minors | TikTok states personalized ads are not allowed for under-18 users |
| Age-estimation fallback | If age signals suggest likely under 18, TikTok states personalized ads are turned off and users cannot change this setting |

### 1.5 Age assurance posture

| Topic | Current baseline (as of 2026-02-07) |
|---|---|
| Detection and prevention | TikTok states it uses machine learning and safety review to identify likely under-13 users and remove/limit access |
| Additional signals | TikTok disclosed work with telecom partner Telefonica on age-signal confirmation; TikTok also disclosed US testing to route age-uncertain users into restricted teen experience |

---

## 2. Data Privacy Baseline

### 2.1 Public privacy-policy documents and dates

| Policy document | Current baseline (as of 2026-02-07) |
|---|---|
| TikTok Privacy Policy (non-US / global page) | Public page shows last update date: 2025-07-08 |
| TikTok US Privacy Policy | Public page shows last update date: 2024-08-19 |
| US location collection statement | US policy page states current app versions do not collect precise or approximate GPS info from US users |
| US remote access disclosure | US policy page discloses that certain personnel in multiple countries may access data remotely for permitted operational purposes |

### 2.2 Data localization/security programs (company-disclosed)

| Program | Current baseline (as of 2026-02-07) |
|---|---|
| Project Clover (EEA) | TikTok states EEA user data is by default stored in a dedicated enclave spanning Norway, Ireland, and the US, with independent oversight and tighter controls on remote access |
| China access claim under Clover | TikTok stated a plan that by end-2025 private EEA user data should not be accessed from China and China-based employees should not have access |
| USDS / Project Texas (US) | TikTok USDS states protected US user data is localized by default in Oracle Cloud infrastructure and monitored by independent security inspection programs |

### 2.3 Regulator findings (must be tracked as ground truth)

| Date | Regulator event | Baseline implication |
|---|---|---|
| 2025-04-30 (decision date) / 2025-05-02 (public announcement) | Irish DPC announced final decision with total EUR 530M fine regarding TikTok EEA-China transfers and transparency findings; order included compliance timeline and potential transfer suspension path | EU transfer controls remain high-risk and cannot be assessed only on company claims |
| 2025-07-10 | Irish DPC opened a new inquiry after TikTok informed DPC (April 2025) that limited EEA data had been stored on servers in China | Add active enforcement watch item: EU data-transfer governance still evolving |

### 2.4 Operating guidance for GovPulse assessments

- Do not treat old assumptions like "US data can only be accessed by US personnel" as valid baseline; current public policy language is broader.
- For EU analysis, evaluate both:
  1. TikTok’s Project Clover control claims
  2. Confirmed DPC enforcement findings and follow-on inquiry
- For youth safety analysis, distinguish:
  1. Declared-age controls
  2. Age-estimation-triggered controls

---

## 3. E-Commerce & Payments Baseline

### 3.1 Availability and legal framework (region-dependent)

| Topic | Current baseline (as of 2026-02-07) | Notes |
|---|---|---|
| Shop terms are market-specific | TikTok legal terms indicate TikTok Shop terms differ by market (for EEA/UK users, explicit references include UK, IE, ES, DE, FR, IT) | No single global buyer/seller rule set |
| Multi-market seller terms exist | TikTok Shop Seller Terms repository lists multiple country versions (for example BR, DE, ES, FR, ID, IE, IT, MY, MX, PH, SG, TH, US, UK, VN + Cross-Border) | Product/legal obligations vary by jurisdiction |
| Europe rollout is phased | Official TikTok Newsroom shows Ireland launch in December 2024 and expansion to Germany/France/Italy from March 31, 2025 | Needed when assessing EU market obligations |
| US contractual entity | US seller terms state operator/contract party as BD TikTok USA LLC and show last updated date January 22, 2026 | US-specific legal baseline |

### 3.2 Seller onboarding and account eligibility (US policy center)

| Topic | Current baseline (as of 2026-02-07) |
|---|---|
| Seller verification | US onboarding guidance requires identity/business verification documentation (for example government ID, SSN/ITIN/EIN in applicable flows, and business registration records for business sellers) |
| Policy hierarchy | Seller terms define TikTok Shop as part of TikTok commercial products and require compliance with platform policies and applicable laws |
| Fulfillment model differences | Policies distinguish Seller Shipping, TikTok Shipping, and Fulfilled by TikTok (FBT), with different responsibility and response rules |

### 3.3 Product restrictions, safety, and listing controls (US policy center)

| Topic | Current baseline (as of 2026-02-07) | Source posture |
|---|---|---|
| Prohibited products | Prohibited Products Policy (dated 2025-11-12 in policy center crawl) bans illegal/stolen/counterfeit/gray-market/sanctioned and recalled products, among other categories | Platform policy + legal compliance framing |
| Restricted categories | Restricted Products Policy requires category/product/invite-only qualification for designated categories and allows enforcement (points, listing removal, selling privilege restrictions) | Qualification gate is explicit |
| Dangerous goods | Dangerous Goods Policy (dated 2025-12-20) requires compliant storage/labeling/shipping and submission of SDS/MSDS; lithium battery listings require UN38.3 documentation | Hazmat controls are explicit |
| Battery listings | Battery guidance (dated 2025-12-20) requires battery disclosure fields; lithium documentation; lead-acid batteries listed as prohibited in guidance examples | Category-level compliance detail |
| Recalls | Product Recall Policy (dated 2025-11-13) bars recalled goods, allows removal/notification/cancellation actions, and defines reinstatement with compliance documentation | Direct consumer-protection control |
| Listing integrity | Product Listing Policy (dated 2025-12-12) requires truthful listings and bans deceptive claims/manipulation/targeting minors with prohibited behavior | Links commerce integrity with safety |

### 3.4 Cancellation, returns, and refunds (US policy center)

| Topic | Current baseline (as of 2026-02-07) |
|---|---|
| Pending-period cancellation | Policy uses an initial pending period and allows platform auto-approval paths for cancellation requests in defined conditions |
| 24-hour seller response requirement | If seller takes no action within 24 hours on qualifying cancellation/refund requests, TikTok Shop auto-approves and issues refund |
| Delayed-order auto-cancel | Policies and seller policy pulse indicate auto-cancellation rules tied to order-status SLAs (including 7-business-day triggers under updated US/cross-border logic) |
| Return/refund review windows | For return/refund and refund-only handling, seller review windows depend on price bands (commonly 2 business days for <=$100, 4 business days for >$100) |
| Auto-approved return categories | Policy states TikTok Shop auto-approves return requests for returnable categories |
| Return shipment time | Customer return package submission window is defined (30 calendar days after return request approval in current policy wording) |
| Advanced refund flow | Eligible cases can receive drop-off-triggered advanced refund; exclusions include certain price tiers and pre-owned-category constraints |

### 3.5 Operating guidance for GovPulse e-commerce assessments

- Do not model TikTok Shop as one global policy set; baseline by market.
- For EU assessments, combine user-facing legal terms and market launch announcements with local enforcement context.
- For US assessments, treat Seller Center policy pages and policy pulse updates as the operational baseline.
- Flag any gap where business assumptions conflict with current TikTok Shop SLA/enforcement automation.

---

## 4. Content Moderation Baseline

### 4.1 Community rulebook and effective policy dates

| Topic | Current baseline (as of 2026-02-07) |
|---|---|
| Guidelines update cycle | TikTok announced Community Guidelines updates on August 15, 2025 with effectiveness from September 13, 2025 |
| Policy scope | Updated framework includes clearer and consolidated rules, including regulated goods/services and expanded account/feature governance (including LIVE and TikTok Shop references in policy framing) |
| Youth recommendation safeguard | Community Guidelines FYF standards state content created by users under 16 is ineligible for For You feed recommendation |
| Public-interest exceptions | Enforcement framework includes documented public-interest exception categories (for example documentary/educational/medical-scientific/counterspeech/satirical/artistic) with safety caveats |

### 4.2 Enforcement workflow and procedural safeguards

| Topic | Current baseline (as of 2026-02-07) |
|---|---|
| Detection model | Enforcement pages state a combined automated + human review model with proactive removal/flagging before or in parallel with user reports |
| Reporting channels | Users can report content/accounts in-app and via web channels; platform states it may assess illegality by country/region where applicable |
| Notice and appeals | Enforcement pages describe user notifications for removals/restrictions and an appeal path in Safety Center/account safety flows |
| Escalation for severe harms | Reporting and guideline pages state incidents involving youth sexual exploitation are reported to NCMEC, and imminent serious harm can be escalated to law enforcement |
| EEA illegal-content path | TikTok legal page for illegal-content reporting requires jurisdiction/context details and describes country-level restriction/removal outcomes where illegality is found |

### 4.3 Transparency reporting and regulator oversight (EU focus)

| Date | Event | Baseline implication |
|---|---|---|
| 2025-08-29 | TikTok DSA fifth transparency report (H1 2025) reports about 27.8M removals, 99.2% moderation accuracy, 82 trusted-flagger reports, and median government-order response reduced from 6h to 3h | Use these as declared platform KPIs, not independent validation |
| 2025-05-15 | European Commission preliminary finding: TikTok ad repository did not satisfy DSA transparency requirements | Ad transparency controls were under formal regulatory challenge |
| 2025-12-05 | European Commission accepted TikTok commitments on ad transparency: full ad content + URLs, faster updates (<=24h), targeting criteria and aggregate audience data, more search filters | Treat ad repository obligations as strengthened compliance commitments under active supervision |
| 2025-10-24 | European Commission preliminary finding on researcher data-access obligations under DSA (including TikTok) | Research-access compliance remains a live regulatory risk area |

### 4.4 Operating guidance for GovPulse moderation assessments

- Separate company-declared moderation performance from regulator-confirmed compliance outcomes.
- In EU analyses, track DSA preliminary findings and accepted commitments as separate states.
- Preserve distinction between:
  1. Global guideline enforcement behavior
  2. Jurisdiction-specific legal-illegality handling
- Include review of reporting, notice, appeal, and escalation paths when assessing procedural fairness risk.

---

## 5. Legacy Items Removed

The old v2024.1 escalation matrix values were retained neither as policy truth nor as regulator truth, because they were synthetic assumptions rather than source-backed operational standards.

---

## 6. Sources (primary)

1. TikTok Support: Privacy and safety settings for users under age 18  
   https://support.tiktok.com/en/safety-hc/account-and-user-safety/privacy-and-safety-settings-for-users-under-age-18
2. TikTok Support: Family Pairing  
   https://support.tiktok.com/en/safety-hc/account-and-user-safety/family-pairing
3. TikTok Support: Age requirements for LIVE, Gifts, and Wallet features  
   https://support.tiktok.com/en/live-gifts-wallet/tiktok-live/age-requirements-for-live-gifts-and-wallet-features
4. TikTok Support: Personalized ads and your data  
   https://support.tiktok.com/en/account-and-privacy/personalized-ads-and-data/personalized-ads-and-your-data
5. TikTok Newsroom (2025-03-11): New Ways We’re Supporting Teens and Families on TikTok  
   https://newsroom.tiktok.com/en-us/new-ways-were-supporting-teens-and-families-on-tiktok
6. TikTok Newsroom (2025-07-30): Continuing to support teen safety and wellbeing  
   https://newsroom.tiktok.com/en-us/continuing-to-support-teen-safety-and-wellbeing-on-tiktok
7. TikTok Privacy Policy (non-US, last updated 2025-07-08)  
   https://www.tiktok.com/legal/page/row/privacy-policy/en
8. TikTok US Privacy Policy (last updated 2024-08-19)  
   https://www.tiktok.com/legal/page/us/privacy-policy/en
9. TikTok Newsroom (2025-04-03): Furthering Data Security in Europe  
   https://newsroom.tiktok.com/en-eu/furthering-data-security-in-europe
10. USDS Newsroom (2025-02-07): Strengthening Data Security for the TikTok U.S. Community  
    https://usds.tiktok.com/usds-newsroom/strengthening-data-security-for-the-tiktok-u-s-community/
11. Irish DPC (2025-05-02): DPC announces final decision in TikTok inquiry  
    https://www.dataprotection.ie/en/news-media/press-releases/dpc-announces-final-decision-inquiry-tiktok
12. Irish DPC (2025-07-10): DPC announces inquiry into TikTok transfers to China  
    https://www.dataprotection.ie/en/news-media/press-releases/dpc-announces-inquiry-tiktok-transfers-personal-data-european-economic-area-servers-china
13. TikTok legal (EEA Terms): TikTok Shop terms differ by market  
    https://www.tiktok.com/legal/page/eea/terms-of-service/en
14. TikTok Shop Seller Terms Of Services (multi-country repository listing)  
    https://seller-us.tiktok.com/university/essay?default_language=en&knowledge_id=7619970931197738
15. TikTok Shop Seller Terms of Service (US, last updated January 22, 2026)  
    https://seller-us.tiktok.com/university/essay?knowledge_id=1331308753078058
16. TikTok Shop Logistics Terms (US, last updated January 22, 2026)  
    https://seller-us.tiktok.com/university/essay?default_language=en&knowledge_id=4036638573643562
17. TikTok Shop onboarding guide (US seller verification docs)  
    https://seller-us.tiktok.com/university/essay?knowledge_id=7388974101544913454
18. TikTok Shop Prohibited Products Policy (US)  
    https://seller-us.tiktok.com/university/essay?anchor_link=10C3FFFD&from=policy&identity=1&knowledge_id=1399532709988097&role=1
19. TikTok Shop Restricted Products Policy (US)  
    https://seller-us.tiktok.com/university/essay?default_language=en&knowledge_id=3238037484275457
20. TikTok Shop Product Listing Policy (US)  
    https://seller-us.tiktok.com/university/essay?anchor_link=EB6900D1&course_type=1&from=search&identity=1&knowledge_id=3196690250417921&role=1
21. TikTok Shop Dangerous Goods Policy (US)  
    https://seller-us.tiktok.com/university/essay?default_language=en&identity=1&knowledge_id=2297870046414638
22. TikTok Shop battery listing guidance (US)  
    https://seller-us.tiktok.com/university/essay?knowledge_id=1601290456188686
23. TikTok Shop Product Recall Policy (US)  
    https://seller-us.tiktok.com/university/essay?course_type=1&from=search&identity=1&knowledge_id=1439743821383425&role=1
24. TikTok Shop Customer Order Cancellation, Return, and Refund Policy (US)  
    https://seller-us.tiktok.com/university/essay?default_language=en&knowledge_id=3253210454181634
25. TikTok Shop Seller Policy Pulse (US; auto-cancellation update context)  
    https://seller-us.tiktok.com/university/essay?from=policy&identity=1&knowledge_id=6747273381791534&role=1
26. TikTok Newsroom: TikTok Shop launch in Ireland (2024-12-10)  
    https://newsroom.tiktok.com/tiktok-shop-in-ireland
27. TikTok Newsroom: TikTok Shop expansion to Germany/France/Italy (effective 2025-03-31)  
    https://newsroom.tiktok.com/es-es/expansion-tiktok-shop-europa-francia-italia-alemania
28. TikTok Community Guidelines (overview)  
    https://www.tiktok.com/community-guidelines/en/
29. TikTok Community Guidelines (enforcement)  
    https://www.tiktok.com/community-guidelines/en/enforcement
30. TikTok Newsroom: Community Guidelines update (2025-08-15)  
    https://newsroom.tiktok.com/community-guidelines-update-newsroom
31. TikTok Safety: Reporting (updated June 20, 2025)  
    https://www.tiktok.com/safety/en/reporting
32. TikTok Legal: Reporting illegal content (EEA/DSA flow)  
    https://www.tiktok.com/legal/page/global/reporting-illegal-content/en
33. TikTok Newsroom EU: DSA fifth transparency report (H1 2025)  
    https://newsroom.tiktok.com/en-eu/digital-services-act-our-fifth-transparency-report-on-content-moderation-in-europe
34. European Commission (2025-05-15): preliminary finding on TikTok ad repository under DSA  
    https://digital-strategy.ec.europa.eu/en/news/commission-preliminarily-finds-tiktoks-ad-repository-breach-digital-services-act
35. European Commission (2025-10-24): preliminary findings on data access for researchers under DSA  
    https://digital-strategy.ec.europa.eu/en/news/commission-preliminarily-finds-tiktok-and-meta-breach-their-transparency-obligations-under-digital
36. European Commission (2025-12-05): accepts TikTok commitments on ad transparency under DSA  
    https://digital-strategy.ec.europa.eu/en/news/commission-accepts-tiktoks-commitments-advertising-transparency-under-digital-services-act

---

## 7. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 2026.03 | 2026-02-07 | GovPulse Policy Ops | Expanded to source-backed full-domain baseline: Youth Safety + Data Privacy + E-commerce + Content Moderation |
| 2026.02 | 2026-02-07 | GovPulse Policy Ops | Replaced synthetic baseline with source-backed Youth Safety + Data Privacy baseline |
| 2024.1 | 2024-12-25 | Global Policy Team | Initial version (contained unverified generated assumptions) |
