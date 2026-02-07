import { forwardRef } from 'react'
import { format } from 'date-fns'
import { QRCodeSVG } from 'qrcode.react'
import { ImpactAssessment, RISK_LABELS, MARKETS } from '../types'

const SITE_BASE = 'https://jdzhrch.github.io/GovPulse'

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
  const reportUrl = `${SITE_BASE}/analysis/${assessment.assessment_id}`

  return (
    <div
      ref={ref}
      style={{
        width: 480,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        backgroundColor: '#ffffff',
        color: '#1e293b',
        lineHeight: 1.5,
        overflow: 'hidden',
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
        <table style={{ borderCollapse: 'collapse', marginBottom: 8 }}>
          <tbody>
            <tr>
              <td style={{ width: 32, height: 32, verticalAlign: 'middle', paddingRight: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    textAlign: 'center',
                    lineHeight: '32px',
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  G
                </div>
              </td>
              <td style={{ verticalAlign: 'middle' }}>
                <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>GovPulse</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ fontSize: 13, opacity: 0.85 }}>Impact Assessment Report</div>
      </div>

      {/* Risk Level + Title */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ marginBottom: 12 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: risk.bg,
              color: risk.text,
              verticalAlign: 'middle',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: risk.accent,
                verticalAlign: 'middle',
                marginRight: 6,
                position: 'relative' as const,
                top: -1,
              }}
            />
            {assessment.risk_level} - {RISK_LABELS[assessment.risk_level]}
          </span>
          <span style={{ fontSize: 13, color: '#64748b', marginLeft: 10, verticalAlign: 'middle' }}>
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
        <div
          style={{
            backgroundColor: risk.bg,
            borderLeft: `3px solid ${risk.accent}`,
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: risk.text, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 }}>
            Risk Summary
          </div>
          <div style={{ fontSize: 13, color: '#334155' }}>{assessment.risk_rationale}</div>
        </div>

        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 }}>
            Business Impact
          </div>
          <div style={{ fontSize: 13, color: '#334155' }}>{assessment.business_impact}</div>
        </div>

        {assessment.deadline && (
          <div
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: 8,
              padding: '12px 16px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 }}>
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
                  marginBottom: i < assessment.compliance_gaps.length - 1 ? 8 : 0,
                }}
              >
                <div style={{ marginBottom: 6 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: sev.bg,
                      color: sev.text,
                      verticalAlign: 'middle',
                    }}
                  >
                    {severityLabels[gap.gap_severity] || gap.gap_severity}
                  </span>
                  {gap.is_blocking && (
                    <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginLeft: 8, verticalAlign: 'middle' }}>
                      Blocking
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace", marginLeft: 8, verticalAlign: 'middle' }}>
                    {gap.baseline_policy_id}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#334155' }}>{gap.gap_description}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Remediations */}
      {assessment.remediations.length > 0 && (
        <div style={{ padding: '16px 28px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
            Recommended Changes ({assessment.remediations.length})
          </div>
          {assessment.remediations.map((rem, i) => (
            <table
              key={rem.remediation_id || i}
              style={{
                borderCollapse: 'collapse',
                width: '100%',
                borderBottom: i < assessment.remediations.length - 1 ? '1px solid #f1f5f9' : 'none',
                marginBottom: i < assessment.remediations.length - 1 ? 8 : 0,
                paddingBottom: 8,
              }}
            >
              <tbody>
                <tr>
                  <td style={{ width: 24, verticalAlign: 'top', paddingTop: 2, paddingRight: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0284c7' }}>
                      {i + 1}.
                    </span>
                  </td>
                  <td style={{ verticalAlign: 'top' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{rem.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Effort: {effortLabels[rem.engineering_effort] || rem.engineering_effort}
                      {rem.affected_features.length > 0 && ` · ${rem.affected_features.join(', ')}`}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          ))}
        </div>
      )}

      {/* Next Steps */}
      {assessment.recommended_actions.length > 0 && (
        <div style={{ padding: '16px 28px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
            Next Steps
          </div>
          {assessment.recommended_actions.map((action, i) => (
            <table
              key={i}
              style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 6 }}
            >
              <tbody>
                <tr>
                  <td style={{ width: 28, verticalAlign: 'top', paddingTop: 1 }}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        fontSize: 12,
                        fontWeight: 600,
                        textAlign: 'center',
                        lineHeight: '22px',
                      }}
                    >
                      {i + 1}
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'top', paddingTop: 2 }}>
                    <span style={{ fontSize: 13, color: '#334155' }}>{action}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          ))}
        </div>
      )}

      {/* QR Code + Footer */}
      <div
        style={{
          padding: '20px 28px',
          backgroundColor: '#f8fafc',
        }}
      >
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'middle' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  Scan to view full report
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
                  Generated by GovPulse · {format(new Date(), 'MMM d, yyyy')}
                </div>
                <div style={{ fontSize: 10, color: '#cbd5e1', wordBreak: 'break-all' as const, maxWidth: 300 }}>
                  {reportUrl}
                </div>
              </td>
              <td style={{ width: 80, verticalAlign: 'middle', textAlign: 'right' }}>
                <QRCodeSVG
                  value={reportUrl}
                  size={72}
                  level="M"
                  bgColor="#f8fafc"
                  fgColor="#0f172a"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
})

ShareCard.displayName = 'ShareCard'

export default ShareCard
