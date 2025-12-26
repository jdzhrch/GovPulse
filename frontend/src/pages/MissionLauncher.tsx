import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Rocket,
  Globe,
  Shield,
  ShoppingCart,
  Database,
  MessageSquare,
  Calendar,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Github,
  AlertCircle,
  Cloud
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

const lookbackOptions = [
  { value: 30, label: '30 Days' },
  { value: 90, label: '90 Days' },
  { value: 180, label: '6 Months' },
  { value: 365, label: '1 Year' },
]

type LaunchPhase = 'config' | 'triggering' | 'scanning' | 'analyzing' | 'complete' | 'error'
type LaunchMode = 'local' | 'github'

// GitHub Actions trigger configuration
const GITHUB_CONFIG = {
  owner: import.meta.env.VITE_GITHUB_REPO_OWNER || '',
  repo: import.meta.env.VITE_GITHUB_REPO_NAME || 'GovPulse',
  workflow: 'scout_worker.yml',
}

/**
 * Trigger GitHub Actions workflow via repository_dispatch
 */
async function triggerGitHubWorkflow(params: {
  market: string
  domain: string
  lookbackDays: number
  triggerEvent: string
}): Promise<{ success: boolean; runUrl?: string; error?: string }> {
  const token = import.meta.env.VITE_GITHUB_TOKEN

  if (!token) {
    return {
      success: false,
      error: 'GitHub Token not configured. Set VITE_GITHUB_TOKEN in .env.local'
    }
  }

  if (!GITHUB_CONFIG.owner) {
    return {
      success: false,
      error: 'GitHub repo owner not configured. Set VITE_GITHUB_REPO_OWNER in .env.local'
    }
  }

  try {
    // Use workflow_dispatch event to trigger the action
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
            trigger_event: params.triggerEvent || 'Manual trigger from dashboard'
          }
        })
      }
    )

    if (response.status === 204) {
      // Success - workflow dispatched
      const runUrl = `https://github.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/actions/workflows/${GITHUB_CONFIG.workflow}`
      return { success: true, runUrl }
    } else {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
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
  const [launchMode, setLaunchMode] = useState<LaunchMode>('local')
  const [missionResult, setMissionResult] = useState<ScoutMission | null>(null)
  const [assessments, setAssessments] = useState<ImpactAssessment[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [githubRunUrl, setGithubRunUrl] = useState('')

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

  const handleLaunchLocal = async () => {
    if (!selectedMarket) return

    setPhase('scanning')

    // Simulate scanning phase
    await new Promise(resolve => setTimeout(resolve, 2000))

    const mission = createMockMission(
      selectedMarket,
      selectedDomain,
      lookbackDays,
      'current_user'
    )
    setMissionResult(mission)
    onMissionCreate(mission)

    setPhase('analyzing')

    // Simulate analysis phase
    await new Promise(resolve => setTimeout(resolve, 2500))

    // Generate assessments for each signal
    const newAssessments = mission.signals.map(signal =>
      createMockAssessment(signal, 'current_user')
    )
    setAssessments(newAssessments)
    newAssessments.forEach(a => onAssessmentCreate(a))

    setPhase('complete')
  }

  const handleLaunchGitHub = async () => {
    if (!selectedMarket) return

    setPhase('triggering')
    setErrorMessage('')

    const result = await triggerGitHubWorkflow({
      market: selectedMarket,
      domain: selectedDomain,
      lookbackDays,
      triggerEvent
    })

    if (result.success) {
      setGithubRunUrl(result.runUrl || '')
      setPhase('scanning')

      // Show success state after a delay
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Create a pending mission record locally
      const mission = createMockMission(
        selectedMarket,
        selectedDomain,
        lookbackDays,
        'github_actions'
      )
      mission.status = 'running'
      setMissionResult(mission)
      onMissionCreate(mission)

      setPhase('complete')
    } else {
      setErrorMessage(result.error || 'Failed to trigger GitHub Action')
      setPhase('error')
    }
  }

  const handleLaunch = async () => {
    if (launchMode === 'github') {
      await handleLaunchGitHub()
    } else {
      await handleLaunchLocal()
    }
  }

  const handleViewAnalysis = () => {
    if (assessments.length > 0) {
      navigate(`/analysis/${assessments[0].assessment_id}`)
    } else {
      navigate('/analysis')
    }
  }

  const handleNewMission = () => {
    setPhase('config')
    setSelectedMarket('')
    setSelectedDomain('all')
    setLookbackDays(90)
    setTriggerEvent('')
    setMissionResult(null)
    setAssessments([])
    setErrorMessage('')
    setGithubRunUrl('')
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
              <h2 className="text-xl font-bold text-red-900">Mission Launch Failed</h2>
              <p className="text-red-700">Unable to trigger the GitHub Action workflow</p>
            </div>
          </div>
          <div className="bg-red-100 rounded-lg p-4 mb-6">
            <pre className="text-sm text-red-800 whitespace-pre-wrap">{errorMessage}</pre>
          </div>
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <h3 className="font-medium text-slate-900 mb-2">Configuration Required</h3>
            <p className="text-sm text-slate-600 mb-3">
              To use GitHub Actions integration, configure the following environment variables in <code className="bg-slate-100 px-1 rounded">frontend/.env.local</code>:
            </p>
            <pre className="bg-slate-900 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`VITE_GITHUB_TOKEN=ghp_your_token_here
VITE_GITHUB_REPO_OWNER=your_username
VITE_GITHUB_REPO_NAME=GovPulse`}
            </pre>
          </div>
          <div className="flex justify-end mt-6">
            <button onClick={handleNewMission} className="btn-secondary">
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
          <h1 className="text-2xl font-bold text-slate-900">Launch Scout Mission</h1>
          <p className="text-slate-600 mt-1">
            Configure and deploy a regulatory intelligence gathering mission
          </p>
        </div>

        {/* Launch Mode Selection */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-slate-900">Execution Mode</h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local Mode */}
              <button
                onClick={() => setLaunchMode('local')}
                className={clsx(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  launchMode === 'local'
                    ? 'border-govpulse-500 bg-govpulse-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Cloud className={clsx(
                    'w-6 h-6',
                    launchMode === 'local' ? 'text-govpulse-600' : 'text-slate-400'
                  )} />
                  <span className="font-medium text-slate-900">Local Demo</span>
                </div>
                <p className="text-sm text-slate-600">
                  Run analysis with simulated data. Instant results, no API keys required.
                </p>
              </button>

              {/* GitHub Actions Mode */}
              <button
                onClick={() => setLaunchMode('github')}
                disabled={!isGitHubConfigured}
                className={clsx(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  launchMode === 'github'
                    ? 'border-govpulse-500 bg-govpulse-50'
                    : 'border-slate-200 hover:border-slate-300',
                  !isGitHubConfigured && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Github className={clsx(
                    'w-6 h-6',
                    launchMode === 'github' ? 'text-govpulse-600' : 'text-slate-400'
                  )} />
                  <span className="font-medium text-slate-900">GitHub Actions</span>
                  {!isGitHubConfigured && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                      Local dev only
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  Trigger real analysis via GitHub Actions. Results auto-commit to repository.
                </p>
              </button>
            </div>
            {!isGitHubConfigured && (
              <p className="text-xs text-slate-500 mt-3">
                GitHub Actions integration requires local development setup. Use "Local Demo" mode on deployed site, or trigger workflows directly from the <a href="https://github.com/jdzhrch/GovPulse/actions" target="_blank" rel="noopener noreferrer" className="text-govpulse-600 hover:underline">GitHub Actions page</a>.
              </p>
            )}
          </div>
        </div>

        {/* Mission Parameters */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-slate-900">Mission Parameters</h2>
          </div>
          <div className="card-body space-y-6">
            {/* Trigger Event */}
            <div>
              <label className="label">Trigger Event (Optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., 'US TikTok Ban Update' or 'Indonesia E-Commerce Regulation'"
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Describe the regulatory event prompting this mission
              </p>
            </div>

            {/* Market Selection */}
            <div>
              <label className="label">Target Market *</label>
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
                    <p className="text-xs text-govpulse-600 mt-1">
                      {market.active_regulations} active
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Domain Selection */}
            <div>
              <label className="label">Policy Domain</label>
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
                      <p className="font-medium text-slate-900 mt-2 text-sm">{domain.label}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Lookback Period */}
            <div>
              <label className="label">Lookback Period</label>
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
            </div>
          </div>
        </div>

        {/* Mission Preview */}
        {selectedMarket && (
          <div className="card border-govpulse-200 bg-govpulse-50">
            <div className="card-body">
              <h3 className="font-semibold text-govpulse-900 mb-2">Mission Preview</h3>
              <div className="text-sm text-govpulse-700 space-y-1">
                <p>
                  <strong>Mode:</strong> {launchMode === 'github' ? 'GitHub Actions' : 'Local Demo'}
                </p>
                <p>
                  <strong>Target:</strong> {MARKETS.find(m => m.code === selectedMarket)?.name} ({selectedMarket})
                </p>
                <p>
                  <strong>Domain:</strong> {DOMAINS.find(d => d.value === selectedDomain)?.label}
                </p>
                <p>
                  <strong>Lookback:</strong> {lookbackDays} days
                </p>
                {triggerEvent && (
                  <p>
                    <strong>Event:</strong> {triggerEvent}
                  </p>
                )}
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
            {launchMode === 'github' ? (
              <>
                <Github className="w-5 h-5" />
                Trigger GitHub Action
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                Launch Mission
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  // Triggering/Scanning/Analyzing Phase
  if (phase === 'triggering' || phase === 'scanning' || phase === 'analyzing') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-govpulse-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-govpulse-600 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {phase === 'triggering'
              ? 'Triggering GitHub Action...'
              : phase === 'scanning'
              ? 'Scanning Regulatory Sources...'
              : 'Analyzing Compliance Gaps...'}
          </h2>
          <p className="text-slate-600 mb-6">
            {phase === 'triggering'
              ? 'Sending dispatch event to GitHub Actions workflow'
              : phase === 'scanning'
              ? 'Searching government databases, legal repositories, and regulatory feeds'
              : 'Comparing detected signals against internal compliance baseline'}
          </p>

          {/* Progress indicators */}
          <div className="space-y-3 max-w-md mx-auto text-left">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-slate-600">Mission initialized</span>
            </div>
            {launchMode === 'github' && (
              <div className="flex items-center gap-3">
                {phase === 'triggering' ? (
                  <Loader2 className="w-5 h-5 text-govpulse-500 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                <span className="text-sm text-slate-600">GitHub Action dispatched</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              {phase === 'scanning' || phase === 'triggering' ? (
                phase === 'triggering' ? (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                ) : (
                  <Loader2 className="w-5 h-5 text-govpulse-500 animate-spin" />
                )
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              <span className="text-sm text-slate-600">
                Scanning {MARKETS.find(m => m.code === selectedMarket)?.name} regulatory sources
              </span>
            </div>
            {phase === 'analyzing' && (
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-govpulse-500 animate-spin" />
                <span className="text-sm text-slate-600">Running gap analysis against baseline</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Complete Phase
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Success Header */}
      <div className="card p-8 border-green-200 bg-green-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-green-900">
              {launchMode === 'github' ? 'GitHub Action Triggered' : 'Mission Complete'}
            </h2>
            <p className="text-green-700">
              {launchMode === 'github'
                ? 'Workflow is running. Results will be committed to the repository.'
                : `${missionResult?.signals.length || 0} regulatory signals detected and analyzed`}
            </p>
          </div>
        </div>
        {githubRunUrl && (
          <div className="mt-4 pt-4 border-t border-green-200">
            <a
              href={githubRunUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 font-medium"
            >
              <Github className="w-4 h-4" />
              View workflow runs on GitHub
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>

      {/* Results Summary (only for local mode) */}
      {launchMode === 'local' && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-slate-900">Impact Assessment Results</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {assessments.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                No regulatory signals detected for the selected criteria.
              </div>
            ) : (
              assessments.map((assessment) => (
                <div key={assessment.assessment_id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <RiskBadge level={assessment.risk_level} size="sm" />
                        <span className="text-sm text-slate-500">{assessment.market}</span>
                      </div>
                      <h3 className="font-medium text-slate-900">{assessment.signal_title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{assessment.risk_rationale}</p>
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="flex items-center gap-1 text-slate-500">
                          <AlertTriangle className="w-4 h-4" />
                          {assessment.compliance_gaps.length} gaps
                        </span>
                        {assessment.deadline && (
                          <span className="flex items-center gap-1 text-orange-600">
                            <Calendar className="w-4 h-4" />
                            Deadline: {assessment.deadline}
                          </span>
                        )}
                      </div>
                    </div>
                    <a
                      href="#"
                      className="flex items-center gap-1 text-govpulse-600 hover:text-govpulse-700 text-sm"
                      onClick={(e) => {
                        e.preventDefault()
                        navigate(`/analysis/${assessment.assessment_id}`)
                      }}
                    >
                      View details
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* GitHub Mode Info */}
      {launchMode === 'github' && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-slate-900">What Happens Next</h2>
          </div>
          <div className="card-body">
            <ol className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-govpulse-100 text-govpulse-700 flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
                <span>GitHub Actions will run the scout_engine.py with your parameters</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-govpulse-100 text-govpulse-700 flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
                <span>LLM-powered analysis will scan regulatory sources for {MARKETS.find(m => m.code === selectedMarket)?.name}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-govpulse-100 text-govpulse-700 flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
                <span>Results will be committed to <code className="bg-slate-100 px-1 rounded">data/history/</code></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-govpulse-100 text-govpulse-700 flex items-center justify-center flex-shrink-0 text-xs font-medium">4</span>
                <span>Dashboard will be redeployed with updated data</span>
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={handleNewMission} className="btn-secondary">
          Launch New Mission
        </button>
        {launchMode === 'local' && (
          <button onClick={handleViewAnalysis} className="btn-primary">
            View Full Analysis
          </button>
        )}
      </div>
    </div>
  )
}
