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
  Play,
  RefreshCw,
  FileText
} from 'lucide-react'
import clsx from 'clsx'
import { Domain, MARKETS, DOMAINS, ScoutMission, ImpactAssessment } from '../types'
import { createMockMission, createMockAssessment } from '../utils/mockData'
import RiskBadge from '../components/RiskBadge'

interface MissionLauncherProps {
  onMissionCreate: (mission: ScoutMission) => void
  onAssessmentCreate: (assessment: ImpactAssessment) => void
}

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
type LaunchMode = 'demo' | 'live'

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

export default function MissionLauncher({
  onMissionCreate,
  onAssessmentCreate
}: MissionLauncherProps) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [selectedMarket, setSelectedMarket] = useState(searchParams.get('market') || '')
  const [selectedDomain, setSelectedDomain] = useState<Domain>(
    (searchParams.get('domain') as Domain) || 'all'
  )
  const [lookbackDays, setLookbackDays] = useState(90)
  const [triggerEvent, setTriggerEvent] = useState('')
  const [phase, setPhase] = useState<LaunchPhase>('config')
  const [launchMode, setLaunchMode] = useState<LaunchMode>('demo')
  const [missionResult, setMissionResult] = useState<ScoutMission | null>(null)
  const [assessments, setAssessments] = useState<ImpactAssessment[]>([])
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

    if (run.status === 'completed') {
      if (run.conclusion === 'success') {
        setProgress(100)
        setProgressMessage('Analysis complete! Deploying results...')
        
        // Wait for deploy job to complete (it takes about 1-2 minutes)
        // Then show completion page
        setTimeout(() => {
          setPhase('complete')
        }, 3000)
      } else {
        setErrorMessage(`Scan ended with status: ${run.conclusion}`)
        setPhase('error')
      }
    } else if (run.status === 'in_progress') {
      // Increment progress while running (cap at 90%)
      setProgress(prev => Math.min(prev + 5, 90))
      setProgressMessage('Analyzing regulatory sources...')
    }
  }, [workflowRunId])

  useEffect(() => {
    if (phase !== 'running' || launchMode !== 'live') return

    const interval = setInterval(pollWorkflowStatus, 10000)
    return () => clearInterval(interval)
  }, [phase, launchMode, pollWorkflowStatus])

  const handleLaunchDemo = async () => {
    if (!selectedMarket) return

    setPhase('running')
    setProgress(0)
    setProgressMessage('Initializing policy scan...')

    // Simulate progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 300))
      setProgress(i)
      if (i < 30) setProgressMessage('Scanning regulatory databases...')
      else if (i < 60) setProgressMessage('Identifying policy changes...')
      else if (i < 90) setProgressMessage('Analyzing compliance impact...')
      else setProgressMessage('Preparing your report...')
    }

    const mission = createMockMission(selectedMarket, selectedDomain, lookbackDays, 'current_user')
    setMissionResult(mission)
    onMissionCreate(mission)

    const newAssessments = mission.signals.map(signal => createMockAssessment(signal, 'current_user'))
    setAssessments(newAssessments)
    newAssessments.forEach(a => onAssessmentCreate(a))

    setPhase('complete')
  }

  const handleLaunchLive = async () => {
    if (!selectedMarket) return

    setPhase('running')
    setProgress(0)
    setProgressMessage('Starting live policy scan...')
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

  const handleLaunch = async () => {
    if (launchMode === 'live') {
      await handleLaunchLive()
    } else {
      await handleLaunchDemo()
    }
  }

  const handleViewResults = () => {
    if (assessments.length > 0) {
      navigate(`/analysis/${assessments[0].assessment_id}`)
    } else {
      navigate('/analysis')
    }
  }

  const handleNewScan = () => {
    setPhase('config')
    setSelectedMarket('')
    setSelectedDomain('all')
    setLookbackDays(90)
    setTriggerEvent('')
    setMissionResult(null)
    setAssessments([])
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

        {/* Scan Mode Selection */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-slate-900">Scan Mode</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Demo Mode */}
              <button
                onClick={() => setLaunchMode('demo')}
                className={clsx(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  launchMode === 'demo'
                    ? 'border-govpulse-500 bg-govpulse-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Play className={clsx(
                    'w-6 h-6',
                    launchMode === 'demo' ? 'text-govpulse-600' : 'text-slate-400'
                  )} />
                  <span className="font-medium text-slate-900">Quick Preview</span>
                </div>
                <p className="text-sm text-slate-600">
                  See how it works with sample data. Results appear instantly.
                </p>
              </button>

              {/* Live Mode */}
              <button
                onClick={() => setLaunchMode('live')}
                disabled={!isGitHubConfigured}
                className={clsx(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  launchMode === 'live'
                    ? 'border-govpulse-500 bg-govpulse-50'
                    : 'border-slate-200 hover:border-slate-300',
                  !isGitHubConfigured && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <RefreshCw className={clsx(
                    'w-6 h-6',
                    launchMode === 'live' ? 'text-govpulse-600' : 'text-slate-400'
                  )} />
                  <span className="font-medium text-slate-900">Live Scan</span>
                  {!isGitHubConfigured && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      Setup required
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  Real-time analysis of current regulatory landscape. Takes 2-5 minutes.
                </p>
              </button>
            </div>
            {!isGitHubConfigured && (
              <p className="text-xs text-slate-500 mt-3">
                Live scanning requires additional setup. You can also run scans directly from{' '}
                <a 
                  href={`https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/actions`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-govpulse-600 hover:underline"
                >
                  GitHub Actions
                </a>.
              </p>
            )}
          </div>
        </div>

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
              <label className="label">Region / Market *</label>
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
              <label className="label">Policy Area</label>
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
              <label className="label">Time Period</label>
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
                How far back to look for regulatory changes
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
                  <strong>Period:</strong> Past {lookbackDays} days
                </p>
                <p>
                  <strong>Mode:</strong> {launchMode === 'live' ? 'Live Scan' : 'Quick Preview'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Launch Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleLaunch}
            disabled={!selectedMarket}
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
  // For live mode, show a different completion screen since we don't have the results locally
  if (launchMode === 'live') {
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
              onClick={() => window.location.href = '/GovPulse/'}
              className="btn-primary"
            >
              Go to Dashboard
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

  // Demo mode complete phase
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Success Header */}
      <div className="card p-8 border-green-200 bg-green-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-green-900">Scan Complete</h2>
            <p className="text-green-700">
              Found {missionResult?.signals.length || 0} policy changes requiring attention
            </p>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      {assessments.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-slate-900">Impact Summary</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {assessments.map((assessment) => (
              <div key={assessment.assessment_id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <RiskBadge level={assessment.risk_level} size="sm" />
                      <span className="text-sm text-slate-500">{assessment.market}</span>
                    </div>
                    <h3 className="font-medium text-slate-900">{assessment.signal_title}</h3>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{assessment.risk_rationale}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="flex items-center gap-1 text-slate-500">
                        <FileText className="w-4 h-4" />
                        {assessment.compliance_gaps.length} action items
                      </span>
                      {assessment.deadline && (
                        <span className="flex items-center gap-1 text-orange-600">
                          <Calendar className="w-4 h-4" />
                          Due: {assessment.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/analysis/${assessment.assessment_id}`)}
                    className="flex items-center gap-1 text-govpulse-600 hover:text-govpulse-700 text-sm whitespace-nowrap"
                  >
                    View details
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {assessments.length === 0 && (
        <div className="card">
          <div className="card-body text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Action Required</h3>
            <p className="text-slate-600">
              No significant regulatory changes found for your selected criteria.
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={handleNewScan} className="btn-secondary">
          New Scan
        </button>
        {assessments.length > 0 && (
          <button onClick={handleViewResults} className="btn-primary">
            View Full Report
          </button>
        )}
      </div>
    </div>
  )
}
