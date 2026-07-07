from django.db.models.signals import post_save
from django.dispatch import receiver

from social.models import Post

from .services import sync_post_tags


@receiver(post_save, sender=Post)
def index_post_hashtags(sender, instance: Post, **kwargs):
    sync_post_tags(instance)
