from django.core.cache import cache
from django.test.runner import DiscoverRunner


class CacheClearingDiscoverRunner(DiscoverRunner):
    """Clear throttle/typing cache between tests so PK reuse does not leak state."""

    def run_test(self, test):
        cache.clear()
        return super().run_test(test)
