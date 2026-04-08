import { Link } from 'react-router-dom'
import {
  Search,
  FileCheck,
  TrendingUp,
  Globe,
  Shield,
  ShoppingCart,
  Database,
  ChevronRight,
  Clock,
  Rocket,
  Lightbulb
} from 'lucide-react'
import { ScoutMission, ImpactAssessment, RISK_COLORS } from '../types'
import RiskBadge from '../components/RiskBadge'
import { formatDistanceToNow } from 'date-fns'

const parseUTCDate = (timestamp: string): Date => {
  const dateStr = timestamp.endsWith('Z') || timestamp.includes('+') ? timestamp : timestamp + 'Z'
  return new Date(dateStr)
}

interface DashboardProps {
  missions: ScoutMission[]
  assessments: ImpactAssessment[]
}

const DOMAIN_LABELS: Record<string, string> = {
  all: 'All Policy Areas',
  minor_protection: 'Youth Safety',
  ecommerce: 'Digital Commerce',
  data_sovereignty: 'Data & Privacy',
  content_moderation: 'Content Policy',
}

export default function Dashboard({ missions, assessments }: DashboardProps) {
  const p0Count = assessments.filter(a => a.risk_level === 'P0').length
  const p1Count = assessments.filter(a => a.risk_level === 'P1').length
  const pendingReview = assessments.filter(a => !a.pushed_to_pm).length
  const totalActionItems = assessments.reduce((sum, a) => sum + a.compliance_gaps.length, 0)

  const domainIcons = {
    minor_protection: Shield,
    ecommerce: ShoppingCart,
    data_sovereignty: Database,
    content_moderation: Globe,
    all: Globe
  }

  const summaryCards = [
    {
      label: 'High Priority',
      value: p1Count,
      detail: 'Needs a review plan in the next two weeks',
      tone: 'text-[#8a531c] bg-[var(--high-soft)] border-orange-200',
      icon: TrendingUp,
    },
    {
      label: 'Pending Review',
      value: pendingReview,
      detail: 'Assessments still waiting for a named owner',
      tone: 'text-[var(--accent)] bg-[var(--accent-soft)] border-[var(--line-strong)]',
      icon: FileCheck,
    },
    {
      label: 'Action Items',
      value: totalActionItems,
      detail: 'Open remediation tasks across current reports',
      tone: 'text-[#2e4b41] bg-[var(--low-soft)] border-green-200',
      icon: Shield,
    },
  ]

  return (
    <div className="space-y-8">
      <section className="hero-summary-grid">
        <div className="editorial-panel p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="section-kicker mb-3">Executive Radar</p>
              <h1 className="briefing-title">Where policy pressure is building now.</h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--ink-soft)]">
                Review the most urgent assessments, see what still requires a decision, and move directly into the next scan without wading through a generic dashboard.
              </p>
            </div>
            <Link to="/launch" className="btn-primary self-start lg:self-auto">
              <Search className="w-4 h-4" />
              Launch New Scan
            </Link>
          </div>

          <div className="rule-divider my-6" />

          <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
            <div className="rounded-[1.4rem] border border-red-200 bg-[var(--critical-soft)] p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="status-stamp border-red-200 bg-white/70 text-[#7d2d21]">
                  Critical Attention
                </span>
                <span className="text-sm text-[#7d2d21]/80">Items requiring immediate action</span>
              </div>
              <div className="mt-6 flex flex-wrap items-end gap-4">
                <div className="font-serif text-[4.75rem] leading-none text-[#7d2d21]">{p0Count}</div>
                <div className="pb-2">
                  <h2 className="section-title text-[2rem] text-[#4f1c15]">Urgent actions</h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[#7d2d21]/80">
                    Confirm the highest-risk reports, assign owners, and clear blockers before they age into execution debt.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-[var(--line)] bg-white/60 p-6">
              <p className="section-kicker mb-3">Decision Queue</p>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-[var(--ink-soft)]">Pending review</div>
                  <div className="mt-1 text-3xl font-semibold text-[var(--ink)]">{pendingReview}</div>
                </div>
                <div>
                  <div className="text-sm text-[var(--ink-soft)]">High priority</div>
                  <div className="mt-1 text-3xl font-semibold text-[var(--ink)]">{p1Count}</div>
                </div>
                <div>
                  <div className="text-sm text-[var(--ink-soft)]">Action items</div>
                  <div className="mt-1 text-3xl font-semibold text-[var(--ink)]">{totalActionItems}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="metric-rail">
          {summaryCards.slice(0, 2).map((card) => (
            <div key={card.label} className={`editorial-panel p-5 ${card.tone}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="section-kicker mb-2 !text-current/70">{card.label}</p>
                  <div className="text-4xl font-semibold leading-none">{card.value}</div>
                </div>
                <div className="rounded-2xl border border-current/15 bg-white/70 p-2">
                  <card.icon className="w-5 h-5" />
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-current/80">{card.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(310px,0.9fr)]">
        <section className="editorial-panel overflow-hidden">
          <div className="flex items-end justify-between gap-4 px-6 py-5">
            <div>
              <p className="section-kicker mb-2">Impact Briefing</p>
              <h2 className="section-title">Recent impact reports</h2>
            </div>
            <Link to="/analysis" className="btn-secondary">
              View All Reports
            </Link>
          </div>
          <div className="rule-divider" />
          <div className="divide-y divide-[var(--line)]">
            {assessments.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--line)] bg-white/70">
                  <Lightbulb className="h-6 w-6 text-[var(--accent)]" />
                </div>
                <h3 className="section-title text-[1.75rem]">No reports yet</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--ink-soft)]">
                  Run your first policy scan to start generating executive-facing risk briefs for the monitored markets.
                </p>
                <Link to="/launch" className="btn-primary mt-6 inline-flex">
                  <Rocket className="w-4 h-4" />
                  Start First Scan
                </Link>
              </div>
            ) : (
              assessments.slice(0, 5).map((assessment) => {
                const DomainIcon = domainIcons[assessment.domain as keyof typeof domainIcons] || Globe
                const riskBorder = {
                  P0: 'bg-[var(--critical)]',
                  P1: 'bg-[var(--high)]',
                  P2: 'bg-[var(--moderate)]',
                  P3: 'bg-[var(--low)]',
                }[assessment.risk_level]

                return (
                  <Link
                    key={assessment.assessment_id}
                    to={`/analysis/${assessment.assessment_id}`}
                    className="report-list-row"
                  >
                    <span className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${riskBorder}`} />
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 rounded-2xl border border-[var(--line)] p-2 ${RISK_COLORS[assessment.risk_level].bg}`}>
                        <DomainIcon className={`h-5 w-5 ${RISK_COLORS[assessment.risk_level].text}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <RiskBadge level={assessment.risk_level} size="sm" showLabel={false} />
                          <span className="text-sm font-medium text-[var(--ink)]">{assessment.market}</span>
                          {assessment.pushed_to_pm && (
                            <span className="status-stamp bg-white/70 text-[var(--low)] border-green-200">Reviewed</span>
                          )}
                        </div>
                        <h3 className="mt-3 font-serif text-[1.45rem] leading-tight text-[var(--ink)]">
                          {assessment.signal_title}
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
                          {assessment.risk_rationale}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(parseUTCDate(assessment.assessed_at), { addSuffix: true })}
                          </span>
                          <span>{assessment.compliance_gaps.length} action items</span>
                          <span>{assessment.remediations.length} recommendations</span>
                        </div>
                      </div>
                      <ChevronRight className="mt-2 h-5 w-5 flex-shrink-0 text-[var(--ink-soft)]" />
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </section>

        <aside className="editorial-panel overflow-hidden">
          <div className="px-6 py-5">
            <p className="section-kicker mb-2">Activity Feed</p>
            <h2 className="section-title">Recent scans</h2>
          </div>
          <div className="rule-divider" />
          <div className="divide-y divide-[var(--line)]">
            {missions.length === 0 ? (
              <div className="p-6 text-sm leading-6 text-[var(--ink-soft)]">
                No scans yet. Start monitoring your target markets to begin filling this activity rail.
              </div>
            ) : (
              missions.slice(0, 5).map((mission) => {
                const DomainIcon = domainIcons[mission.domain] || Globe
                return (
                  <div key={mission.mission_id} className="activity-row">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-2">
                        <DomainIcon className="h-4 w-4 text-[var(--accent)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-[var(--ink)]">{mission.market}</span>
                          <span className="status-stamp">
                            {mission.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">
                          {DOMAIN_LABELS[mission.domain] || mission.domain} • {mission.lookback_days} days
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                          {formatDistanceToNow(parseUTCDate(mission.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
