"""
GovPulse Scout Engine
=====================
Mission-driven regulatory intelligence gathering system.
Uses LLM for intelligent query generation and signal detection.
"""

import json
import os
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Optional
from enum import Enum

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("Warning: OpenAI SDK not installed. Run: pip install openai")


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
    generated_queries: list[str] = None  # LLM-generated search queries


# ============================================================================
# MARKET METADATA
# ============================================================================

MARKET_INFO = {
    "US": {
        "name": "United States",
        "government_sites": ["congress.gov", "ftc.gov", "justice.gov", "whitehouse.gov"],
        "language": "English",
        "regulators": ["FTC", "FCC", "DOJ", "State AGs"]
    },
    "EU": {
        "name": "European Union",
        "government_sites": ["eur-lex.europa.eu", "ec.europa.eu", "edpb.europa.eu"],
        "language": "English",
        "regulators": ["European Commission", "EDPB", "National DPAs"]
    },
    "UK": {
        "name": "United Kingdom",
        "government_sites": ["legislation.gov.uk", "gov.uk", "ofcom.org.uk"],
        "language": "English",
        "regulators": ["Ofcom", "ICO", "CMA"]
    },
    "ID": {
        "name": "Indonesia",
        "government_sites": ["kemendag.go.id", "kominfo.go.id", "bpom.go.id"],
        "language": "Indonesian",
        "regulators": ["Kominfo", "OJK", "Ministry of Trade"]
    },
    "BR": {
        "name": "Brazil",
        "government_sites": ["gov.br", "camara.leg.br", "senado.leg.br", "anpd.gov.br"],
        "language": "Portuguese",
        "regulators": ["ANPD", "SENACON", "CADE"]
    },
    "JP": {
        "name": "Japan",
        "government_sites": ["e-gov.go.jp", "caa.go.jp", "soumu.go.jp"],
        "language": "Japanese",
        "regulators": ["PPC", "MIC", "METI"]
    },
    "KR": {
        "name": "South Korea",
        "government_sites": ["law.go.kr", "pipc.go.kr", "kcc.go.kr"],
        "language": "Korean",
        "regulators": ["PIPC", "KCC", "KFTC"]
    },
    "AU": {
        "name": "Australia",
        "government_sites": ["legislation.gov.au", "oaic.gov.au", "esafety.gov.au"],
        "language": "English",
        "regulators": ["eSafety Commissioner", "OAIC", "ACCC"]
    }
}

DOMAIN_KEYWORDS = {
    Domain.MINOR_PROTECTION: [
        "children safety", "minor protection", "youth protection",
        "age verification", "parental control", "COPPA", "KOSA",
        "online safety", "child safety", "teen safety"
    ],
    Domain.ECOMMERCE: [
        "e-commerce regulation", "social commerce", "digital trade",
        "online marketplace", "cross-border commerce", "payment regulation",
        "consumer protection", "seller compliance"
    ],
    Domain.DATA_SOVEREIGNTY: [
        "data localization", "data sovereignty", "cross-border data",
        "data protection", "privacy regulation", "GDPR", "data residency",
        "foreign data access", "data transfer"
    ],
    Domain.CONTENT_MODERATION: [
        "content moderation", "harmful content", "misinformation",
        "platform liability", "illegal content", "hate speech",
        "content takedown", "transparency report"
    ]
}


class QueryGenerator:
    """
    LLM-powered search query generator.
    Generates precise, market-specific regulatory search queries.
    """

    SYSTEM_PROMPT = """你是一名监管情报分析师，专门追踪全球科技平台监管动态。

你的任务是根据给定的市场和政策领域，生成5个精准的搜索查询语句，用于在政府网站和法律数据库中搜索最新的监管变化。

要求：
1. 查询语句必须精准、具体
2. 包含市场特定的法规名称或监管机构
3. 使用当地语言的官方术语（如适用）
4. 覆盖：立法草案、已通过法律、监管指引、听证会、法院判决
5. 时效性：关注最近的监管动态

输出格式：返回 JSON 数组，包含5个搜索查询字符串。
"""

    USER_PROMPT_TEMPLATE = """请为以下任务生成搜索查询：

市场：{market} ({market_name})
政策领域：{domain}
回溯期：{lookback_days}天
相关政府网站：{government_sites}
相关监管机构：{regulators}
领域关键词：{domain_keywords}

请生成5个精准的搜索查询语句，格式为 JSON 数组。
"""

    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self):
        """Initialize OpenAI client."""
        if not OPENAI_AVAILABLE:
            return

        api_key = os.environ.get("OPENAI_API_KEY")
        if api_key:
            self.client = OpenAI(api_key=api_key)

    def generate_queries(
        self,
        market: str,
        domain: Domain,
        lookback_days: int
    ) -> list[str]:
        """
        Generate search queries using LLM.
        Falls back to template-based queries if LLM unavailable.
        """
        if not self.client:
            return self._fallback_queries(market, domain, lookback_days)

        market_info = MARKET_INFO.get(market, {})
        domain_keywords = DOMAIN_KEYWORDS.get(domain, [])

        if domain == Domain.ALL:
            # Combine keywords from all domains
            domain_keywords = []
            for d in [Domain.MINOR_PROTECTION, Domain.ECOMMERCE,
                      Domain.DATA_SOVEREIGNTY, Domain.CONTENT_MODERATION]:
                domain_keywords.extend(DOMAIN_KEYWORDS.get(d, [])[:2])

        user_prompt = self.USER_PROMPT_TEMPLATE.format(
            market=market,
            market_name=market_info.get("name", market),
            domain=domain.value if domain != Domain.ALL else "all domains",
            lookback_days=lookback_days,
            government_sites=", ".join(market_info.get("government_sites", [])),
            regulators=", ".join(market_info.get("regulators", [])),
            domain_keywords=", ".join(domain_keywords[:5])
        )

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            result = json.loads(content)

            # Handle different JSON formats
            if isinstance(result, list):
                queries = result[:5]
            elif "queries" in result:
                queries = result["queries"][:5]
            else:
                queries = list(result.values())[:5]

            print(f"Generated {len(queries)} search queries for {market}/{domain.value}")
            return queries

        except Exception as e:
            print(f"LLM query generation failed: {e}")
            return self._fallback_queries(market, domain, lookback_days)

    def _fallback_queries(
        self,
        market: str,
        domain: Domain,
        lookback_days: int
    ) -> list[str]:
        """Generate template-based queries when LLM is unavailable."""
        market_info = MARKET_INFO.get(market, {"name": market})
        market_name = market_info.get("name", market)

        base_queries = []

        if domain == Domain.MINOR_PROTECTION or domain == Domain.ALL:
            base_queries.extend([
                f"{market_name} children online safety legislation 2024",
                f"{market_name} minor protection digital platform regulation"
            ])

        if domain == Domain.ECOMMERCE or domain == Domain.ALL:
            base_queries.extend([
                f"{market_name} e-commerce social media regulation 2024",
                f"{market_name} online marketplace seller requirements"
            ])

        if domain == Domain.DATA_SOVEREIGNTY or domain == Domain.ALL:
            base_queries.extend([
                f"{market_name} data localization law 2024",
                f"{market_name} cross-border data transfer regulation"
            ])

        if domain == Domain.CONTENT_MODERATION or domain == Domain.ALL:
            base_queries.extend([
                f"{market_name} content moderation platform liability 2024",
                f"{market_name} illegal content takedown requirements"
            ])

        return base_queries[:5]


def fetch_real_world_data(queries: list[str], market: str) -> list[dict]:
    """
    Placeholder function for real-world data fetching.

    ============================================================================
    TODO: 实现真实的网页抓取功能
    ============================================================================

    此处需要接入搜索引擎 API 以配合 OpenAI 进行网页抓取。

    推荐方案：
    1. Tavily API (https://tavily.com) - 专为 AI 设计的搜索 API
       - 支持实时网页搜索
       - 返回结构化结果
       - 与 OpenAI 兼容性好

    2. Serper API (https://serper.dev) - Google 搜索 API
       - 低延迟
       - 支持新闻搜索

    3. Bing Web Search API (Azure)
       - 企业级可靠性
       - 支持地区过滤

    实现步骤：
    1. 获取搜索 API 密钥，配置环境变量 TAVILY_API_KEY
    2. 对每个 query 调用搜索 API
    3. 获取搜索结果的 URL 列表
    4. 使用 requests/httpx 抓取页面内容
    5. 使用 GPT-4 提取监管信号信息

    示例代码框架：
    ```python
    import httpx
    from tavily import TavilyClient

    tavily = TavilyClient(api_key=os.environ.get("TAVILY_API_KEY"))

    results = []
    for query in queries:
        search_results = tavily.search(
            query=query,
            search_depth="advanced",
            include_domains=MARKET_INFO[market]["government_sites"]
        )

        for result in search_results["results"]:
            # 使用 GPT-4 分析页面内容，提取监管信号
            signal = analyze_with_gpt(result["content"])
            results.append(signal)

    return results
    ```
    ============================================================================
    """
    print(f"[PLACEHOLDER] fetch_real_world_data called with {len(queries)} queries for {market}")
    print("To enable real-world search, implement Tavily/Serper API integration.")
    return []


class ScoutEngine:
    """
    Core intelligence gathering engine.
    Uses LLM for query generation and signal detection.
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
        self.query_generator = QueryGenerator()

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
            signals=[],
            generated_queries=[]
        )

        self.missions[mission_id] = mission
        return mission

    def execute_mission(
        self,
        mission_id: str,
        use_real_search: bool = False
    ) -> ScoutMission:
        """
        Execute a scouting mission.

        Args:
            mission_id: The mission to execute
            use_real_search: If True, attempts real-world search (requires API keys)
        """
        mission = self.missions.get(mission_id)
        if not mission:
            raise ValueError(f"Mission {mission_id} not found")

        mission.status = "running"

        # Step 1: Generate search queries using LLM
        queries = self.query_generator.generate_queries(
            market=mission.market,
            domain=mission.domain,
            lookback_days=mission.lookback_days
        )
        mission.generated_queries = queries

        print(f"Generated queries for {mission.market}/{mission.domain.value}:")
        for i, q in enumerate(queries, 1):
            print(f"  {i}. {q}")

        # Step 2: Fetch real-world data (if enabled) or use simulated data
        if use_real_search:
            # Attempt real-world search
            real_signals = fetch_real_world_data(queries, mission.market)
            if real_signals:
                mission.signals = self._parse_real_signals(real_signals, mission)
            else:
                # Fall back to simulated data
                mission.signals = self._get_simulated_signals(mission)
        else:
            # Use simulated data
            mission.signals = self._get_simulated_signals(mission)

        mission.status = "completed"
        return mission

    def _get_simulated_signals(self, mission: ScoutMission) -> list[RegulatorySignal]:
        """Get simulated signals matching mission parameters."""
        signals = []
        cutoff_date = datetime.now() - timedelta(days=mission.lookback_days)

        market_signals = self.SIMULATED_SIGNALS.get(mission.market, {})

        if mission.domain == Domain.ALL:
            for domain_key, domain_signals in market_signals.items():
                for signal in domain_signals:
                    pub_date = datetime.strptime(signal.published_date, "%Y-%m-%d")
                    if pub_date >= cutoff_date:
                        signals.append(signal)
        else:
            domain_signals = market_signals.get(mission.domain, [])
            for signal in domain_signals:
                pub_date = datetime.strptime(signal.published_date, "%Y-%m-%d")
                if pub_date >= cutoff_date:
                    signals.append(signal)

        return signals

    def _parse_real_signals(
        self,
        raw_data: list[dict],
        mission: ScoutMission
    ) -> list[RegulatorySignal]:
        """
        Parse real-world search results into RegulatorySignal objects.
        This would use GPT-4 to extract structured information.
        """
        signals = []
        for i, data in enumerate(raw_data):
            try:
                signal = RegulatorySignal(
                    id=f"{mission.market}-{mission.domain.value[:2].upper()}-LIVE-{i:03d}",
                    market=mission.market,
                    domain=mission.domain,
                    source_type=SourceType.LEGISLATION,
                    title=data.get("title", "Unknown"),
                    summary=data.get("summary", ""),
                    source_url=data.get("url", ""),
                    published_date=data.get("date", datetime.now().strftime("%Y-%m-%d")),
                    effective_date=data.get("effective_date"),
                    key_provisions=data.get("provisions", []),
                    affected_policies=data.get("affected_policies", []),
                    raw_text_excerpt=data.get("excerpt", ""),
                    confidence_score=data.get("confidence", 0.5)
                )
                signals.append(signal)
            except Exception as e:
                print(f"Error parsing signal: {e}")

        return signals

    def export_mission(self, mission_id: str, output_dir: str = "data/history") -> str:
        """Export mission results to JSON."""
        mission = self.missions.get(mission_id)
        if not mission:
            raise ValueError(f"Mission {mission_id} not found")

        os.makedirs(output_dir, exist_ok=True)

        mission_dict = {
            "mission_id": mission.mission_id,
            "market": mission.market,
            "domain": mission.domain.value,
            "lookback_days": mission.lookback_days,
            "created_at": mission.created_at,
            "created_by": mission.created_by,
            "status": mission.status,
            "generated_queries": mission.generated_queries,
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
    # Check for API key
    if not os.environ.get("OPENAI_API_KEY"):
        print("=" * 60)
        print("OPENAI_API_KEY not set. Using fallback query generation.")
        print("Set the environment variable for LLM-powered queries:")
        print("  export OPENAI_API_KEY='your-api-key'")
        print("=" * 60)
        print()

    engine = ScoutEngine()

    # Create and execute a mission
    mission = engine.create_mission(
        market="US",
        domain="minor_protection",
        lookback_days=365,
        created_by="demo_user"
    )

    print(f"\nCreated mission: {mission.mission_id}")

    result = engine.execute_mission(mission.mission_id)

    print(f"\nMission status: {result.status}")
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
