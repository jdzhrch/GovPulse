import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import MissionLauncher from './pages/MissionLauncher'
import GapAnalysis from './pages/GapAnalysis'
import ScanReport from './pages/ScanReport'
import { ImpactAssessment, ScoutMission, RegulatorySignal } from './types'
import { normalizeRegulatoryTitle } from './lib/regulatoryTitles'

// Use base URL from Vite config
const BASE_URL = import.meta.env.BASE_URL || '/'

// Load real data from data/history/ with cache busting
async function loadHistoryData(): Promise<{
  missions: ScoutMission[]
  assessments: ImpactAssessment[]
}> {
  try {
    // Add cache buster to prevent browser caching issues
    const cacheBuster = `?t=${Date.now()}`
    
    // First try to load manifest.json which lists all available files
    const manifestUrl = `${BASE_URL}data/history/manifest.json${cacheBuster}`
    console.log('Fetching manifest from:', manifestUrl)
    const manifestResponse = await fetch(manifestUrl, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    })
    let files: string[] = []
    
    if (manifestResponse.ok) {
      const manifest = await manifestResponse.json()
      files = manifest.files || []
      console.log(`Loaded manifest with ${files.length} files:`, files)
    } else {
      console.log('Manifest not found or error:', manifestResponse.status)
      // Fallback: try to fetch directory listing (works on some servers)
      const response = await fetch(`${BASE_URL}data/history/`)
      if (response.ok) {
        const html = await response.text()
        const filePattern = /(MISSION-[^"<>\s]+\.json|IMPACT-[^"<>\s]+\.json)/g
        files = [...new Set(html.match(filePattern) || [])]
      }
    }

    if (files.length === 0) {
      console.log('No history data available')
      return { missions: [], assessments: [] }
    }

    const missions: ScoutMission[] = []
    const assessments: ImpactAssessment[] = []

    // Fetch all files in parallel with cache busting
    const fetchPromises = files.map(async (file) => {
      try {
        const fileResponse = await fetch(`${BASE_URL}data/history/${file}${cacheBuster}`, {
          cache: 'no-store'
        })
        if (!fileResponse.ok) return null
        return { file, data: await fileResponse.json() }
      } catch (e) {
        console.warn(`Failed to load ${file}:`, e)
        return null
      }
    })

    const results = await Promise.all(fetchPromises)

    for (const result of results) {
      if (!result) continue
      const { file, data } = result

      if (file.startsWith('MISSION-')) {
        // Convert backend data format to frontend format
        const mission: ScoutMission = {
          mission_id: data.mission_id,
          market: data.market,
          domain: data.domain,
          lookback_days: data.lookback_days,
          created_at: data.created_at,
          created_by: data.created_by,
          status: data.status,
          signals: (data.signals || []).map((s: RegulatorySignal) => ({
            ...s,
            title: normalizeRegulatoryTitle(s.title),
            effective_date: s.effective_date || null
          }))
        }
        missions.push(mission)
      } else if (file.startsWith('IMPACT-')) {
        const assessment: ImpactAssessment = {
          ...data,
          mission_id: data.mission_id || null,
          signal_title: normalizeRegulatoryTitle(data.signal_title),
          deadline: data.deadline || null,
          pushed_to_pm: false
        }
        assessments.push(assessment)
      }
    }

    // Sort by time descending
    missions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    assessments.sort((a, b) => new Date(b.assessed_at).getTime() - new Date(a.assessed_at).getTime())

    return { missions, assessments }
  } catch (e) {
    console.log('Failed to load history data:', e)
    return { missions: [], assessments: [] }
  }
}

function App() {
  const [missions, setMissions] = useState<ScoutMission[]>([])
  const [assessments, setAssessments] = useState<ImpactAssessment[]>([])
  const [, setIsLoading] = useState(true)
  const location = useLocation()

  // Function to load data
  const refreshData = useCallback(async () => {
    const { missions: realMissions, assessments: realAssessments } = await loadHistoryData()
    setMissions(realMissions)
    setAssessments(realAssessments)
    console.log('Loaded data:', { 
      missions: realMissions.length, 
      assessments: realAssessments.length
    })
    setIsLoading(false)
  }, [])

  // Load data on mount and when navigating to dashboard or analysis pages
  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Refresh data when navigating to dashboard or analysis pages (to pick up new results)
  useEffect(() => {
    if (location.pathname === '/' || location.pathname.startsWith('/analysis') || location.pathname.startsWith('/reports')) {
      refreshData()
    }
  }, [location.pathname, refreshData])
  const [selectedAssessment, setSelectedAssessment] = useState<ImpactAssessment | null>(null)

  const handlePushToPM = (assessmentId: string) => {
    setAssessments(prev =>
      prev.map(a =>
        a.assessment_id === assessmentId
          ? { ...a, pushed_to_pm: true, pushed_at: new Date().toISOString() }
          : a
      )
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard missions={missions} assessments={assessments} />} />
        <Route path="launch" element={<MissionLauncher />} />
        <Route
          path="reports"
          element={
            <ScanReport
              missions={missions}
              assessments={assessments}
              onPushToPM={handlePushToPM}
            />
          }
        />
        <Route
          path="reports/:missionId"
          element={
            <ScanReport
              missions={missions}
              assessments={assessments}
              onPushToPM={handlePushToPM}
            />
          }
        />
        <Route
          path="analysis"
          element={
            <GapAnalysis
              assessments={assessments}
              selectedAssessment={selectedAssessment}
              onSelectAssessment={setSelectedAssessment}
              onPushToPM={handlePushToPM}
            />
          }
        />
        <Route
          path="analysis/:assessmentId"
          element={
            <GapAnalysis
              assessments={assessments}
              selectedAssessment={selectedAssessment}
              onSelectAssessment={setSelectedAssessment}
              onPushToPM={handlePushToPM}
            />
          }
        />
      </Route>
    </Routes>
  )
}

export default App
