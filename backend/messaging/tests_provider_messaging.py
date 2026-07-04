"""Provider automated welcome and messaging settings (Phase B–D)."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import BusinessMembership, BusinessProfile, BusinessTeamRole, Profile, UserType

from messaging.models import Message, ProviderMessagingSettings

User = get_user_model()


class ProviderMessagingSettingsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.provider = User.objects.create_user(
            username="prov_settings", email="prov_settings@test.local", password="pass12345"
        )
        self.traveller = User.objects.create_user(
            username="guest_settings", email="guest_settings@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.provider).update(
            user_type=UserType.SERVICE_PROVIDER, allow_messages=True
        )
        Profile.objects.filter(user=self.traveller).update(allow_messages=True)

    def test_traveller_cannot_access_provider_settings(self):
        self.client.force_authenticate(user=self.traveller)
        res = self.client.get("/api/messaging/provider-settings/")
        self.assertEqual(res.status_code, 403)

    def test_provider_gets_default_settings(self):
        self.client.force_authenticate(user=self.provider)
        res = self.client.get("/api/messaging/provider-settings/")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["auto_welcome_enabled"])
        self.assertEqual(res.data["auto_welcome_body"], "")
        self.assertFalse(res.data["quick_replies_enabled"])
        self.assertEqual(res.data["quick_replies"], [])

    def test_provider_can_update_settings(self):
        self.client.force_authenticate(user=self.provider)
        res = self.client.patch(
            "/api/messaging/provider-settings/",
            {
                "auto_welcome_enabled": True,
                "auto_welcome_body": "Welcome! We reply within a few hours.",
                "quick_replies_enabled": True,
                "quick_replies": ["Thanks for reaching out.", "  ", "Your booking is confirmed."],
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["auto_welcome_enabled"])
        self.assertEqual(res.data["auto_welcome_body"], "Welcome! We reply within a few hours.")
        self.assertTrue(res.data["quick_replies_enabled"])
        self.assertEqual(
            res.data["quick_replies"],
            ["Thanks for reaching out.", "Your booking is confirmed."],
        )

    def test_patch_rejects_enabled_welcome_without_body(self):
        self.client.force_authenticate(user=self.provider)
        res = self.client.patch(
            "/api/messaging/provider-settings/",
            {"auto_welcome_enabled": True, "auto_welcome_body": "   "},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Welcome message is required", res.data["detail"])

    def test_patch_rejects_enabled_quick_replies_without_shortcuts(self):
        self.client.force_authenticate(user=self.provider)
        res = self.client.patch(
            "/api/messaging/provider-settings/",
            {"quick_replies_enabled": True, "quick_replies": ["", "  "]},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("quick reply", res.data["detail"].lower())


class ProviderMessagingSettingsTeamAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="biz_owner_msg", email="biz_owner_msg@test.local", password="pass12345"
        )
        self.manager = User.objects.create_user(
            username="biz_mgr_msg", email="biz_mgr_msg@test.local", password="pass12345"
        )
        self.viewer = User.objects.create_user(
            username="biz_view_msg", email="biz_view_msg@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.owner).update(
            user_type=UserType.SERVICE_PROVIDER, allow_messages=True
        )
        self.business = BusinessProfile.objects.create(
            owner=self.owner,
            slug="msg-team-biz",
            business_name="Msg Team Biz",
            business_types=["accommodation"],
        )
        BusinessMembership.objects.create(
            business=self.business,
            user=self.manager,
            role=BusinessTeamRole.MANAGER,
        )
        BusinessMembership.objects.create(
            business=self.business,
            user=self.viewer,
            role=BusinessTeamRole.VIEWER,
        )

    def test_manager_can_read_owner_settings_with_business_id(self):
        ProviderMessagingSettings.objects.create(
            user=self.owner,
            auto_welcome_enabled=True,
            auto_welcome_body="Hello from the team.",
        )
        self.client.force_authenticate(user=self.manager)
        res = self.client.get(f"/api/messaging/provider-settings/?business_id={self.business.pk}")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["auto_welcome_enabled"])
        self.assertEqual(res.data["auto_welcome_body"], "Hello from the team.")
        self.assertEqual(res.data["owner_username"], "biz_owner_msg")
        self.assertTrue(res.data["managed_for_owner"])
        self.assertEqual(res.data["business_id"], self.business.pk)
        self.assertEqual(res.data["business_name"], "Msg Team Biz")

    def test_manager_can_update_owner_settings_with_business_id(self):
        self.client.force_authenticate(user=self.manager)
        res = self.client.patch(
            f"/api/messaging/provider-settings/?business_id={self.business.pk}",
            {
                "auto_welcome_enabled": True,
                "auto_welcome_body": "Updated by manager.",
                "quick_replies_enabled": True,
                "quick_replies": ["On my way."],
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        row = ProviderMessagingSettings.objects.get(business=self.business)
        self.assertEqual(row.auto_welcome_body, "Updated by manager.")
        self.assertEqual(row.business_id, self.business.pk)

    def test_viewer_cannot_access_owner_settings(self):
        self.client.force_authenticate(user=self.viewer)
        res = self.client.get(f"/api/messaging/provider-settings/?business_id={self.business.pk}")
        self.assertEqual(res.status_code, 403)

    def test_manager_cannot_access_without_business_id(self):
        self.client.force_authenticate(user=self.manager)
        res = self.client.get("/api/messaging/provider-settings/")
        self.assertEqual(res.status_code, 403)


class ProviderMessagingPerBusinessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.provider = User.objects.create_user(
            username="prov_biz", email="prov_biz@test.local", password="pass12345"
        )
        self.guest = User.objects.create_user(
            username="guest_biz", email="guest_biz@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.provider).update(
            user_type=UserType.SERVICE_PROVIDER, allow_messages=True
        )
        Profile.objects.filter(user=self.guest).update(allow_messages=True)
        self.business = BusinessProfile.objects.create(
            owner=self.provider,
            slug="prov-biz-msg",
            business_name="Prov Biz Msg",
            business_types=["accommodation"],
        )
        ProviderMessagingSettings.objects.create(
            user=self.provider,
            business=None,
            auto_welcome_enabled=True,
            auto_welcome_body="Account default welcome.",
        )
        ProviderMessagingSettings.objects.create(
            user=self.provider,
            business=self.business,
            auto_welcome_enabled=True,
            auto_welcome_body="Business-specific welcome.",
        )

    def test_business_settings_are_separate_from_account_default(self):
        self.client.force_authenticate(user=self.provider)
        account = self.client.get("/api/messaging/provider-settings/")
        business = self.client.get(f"/api/messaging/provider-settings/?business_id={self.business.pk}")
        self.assertEqual(account.status_code, 200)
        self.assertEqual(business.status_code, 200)
        self.assertEqual(account.data["scope"], "account")
        self.assertEqual(business.data["scope"], "business")
        self.assertEqual(account.data["auto_welcome_body"], "Account default welcome.")
        self.assertEqual(business.data["auto_welcome_body"], "Business-specific welcome.")

    def test_business_scope_inherits_account_default_until_saved(self):
        ProviderMessagingSettings.objects.filter(business=self.business).delete()
        self.client.force_authenticate(user=self.provider)
        res = self.client.get(f"/api/messaging/provider-settings/?business_id={self.business.pk}")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["inherits_account_default"])
        self.assertEqual(res.data["auto_welcome_body"], "Account default welcome.")

    def test_auto_welcome_uses_business_settings_when_business_id_sent(self):
        self.client.force_authenticate(user=self.guest)
        res = self.client.post(
            "/api/messaging/start/",
            {"username": "prov_biz", "business_id": self.business.pk},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        conv_id = res.data["id"]
        msgs = self.client.get(f"/api/messaging/conversations/{conv_id}/messages/")
        self.assertEqual(msgs.data["results"][0]["body"], "Business-specific welcome.")

    def test_auto_welcome_falls_back_to_account_default_without_business_row(self):
        ProviderMessagingSettings.objects.filter(business=self.business).delete()
        self.client.force_authenticate(user=self.guest)
        res = self.client.post(
            "/api/messaging/start/",
            {"username": "prov_biz", "business_id": self.business.pk},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        conv_id = res.data["id"]
        msgs = self.client.get(f"/api/messaging/conversations/{conv_id}/messages/")
        self.assertEqual(msgs.data["results"][0]["body"], "Account default welcome.")


class ProviderBookingConfirmedAutomationTests(TestCase):
    def setUp(self):
        from datetime import date, timedelta

        from accommodation.models import AccommodationBooking, AccommodationListing, BookingStatus

        self.client = APIClient()
        self.provider = User.objects.create_user(
            username="prov_confirm", email="prov_confirm@test.local", password="pass12345"
        )
        self.guest = User.objects.create_user(
            username="guest_confirm", email="guest_confirm@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.provider).update(
            user_type=UserType.SERVICE_PROVIDER, allow_messages=True
        )
        Profile.objects.filter(user=self.guest).update(allow_messages=True)
        self.listing = AccommodationListing.objects.create(
            owner=self.provider,
            title="Confirm Lodge",
            region="Erongo",
            city="Swakopmund",
            price_per_night="500.00",
        )
        today = date.today()
        self.booking = AccommodationBooking.objects.create(
            listing=self.listing,
            guest=self.guest,
            check_in=today + timedelta(days=3),
            check_out=today + timedelta(days=5),
            guests=2,
            room_type_name="Standard",
            total_price="1000.00",
            status=BookingStatus.PENDING,
        )
        ProviderMessagingSettings.objects.create(
            user=self.provider,
            booking_confirmed_enabled=True,
            booking_confirmed_body="Your stay is confirmed — we look forward to hosting you!",
        )

    def test_confirm_booking_sends_automated_message(self):
        from messaging.models import BookingAutomatedMessageLog, Conversation, Message

        self.client.force_authenticate(user=self.provider)
        res = self.client.post(
            f"/api/accommodation/provider-bookings/{self.booking.pk}/confirm/",
            {},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        conv = (
            Conversation.objects.filter(participants=self.guest)
            .filter(participants=self.provider)
            .first()
        )
        self.assertIsNotNone(conv)
        self.assertEqual(conv.context_type, "booking_stay")
        self.assertEqual(conv.context_id, self.booking.pk)
        msg = Message.objects.filter(conversation=conv, is_automated=True).first()
        self.assertIsNotNone(msg)
        self.assertIn("confirmed", msg.body.lower())
        self.assertTrue(
            BookingAutomatedMessageLog.objects.filter(
                booking_type="booking_stay",
                booking_id=self.booking.pk,
                trigger="confirmed",
            ).exists()
        )

    def test_booking_confirmed_not_sent_when_disabled(self):
        from messaging.models import Message

        ProviderMessagingSettings.objects.filter(user=self.provider).update(booking_confirmed_enabled=False)
        self.client.force_authenticate(user=self.provider)
        self.client.post(
            f"/api/accommodation/provider-bookings/{self.booking.pk}/confirm/",
            {},
            format="json",
        )
        self.assertFalse(Message.objects.filter(is_automated=True).exists())

    def test_booking_confirmed_not_duplicated(self):
        from messaging.models import Message

        self.client.force_authenticate(user=self.provider)
        url = f"/api/accommodation/provider-bookings/{self.booking.pk}/confirm/"
        self.client.post(url, {}, format="json")
        self.booking.status = "pending"
        self.booking.save(update_fields=["status"])
        self.client.post(url, {}, format="json")
        self.assertEqual(Message.objects.filter(is_automated=True).count(), 1)

    def test_patch_rejects_enabled_booking_confirmed_without_body(self):
        self.client.force_authenticate(user=self.provider)
        res = self.client.patch(
            "/api/messaging/provider-settings/",
            {"booking_confirmed_enabled": True, "booking_confirmed_body": "   "},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Booking confirmed", res.data["detail"])


class ProviderAutoWelcomeProfileHintTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.provider = User.objects.create_user(
            username="prov_hint", email="prov_hint@test.local", password="pass12345"
        )
        self.traveller = User.objects.create_user(
            username="guest_hint", email="guest_hint@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.provider).update(
            user_type=UserType.SERVICE_PROVIDER, allow_messages=True
        )

    def test_public_profile_exposes_has_auto_welcome_when_configured(self):
        ProviderMessagingSettings.objects.create(
            user=self.provider,
            auto_welcome_enabled=True,
            auto_welcome_body="Welcome — we'll reply soon.",
        )
        res = self.client.get("/api/accounts/users/prov_hint/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["has_auto_welcome"])

    def test_public_profile_has_auto_welcome_false_when_disabled(self):
        res = self.client.get("/api/accounts/users/prov_hint/")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["has_auto_welcome"])


class ProviderAutoWelcomeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.provider = User.objects.create_user(
            username="prov_auto", email="prov_auto@test.local", password="pass12345"
        )
        self.guest = User.objects.create_user(
            username="guest_auto", email="guest_auto@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.provider).update(
            user_type=UserType.SERVICE_PROVIDER, allow_messages=True
        )
        Profile.objects.filter(user=self.guest).update(allow_messages=True)
        ProviderMessagingSettings.objects.create(
            user=self.provider,
            auto_welcome_enabled=True,
            auto_welcome_body="Thanks for messaging us — we'll be with you shortly.",
        )

    def test_auto_welcome_sent_when_guest_starts_thread(self):
        self.client.force_authenticate(user=self.guest)
        res = self.client.post("/api/messaging/start/", {"username": "prov_auto"}, format="json")
        self.assertEqual(res.status_code, 200)
        conv_id = res.data["id"]
        msgs = self.client.get(f"/api/messaging/conversations/{conv_id}/messages/")
        self.assertEqual(msgs.status_code, 200)
        self.assertEqual(len(msgs.data["results"]), 1)
        row = msgs.data["results"][0]
        self.assertEqual(row["sender_username"], "prov_auto")
        self.assertTrue(row["is_automated"])
        self.assertIn("Thanks for messaging us", row["body"])

    def test_auto_welcome_not_sent_when_provider_starts_thread(self):
        self.client.force_authenticate(user=self.provider)
        res = self.client.post("/api/messaging/start/", {"username": "guest_auto"}, format="json")
        self.assertEqual(res.status_code, 200)
        conv_id = res.data["id"]
        self.assertFalse(Message.objects.filter(conversation_id=conv_id).exists())

    def test_auto_welcome_not_sent_on_existing_thread(self):
        self.client.force_authenticate(user=self.guest)
        first = self.client.post("/api/messaging/start/", {"username": "prov_auto"}, format="json")
        conv_id = first.data["id"]
        self.assertEqual(Message.objects.filter(conversation_id=conv_id, is_automated=True).count(), 1)
        second = self.client.post("/api/messaging/start/", {"username": "prov_auto"}, format="json")
        self.assertEqual(second.data["id"], conv_id)
        self.assertEqual(Message.objects.filter(conversation_id=conv_id, is_automated=True).count(), 1)

    def test_auto_welcome_skipped_when_disabled(self):
        ProviderMessagingSettings.objects.filter(user=self.provider).update(auto_welcome_enabled=False)
        self.client.force_authenticate(user=self.guest)
        res = self.client.post("/api/messaging/start/", {"username": "prov_auto"}, format="json")
        self.assertEqual(res.status_code, 200)
        conv_id = res.data["id"]
        self.assertFalse(Message.objects.filter(conversation_id=conv_id).exists())
