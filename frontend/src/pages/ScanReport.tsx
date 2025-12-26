import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Globe,
  Shield,
  ShoppingCart,
  Database,
  ExternalLink,
  Target,
  Wrench,
  FileText,
  Send
} from 'lucide-react'
import clsx from 'clsx'
import { ScoutMission, ImpactAssessment, RISK_COLORS, MARKETS } from '../types'
import RiskBadge from '../components/RiskBadge'
import { formatDistanceToNow, format } from 'date-fns'

interface ScanReportProps {
  missions: ScoutMission[]
  assessments: ImpactAssessment[]
  onPushToPM: (assessmentId: string) => void
}

// User-friendly labels for domains
const DOMAIN_LABELS: Record<string, string> = {
  all: 'All Policy Areas',
  minor_protection: 'Youth Safety',
  ecommerce: 'Digital Commerce',
  data_sovereignty: 'Data & Privacy',
  content_moderation: 'Content Policy',
}

const domainIcons: Record<string, React.ElementType> = {
  minor_protection: Shield,
  ecommerce: ShoppingCart,
  data_sovereignty: Database,
  content_moderation: Globe,
  all: Globe
}

const severityColors = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  major: 'bg-orange-100 text-orange-800 border-orange-300',
  minor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
}

const severityLabels = {
  critical: 'Urgent',
  major: 'Important',
  minor: 'Low',
}

const effortColors = {
  S: 'bg-green-100 text-green-700',
  M: 'bg-blue-100 text-blue-700',
  L: 'bg-orange-100 text-orange-700',
  XL: 'bg-red-100 text-red-700',
}

const effortLabels = {
  S: 'Quick Fix (1-2 days)',
  M: 'Moderate (1-2 weeks)',
  L: 'Significant (1-2 months)',
  XL: 'Major Project (2+ months)',
}

export default function ScanReport({ missions, assessments, onPushToPM }: ScanReportProps) {
  const { missionId } = useParams()
  const navigate = useNavigate()
  const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set())

  // Find the mission
  const mission = missions.find(m => m.mission_id === missionId)
  
  // Find all assessments for this mission's signals
  const missionAssessments = mission 
    ? assessments.filter(a => 
        mission.signals.some(s => s.id === a.signal_id)
      )
    : []

  // Also try to match by timestamp prefix if signal_id matching fails
  const assessmentsByTimestamp = assessments.filter(a => 
    a.assessment_id.includes(missionId?.split('-').slice(1, 2).join('-') || 'NOMATCH') &&
    a.assessed_at.startsWith(mission?.created_at?.slice(0, 10) || 'NOMATCH')
  )

  // Combine both methods
  const relatedAssessments = missionAssessments.length > 0 
    ? missionAssessments 
    : assessmentsByTimestamp.length > 0 
      ? assessmentsByTimestamp
      : assessments.filter(a => {
          // Match by market and close timestamp
          if (!mission) return false
          const missionTime = new Date(mission.created_at).getTime()
          const assessTime = new Date(a.assessed_at).getTime()
          return a.market === mission.market && Math.abs(assessTime - missionTime) < 3600000 // within 1 hour
        })

  const togglePolicy = (assessmentId: string) => {
    setExpandedPolicies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(assessmentId)) {
        newSet.delete(assessmentId)
      } else {
        newSet.add(assessmentId)
      }
      return newSet
    })
  }

  // If no mission found, show list of all missions
  if (!mission) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scan Reports</h1>
          <p className="text-slate-600 mt-1">
            View complete scan results with all detected policy changes
          </p>
        </div>

        <div className="grid gap-4">
          {missions.map((m) => {
            const market = MARKETS.find(mk => mk.code === m.market)
            const DomainIcon = domainIcons[m.domain] || Globe
            const missionAssess = assessments.filter(a => 
              a.market === m.market && 
              Math.abs(new Date(a.assessed_at).getTime() - new Date(m.created_at).getTime()) < 3600000
            )
            const highestRisk = missionAssess.reduce((max, a) => {
              const riskOrder = ['P0', 'P1', 'P2', 'P3']
              return riskOrder.indexOf(a.risk_level) < riskOrder.indexOf(max) ? a.risk_level : max
            }, 'P3' as 'P0' | 'P1' | 'P2' | 'P3')

            return (
              <Link
                key={m.mission_id}
                to={`/reports/${m.mission_id}`}
                className="card hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{market?.flag || '🌐'}</div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {market?.name || m.market} Scan Report
                          </h3>
                          {missionAssess.length > 0 && (
                            <RiskBadge level={highestRisk} size="sm" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <DomainIcon className="w-4 h-4" />
                            {DOMAIN_LABELS[m.domain] || m.domain}
                          </span>
                          <span>•</span>
                          <span>{m.lookback_days} days</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <span className="text-govpulse-600 font-medium">
                            {m.signals.length} signals detected
                          </span>
                          <span className="text-slate-500">
                            {missionAssess.length} impact analyses
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </Link>
            )
          })}
          
          {missions.length === 0 && (
            <div className="card p-12 text-center">
              <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No scan reports yet</h3>
              <p className="text-slate-600 mb-4">Start a new scan to monitor policy changes</p>
              <Link to="/launch" className="btn-primary inline-flex">
                Start New Scan
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Mission detail view
  const market = MARKETS.find(mk => mk.code === mission.market)
  const DomainIcon = domainIcons[mission.domain] || Globe

  // Calculate summary stats
  const p0Count = relatedAssessments.filter(a => a.risk_level === 'P0').length
  const p1Count = relatedAssessments.filter(a => a.risk_level === 'P1').length
  const totalGaps = relatedAssessments.reduce((sum, a) => sum + a.compliance_gaps.length, 0)
  const totalRemediations = relatedAssessments.reduce((sum, a) => sum + a.remediations.length, 0)

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/reports')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to all reports
      </button>

      {/* Header */}
      <div className="card">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-start gap-4">
            <div className="text-5xl">{market?.flag || '🌐'}</div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {market?.name || mission.market} Scan Report
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <DomainIcon className="w-4 h-4" />
                  {DOMAIN_LABELS[mission.domain] || mission.domain}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {format(new Date(mission.created_at), 'PPpp')}
                </span>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  {mission.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-200">
          <div className="p-4 text-center">
            <div className="text-3xl font-bold text-slate-900">{mission.signals.length}</div>
            <div className="text-sm text-slate-600">Policies Detected</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-3xl font-bold text-red-600">{p0Count + p1Count}</div>
            <div className="text-sm text-slate-600">High Priority</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">{totalGaps}</div>
            <div className="text-sm text-slate-600">Compliance Gaps</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-3xl font-bold text-govpulse-600">{totalRemediations}</div>
            <div className="text-sm text-slate-600">Action Items</div>
          </div>
        </div>
      </div>

      {/* Detected Policies */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Detected Policy Changes ({relatedAssessments.length})
        </h2>
        
        <div className="space-y-4">
          {relatedAssessments.map((assessment) => {
            const isExpanded = expandedPolicies.has(assessment.assessment_id)
            
            return (
              <div key={assessment.assessment_id} className="card overflow-hidden">
                {/* Policy Header - Clickable */}
                <button
                  onClick={() => togglePolicy(assessment.assessment_id)}
                  className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={clsx(
                        'p-2 rounded-lg',
                        RISK_COLORS[assessment.risk_level].bg
                      )}>
                        <FileCheck className={clsx(
                          'w-5 h-5',
                          RISK_COLORS[assessment.risk_level].text
                        )} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <RiskBadge level={assessment.risk_level} size="sm" />
                          {assessment.pushed_to_pm && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              Reviewed
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-slate-900">
                          {assessment.signal_title}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                          {assessment.risk_rationale}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span>{assessment.compliance_gaps.length} gaps</span>
                          <span>{assessment.remediations.length} actions</span>
                          {assessment.deadline && (
                            <span className="text-red-600">
                              Deadline: {format(new Date(assessment.deadline), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={clsx(
                      'w-5 h-5 text-slate-400 transition-transform',
                      isExpanded && 'rotate-180'
                    )} />
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50">
                    {/* Business Impact */}
                    <div className="p-4 border-b border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4 text-govpulse-600" />
                        Business Impact
                      </h4>
                      <p className="text-sm text-slate-700">{assessment.business_impact}</p>
                    </div>

                    {/* Compliance Gaps */}
                    {assessment.compliance_gaps.length > 0 && (
                      <div className="p-4 border-b border-slate-200">
                        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          Compliance Gaps ({assessment.compliance_gaps.length})
                        </h4>
                        <div className="space-y-3">
                          {assessment.compliance_gaps.map((gap, idx) => (
                            <div key={gap.gap_id || idx} className="bg-white rounded-lg p-3 border border-slate-200">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <span className={clsx(
                                  'text-xs px-2 py-0.5 rounded border',
                                  severityColors[gap.gap_severity as keyof typeof severityColors]
                                )}>
                                  {severityLabels[gap.gap_severity as keyof typeof severityLabels] || gap.gap_severity}
                                </span>
                                {gap.is_blocking && (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                    Blocking
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-900">{gap.gap_description}</p>
                              <div className="mt-2 text-xs text-slate-500">
                                Policy: {gap.baseline_policy_id}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Actions */}
                    {assessment.remediations.length > 0 && (
                      <div className="p-4 border-b border-slate-200">
                        <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-govpulse-600" />
                          Recommended Actions ({assessment.remediations.length})
                        </h4>
                        <div className="space-y-3">
                          {assessment.remediations.map((rem, idx) => (
                            <div key={rem.remediation_id || idx} className="bg-white rounded-lg p-3 border border-slate-200">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h5 className="font-medium text-slate-900">{rem.title}</h5>
                                <span className={clsx(
                                  'text-xs px-2 py-0.5 rounded',
                                  effortColors[rem.engineering_effort as keyof typeof effortColors]
                                )}>
                                  {effortLabels[rem.engineering_effort as keyof typeof effortLabels] || rem.engineering_effort}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600">{rem.description}</p>
                              {rem.affected_features && rem.affected_features.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {rem.affected_features.map((feature, i) => (
                                    <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                      {feature}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="p-4 flex items-center justify-between">
                      <Link
                        to={`/analysis/${assessment.assessment_id}`}
                        className="text-sm text-govpulse-600 hover:text-govpulse-700 font-medium flex items-center gap-1"
                      >
                        View Full Analysis
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      {!assessment.pushed_to_pm && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onPushToPM(assessment.assessment_id)
                          }}
                          className="btn-primary text-sm py-1.5"
                        >
                          <Send className="w-4 h-4" />
                          Mark as Reviewed
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {relatedAssessments.length === 0 && mission.signals.length > 0 && (
            <div className="card p-8 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {mission.signals.length} signals detected
              </h3>
              <p className="text-slate-600">
                Impact analysis is being processed. Please check back shortly.
              </p>
            </div>
          )}

          {mission.signals.length === 0 && (
            <div className="card p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No policy changes detected</h3>
              <p className="text-slate-600">
                No relevant regulatory changes were found for this market and timeframe.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
