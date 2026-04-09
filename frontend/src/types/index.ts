// Domain types
export type Domain = 'minor_protection' | 'ecommerce' | 'data_sovereignty' | 'content_moderation' | 'all';

export type SourceType =
  | 'legislation'
  | 'executive_order'
  | 'regulatory_guidance'
  | 'court_ruling'
  | 'hearing_transcript'
  | 'draft_bill';

export type RiskLevel = 'P0' | 'P1' | 'P2' | 'P3';

export type MissionStatus = 'pending' | 'running' | 'completed' | 'failed';

export type RemediationType =
  | 'product_change'
  | 'policy_update'
  | 'legal_review'
  | 'infrastructure'
  | 'process_change'
  | 'monitoring';

// Core data structures
export interface RegulatorySignal {
  id: string;
  market: string;
  domain: Domain;
  source_type: SourceType;
  title: string;
  summary: string;
  source_url: string;
  published_date: string;
  effective_date: string | null;
  key_provisions: string[];
  affected_policies: string[];
  raw_text_excerpt: string;
  confidence_score: number;
}

export interface ScoutMission {
  mission_id: string;
  market: string;
  domain: Domain;
  lookback_days: number;
  created_at: string;
  created_by: string;
  status: MissionStatus;
  signals: RegulatorySignal[];
}

export interface ComplianceGap {
  gap_id: string;
  signal_id: string;
  baseline_policy_id: string;
  baseline_requirement: string;
  regulatory_requirement: string;
  gap_description: string;
  gap_severity: 'critical' | 'major' | 'minor';
  is_blocking: boolean;
}

export interface ProductRemediation {
  remediation_id: string;
  gap_id: string;
  remediation_type: RemediationType;
  title: string;
  description: string;
  affected_features: string[];
  engineering_effort: 'S' | 'M' | 'L' | 'XL';
  pm_owner_recommendation: string;
  acceptance_criteria: string[];
}

export interface ImpactAssessment {
  assessment_id: string;
  mission_id?: string | null;
  signal_id: string;
  signal_title: string;
  market: string;
  domain: string;
  risk_level: RiskLevel;
  risk_rationale: string;
  compliance_gaps: ComplianceGap[];
  remediations: ProductRemediation[];
  deadline: string | null;
  business_impact: string;
  recommended_actions: string[];
  assessed_at: string;
  assessed_by: string;
  pushed_to_pm?: boolean;
  pushed_at?: string;
}

// UI State types
export interface MissionLaunchParams {
  market: string;
  domain: Domain;
  lookback_days: number;
  trigger_event?: string;
}

export interface AuditLogEntry {
  id: string;
  mission_id: string;
  action: 'created' | 'completed' | 'pushed_to_pm' | 'archived';
  timestamp: string;
  user: string;
  details?: string;
}

// Market metadata
export interface MarketInfo {
  code: string;
  name: string;
  flag: string;
  tier: 1 | 2 | 3;
  active_regulations: number;
}

export const MARKETS: MarketInfo[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', tier: 1, active_regulations: 12 },
  { code: 'EU', name: 'European Union', flag: '🇪🇺', tier: 1, active_regulations: 8 },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', tier: 1, active_regulations: 5 },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', tier: 1, active_regulations: 4 },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', tier: 1, active_regulations: 3 },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', tier: 2, active_regulations: 4 },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', tier: 2, active_regulations: 3 },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', tier: 2, active_regulations: 2 },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', tier: 2, active_regulations: 2 },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', tier: 2, active_regulations: 1 },
];

export const DOMAINS: { value: Domain; label: string; icon: string }[] = [
  { value: 'all', label: 'All Domains', icon: 'Globe' },
  { value: 'minor_protection', label: 'Minor Protection', icon: 'Shield' },
  { value: 'ecommerce', label: 'E-Commerce', icon: 'ShoppingCart' },
  { value: 'data_sovereignty', label: 'Data Sovereignty', icon: 'Database' },
  { value: 'content_moderation', label: 'Content Moderation', icon: 'MessageSquare' },
];

export const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  P0: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500' },
  P1: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-500' },
  P2: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500' },
  P3: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' },
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  P0: 'Critical',
  P1: 'High',
  P2: 'Moderate',
  P3: 'Low',
};
