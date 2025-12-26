import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, FileText, AlertTriangle, CheckCircle, Info, ExternalLink, Globe, Filter } from 'lucide-react';
import { useState } from 'react';
import { ImpactAssessment, ScoutMission, RISK_COLORS, RISK_LABELS, RiskLevel } from '../types';

interface ScanReportProps {
  missions: ScoutMission[];
  assessments: ImpactAssessment[];
  onPushToPM: (assessmentId: string) => void;
}

// Format date in local timezone
function formatLocalDate(dateString: string, includeTime: boolean = false): string {
  const date = new Date(dateString);
  if (includeTime) {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Get risk badge styling
function getRiskBadge(risk: RiskLevel) {
  const colors = RISK_COLORS[risk];
  const IconComponent = risk === 'P0' || risk === 'P1' ? AlertTriangle : 
                        risk === 'P2' ? Info : CheckCircle;
  return { ...colors, icon: IconComponent, label: RISK_LABELS[risk] };
}

// Get date range from signals in a mission
function getMissionDateRange(mission: ScoutMission): { earliest: string; latest: string } | null {
  if (!mission.signals || mission.signals.length === 0) return null;
  
  const dates = mission.signals
    .map(s => new Date(s.published_date))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  
  if (dates.length === 0) return null;
  
  return {
    earliest: dates[0].toISOString(),
    latest: dates[dates.length - 1].toISOString()
  };
}

// Scan Report List Component
function ScanReportList({ missions, assessments }: { missions: ScoutMission[]; assessments: ImpactAssessment[] }) {
  const [countryFilter, setCountryFilter] = useState<string>('all');
  
  // Get unique countries from missions
  const countries = [...new Set(missions.map(m => m.market))].sort();
  
  // Filter missions
  const filteredMissions = countryFilter === 'all' 
    ? missions 
    : missions.filter(m => m.market === countryFilter);

  // Get assessments for a mission
  const getAssessmentsForMission = (missionId: string) => {
    // Extract the mission market (like MISSION-BR-20251226055252)
    const missionMarket = missionId.split('-')[1];
    
    return assessments.filter(a => {
      // Match assessments that were generated for the same market
      const assessmentMarket = a.assessment_id.split('-')[1];
      return assessmentMarket === missionMarket;
    });
  };

  if (missions.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Scan Reports Yet</h3>
        <p className="text-gray-500 mb-6">Launch a new scan to start monitoring policy updates.</p>
        <Link
          to="/launch"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Launch New Scan
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Bar */}
      {countries.length > 1 && (
        <div className="mb-6 flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Countries ({missions.length})</option>
            {countries.map(country => (
              <option key={country} value={country}>
                {country} ({missions.filter(m => m.market === country).length})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Report Cards */}
      <div className="space-y-4">
        {filteredMissions.map((mission) => {
          const dateRange = getMissionDateRange(mission);
          const missionAssessments = getAssessmentsForMission(mission.mission_id);
          const highRiskCount = missionAssessments.filter(a => 
            a.risk_level === 'P0' || a.risk_level === 'P1'
          ).length;

          return (
            <Link
              key={mission.mission_id}
              to={`/reports/${mission.mission_id}`}
              className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-indigo-300 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Globe className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{mission.market}</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {mission.signals.length} signals
                    </span>
                    {highRiskCount > 0 && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {highRiskCount} high risk
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Scanned: {formatLocalDate(mission.created_at, true)}</span>
                    </div>
                    {dateRange && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Signals: {formatLocalDate(dateRange.earliest)} - {formatLocalDate(dateRange.latest)}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-indigo-600">
                  <ExternalLink className="w-5 h-5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Scan Report Detail Component
function ScanReportDetail({ 
  mission, 
  assessments, 
  onPushToPM 
}: { 
  mission: ScoutMission; 
  assessments: ImpactAssessment[];
  onPushToPM: (assessmentId: string) => void;
}) {
  const navigate = useNavigate();
  const dateRange = getMissionDateRange(mission);
  
  // Get assessments for this mission's market
  const missionAssessments = assessments.filter(a => {
    const assessmentMarket = a.assessment_id.split('-')[1];
    return assessmentMarket === mission.market;
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/reports')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </button>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">{mission.market} Scan Report</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Scanned: {formatLocalDate(mission.created_at, true)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <FileText className="w-4 h-4" />
              <span>{mission.signals.length} signals, {missionAssessments.length} assessments</span>
            </div>
            {dateRange && (
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Range: {formatLocalDate(dateRange.earliest)} - {formatLocalDate(dateRange.latest)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assessments List */}
      {missionAssessments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Impact Assessments</h2>
          <div className="space-y-4">
            {missionAssessments.map((assessment) => {
              const riskBadge = getRiskBadge(assessment.risk_level);
              const RiskIcon = riskBadge.icon;
              
              return (
                <div
                  key={assessment.assessment_id}
                  className="bg-white rounded-xl border border-gray-200 p-6"
                >
                  {/* Assessment Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{assessment.signal_title}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{assessment.market} • {assessment.domain}</span>
                        <span>•</span>
                        <span>{formatLocalDate(assessment.assessed_at)}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${riskBadge.bg} ${riskBadge.text}`}>
                      <RiskIcon className="w-4 h-4" />
                      {riskBadge.label}
                    </span>
                  </div>

                  {/* Risk Rationale */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Risk Assessment</h4>
                    <p className="text-gray-600">{assessment.risk_rationale}</p>
                  </div>

                  {/* Business Impact */}
                  {assessment.business_impact && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Business Impact</h4>
                      <p className="text-gray-600">{assessment.business_impact}</p>
                    </div>
                  )}

                  {/* Compliance Gaps */}
                  {assessment.compliance_gaps.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Compliance Gaps ({assessment.compliance_gaps.length})
                      </h4>
                      <div className="space-y-2">
                        {assessment.compliance_gaps.map((gap) => (
                          <div key={gap.gap_id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                gap.gap_severity === 'critical' ? 'bg-red-200 text-red-800' :
                                gap.gap_severity === 'major' ? 'bg-orange-200 text-orange-800' :
                                'bg-yellow-200 text-yellow-800'
                              }`}>
                                {gap.gap_severity}
                              </span>
                              {gap.is_blocking && (
                                <span className="text-xs px-2 py-0.5 rounded bg-red-200 text-red-800">Blocking</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700">{gap.gap_description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Actions */}
                  {assessment.recommended_actions.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Recommended Actions</h4>
                      <ul className="space-y-2">
                        {assessment.recommended_actions.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Remediations */}
                  {assessment.remediations.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Remediation Steps ({assessment.remediations.length})
                      </h4>
                      <div className="space-y-2">
                        {assessment.remediations.map((rem) => (
                          <div key={rem.remediation_id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm text-gray-900">{rem.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                rem.engineering_effort === 'S' ? 'bg-green-100 text-green-700' :
                                rem.engineering_effort === 'M' ? 'bg-yellow-100 text-yellow-700' :
                                rem.engineering_effort === 'L' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                Effort: {rem.engineering_effort}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{rem.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                    {!assessment.pushed_to_pm ? (
                      <button
                        onClick={() => onPushToPM(assessment.assessment_id)}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Mark as Reviewed
                      </button>
                    ) : (
                      <span className="px-4 py-2 bg-green-100 text-green-700 text-sm rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Reviewed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Signals List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detected Signals ({mission.signals.length})</h2>
        <div className="space-y-4">
          {mission.signals.map((signal) => (
            <div
              key={signal.id}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{signal.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{signal.source_type.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>{formatLocalDate(signal.published_date)}</span>
                    {signal.source_url && (
                      <>
                        <span>•</span>
                        <a
                          href={signal.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          Source <ExternalLink className="w-3 h-3" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  signal.confidence_score >= 0.9 ? 'bg-green-100 text-green-700' :
                  signal.confidence_score >= 0.7 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {Math.round(signal.confidence_score * 100)}% confidence
                </span>
              </div>

              <p className="text-gray-600 mb-3">{signal.summary}</p>

              {signal.key_provisions.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Key Provisions</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {signal.key_provisions.map((provision, idx) => (
                      <li key={idx}>{provision}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function ScanReport({ missions, assessments, onPushToPM }: ScanReportProps) {
  const { missionId } = useParams();
  const navigate = useNavigate();

  // Scroll to top when viewing detail
  useEffect(() => {
    if (missionId) {
      window.scrollTo(0, 0);
    }
  }, [missionId]);

  // If missionId is provided, show detail view
  if (missionId) {
    const mission = missions.find(m => m.mission_id === missionId);
    
    if (!mission) {
      return (
        <div className="text-center py-16">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Report Not Found</h3>
          <p className="text-gray-500 mb-6">The requested scan report could not be found.</p>
          <button
            onClick={() => navigate('/reports')}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </button>
        </div>
      );
    }

    return <ScanReportDetail mission={mission} assessments={assessments} onPushToPM={onPushToPM} />;
  }

  // Show list view
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scan Reports</h1>
          <p className="text-gray-500 mt-1">View and analyze policy scan results</p>
        </div>
        <Link
          to="/launch"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          New Scan
        </Link>
      </div>
      
      <ScanReportList missions={missions} assessments={assessments} />
    </div>
  );
}
