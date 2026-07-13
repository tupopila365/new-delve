from datetime import timedelta

from django.utils import timezone

DELVERS_HIGHLIGHT_TTL = timedelta(hours=24)


def delvers_highlight_cutoff():
    """Cutoff for ephemeral discovery rings (hashtag / region highlights).

    Highlights from creators the viewer follows are NOT subject to this cutoff —
    they persist so you always see the stories of people you follow. Only
    anonymous region/hashtag discovery is time-boxed to the last 24 hours.
    """
    return timezone.now() - DELVERS_HIGHLIGHT_TTL
