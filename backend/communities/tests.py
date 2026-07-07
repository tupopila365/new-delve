from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Profile

from .models import CommunityGroup, GroupMembership, GroupMessage, GroupVisibility, MembershipStatus

User = get_user_model()


class CommunityGroupMessagingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.alice = User.objects.create_user(
            username="alice_grp", email="alice_grp@test.local", password="pass12345"
        )
        self.bob = User.objects.create_user(
            username="bob_grp", email="bob_grp@test.local", password="pass12345"
        )
        self.carol = User.objects.create_user(
            username="carol_grp", email="carol_grp@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.alice).update(display_name="Alice", allow_messages=True)
        Profile.objects.filter(user=self.bob).update(display_name="Bob", allow_messages=True)
        Profile.objects.filter(user=self.carol).update(display_name="Carol", allow_messages=True)

        self.public_group = CommunityGroup.objects.create(
            slug="windhoek-tips",
            name="Windhoek tips",
            description="Public test group",
            topic="general",
            visibility=GroupVisibility.PUBLIC,
            created_by=self.alice,
        )
        GroupMembership.objects.create(
            group=self.public_group,
            user=self.alice,
            status=MembershipStatus.ACTIVE,
            role="admin",
        )

        self.private_group = CommunityGroup.objects.create(
            slug="private-beta",
            name="Private beta",
            description="Private test group",
            topic="general",
            visibility=GroupVisibility.PRIVATE,
            created_by=self.alice,
        )
        GroupMembership.objects.create(
            group=self.private_group,
            user=self.alice,
            status=MembershipStatus.ACTIVE,
            role="admin",
        )

    def test_public_group_messages_require_membership(self):
        res = self.client.get(f"/api/communities/groups/{self.public_group.slug}/messages/")
        self.assertEqual(res.status_code, 403)

        self.client.force_authenticate(user=self.bob)
        join = self.client.post(f"/api/communities/groups/{self.public_group.slug}/join/")
        self.assertEqual(join.status_code, 201)
        self.assertTrue(join.data["joined"])

        send = self.client.post(
            f"/api/communities/groups/{self.public_group.slug}/messages/",
            {"body": "Hello group"},
            format="json",
        )
        self.assertEqual(send.status_code, 201)

        read = self.client.get(f"/api/communities/groups/{self.public_group.slug}/messages/")
        self.assertEqual(read.status_code, 200)
        self.assertEqual(len(read.data["results"]), 1)
        self.assertEqual(read.data["results"][0]["body"], "Hello group")

    def test_private_group_join_pending_and_admin_review(self):
        self.client.force_authenticate(user=self.bob)
        join = self.client.post(f"/api/communities/groups/{self.private_group.slug}/join/")
        self.assertEqual(join.status_code, 201)
        self.assertFalse(join.data["joined"])
        self.assertTrue(join.data["pending_request"])

        self.client.force_authenticate(user=self.bob)
        blocked = self.client.get(f"/api/communities/groups/{self.private_group.slug}/messages/")
        self.assertEqual(blocked.status_code, 403)

        self.client.force_authenticate(user=self.alice)
        pending = self.client.get(f"/api/communities/groups/{self.private_group.slug}/members/pending/")
        self.assertEqual(pending.status_code, 200)
        self.assertEqual(len(pending.data), 1)
        self.assertEqual(pending.data[0]["user"]["username"], "bob_grp")

        approve = self.client.post(
            f"/api/communities/groups/{self.private_group.slug}/members/review/",
            {"user_id": self.bob.id, "action": "approve"},
            format="json",
        )
        self.assertEqual(approve.status_code, 200)
        self.assertTrue(approve.data["joined"])

        self.client.force_authenticate(user=self.bob)
        read = self.client.get(f"/api/communities/groups/{self.private_group.slug}/messages/")
        self.assertEqual(read.status_code, 200)

    def test_group_message_delete_for_me(self):
        self.client.force_authenticate(user=self.bob)
        self.client.post(f"/api/communities/groups/{self.public_group.slug}/join/")
        send = self.client.post(
            f"/api/communities/groups/{self.public_group.slug}/messages/",
            {"body": "Temporary"},
            format="json",
        )
        message_id = send.data["id"]

        delete = self.client.post(
            f"/api/communities/groups/{self.public_group.slug}/messages/{message_id}/delete/",
            {"scope": "me"},
            format="json",
        )
        self.assertEqual(delete.status_code, 200)
        self.assertEqual(delete.data["scope"], "me")

        listing = self.client.get(f"/api/communities/groups/{self.public_group.slug}/messages/")
        self.assertEqual(len(listing.data["results"]), 0)

        self.client.force_authenticate(user=self.alice)
        listing_alice = self.client.get(f"/api/communities/groups/{self.public_group.slug}/messages/")
        self.assertEqual(len(listing_alice.data["results"]), 1)

    def test_group_message_forward(self):
        other = CommunityGroup.objects.create(
            slug="second-group",
            name="Second",
            description="",
            topic="general",
            visibility=GroupVisibility.PUBLIC,
            created_by=self.alice,
        )
        GroupMembership.objects.create(group=other, user=self.alice, status=MembershipStatus.ACTIVE, role="admin")
        GroupMembership.objects.create(group=other, user=self.bob, status=MembershipStatus.ACTIVE, role="member")

        self.client.force_authenticate(user=self.bob)
        self.client.post(f"/api/communities/groups/{self.public_group.slug}/join/")
        source = self.client.post(
            f"/api/communities/groups/{self.public_group.slug}/messages/",
            {"body": "Forward me"},
            format="json",
        )
        message_id = source.data["id"]

        forwarded = self.client.post(
            f"/api/communities/groups/{self.public_group.slug}/messages/{message_id}/forward/",
            {"to_group_slug": other.slug},
            format="json",
        )
        self.assertEqual(forwarded.status_code, 201)
        self.assertEqual(forwarded.data["to_group_slug"], other.slug)
        self.assertEqual(forwarded.data["message"]["body"], "Forward me")
        self.assertTrue(GroupMessage.objects.filter(group=other, body="Forward me").exists())
