import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import MissionLauncher from './pages/MissionLauncher'
import GapAnalysis from './pages/GapAnalysis'
import AuditTrail from './pages/AuditTrail'
import { ImpactAssessment, ScoutMission, RegulatorySignal } from './types'
import { mockMissions, mockAssessments } from './utils/mockData'

// 从 data/history/ 加载真实数据
async function loadHistoryData(): Promise<{
  missions: ScoutMission[]
  assessments: ImpactAssessment[]
}> {
  try {
    // 尝试获取历史数据目录列表
    const response = await fetch('/data/history/')
    if (!response.ok) {
      console.log('No history data available, using mock data')
      return { missions: [], assessments: [] }
    }

    const html = await response.text()
    // 解析目录列表中的 JSON 文件
    const filePattern = /(MISSION-[^"]+\.json|IMPACT-[^"]+\.json)/g
    const files = html.match(filePattern) || []

    const missions: ScoutMission[] = []
    const assessments: ImpactAssessment[] = []

    for (const file of files) {
      try {
        const fileResponse = await fetch(`/data/history/${file}`)
        if (!fileResponse.ok) continue

        const data = await fileResponse.json()

        if (file.startsWith('MISSION-')) {
          // 转换后端数据格式到前端格式
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

    // 按时间倒序排列
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

  // 加载真实历史数据
  useEffect(() => {
    loadHistoryData().then(({ missions: realMissions, assessments: realAssessments }) => {
      if (realMissions.length > 0 || realAssessments.length > 0) {
        // 合并真实数据和 mock 数据（真实数据优先）
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
