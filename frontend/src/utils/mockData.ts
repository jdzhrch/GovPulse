import { ScoutMission, ImpactAssessment, RegulatorySignal, ComplianceGap, ProductRemediation } from '../types'

// Mock regulatory signals
const mockSignals: RegulatorySignal[] = [
  {
    id: 'US-MP-2024-001',
    market: 'US',
    domain: 'minor_protection',
    source_type: 'legislation',
    title: 'Kids Online Safety Act (KOSA) - Senate Version',
    summary: 'Mandates platforms implement "duty of care" for minors, requires opt-out of algorithmic recommendations for users under 17, and mandates parental tools.',
    source_url: 'https://www.congress.gov/bill/118th-congress/senate-bill/1409',
    published_date: '2024-07-30',
    effective_date: '2025-07-01',
    key_provisions: [
      'Duty of care standard for platforms with minor users',
      'Algorithmic amplification opt-out required for <17',
      'Mandatory parental notification features',
      'Design features to reduce addictive usage patterns',
      'Third-party audit requirements'
    ],
    affected_policies: ['MP-012', 'MP-010', 'MP-030', 'MP-031'],
    raw_text_excerpt: 'SEC. 3. DUTY OF CARE. A covered platform shall act in the best interests of a minor...',
    confidence_score: 0.95
  },
  {
    id: 'ID-EC-2024-001',
    market: 'ID',
    domain: 'ecommerce',
    source_type: 'regulatory_guidance',
    title: 'Minister of Trade Regulation 31/2023 - Social Commerce Separation',
    summary: 'Mandates complete separation of social media and e-commerce functionalities. TikTok Shop must operate as independent app.',
    source_url: 'https://jdih.kemendag.go.id/peraturan/detail/2340',
    published_date: '2023-09-27',
    effective_date: '2023-10-04',
    key_provisions: [
      'Social media platforms cannot facilitate direct transactions',
      'E-commerce must be separate application',
      'Minimum price floor of IDR 100,000 for imports',
      'Local business partnership requirements'
    ],
    affected_policies: ['EC-001', 'EC-002', 'EC-003', 'EC-030'],
    raw_text_excerpt: 'Penyelenggara Perdagangan Melalui Sistem Elektronik dilarang...',
    confidence_score: 0.99
  },
  {
    id: 'EU-DS-2024-001',
    market: 'EU',
    domain: 'data_sovereignty',
    source_type: 'court_ruling',
    title: 'CJEU Schrems III Preliminary Ruling',
    summary: 'Court questions adequacy of EU-US Data Privacy Framework, may require additional safeguards for transfers.',
    source_url: 'https://curia.europa.eu/juris/liste.jsf',
    published_date: '2024-11-15',
    effective_date: null,
    key_provisions: [
      'DPF adequacy under review',
      'Supplementary measures may be required',
      'Impact on Project Texas commitments',
      'Potential need for EU-only data architecture'
    ],
    affected_policies: ['DS-010', 'DS-020', 'DS-021'],
    raw_text_excerpt: 'The referring court asks whether the Commission\'s adequacy decision...',
    confidence_score: 0.72
  }
]

// Mock missions
export const mockMissions: ScoutMission[] = [
  {
    mission_id: 'MISSION-US-20241225120000',
    market: 'US',
    domain: 'minor_protection',
    lookback_days: 90,
    created_at: '2024-12-25T12:00:00Z',
    created_by: 'policy_analyst_1',
    status: 'completed',
    signals: [mockSignals[0]]
  },
  {
    mission_id: 'MISSION-ID-20241224100000',
    market: 'ID',
    domain: 'ecommerce',
    lookback_days: 365,
    created_at: '2024-12-24T10:00:00Z',
    created_by: 'apac_policy_lead',
    status: 'completed',
    signals: [mockSignals[1]]
  },
  {
    mission_id: 'MISSION-EU-20241223090000',
    market: 'EU',
    domain: 'data_sovereignty',
    lookback_days: 180,
    created_at: '2024-12-23T09:00:00Z',
    created_by: 'eu_policy_counsel',
    status: 'completed',
    signals: [mockSignals[2]]
  }
]

// Mock compliance gaps
const mockGaps: Record<string, ComplianceGap[]> = {
  'US-MP-2024-001': [
    {
      gap_id: 'GAP-US-MP-2024-001-MP-012-0',
      signal_id: 'US-MP-2024-001',
      baseline_policy_id: 'MP-012',
      baseline_requirement: 'Reduced personalization for <16',
      regulatory_requirement: 'Algorithmic amplification opt-out required for <17',
      gap_description: 'New regulation expands age threshold from 16 to 17 and requires explicit opt-out mechanism rather than reduced personalization.',
      gap_severity: 'major',
      is_blocking: false
    },
    {
      gap_id: 'GAP-US-MP-2024-001-MP-010-1',
      signal_id: 'US-MP-2024-001',
      baseline_policy_id: 'MP-010',
      baseline_requirement: '60-min default for <18, with bypass code',
      regulatory_requirement: 'Design features to reduce addictive usage patterns',
      gap_description: 'KOSA requires broader "addictive design" restrictions beyond simple time limits.',
      gap_severity: 'major',
      is_blocking: false
    }
  ],
  'ID-EC-2024-001': [
    {
      gap_id: 'GAP-ID-EC-2024-001-EC-001-0',
      signal_id: 'ID-EC-2024-001',
      baseline_policy_id: 'EC-001',
      baseline_requirement: 'Content feed ≠ Transaction interface (separation logic)',
      regulatory_requirement: 'Social media platforms cannot facilitate direct transactions',
      gap_description: 'Indonesia requires COMPLETE separation - separate app required, not just UI separation.',
      gap_severity: 'critical',
      is_blocking: true
    }
  ],
  'EU-DS-2024-001': [
    {
      gap_id: 'GAP-EU-DS-2024-001-DS-010-0',
      signal_id: 'EU-DS-2024-001',
      baseline_policy_id: 'DS-010',
      baseline_requirement: 'EU-US Data Privacy Framework + SCCs',
      regulatory_requirement: 'DPF adequacy under review - supplementary measures may be required',
      gap_description: 'Current DPF reliance may be insufficient if Schrems III invalidates adequacy decision.',
      gap_severity: 'critical',
      is_blocking: true
    }
  ]
}

// Mock remediations
const mockRemediations: Record<string, ProductRemediation[]> = {
  'US-MP-2024-001': [
    {
      remediation_id: 'REM-GAP-US-MP-2024-001-MP-012-0',
      gap_id: 'GAP-US-MP-2024-001-MP-012-0',
      remediation_type: 'product_change',
      title: 'Implement Algorithm Opt-Out for Under-17 Users',
      description: 'Add prominent toggle in settings allowing users under 17 to completely opt out of personalized recommendations. Default to chronological feed when opted out.',
      affected_features: ['For You Page', 'Recommendation Algorithm', 'Settings UI'],
      engineering_effort: 'L',
      pm_owner_recommendation: 'Trust & Safety PM',
      acceptance_criteria: [
        'Toggle visible in privacy settings for users aged 13-16',
        'When enabled, FYP shows chronological following feed only',
        'Analytics dashboard tracks opt-out rates by age cohort',
        'Legal review signed off'
      ]
    },
    {
      remediation_id: 'REM-GAP-US-MP-2024-001-MP-010-1',
      gap_id: 'GAP-US-MP-2024-001-MP-010-1',
      remediation_type: 'product_change',
      title: 'Enhanced Digital Wellbeing Features',
      description: 'Expand screen time management beyond simple limits. Add break reminders, session summaries, and reduced infinite scroll mechanics for minor users.',
      affected_features: ['Digital Wellbeing', 'Feed Mechanics', 'Push Notifications'],
      engineering_effort: 'XL',
      pm_owner_recommendation: 'Trust & Safety PM',
      acceptance_criteria: [
        'Break reminder every 30 minutes for <17 users',
        'Session summary modal after 60 minutes',
        'Reduced infinite scroll - pagination for <17',
        'Parent dashboard integration',
        'Quarterly audit report capability'
      ]
    }
  ],
  'ID-EC-2024-001': [
    {
      remediation_id: 'REM-GAP-ID-EC-2024-001-EC-001-0',
      gap_id: 'GAP-ID-EC-2024-001-EC-001-0',
      remediation_type: 'infrastructure',
      title: 'Launch Standalone TikTok Shop Indonesia App',
      description: 'Create and launch separate TikTok Shop application for Indonesia market. Integrate with Tokopedia partnership. Remove all direct commerce from main TikTok app in ID.',
      affected_features: ['TikTok Shop', 'In-App Commerce', 'Checkout Flow', 'Indonesia Market'],
      engineering_effort: 'XL',
      pm_owner_recommendation: 'Commerce PM',
      acceptance_criteria: [
        'Separate APK/IPA for TikTok Shop ID',
        'No product purchase capability in main TikTok app for ID users',
        'Tokopedia integration complete',
        'Seller migration path documented',
        'Ministry of Trade approval obtained'
      ]
    }
  ],
  'EU-DS-2024-001': [
    {
      remediation_id: 'REM-GAP-EU-DS-2024-001-DS-010-0',
      gap_id: 'GAP-EU-DS-2024-001-DS-010-0',
      remediation_type: 'infrastructure',
      title: 'EU Data Localization Contingency Architecture',
      description: 'Design and prepare EU-only data architecture as contingency if Schrems III invalidates DPF. Expand Dublin/Norway data centers to handle full EU data residency.',
      affected_features: ['Data Pipeline', 'Cross-Border Transfer', 'Infrastructure'],
      engineering_effort: 'XL',
      pm_owner_recommendation: 'Privacy PM',
      acceptance_criteria: [
        'Architecture design approved by DPO',
        'Dublin DC capacity expanded by 40%',
        'Data residency switch capability tested',
        'CJEU monitoring process established',
        'Regulatory engagement plan documented'
      ]
    }
  ]
}

// Mock assessments
export const mockAssessments: ImpactAssessment[] = [
  {
    assessment_id: 'IMPACT-US-MP-2024-001-20241225120500',
    signal_id: 'US-MP-2024-001',
    signal_title: 'Kids Online Safety Act (KOSA) - Senate Version',
    market: 'US',
    domain: 'minor_protection',
    risk_level: 'P1',
    risk_rationale: 'Material compliance gap: 2 major conflicts requiring product changes before July 2025 effective date.',
    compliance_gaps: mockGaps['US-MP-2024-001'],
    remediations: mockRemediations['US-MP-2024-001'],
    deadline: '2025-07-01',
    business_impact: 'HIGH: Material product changes required for US. Estimated impact to feature roadmap: 2-3 quarters. Cross-functional mobilization needed.',
    recommended_actions: [
      'Schedule executive briefing on KOSA requirements',
      'Convene cross-functional war room (Policy, Legal, Product, Eng)',
      'Draft compliance roadmap with deadline: 2025-07-01',
      'Create JIRA epic for 2 compliance gaps',
      'Monitor US regulatory developments'
    ],
    assessed_at: '2024-12-25T12:05:00Z',
    assessed_by: 'policy_analyst_1',
    pushed_to_pm: false
  },
  {
    assessment_id: 'IMPACT-ID-EC-2024-001-20241224103000',
    signal_id: 'ID-EC-2024-001',
    signal_title: 'Minister of Trade Regulation 31/2023 - Social Commerce Separation',
    market: 'ID',
    domain: 'ecommerce',
    risk_level: 'P0',
    risk_rationale: 'Existential threat: regulation prohibits core TikTok Shop functionality in Indonesia market.',
    compliance_gaps: mockGaps['ID-EC-2024-001'],
    remediations: mockRemediations['ID-EC-2024-001'],
    deadline: '2023-10-04',
    business_impact: 'CRITICAL: ID market operations at risk. Potential revenue impact: 100% of ID GMV. Immediate executive escalation required.',
    recommended_actions: [
      'URGENT: Executive briefing on Indonesia e-commerce ban',
      'Accelerate Tokopedia partnership integration',
      'Launch standalone TikTok Shop ID app',
      'Engage Ministry of Trade directly',
      'Prepare seller communication strategy'
    ],
    assessed_at: '2024-12-24T10:30:00Z',
    assessed_by: 'apac_policy_lead',
    pushed_to_pm: true,
    pushed_at: '2024-12-24T11:00:00Z'
  },
  {
    assessment_id: 'IMPACT-EU-DS-2024-001-20241223093000',
    signal_id: 'EU-DS-2024-001',
    signal_title: 'CJEU Schrems III Preliminary Ruling',
    market: 'EU',
    domain: 'data_sovereignty',
    risk_level: 'P1',
    risk_rationale: 'Material compliance gap: DPF reliance creates existential risk if adequacy invalidated.',
    compliance_gaps: mockGaps['EU-DS-2024-001'],
    remediations: mockRemediations['EU-DS-2024-001'],
    deadline: null,
    business_impact: 'HIGH: Material infrastructure changes may be required for EU. Estimated impact to feature roadmap: 2-3 quarters. Cross-functional mobilization needed.',
    recommended_actions: [
      'Schedule DPO briefing on Schrems III implications',
      'Engage EU data protection counsel',
      'Begin EU localization architecture planning',
      'Monitor CJEU proceedings',
      'Prepare contingency communication for EU users'
    ],
    assessed_at: '2024-12-23T09:30:00Z',
    assessed_by: 'eu_policy_counsel',
    pushed_to_pm: false
  }
]

// Helper to generate new mission
export function createMockMission(
  market: string,
  domain: string,
  lookbackDays: number,
  createdBy: string
): ScoutMission {
  const now = new Date()
  const missionId = `MISSION-${market}-${now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`

  // Find relevant signals for this market/domain
  const relevantSignals = mockSignals.filter(
    s => s.market === market && (domain === 'all' || s.domain === domain)
  )

  return {
    mission_id: missionId,
    market,
    domain: domain as ScoutMission['domain'],
    lookback_days: lookbackDays,
    created_at: now.toISOString(),
    created_by: createdBy,
    status: 'completed',
    signals: relevantSignals
  }
}

// Helper to generate assessment for a signal
export function createMockAssessment(
  signal: RegulatorySignal,
  assessedBy: string
): ImpactAssessment {
  const now = new Date()
  const assessmentId = `IMPACT-${signal.id}-${now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`

  const gaps = mockGaps[signal.id] || []
  const remediations = mockRemediations[signal.id] || []

  // Determine risk level based on gaps
  let riskLevel: ImpactAssessment['risk_level'] = 'P3'
  let riskRationale = 'Low risk: monitoring recommended.'

  const criticalGaps = gaps.filter(g => g.gap_severity === 'critical')
  const majorGaps = gaps.filter(g => g.gap_severity === 'major')

  if (criticalGaps.length > 0) {
    riskLevel = 'P0'
    riskRationale = `Existential threat: ${criticalGaps.length} critical compliance gaps requiring immediate action.`
  } else if (majorGaps.length > 0) {
    riskLevel = 'P1'
    riskRationale = `Material compliance gap: ${majorGaps.length} major conflicts requiring product changes.`
  } else if (gaps.length > 0) {
    riskLevel = 'P2'
    riskRationale = `Moderate risk: ${gaps.length} gaps requiring quarterly remediation.`
  }

  return {
    assessment_id: assessmentId,
    signal_id: signal.id,
    signal_title: signal.title,
    market: signal.market,
    domain: signal.domain,
    risk_level: riskLevel,
    risk_rationale: riskRationale,
    compliance_gaps: gaps,
    remediations: remediations,
    deadline: signal.effective_date,
    business_impact: `Impact assessment for ${signal.market} ${signal.domain} regulation.`,
    recommended_actions: [
      `Review ${signal.title}`,
      'Schedule cross-functional review',
      'Update compliance roadmap'
    ],
    assessed_at: now.toISOString(),
    assessed_by: assessedBy,
    pushed_to_pm: false
  }
}
