import clsx from 'clsx'
import { AlertTriangle, AlertCircle, AlertOctagon, CheckCircle } from 'lucide-react'
import { RiskLevel, RISK_COLORS, RISK_LABELS } from '../types'

interface RiskBadgeProps {
  level: RiskLevel
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const icons = {
  P0: AlertOctagon,
  P1: AlertTriangle,
  P2: AlertCircle,
  P3: CheckCircle,
}

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
}

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export default function RiskBadge({ level, size = 'md', showLabel = true }: RiskBadgeProps) {
  const Icon = icons[level]
  const colors = RISK_COLORS[level]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 font-semibold rounded-full',
        colors.bg,
        colors.text,
        sizes[size]
      )}
    >
      <Icon className={iconSizes[size]} />
      <span>{level}</span>
      {showLabel && <span className="font-normal">({RISK_LABELS[level]})</span>}
    </span>
  )
}
