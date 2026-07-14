from django.core.management.base import BaseCommand

from social.video_bake_jobs import bake_pending


class Command(BaseCommand):
    help = "Bake pending (and optionally failed) social video effects off the request path."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=20,
            help="Max video rows to process in this run (default 20).",
        )
        parser.add_argument(
            "--retry-failed",
            action="store_true",
            help="Also retry rows marked failed.",
        )

    def handle(self, *args, **options):
        done = bake_pending(limit=options["limit"], retry_failed=options["retry_failed"])
        self.stdout.write(self.style.SUCCESS(f"Baked {done} video(s)."))
