"""Phase 6 — authorization hardening smoke tests."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import BusinessMembership, BusinessProfile, BusinessTeamRole, Profile, UserType
from messaging.models import Conversation
from social.models import Follow

User = get_user_model()


class PublicProfilePrivacyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.private_user = User.objects.create_user(
            username="hidden_user", email="hidden@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.private_user).update(
            is_private=True,
            bio="Secret bio",
            region="Khomas",
            city="Windhoek",
        )
        BusinessProfile.objects.create(
            owner=self.private_user,
            slug="hidden-biz",
            business_name="Hidden Biz",
            business_types=["accommodation"],
        )

    def test_anonymous_sees_minimal_profile(self):
        res = self.client.get("/api/accounts/users/hidden_user/")
        self.assertEqual(res.status_code, 200)
        self.assertNotIn("bio", res.data)
        self.assertNotIn("stats", res.data)
        self.assertNotIn("owned_businesses", res.data)
        self.assertFalse(res.data["relationship"]["can_view_posts"])

    def test_followers_hidden_without_access(self):
        res = self.client.get("/api/social/users/hidden_user/followers/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, [])

    def test_followers_visible_after_follow(self):
        viewer = User.objects.create_user(username="viewer", email="v@test.local", password="pass12345")
        Follow.objects.create(follower=viewer, following=self.private_user)
        self.client.force_authenticate(user=viewer)
        res = self.client.get("/api/social/users/hidden_user/followers/")
        self.assertEqual(res.status_code, 200)


class EventCreatePermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.traveler = User.objects.create_user(
            username="trav", email="trav@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.traveler).update(user_type=UserType.NORMAL)

    def test_traveler_cannot_create_event(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(
            "/api/events/",
            {
                "title": "Sneaky gig",
                "category": "music",
                "starts_at": "2026-12-01T18:00:00Z",
                "region": "Khomas",
                "is_published": True,
                "is_free": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 403)


class MessagingReplyPrivacyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.sender = User.objects.create_user(
            username="sender", email="sender@test.local", password="pass12345"
        )
        self.recipient = User.objects.create_user(
            username="recipient", email="recipient@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.recipient).update(allow_messages=True)
        self.conv = Conversation.objects.create()
        self.conv.participants.add(self.sender.id, self.recipient.id)

    def test_reply_blocked_when_messages_disabled(self):
        Profile.objects.filter(user=self.recipient).update(allow_messages=False)
        self.client.force_authenticate(user=self.sender)
        res = self.client.post(
            f"/api/messaging/conversations/{self.conv.pk}/messages/",
            {"body": "Hello again"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)


class PromotionListingManagerTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="biz_owner", email="owner@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.owner).update(user_type=UserType.SERVICE_PROVIDER)
        self.business = BusinessProfile.objects.create(
            owner=self.owner,
            slug="promo-biz",
            business_name="Promo Biz",
            business_types=["accommodation"],
        )
        self.viewer = User.objects.create_user(
            username="viewer", email="viewer@test.local", password="pass12345"
        )
        BusinessMembership.objects.create(
            business=self.business,
            user=self.viewer,
            role=BusinessTeamRole.VIEWER,
        )

    def test_viewer_cannot_purchase_promotion(self):
        self.client.force_authenticate(user=self.viewer)
        res = self.client.post(
            "/api/promotions/purchase/",
            {
                "product_id": 1,
                "target_type": "accommodation",
                "target_id": "1",
                "target_label": "Test",
                "starts_at": "2026-12-01T09:00:00Z",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 403)
