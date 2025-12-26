"""
GovPulse Impact Analyzer
========================
Performs gap analysis between regulatory signals and internal compliance baseline.
Uses OpenAI GPT-4o for intelligent compliance comparison.
"""

import json
import os
import re
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("Warning: OpenAI SDK not installed. Run: pip install openai")

from .scout_engine import ScoutMission, RegulatorySignal, Domain


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
        self.raw_content: str = ""
        self.policies: dict[str, dict] = {}
        self._parse()

    def _parse(self):
        """Parse baseline markdown into structured policies."""
        if not self.baseline_path.exists():
            raise FileNotFoundError(f"Baseline not found: {self.baseline_path}")

        self.raw_content = self.baseline_path.read_text(encoding="utf-8")

        # Extract policy tables using regex
        policy_pattern = r'\| (MP-\d+|EC-\d+|DS-\d+|CM-\d+) \| ([^|]+) \|([^|]+)\|'

        for match in re.finditer(policy_pattern, self.raw_content):
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

    def get_baseline_for_prompt(self) -> str:
        """Return the full baseline content for LLM system prompt."""
        return self.raw_content


class LLMAnalyzer:
    """
    OpenAI GPT-4o powered compliance analyzer.
    Compares regulatory signals against internal baseline using LLM.
    """

    SYSTEM_PROMPT_TEMPLATE = """你是一名 TikTok 合规审计员，专门负责分析全球监管变化对平台的影响。

## 你的任务
对比新的监管法规与公司内部合规基准，找出不一致的条款，评估风险等级，并为产品经理提供具体的改动建议。

## 内部合规基准
以下是 TikTok 当前的全球合规政策基准：

{baseline}

## 风险等级定义
- P0 (Critical): 存在性威胁 - 可能导致平台禁令、超过1亿美元罚款
- P1 (High): 重大合规缺口 - 需要立即产品改动
- P2 (Moderate): 中等风险 - 可在季度内解决
- P3 (Low): 低风险 - 仅需监控

## 输出格式要求
你必须严格返回以下 JSON 格式，不要有任何其他文字：

```json
{{
  "risk_level": "P0|P1|P2|P3",
  "risk_rationale": "风险评估理由（中文）",
  "compliance_gaps": [
    {{
      "baseline_policy_id": "政策ID如MP-001",
      "baseline_requirement": "当前基准要求",
      "regulatory_requirement": "新法规要求",
      "gap_description": "差距描述（中文）",
      "gap_severity": "critical|major|minor",
      "is_blocking": true/false
    }}
  ],
  "remediations": [
    {{
      "title": "改动标题",
      "description": "详细改动建议（面向产品经理，中文）",
      "affected_features": ["受影响的功能列表"],
      "engineering_effort": "S|M|L|XL",
      "pm_owner_recommendation": "建议负责的PM角色",
      "acceptance_criteria": ["验收标准1", "验收标准2"]
    }}
  ],
  "business_impact": "业务影响评估（中文）",
  "recommended_actions": ["建议行动1", "建议行动2", "建议行动3"]
}}
```
"""

    USER_PROMPT_TEMPLATE = """请分析以下监管信号，并与内部基准进行对比：

## 监管信号信息
- **信号ID**: {signal_id}
- **市场**: {market}
- **领域**: {domain}
- **来源类型**: {source_type}
- **标题**: {title}
- **摘要**: {summary}
- **生效日期**: {effective_date}
- **来源URL**: {source_url}

## 关键条款
{key_provisions}

## 原文摘录
{raw_excerpt}

## 可能受影响的政策ID
{affected_policies}

请严格按照 JSON 格式输出分析结果。
"""

    def __init__(self, baseline_path: str = "knowledge/internal_baseline.md"):
        self.baseline = BaselineParser(baseline_path)
        self.client = None
        self._init_client()

    def _init_client(self):
        """Initialize OpenAI client."""
        if not OPENAI_AVAILABLE:
            raise RuntimeError(
                "OpenAI SDK not available. Install with: pip install openai"
            )

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY environment variable not set. "
                "LLM analysis is required for production."
            )

        self.client = OpenAI(api_key=api_key)

    def analyze_with_llm(self, signal: RegulatorySignal) -> dict:
        """
        Use GPT-4o to analyze a regulatory signal against baseline.
        Returns structured JSON response.
        """
        if not self.client:
            raise RuntimeError("OpenAI client not initialized. Check API key configuration.")

        # Build prompts
        system_prompt = self.SYSTEM_PROMPT_TEMPLATE.format(
            baseline=self.baseline.get_baseline_for_prompt()
        )

        user_prompt = self.USER_PROMPT_TEMPLATE.format(
            signal_id=signal.id,
            market=signal.market,
            domain=signal.domain.value,
            source_type=signal.source_type.value,
            title=signal.title,
            summary=signal.summary,
            effective_date=signal.effective_date or "未指定",
            source_url=signal.source_url,
            key_provisions="\n".join(f"- {p}" for p in signal.key_provisions),
            raw_excerpt=signal.raw_text_excerpt,
            affected_policies=", ".join(signal.affected_policies)
        )

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2,  # Low temperature for consistent analysis
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            result = json.loads(content)

            print(f"LLM Analysis completed for signal: {signal.id}")
            return result

        except Exception as e:
            print(f"LLM analysis failed: {e}")
            raise RuntimeError(f"LLM analysis failed for signal {signal.id}: {e}")

    def _fallback_analysis(self, signal: RegulatorySignal) -> dict:
        """
        Fallback rule-based analysis when LLM is not available.
        """
        # Simple keyword-based risk assessment
        signal_text = (signal.summary + " ".join(signal.key_provisions)).lower()

        risk_level = "P3"
        risk_rationale = "Low risk: monitoring recommended"

        if any(kw in signal_text for kw in ["ban", "prohibit", "suspend", "禁止"]):
            risk_level = "P0"
            risk_rationale = "Existential threat detected: regulation contains prohibition language"
        elif any(kw in signal_text for kw in ["mandatory", "require", "must", "shall", "必须"]):
            risk_level = "P1"
            risk_rationale = "Material compliance gap: mandatory requirements detected"
        elif any(kw in signal_text for kw in ["should", "recommend", "建议"]):
            risk_level = "P2"
            risk_rationale = "Moderate risk: recommended changes detected"

        # Generate basic gaps
        gaps = []
        for i, policy_id in enumerate(signal.affected_policies[:3]):
            baseline_policy = self.baseline.get_policy(policy_id)
            if baseline_policy:
                gaps.append({
                    "baseline_policy_id": policy_id,
                    "baseline_requirement": baseline_policy["requirement"],
                    "regulatory_requirement": signal.key_provisions[0] if signal.key_provisions else "New requirement",
                    "gap_description": f"Policy {policy_id} may need updates to comply with new regulation",
                    "gap_severity": "major" if risk_level in ["P0", "P1"] else "minor",
                    "is_blocking": risk_level == "P0"
                })

        # Generate basic remediations
        remediations = []
        for gap in gaps:
            remediations.append({
                "title": f"Update {gap['baseline_policy_id']} implementation",
                "description": f"Review and update current implementation to meet new requirements: {gap['regulatory_requirement']}",
                "affected_features": ["Platform Core"],
                "engineering_effort": "M",
                "pm_owner_recommendation": "Platform PM",
                "acceptance_criteria": [
                    "Legal review completed",
                    "Implementation updated",
                    "Testing verified"
                ]
            })

        return {
            "risk_level": risk_level,
            "risk_rationale": risk_rationale,
            "compliance_gaps": gaps,
            "remediations": remediations,
            "business_impact": f"Impact assessment for {signal.market} regulation pending detailed review",
            "recommended_actions": [
                f"Review {signal.title}",
                "Schedule cross-functional review",
                "Update compliance roadmap"
            ]
        }


class ImpactAnalyzer:
    """
    Core analysis engine that compares regulatory signals against baseline.
    Generates compliance gap analysis and remediation recommendations.
    """

    def __init__(self, baseline_path: str = "knowledge/internal_baseline.md"):
        self.baseline_path = baseline_path
        self.baseline = BaselineParser(baseline_path)
        self.llm_analyzer = LLMAnalyzer(baseline_path)
        self.assessments: dict[str, ImpactAssessment] = {}

    def analyze_signal(
        self,
        signal: RegulatorySignal,
        analyst: str = "system",
        use_llm: bool = True
    ) -> ImpactAssessment:
        """
        Perform comprehensive impact analysis on a regulatory signal.
        Uses LLM for intelligent analysis when available.
        """
        assessment_id = f"IMPACT-{signal.id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        if use_llm:
            # Use LLM-powered analysis
            llm_result = self.llm_analyzer.analyze_with_llm(signal)
            return self._build_assessment_from_llm(
                assessment_id=assessment_id,
                signal=signal,
                llm_result=llm_result,
                analyst=analyst
            )
        else:
            # Use rule-based analysis (legacy)
            return self._analyze_signal_rules(signal, analyst)

    def _build_assessment_from_llm(
        self,
        assessment_id: str,
        signal: RegulatorySignal,
        llm_result: dict,
        analyst: str
    ) -> ImpactAssessment:
        """Build ImpactAssessment from LLM JSON response."""

        # Parse risk level
        risk_level_str = llm_result.get("risk_level", "P3")
        try:
            risk_level = RiskLevel(risk_level_str)
        except ValueError:
            risk_level = RiskLevel.P3

        # Parse compliance gaps
        gaps = []
        for i, gap_data in enumerate(llm_result.get("compliance_gaps", [])):
            gaps.append(ComplianceGap(
                gap_id=f"GAP-{signal.id}-{i}",
                signal_id=signal.id,
                baseline_policy_id=gap_data.get("baseline_policy_id", "UNKNOWN"),
                baseline_requirement=gap_data.get("baseline_requirement", ""),
                regulatory_requirement=gap_data.get("regulatory_requirement", ""),
                gap_description=gap_data.get("gap_description", ""),
                gap_severity=gap_data.get("gap_severity", "minor"),
                is_blocking=gap_data.get("is_blocking", False)
            ))

        # Parse remediations
        remediations = []
        for i, rem_data in enumerate(llm_result.get("remediations", [])):
            rem_type_str = rem_data.get("remediation_type", "product_change")
            try:
                rem_type = RemediationType(rem_type_str)
            except ValueError:
                rem_type = RemediationType.PRODUCT_CHANGE

            remediations.append(ProductRemediation(
                remediation_id=f"REM-{signal.id}-{i}",
                gap_id=gaps[i].gap_id if i < len(gaps) else f"GAP-{signal.id}-{i}",
                remediation_type=rem_type,
                title=rem_data.get("title", ""),
                description=rem_data.get("description", ""),
                affected_features=rem_data.get("affected_features", []),
                engineering_effort=rem_data.get("engineering_effort", "M"),
                pm_owner_recommendation=rem_data.get("pm_owner_recommendation", "Platform PM"),
                acceptance_criteria=rem_data.get("acceptance_criteria", [])
            ))

        assessment = ImpactAssessment(
            assessment_id=assessment_id,
            signal_id=signal.id,
            signal_title=signal.title,
            market=signal.market,
            domain=signal.domain.value,
            risk_level=risk_level,
            risk_rationale=llm_result.get("risk_rationale", ""),
            compliance_gaps=gaps,
            remediations=remediations,
            deadline=signal.effective_date,
            business_impact=llm_result.get("business_impact", ""),
            recommended_actions=llm_result.get("recommended_actions", []),
            assessed_at=datetime.now().isoformat(),
            assessed_by=analyst
        )

        self.assessments[assessment_id] = assessment
        return assessment

    def _analyze_signal_rules(
        self,
        signal: RegulatorySignal,
        analyst: str
    ) -> ImpactAssessment:
        """Legacy rule-based analysis (kept for fallback)."""
        # Use fallback analysis from LLM analyzer
        result = self.llm_analyzer._fallback_analysis(signal)
        assessment_id = f"IMPACT-{signal.id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        return self._build_assessment_from_llm(assessment_id, signal, result, analyst)

    def analyze_mission(
        self,
        mission: ScoutMission,
        analyst: str = "system",
        use_llm: bool = True
    ) -> list[ImpactAssessment]:
        """Analyze all signals from a mission."""
        assessments = []

        for signal in mission.signals:
            assessment = self.analyze_signal(signal, analyst, use_llm)
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

    # Check for API key
    if not os.environ.get("OPENAI_API_KEY"):
        print("=" * 60)
        print("OPENAI_API_KEY not set. Running in fallback mode.")
        print("Set the environment variable for LLM-powered analysis:")
        print("  export OPENAI_API_KEY='your-api-key'")
        print("=" * 60)
        print()

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

    # Analyze all signals (use_llm=True will use GPT-4o if available)
    assessments = analyzer.analyze_mission(
        mission,
        analyst="demo_analyst",
        use_llm=True
    )

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
