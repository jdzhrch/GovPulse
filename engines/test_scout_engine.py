import json
import unittest
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch

from engines.scout_engine import QueryGenerator, ScoutEngine, Domain, ScoutMission, RegulatorySignal, SourceType


class ScoutEngineLookbackTests(unittest.TestCase):
    def setUp(self):
        self.engine = ScoutEngine()

    def test_execute_mission_filters_outdated_simulated_signals_from_lookback_window(self):
        mission = self.engine.create_mission(
            market="US",
            domain="minor_protection",
            lookback_days=90,
            created_by="test"
        )

        completed = self.engine.execute_mission(mission.mission_id, use_real_search=False)

        self.assertEqual(completed.signals, [])

    def test_execute_mission_records_filter_diagnostics(self):
        mission = self.engine.create_mission(
            market="US",
            domain="minor_protection",
            lookback_days=90,
            created_by="test"
        )

        completed = self.engine.execute_mission(mission.mission_id, use_real_search=False)

        self.assertIsNotNone(completed.diagnostics)
        self.assertGreaterEqual(completed.diagnostics["query_count"], 1)
        self.assertEqual(completed.diagnostics["parsed_signal_count"], 2)
        self.assertEqual(completed.diagnostics["signals_out_of_window"], 2)
        self.assertEqual(completed.diagnostics["signals_kept"], 0)

    @patch("engines.scout_engine.fetch_real_world_data")
    def test_execute_mission_prefers_raw_conversion_before_simulated_fallback(self, fetch_real_world_data_mock):
        mission = self.engine.create_mission(
            market="US",
            domain="minor_protection",
            lookback_days=90,
            created_by="test"
        )
        fetch_real_world_data_mock.return_value = [
            {
                "query": "Recent US minor protection actions",
                "content": "On March 1, 2026, the FTC issued a policy statement on age verification for minors.",
                "sources": [
                    {
                        "title": "FTC Policy Statement on Age Verification",
                        "url": "https://www.ftc.gov/news-events/news/press-releases/2026/03/ftc-policy-statement-age-verification"
                    }
                ],
                "market": "US",
            }
        ]
        self.engine._parse_web_search_results = lambda raw_results, mission: []

        completed = self.engine.execute_mission(mission.mission_id, use_real_search=True)

        self.assertEqual(len(completed.signals), 1)
        self.assertEqual(completed.signals[0].published_date, "2026-03-01")
        self.assertTrue(completed.signals[0].id.startswith("US-MP-"))
        self.assertTrue(completed.diagnostics["used_raw_result_fallback"])
        self.assertFalse(completed.diagnostics["used_simulated_fallback"])

    def test_get_simulated_signals_preserves_original_metadata(self):
        mission = ScoutMission(
            mission_id="MISSION-TEST",
            market="US",
            domain=Domain.MINOR_PROTECTION,
            lookback_days=3650,
            created_at=datetime.now().isoformat(),
            created_by="test",
            status="pending",
            signals=[],
            generated_queries=[]
        )

        signals = self.engine._get_simulated_signals(mission)

        self.assertGreater(len(signals), 0)
        self.assertEqual(signals[0].id, "US-MP-2024-001")
        self.assertEqual(signals[0].published_date, "2024-07-30")

    def test_convert_raw_to_signals_extracts_published_date_and_domain_abbreviation(self):
        mission = self.engine.create_mission(
            market="US",
            domain="minor_protection",
            lookback_days=90,
            created_by="test"
        )

        signals = self.engine._convert_raw_to_signals(
            [
                {
                    "query": "Recent US minor protection actions",
                    "content": "On March 1, 2026, the FTC issued a policy statement on age verification for minors.",
                    "sources": [
                        {
                            "title": "FTC Policy Statement on Age Verification",
                            "url": "https://www.ftc.gov/news-events/news/press-releases/2026/03/ftc-policy-statement-age-verification"
                        }
                    ],
                }
            ],
            mission,
        )

        self.assertEqual(len(signals), 1)
        self.assertEqual(signals[0].published_date, "2026-03-01")
        self.assertTrue(signals[0].id.startswith("US-MP-"))

    def test_placeholder_congress_bill_titles_are_enriched_from_source_url(self):
        signal = RegulatorySignal(
            id="US-MP-TEST-001",
            market="US",
            domain=Domain.MINOR_PROTECTION,
            source_type=SourceType.DRAFT_BILL,
            title="H.R. 10364 – [Title Not Specified]",
            summary="",
            source_url="https://www.congress.gov/118/bills/hr10364/BILLS-118hr10364ih.pdf?utm_source=openai",
            published_date="2024-12-11",
            effective_date=None,
            key_provisions=[],
            affected_policies=[],
            raw_text_excerpt="",
            confidence_score=0.8,
        )

        self.engine._fetch_page_title = lambda url: "H.R.10364 - App Store Accountability Act 118th Congress (2023-2024)"

        enriched = self.engine._enrich_signal_metadata(signal, {})

        self.assertEqual(enriched.title, "App Store Accountability Act")
        self.assertEqual(
            enriched.source_url,
            "https://www.congress.gov/bill/118th-congress/house-bill/10364"
        )


class QueryGeneratorTests(unittest.TestCase):
    def test_generate_queries_replaces_stale_llm_date_constraints_with_absolute_window(self):
        generator = QueryGenerator()
        stale_queries = {
            "queries": [
                'site:congress.gov "minor protection" AND ("2023")',
                'site:ftc.gov "children safety" AND date:[2023-09-15 TO 2023-10-15]',
                'site:justice.gov "age verification" AND ("2023")',
                'site:whitehouse.gov "parental control" AND date:[NOW-90DAYS TO NOW]',
                'site:fcc.gov "youth protection" AND ("2023")',
            ]
        }
        response = SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content=json.dumps(stale_queries))
                )
            ]
        )
        generator.client = SimpleNamespace(
            chat=SimpleNamespace(
                completions=SimpleNamespace(create=lambda **kwargs: response)
            )
        )

        queries = generator.generate_queries("US", Domain.MINOR_PROTECTION, 90)
        window_end = datetime.now().date().isoformat()
        window_start = (datetime.now() - timedelta(days=90)).date().isoformat()

        self.assertEqual(len(queries), 5)
        self.assertTrue(all("2023" not in query for query in queries))
        self.assertTrue(all(window_start in query and window_end in query for query in queries))

    def test_fallback_queries_for_all_domain_cover_each_policy_area(self):
        generator = QueryGenerator()

        queries = generator._fallback_queries("US", Domain.ALL, 365)
        normalized = " ".join(queries).lower()

        self.assertEqual(len(queries), 5)
        self.assertTrue("children" in normalized or "minor" in normalized)
        self.assertTrue("e-commerce" in normalized or "marketplace" in normalized)
        self.assertIn("data", normalized)
        self.assertTrue("content moderation" in normalized or "illegal content" in normalized)


if __name__ == "__main__":
    unittest.main()
