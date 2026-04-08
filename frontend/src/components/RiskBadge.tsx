import clsx from 'clsx'
import { AlertTriangle, AlertCircle, AlertOctagon, CheckCircle } from 'lucide-react'
import { RiskLevel, RISK_LABELS } from '../types'

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

const toneClasses = {
  P0: 'border-red-200 bg-[var(--critical-soft)] text-[#7d2d21]',
  P1: 'border-orange-200 bg-[var(--high-soft)] text-[#8a531c]',
  P2: 'border-yellow-200 bg-[var(--moderate-soft)] text-[#615a32]',
  P3: 'border-green-200 bg-[var(--low-soft)] text-[#2e4b41]',
}

export default function RiskBadge({ level, size = 'md', showLabel = true }: RiskBadgeProps) {
  const Icon = icons[level]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold tracking-[0.08em] uppercase',
        toneClasses[level],
        sizes[size]
      )}
    >
      <Icon className={iconSizes[size]} />
      <span>{level}</span>
      {showLabel && <span className="font-normal tracking-normal normal-case">({RISK_LABELS[level]})</span>}
    </span>
  )
}
