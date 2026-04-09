import type { ImpactAssessment, RiskLevel, ScoutMission } from '../types/index.ts'
import { getRelatedAssessments, parseUTCDate } from './scanReportAssociations.ts'

const RISK_ORDER: Record<RiskLevel, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
}

const getRiskOrder = (riskLevel: RiskLevel): number => RISK_ORDER[riskLevel] ?? Number.MAX_SAFE_INTEGER

export function compareAssessmentsByPriority(a: ImpactAssessment, b: ImpactAssessment): number {
  const riskDiff = getRiskOrder(a.risk_level) - getRiskOrder(b.risk_level)
  if (riskDiff !== 0) {
    return riskDiff
  }

  const assessedAtDiff = parseUTCDate(b.assessed_at).getTime() - parseUTCDate(a.assessed_at).getTime()
  if (assessedAtDiff !== 0) {
    return assessedAtDiff
  }

  return a.signal_title.localeCompare(b.signal_title)
}

export function sortAssessmentsByPriority(assessments: ImpactAssessment[]): ImpactAssessment[] {
  return [...assessments].sort(compareAssessmentsByPriority)
}

export function sortAssessmentsForGapAnalysis(
  assessments: ImpactAssessment[],
  missions: ScoutMission[]
): ImpactAssessment[] {
  const assessmentMissionOrder = new Map<string, number>()
  const orderedMissions = [...missions].sort(
    (a, b) => parseUTCDate(b.created_at).getTime() - parseUTCDate(a.created_at).getTime()
  )

  orderedMissions.forEach((mission, index) => {
    const relatedAssessments = getRelatedAssessments(mission, assessments)
    relatedAssessments.forEach((assessment) => {
      if (!assessmentMissionOrder.has(assessment.assessment_id)) {
        assessmentMissionOrder.set(assessment.assessment_id, index)
      }
    })
  })

  return [...assessments].sort((a, b) => {
    const missionDiff =
      (assessmentMissionOrder.get(a.assessment_id) ?? Number.MAX_SAFE_INTEGER) -
      (assessmentMissionOrder.get(b.assessment_id) ?? Number.MAX_SAFE_INTEGER)

    if (missionDiff !== 0) {
      return missionDiff
    }

    return compareAssessmentsByPriority(a, b)
  })
}
