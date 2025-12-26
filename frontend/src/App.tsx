import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import MissionLauncher from './pages/MissionLauncher'
import GapAnalysis from './pages/GapAnalysis'
import AuditTrail from './pages/AuditTrail'
import { ImpactAssessment, ScoutMission, RegulatorySignal } from './types'
import { mockMissions, mockAssessments } from './utils/mockData'

// Use base URL from Vite config
const BASE_URL = import.meta.env.BASE_URL || '/'

// Load real data from data/history/
async function loadHistoryData(): Promise<{
  missions: ScoutMission[]
  assessments: ImpactAssessment[]
}> {
  try {
    // First try to load manifest.json which lists all available files
    const manifestUrl = `${BASE_URL}data/history/manifest.json`
    console.log('Fetching manifest from:', manifestUrl)
    const manifestResponse = await fetch(manifestUrl)
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
      console.log('No history data available, using mock data')
      return { missions: [], assessments: [] }
    }

    const missions: ScoutMission[] = []
    const assessments: ImpactAssessment[] = []

    for (const file of files) {
      try {
        const fileResponse = await fetch(`${BASE_URL}data/history/${file}`)
        if (!fileResponse.ok) continue

        const data = await fileResponse.json()

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
              effective_date: s.effective_date || null
            }))
          }
          missions.push(mission)
        } else if (file.startsWith('IMPACT-')) {
          const assessment: ImpactAssessment = {
            ...data,
            deadline: data.deadline || null,
            pushed_to_pm: false
          }
          assessments.push(assessment)
        }
      } catch (e) {
        console.warn(`Failed to load ${file}:`, e)
      }
    }

    // Sort by time descending
    missions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    assessments.sort((a, b) => new Date(b.assessed_at).getTime() - new Date(a.assessed_at).getTime())

    return { missions, assessments }
  } catch (e) {
    console.log('Failed to load history data, using mock data:', e)
    return { missions: [], assessments: [] }
  }
}

function App() {
  const [missions, setMissions] = useState<ScoutMission[]>(mockMissions)
  const [assessments, setAssessments] = useState<ImpactAssessment[]>(mockAssessments)
  const [, setIsLoading] = useState(true)

  // Load real history data
  useEffect(() => {
    loadHistoryData().then(({ missions: realMissions, assessments: realAssessments }) => {
      if (realMissions.length > 0 || realAssessments.length > 0) {
        // Merge real data with mock data (real data first)
        setMissions([...realMissions, ...mockMissions])
        setAssessments([...realAssessments, ...mockAssessments])
      }
      setIsLoading(false)
    })
  }, [])
  const [selectedAssessment, setSelectedAssessment] = useState<ImpactAssessment | null>(null)

  const handleMissionCreate = (mission: ScoutMission) => {
    setMissions(prev => [mission, ...prev])
  }

  const handleAssessmentCreate = (assessment: ImpactAssessment) => {
    setAssessments(prev => [assessment, ...prev])
  }

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
        <Route
          path="launch"
          element={
            <MissionLauncher
              onMissionCreate={handleMissionCreate}
              onAssessmentCreate={handleAssessmentCreate}
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
        <Route
          path="audit"
          element={
            <AuditTrail missions={missions} assessments={assessments} onPushToPM={handlePushToPM} />
          }
        />
      </Route>
    </Routes>
  )
}

export default App
