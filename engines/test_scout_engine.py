import unittest
from datetime import datetime

from engines.scout_engine import ScoutEngine, Domain, ScoutMission, RegulatorySignal, SourceType


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


if __name__ == "__main__":
    unittest.main()
