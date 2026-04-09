import type { ImpactAssessment, ScoutMission } from '../types'

const FALLBACK_MATCH_WINDOW_MS = 2 * 60 * 60 * 1000

export const parseUTCDate = (timestamp: string): Date => {
  const dateStr = timestamp.endsWith('Z') || timestamp.includes('+') ? timestamp : `${timestamp}Z`
  return new Date(dateStr)
}

const normalizeTitle = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLowerCase()

export function getRelatedAssessments(
  mission: ScoutMission | undefined,
  assessments: ImpactAssessment[]
): ImpactAssessment[] {
  if (!mission) {
    return []
  }

  const missionScoped = assessments.filter((assessment) => assessment.mission_id === mission.mission_id)
  if (missionScoped.length > 0) {
    return missionScoped
  }

  const missionTime = parseUTCDate(mission.created_at).getTime()
  const missionSignalIds = new Set(mission.signals.map((signal) => signal.id))
  const missionSignalTitles = new Set(
    mission.signals.map((signal) => normalizeTitle(signal.title))
  )

  const fallbackMatches = assessments.filter((assessment) => {
    if (assessment.market !== mission.market) {
      return false
    }

    const timeDiff = Math.abs(parseUTCDate(assessment.assessed_at).getTime() - missionTime)
    if (timeDiff > FALLBACK_MATCH_WINDOW_MS) {
      return false
    }

    return (
      missionSignalIds.has(assessment.signal_id) ||
      missionSignalTitles.has(normalizeTitle(assessment.signal_title))
    )
  })

  if (fallbackMatches.length > 0) {
    return fallbackMatches
  }

  return assessments.filter((assessment) =>
    assessment.market === mission.market &&
    assessment.assessed_at.slice(0, 10) === mission.created_at.slice(0, 10) &&
    missionSignalTitles.has(normalizeTitle(assessment.signal_title))
  )
}
