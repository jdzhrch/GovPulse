import { forwardRef } from 'react'
import { format } from 'date-fns'
import { ImpactAssessment, RISK_LABELS, MARKETS } from '../types'

const parseUTCDate = (timestamp: string): Date => {
  const dateStr = timestamp.endsWith('Z') || timestamp.includes('+') ? timestamp : timestamp + 'Z'
  return new Date(dateStr)
}

const riskStyles: Record<string, { bg: string; text: string; accent: string }> = {
  P0: { bg: '#fef2f2', text: '#991b1b', accent: '#dc2626' },
  P1: { bg: '#fff7ed', text: '#9a3412', accent: '#ea580c' },
  P2: { bg: '#fefce8', text: '#854d0e', accent: '#eab308' },
  P3: { bg: '#f0fdf4', text: '#166534', accent: '#22c55e' },
}

const severityStyles: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#fef2f2', text: '#991b1b' },
  major: { bg: '#fff7ed', text: '#9a3412' },
  minor: { bg: '#fefce8', text: '#854d0e' },
}

const severityLabels: Record<string, string> = {
  critical: 'Urgent',
  major: 'Important',
  minor: 'Low',
}

const effortLabels: Record<string, string> = {
  S: '1-2 days',
  M: '1-2 weeks',
  L: '1-2 months',
  XL: '2+ months',
}

interface ShareCardProps {
  assessment: ImpactAssessment
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(({ assessment }, ref) => {
  const risk = riskStyles[assessment.risk_level] || riskStyles.P3
  const market = MARKETS.find(m => m.code === assessment.market)

  return (
    <div
      ref={ref}
      style={{
        width: 480,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        backgroundColor: '#ffffff',
        color: '#1e293b',
        lineHeight: 1.5,
      }}
    >
      {/* Branded Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          padding: '24px 28px',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            G
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>GovPulse</span>
        </div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>Impact Assessment Report</div>
      </div>

      {/* Risk Level + Title */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 12px',
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: risk.bg,
              color: risk.text,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: risk.accent,
                display: 'inline-block',
              }}
            />
            {assessment.risk_level} - {RISK_LABELS[assessment.risk_level]}
          </span>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            {market?.name || assessment.market}
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>
          {assessment.signal_title}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
          Analyzed {format(parseUTCDate(assessment.assessed_at), 'MMMM d, yyyy')}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ padding: '16px 28px', borderBottom: '1px solid #e2e8f0' }}>
        {/* Risk Rationale */}
        <div
          style={{
            backgroundColor: risk.bg,
            borderLeft: `3px solid ${risk.accent}`,
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: risk.text, textTransform: 'uppercase' as const, marginBottom: 4 }}>
            Risk Summary
          </div>
          <div style={{ fontSize: 13, color: '#334155' }}>{assessment.risk_rationale}</div>
        </div>

        {/* Business Impact */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, marginBottom: 4 }}>
            Business Impact
          </div>
          <div style={{ fontSize: 13, color: '#334155' }}>{assessment.business_impact}</div>
        </div>

        {/* Deadline */}
        {assessment.deadline && (
          <div
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: 8,
              padding: '12px 16px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, marginBottom: 4 }}>
              Action Deadline
            </div>
            <div style={{ fontSize: 13, color: '#334155' }}>
              {format(parseUTCDate(assessment.deadline), 'MMMM d, yyyy')}
            </div>
          </div>
        )}
      </div>

      {/* Compliance Gaps */}
      {assessment.compliance_gaps.length > 0 && (
        <div style={{ padding: '16px 28px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
            Compliance Gaps ({assessment.compliance_gaps.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {assessment.compliance_gaps.map((gap, i) => {
              const sev = severityStyles[gap.gap_severity] || severityStyles.minor
              return (
                <div
                  key={gap.gap_id || i}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '10px 14px',
                    backgroundColor: gap.is_blocking ? '#fef2f2' : '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 4,
                        backgroundColor: sev.bg,
                        color: sev.text,
                      }}
                    >
                      {severityLabels[gap.gap_severity] || gap.gap_severity}
                    </span>
                    {gap.is_blocking && (
                      <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                        Blocking
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                      {gap.baseline_policy_id}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#334155' }}>{gap.gap_description}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Remediations */}
      {assessment.remediations.length > 0 && (
        <div style={{ padding: '16px 28px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
            Recommended Changes ({assessment.remediations.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
            {assessment.remediations.map((rem, i) => (
              <div
                key={rem.remediation_id || i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '8px 0',
                  borderBottom: i < assessment.remediations.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0284c7',
                    flexShrink: 0,
                    width: 20,
                  }}
                >
                  {i + 1}.
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{rem.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Effort: {effortLabels[rem.engineering_effort] || rem.engineering_effort}
                    {rem.affected_features.length > 0 && (
                      <span> &middot; {rem.affected_features.join(', ')}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps */}
      {assessment.recommended_actions.length > 0 && (
        <div style={{ padding: '16px 28px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
            Next Steps
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
            {assessment.recommended_actions.map((action, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 13, color: '#334155', paddingTop: 2 }}>{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          padding: '16px 28px',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Generated by GovPulse</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            {format(new Date(), 'MMMM d, yyyy')}
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>jdzhrch.github.io/GovPulse</div>
      </div>
    </div>
  )
})

ShareCard.displayName = 'ShareCard'

export default ShareCard
