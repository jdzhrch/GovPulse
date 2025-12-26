"""
GovPulse Scout Engine
=====================
Mission-driven regulatory intelligence gathering system.
Simulates ChatGPT Browsing-style search for regulatory updates.
"""

import json
import os
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Optional
from enum import Enum


class Domain(Enum):
    MINOR_PROTECTION = "minor_protection"
    ECOMMERCE = "ecommerce"
    DATA_SOVEREIGNTY = "data_sovereignty"
    CONTENT_MODERATION = "content_moderation"
    ALL = "all"


class SourceType(Enum):
    LEGISLATION = "legislation"
    EXECUTIVE_ORDER = "executive_order"
    REGULATORY_GUIDANCE = "regulatory_guidance"
    COURT_RULING = "court_ruling"
    HEARING_TRANSCRIPT = "hearing_transcript"
    DRAFT_BILL = "draft_bill"


@dataclass
class RegulatorySignal:
    """Represents a detected regulatory change or proposal."""
    id: str
    market: str
    domain: Domain
    source_type: SourceType
    title: str
    summary: str
    source_url: str
    published_date: str
    effective_date: Optional[str]
    key_provisions: list[str]
    affected_policies: list[str]  # Maps to internal baseline policy IDs
    raw_text_excerpt: str
    confidence_score: float  # 0.0 - 1.0


@dataclass
class ScoutMission:
    """Defines a regulatory scouting mission."""
    mission_id: str
    market: str
    domain: Domain
    lookback_days: int
    created_at: str
    created_by: str
    status: str  # pending, running, completed, failed
    signals: list[RegulatorySignal]


class ScoutEngine:
    """
    Core intelligence gathering engine.
    In production, this would integrate with:
    - OpenAI GPT-4 with browsing
    - Government RSS feeds
    - Legal database APIs (LexisNexis, Westlaw)
    - News aggregators
    """

    # Simulated regulatory database for demo purposes
    SIMULATED_SIGNALS = {
        "US": {
            Domain.MINOR_PROTECTION: [
                RegulatorySignal(
                    id="US-MP-2024-001",
                    market="US",
                    domain=Domain.MINOR_PROTECTION,
                    source_type=SourceType.LEGISLATION,
                    title="Kids Online Safety Act (KOSA) - Senate Version",
                    summary="Mandates platforms implement 'duty of care' for minors, requires opt-out of algorithmic recommendations for users under 17, and mandates parental tools.",
                    source_url="https://www.congress.gov/bill/118th-congress/senate-bill/1409",
                    published_date="2024-07-30",
                    effective_date="2025-07-01",
                    key_provisions=[
                        "Duty of care standard for platforms with minor users",
                        "Algorithmic amplification opt-out required for <17",
                        "Mandatory parental notification features",
                        "Design features to reduce addictive usage patterns",
                        "Third-party audit requirements"
                    ],
                    affected_policies=["MP-012", "MP-010", "MP-030", "MP-031"],
                    raw_text_excerpt="SEC. 3. DUTY OF CARE. A covered platform shall act in the best interests of a minor...",
                    confidence_score=0.95
                ),
                RegulatorySignal(
                    id="US-MP-2024-002",
                    market="US",
                    domain=Domain.MINOR_PROTECTION,
                    source_type=SourceType.DRAFT_BILL,
                    title="COPPA 2.0 Expansion Proposal",
                    summary="Expands COPPA protections to cover users aged 13-16, requiring verifiable parental consent for data collection.",
                    source_url="https://www.ftc.gov/coppa-reform-2024",
                    published_date="2024-09-15",
                    effective_date=None,
                    key_provisions=[
                        "Extends age threshold from 13 to 17",
                        "Bans targeted advertising to all minors",
                        "Requires age verification mechanisms",
                        "Data minimization requirements for minor data"
                    ],
                    affected_policies=["MP-001", "MP-020", "MP-021"],
                    raw_text_excerpt="The term 'child' means an individual under the age of 17...",
                    confidence_score=0.78
                )
            ],
            Domain.DATA_SOVEREIGNTY: [
                RegulatorySignal(
                    id="US-DS-2024-001",
                    market="US",
                    domain=Domain.DATA_SOVEREIGNTY,
                    source_type=SourceType.LEGISLATION,
                    title="Protecting Americans' Data from Foreign Adversaries Act",
                    summary="Prohibits data brokers from selling sensitive data to foreign adversary countries, with specific provisions for social media platforms.",
                    source_url="https://www.congress.gov/bill/118th-congress/house-bill/7520",
                    published_date="2024-03-13",
                    effective_date="2024-06-23",
                    key_provisions=[
                        "Bans sale of sensitive data to China, Russia, Iran, North Korea",
                        "Includes social media usage data as 'sensitive'",
                        "FTC enforcement authority",
                        "Civil penalties up to $50,000 per violation"
                    ],
                    affected_policies=["DS-010", "DS-020", "DS-013"],
                    raw_text_excerpt="It shall be unlawful for a data broker to sell, transfer, or share...",
                    confidence_score=0.99
                )
            ]
        },
        "ID": {
            Domain.ECOMMERCE: [
                RegulatorySignal(
                    id="ID-EC-2024-001",
                    market="ID",
                    domain=Domain.ECOMMERCE,
                    source_type=SourceType.REGULATORY_GUIDANCE,
                    title="Minister of Trade Regulation 31/2023 - Social Commerce Separation",
                    summary="Mandates complete separation of social media and e-commerce functionalities. TikTok Shop must operate as independent app.",
                    source_url="https://jdih.kemendag.go.id/peraturan/detail/2340",
                    published_date="2023-09-27",
                    effective_date="2023-10-04",
                    key_provisions=[
                        "Social media platforms cannot facilitate direct transactions",
                        "E-commerce must be separate application",
                        "Minimum price floor of IDR 100,000 for imports",
                        "Local business partnership requirements"
                    ],
                    affected_policies=["EC-001", "EC-002", "EC-003", "EC-030"],
                    raw_text_excerpt="Penyelenggara Perdagangan Melalui Sistem Elektronik dilarang...",
                    confidence_score=0.99
                )
            ],
            Domain.DATA_SOVEREIGNTY: [
                RegulatorySignal(
                    id="ID-DS-2024-001",
                    market="ID",
                    domain=Domain.DATA_SOVEREIGNTY,
                    source_type=SourceType.REGULATORY_GUIDANCE,
                    title="Government Regulation 71/2019 - Electronic System & Transaction",
                    summary="Requires strategic electronic systems to maintain local data centers and provide government access upon request.",
                    source_url="https://jdih.kominfo.go.id/produk_hukum/view/id/695",
                    published_date="2019-10-10",
                    effective_date="2024-01-01",
                    key_provisions=[
                        "Local data center mandate for strategic PSE",
                        "Government access to electronic data",
                        "48-hour takedown requirement",
                        "Annual compliance reporting"
                    ],
                    affected_policies=["DS-030", "DS-031", "CM-010"],
                    raw_text_excerpt="Penyelenggara Sistem Elektronik Lingkup Publik wajib...",
                    confidence_score=0.95
                )
            ]
        },
        "EU": {
            Domain.MINOR_PROTECTION: [
                RegulatorySignal(
                    id="EU-MP-2024-001",
                    market="EU",
                    domain=Domain.MINOR_PROTECTION,
                    source_type=SourceType.LEGISLATION,
                    title="Digital Services Act - Minor Protection Provisions",
                    summary="VLOPs must implement specific protections for minors including algorithmic transparency and prohibition of profiling-based advertising.",
                    source_url="https://eur-lex.europa.eu/eli/reg/2022/2065",
                    published_date="2022-10-27",
                    effective_date="2024-02-17",
                    key_provisions=[
                        "No profiling-based advertising to minors",
                        "Algorithmic transparency for recommendation systems",
                        "Risk assessment for minor protection",
                        "Third-party audit requirements"
                    ],
                    affected_policies=["MP-012", "MP-020", "MP-014", "CM-010"],
                    raw_text_excerpt="Providers of very large online platforms shall not present advertisements...",
                    confidence_score=0.99
                )
            ],
            Domain.DATA_SOVEREIGNTY: [
                RegulatorySignal(
                    id="EU-DS-2024-001",
                    market="EU",
                    domain=Domain.DATA_SOVEREIGNTY,
                    source_type=SourceType.COURT_RULING,
                    title="CJEU Schrems III Preliminary Ruling",
                    summary="Court questions adequacy of EU-US Data Privacy Framework, may require additional safeguards for transfers.",
                    source_url="https://curia.europa.eu/juris/liste.jsf",
                    published_date="2024-11-15",
                    effective_date=None,
                    key_provisions=[
                        "DPF adequacy under review",
                        "Supplementary measures may be required",
                        "Impact on Project Texas commitments",
                        "Potential need for EU-only data architecture"
                    ],
                    affected_policies=["DS-010", "DS-020", "DS-021"],
                    raw_text_excerpt="The referring court asks whether the Commission's adequacy decision...",
                    confidence_score=0.72
                )
            ]
        },
        "BR": {
            Domain.MINOR_PROTECTION: [
                RegulatorySignal(
                    id="BR-MP-2024-001",
                    market="BR",
                    domain=Domain.MINOR_PROTECTION,
                    source_type=SourceType.DRAFT_BILL,
                    title="PL 2628/2022 - Digital Environment Protection for Children",
                    summary="Comprehensive framework for protecting children online, including age verification mandates and design code requirements.",
                    source_url="https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2334729",
                    published_date="2024-06-20",
                    effective_date=None,
                    key_provisions=[
                        "Mandatory age verification for platforms",
                        "Safety by design requirements",
                        "Parental consent for under-12 users",
                        "Prohibition of manipulative design patterns"
                    ],
                    affected_policies=["MP-001", "MP-002", "MP-010", "MP-030"],
                    raw_text_excerpt="Os provedores de aplicações de internet deverão adotar medidas...",
                    confidence_score=0.85
                )
            ]
        },
        "UK": {
            Domain.MINOR_PROTECTION: [
                RegulatorySignal(
                    id="UK-MP-2024-001",
                    market="UK",
                    domain=Domain.MINOR_PROTECTION,
                    source_type=SourceType.LEGISLATION,
                    title="Online Safety Act 2023 - Children's Safety Duties",
                    summary="Platforms must protect children from harmful content with risk assessments, safety duties, and Ofcom enforcement.",
                    source_url="https://www.legislation.gov.uk/ukpga/2023/50",
                    published_date="2023-10-26",
                    effective_date="2024-12-01",
                    key_provisions=[
                        "Illegal content duties (immediate effect)",
                        "Children's safety duties (phased)",
                        "Age assurance requirements",
                        "Ofcom codes of practice compliance"
                    ],
                    affected_policies=["MP-001", "MP-013", "MP-014", "CM-001", "CM-004"],
                    raw_text_excerpt="A provider of a regulated user-to-user service must...",
                    confidence_score=0.99
                )
            ]
        }
    }

    def __init__(self, baseline_path: str = "knowledge/internal_baseline.md"):
        self.baseline_path = baseline_path
        self.missions: dict[str, ScoutMission] = {}

    def create_mission(
        self,
        market: str,
        domain: str,
        lookback_days: int = 90,
        created_by: str = "system"
    ) -> ScoutMission:
        """Create a new scouting mission."""
        mission_id = f"MISSION-{market}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        domain_enum = Domain(domain) if domain != "all" else Domain.ALL

        mission = ScoutMission(
            mission_id=mission_id,
            market=market.upper(),
            domain=domain_enum,
            lookback_days=lookback_days,
            created_at=datetime.now().isoformat(),
            created_by=created_by,
            status="pending",
            signals=[]
        )

        self.missions[mission_id] = mission
        return mission

    def execute_mission(self, mission_id: str) -> ScoutMission:
        """
        Execute a scouting mission.
        In production, this would:
        1. Query GPT-4 with browsing to search government websites
        2. Parse regulatory databases
        3. Monitor RSS feeds
        4. Apply NLP to extract key provisions
        """
        mission = self.missions.get(mission_id)
        if not mission:
            raise ValueError(f"Mission {mission_id} not found")

        mission.status = "running"

        # Simulate regulatory signal detection
        signals = self._simulate_search(
            market=mission.market,
            domain=mission.domain,
            lookback_days=mission.lookback_days
        )

        mission.signals = signals
        mission.status = "completed"

        return mission

    def _simulate_search(
        self,
        market: str,
        domain: Domain,
        lookback_days: int
    ) -> list[RegulatorySignal]:
        """
        Simulate ChatGPT Browsing-style search.
        Returns regulatory signals matching the mission parameters.
        """
        signals = []
        cutoff_date = datetime.now() - timedelta(days=lookback_days)

        market_signals = self.SIMULATED_SIGNALS.get(market, {})

        if domain == Domain.ALL:
            # Search all domains
            for domain_key, domain_signals in market_signals.items():
                for signal in domain_signals:
                    pub_date = datetime.strptime(signal.published_date, "%Y-%m-%d")
                    if pub_date >= cutoff_date:
                        signals.append(signal)
        else:
            # Search specific domain
            domain_signals = market_signals.get(domain, [])
            for signal in domain_signals:
                pub_date = datetime.strptime(signal.published_date, "%Y-%m-%d")
                if pub_date >= cutoff_date:
                    signals.append(signal)

        return signals

    def export_mission(self, mission_id: str, output_dir: str = "data/history") -> str:
        """Export mission results to JSON."""
        mission = self.missions.get(mission_id)
        if not mission:
            raise ValueError(f"Mission {mission_id} not found")

        os.makedirs(output_dir, exist_ok=True)

        # Convert to serializable format
        mission_dict = {
            "mission_id": mission.mission_id,
            "market": mission.market,
            "domain": mission.domain.value,
            "lookback_days": mission.lookback_days,
            "created_at": mission.created_at,
            "created_by": mission.created_by,
            "status": mission.status,
            "signals": [
                {
                    **asdict(s),
                    "domain": s.domain.value,
                    "source_type": s.source_type.value
                }
                for s in mission.signals
            ]
        }

        output_path = os.path.join(output_dir, f"{mission_id}.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(mission_dict, f, indent=2, ensure_ascii=False)

        return output_path


def main():
    """Demo execution."""
    engine = ScoutEngine()

    # Create and execute a mission
    mission = engine.create_mission(
        market="US",
        domain="minor_protection",
        lookback_days=365,
        created_by="demo_user"
    )

    print(f"Created mission: {mission.mission_id}")

    result = engine.execute_mission(mission.mission_id)

    print(f"Mission status: {result.status}")
    print(f"Signals detected: {len(result.signals)}")

    for signal in result.signals:
        print(f"\n--- {signal.id} ---")
        print(f"Title: {signal.title}")
        print(f"Summary: {signal.summary}")
        print(f"Affected policies: {signal.affected_policies}")

    # Export results
    output_path = engine.export_mission(mission.mission_id)
    print(f"\nResults exported to: {output_path}")


if __name__ == "__main__":
    main()
