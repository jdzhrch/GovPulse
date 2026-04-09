import fs from 'node:fs'
import path from 'node:path'
import { getRelatedAssessments } from '../src/lib/scanReportAssociations.ts'
import type { ImpactAssessment, ScoutMission } from '../src/types/index.ts'

const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const historyDir = path.join(repoRoot, 'data', 'history')

const missions: ScoutMission[] = []
const assessments: ImpactAssessment[] = []

for (const fileName of fs.readdirSync(historyDir)) {
  if (!fileName.endsWith('.json')) {
    continue
  }

  const filePath = path.join(historyDir, fileName)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  if (fileName.startsWith('MISSION-')) {
    missions.push(data)
  } else if (fileName.startsWith('IMPACT-')) {
    assessments.push(data)
  }
}

missions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

const latestUsMission = missions.find((mission) => mission.market === 'US')
if (!latestUsMission) {
  throw new Error('No US mission found in data/history')
}

const relatedAssessments = getRelatedAssessments(latestUsMission, assessments)

if (latestUsMission.signals.length !== 5) {
  throw new Error(`Expected latest US mission to have 5 signals, found ${latestUsMission.signals.length}`)
}

if (relatedAssessments.length !== latestUsMission.signals.length) {
  throw new Error(
    `Expected ${latestUsMission.signals.length} related assessments for ${latestUsMission.mission_id}, ` +
    `found ${relatedAssessments.length}`
  )
}

console.log(
  `Latest US scan report links ${relatedAssessments.length} assessments to ${latestUsMission.signals.length} signals.`
)
