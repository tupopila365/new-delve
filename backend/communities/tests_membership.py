"""Unit tests for community group membership helpers."""

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase

from communities.membership import (
    MAX_GROUP_MEMBER_BATCH,
    add_users_to_group,
    normalize_username,
    parse_username_list,
)
from communities.models import (
    CommunityGroup,
    GroupMembership,
    MembershipRole,
    MembershipStatus,
)

User = get_user_model()


class NormalizeUsernameTests(SimpleTestCase):
    def test_strips_whitespace_and_leading_at(self):
        self.assertEqual(normalize_username("  @traveller "), "traveller")

    def test_blank_values(self):
        self.assertEqual(normalize_username(""), "")
        self.assertEqual(normalize_username(None), "")


class ParseUsernameListTests(SimpleTestCase):
    def test_blank_input_returns_empty_list(self):
        for raw in (None, "", "   ", []):
            self.assertEqual(parse_username_list(raw), [])

    def test_list_input_dedupes_case_insensitively_keeping_first_spelling(self):
        self.assertEqual(
            parse_username_list(["@Ana", "ana", "  ", "ben"]),
            ["Ana", "ben"],
        )

    def test_comma_separated_string(self):
        self.assertEqual(parse_username_list("ana, @ben ,,"), ["ana", "ben"])

    def test_json_array_string_is_parsed(self):
        self.assertEqual(parse_username_list('["ana", "@ben"]'), ["ana", "ben"])

    def test_malformed_json_array_falls_back_to_comma_split(self):
        self.assertEqual(parse_username_list('["ana", "ben'), ['["ana"', '"ben'])

    def test_non_string_scalar_is_coerced(self):
        self.assertEqual(parse_username_list(42), ["42"])

    def test_caps_the_batch_size(self):
        raw = [f"user{i}" for i in range(MAX_GROUP_MEMBER_BATCH + 5)]
        self.assertEqual(parse_username_list(raw), raw[:MAX_GROUP_MEMBER_BATCH])


class AddUsersToGroupTests(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user(
            username="group_owner", email="group_owner@test.local", password="pass12345"
        )
        self.member = User.objects.create_user(
            username="group_member", email="group_member@test.local", password="pass12345"
        )
        self.group = CommunityGroup.objects.create(
            slug="hiking-crew", name="Hiking crew", created_by=self.actor
        )

    def test_adds_new_active_member(self):
        result = add_users_to_group(group=self.group, usernames=["@GROUP_MEMBER"], actor=self.actor)

        self.assertEqual(result, {"added": ["group_member"], "skipped": []})
        membership = GroupMembership.objects.get(group=self.group, user=self.member)
        self.assertEqual(membership.status, MembershipStatus.ACTIVE)
        self.assertEqual(membership.role, MembershipRole.MEMBER)
        self.assertIsNotNone(membership.last_read_at)

    def test_skips_unknown_users(self):
        result = add_users_to_group(group=self.group, usernames=["ghost"], actor=self.actor)

        self.assertEqual(result, {"added": [], "skipped": ["ghost"]})
        self.assertEqual(GroupMembership.objects.filter(group=self.group).count(), 0)

    def test_skips_the_actor(self):
        result = add_users_to_group(group=self.group, usernames=["group_owner"], actor=self.actor)

        self.assertEqual(result, {"added": [], "skipped": ["group_owner"]})

    def test_skips_existing_active_membership(self):
        GroupMembership.objects.create(
            group=self.group, user=self.member, status=MembershipStatus.ACTIVE
        )

        result = add_users_to_group(group=self.group, usernames=["group_member"], actor=self.actor)

        self.assertEqual(result, {"added": [], "skipped": ["group_member"]})
        self.assertEqual(GroupMembership.objects.filter(group=self.group).count(), 1)

    def test_reactivates_pending_membership(self):
        membership = GroupMembership.objects.create(
            group=self.group,
            user=self.member,
            role=MembershipRole.ADMIN,
            status=MembershipStatus.PENDING,
        )

        result = add_users_to_group(group=self.group, usernames=["group_member"], actor=self.actor)

        membership.refresh_from_db()
        self.assertEqual(result, {"added": ["group_member"], "skipped": []})
        self.assertEqual(membership.status, MembershipStatus.ACTIVE)
        self.assertEqual(membership.role, MembershipRole.MEMBER)

    def test_handles_a_mixed_batch(self):
        result = add_users_to_group(
            group=self.group,
            usernames="group_member, ghost, group_owner",
            actor=self.actor,
        )

        self.assertEqual(result["added"], ["group_member"])
        self.assertEqual(result["skipped"], ["ghost", "group_owner"])
