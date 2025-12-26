import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  History,
  CheckCircle,
  Search,
  Calendar,
  ChevronDown,
  ExternalLink,
  Clock,
  User,
  Globe,
  Shield,
  ShoppingCart,
  Database,
  FileText
} from 'lucide-react'
import clsx from 'clsx'
import { ScoutMission, ImpactAssessment, MARKETS } from '../types'
import RiskBadge from '../components/RiskBadge'
import { format, formatDistanceToNow } from 'date-fns'

interface AuditTrailProps {
  missions: ScoutMission[]
  assessments: ImpactAssessment[]
  onPushToPM: (assessmentId: string) => void
}

type ViewMode = 'timeline' | 'scans' | 'reports'
type FilterStatus = 'all' | 'pending' | 'reviewed'

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

export default function AuditTrail({ missions, assessments, onPushToPM }: AuditTrailProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterMarket, setFilterMarket] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter assessments
  const filteredAssessments = assessments.filter((a) => {
    if (filterStatus === 'pending' && a.pushed_to_pm) return false
    if (filterStatus === 'reviewed' && !a.pushed_to_pm) return false
    if (filterMarket !== 'all' && a.market !== filterMarket) return false
    if (searchQuery && !a.signal_title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Build timeline events
  const timelineEvents = [
    ...missions.map(m => ({
      type: 'scan' as const,
      id: m.mission_id,
      timestamp: m.created_at,
      data: m
    })),
    ...assessments.map(a => ({
      type: 'report' as const,
      id: a.assessment_id,
      timestamp: a.assessed_at,
      data: a
    })),
    ...assessments
      .filter(a => a.pushed_to_pm && a.pushed_at)
      .map(a => ({
        type: 'reviewed' as const,
        id: `${a.assessment_id}-reviewed`,
        timestamp: a.pushed_at!,
        data: a
      }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">History</h1>
          <p className="text-slate-600 mt-1">
            Track all policy scans and report reviews
          </p>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {[
              { value: 'timeline', label: 'Timeline' },
              { value: 'scans', label: 'Scans' },
              { value: 'reports', label: 'Reports' },
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => setViewMode(mode.value as ViewMode)}
                className={clsx(
                  'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                  viewMode === mode.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 w-48"
              />
            </div>

            {/* Market Filter */}
            <div className="relative">
              <select
                value={filterMarket}
                onChange={(e) => setFilterMarket(e.target.value)}
                className="select pr-8 appearance-none"
              >
                <option value="all">All Markets</option>
                {MARKETS.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.flag} {m.code}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="select pr-8 appearance-none"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending Review</option>
                <option value="reviewed">Reviewed</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'timeline' && (
        <TimelineView events={timelineEvents} onPushToPM={onPushToPM} />
      )}

      {viewMode === 'scans' && (
        <ScansView missions={missions} />
      )}

      {viewMode === 'reports' && (
        <ReportsView assessments={filteredAssessments} onPushToPM={onPushToPM} />
      )}
    </div>
  )
}

// Timeline View Component
function TimelineView({
  events,
  onPushToPM
}: {
  events: Array<{
    type: 'scan' | 'report' | 'reviewed'
    id: string
    timestamp: string
    data: ScoutMission | ImpactAssessment
  }>
  onPushToPM: (id: string) => void
}) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'scan':
        return Search
      case 'report':
        return FileText
      case 'reviewed':
        return CheckCircle
      default:
        return History
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'scan':
        return 'bg-govpulse-100 text-govpulse-600 border-govpulse-200'
      case 'report':
        return 'bg-purple-100 text-purple-600 border-purple-200'
      case 'reviewed':
        return 'bg-green-100 text-green-600 border-green-200'
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200'
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
      </div>
      <div className="p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

          {/* Events */}
          <div className="space-y-6">
            {events.map((event) => {
              const Icon = getEventIcon(event.type)
              const colorClass = getEventColor(event.type)
              const eventLabel = event.type === 'scan' ? 'Policy Scan' : 
                                event.type === 'report' ? 'Impact Report' : 
                                'Marked Reviewed'

              return (
                <div key={event.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className={clsx(
                    'relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    colorClass
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-slate-50 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium uppercase text-slate-500">
                            {eventLabel}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                          </span>
                        </div>

                        {event.type === 'scan' && (
                          <ScanSummary mission={event.data as ScoutMission} />
                        )}

                        {event.type === 'report' && (
                          <ReportSummary
                            assessment={event.data as ImpactAssessment}
                            onPushToPM={onPushToPM}
                          />
                        )}

                        {event.type === 'reviewed' && (
                          <div>
                            <p className="font-medium text-slate-900">
                              Report marked as reviewed
                            </p>
                            <p className="text-sm text-slate-600 mt-1">
                              {(event.data as ImpactAssessment).signal_title}
                            </p>
                          </div>
                        )}
                      </div>

                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {format(new Date(event.timestamp), 'MMM d, HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function ScanSummary({ mission }: { mission: ScoutMission }) {
  return (
    <div>
      <p className="font-medium text-slate-900 flex items-center gap-2">
        <span className="text-xl">{MARKETS.find(m => m.code === mission.market)?.flag}</span>
        {mission.market} - {DOMAIN_LABELS[mission.domain] || mission.domain}
      </p>
      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          {mission.lookback_days} days period
        </span>
        <span className="flex items-center gap-1">
          <User className="w-4 h-4" />
          {mission.created_by}
        </span>
        <span className={clsx(
          'px-2 py-0.5 rounded text-xs',
          mission.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
        )}>
          {mission.signals.length} findings
        </span>
      </div>
    </div>
  )
}

function ReportSummary({
  assessment,
  onPushToPM
}: {
  assessment: ImpactAssessment
  onPushToPM: (id: string) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <RiskBadge level={assessment.risk_level} size="sm" />
        <span className="text-xl">{MARKETS.find(m => m.code === assessment.market)?.flag}</span>
      </div>
      <p className="font-medium text-slate-900">{assessment.signal_title}</p>
      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{assessment.risk_rationale}</p>
      <div className="flex items-center gap-3 mt-3">
        <Link
          to={`/analysis/${assessment.assessment_id}`}
          className="text-sm text-govpulse-600 hover:text-govpulse-700 flex items-center gap-1"
        >
          View report
          <ExternalLink className="w-3 h-3" />
        </Link>
        {!assessment.pushed_to_pm && (
          <button
            onClick={() => onPushToPM(assessment.assessment_id)}
            className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
          >
            <CheckCircle className="w-3 h-3" />
            Mark as Reviewed
          </button>
        )}
      </div>
    </div>
  )
}

// Scans View Component
function ScansView({ missions }: { missions: ScoutMission[] }) {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-slate-900">All Policy Scans</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Scan ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Region</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Policy Area</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Period</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Findings</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {missions.map((mission) => {
              const DomainIcon = domainIcons[mission.domain] || Globe
              return (
                <tr key={mission.mission_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {mission.mission_id.slice(0, 20)}...
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span>{MARKETS.find(m => m.code === mission.market)?.flag}</span>
                      <span className="font-medium">{mission.market}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 text-slate-600">
                      <DomainIcon className="w-4 h-4" />
                      {DOMAIN_LABELS[mission.domain] || mission.domain}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{mission.lookback_days} days</td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      mission.status === 'completed' ? 'bg-green-100 text-green-700' :
                      mission.status === 'running' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    )}>
                      {mission.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{mission.signals.length}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {format(new Date(mission.created_at), 'MMM d, HH:mm')}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{mission.created_by}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Reports View Component
function ReportsView({
  assessments,
  onPushToPM
}: {
  assessments: ImpactAssessment[]
  onPushToPM: (id: string) => void
}) {
  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">All Impact Reports</h2>
        <span className="text-sm text-slate-500">{assessments.length} total</span>
      </div>
      <div className="divide-y divide-slate-200">
        {assessments.map((assessment) => (
          <div key={assessment.assessment_id} className="p-4 hover:bg-slate-50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <RiskBadge level={assessment.risk_level} size="sm" />
                  <span className="text-xl">{MARKETS.find(m => m.code === assessment.market)?.flag}</span>
                  <span className="text-sm text-slate-500">{assessment.market}</span>
                  {assessment.pushed_to_pm && (
                    <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Reviewed
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-slate-900">{assessment.signal_title}</h3>
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{assessment.risk_rationale}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span>{assessment.compliance_gaps.length} action items</span>
                  <span>{assessment.remediations.length} recommendations</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(assessment.assessed_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/analysis/${assessment.assessment_id}`}
                  className="btn-secondary text-sm py-1.5 px-3"
                >
                  View
                </Link>
                {!assessment.pushed_to_pm && (
                  <button
                    onClick={() => onPushToPM(assessment.assessment_id)}
                    className="btn-primary text-sm py-1.5 px-3"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Review
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
