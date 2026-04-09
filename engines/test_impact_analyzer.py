import json
import tempfile
import unittest
from pathlib import Path

from engines.impact_analyzer import (
    ComplianceGap,
    ImpactAnalyzer,
    ImpactAssessment,
    ProductRemediation,
    RemediationType,
    RiskLevel,
)


class ImpactAnalyzerExportTests(unittest.TestCase):
    def test_export_assessment_includes_mission_id_when_available(self):
        analyzer = ImpactAnalyzer("knowledge/internal_baseline.md")

        assessment = ImpactAssessment(
            assessment_id="IMPACT-TEST-001",
            signal_id="US-MP-TEST-001",
            signal_title="App Store Accountability Act",
            market="US",
            domain="minor_protection",
            risk_level=RiskLevel.P2,
            risk_rationale="Test rationale",
            compliance_gaps=[
                ComplianceGap(
                    gap_id="GAP-1",
                    signal_id="US-MP-TEST-001",
                    baseline_policy_id="MP-001",
                    baseline_requirement="Existing requirement",
                    regulatory_requirement="New requirement",
                    gap_description="Gap description",
                    gap_severity="minor",
                    is_blocking=False,
                )
            ],
            remediations=[
                ProductRemediation(
                    remediation_id="REM-1",
                    gap_id="GAP-1",
                    remediation_type=RemediationType.PRODUCT_CHANGE,
                    title="Implement fix",
                    description="Description",
                    affected_features=["Feature A"],
                    engineering_effort="M",
                    pm_owner_recommendation="Platform PM",
                    acceptance_criteria=["Criterion"],
                )
            ],
            deadline=None,
            business_impact="Low",
            recommended_actions=["Monitor"],
            assessed_at="2026-04-09T02:07:07",
            assessed_by="test",
        )
        assessment.mission_id = "MISSION-US-20260409020558"

        with tempfile.TemporaryDirectory() as tmpdir:
          output_path = analyzer.export_assessment(assessment, tmpdir)
          exported = json.loads(Path(output_path).read_text())

        self.assertEqual(exported["mission_id"], "MISSION-US-20260409020558")


if __name__ == "__main__":
    unittest.main()
