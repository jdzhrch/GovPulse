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

// User-friendly labels for domains
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

// GitHub Actions configuration
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

/**
 * Get the latest workflow run for our workflow
 */
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

/**
 * Get workflow run by ID
 */
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

/**
 * Get workflow jobs to track progress of individual jobs
 */
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

/**
 * Trigger GitHub Actions workflow
 */
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
    } else {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, error: errorData.message || 'Failed to start scan' }
    }
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
  
  // Progress tracking state
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [workflowRunId, setWorkflowRunId] = useState<number | null>(null)
  const [workflowRunUrl, setWorkflowRunUrl] = useState('')

  // Check if GitHub integration is available
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

  // Polling for workflow status
  const pollWorkflowStatus = useCallback(async () => {
    if (!workflowRunId) return

    const run = await getWorkflowRunById(workflowRunId)
    if (!run) return

    // Get job-level status for more accurate progress
    const jobs = await getWorkflowJobs(workflowRunId)

    if (run.status === 'completed') {
      if (run.conclusion === 'success') {
        setProgress(100)
        setProgressMessage('Complete! Redirecting to results...')
        // Navigate directly to scan reports after a brief delay
        setTimeout(() => {
          navigate('/reports')
        }, 1500)
      } else {
        setErrorMessage(`Scan ended with status: ${run.conclusion}`)
        setPhase('error')
      }
    } else if (run.status === 'in_progress') {
      // Track progress based on which jobs have completed
      if (jobs.deployCompleted) {
        setProgress(98)
        setProgressMessage('Almost done...')
      } else if (jobs.scoutCompleted) {
        // Scout completed, deploy should be fast - show higher progress
        setProgress(prev => Math.max(prev, 90))
        setProgressMessage('Publishing results...')
      } else {
        // Scout job still running - increment gradually
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

    // Poll more frequently (every 5 seconds) to catch completion faster
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
      
      // Wait a moment then get the run ID
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

  // Error Phase
  if (phase === 'error') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 border-red-200 bg-red-50">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-900">Scan Failed</h2>
              <p className="text-red-700">We couldn't complete the policy scan</p>
            </div>
          </div>
          <div className="bg-red-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
          <div className="flex justify-end">
            <button onClick={handleNewScan} className="btn-secondary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Configuration Phase
  if (phase === 'config') {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Policy Scan</h1>
          <p className="text-slate-600 mt-1">
            Monitor regulatory changes and assess their impact on your operations
          </p>
        </div>

        {/* GitHub Status Notice */}
        {!isGitHubConfigured && (
          <div className="card border-amber-200 bg-amber-50">
            <div className="card-body">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">Setup Required</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Live scanning requires GitHub integration. Please configure VITE_GITHUB_TOKEN and VITE_GITHUB_REPO_OWNER, or run scans directly from{' '}
                    <a 
                      href={`https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/actions`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-amber-900 underline hover:no-underline"
                    >
                      GitHub Actions
                    </a>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scan Parameters */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-slate-900">Scan Parameters</h2>
          </div>
          <div className="card-body space-y-6">
            {/* Context (optional) */}
            <div>
              <label className="label">What prompted this scan? (Optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., 'New data protection law announced' or 'Quarterly compliance review'"
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                This helps contextualize results in your reports
              </p>
            </div>

            {/* Market Selection */}
            <div>
              <label className="label flex items-center gap-1">
                Region / Market *
                <span className="group relative">
                  <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 w-64 p-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    Select the country or region to monitor for regulatory changes. Each scan focuses on one market for depth.
                  </span>
                </span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {MARKETS.map((market) => (
                  <button
                    key={market.code}
                    onClick={() => setSelectedMarket(market.code)}
                    className={clsx(
                      'p-3 rounded-lg border-2 text-left transition-all',
                      selectedMarket === market.code
                        ? 'border-govpulse-500 bg-govpulse-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <span className="text-2xl">{market.flag}</span>
                    <p className="font-medium text-slate-900 mt-1">{market.code}</p>
                    <p className="text-xs text-slate-500">{market.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Domain Selection */}
            <div>
              <label className="label flex items-center gap-1">
                Policy Area
                <span className="group relative">
                  <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 w-64 p-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    Choose a specific policy domain to focus on, or "All Policy Areas" for comprehensive coverage.
                  </span>
                </span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {DOMAINS.map((domain) => {
                  const Icon = domainIcons[domain.value]
                  return (
                    <button
                      key={domain.value}
                      onClick={() => setSelectedDomain(domain.value)}
                      className={clsx(
                        'p-3 rounded-lg border-2 text-left transition-all',
                        selectedDomain === domain.value
                          ? 'border-govpulse-500 bg-govpulse-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <Icon className={clsx(
                        'w-6 h-6',
                        selectedDomain === domain.value ? 'text-govpulse-600' : 'text-slate-400'
                      )} />
                      <p className="font-medium text-slate-900 mt-2 text-sm">
                        {DOMAIN_LABELS[domain.value] || domain.label}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Lookback Period */}
            <div>
              <label className="label flex items-center gap-1">
                Policy Date Range
                <span className="group relative">
                  <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 w-64 p-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    How far back to search for policy updates. 3 months is recommended for regular monitoring.
                  </span>
                </span>
              </label>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-400" />
                <div className="flex gap-2">
                  {lookbackOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setLookbackDays(option.value)}
                      className={clsx(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        lookbackDays === option.value
                          ? 'bg-govpulse-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Search for policies published or updated within this time period
              </p>
            </div>
          </div>
        </div>

        {/* Preview */}
        {selectedMarket && (
          <div className="card border-govpulse-200 bg-govpulse-50">
            <div className="card-body">
              <h3 className="font-semibold text-govpulse-900 mb-2">Scan Summary</h3>
              <div className="text-sm text-govpulse-700 space-y-1">
                <p>
                  <strong>Region:</strong> {MARKETS.find(m => m.code === selectedMarket)?.name}
                </p>
                <p>
                  <strong>Policy Area:</strong> {DOMAIN_LABELS[selectedDomain] || selectedDomain}
                </p>
                <p>
                  <strong>Date Range:</strong> Policies from the past {lookbackDays} days (published or updated)
                </p>
                <p>
                  <strong>Estimated Time:</strong> 2-5 minutes
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Launch Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleLaunch}
            disabled={!selectedMarket || !isGitHubConfigured}
            className="btn-primary text-lg px-8 py-3"
          >
            <Rocket className="w-5 h-5" />
            Start Scan
          </button>
        </div>
      </div>
    )
  }

  // Running Phase - Progress Tracker
  if (phase === 'running') {
    const circumference = 2 * Math.PI * 45 // radius = 45
    const strokeDashoffset = circumference - (progress / 100) * circumference

    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-12 text-center">
          {/* Circular Progress */}
          <div className="relative w-40 h-40 mx-auto mb-8">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r="45"
                className="fill-none stroke-slate-200"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="80"
                cy="80"
                r="45"
                className="fill-none stroke-govpulse-500 transition-all duration-500"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            {/* Percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-slate-900">{progress}%</span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Scanning Policy Changes
          </h2>
          <p className="text-slate-600 mb-4">
            {progressMessage}
          </p>
          
          <div className="text-sm text-slate-500">
            {MARKETS.find(m => m.code === selectedMarket)?.name} • {DOMAIN_LABELS[selectedDomain]}
          </div>

          {workflowRunUrl && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <a
                href={workflowRunUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-govpulse-600 hover:text-govpulse-700"
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

  // Complete Phase
  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Scan Complete!</h2>
        <p className="text-slate-600 mb-6">
          Your policy scan for {MARKETS.find(m => m.code === selectedMarket)?.name} has finished. 
          The results are being deployed and will be available shortly.
        </p>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> It may take 1-2 minutes for the new reports to appear on the dashboard 
            as the deployment is completing in the background.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
          <div className="mt-6 pt-6 border-t border-slate-200">
            <a
              href={workflowRunUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-govpulse-600 hover:text-govpulse-700"
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
