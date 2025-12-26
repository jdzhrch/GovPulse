"""
GovPulse Impact Analyzer
========================
Performs gap analysis between regulatory signals and internal compliance baseline.
Generates risk assessments and product remediation recommendations.
"""

import json
import re
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional

from scout_engine import ScoutMission, RegulatorySignal, Domain


class RiskLevel(Enum):
    P0 = "P0"  # Existential threat
    P1 = "P1"  # Material compliance gap
    P2 = "P2"  # Moderate risk
    P3 = "P3"  # Low risk


class RemediationType(Enum):
    PRODUCT_CHANGE = "product_change"
    POLICY_UPDATE = "policy_update"
    LEGAL_REVIEW = "legal_review"
    INFRASTRUCTURE = "infrastructure"
    PROCESS_CHANGE = "process_change"
    MONITORING = "monitoring"


@dataclass
class ComplianceGap:
    """Represents a specific compliance gap between new regulation and baseline."""
    gap_id: str
    signal_id: str
    baseline_policy_id: str
    baseline_requirement: str
    regulatory_requirement: str
    gap_description: str
    gap_severity: str  # critical, major, minor
    is_blocking: bool


@dataclass
class ProductRemediation:
    """Recommended product/engineering action to address a gap."""
    remediation_id: str
    gap_id: str
    remediation_type: RemediationType
    title: str
    description: str
    affected_features: list[str]
    engineering_effort: str  # S, M, L, XL
    pm_owner_recommendation: str
    acceptance_criteria: list[str]


@dataclass
class ImpactAssessment:
    """Complete impact assessment for a regulatory signal."""
    assessment_id: str
    signal_id: str
    signal_title: str
    market: str
    domain: str
    risk_level: RiskLevel
    risk_rationale: str
    compliance_gaps: list[ComplianceGap]
    remediations: list[ProductRemediation]
    deadline: Optional[str]
    business_impact: str
    recommended_actions: list[str]
    assessed_at: str
    assessed_by: str


class BaselineParser:
    """Parses the internal baseline markdown into structured data."""

    def __init__(self, baseline_path: str = "knowledge/internal_baseline.md"):
        self.baseline_path = Path(baseline_path)
        self.policies: dict[str, dict] = {}
        self._parse()

    def _parse(self):
        """Parse baseline markdown into structured policies."""
        if not self.baseline_path.exists():
            raise FileNotFoundError(f"Baseline not found: {self.baseline_path}")

        content = self.baseline_path.read_text(encoding="utf-8")

        # Extract policy tables using regex
        # Pattern matches table rows with policy IDs
        policy_pattern = r'\| (MP-\d+|EC-\d+|DS-\d+|CM-\d+) \| ([^|]+) \|([^|]+)\|'

        for match in re.finditer(policy_pattern, content):
            policy_id = match.group(1).strip()
            requirement = match.group(2).strip()
            implementation = match.group(3).strip()

            self.policies[policy_id] = {
                "id": policy_id,
                "requirement": requirement,
                "implementation": implementation,
                "domain": self._get_domain(policy_id)
            }

    def _get_domain(self, policy_id: str) -> str:
        """Determine domain from policy ID prefix."""
        prefix = policy_id.split("-")[0]
        mapping = {
            "MP": "minor_protection",
            "EC": "ecommerce",
            "DS": "data_sovereignty",
            "CM": "content_moderation"
        }
        return mapping.get(prefix, "unknown")

    def get_policy(self, policy_id: str) -> Optional[dict]:
        """Get a specific policy by ID."""
        return self.policies.get(policy_id)

    def get_policies_by_domain(self, domain: str) -> list[dict]:
        """Get all policies for a domain."""
        return [p for p in self.policies.values() if p["domain"] == domain]


class ImpactAnalyzer:
    """
    Core analysis engine that compares regulatory signals against baseline.
    Generates compliance gap analysis and remediation recommendations.
    """

    # Risk level determination rules
    RISK_RULES = {
        "ban": RiskLevel.P0,
        "prohibit": RiskLevel.P0,
        "suspend": RiskLevel.P0,
        "immediate": RiskLevel.P0,
        "mandatory": RiskLevel.P1,
        "require": RiskLevel.P1,
        "must": RiskLevel.P1,
        "shall": RiskLevel.P1,
        "should": RiskLevel.P2,
        "recommend": RiskLevel.P2,
        "may": RiskLevel.P3,
        "consider": RiskLevel.P3,
    }

    # Product feature mapping for remediation suggestions
    FEATURE_MAPPING = {
        "MP-001": ["Registration Flow", "Age Verification", "Onboarding"],
        "MP-002": ["Privacy Settings", "Default Configurations"],
        "MP-010": ["Screen Time Management", "Digital Wellbeing"],
        "MP-012": ["Recommendation Algorithm", "For You Page"],
        "MP-020": ["Ad Targeting", "Ad Delivery System"],
        "MP-030": ["Family Pairing", "Parental Controls"],
        "EC-001": ["TikTok Shop", "In-App Commerce"],
        "EC-002": ["Payment Integration", "Checkout Flow"],
        "DS-010": ["Data Pipeline", "Cross-Border Transfer"],
        "DS-020": ["Access Control", "Employee Permissions"],
    }

    def __init__(self, baseline_path: str = "knowledge/internal_baseline.md"):
        self.baseline = BaselineParser(baseline_path)
        self.assessments: dict[str, ImpactAssessment] = {}

    def analyze_signal(
        self,
        signal: RegulatorySignal,
        analyst: str = "system"
    ) -> ImpactAssessment:
        """
        Perform comprehensive impact analysis on a regulatory signal.
        """
        assessment_id = f"IMPACT-{signal.id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        # Identify compliance gaps
        gaps = self._identify_gaps(signal)

        # Determine risk level
        risk_level, risk_rationale = self._assess_risk(signal, gaps)

        # Generate remediations
        remediations = self._generate_remediations(signal, gaps)

        # Compile business impact statement
        business_impact = self._assess_business_impact(signal, risk_level)

        # Generate recommended actions
        recommended_actions = self._generate_action_items(signal, risk_level, gaps)

        assessment = ImpactAssessment(
            assessment_id=assessment_id,
            signal_id=signal.id,
            signal_title=signal.title,
            market=signal.market,
            domain=signal.domain.value,
            risk_level=risk_level,
            risk_rationale=risk_rationale,
            compliance_gaps=gaps,
            remediations=remediations,
            deadline=signal.effective_date,
            business_impact=business_impact,
            recommended_actions=recommended_actions,
            assessed_at=datetime.now().isoformat(),
            assessed_by=analyst
        )

        self.assessments[assessment_id] = assessment
        return assessment

    def _identify_gaps(self, signal: RegulatorySignal) -> list[ComplianceGap]:
        """Identify specific compliance gaps between signal and baseline."""
        gaps = []

        for policy_id in signal.affected_policies:
            baseline_policy = self.baseline.get_policy(policy_id)
            if not baseline_policy:
                continue

            # Analyze each key provision against baseline
            for i, provision in enumerate(signal.key_provisions):
                gap = self._compare_provision(
                    signal_id=signal.id,
                    policy_id=policy_id,
                    baseline=baseline_policy,
                    provision=provision,
                    index=i
                )
                if gap:
                    gaps.append(gap)

        return gaps

    def _compare_provision(
        self,
        signal_id: str,
        policy_id: str,
        baseline: dict,
        provision: str,
        index: int
    ) -> Optional[ComplianceGap]:
        """Compare a single provision against baseline policy."""
        # Simulated gap detection logic
        # In production, this would use NLP/LLM for semantic comparison

        provision_lower = provision.lower()
        baseline_req = baseline["requirement"].lower()

        # Detect potential conflicts
        conflict_indicators = [
            ("opt-out", "default"),
            ("mandatory", "optional"),
            ("prohibit", "allow"),
            ("require", "recommend"),
            ("all", "some"),
            ("17", "13"),  # Age threshold changes
            ("16", "13"),
            ("separate", "integrate"),
        ]

        is_conflict = False
        severity = "minor"

        for new_term, old_term in conflict_indicators:
            if new_term in provision_lower and old_term in baseline_req:
                is_conflict = True
                if new_term in ["prohibit", "mandatory", "require"]:
                    severity = "critical"
                elif new_term in ["opt-out", "separate"]:
                    severity = "major"
                break

        # Check for stricter age requirements
        if any(age in provision_lower for age in ["17", "16", "18"]):
            if "13" in baseline_req or "14" in baseline_req:
                is_conflict = True
                severity = "major"

        if not is_conflict:
            return None

        return ComplianceGap(
            gap_id=f"GAP-{signal_id}-{policy_id}-{index}",
            signal_id=signal_id,
            baseline_policy_id=policy_id,
            baseline_requirement=baseline["requirement"],
            regulatory_requirement=provision,
            gap_description=f"New regulation requires '{provision}' which conflicts with current baseline '{baseline['requirement']}'",
            gap_severity=severity,
            is_blocking=severity == "critical"
        )

    def _assess_risk(
        self,
        signal: RegulatorySignal,
        gaps: list[ComplianceGap]
    ) -> tuple[RiskLevel, str]:
        """Determine overall risk level based on signal content and gaps."""
        # Check for existential keywords
        signal_text = (signal.summary + " ".join(signal.key_provisions)).lower()

        for keyword, level in self.RISK_RULES.items():
            if keyword in signal_text:
                if level == RiskLevel.P0:
                    return (
                        RiskLevel.P0,
                        f"Existential threat detected: regulation contains '{keyword}' language affecting core platform operations"
                    )

        # Check gap severity
        critical_gaps = [g for g in gaps if g.gap_severity == "critical"]
        major_gaps = [g for g in gaps if g.gap_severity == "major"]

        if critical_gaps:
            return (
                RiskLevel.P1,
                f"Material compliance gap: {len(critical_gaps)} critical conflicts requiring immediate product changes"
            )
        elif major_gaps:
            return (
                RiskLevel.P2,
                f"Moderate risk: {len(major_gaps)} major gaps requiring quarterly remediation"
            )
        elif gaps:
            return (
                RiskLevel.P3,
                f"Low risk: {len(gaps)} minor gaps for monitoring"
            )
        else:
            return (
                RiskLevel.P3,
                "No significant compliance gaps detected; monitoring recommended"
            )

    def _generate_remediations(
        self,
        signal: RegulatorySignal,
        gaps: list[ComplianceGap]
    ) -> list[ProductRemediation]:
        """Generate product remediation recommendations for each gap."""
        remediations = []

        for gap in gaps:
            policy_id = gap.baseline_policy_id
            affected_features = self.FEATURE_MAPPING.get(policy_id, ["Platform Core"])

            # Determine remediation type based on gap
            if "algorithm" in gap.regulatory_requirement.lower():
                rem_type = RemediationType.PRODUCT_CHANGE
                effort = "L"
            elif "data" in gap.regulatory_requirement.lower():
                rem_type = RemediationType.INFRASTRUCTURE
                effort = "XL"
            elif "consent" in gap.regulatory_requirement.lower():
                rem_type = RemediationType.PRODUCT_CHANGE
                effort = "M"
            else:
                rem_type = RemediationType.PRODUCT_CHANGE
                effort = "M"

            remediation = ProductRemediation(
                remediation_id=f"REM-{gap.gap_id}",
                gap_id=gap.gap_id,
                remediation_type=rem_type,
                title=f"Address {gap.baseline_policy_id} compliance gap",
                description=self._generate_remediation_description(gap),
                affected_features=affected_features,
                engineering_effort=effort,
                pm_owner_recommendation=self._suggest_pm_owner(policy_id),
                acceptance_criteria=self._generate_acceptance_criteria(gap)
            )

            remediations.append(remediation)

        return remediations

    def _generate_remediation_description(self, gap: ComplianceGap) -> str:
        """Generate human-readable remediation description for PM."""
        return (
            f"Current implementation: {gap.baseline_requirement}\n"
            f"Required change: {gap.regulatory_requirement}\n\n"
            f"Action: Modify the feature to meet new regulatory requirements. "
            f"Ensure backwards compatibility where possible and coordinate with "
            f"Legal team for compliance sign-off before launch."
        )

    def _suggest_pm_owner(self, policy_id: str) -> str:
        """Suggest PM owner based on policy domain."""
        prefix = policy_id.split("-")[0]
        owners = {
            "MP": "Trust & Safety PM",
            "EC": "Commerce PM",
            "DS": "Privacy PM",
            "CM": "Content Policy PM"
        }
        return owners.get(prefix, "Platform PM")

    def _generate_acceptance_criteria(self, gap: ComplianceGap) -> list[str]:
        """Generate acceptance criteria for remediation."""
        return [
            f"Feature updated to comply with: {gap.regulatory_requirement}",
            "Legal review completed and signed off",
            "QA verification in staging environment",
            "Rollout plan approved for affected market",
            "Monitoring dashboard updated with compliance metrics"
        ]

    def _assess_business_impact(
        self,
        signal: RegulatorySignal,
        risk_level: RiskLevel
    ) -> str:
        """Generate business impact statement."""
        impact_templates = {
            RiskLevel.P0: (
                f"CRITICAL: {signal.market} market operations at risk. "
                f"Potential revenue impact: 100% of {signal.market} GMV. "
                f"Immediate executive escalation required."
            ),
            RiskLevel.P1: (
                f"HIGH: Material product changes required for {signal.market}. "
                f"Estimated impact to feature roadmap: 2-3 quarters. "
                f"Cross-functional mobilization needed."
            ),
            RiskLevel.P2: (
                f"MODERATE: Compliance updates needed for {signal.market}. "
                f"Addressable within normal product cycle. "
                f"Monitor for enforcement actions."
            ),
            RiskLevel.P3: (
                f"LOW: Monitoring recommended for {signal.market}. "
                f"No immediate action required. "
                f"Include in quarterly compliance review."
            )
        }
        return impact_templates[risk_level]

    def _generate_action_items(
        self,
        signal: RegulatorySignal,
        risk_level: RiskLevel,
        gaps: list[ComplianceGap]
    ) -> list[str]:
        """Generate prioritized action items."""
        actions = []

        if risk_level in [RiskLevel.P0, RiskLevel.P1]:
            actions.extend([
                f"Schedule executive briefing on {signal.title}",
                "Convene cross-functional war room (Policy, Legal, Product, Eng)",
                f"Draft compliance roadmap with deadline: {signal.effective_date or 'TBD'}",
            ])

        if gaps:
            actions.append(
                f"Create JIRA epic for {len(gaps)} compliance gaps"
            )

        actions.extend([
            f"Monitor {signal.market} regulatory developments",
            "Update internal baseline upon remediation completion",
            "Schedule follow-up review in 30 days"
        ])

        return actions

    def analyze_mission(
        self,
        mission: ScoutMission,
        analyst: str = "system"
    ) -> list[ImpactAssessment]:
        """Analyze all signals from a mission."""
        assessments = []

        for signal in mission.signals:
            assessment = self.analyze_signal(signal, analyst)
            assessments.append(assessment)

        return assessments

    def export_assessment(
        self,
        assessment: ImpactAssessment,
        output_dir: str = "data/history"
    ) -> str:
        """Export assessment to JSON."""
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        assessment_dict = {
            "assessment_id": assessment.assessment_id,
            "signal_id": assessment.signal_id,
            "signal_title": assessment.signal_title,
            "market": assessment.market,
            "domain": assessment.domain,
            "risk_level": assessment.risk_level.value,
            "risk_rationale": assessment.risk_rationale,
            "compliance_gaps": [asdict(g) for g in assessment.compliance_gaps],
            "remediations": [
                {**asdict(r), "remediation_type": r.remediation_type.value}
                for r in assessment.remediations
            ],
            "deadline": assessment.deadline,
            "business_impact": assessment.business_impact,
            "recommended_actions": assessment.recommended_actions,
            "assessed_at": assessment.assessed_at,
            "assessed_by": assessment.assessed_by
        }

        output_path = Path(output_dir) / f"{assessment.assessment_id}.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(assessment_dict, f, indent=2, ensure_ascii=False)

        return str(output_path)

    def generate_executive_summary(
        self,
        assessments: list[ImpactAssessment]
    ) -> str:
        """Generate executive summary for multiple assessments."""
        p0_count = sum(1 for a in assessments if a.risk_level == RiskLevel.P0)
        p1_count = sum(1 for a in assessments if a.risk_level == RiskLevel.P1)
        p2_count = sum(1 for a in assessments if a.risk_level == RiskLevel.P2)
        p3_count = sum(1 for a in assessments if a.risk_level == RiskLevel.P3)

        total_gaps = sum(len(a.compliance_gaps) for a in assessments)

        markets = set(a.market for a in assessments)

        summary = f"""
# GovPulse Executive Summary
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}

## Risk Distribution
- **P0 (Critical)**: {p0_count}
- **P1 (High)**: {p1_count}
- **P2 (Moderate)**: {p2_count}
- **P3 (Low)**: {p3_count}

## Coverage
- Markets analyzed: {', '.join(markets)}
- Total compliance gaps: {total_gaps}
- Signals assessed: {len(assessments)}

## Priority Actions
"""
        for assessment in sorted(assessments, key=lambda a: a.risk_level.value):
            if assessment.risk_level in [RiskLevel.P0, RiskLevel.P1]:
                summary += f"\n### [{assessment.risk_level.value}] {assessment.market}: {assessment.signal_title}\n"
                summary += f"{assessment.risk_rationale}\n"
                for action in assessment.recommended_actions[:3]:
                    summary += f"- {action}\n"

        return summary


def main():
    """Demo execution with full pipeline."""
    from scout_engine import ScoutEngine

    # Initialize engines
    scout = ScoutEngine()
    analyzer = ImpactAnalyzer()

    # Execute mission
    mission = scout.create_mission(
        market="US",
        domain="all",
        lookback_days=365,
        created_by="demo_analyst"
    )
    scout.execute_mission(mission.mission_id)

    print(f"Mission {mission.mission_id} completed with {len(mission.signals)} signals\n")

    # Analyze all signals
    assessments = analyzer.analyze_mission(mission, analyst="demo_analyst")

    # Print results
    for assessment in assessments:
        print(f"\n{'='*60}")
        print(f"Assessment: {assessment.assessment_id}")
        print(f"Signal: {assessment.signal_title}")
        print(f"Risk Level: {assessment.risk_level.value}")
        print(f"Risk Rationale: {assessment.risk_rationale}")
        print(f"\nCompliance Gaps ({len(assessment.compliance_gaps)}):")
        for gap in assessment.compliance_gaps:
            print(f"  - [{gap.gap_severity.upper()}] {gap.gap_description[:100]}...")
        print(f"\nRemediations ({len(assessment.remediations)}):")
        for rem in assessment.remediations:
            print(f"  - {rem.title} (Effort: {rem.engineering_effort})")
        print(f"\nBusiness Impact: {assessment.business_impact}")

        # Export
        path = analyzer.export_assessment(assessment)
        print(f"\nExported to: {path}")

    # Generate executive summary
    summary = analyzer.generate_executive_summary(assessments)
    print("\n" + summary)


if __name__ == "__main__":
    main()
