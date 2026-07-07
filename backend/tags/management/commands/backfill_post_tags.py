from django.core.management.base import BaseCommand

from social.models import Post
from tags.services import sync_post_tags


class Command(BaseCommand):
    help = "Index hashtags for existing posts into the tags app."

    def handle(self, *args, **options):
        total = 0
        for post in Post.objects.iterator():
            sync_post_tags(post)
            total += 1
        self.stdout.write(self.style.SUCCESS(f"Indexed tags for {total} posts."))
