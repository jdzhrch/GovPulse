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
import { QRCodeSVG } from 'qrcode.react'
import { ImpactAssessment, ComplianceGap, ProductRemediation, RISK_COLORS, MARKETS } from '../types'
import RiskBadge from '../components/RiskBadge'
import { formatDistanceToNow, format } from 'date-fns'

// Helper to parse UTC timestamp correctly
const parseUTCDate = (timestamp: string): Date => {
  const dateStr = timestamp.endsWith('Z') || timestamp.includes('+') ? timestamp : timestamp + 'Z'
  return new Date(dateStr)
}

const SITE_BASE = 'https://jdzhrch.github.io/GovPulse'

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
  const contentRef = useRef<HTMLDivElement>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const reportUrl = selectedAssessment
    ? `${SITE_BASE}/analysis/${selectedAssessment.assessment_id}`
    : ''

  const handleShareAsImage = useCallback(async () => {
    if (!contentRef.current || !selectedAssessment) return
    setIsGeneratingImage(true)
    setIsCapturing(true)
    // Wait for QR footer to render
    await new Promise(r => setTimeout(r, 100))

    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        backgroundColor: '#f8fafc',
        useCORS: true,
      })
      const slug = selectedAssessment.signal_title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40)
      const link = document.createElement('a')
      link.download = `GovPulse-${selectedAssessment.market}-${slug}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Failed to generate image:', err)
    } finally {
      setIsCapturing(false)
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
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Impact Reports</h1>
          <p className="text-slate-600 mt-1">
            Review how regulatory changes affect your operations
          </p>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3 sm:mb-0 sm:hidden">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filters</span>
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
              <span className="text-sm font-medium text-slate-700">Filters:</span>
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
                  className="text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-govpulse-500 focus:border-govpulse-500 w-full sm:w-auto"
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
                  className="text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-govpulse-500 focus:border-govpulse-500 w-full sm:w-auto"
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
                  className="text-sm border border-slate-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-govpulse-500 focus:border-govpulse-500 w-full sm:w-auto"
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

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-slate-900">Select a Report</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {filteredAssessments.map((assessment) => (
              <button
                key={assessment.assessment_id}
                onClick={() => onSelectAssessment(assessment)}
                className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
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
                        <RiskBadge level={assessment.risk_level} size="sm" showLabel={false} />
                        <span className="font-medium text-slate-900">{assessment.market}</span>
                        {assessment.pushed_to_pm && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Reviewed
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700">{assessment.signal_title}</p>
                      <p className="text-sm text-slate-500 mt-1">
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
      {/* Top bar with navigation and actions — not included in screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => onSelectAssessment(null)}
          className="text-govpulse-600 hover:text-govpulse-700 text-sm flex items-center gap-1 self-start"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to all reports
        </button>
        <div className="flex flex-wrap items-center gap-3">
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
            <span className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              Reviewed
              <span className="text-sm text-green-500">
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

      {/* Report content — captured as screenshot for sharing */}
      <div ref={contentRef} className="space-y-6">
        {/* Title + Metadata */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{selectedAssessment.signal_title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            <RiskBadge level={selectedAssessment.risk_level} />
            <span className="text-slate-500">{selectedAssessment.market}</span>
            <span className="text-slate-500">
              Analyzed {formatDistanceToNow(parseUTCDate(selectedAssessment.assessed_at), { addSuffix: true })}
            </span>
          </div>
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={clsx('card p-4', `risk-${selectedAssessment.risk_level.toLowerCase()}`)}>
          <h3 className="text-sm font-medium opacity-75">Risk Summary</h3>
          <p className="mt-1 font-medium">{selectedAssessment.risk_rationale}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-slate-500">Business Impact</h3>
          <p className="mt-1 text-slate-900">{selectedAssessment.business_impact}</p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-slate-500">Action Deadline</h3>
          <p className="mt-1 text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            {selectedAssessment.deadline
              ? format(parseUTCDate(selectedAssessment.deadline), 'MMMM d, yyyy')
              : 'No fixed deadline'}
          </p>
        </div>
      </div>

      {/* Action Items - Side by Side View */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-govpulse-600" />
            What Changed vs. Current Practice
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
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-govpulse-600" />
            Recommended Changes
          </h2>
        </div>
        <div className="divide-y divide-slate-200">
          {selectedAssessment.remediations.map((remediation) => (
            <RemediationCard key={remediation.remediation_id} remediation={remediation} />
          ))}
        </div>
      </div>

      {/* Recommended Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-govpulse-600" />
            Next Steps
          </h2>
        </div>
        <div className="card-body">
          <ul className="space-y-3">
            {selectedAssessment.recommended_actions.map((action, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-govpulse-100 text-govpulse-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-slate-700">{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

        {/* QR Footer — visible only during image capture */}
        {isCapturing && (
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Scan to view full report</p>
                <p className="text-xs text-slate-400 mt-1">
                  Generated by GovPulse · {format(new Date(), 'MMM d, yyyy')}
                </p>
                <p className="text-[10px] text-slate-300 mt-2 break-all max-w-[300px]">
                  {reportUrl}
                </p>
              </div>
              <QRCodeSVG
                value={reportUrl}
                size={72}
                level="M"
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Gap Comparison Card Component
function GapComparisonCard({ gap }: { gap: ComplianceGap }) {
  return (
    <div className={clsx(
      'rounded-lg border-2 overflow-hidden',
      gap.is_blocking ? 'border-red-300' : 'border-slate-200'
    )}>
      {/* Header */}
      <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={clsx(
            'px-2 py-0.5 rounded text-xs font-medium uppercase',
            severityColors[gap.gap_severity]
          )}>
            {severityLabels[gap.gap_severity]}
          </span>
          <span className="font-mono text-sm text-slate-600">{gap.baseline_policy_id}</span>
          {gap.is_blocking && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Immediate Action Required
            </span>
          )}
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="gap-comparison p-4">
        {/* Current Practice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Current Practice</span>
          </div>
          <p className="text-amber-900">{gap.baseline_requirement}</p>
        </div>

        {/* Arrow indicator (hidden on mobile) */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full border-2 border-slate-300 items-center justify-center z-10">
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* New Requirement */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">New Requirement</span>
          </div>
          <p className="text-blue-900">{gap.regulatory_requirement}</p>
        </div>
      </div>

      {/* Gap Description */}
      <div className="px-4 pb-4">
        <div className="bg-slate-100 rounded-lg p-3">
          <p className="text-sm text-slate-700">
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
    <div className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={clsx(
              'px-2 py-0.5 rounded text-xs font-medium',
              effortColors[remediation.engineering_effort]
            )}>
              {effortLabels[remediation.engineering_effort]}
            </span>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {remediation.remediation_type.replace('_', ' ')}
            </span>
          </div>
          <h3 className="font-medium text-slate-900">{remediation.title}</h3>
          <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{remediation.description}</p>

          {/* Affected Features */}
          <div className="mt-3">
            <p className="text-xs text-slate-500 mb-1">Products/Services Affected:</p>
            <div className="flex flex-wrap gap-1">
              {remediation.affected_features.map((feature, i) => (
                <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* Acceptance Criteria */}
          <div className="mt-3">
            <p className="text-xs text-slate-500 mb-1">How to verify completion:</p>
            <ul className="space-y-1">
              {remediation.acceptance_criteria.map((criteria, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  {criteria}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="sm:text-right flex-shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
          <p className="text-xs text-slate-500">Suggested Owner</p>
          <p className="text-sm font-medium text-slate-900">{remediation.pm_owner_recommendation}</p>
        </div>
      </div>
    </div>
  )
}
