"""
GovPulse Scout Engine
=====================
Mission-driven regulatory intelligence gathering system.
Uses LLM for intelligent query generation and signal detection.
"""

import json
import os
import re
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from html import unescape
from typing import Optional
from enum import Enum
from urllib.parse import urlparse
from urllib.request import Request, urlopen

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
    diagnostics: Optional[dict[str, object]] = None


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

TRACKED_DOMAINS = [
    Domain.MINOR_PROTECTION,
    Domain.ECOMMERCE,
    Domain.DATA_SOVEREIGNTY,
    Domain.CONTENT_MODERATION,
]

DOMAIN_ABBREVIATIONS = {
    Domain.MINOR_PROTECTION: "MP",
    Domain.ECOMMERCE: "EC",
    Domain.DATA_SOVEREIGNTY: "DS",
    Domain.CONTENT_MODERATION: "CM",
    Domain.ALL: "ALL",
}


def compute_date_window(
    lookback_days: int,
    reference_time: Optional[datetime] = None,
) -> tuple[str, str]:
    """Return an inclusive ISO date window for a mission."""
    reference = reference_time or datetime.now()
    end_date = reference.date()
    start_date = end_date if lookback_days <= 0 else (reference - timedelta(days=lookback_days)).date()
    return start_date.isoformat(), end_date.isoformat()


def build_search_prompt(query: str, market: str, start_date: str, end_date: str) -> str:
    """Build a search prompt that keeps recall broad but date-bounded."""
    market_info = MARKET_INFO.get(market, {"name": market})
    market_name = market_info.get("name", market)
    gov_sites = market_info.get("government_sites", [])
    regulators = market_info.get("regulators", [])

    return f"""Search for distinct regulatory developments related to:

Query focus: {query}

Market/Region: {market_name}
Publication window: {start_date} through {end_date} (inclusive)

Priorities:
1. Find as many distinct regulatory developments as possible within the exact publication window above.
2. Prioritize official government, legislative, and regulator sources such as {', '.join(gov_sites[:4]) if gov_sites else 'government and regulatory websites'}.
3. Use regulator context from {', '.join(regulators[:4]) if regulators else 'relevant regulatory bodies'}.
4. If official sources are sparse, reputable secondary coverage is acceptable only when it clearly cites an official action inside the same publication window.
5. Ignore evergreen background laws or commentary published outside the window unless there is a new official action, consultation, enforcement step, guidance update, or court development within the window.

For each development you surface, include:
- Exact title
- Exact publication or announcement date when available
- Source URL
- What changed
- Whether the cited source is official or secondary
"""


class QueryGenerator:
    """
    LLM-powered search query generator.
    Generates precise, market-specific regulatory search queries.
    """

    QUERY_COUNT = 5

    SYSTEM_PROMPT = """You are a regulatory intelligence analyst specializing in global tech platform regulation.

Generate five high-recall search briefs that help a web search model discover recent regulatory developments.

Hard rules:
1. Every query must explicitly mention the exact ISO publication window supplied by the user.
2. Never use stale years or stale date ranges outside the supplied window.
3. Never use relative placeholders such as NOW, NOW-90DAYS, last quarter, or recent.
4. Prefer plain-language search briefs over brittle Boolean syntax.
5. Cover diverse angles: legislation, regulatory guidance, enforcement, hearings/consultations, and court or executive actions.
6. When the domain is "all domains", cover minor protection, ecommerce, data sovereignty, content moderation, plus one cross-domain query.

Return a JSON object with a "queries" array containing exactly five strings.
"""

    USER_PROMPT_TEMPLATE = """Generate search briefs for the following mission:

Market: {market} ({market_name})
Policy Domain: {domain}
Lookback Period: {lookback_days} days
Today's Date: {window_end}
Allowed Publication Window: {window_start} through {window_end} (inclusive)
Government Websites: {government_sites}
Regulatory Bodies: {regulators}
Domain Keywords: {domain_keywords}

Return exactly 5 search briefs as JSON: {{"queries": ["...", "..."]}}
"""

    def __init__(self):
        self.client = None
        self.last_generation_metadata: dict[str, object] = {}
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
            queries = self._fallback_queries(market, domain, lookback_days)
            self.last_generation_metadata = {
                "used_llm_queries": False,
                "used_fallback_queries": True,
                "rejected_llm_queries": 0,
            }
            return queries

        market_info = MARKET_INFO.get(market, {})
        domain_keywords = DOMAIN_KEYWORDS.get(domain, [])
        window_start, window_end = compute_date_window(lookback_days)

        if domain == Domain.ALL:
            # Combine keywords from all domains
            domain_keywords = []
            for d in TRACKED_DOMAINS:
                domain_keywords.extend(DOMAIN_KEYWORDS.get(d, [])[:2])

        user_prompt = self.USER_PROMPT_TEMPLATE.format(
            market=market,
            market_name=market_info.get("name", market),
            domain=domain.value if domain != Domain.ALL else "all domains",
            lookback_days=lookback_days,
            window_start=window_start,
            window_end=window_end,
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
            raw_queries = self._extract_queries(result)
            queries, rejected = self._finalize_queries(raw_queries, market, domain, lookback_days)
            self.last_generation_metadata = {
                "used_llm_queries": True,
                "used_fallback_queries": rejected > 0 or len(raw_queries) != len(queries),
                "rejected_llm_queries": rejected,
            }
            print(f"Generated {len(queries)} search queries for {market}/{domain.value}")
            return queries

        except Exception as e:
            print(f"LLM query generation failed: {e}")
            queries = self._fallback_queries(market, domain, lookback_days)
            self.last_generation_metadata = {
                "used_llm_queries": False,
                "used_fallback_queries": True,
                "rejected_llm_queries": 0,
            }
            return queries

    @staticmethod
    def _collapse_whitespace(value: str) -> str:
        return re.sub(r"\s+", " ", (value or "")).strip()

    @staticmethod
    def _extract_queries(result: object) -> list[str]:
        if isinstance(result, list):
            return [str(item) for item in result]
        if isinstance(result, dict):
            if "queries" in result and isinstance(result["queries"], list):
                return [str(item) for item in result["queries"]]
            for value in result.values():
                if isinstance(value, list):
                    return [str(item) for item in value]
        return []

    def _normalize_query_window(
        self,
        query: str,
        window_start: str,
        window_end: str,
    ) -> str:
        normalized = self._collapse_whitespace(query)
        if not normalized:
            return ""

        normalized = re.sub(
            r"date:\[[^\]]+\]",
            f"published between {window_start} and {window_end}",
            normalized,
            flags=re.IGNORECASE,
        )
        normalized = re.sub(
            r"data:\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}",
            f"published between {window_start} and {window_end}",
            normalized,
            flags=re.IGNORECASE,
        )
        normalized = re.sub(r"NOW-\d+DAYS", window_start, normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"\bNOW\b", window_end, normalized, flags=re.IGNORECASE)

        allowed_years = {str(year) for year in range(int(window_start[:4]), int(window_end[:4]) + 1)}
        for year in sorted(set(re.findall(r"\b(20\d{2})\b", normalized))):
            if year in allowed_years:
                continue
            normalized = re.sub(
                rf"(\bAND\b|\bOR\b)?\s*\(?\"?{year}\"?\)?",
                "",
                normalized,
                flags=re.IGNORECASE,
            )

        normalized = self._collapse_whitespace(normalized)
        if not normalized:
            return ""

        if window_start not in normalized or window_end not in normalized:
            normalized = self._collapse_whitespace(
                f"{normalized}. Published between {window_start} and {window_end}."
            )

        return normalized

    @staticmethod
    def _query_has_invalid_window(query: str, window_start: str, window_end: str) -> bool:
        start_date = datetime.strptime(window_start, "%Y-%m-%d").date()
        end_date = datetime.strptime(window_end, "%Y-%m-%d").date()
        allowed_years = {str(year) for year in range(start_date.year, end_date.year + 1)}

        for raw_date in re.findall(r"\b20\d{2}-\d{2}-\d{2}\b", query):
            parsed = datetime.strptime(raw_date, "%Y-%m-%d").date()
            if parsed < start_date or parsed > end_date:
                return True

        return any(year not in allowed_years for year in re.findall(r"\b(20\d{2})\b", query))

    def _finalize_queries(
        self,
        candidate_queries: list[str],
        market: str,
        domain: Domain,
        lookback_days: int,
    ) -> tuple[list[str], int]:
        window_start, window_end = compute_date_window(lookback_days)
        fallback_queries = self._fallback_queries(market, domain, lookback_days)
        finalized: list[str] = []
        rejected = 0

        for query in candidate_queries:
            normalized = self._normalize_query_window(query, window_start, window_end)
            if not normalized or self._query_has_invalid_window(normalized, window_start, window_end):
                rejected += 1
                continue
            if normalized not in finalized:
                finalized.append(normalized)

        for fallback_query in fallback_queries:
            if len(finalized) >= self.QUERY_COUNT:
                break
            if fallback_query not in finalized:
                finalized.append(fallback_query)

        return finalized[: self.QUERY_COUNT], rejected

    def _fallback_queries(
        self,
        market: str,
        domain: Domain,
        lookback_days: int
    ) -> list[str]:
        """Generate stable, date-bounded search briefs when LLM output is unavailable or stale."""
        market_info = MARKET_INFO.get(market, {"name": market})
        market_name = market_info.get("name", market)
        regulators = ", ".join(market_info.get("regulators", [])[:4]) or "relevant regulators"
        priority_sites = ", ".join(market_info.get("government_sites", [])[:4]) or "official government and regulator websites"
        window_start, window_end = compute_date_window(lookback_days)

        def brief(topic: str) -> str:
            return (
                f"{topic}. Published between {window_start} and {window_end}. "
                f"Prioritize {priority_sites}. Regulator context: {regulators}."
            )

        domain_queries = {
            Domain.MINOR_PROTECTION: [
                brief(f"Recent {market_name} bills, draft laws, or official proposals on child and minor online safety, age assurance, or parental controls"),
                brief(f"Recent {market_name} regulator guidance, consultations, or enforcement on minors, youth safety, or age verification for digital platforms"),
                brief(f"Recent {market_name} court rulings, settlements, or executive actions affecting child safety or platform duties toward minors"),
                brief(f"Recent {market_name} hearings, testimonies, or public consultations on youth online safety, addictive design, or parental controls"),
                brief(f"Recent {market_name} official announcements on teen safety defaults, age-gating requirements, or minor-facing advertising restrictions"),
            ],
            Domain.ECOMMERCE: [
                brief(f"Recent {market_name} laws or draft rules on e-commerce, social commerce, marketplace sellers, or platform consumer protection"),
                brief(f"Recent {market_name} regulator guidance or enforcement on marketplace transparency, seller verification, or deceptive commerce practices"),
                brief(f"Recent {market_name} payment, import, or cross-border commerce rules affecting online marketplaces or social commerce platforms"),
                brief(f"Recent {market_name} hearings, consultations, or policy statements on marketplace liability, product safety, or counterfeit enforcement"),
                brief(f"Recent {market_name} official actions affecting social shopping, livestream commerce, or marketplace compliance obligations"),
            ],
            Domain.DATA_SOVEREIGNTY: [
                brief(f"Recent {market_name} laws, draft rules, or court actions on data localization, cross-border transfers, or data residency"),
                brief(f"Recent {market_name} regulator guidance or enforcement on privacy, foreign data access, or platform data governance"),
                brief(f"Recent {market_name} official consultations or opinions on international data transfer safeguards or local storage mandates"),
                brief(f"Recent {market_name} judicial or executive actions affecting data brokers, sensitive data handling, or foreign-adversary access"),
                brief(f"Recent {market_name} official announcements on privacy frameworks, adequacy reviews, or transfer mechanism changes"),
            ],
            Domain.CONTENT_MODERATION: [
                brief(f"Recent {market_name} laws, draft bills, or regulator proposals on content moderation, illegal content, or platform liability"),
                brief(f"Recent {market_name} regulator guidance, enforcement, or transparency requirements for harmful content, misinformation, or takedowns"),
                brief(f"Recent {market_name} court rulings, settlements, or executive actions affecting platform speech duties or moderation obligations"),
                brief(f"Recent {market_name} hearings, consultations, or codes of practice on online harms, recommender transparency, or safety duties"),
                brief(f"Recent {market_name} official updates on platform investigations, fines, or compliance measures tied to harmful or illegal content"),
            ],
        }

        if domain == Domain.ALL:
            return [
                brief(f"Cross-domain {market_name} digital platform regulatory developments affecting child safety, commerce, data governance, or content enforcement"),
                domain_queries[Domain.MINOR_PROTECTION][0],
                domain_queries[Domain.ECOMMERCE][0],
                domain_queries[Domain.DATA_SOVEREIGNTY][0],
                domain_queries[Domain.CONTENT_MODERATION][0],
            ]

        return domain_queries.get(
            domain,
            [brief(f"Recent {market_name} digital platform regulatory developments") for _ in range(self.QUERY_COUNT)],
        )[: self.QUERY_COUNT]


def fetch_real_world_data(
    queries: list[str],
    market: str,
    window_start: str,
    window_end: str,
) -> list[dict]:
    """
    Fetch real-world regulatory data using OpenAI Responses API web_search tool.

    Returns:
        list[dict]: List of search results, each containing query, content, sources
    """
    if not OPENAI_AVAILABLE:
        print("[ERROR] OpenAI SDK not available. Cannot perform web search.")
        return []

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("[ERROR] OPENAI_API_KEY not set. Cannot perform web search.")
        return []

    client = OpenAI(api_key=api_key)
    results = []
    market_info = MARKET_INFO.get(market, {"name": market})
    market_name = market_info.get("name", market)

    print(
        f"[WebSearch] Fetching real-world data for {market_name} with {len(queries)} queries "
        f"between {window_start} and {window_end}..."
    )

    for i, query in enumerate(queries, 1):
        try:
            print(f"  [{i}/{len(queries)}] Searching: {query[:60]}...")

            search_prompt = build_search_prompt(query, market, window_start, window_end)

            # Check if Responses API is supported
            if hasattr(client, 'responses'):
                # Use OpenAI Responses API + web_search_preview
                response = client.responses.create(
                    model="gpt-4o",
                    tools=[{"type": "web_search_preview"}],
                    input=search_prompt
                )

                # Extract results
                content = response.output_text if hasattr(response, 'output_text') else str(response)
                sources = []

                # Extract sources from annotations
                if hasattr(response, 'output') and response.output:
                    for item in response.output:
                        if hasattr(item, 'content'):
                            for content_item in item.content:
                                if hasattr(content_item, 'annotations'):
                                    for ann in content_item.annotations:
                                        if hasattr(ann, 'url'):
                                            sources.append({
                                                "url": ann.url,
                                                "title": getattr(ann, 'title', '')
                                            })

                print(f"    ✓ Got response, {len(sources)} sources extracted")
                print(f"    Content preview: {content[:200]}..." if content else "    No content")

            else:
                # Fall back to Chat Completions API with web search model
                print(f"    [Info] Responses API not available, using chat completions...")
                response = client.chat.completions.create(
                    model="gpt-4o-search-preview",
                    messages=[{
                        "role": "user",
                        "content": search_prompt
                    }]
                )
                content = response.choices[0].message.content
                sources = []
                
                # Try to extract from annotations
                if hasattr(response.choices[0].message, 'annotations'):
                    for ann in response.choices[0].message.annotations:
                        if hasattr(ann, 'url_citation'):
                            sources.append({
                                "url": ann.url_citation.url,
                                "title": ann.url_citation.title
                            })
                
                print(f"    ✓ Got response via chat completions")

            results.append({
                "query": query,
                "content": content,
                "sources": sources,
                "market": market
            })

        except Exception as e:
            print(f"    ✗ Search failed: {e}")
            import traceback
            traceback.print_exc()
            continue

    print(f"[WebSearch] Completed. Got {len(results)} results.")
    return results


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

    @staticmethod
    def _normalize_source_url(url: str) -> str:
        if not url:
            return ""

        parsed = urlparse(url)
        return parsed._replace(query="", fragment="").geturl()

    @staticmethod
    def _is_placeholder_title(title: str) -> bool:
        normalized = title.strip()
        if not normalized:
            return True

        lowered = normalized.lower()
        if lowered in {"unknown", "title not specified"}:
            return True

        if "[title not specified]" in lowered:
            return True

        return bool(re.fullmatch(r"(h\.r\.|s\.)\s*\d+", normalized, flags=re.IGNORECASE))

    @staticmethod
    def _extract_congress_bill_page_url(url: str) -> Optional[str]:
        if not url:
            return None

        cleaned_url = ScoutEngine._normalize_source_url(url)
        parsed = urlparse(cleaned_url)

        bill_match = re.search(r"/(?P<congress>\d+)/bills/(?P<prefix>[a-z]+)(?P<number>\d+)/", parsed.path)
        if not bill_match:
            return None

        bill_type = {
            "hr": "house-bill",
            "s": "senate-bill",
            "hjres": "house-joint-resolution",
            "sjres": "senate-joint-resolution",
            "hres": "house-resolution",
            "sres": "senate-resolution",
        }.get(bill_match.group("prefix").lower())

        if not bill_type:
            return None

        congress = bill_match.group("congress")
        number = bill_match.group("number")
        return f"https://www.congress.gov/bill/{congress}th-congress/{bill_type}/{number}"

    @staticmethod
    def _clean_candidate_title(title: str) -> str:
        normalized = unescape(title or "").strip()
        if not normalized:
            return ""

        normalized = re.sub(r"\s+\|\s+Congress\.gov.*$", "", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r"\s+\|\s+Federal Trade Commission.*$", "", normalized, flags=re.IGNORECASE)

        congress_colon_match = re.search(r"\d{3}(?:st|nd|rd|th)\s+Congress.*?:\s*(.+)$", normalized)
        if congress_colon_match:
            return congress_colon_match.group(1).strip()

        bill_prefix_match = re.match(r"^(H\.R\.|S\.)\s*[\d.]+\s*-\s*(.+)$", normalized, flags=re.IGNORECASE)
        if bill_prefix_match:
            normalized = bill_prefix_match.group(2).strip()

        normalized = re.sub(r"\s+\d{3}(?:st|nd|rd|th)\s+Congress.*$", "", normalized)
        normalized = re.sub(r"\s*[–-]\s*\[Title Not Specified\]\s*$", "", normalized, flags=re.IGNORECASE)

        return normalized.strip()

    def _fetch_page_title(self, url: str) -> str:
        request = Request(url, headers={"User-Agent": "GovPulse/1.0"})
        with urlopen(request, timeout=10) as response:
            html = response.read().decode("utf-8", errors="ignore")

        meta_match = re.search(
            r'<meta[^>]+(?:property|name)=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']',
            html,
            flags=re.IGNORECASE,
        )
        if meta_match:
            return meta_match.group(1)

        title_match = re.search(r"<title>(.*?)</title>", html, flags=re.IGNORECASE | re.DOTALL)
        if title_match:
            return title_match.group(1)

        return ""

    def _build_source_title_index(self, raw_results: list[dict]) -> dict[str, str]:
        source_titles: dict[str, str] = {}

        for result in raw_results:
            for source in result.get("sources", []):
                source_url = self._normalize_source_url(source.get("url", ""))
                source_title = self._clean_candidate_title(source.get("title", ""))
                if source_url and source_title and source_url not in source_titles:
                    source_titles[source_url] = source_title

        return source_titles

    @staticmethod
    def _domain_code(domain: Domain) -> str:
        return DOMAIN_ABBREVIATIONS.get(domain, domain.value[:2].upper())

    def _build_signal_id(
        self,
        mission: ScoutMission,
        result_index: int,
        signal_index: Optional[int] = None,
    ) -> str:
        suffix = f"{result_index:03d}" if signal_index is None else f"{result_index:03d}-{signal_index}"
        return f"{mission.market}-{self._domain_code(mission.domain)}-{datetime.now().year}-{suffix}"

    @classmethod
    def _infer_published_date(cls, *candidates: str) -> str:
        month_name_pattern = (
            r"(?:January|February|March|April|May|June|July|August|September|October|November|December|"
            r"Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)"
        )

        for candidate in candidates:
            if not candidate:
                continue

            normalized = cls._collapse_text(candidate)

            iso_match = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", normalized)
            if iso_match:
                return iso_match.group(1)

            slash_match = re.search(r"\b(20\d{2})/(\d{2})/(\d{2})\b", normalized)
            if slash_match:
                return f"{slash_match.group(1)}-{slash_match.group(2)}-{slash_match.group(3)}"

            month_first_match = re.search(
                rf"\b({month_name_pattern})\s+\d{{1,2}},\s+20\d{{2}}\b",
                normalized,
                flags=re.IGNORECASE,
            )
            if month_first_match:
                parsed = cls._parse_human_date(month_first_match.group(0), ("%B %d, %Y", "%b %d, %Y"))
                if parsed:
                    return parsed

            day_first_match = re.search(
                rf"\b\d{{1,2}}\s+({month_name_pattern})\s+20\d{{2}}\b",
                normalized,
                flags=re.IGNORECASE,
            )
            if day_first_match:
                parsed = cls._parse_human_date(day_first_match.group(0), ("%d %B %Y", "%d %b %Y"))
                if parsed:
                    return parsed

            url_match = re.search(r"/(20\d{2})/(\d{2})/(\d{2})(?:/|$)", normalized)
            if url_match:
                return f"{url_match.group(1)}-{url_match.group(2)}-{url_match.group(3)}"

        return ""

    @staticmethod
    def _collapse_text(value: str) -> str:
        return re.sub(r"\s+", " ", value or "").strip()

    @staticmethod
    def _parse_human_date(raw_date: str, formats: tuple[str, ...]) -> str:
        normalized = raw_date.replace("Sept ", "Sep ")
        for fmt in formats:
            try:
                return datetime.strptime(normalized, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return ""

    def _enrich_signal_metadata(
        self,
        signal: RegulatorySignal,
        source_titles: dict[str, str]
    ) -> RegulatorySignal:
        signal.source_url = self._normalize_source_url(signal.source_url)

        if self._is_placeholder_title(signal.title):
            source_title = source_titles.get(signal.source_url, "")
            if source_title and not self._is_placeholder_title(source_title):
                signal.title = source_title
                return signal

            congress_bill_url = self._extract_congress_bill_page_url(signal.source_url)
            if congress_bill_url:
                try:
                    fetched_title = self._clean_candidate_title(self._fetch_page_title(congress_bill_url))
                except Exception as error:
                    print(f"[Warning] Failed to resolve Congress bill title for {signal.source_url}: {error}")
                    fetched_title = ""

                if fetched_title and not self._is_placeholder_title(fetched_title):
                    signal.title = fetched_title
                    signal.source_url = congress_bill_url
                    return signal

            signal.title = self._clean_candidate_title(signal.title)

        return signal

    @staticmethod
    def _parse_signal_date(date_str: Optional[str]) -> Optional[datetime]:
        """Parse supported date formats for signal publication dates."""
        if not date_str:
            return None

        normalized = date_str.strip()
        if not normalized:
            return None

        if normalized.endswith("Z"):
            normalized = normalized[:-1] + "+00:00"

        try:
            return datetime.fromisoformat(normalized)
        except ValueError:
            pass

        for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(normalized, fmt)
            except ValueError:
                continue

        return None

    def _filter_signals_by_lookback(
        self,
        signals: list[RegulatorySignal],
        lookback_days: int
    ) -> tuple[list[RegulatorySignal], dict[str, int]]:
        """Keep only signals whose published_date falls within the lookback window."""
        diagnostics = {
            "signals_missing_date": 0,
            "signals_out_of_window": 0,
            "signals_kept": 0,
        }

        if lookback_days <= 0:
            diagnostics["signals_kept"] = len(signals)
            return list(signals), diagnostics

        cutoff_date = (datetime.now() - timedelta(days=lookback_days)).date()
        filtered_signals = []

        for signal in signals:
            published_at = self._parse_signal_date(signal.published_date)
            if not published_at:
                print(f"[Filter] Excluding signal with missing/invalid published date: {signal.title}")
                diagnostics["signals_missing_date"] += 1
                continue

            if published_at.date() < cutoff_date:
                print(
                    f"[Filter] Excluding out-of-window signal: {signal.title} "
                    f"({signal.published_date} < {cutoff_date.isoformat()})"
                )
                diagnostics["signals_out_of_window"] += 1
                continue

            filtered_signals.append(signal)

        diagnostics["signals_kept"] = len(filtered_signals)
        return filtered_signals, diagnostics

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
            generated_queries=[],
            diagnostics={}
        )

        self.missions[mission_id] = mission
        return mission

    def execute_mission(
        self,
        mission_id: str,
        use_real_search: bool = True
    ) -> ScoutMission:
        """
        Execute a scouting mission.

        Args:
            mission_id: The mission to execute
            use_real_search: If True (default), uses real web search via OpenAI Responses API
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

        diagnostics: dict[str, object] = {
            "query_count": len(queries),
            "raw_result_count": 0,
            "parsed_signal_count": 0,
            "used_real_search": use_real_search,
            "used_raw_result_fallback": False,
            "used_simulated_fallback": False,
        }
        diagnostics.update(self.query_generator.last_generation_metadata)

        # Step 2: Fetch and parse data
        if use_real_search:
            window_start, window_end = compute_date_window(mission.lookback_days)
            raw_results = fetch_real_world_data(queries, mission.market, window_start, window_end)
            diagnostics["raw_result_count"] = len(raw_results)
            if raw_results:
                parsed_signals = self._parse_web_search_results(raw_results, mission)
                if not parsed_signals:
                    print("[Warning] Failed to extract signals from search results, trying raw result conversion")
                    parsed_signals = self._convert_raw_to_signals(raw_results, mission)
                    diagnostics["used_raw_result_fallback"] = bool(parsed_signals)

                if not parsed_signals:
                    print("[Warning] Raw result conversion produced no signals, using simulated data")
                    parsed_signals = self._get_simulated_signals(mission)
                    diagnostics["used_simulated_fallback"] = True
            else:
                print("[Warning] Web search returned no results, using simulated data")
                parsed_signals = self._get_simulated_signals(mission)
                diagnostics["used_simulated_fallback"] = True
        else:
            # Demo mode: use simulated data
            parsed_signals = self._get_simulated_signals(mission)

        diagnostics["parsed_signal_count"] = len(parsed_signals)
        mission.signals, filter_diagnostics = self._filter_signals_by_lookback(parsed_signals, mission.lookback_days)
        diagnostics.update(filter_diagnostics)
        mission.diagnostics = diagnostics
        print(f"[Diagnostics] {json.dumps(diagnostics, ensure_ascii=False)}")

        mission.status = "completed"
        print(f"Mission completed. Found {len(mission.signals)} signals.")
        return mission

    def _parse_web_search_results(
        self,
        raw_results: list[dict],
        mission: ScoutMission
    ) -> list[RegulatorySignal]:
        """
        Parse web search results using LLM and extract structured regulatory signals.
        """
        if not OPENAI_AVAILABLE or not os.environ.get("OPENAI_API_KEY"):
            print("[Warning] OpenAI not available for parsing, returning raw results")
            return self._convert_raw_to_signals(raw_results, mission)

        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        signals = []
        source_titles = self._build_source_title_index(raw_results)
        window_start, window_end = compute_date_window(mission.lookback_days)

        print(f"[Parser] Processing {len(raw_results)} search results")

        for result_index, raw_result in enumerate(raw_results):
            parse_prompt = self._build_parse_prompt(raw_result, mission, window_start, window_end)

            try:
                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You extract structured regulatory developments from search output. "
                                "Return only valid JSON and preserve only real developments supported by the provided text."
                            ),
                        },
                        {"role": "user", "content": parse_prompt},
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"},
                )

                content = response.choices[0].message.content
                result_payload = json.loads(content)
                signal_entries = result_payload.get("signals", []) if isinstance(result_payload, dict) else []
                if not signal_entries and isinstance(result_payload, list):
                    signal_entries = result_payload
                if not signal_entries and isinstance(result_payload, dict):
                    for value in result_payload.values():
                        if isinstance(value, list):
                            signal_entries = value
                            break

                print(
                    f"[Parser] Result {result_index + 1}/{len(raw_results)} yielded "
                    f"{len(signal_entries)} candidate signals"
                )

                for signal_index, candidate in enumerate(signal_entries):
                    try:
                        signal = self._coerce_signal_candidate(
                            candidate,
                            raw_result,
                            mission,
                            source_titles,
                            result_index,
                            signal_index,
                        )
                        signals.append(signal)
                        print(f"[Parser] ✓ Parsed signal: {signal.title[:50]}...")
                    except Exception as error:
                        print(f"[Warning] Failed to parse signal {signal_index} from result {result_index}: {error}")
                        print(f"[Warning] Signal data: {candidate}")

            except Exception as error:
                print(f"[Error] Failed to parse search result {result_index}: {error}")

        deduped_signals = self._dedupe_signals(signals)
        print(f"[Parser] Successfully extracted {len(deduped_signals)} unique regulatory signals")
        return deduped_signals

    def _build_parse_prompt(
        self,
        raw_result: dict,
        mission: ScoutMission,
        window_start: str,
        window_end: str,
    ) -> str:
        source_block = "\n".join(
            f"- {source.get('title', 'Untitled source')} ({source.get('url', '')})"
            for source in raw_result.get("sources", [])[:10]
        ) or "- No source metadata captured"

        return f"""Analyze the following search result and extract every distinct regulatory development relevant to {mission.market} / {mission.domain.value}.

Allowed publication window: {window_start} through {window_end} (inclusive)
If a development is outside this publication window, exclude it.

Query:
{raw_result.get("query", "")}

Sources:
{source_block}

Search result text:
{self._collapse_text(raw_result.get("content", ""))[:12000]}

Return JSON in the form {{"signals": [...]}}.

For each signal include:
- id
- title
- summary
- source_url
- published_date
- effective_date
- key_provisions
- source_type
- confidence_score

Rules:
1. Prefer exact publication dates in YYYY-MM-DD.
2. If the text hints at a date but does not format it in ISO, infer the ISO date only when the day, month, and year are all explicit in the text or URL.
3. If no exact date is available, leave published_date empty rather than guessing.
4. Do not merge unrelated developments into one signal.
5. Do not fabricate laws, agencies, or URLs.
"""

    def _coerce_signal_candidate(
        self,
        candidate: dict,
        raw_result: dict,
        mission: ScoutMission,
        source_titles: dict[str, str],
        result_index: int,
        signal_index: int,
    ) -> RegulatorySignal:
        source_type_str = (
            str(candidate.get("source_type", "legislation"))
            .lower()
            .replace(" ", "_")
            .replace("-", "_")
        )
        valid_source_types = {
            "legislation",
            "executive_order",
            "regulatory_guidance",
            "court_ruling",
            "hearing_transcript",
            "draft_bill",
        }
        if source_type_str not in valid_source_types:
            source_type_str = "legislation"

        source_url = candidate.get("source_url", "")
        raw_text_excerpt = candidate.get("excerpt", candidate.get("raw_text_excerpt", ""))
        published_date = candidate.get("published_date") or self._infer_published_date(
            candidate.get("title", ""),
            raw_text_excerpt,
            candidate.get("summary", ""),
            source_url,
            raw_result.get("content", ""),
        )

        signal = RegulatorySignal(
            id=candidate.get("id", self._build_signal_id(mission, result_index, signal_index)),
            market=mission.market,
            domain=mission.domain,
            source_type=SourceType(source_type_str),
            title=candidate.get("title", "Unknown"),
            summary=candidate.get("summary", ""),
            source_url=source_url,
            published_date=published_date,
            effective_date=candidate.get("effective_date"),
            key_provisions=candidate.get("key_provisions", []),
            affected_policies=[],
            raw_text_excerpt=raw_text_excerpt,
            confidence_score=float(candidate.get("confidence_score", 0.7)),
        )
        return self._enrich_signal_metadata(signal, source_titles)

    def _dedupe_signals(self, signals: list[RegulatorySignal]) -> list[RegulatorySignal]:
        deduped: dict[str, RegulatorySignal] = {}
        order: list[str] = []

        for signal in signals:
            normalized_url = self._normalize_source_url(signal.source_url)
            normalized_title = self._collapse_text(signal.title).lower()
            key = normalized_url or f"{normalized_title}|{signal.published_date}"

            if key not in deduped:
                deduped[key] = signal
                order.append(key)
                continue

            if signal.confidence_score > deduped[key].confidence_score:
                deduped[key] = signal

        return [deduped[key] for key in order]

    def _convert_raw_to_signals(
        self,
        raw_results: list[dict],
        mission: ScoutMission
    ) -> list[RegulatorySignal]:
        """Convert raw search results to signals (when LLM is unavailable)."""
        signals = []
        source_titles = self._build_source_title_index(raw_results)
        for i, result in enumerate(raw_results):
            sources = result.get("sources", [])
            content = result.get("content", "")
            query = result.get("query", "Unknown")
            
            # If sources exist, create a signal for each source
            if sources:
                for j, source in enumerate(sources[:3]):
                    published_date = self._infer_published_date(
                        source.get("title", ""),
                        source.get("url", ""),
                        content,
                        query,
                    )
                    signal = RegulatorySignal(
                        id=self._build_signal_id(mission, i, j),
                        market=mission.market,
                        domain=mission.domain,
                        source_type=SourceType.LEGISLATION,
                        title=source.get("title", query),
                        summary=content[:500] if content else "",
                        source_url=source.get("url", ""),
                        published_date=published_date,
                        effective_date=None,
                        key_provisions=[],
                        affected_policies=[],
                        raw_text_excerpt=content[:1000] if content else "",
                        confidence_score=0.5
                    )
                    signals.append(self._enrich_signal_metadata(signal, source_titles))
            elif content:
                # If no sources but content exists, still create a signal
                published_date = self._infer_published_date(content, query)
                signal = RegulatorySignal(
                    id=self._build_signal_id(mission, i),
                    market=mission.market,
                    domain=mission.domain,
                    source_type=SourceType.LEGISLATION,
                    title=query,
                    summary=content[:500],
                    source_url="",
                    published_date=published_date,
                    effective_date=None,
                    key_provisions=[],
                    affected_policies=[],
                    raw_text_excerpt=content[:1000],
                    confidence_score=0.4
                )
                signals.append(self._enrich_signal_metadata(signal, source_titles))
        return signals

    def _get_simulated_signals(self, mission: ScoutMission) -> list[RegulatorySignal]:
        """Get simulated signals matching mission parameters (for demo mode)."""
        signals = []

        market_signals = self.SIMULATED_SIGNALS.get(mission.market, {})

        if mission.domain == Domain.ALL:
            for domain_key, domain_signals in market_signals.items():
                signals.extend(domain_signals)
        else:
            signals = list(market_signals.get(mission.domain, []))

        # Return copied signal objects while preserving original metadata.
        copied_signals = []
        for signal in signals:
            copied_signal = RegulatorySignal(
                id=signal.id,
                market=signal.market,
                domain=signal.domain,
                source_type=signal.source_type,
                title=signal.title,
                summary=signal.summary,
                source_url=signal.source_url,
                published_date=signal.published_date,
                effective_date=signal.effective_date,
                key_provisions=signal.key_provisions,
                affected_policies=signal.affected_policies,
                raw_text_excerpt=signal.raw_text_excerpt,
                confidence_score=signal.confidence_score
            )
            copied_signals.append(copied_signal)

        return copied_signals

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
                    id=f"{mission.market}-{self._domain_code(mission.domain)}-LIVE-{i:03d}",
                    market=mission.market,
                    domain=mission.domain,
                    source_type=SourceType.LEGISLATION,
                    title=data.get("title", "Unknown"),
                    summary=data.get("summary", ""),
                    source_url=data.get("url", ""),
                    published_date=data.get("date") or "",
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
            "diagnostics": mission.diagnostics or {},
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
