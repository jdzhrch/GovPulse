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

    SYSTEM_PROMPT = """You are a regulatory intelligence analyst specializing in tracking global tech platform regulations.

Your task is to generate 5 precise search queries for a given market and policy domain to search government websites and legal databases for recent regulatory changes.

Requirements:
1. Queries must be precise and specific
2. Include market-specific regulation names or regulatory bodies
3. Use official terminology in local language where applicable
4. Cover: draft bills, enacted laws, regulatory guidance, hearings, court rulings
5. Focus on recent regulatory developments

Output format: Return a JSON array containing 5 search query strings.
"""

    USER_PROMPT_TEMPLATE = """Generate search queries for the following mission:

Market: {market} ({market_name})
Policy Domain: {domain}
Lookback Period: {lookback_days} days
Government Websites: {government_sites}
Regulatory Bodies: {regulators}
Domain Keywords: {domain_keywords}

Generate 5 precise search queries as a JSON array.
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
        current_year = datetime.now().year

        base_queries = []

        if domain == Domain.MINOR_PROTECTION or domain == Domain.ALL:
            base_queries.extend([
                f"{market_name} children online safety legislation {current_year}",
                f"{market_name} minor protection digital platform regulation"
            ])

        if domain == Domain.ECOMMERCE or domain == Domain.ALL:
            base_queries.extend([
                f"{market_name} e-commerce social media regulation {current_year}",
                f"{market_name} online marketplace seller requirements"
            ])

        if domain == Domain.DATA_SOVEREIGNTY or domain == Domain.ALL:
            base_queries.extend([
                f"{market_name} data localization law {current_year}",
                f"{market_name} cross-border data transfer regulation"
            ])

        if domain == Domain.CONTENT_MODERATION or domain == Domain.ALL:
            base_queries.extend([
                f"{market_name} content moderation platform liability {current_year}",
                f"{market_name} illegal content takedown requirements"
            ])

        return base_queries[:5]


def fetch_real_world_data(queries: list[str], market: str) -> list[dict]:
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
    # Get government website list as reference, without strict restriction
    gov_sites = market_info.get("government_sites", [])
    regulators = market_info.get("regulators", [])

    print(f"[WebSearch] Fetching real-world data for {market_name} with {len(queries)} queries...")

    for i, query in enumerate(queries, 1):
        try:
            print(f"  [{i}/{len(queries)}] Searching: {query[:60]}...")

            # Build a flexible search prompt without restricting to specific websites
            # This allows finding more relevant results, including news coverage and analysis
            search_prompt = f"""Search for recent regulatory news and policy updates related to:

Query: {query}

Market/Region: {market_name}

Search broadly for:
1. Official government announcements and press releases
2. New legislation, regulations, or bills (proposed or enacted)
3. Regulatory enforcement actions and guidance
4. Policy proposals, drafts, and consultations
5. Reputable news coverage of regulatory developments
6. Legal analysis and expert commentary

Preferred sources (but not limited to): {', '.join(gov_sites[:3]) if gov_sites else 'government and regulatory websites'}
Key regulators to watch: {', '.join(regulators[:3]) if regulators else 'relevant regulatory bodies'}

IMPORTANT: Return the most relevant and recent regulatory developments. Include:
- Specific names of laws, regulations, or bills
- Exact dates (when available)
- Official source URLs
- Key provisions or requirements
- Affected industries or sectors

If direct government sources aren't indexed, authoritative news sources and legal publications are acceptable."""

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
    ) -> list[RegulatorySignal]:
        """Keep only signals whose published_date falls within the lookback window."""
        if lookback_days <= 0:
            return list(signals)

        cutoff_date = (datetime.now() - timedelta(days=lookback_days)).date()
        filtered_signals = []

        for signal in signals:
            published_at = self._parse_signal_date(signal.published_date)
            if not published_at:
                print(f"[Filter] Excluding signal with missing/invalid published date: {signal.title}")
                continue

            if published_at.date() < cutoff_date:
                print(
                    f"[Filter] Excluding out-of-window signal: {signal.title} "
                    f"({signal.published_date} < {cutoff_date.isoformat()})"
                )
                continue

            filtered_signals.append(signal)

        return filtered_signals

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

        # Step 2: Fetch and parse data
        if use_real_search:
            # Use OpenAI Responses API with web_search
            raw_results = fetch_real_world_data(queries, mission.market)
            if raw_results:
                parsed_signals = self._parse_web_search_results(raw_results, mission)
                # If no signals after parsing, fall back to simulated data
                if not parsed_signals:
                    print("[Warning] Failed to extract signals from search results, using simulated data")
                    parsed_signals = self._get_simulated_signals(mission)
            else:
                print("[Warning] Web search returned no results, using simulated data")
                parsed_signals = self._get_simulated_signals(mission)
        else:
            # Demo mode: use simulated data
            parsed_signals = self._get_simulated_signals(mission)

        mission.signals = self._filter_signals_by_lookback(parsed_signals, mission.lookback_days)

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

        # Combine all search results
        combined_content = "\n\n---\n\n".join([
            (
                f"Query: {r['query']}\n\n"
                f"Sources:\n" +
                ("\n".join(
                    f"- {source.get('title', 'Untitled source')} ({source.get('url', '')})"
                    for source in r.get("sources", [])[:10]
                ) or "- No source metadata captured") +
                f"\n\nResult:\n{r['content']}"
            )
            for r in raw_results
        ])

        print(f"[Parser] Processing {len(raw_results)} search results, total {len(combined_content)} chars")
        source_titles = self._build_source_title_index(raw_results)

        # Improved parsing prompt
        parse_prompt = f"""You are a regulatory intelligence analyst. Analyze the following search results about {mission.market} market {mission.domain.value} domain and extract all regulatory signals.

Search Results:
{combined_content[:20000]}

Task: Extract all regulation-related signals from the above content. Extract as much as possible even if information is incomplete.

For each regulatory signal, provide:
- id: Signal ID in format "{mission.market}-XX-{datetime.now().year}-XXX" where XX is domain abbreviation
- title: Full title of the regulation or policy
- summary: 2-3 sentence summary describing what it is and its impact
- source_url: Source URL (if available)
- published_date: Publication date in "YYYY-MM-DD" format
- effective_date: Effective date (optional), "YYYY-MM-DD" or null
- key_provisions: List of key provisions (string array)
- source_type: Source type, must be one of: legislation, executive_order, regulatory_guidance, court_ruling, draft_bill
- confidence_score: Information confidence level, number between 0.0-1.0

Important:
1. Return a JSON object with "signals" key containing an array of signals
2. Extract signals even with partial information
3. If no regulatory information found, return {{"signals": []}}
4. Do not fabricate information, but extract as much real content as possible

Example output format:
{{"signals": [
  {{
    "id": "{mission.market}-MP-{datetime.now().year}-001",
    "title": "Example Regulation Name",
    "summary": "Brief description of the regulation...",
    "source_url": "https://example.gov/...",
    "published_date": "2025-01-15",
    "effective_date": "2025-07-01",
    "key_provisions": ["Provision 1", "Provision 2"],
    "source_type": "legislation",
    "confidence_score": 0.85
  }}
]}}
"""

        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a professional regulatory intelligence analyst. Your task is to extract structured regulatory information from search results. Extract all relevant signals even with incomplete information. Always return valid JSON format."},
                    {"role": "user", "content": parse_prompt}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            print(f"[Parser] LLM response: {content[:500]}...")
            
            result = json.loads(content)

            # Parse JSON result - support multiple formats
            signal_list = []
            if isinstance(result, list):
                signal_list = result
            elif "signals" in result:
                signal_list = result["signals"]
            elif "data" in result:
                signal_list = result["data"]
            else:
                # Try to find any key containing a list
                for key, value in result.items():
                    if isinstance(value, list) and len(value) > 0:
                        signal_list = value
                        break

            print(f"[Parser] Found {len(signal_list)} signals in response")

            for i, s in enumerate(signal_list):
                try:
                    # Process source_type, ensure it is a valid enum value
                    source_type_str = s.get("source_type", "legislation").lower().replace(" ", "_").replace("-", "_")
                    valid_source_types = ["legislation", "executive_order", "regulatory_guidance", "court_ruling", "hearing_transcript", "draft_bill"]
                    if source_type_str not in valid_source_types:
                        source_type_str = "legislation"
                    
                    signal = RegulatorySignal(
                        id=s.get("id", f"{mission.market}-{mission.domain.value[:2].upper()}-{datetime.now().year}-{i:03d}"),
                        market=mission.market,
                        domain=mission.domain,
                        source_type=SourceType(source_type_str),
                        title=s.get("title", "Unknown"),
                        summary=s.get("summary", ""),
                        source_url=s.get("source_url", ""),
                        published_date=s.get("published_date") or "",
                        effective_date=s.get("effective_date"),
                        key_provisions=s.get("key_provisions", []),
                        affected_policies=[],  # Populated later by impact_analyzer
                        raw_text_excerpt=s.get("excerpt", s.get("raw_text_excerpt", "")),
                        confidence_score=float(s.get("confidence_score", 0.7))
                    )
                    signal = self._enrich_signal_metadata(signal, source_titles)
                    signals.append(signal)
                    print(f"[Parser] ✓ Parsed signal: {signal.title[:50]}...")
                except Exception as e:
                    print(f"[Warning] Failed to parse signal {i}: {e}")
                    print(f"[Warning] Signal data: {s}")

            print(f"[Parser] Successfully extracted {len(signals)} regulatory signals")

        except Exception as e:
            print(f"[Error] Failed to parse search results: {e}")
            import traceback
            traceback.print_exc()
            return self._convert_raw_to_signals(raw_results, mission)

        return signals

    def _convert_raw_to_signals(
        self,
        raw_results: list[dict],
        mission: ScoutMission
    ) -> list[RegulatorySignal]:
        """Convert raw search results to signals (when LLM is unavailable)."""
        signals = []
        for i, result in enumerate(raw_results):
            sources = result.get("sources", [])
            content = result.get("content", "")
            query = result.get("query", "Unknown")
            
            # If sources exist, create a signal for each source
            if sources:
                for j, source in enumerate(sources[:3]):
                    signal = RegulatorySignal(
                        id=f"{mission.market}-{mission.domain.value[:2].upper()}-{datetime.now().year}-{i:03d}-{j}",
                        market=mission.market,
                        domain=mission.domain,
                        source_type=SourceType.LEGISLATION,
                        title=source.get("title", query),
                        summary=content[:500] if content else "",
                        source_url=source.get("url", ""),
                        published_date="",
                        effective_date=None,
                        key_provisions=[],
                        affected_policies=[],
                        raw_text_excerpt=content[:1000] if content else "",
                        confidence_score=0.5
                    )
                    signals.append(signal)
            elif content:
                # If no sources but content exists, still create a signal
                signal = RegulatorySignal(
                    id=f"{mission.market}-{mission.domain.value[:2].upper()}-{datetime.now().year}-{i:03d}",
                    market=mission.market,
                    domain=mission.domain,
                    source_type=SourceType.LEGISLATION,
                    title=query,
                    summary=content[:500],
                    source_url="",
                    published_date="",
                    effective_date=None,
                    key_provisions=[],
                    affected_policies=[],
                    raw_text_excerpt=content[:1000],
                    confidence_score=0.4
                )
                signals.append(signal)
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
                    id=f"{mission.market}-{mission.domain.value[:2].upper()}-LIVE-{i:03d}",
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
