from django.contrib.auth import get_user_model
from django.test import TestCase

from social.models import Post, PostKind
from tags.models import Tag, TaggedItem
from tags.services import (
    MAX_TAGS_PER_CONTENT,
    extract_hashtags_from_text,
    filter_posts_by_tag,
    normalize_tag,
    sync_post_tags,
)
from tags.models import TagScope

User = get_user_model()


class TagServiceTests(TestCase):
    def test_normalize_best_time_style(self):
        self.assertEqual(normalize_tag("BestTime"), "besttime")
        self.assertEqual(normalize_tag("FOOD"), "food")

    def test_extract_dedupes_and_orders(self):
        slugs = extract_hashtags_from_text("Love #Food and #food with #Parking")
        self.assertEqual(slugs, ["food", "parking"])

    def test_sync_caps_at_five_and_skips_blocked(self):
        user = User.objects.create_user(username="tagger", password="pass12345")
        Tag.objects.create(slug="blocked", is_blocked=True)
        body = " ".join(f"#{name}" for name in ["a", "b", "c", "d", "e", "f", "blocked"])
        post = Post.objects.create(
            author=user,
            body=body,
            post_kind=PostKind.QUESTION,
            place_label="Windhoek",
        )
        slugs = sync_post_tags(post)
        self.assertEqual(len(slugs), MAX_TAGS_PER_CONTENT)
        self.assertNotIn("blocked", slugs)
        self.assertEqual(
            TaggedItem.objects.filter(object_id=post.pk).count(),
            MAX_TAGS_PER_CONTENT,
        )

    def test_blocked_tag_not_indexed(self):
        user = User.objects.create_user(username="tagger2", password="pass12345")
        Tag.objects.create(slug="spam", is_blocked=True)
        post = Post.objects.create(author=user, body="Help #spam", post_kind=PostKind.TIP)
        slugs = sync_post_tags(post)
        self.assertEqual(slugs, [])
        self.assertEqual(TaggedItem.objects.filter(object_id=post.pk).count(), 0)

    def test_filter_posts_by_tag(self):
        user = User.objects.create_user(username="tagger3", password="pass12345")
        tagged = Post.objects.create(author=user, body="Try #food here", post_kind=PostKind.TIP)
        Post.objects.create(author=user, body="No tags", post_kind=PostKind.TIP)
        sync_post_tags(tagged)
        qs = filter_posts_by_tag(Post.objects.all(), "food", scope=TagScope.COMMUNITY)
        self.assertEqual(list(qs.values_list("id", flat=True)), [tagged.id])

    def test_tag_detail_api(self):
        user = User.objects.create_user(username="tagger4", password="pass12345")
        post = Post.objects.create(author=user, body="Great #parking spot", post_kind=PostKind.TIP)
        sync_post_tags(post)
        client = self.client
        response = client.get("/api/tags/parking/?scope=community")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["slug"], "parking")
        self.assertEqual(payload["post_count"], 1)

        blocked = Tag.objects.create(slug="hidden", is_blocked=True)
        TaggedItem.objects.filter(tag=blocked).delete()
        response = client.get("/api/tags/hidden/")
        self.assertEqual(response.status_code, 404)
