import fs from 'node:fs'
import path from 'node:path'

import { getRelatedAssessments } from '../src/lib/scanReportAssociations.ts'
import {
  sortAssessmentsForGapAnalysis,
  sortAssessmentsByPriority,
} from '../src/lib/assessmentSorting.ts'
import type { ImpactAssessment, ScoutMission } from '../src/types/index.ts'

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const historyDir = path.join(repoRoot, 'data', 'history')

const missions: ScoutMission[] = []
const assessments: ImpactAssessment[] = []

for (const fileName of fs.readdirSync(historyDir)) {
  if (!fileName.endsWith('.json')) continue

  const filePath = path.join(historyDir, fileName)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  if (fileName.startsWith('MISSION-')) {
    missions.push(data)
  } else if (fileName.startsWith('IMPACT-')) {
    assessments.push(data)
  }
}

const priorityMission = missions.find((mission) => mission.mission_id === 'MISSION-US-20260408200321')
if (!priorityMission) {
  throw new Error('Missing expected US mission fixture for priority sort check')
}

const prioritySorted = sortAssessmentsByPriority(
  getRelatedAssessments(priorityMission, assessments)
)

if (prioritySorted[0]?.signal_title !== "DOJ Lawsuit Against TikTok for Children's Privacy Violations") {
  throw new Error(
    `Expected P0 DOJ report first in scan report sorting, got "${prioritySorted[0]?.signal_title ?? 'none'}"`
  )
}

const missionSorted = sortAssessmentsForGapAnalysis(assessments, missions)
const latestMission = [...missions].sort(
  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
)[0]
const expectedLatestMissionOrder = sortAssessmentsByPriority(
  getRelatedAssessments(latestMission, assessments)
).map((assessment) => assessment.signal_title)
const topFive = missionSorted.slice(0, 5)
const topFiveTitles = topFive.map((assessment) => assessment.signal_title)
const topFiveRisks = topFive.map((assessment) => assessment.risk_level).join(',')

if (topFiveTitles.join('||') !== expectedLatestMissionOrder.join('||')) {
  throw new Error(
    `Expected policy details to start with latest report ordering.\nExpected: ${expectedLatestMissionOrder.join(' | ')}\nGot: ${topFiveTitles.join(' | ')}`
  )
}

if (topFiveRisks !== 'P1,P1,P1,P2,P2') {
  throw new Error(`Expected policy details secondary sort by priority, got ${topFiveRisks}`)
}

console.log('Assessment sorting checks passed for scan reports and policy details.')
