from datetime import timedelta

from django.utils import timezone

DELVERS_HIGHLIGHT_TTL = timedelta(hours=24)


def delvers_highlight_cutoff():
    """Highlights older than this moment are hidden from Delvers story rings."""
    return timezone.now() - DELVERS_HIGHLIGHT_TTL
