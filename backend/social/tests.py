from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import PostsVisibility, Profile
from social.models import Comment, Follow, Post, PostKind

User = get_user_model()


class ProfilePrivacyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="private_user", email="private@test.local", password="pass12345"
        )
        self.viewer = User.objects.create_user(
            username="viewer", email="viewer@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.owner).update(is_private=True)
        self.owner.profile.refresh_from_db()
        self.post = Post.objects.create(author=self.owner, body="Secret post", is_delvers=True)

    def test_stranger_cannot_see_private_user_posts(self):
        res = self.client.get("/api/social/users/private_user/posts/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, [])

    def test_follower_can_see_private_user_posts(self):
        Follow.objects.create(follower=self.viewer, following=self.owner)
        self.client.force_authenticate(user=self.viewer)
        res = self.client.get("/api/social/users/private_user/posts/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["body"], "Secret post")

    def test_owner_always_sees_own_posts(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/social/users/private_user/posts/")
        self.assertEqual(len(res.data), 1)

    def test_only_me_posts_hidden_from_everyone_else(self):
        Profile.objects.filter(user=self.owner).update(
            is_private=False,
            posts_visibility=PostsVisibility.PRIVATE,
        )
        self.owner.profile.refresh_from_db()
        Follow.objects.create(follower=self.viewer, following=self.owner)
        self.client.force_authenticate(user=self.viewer)
        res = self.client.get("/api/social/users/private_user/posts/")
        self.assertEqual(res.data, [])

    def test_private_posts_excluded_from_delvers_feed(self):
        res = self.client.get("/api/social/delvers/")
        self.assertEqual(res.status_code, 200)
        bodies = [p["body"] for p in res.data if isinstance(p, dict) and "body" in p]
        self.assertNotIn("Secret post", bodies)

    def test_private_posts_visible_in_feed_after_follow(self):
        Follow.objects.create(follower=self.viewer, following=self.owner)
        self.client.force_authenticate(user=self.viewer)
        res = self.client.get("/api/social/delvers/")
        bodies = [p["body"] for p in res.data if isinstance(p, dict) and "body" in p]
        self.assertIn("Secret post", bodies)

    def test_post_detail_hidden_for_private_author(self):
        res = self.client.get(f"/api/social/posts/{self.post.pk}/")
        self.assertEqual(res.status_code, 404)

    def test_follower_can_retrieve_private_author_post(self):
        Follow.objects.create(follower=self.viewer, following=self.owner)
        self.client.force_authenticate(user=self.viewer)
        res = self.client.get(f"/api/social/posts/{self.post.pk}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["body"], "Secret post")

    def test_hidden_post_retrieve_returns_404(self):
        self.post.is_hidden = True
        self.post.save(update_fields=["is_hidden"])
        Follow.objects.create(follower=self.viewer, following=self.owner)
        self.client.force_authenticate(user=self.viewer)
        res = self.client.get(f"/api/social/posts/{self.post.pk}/")
        self.assertEqual(res.status_code, 404)


class PostRetrieveTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(
            username="post_author", email="author@test.local", password="pass12345"
        )
        self.post = Post.objects.create(
            author=self.author,
            body="Public Delvers moment",
            is_delvers=True,
            region="Khomas",
        )

    def test_public_post_retrieve(self):
        res = self.client.get(f"/api/social/posts/{self.post.pk}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["body"], "Public Delvers moment")
        self.assertTrue(res.data["is_delvers"])


class PostSimilarTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(
            username="similar_author", email="similar@test.local", password="pass12345"
        )
        self.other = User.objects.create_user(
            username="similar_other", email="other@test.local", password="pass12345"
        )
        self.source = Post.objects.create(
            author=self.author,
            body="Source board post",
            is_delvers=True,
            delvers_board="Routes",
            region="Khomas",
        )
        self.same_board = Post.objects.create(
            author=self.other,
            body="Same board sibling",
            is_delvers=True,
            delvers_board="Routes",
            region="Erongo",
        )
        self.same_author = Post.objects.create(
            author=self.author,
            body="Author sibling",
            is_delvers=True,
            delvers_board="Tips",
            region="Khomas",
        )

    def test_similar_excludes_source_and_returns_related(self):
        res = self.client.get(f"/api/social/posts/{self.source.pk}/similar/")
        self.assertEqual(res.status_code, 200)
        ids = [row["id"] for row in res.data]
        self.assertNotIn(self.source.pk, ids)
        self.assertIn(self.same_board.pk, ids)
        self.assertIn(self.same_author.pk, ids)

    def test_similar_hidden_post_not_found(self):
        hidden = Post.objects.create(
            author=self.author,
            body="Hidden",
            is_delvers=True,
            is_hidden=True,
        )
        res = self.client.get(f"/api/social/posts/{hidden.pk}/similar/")
        self.assertEqual(res.status_code, 404)


class PostPermalinkSmokeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(
            username="permalink_user", email="permalink@test.local", password="pass12345"
        )
        self.post = Post.objects.create(
            author=self.author,
            body="Permalink smoke post",
            is_delvers=True,
            region="Khomas",
        )

    def test_delvers_post_retrievable_by_id(self):
        feed = self.client.get("/api/social/delvers/")
        self.assertEqual(feed.status_code, 200)
        bodies = [p["body"] for p in feed.data if isinstance(p, dict) and "body" in p]
        self.assertIn("Permalink smoke post", bodies)

        detail = self.client.get(f"/api/social/posts/{self.post.pk}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["id"], self.post.pk)
        self.assertEqual(detail.data["author"]["username"], "permalink_user")


class PublicProfileStatsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="stats_user", email="stats@test.local", password="pass12345"
        )
        self.follower = User.objects.create_user(
            username="fan", email="fan@test.local", password="pass12345"
        )
        Post.objects.create(author=self.user, body="One")
        Post.objects.create(author=self.user, body="Two", is_delvers=True)
        Follow.objects.create(follower=self.follower, following=self.user)

    def test_public_profile_includes_stats_and_relationship(self):
        self.client.force_authenticate(user=self.follower)
        res = self.client.get("/api/accounts/users/stats_user/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["stats"]["posts_count"], 2)
        self.assertEqual(res.data["stats"]["followers_count"], 1)
        self.assertEqual(res.data["stats"]["following_count"], 0)
        self.assertTrue(res.data["relationship"]["is_following"])
        self.assertTrue(res.data["relationship"]["can_view_posts"])


class FollowApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = User.objects.create_user(
            username="alice", email="alice@test.local", password="pass12345"
        )
        self.bob = User.objects.create_user(
            username="bob", email="bob@test.local", password="pass12345"
        )

    def test_follow_toggle_updates_counts(self):
        self.client.force_authenticate(user=self.alice)
        res = self.client.post("/api/social/users/bob/follow/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["following"])
        self.assertEqual(res.data["followers_count"], 1)
        self.assertTrue(Follow.objects.filter(follower=self.alice, following=self.bob).exists())

        unfollow = self.client.post("/api/social/users/bob/follow/")
        self.assertFalse(unfollow.data["following"])
        self.assertEqual(unfollow.data["followers_count"], 0)

    def test_cannot_follow_self(self):
        self.client.force_authenticate(user=self.alice)
        res = self.client.post("/api/social/users/alice/follow/")
        self.assertEqual(res.status_code, 400)

    def test_followers_and_following_lists(self):
        Follow.objects.create(follower=self.alice, following=self.bob)
        res = self.client.get("/api/social/users/bob/followers/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["username"], "alice")

        res2 = self.client.get("/api/social/users/alice/following/")
        self.assertEqual(len(res2.data), 1)
        self.assertEqual(res2.data[0]["username"], "bob")


class SavedPostsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="saver", email="saver@test.local", password="pass12345"
        )
        self.other = User.objects.create_user(
            username="other", email="other@test.local", password="pass12345"
        )
        author = User.objects.create_user(
            username="author", email="author@test.local", password="pass12345"
        )
        self.post = Post.objects.create(author=author, body="Saved target", is_delvers=True)

    def test_saved_by_returns_own_saved_posts(self):
        self.client.force_authenticate(user=self.owner)
        self.client.post(f"/api/social/posts/{self.post.pk}/save/")
        res = self.client.get("/api/social/posts/?saved_by=saver")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["id"], self.post.pk)

    def test_saved_by_forbidden_for_other_users(self):
        self.client.force_authenticate(user=self.other)
        res = self.client.get("/api/social/posts/?saved_by=saver")
        self.assertEqual(res.status_code, 403)


class ProfileUpdateHardeningTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="normal_user", email="normal@test.local", password="pass12345"
        )
        self.client.force_authenticate(user=self.user)

    def test_user_type_not_self_editable(self):
        res = self.client.patch(
            "/api/accounts/me/update/",
            {"user_type": "service_provider"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.user_type, "normal")


class MessagingPrivacyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.sender = User.objects.create_user(
            username="sender", email="sender@test.local", password="pass12345"
        )
        self.recipient = User.objects.create_user(
            username="recipient", email="recipient@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.recipient).update(allow_messages=False)
        self.recipient.profile.refresh_from_db()

    def test_start_conversation_blocked_when_messages_disabled(self):
        self.client.force_authenticate(user=self.sender)
        res = self.client.post(
            "/api/messaging/start/",
            {"user_id": self.recipient.pk},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_start_conversation_allowed_when_messages_enabled(self):
        Profile.objects.filter(user=self.recipient).update(allow_messages=True)
        self.client.force_authenticate(user=self.sender)
        res = self.client.post(
            "/api/messaging/start/",
            {"user_id": self.recipient.pk},
            format="json",
        )
        self.assertEqual(res.status_code, 200)


class PostCreateAndFeedRoutingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(
            username="poster", email="poster@test.local", password="pass12345"
        )
        self.client.force_authenticate(user=self.author)

    def test_create_post_returns_author_payload(self):
        res = self.client.post(
            "/api/social/posts/",
            {"body": "Hello Namibia", "region": "Khomas", "is_delvers": True},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["author"]["username"], "poster")
        self.assertEqual(res.data["body"], "Hello Namibia")
        self.assertTrue(res.data["is_delvers"])

    def test_delvers_post_appears_in_delvers_feed_not_home_feed(self):
        Post.objects.create(author=self.author, body="Delvers only", is_delvers=True, region="Khomas")
        Post.objects.create(author=self.author, body="Home feed", is_delvers=False, region="Khomas")

        delvers = self.client.get("/api/social/delvers/")
        feed = self.client.get("/api/social/feed/")

        self.assertEqual(delvers.status_code, 200)
        self.assertEqual(feed.status_code, 200)
        delvers_bodies = [p["body"] for p in delvers.data if isinstance(p, dict) and "body" in p]
        feed_bodies = [p["body"] for p in feed.data if isinstance(p, dict) and "body" in p]
        self.assertIn("Delvers only", delvers_bodies)
        self.assertNotIn("Delvers only", feed_bodies)
        self.assertIn("Home feed", feed_bodies)
        self.assertNotIn("Home feed", delvers_bodies)

    def test_created_post_appears_on_author_profile(self):
        res = self.client.post(
            "/api/social/posts/",
            {"body": "Profile visible", "region": "Erongo", "is_delvers": False},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        posts = self.client.get("/api/social/users/poster/posts/")
        self.assertEqual(posts.status_code, 200)
        self.assertEqual(len(posts.data), 1)
        self.assertEqual(posts.data[0]["body"], "Profile visible")

    def test_community_post_appears_in_feed_not_delvers(self):
        res = self.client.post(
            "/api/social/posts/",
            {"body": "SIM card tip for Sunday", "region": "Khomas", "is_delvers": False},
            format="json",
        )
        self.assertEqual(res.status_code, 201)

        feed = self.client.get("/api/social/feed/")
        delvers = self.client.get("/api/social/delvers/")

        feed_bodies = [p["body"] for p in feed.data if isinstance(p, dict) and "body" in p]
        delvers_bodies = [p["body"] for p in delvers.data if isinstance(p, dict) and "body" in p]
        self.assertIn("SIM card tip for Sunday", feed_bodies)
        self.assertNotIn("SIM card tip for Sunday", delvers_bodies)


class AskLocalsQuestionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(
            username="ask_local", email="ask@test.local", password="pass12345"
        )
        self.client.force_authenticate(user=self.author)

    def test_question_appears_in_feed_kind_filter(self):
        res = self.client.post(
            "/api/social/posts/",
            {
                "body": "Where can I get a SIM in Windhoek on Sunday?",
                "region": "Khomas",
                "place_label": "Windhoek, Namibia",
                "post_kind": "question",
                "is_delvers": False,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["post_kind"], "question")

        feed = self.client.get("/api/social/feed/?kind=question")
        bodies = [p["body"] for p in feed.data if isinstance(p, dict) and "body" in p]
        self.assertIn("Where can I get a SIM in Windhoek on Sunday?", bodies)

        tips = self.client.get("/api/social/feed/?kind=tip")
        tip_bodies = [p["body"] for p in tips.data if isinstance(p, dict) and "body" in p]
        self.assertNotIn("Where can I get a SIM in Windhoek on Sunday?", tip_bodies)

        delvers = self.client.get("/api/social/delvers/")
        delvers_bodies = [p["body"] for p in delvers.data if isinstance(p, dict) and "body" in p]
        self.assertNotIn("Where can I get a SIM in Windhoek on Sunday?", delvers_bodies)

    def test_question_cannot_be_delvers(self):
        res = self.client.post(
            "/api/social/posts/",
            {
                "body": "Bad question",
                "region": "Khomas",
                "post_kind": "question",
                "is_delvers": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)


class AskLocalsPhase3Tests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.asker = User.objects.create_user(
            username="asker", email="asker@test.local", password="pass12345"
        )
        self.local = User.objects.create_user(
            username="local_helper", email="local@test.local", password="pass12345"
        )
        self.question = Post.objects.create(
            author=self.asker,
            body="Best place for Sunday SIM cards in Windhoek?",
            region="Khomas",
            place_label="Windhoek",
            post_kind=PostKind.QUESTION,
            is_delvers=False,
        )
        self.answer = Comment.objects.create(
            post=self.question,
            author=self.local,
            body="Try the kiosk at Grove Mall before 1pm.",
        )

    def test_accept_answer_and_helpful_vote(self):
        self.client.force_authenticate(user=self.asker)
        res = self.client.post(f"/api/social/comments/{self.answer.pk}/accept/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["accepted"])
        self.answer.refresh_from_db()
        self.assertTrue(self.answer.is_accepted_answer)

        self.client.force_authenticate(user=self.asker)
        helpful = self.client.post(f"/api/social/comments/{self.answer.pk}/helpful/")
        self.assertEqual(helpful.status_code, 200)
        self.assertTrue(helpful.data["marked_helpful"])
        self.assertEqual(helpful.data["helpful_count"], 1)

        comments = self.client.get(f"/api/social/posts/{self.question.pk}/comments/")
        self.assertEqual(comments.status_code, 200)
        self.assertTrue(comments.data[0]["is_accepted_answer"])
        self.assertEqual(comments.data[0]["helpful_count"], 1)

        detail = self.client.get(f"/api/social/posts/{self.question.pk}/")
        self.assertEqual(detail.status_code, 200)
        self.assertIsNotNone(detail.data.get("accepted_answer"))
        self.assertIn("Grove Mall", detail.data["accepted_answer"]["body"])

    def test_search_questions_bucket(self):
        res = self.client.get("/api/search/?q=sim")
        self.assertEqual(res.status_code, 200)
        bodies = [q["body"] for q in res.data["questions"]]
        self.assertIn("Best place for Sunday SIM cards in Windhoek?", bodies)

    def test_share_accepted_answer_to_delvers(self):
        self.answer.is_accepted_answer = True
        self.answer.save(update_fields=["is_accepted_answer"])
        self.client.force_authenticate(user=self.asker)
        res = self.client.post(f"/api/social/posts/{self.question.pk}/share-answer-to-delvers/")
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data["is_delvers"])
        self.assertIn("Grove Mall", res.data["body"])


class PostVideoUploadValidationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(
            username="videouser", email="video@test.local", password="pass12345"
        )
        self.client.force_authenticate(user=self.author)

    def test_rejects_unsupported_video_extension(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        video = SimpleUploadedFile("clip.avi", b"fake", content_type="video/x-msvideo")
        res = self.client.post(
            "/api/social/posts/",
            {
                "body": "Video post",
                "region": "Khomas",
                "is_delvers": False,
                "video": video,
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("video", res.data)

    def test_rejects_oversize_video(self):
        from unittest.mock import MagicMock

        from social.video_validation import POST_VIDEO_MAX_BYTES, validate_post_video_file

        video = MagicMock()
        video.name = "clip.mp4"
        video.size = POST_VIDEO_MAX_BYTES + 1

        with self.assertRaises(Exception) as ctx:
            validate_post_video_file(video)
        self.assertIn("MB", str(ctx.exception))

    def test_accepts_small_mp4_upload(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        video = SimpleUploadedFile("clip.mp4", b"fake-mp4", content_type="video/mp4")
        res = self.client.post(
            "/api/social/posts/",
            {
                "body": "Short clip",
                "region": "Khomas",
                "is_delvers": False,
                "video": video,
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data["video"])

    def test_rejects_audio_upload_on_create(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        audio = SimpleUploadedFile("track.mp3", b"fake-mp3", content_type="audio/mpeg")
        res = self.client.post(
            "/api/social/posts/",
            {
                "body": "With audio",
                "region": "Khomas",
                "is_delvers": False,
                "audio": audio,
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Audio uploads are not allowed", str(res.data))


class PostPlaceLinkTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.host = User.objects.create_user(
            username="place_host", email="place_host@test.local", password="pass12345"
        )
        from accounts.models import UserType
        from accommodation.models import AccommodationListing

        Profile.objects.filter(user=self.host).update(user_type=UserType.SERVICE_PROVIDER)
        self.traveler = User.objects.create_user(
            username="place_traveler", email="place_traveler@test.local", password="pass12345"
        )
        self.listing = AccommodationListing.objects.create(
            owner=self.host,
            title="Dune Camp",
            region="Hardap",
            city="Sesriem",
            price_per_night="950.00",
        )
        from events_app.models import Event

        self.event = Event.objects.create(
            organizer=self.host,
            title="Desert Night Market",
            description="Local makers and food.",
            category="other",
            region="Khomas",
            city="Windhoek",
            starts_at="2026-08-15T18:00:00+00:00",
            is_published=True,
        )

    def test_traveler_can_link_delvers_post_to_stay(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            "/api/social/posts/",
            {
                "body": "Sunset at camp",
                "region": "Hardap",
                "is_delvers": True,
                "listing": self.listing.pk,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data["is_delvers"])
        self.assertEqual(res.data["listing"]["id"], self.listing.pk)

        moments = self.client.get(f"/api/accommodation/listings/{self.listing.pk}/moments/")
        self.assertEqual(moments.status_code, 200)
        self.assertEqual(len(moments.data), 1)
        self.assertEqual(moments.data[0]["body"], "Sunset at camp")

    def test_host_cannot_link_story_to_other_listing(self):
        from accounts.models import UserType
        from accommodation.models import AccommodationListing

        other = User.objects.create_user(
            username="other_host", email="other_host@test.local", password="pass12345"
        )
        Profile.objects.filter(user=other).update(user_type=UserType.SERVICE_PROVIDER)
        other_listing = AccommodationListing.objects.create(
            owner=other,
            title="Other Lodge",
            region="Erongo",
            city="Swakopmund",
            price_per_night="700.00",
        )
        self.client.force_authenticate(user=self.host)
        res = self.client.post(
            "/api/social/posts/",
            {
                "body": "Our pool",
                "region": "Hardap",
                "is_accommodation_story": True,
                "listing": other_listing.pk,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_delvers_post_with_event_appears_on_event_moments(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            "/api/social/posts/",
            {
                "body": "Great crowd tonight",
                "region": "Khomas",
                "is_delvers": True,
                "event": self.event.pk,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["event"]["id"], self.event.pk)

        moments = self.client.get(f"/api/events/{self.event.pk}/moments/")
        self.assertEqual(moments.status_code, 200)
        self.assertEqual(len(moments.data), 1)
        self.assertEqual(moments.data[0]["body"], "Great crowd tonight")

    def test_cannot_link_both_stay_and_event(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            "/api/social/posts/",
            {
                "body": "Too many links",
                "region": "Khomas",
                "is_delvers": True,
                "listing": self.listing.pk,
                "event": self.event.pk,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)
