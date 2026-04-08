import { useState } from 'react'
import {
  HelpCircle,
  X,
  Search,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Lightbulb
} from 'lucide-react'
import clsx from 'clsx'
import { HELP_GUIDE_DESCRIPTION, HELP_GUIDE_SUMMARY } from '../brand'

interface HelpGuideProps {
  isOpen: boolean
  onClose: () => void
}

export default function HelpGuide({ isOpen, onClose }: HelpGuideProps) {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'concepts' | 'faq'>('quickstart')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[rgba(23,33,49,0.55)] backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="editorial-panel relative max-w-3xl w-full max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[var(--line)] bg-white/55">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl border border-[var(--line-strong)] bg-white/80 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div>
                <p className="section-kicker mb-1">Reference Notes</p>
                <h2 className="section-title text-[1.9rem]">Help Guide</h2>
                <p className="text-sm text-[var(--ink-soft)] mt-1">{HELP_GUIDE_DESCRIPTION}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line-strong)] bg-white/70 text-[var(--ink-soft)] hover:text-[var(--accent)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--line)] px-6 bg-[rgba(244,239,230,0.4)]">
            {[
              { id: 'quickstart', label: 'Quick Start' },
              { id: 'concepts', label: 'Key Concepts' },
              { id: 'faq', label: 'FAQ' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={clsx(
                  'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.id
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-190px)]">
            {activeTab === 'quickstart' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.55)] p-5">
                  <p className="section-kicker mb-3">Orientation</p>
                  <div className="flex items-start gap-4">
                  <Lightbulb className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="section-title text-[1.55rem]">Getting Started</h3>
                    <p className="text-sm text-[var(--ink-soft)] mt-2">
                      {HELP_GUIDE_SUMMARY}
                    </p>
                  </div>
                </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="section-kicker mb-2">Quick Start</p>
                    <h3 className="section-title text-[1.6rem]">How to Run Your First Scan</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full border border-[var(--line-strong)] bg-white text-[var(--accent)] flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        1
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Go to "New Scan"</p>
                        <p className="text-sm text-slate-600">Click the New Scan button in the navigation bar</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full border border-[var(--line-strong)] bg-white text-[var(--accent)] flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        2
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Select a Market</p>
                        <p className="text-sm text-slate-600">Choose the country/region you want to monitor (e.g., Brazil, Korea)</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full border border-[var(--line-strong)] bg-white text-[var(--accent)] flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        3
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Choose Policy Domain</p>
                        <p className="text-sm text-slate-600">Select "All Domains" or focus on a specific area like Youth Safety</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full border border-[var(--line-strong)] bg-white text-[var(--accent)] flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        4
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Start the Scan</p>
                        <p className="text-sm text-slate-600">Click "Start Live Scan" and wait 2-3 minutes for results</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.55)] p-5">
                  <p className="section-kicker mb-2">Scan Flow</p>
                  <h4 className="font-medium text-slate-900 mb-3">What happens during a scan?</h4>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink-soft)]">
                    <Search className="w-4 h-4" />
                    <span>Scout Engine searches policy sources</span>
                    <ArrowRight className="w-4 h-4" />
                    <FileCheck className="w-4 h-4" />
                    <span>AI analyzes impact</span>
                    <ArrowRight className="w-4 h-4" />
                    <CheckCircle className="w-4 h-4" />
                    <span>Results ready</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'concepts' && (
              <div className="space-y-6">
                <div>
                  <p className="section-kicker mb-2">Reference</p>
                  <h3 className="section-title text-[1.6rem] mb-3">Risk Levels</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 rounded-2xl border border-red-200 bg-[var(--critical-soft)]">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">Critical</span>
                      <span className="text-sm text-slate-700">Law effective soon, directly impacts core business. Respond within 24-48h.</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-2xl border border-orange-200 bg-[var(--high-soft)]">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">High</span>
                      <span className="text-sm text-slate-700">Confirmed regulation, requires product changes. Plan within 1-2 weeks.</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-2xl border border-yellow-200 bg-[var(--moderate-soft)]">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Medium</span>
                      <span className="text-sm text-slate-700">Draft stage, may impact business. Monitor over 1-3 months.</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-2xl border border-green-200 bg-[var(--low-soft)]">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">Low</span>
                      <span className="text-sm text-slate-700">Early discussion or limited impact. Review quarterly.</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="section-title text-[1.45rem] mb-3">Policy Domains</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl border border-[var(--line)] bg-white/55">
                      <p className="font-medium text-slate-900">🛡️ Youth Safety</p>
                      <p className="text-sm text-slate-600">Minor protection, age verification, parental controls</p>
                    </div>
                    <div className="p-3 rounded-2xl border border-[var(--line)] bg-white/55">
                      <p className="font-medium text-slate-900">🛒 Digital Commerce</p>
                      <p className="text-sm text-slate-600">E-commerce, payments, live gifting</p>
                    </div>
                    <div className="p-3 rounded-2xl border border-[var(--line)] bg-white/55">
                      <p className="font-medium text-slate-900">🗄️ Data & Privacy</p>
                      <p className="text-sm text-slate-600">Data protection, localization, cross-border transfer</p>
                    </div>
                    <div className="p-3 rounded-2xl border border-[var(--line)] bg-white/55">
                      <p className="font-medium text-slate-900">💬 Content Policy</p>
                      <p className="text-sm text-slate-600">Content moderation, harmful content, transparency</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="section-title text-[1.45rem] mb-3">Key Terms</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="font-medium text-slate-900">Compliance Gap</dt>
                      <dd className="text-sm text-slate-600">The difference between what a regulation requires and your current practice.</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-900">Remediation</dt>
                      <dd className="text-sm text-slate-600">Recommended action to close a compliance gap.</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-900">Internal Baseline</dt>
                      <dd className="text-sm text-slate-600">Your company's current policies and product configurations used for gap analysis.</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {activeTab === 'faq' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                  <h4 className="font-medium text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    How long does a scan take?
                  </h4>
                  <p className="text-sm text-slate-600 mt-2">
                    A typical scan takes 2-3 minutes. The Scout Engine searches policy sources (~30s), 
                    then the AI analyzer assesses each finding (~60s per policy).
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                  <h4 className="font-medium text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-slate-400" />
                    What if the AI analysis seems inaccurate?
                  </h4>
                  <p className="text-sm text-slate-600 mt-2">
                    AI outputs are recommendations, not decisions. Policy Leads should review and validate 
                    before taking action. If you notice systematic issues, report them to improve the system.
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                  <h4 className="font-medium text-slate-900 flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    Where does the policy data come from?
                  </h4>
                  <p className="text-sm text-slate-600 mt-2">
                    The Scout Engine searches government websites, news sources, and regulatory databases 
                    using AI-powered search. Results are then analyzed against your internal baseline.
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                  <h4 className="font-medium text-slate-900 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-slate-400" />
                    How do I update the internal baseline?
                  </h4>
                  <p className="text-sm text-slate-600 mt-2">
                    The baseline is maintained in <code className="px-1 py-0.5 bg-slate-100 rounded text-xs">knowledge/internal_baseline.md</code>. 
                    Contact the Policy team to request updates.
                  </p>
                </div>

                <div className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                  <h4 className="font-medium text-slate-900 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-slate-400" />
                    What does "Mark as Reviewed" do?
                  </h4>
                  <p className="text-sm text-slate-600 mt-2">
                    It indicates that a Policy Lead has reviewed the AI assessment. This helps track 
                    which policies have been processed and which still need attention.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Tooltip component for contextual help
interface TooltipProps {
  content: string
  children: React.ReactNode
}

export function HelpTooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative inline-flex items-center">
      {children}
      <button
        type="button"
        className="ml-1 text-slate-400 hover:text-slate-600 transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {isVisible && (
        <div className="absolute left-full ml-2 z-50 w-64 p-3 bg-slate-900 text-white text-sm rounded-lg shadow-lg">
          {content}
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
        </div>
      )}
    </div>
  )
}
