from datetime import timedelta

from django.utils import timezone

DELVERS_HIGHLIGHT_TTL = timedelta(hours=24)


def delvers_highlight_cutoff():
    """Cutoff for ephemeral hashtag rings — creator highlight boards persist."""
    return timezone.now() - DELVERS_HIGHLIGHT_TTL
