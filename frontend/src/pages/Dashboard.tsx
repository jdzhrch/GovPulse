import { Link } from 'react-router-dom'
import {
  Search,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  Globe,
  Shield,
  ShoppingCart,
  Database,
  ChevronRight,
  Clock
} from 'lucide-react'
import { ScoutMission, ImpactAssessment, RISK_COLORS } from '../types'
import RiskBadge from '../components/RiskBadge'
import { formatDistanceToNow } from 'date-fns'

interface DashboardProps {
  missions: ScoutMission[]
  assessments: ImpactAssessment[]
}

// User-friendly labels for domains
const DOMAIN_LABELS: Record<string, string> = {
  all: 'All Policy Areas',
  minor_protection: 'Youth Safety',
  ecommerce: 'Digital Commerce',
  data_sovereignty: 'Data & Privacy',
  content_moderation: 'Content Policy',
}

export default function Dashboard({ missions, assessments }: DashboardProps) {
  // Calculate stats
  const p0Count = assessments.filter(a => a.risk_level === 'P0').length
  const p1Count = assessments.filter(a => a.risk_level === 'P1').length
  const pendingReview = assessments.filter(a => !a.pushed_to_pm).length
  const totalActionItems = assessments.reduce((sum, a) => sum + a.compliance_gaps.length, 0)

  const stats = [
    {
      name: 'Urgent Actions',
      value: p0Count,
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-100',
      change: 'Needs immediate attention'
    },
    {
      name: 'High Priority',
      value: p1Count,
      icon: TrendingUp,
      color: 'text-orange-600 bg-orange-100',
      change: 'Review within 2 weeks'
    },
    {
      name: 'Pending Review',
      value: pendingReview,
      icon: FileCheck,
      color: 'text-govpulse-600 bg-govpulse-100',
      change: 'Action needed'
    },
    {
      name: 'Action Items',
      value: totalActionItems,
      icon: Shield,
      color: 'text-purple-600 bg-purple-100',
      change: 'Across all markets'
    }
  ]

  const domainIcons = {
    minor_protection: Shield,
    ecommerce: ShoppingCart,
    data_sovereignty: Database,
    content_moderation: Globe,
    all: Globe
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Policy Overview</h1>
          <p className="text-slate-600 mt-1">
            Track regulatory changes and their impact on your operations
          </p>
        </div>
        <Link to="/launch" className="btn-primary">
          <Search className="w-4 h-4" />
          New Scan
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card p-6">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500">{stat.change}</span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-600 mt-1">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Assessments */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Impact Reports</h2>
            <Link to="/analysis" className="text-sm text-govpulse-600 hover:text-govpulse-700 font-medium">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-200">
            {assessments.slice(0, 5).map((assessment) => {
              const DomainIcon = domainIcons[assessment.domain as keyof typeof domainIcons] || Globe
              return (
                <Link
                  key={assessment.assessment_id}
                  to={`/analysis/${assessment.assessment_id}`}
                  className="block p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${RISK_COLORS[assessment.risk_level].bg}`}>
                      <DomainIcon className={`w-5 h-5 ${RISK_COLORS[assessment.risk_level].text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <RiskBadge level={assessment.risk_level} size="sm" showLabel={false} />
                        <span className="text-sm font-medium text-slate-500">
                          {assessment.market}
                        </span>
                        {assessment.pushed_to_pm && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Reviewed
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-slate-900 truncate">
                        {assessment.signal_title}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {assessment.risk_rationale}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(assessment.assessed_at), { addSuffix: true })}
                        </span>
                        <span>{assessment.compliance_gaps.length} action items</span>
                        <span>{assessment.remediations.length} recommendations</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Scans */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Scans</h2>
            <Link to="/audit" className="text-sm text-govpulse-600 hover:text-govpulse-700 font-medium">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-200">
            {missions.slice(0, 5).map((mission) => {
              const DomainIcon = domainIcons[mission.domain] || Globe
              return (
                <div key={mission.mission_id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <DomainIcon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{mission.market}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          mission.status === 'completed' ? 'bg-green-100 text-green-700' :
                          mission.status === 'running' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {mission.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {DOMAIN_LABELS[mission.domain] || mission.domain} • {mission.lookback_days} days
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDistanceToNow(new Date(mission.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Launch</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { market: 'US', event: 'TikTok Ban Updates', domain: 'all' },
            { market: 'ID', event: 'E-Commerce Regulations', domain: 'ecommerce' },
            { market: 'EU', event: 'DSA Compliance', domain: 'minor_protection' },
            { market: 'UK', event: 'Online Safety Act', domain: 'content_moderation' },
          ].map((quick) => (
            <Link
              key={`${quick.market}-${quick.domain}`}
              to={`/launch?market=${quick.market}&domain=${quick.domain}`}
              className="p-4 border border-slate-200 rounded-lg hover:border-govpulse-500 hover:bg-govpulse-50 transition-colors group"
            >
              <p className="font-medium text-slate-900 group-hover:text-govpulse-700">
                {quick.market}
              </p>
              <p className="text-sm text-slate-500 mt-1">{quick.event}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
