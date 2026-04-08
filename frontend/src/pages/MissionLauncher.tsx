import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Rocket,
  Globe,
  Shield,
  ShoppingCart,
  Database,
  MessageSquare,
  Calendar,
  CheckCircle,
  ExternalLink,
  Github,
  AlertCircle,
  HelpCircle
} from 'lucide-react'
import clsx from 'clsx'
import { Domain, MARKETS, DOMAINS } from '../types'

const domainIcons: Record<string, React.ElementType> = {
  all: Globe,
  minor_protection: Shield,
  ecommerce: ShoppingCart,
  data_sovereignty: Database,
  content_moderation: MessageSquare,
}

const DOMAIN_LABELS: Record<string, string> = {
  all: 'All Policy Areas',
  minor_protection: 'Youth Safety',
  ecommerce: 'Digital Commerce',
  data_sovereignty: 'Data & Privacy',
  content_moderation: 'Content Policy',
}

const lookbackOptions = [
  { value: 30, label: '1 Month' },
  { value: 90, label: '3 Months' },
  { value: 180, label: '6 Months' },
  { value: 365, label: '1 Year' },
]

type LaunchPhase = 'config' | 'running' | 'complete' | 'error'

const GITHUB_CONFIG = {
  owner: import.meta.env.VITE_GITHUB_REPO_OWNER || '',
  repo: import.meta.env.VITE_GITHUB_REPO_NAME || 'GovPulse',
  workflow: 'scout_worker.yml',
}

interface WorkflowRun {
  id: number
  status: 'queued' | 'in_progress' | 'completed'
  conclusion: 'success' | 'failure' | 'cancelled' | null
  html_url: string
  created_at: string
}

async function getLatestWorkflowRun(): Promise<WorkflowRun | null> {
  const token = import.meta.env.VITE_GITHUB_TOKEN
  if (!token || !GITHUB_CONFIG.owner) return null

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/actions/workflows/${GITHUB_CONFIG.workflow}/runs?per_page=1`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    if (data.workflow_runs && data.workflow_runs.length > 0) {
      const run = data.workflow_runs[0]
      return {
        id: run.id,
        status: run.status,
        conclusion: run.conclusion,
        html_url: run.html_url,
        created_at: run.created_at,
      }
    }
    return null
  } catch {
    return null
  }
}

async function getWorkflowRunById(runId: number): Promise<WorkflowRun | null> {
  const token = import.meta.env.VITE_GITHUB_TOKEN
  if (!token || !GITHUB_CONFIG.owner) return null

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/actions/runs/${runId}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) return null

    const run = await response.json()
    return {
      id: run.id,
      status: run.status,
      conclusion: run.conclusion,
      html_url: run.html_url,
      created_at: run.created_at,
    }
  } catch {
    return null
  }
}

async function getWorkflowJobs(runId: number): Promise<{scoutCompleted: boolean, deployCompleted: boolean, allCompleted: boolean}> {
  const token = import.meta.env.VITE_GITHUB_TOKEN
  if (!token || !GITHUB_CONFIG.owner) return { scoutCompleted: false, deployCompleted: false, allCompleted: false }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/actions/runs/${runId}/jobs`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) return { scoutCompleted: false, deployCompleted: false, allCompleted: false }

    const data = await response.json()
    const jobs = data.jobs || []

    const scoutJob = jobs.find((j: { name: string }) => j.name === 'scout-mission')
    const deployJob = jobs.find((j: { name: string }) => j.name === 'deploy-dashboard')

    return {
      scoutCompleted: scoutJob?.status === 'completed' && scoutJob?.conclusion === 'success',
      deployCompleted: deployJob?.status === 'completed' && deployJob?.conclusion === 'success',
      allCompleted: jobs.length > 0 && jobs.every((j: { status: string }) => j.status === 'completed')
    }
  } catch {
    return { scoutCompleted: false, deployCompleted: false, allCompleted: false }
  }
}

async function triggerGitHubWorkflow(params: {
  market: string
  domain: string
  lookbackDays: number
  triggerEvent: string
}): Promise<{ success: boolean; error?: string }> {
  const token = import.meta.env.VITE_GITHUB_TOKEN

  if (!token) {
    return { success: false, error: 'GitHub token not configured' }
  }

  if (!GITHUB_CONFIG.owner) {
    return { success: false, error: 'Repository owner not configured' }
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/actions/workflows/${GITHUB_CONFIG.workflow}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            market: params.market,
            domain: params.domain,
            lookback_days: params.lookbackDays.toString(),
            trigger_event: params.triggerEvent || 'Policy scan from dashboard'
          }
        })
      }
    )

    if (response.status === 204) {
      return { success: true }
    }

    const errorData = await response.json().catch(() => ({}))
    return { success: false, error: errorData.message || 'Failed to start scan' }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' }
  }
}

export default function MissionLauncher() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [selectedMarket, setSelectedMarket] = useState(searchParams.get('market') || '')
  const [selectedDomain, setSelectedDomain] = useState<Domain>(
    (searchParams.get('domain') as Domain) || 'all'
  )
  const [lookbackDays, setLookbackDays] = useState(90)
  const [triggerEvent, setTriggerEvent] = useState('')
  const [phase, setPhase] = useState<LaunchPhase>('config')
  const [errorMessage, setErrorMessage] = useState('')

  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [workflowRunId, setWorkflowRunId] = useState<number | null>(null)
  const [workflowRunUrl, setWorkflowRunUrl] = useState('')

  const isGitHubConfigured = Boolean(
    import.meta.env.VITE_GITHUB_TOKEN && import.meta.env.VITE_GITHUB_REPO_OWNER
  )

  useEffect(() => {
    if (searchParams.get('market')) {
      setSelectedMarket(searchParams.get('market') || '')
    }
    if (searchParams.get('domain')) {
      setSelectedDomain((searchParams.get('domain') as Domain) || 'all')
    }
  }, [searchParams])

  const pollWorkflowStatus = useCallback(async () => {
    if (!workflowRunId) return

    const run = await getWorkflowRunById(workflowRunId)
    if (!run) return

    const jobs = await getWorkflowJobs(workflowRunId)

    if (run.status === 'completed') {
      if (run.conclusion === 'success') {
        setProgress(100)
        setProgressMessage('Complete! Redirecting to results...')
        setTimeout(() => {
          navigate('/reports')
        }, 1500)
      } else {
        setErrorMessage(`Scan ended with status: ${run.conclusion}`)
        setPhase('error')
      }
    } else if (run.status === 'in_progress') {
      if (jobs.deployCompleted) {
        setProgress(98)
        setProgressMessage('Almost done...')
      } else if (jobs.scoutCompleted) {
        setProgress(prev => Math.max(prev, 90))
        setProgressMessage('Publishing results...')
      } else {
        setProgress(prev => {
          if (prev < 70) return Math.min(prev + 8, 70)
          return prev
        })
        setProgressMessage('Scanning regulatory sources...')
      }
    } else if (run.status === 'queued') {
      setProgress(5)
      setProgressMessage('Scan queued, waiting to start...')
    }
  }, [workflowRunId, navigate])

  useEffect(() => {
    if (phase !== 'running') return

    const interval = setInterval(pollWorkflowStatus, 5000)
    return () => clearInterval(interval)
  }, [phase, pollWorkflowStatus])

  const handleLaunch = async () => {
    if (!selectedMarket) return

    if (!isGitHubConfigured) {
      setErrorMessage('GitHub integration is not configured. Please set up VITE_GITHUB_TOKEN and VITE_GITHUB_REPO_OWNER in your environment.')
      setPhase('error')
      return
    }

    setPhase('running')
    setProgress(0)
    setProgressMessage('Starting policy scan...')
    setErrorMessage('')

    const result = await triggerGitHubWorkflow({
      market: selectedMarket,
      domain: selectedDomain,
      lookbackDays,
      triggerEvent
    })

    if (result.success) {
      setProgress(10)
      setProgressMessage('Scan started. Waiting for analysis to begin...')

      await new Promise(resolve => setTimeout(resolve, 3000))

      const latestRun = await getLatestWorkflowRun()
      if (latestRun) {
        setWorkflowRunId(latestRun.id)
        setWorkflowRunUrl(latestRun.html_url)
        setProgress(20)
        setProgressMessage('Connected to analysis pipeline...')
      }
    } else {
      setErrorMessage(result.error || 'Failed to start policy scan')
      setPhase('error')
    }
  }

  const handleNewScan = () => {
    setPhase('config')
    setSelectedMarket('')
    setSelectedDomain('all')
    setLookbackDays(90)
    setTriggerEvent('')
    setErrorMessage('')
    setProgress(0)
    setProgressMessage('')
    setWorkflowRunId(null)
    setWorkflowRunUrl('')
  }

  const selectedMarketInfo = MARKETS.find(m => m.code === selectedMarket)
  const selectedDomainLabel = DOMAIN_LABELS[selectedDomain] || selectedDomain

  if (phase === 'error') {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="editorial-panel p-8 sm:p-10">
          <p className="section-kicker mb-3">Mission Interrupted</p>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-red-200 bg-[var(--critical-soft)]">
              <AlertCircle className="h-8 w-8 text-[#7d2d21]" />
            </div>
            <div className="flex-1">
              <h2 className="section-title text-[2rem]">Scan failed</h2>
              <p className="mt-2 text-[15px] leading-7 text-[var(--ink-soft)]">
                The workflow stopped before results could be published. Review the error below and restart the mission when ready.
              </p>
              <div className="mt-5 rounded-3xl border border-red-200 bg-[var(--critical-soft)] p-5 text-sm leading-6 text-[#7d2d21]">
                {errorMessage}
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={handleNewScan} className="btn-secondary">
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'config') {
    const summaryItems = [
      ['Region / Market', selectedMarketInfo?.name || 'Select a target market'],
      ['Policy Area', selectedDomainLabel],
      ['Date Range', `Past ${lookbackDays} days`],
      ['Trigger Note', triggerEvent || 'No note added'],
      ['Estimated Time', '2-5 minutes'],
    ]

    return (
      <div className="space-y-6">
        <section className="editorial-panel p-6 sm:p-8">
          <p className="section-kicker mb-3">Scan Workbench</p>
          <div className="max-w-3xl">
            <h1 className="briefing-title">Launch a targeted policy scan.</h1>
            <p className="mt-4 text-[15px] leading-7 text-[var(--ink-soft)]">
              Configure a single monitoring mission for one market, one policy scope, and one observation window. The workflow stays the same; the page now reads like an operator brief instead of a back-office form.
            </p>
          </div>
        </section>

        <div className="scan-workbench">
          <div className="space-y-5">
            {!isGitHubConfigured && (
              <div className="editorial-panel p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-[#8a531c]" />
                  <div>
                    <p className="section-kicker mb-2">Setup Required</p>
                    <p className="text-sm leading-6 text-[var(--ink-soft)]">
                      Live scanning requires GitHub integration. Configure `VITE_GITHUB_TOKEN` and `VITE_GITHUB_REPO_OWNER`, or trigger scans directly from{' '}
                      <a
                        href={`https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/actions`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[var(--accent)] underline hover:no-underline"
                      >
                        GitHub Actions
                      </a>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <section className="editorial-panel p-6">
              <div className="mb-5 flex items-start gap-4">
                <span className="status-stamp shrink-0">01</span>
                <div>
                  <p className="section-kicker mb-2">Context</p>
                  <h2 className="section-title text-[1.7rem]">What prompted this scan?</h2>
                </div>
              </div>
              <label className="label">Optional note</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., New data protection law announced"
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
              />
              <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
                This note is included in the mission context so the report reads like a specific business brief instead of a generic scan.
              </p>
            </section>

            <section className="editorial-panel p-6">
              <div className="mb-5 flex items-start gap-4">
                <span className="status-stamp shrink-0">02</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="section-kicker">Market</p>
                    <HelpCircle className="h-4 w-4 text-[var(--ink-soft)]" />
                  </div>
                  <h2 className="section-title text-[1.7rem]">Choose the region under review.</h2>
                </div>
              </div>
              <div className="decision-grid">
                {MARKETS.map((market) => (
                  <button
                    key={market.code}
                    onClick={() => setSelectedMarket(market.code)}
                    className={clsx(
                      'rounded-3xl border p-4 text-left transition-all',
                      selectedMarket === market.code
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]'
                        : 'border-[var(--line)] bg-white/55 hover:border-[var(--line-strong)] hover:bg-white/75'
                    )}
                  >
                    <div className="text-2xl">{market.flag}</div>
                    <p className="mt-3 font-medium text-[var(--ink)]">{market.code}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{market.name}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="editorial-panel p-6">
              <div className="mb-5 flex items-start gap-4">
                <span className="status-stamp shrink-0">03</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="section-kicker">Policy Area</p>
                    <HelpCircle className="h-4 w-4 text-[var(--ink-soft)]" />
                  </div>
                  <h2 className="section-title text-[1.7rem]">Define the policy focus.</h2>
                </div>
              </div>
              <div className="decision-grid">
                {DOMAINS.map((domain) => {
                  const Icon = domainIcons[domain.value]
                  return (
                    <button
                      key={domain.value}
                      onClick={() => setSelectedDomain(domain.value)}
                      className={clsx(
                        'rounded-3xl border p-4 text-left transition-all',
                        selectedDomain === domain.value
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]'
                          : 'border-[var(--line)] bg-white/55 hover:border-[var(--line-strong)] hover:bg-white/75'
                      )}
                    >
                      <Icon className={clsx(
                        'h-6 w-6',
                        selectedDomain === domain.value ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)]'
                      )} />
                      <p className="mt-3 font-medium text-[var(--ink)]">
                        {DOMAIN_LABELS[domain.value] || domain.label}
                      </p>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="editorial-panel p-6">
              <div className="mb-5 flex items-start gap-4">
                <span className="status-stamp shrink-0">04</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="section-kicker">Time Window</p>
                    <Calendar className="h-4 w-4 text-[var(--ink-soft)]" />
                  </div>
                  <h2 className="section-title text-[1.7rem]">Set the observation range.</h2>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {lookbackOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setLookbackDays(option.value)}
                    className={clsx(
                      'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                      lookbackDays === option.value
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[#f7f3eb]'
                        : 'border-[var(--line)] bg-white/60 text-[var(--ink-soft)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
                Search for policies published or updated within this time period.
              </p>
            </section>
          </div>

          <aside className="editorial-panel p-6 lg:sticky lg:top-28">
            <p className="section-kicker mb-3">Mission Brief</p>
            <h2 className="section-title text-[1.8rem]">Ready to launch?</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              Review the parameters below. Once launched, the scan will follow the existing GitHub workflow and publish results to the same report views.
            </p>

            <div className="rule-divider my-5" />

            <dl className="space-y-4">
              {summaryItems.map(([label, value]) => (
                <div key={label}>
                  <dt className="label !mb-1">{label}</dt>
                  <dd className="text-sm leading-6 text-[var(--ink)]">{value}</dd>
                </div>
              ))}
            </dl>

            {!isGitHubConfigured && (
              <div className="mt-5 rounded-3xl border border-amber-200 bg-[var(--high-soft)] p-4 text-sm leading-6 text-[#8a531c]">
                Launch is disabled until GitHub integration is configured.
              </div>
            )}

            <button
              onClick={handleLaunch}
              disabled={!selectedMarket || !isGitHubConfigured}
              className="btn-primary mt-6 w-full justify-center py-3 text-base"
            >
              <Rocket className="w-5 h-5" />
              Start Scan
            </button>
          </aside>
        </div>
      </div>
    )
  }

  if (phase === 'running') {
    const circumference = 2 * Math.PI * 45
    const strokeDashoffset = circumference - (progress / 100) * circumference

    return (
      <div className="max-w-3xl mx-auto">
        <div className="editorial-panel p-8 sm:p-10 text-center">
          <p className="section-kicker mb-3">Mission Tracker</p>
          <h2 className="section-title text-[2.1rem]">Scanning policy changes</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-[var(--ink-soft)]">
            The pipeline is running through the existing scout and deployment steps. This page only changes the presentation, not the workflow beneath it.
          </p>

          <div className="mx-auto mt-8 flex h-40 w-40 items-center justify-center rounded-full border border-[var(--line)] bg-white/65">
            <div className="relative h-28 w-28 sm:h-40 sm:w-40">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r="45"
                  className="fill-none stroke-[var(--line)]"
                  strokeWidth="8"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="45"
                  className="fill-none stroke-[var(--accent)] transition-all duration-500"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl sm:text-3xl font-semibold text-[var(--ink)]">{progress}%</span>
              </div>
            </div>
          </div>

          <p className="mt-6 text-base text-[var(--ink)]">{progressMessage}</p>
          <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2">
            <span className="status-stamp">{selectedMarketInfo?.name || selectedMarket}</span>
            <span className="status-stamp">{selectedDomainLabel}</span>
          </div>

          {workflowRunUrl && (
            <div className="mt-8 pt-6 border-t border-[var(--line)]">
              <a
                href={workflowRunUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-deep)]"
              >
                <Github className="w-4 h-4" />
                View detailed progress
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="editorial-panel p-8 sm:p-10 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-green-200 bg-[var(--low-soft)]">
          <CheckCircle className="h-8 w-8 text-[var(--low)]" />
        </div>
        <p className="section-kicker mb-3">Mission Complete</p>
        <h2 className="section-title text-[2.2rem]">Scan complete</h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-[var(--ink-soft)]">
          Your policy scan for {selectedMarketInfo?.name} has finished. The workflow is publishing the results now and the dashboard will update shortly.
        </p>

        <div className="mx-auto mt-6 max-w-xl rounded-3xl border border-amber-200 bg-[var(--high-soft)] p-4 text-sm leading-6 text-[#8a531c]">
          It may take 1-2 minutes for the new reports to appear while the deployment finishes in the background.
        </div>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => window.location.href = '/GovPulse/reports'}
            className="btn-primary"
          >
            View Scan Reports
          </button>
          <button onClick={handleNewScan} className="btn-secondary">
            Start Another Scan
          </button>
        </div>

        {workflowRunUrl && (
          <div className="mt-8 pt-6 border-t border-[var(--line)]">
            <a
              href={workflowRunUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-deep)]"
            >
              <Github className="w-4 h-4" />
              View workflow details
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
