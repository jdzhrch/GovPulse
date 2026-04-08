import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Send,
  Clock,
  FileText,
  Wrench,
  ChevronRight,
  ArrowRight,
  Target,
  Shield,
  Filter,
  X,
  Image,
  Loader2
} from 'lucide-react'
import clsx from 'clsx'
import html2canvas from 'html2canvas'
import { ImpactAssessment, ComplianceGap, ProductRemediation, RISK_COLORS, MARKETS } from '../types'
import RiskBadge from '../components/RiskBadge'
import ShareCard from '../components/ShareCard'
import { formatDistanceToNow, format } from 'date-fns'
import { buildShareImageFilename } from '../brand'

// Helper to parse UTC timestamp correctly
const parseUTCDate = (timestamp: string): Date => {
  const dateStr = timestamp.endsWith('Z') || timestamp.includes('+') ? timestamp : timestamp + 'Z'
  return new Date(dateStr)
}

interface GapAnalysisProps {
  assessments: ImpactAssessment[]
  selectedAssessment: ImpactAssessment | null
  onSelectAssessment: (assessment: ImpactAssessment | null) => void
  onPushToPM: (assessmentId: string) => void
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

export default function GapAnalysis({
  assessments,
  selectedAssessment,
  onSelectAssessment,
  onPushToPM
}: GapAnalysisProps) {
  const { assessmentId } = useParams()
  const shareCardRef = useRef<HTMLDivElement>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)

  const handleShareAsImage = useCallback(async () => {
    if (!shareCardRef.current || !selectedAssessment) return
    setIsGeneratingImage(true)
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      })
      const slug = selectedAssessment.signal_title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40)
      const link = document.createElement('a')
      link.download = buildShareImageFilename(selectedAssessment.market, slug)
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Failed to generate image:', err)
    } finally {
      setIsGeneratingImage(false)
    }
  }, [selectedAssessment])

  // Filter states
  const [selectedMarket, setSelectedMarket] = useState<string>('all')
  const [selectedRisk, setSelectedRisk] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('all')
  
  // Get unique markets from assessments
  const availableMarkets = useMemo(() => {
    const marketSet = new Set(assessments.map(a => a.market))
    return Array.from(marketSet).sort()
  }, [assessments])
  
  // Filter assessments based on selected filters
  const filteredAssessments = useMemo(() => {
    return assessments.filter(a => {
      // Market filter
      if (selectedMarket !== 'all' && a.market !== selectedMarket) {
        return false
      }
      
      // Risk level filter
      if (selectedRisk !== 'all' && a.risk_level !== selectedRisk) {
        return false
      }
      
      // Date range filter
      if (dateRange !== 'all') {
        const assessDate = parseUTCDate(a.assessed_at)
        const now = new Date()
        const daysAgo = parseInt(dateRange)
        const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
        if (assessDate < cutoffDate) {
          return false
        }
      }
      
      return true
    })
  }, [assessments, selectedMarket, selectedRisk, dateRange])
  
  const hasActiveFilters = selectedMarket !== 'all' || selectedRisk !== 'all' || dateRange !== 'all'
  
  const clearFilters = () => {
    setSelectedMarket('all')
    setSelectedRisk('all')
    setDateRange('all')
  }

  useEffect(() => {
    if (assessmentId) {
      const assessment = assessments.find(a => a.assessment_id === assessmentId)
      if (assessment) {
        onSelectAssessment(assessment)
      }
    }
  }, [assessmentId, assessments, onSelectAssessment])

  // If no assessment selected, show list
  if (!selectedAssessment) {
    return (
      <div className="space-y-6">
        <section className="editorial-panel p-6 sm:p-8">
          <p className="section-kicker mb-3">Impact Briefing Archive</p>
          <h1 className="briefing-title">Review the policy reports that need attention.</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--ink-soft)]">
            Use the filters to narrow the archive, then open an individual report for the full gap analysis, remediation notes, and review actions.
          </p>
        </section>

        {/* Filters */}
        <div className="editorial-panel p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3 sm:mb-0 sm:hidden">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="section-kicker !tracking-[0.14em]">Filters</span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-govpulse-600 hover:text-govpulse-700 ml-auto"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="section-kicker !tracking-[0.14em]">Filters</span>
            </div>

            {/* Market Filter */}
            <div>
              <label htmlFor="market-filter" className="text-xs text-slate-500 mb-1 block sm:hidden">Market</label>
              <div className="flex items-center gap-2">
                <label htmlFor="market-filter" className="text-sm text-slate-600 hidden sm:block">Market:</label>
                <select
                  id="market-filter"
                  value={selectedMarket}
                  onChange={(e) => setSelectedMarket(e.target.value)}
                  className="select text-sm w-full sm:w-auto"
                >
                  <option value="all">All Markets</option>
                  {availableMarkets.map(code => {
                    const market = MARKETS.find(m => m.code === code)
                    return (
                      <option key={code} value={code}>
                        {market?.flag} {market?.name || code}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            {/* Risk Level Filter */}
            <div>
              <label htmlFor="risk-filter" className="text-xs text-slate-500 mb-1 block sm:hidden">Risk</label>
              <div className="flex items-center gap-2">
                <label htmlFor="risk-filter" className="text-sm text-slate-600 hidden sm:block">Risk:</label>
                <select
                  id="risk-filter"
                  value={selectedRisk}
                  onChange={(e) => setSelectedRisk(e.target.value)}
                  className="select text-sm w-full sm:w-auto"
                >
                  <option value="all">All Levels</option>
                  <option value="P0">P0 - Critical</option>
                  <option value="P1">P1 - High</option>
                  <option value="P2">P2 - Moderate</option>
                  <option value="P3">P3 - Low</option>
                </select>
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label htmlFor="date-filter" className="text-xs text-slate-500 mb-1 block sm:hidden">Time Range</label>
              <div className="flex items-center gap-2">
                <label htmlFor="date-filter" className="text-sm text-slate-600 hidden sm:block">Time Range:</label>
                <select
                  id="date-filter"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="select text-sm w-full sm:w-auto"
                >
                  <option value="all">All Time</option>
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                </select>
              </div>
            </div>

            {/* Clear Filters + Results Count */}
            <div className="col-span-2 flex items-center justify-between sm:col-span-1 sm:ml-auto sm:gap-4">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="hidden sm:flex items-center gap-1 text-sm text-govpulse-600 hover:text-govpulse-700"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </button>
              )}
              <div className="text-sm text-slate-500 ml-auto">
                {filteredAssessments.length} of {assessments.length} reports
              </div>
            </div>
          </div>
        </div>

        <div className="editorial-panel overflow-hidden">
          <div className="card-header bg-white/35">
            <p className="section-kicker mb-2">Report Archive</p>
            <h2 className="section-title text-[1.7rem]">Select a report</h2>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {filteredAssessments.map((assessment) => (
              <button
                key={assessment.assessment_id}
                onClick={() => onSelectAssessment(assessment)}
                className="report-list-row w-full text-left"
              >
                <span className={clsx(
                  'absolute left-0 top-4 bottom-4 w-1 rounded-r-full',
                  assessment.risk_level === 'P0' && 'bg-[var(--critical)]',
                  assessment.risk_level === 'P1' && 'bg-[var(--high)]',
                  assessment.risk_level === 'P2' && 'bg-[var(--moderate)]',
                  assessment.risk_level === 'P3' && 'bg-[var(--low)]',
                )} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={clsx(
                      'rounded-2xl border border-[var(--line)] p-2',
                      RISK_COLORS[assessment.risk_level].bg
                    )}>
                      <FileCheck className={clsx(
                        'w-5 h-5',
                        RISK_COLORS[assessment.risk_level].text
                      )} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <RiskBadge level={assessment.risk_level} size="sm" showLabel={false} />
                        <span className="font-medium text-[var(--ink)]">{assessment.market}</span>
                        {assessment.pushed_to_pm && (
                          <span className="status-stamp border-green-200 bg-white/70 text-[var(--low)]">
                            Reviewed
                          </span>
                        )}
                      </div>
                      <p className="font-serif text-[1.35rem] leading-tight text-[var(--ink)]">{assessment.signal_title}</p>
                      <p className="mt-2 text-sm text-[var(--ink-soft)]">
                        {assessment.compliance_gaps.length} action items • {assessment.remediations.length} recommendations
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </button>
            ))}
            
            {/* Empty state - no matching results */}
            {filteredAssessments.length === 0 && assessments.length > 0 && (
              <div className="p-12 text-center">
                <Filter className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No matching reports</h3>
                <p className="text-slate-600 mb-4">Try adjusting your filters to see more results</p>
                <button onClick={clearFilters} className="btn-secondary">
                  Clear Filters
                </button>
              </div>
            )}
            
            {/* Empty state - no data at all */}
            {assessments.length === 0 && (
              <div className="p-12 text-center">
                <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No impact reports yet</h3>
                <p className="text-slate-600">Run a scan to generate impact assessments</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Detailed assessment view with side-by-side comparison
  return (
    <div className="space-y-6">
      <section className="report-hero">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
          <button
            onClick={() => onSelectAssessment(null)}
            className="text-govpulse-600 hover:text-govpulse-700 text-sm mb-2 flex items-center gap-1"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to all reports
          </button>
            <p className="section-kicker mb-3">Impact Report</p>
            <h1 className="section-title text-[2.5rem] sm:text-[3rem]">{selectedAssessment.signal_title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <RiskBadge level={selectedAssessment.risk_level} />
              <span className="status-stamp">{selectedAssessment.market}</span>
              <span className="status-stamp">
              Analyzed {formatDistanceToNow(parseUTCDate(selectedAssessment.assessed_at), { addSuffix: true })}
            </span>
          </div>
        </div>
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            <button
              onClick={handleShareAsImage}
              disabled={isGeneratingImage}
              className="btn-secondary"
            >
              {isGeneratingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Image className="w-4 h-4" />
              )}
              {isGeneratingImage ? 'Generating...' : 'Share as Image'}
            </button>
            {selectedAssessment.pushed_to_pm ? (
              <span className="status-stamp border-green-200 bg-white/70 text-[var(--low)]">
                <CheckCircle className="w-4 h-4" />
                Reviewed
                <span className="text-[11px] tracking-normal normal-case">
                  {selectedAssessment.pushed_at && format(parseUTCDate(selectedAssessment.pushed_at), 'MMM d, HH:mm')}
                </span>
              </span>
            ) : (
              <button
                onClick={() => onPushToPM(selectedAssessment.assessment_id)}
                className="btn-primary"
              >
                <Send className="w-4 h-4" />
                Mark as Reviewed
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <div className="report-summary-grid">
        <div className={clsx('editorial-panel p-5', `risk-${selectedAssessment.risk_level.toLowerCase()}`)}>
          <p className="section-kicker mb-2 !text-current/70">Risk Summary</p>
          <p className="text-[15px] leading-7 font-medium">{selectedAssessment.risk_rationale}</p>
        </div>
        <div className="editorial-panel p-5">
          <p className="section-kicker mb-2">Business Impact</p>
          <p className="text-[15px] leading-7 text-[var(--ink)]">{selectedAssessment.business_impact}</p>
        </div>
        <div className="editorial-panel p-5">
          <p className="section-kicker mb-2">Action Deadline</p>
          <p className="mt-1 flex items-center gap-2 text-[var(--ink)]">
            <Clock className="w-4 h-4 text-[var(--ink-soft)]" />
            {selectedAssessment.deadline
              ? format(parseUTCDate(selectedAssessment.deadline), 'MMMM d, yyyy')
              : 'No fixed deadline'}
          </p>
        </div>
      </div>

      {/* Action Items - Side by Side View */}
      <div className="editorial-panel">
        <div className="card-header">
          <p className="section-kicker mb-2">Gap Analysis</p>
          <h2 className="section-title text-[1.9rem] flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[var(--accent)]" />
            What changed vs. current practice
          </h2>
        </div>
        <div className="p-4">
          {selectedAssessment.compliance_gaps.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <p>No action items detected - current practices align with new requirements</p>
            </div>
          ) : (
            <div className="space-y-6">
              {selectedAssessment.compliance_gaps.map((gap) => (
                <GapComparisonCard key={gap.gap_id} gap={gap} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Remediations */}
      <div className="editorial-panel">
        <div className="card-header">
          <p className="section-kicker mb-2">Recommended Response</p>
          <h2 className="section-title text-[1.9rem] flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[var(--accent)]" />
            Recommended Changes
          </h2>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {selectedAssessment.remediations.map((remediation) => (
            <RemediationCard key={remediation.remediation_id} remediation={remediation} />
          ))}
        </div>
      </div>

      {/* Recommended Actions */}
      <div className="editorial-panel">
        <div className="card-header">
          <p className="section-kicker mb-2">Execution</p>
          <h2 className="section-title text-[1.9rem] flex items-center gap-2">
            <Target className="w-5 h-5 text-[var(--accent)]" />
            Next Steps
          </h2>
        </div>
        <div className="card-body">
          <ul className="space-y-3">
            {selectedAssessment.recommended_actions.map((action, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full border border-[var(--line-strong)] bg-white text-[var(--accent)] flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-slate-700">{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Hidden ShareCard for image generation */}
      <div style={{ position: 'fixed', left: -9999, top: 0 }} aria-hidden="true">
        <ShareCard ref={shareCardRef} assessment={selectedAssessment} />
      </div>
    </div>
  )
}

// Gap Comparison Card Component
function GapComparisonCard({ gap }: { gap: ComplianceGap }) {
  return (
    <div className={clsx(
      'overflow-hidden rounded-[1.4rem] border-2 bg-white/55',
      gap.is_blocking ? 'border-red-300' : 'border-[var(--line)]'
    )}>
      {/* Header */}
      <div className="bg-[rgba(244,239,230,0.72)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={clsx(
            'px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.08em]',
            severityColors[gap.gap_severity]
          )}>
            {severityLabels[gap.gap_severity]}
          </span>
          <span className="font-mono text-sm text-[var(--ink-soft)]">{gap.baseline_policy_id}</span>
          {gap.is_blocking && (
            <span className="status-stamp border-red-200 bg-white/70 text-[#7d2d21]">
              <AlertTriangle className="w-3 h-3" />
              Immediate Action Required
            </span>
          )}
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="gap-comparison p-4">
        {/* Current Practice */}
        <div className="rounded-2xl border border-amber-200 bg-[var(--high-soft)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-[#8a531c]" />
            <span className="text-sm font-medium text-[#8a531c]">Current Practice</span>
          </div>
          <p className="text-[#6f4620]">{gap.baseline_requirement}</p>
        </div>

        {/* Arrow indicator (hidden on mobile) */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full border-2 border-[var(--line-strong)] items-center justify-center z-10">
          <ArrowRight className="w-4 h-4 text-[var(--ink-soft)]" />
        </div>

        {/* New Requirement */}
        <div className="rounded-2xl border border-[var(--line-strong)] bg-[var(--accent-soft)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-sm font-medium text-[var(--accent)]">New Requirement</span>
          </div>
          <p className="text-[var(--accent-deep)]">{gap.regulatory_requirement}</p>
        </div>
      </div>

      {/* Gap Description */}
      <div className="px-4 pb-4">
        <div className="rounded-2xl border border-[var(--line)] bg-[rgba(244,239,230,0.5)] p-4">
          <p className="text-sm leading-6 text-[var(--ink)]">
            <strong>What needs to change:</strong> {gap.gap_description}
          </p>
        </div>
      </div>
    </div>
  )
}

// Remediation Card Component
function RemediationCard({ remediation }: { remediation: ProductRemediation }) {
  return (
    <div className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={clsx(
              'px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.08em]',
              effortColors[remediation.engineering_effort]
            )}>
              {effortLabels[remediation.engineering_effort]}
            </span>
            <span className="status-stamp text-[10px]">
              {remediation.remediation_type.replace('_', ' ')}
            </span>
          </div>
          <h3 className="font-serif text-[1.35rem] leading-tight text-[var(--ink)]">{remediation.title}</h3>
          <p className="text-sm leading-6 text-[var(--ink-soft)] mt-2 whitespace-pre-line">{remediation.description}</p>

          {/* Affected Features */}
          <div className="mt-3">
            <p className="label !mb-2">Products / Services Affected</p>
            <div className="flex flex-wrap gap-1">
              {remediation.affected_features.map((feature, i) => (
                <span key={i} className="status-stamp text-[10px]">
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* Acceptance Criteria */}
          <div className="mt-3">
            <p className="label !mb-2">How to verify completion</p>
            <ul className="space-y-1">
              {remediation.acceptance_criteria.map((criteria, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                  {criteria}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="sm:text-right flex-shrink-0 border-t border-[var(--line)] sm:border-t-0 pt-3 sm:pt-0">
          <p className="label !mb-1">Suggested Owner</p>
          <p className="text-sm font-medium text-[var(--ink)]">{remediation.pm_owner_recommendation}</p>
        </div>
      </div>
    </div>
  )
}
