from datetime import timedelta

from django.test import SimpleTestCase
from django.utils import timezone

from social.delvers_highlights import DELVERS_HIGHLIGHT_TTL, delvers_highlight_cutoff


class DelversHighlightTtlTests(SimpleTestCase):
    def test_ttl_is_24_hours(self):
        self.assertEqual(DELVERS_HIGHLIGHT_TTL, timedelta(hours=24))

    def test_cutoff_is_24_hours_ago(self):
        before = timezone.now()
        cutoff = delvers_highlight_cutoff()
        after = timezone.now()
        self.assertGreaterEqual(cutoff, before - DELVERS_HIGHLIGHT_TTL - timedelta(seconds=1))
        self.assertLessEqual(cutoff, after - DELVERS_HIGHLIGHT_TTL + timedelta(seconds=1))
