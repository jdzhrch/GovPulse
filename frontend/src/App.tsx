import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import MissionLauncher from './pages/MissionLauncher'
import GapAnalysis from './pages/GapAnalysis'
import AuditTrail from './pages/AuditTrail'
import { ImpactAssessment, ScoutMission } from './types'
import { mockMissions, mockAssessments } from './utils/mockData'

function App() {
  const [missions, setMissions] = useState<ScoutMission[]>(mockMissions)
  const [assessments, setAssessments] = useState<ImpactAssessment[]>(mockAssessments)
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
