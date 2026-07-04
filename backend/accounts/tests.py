from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accommodation.models import AccommodationListing
from accounts.models import BusinessProfile, BusinessType, Profile, UserType
from events_app.models import Event

User = get_user_model()


class BusinessListingsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="biz_owner", email="biz_owner@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.owner).update(user_type=UserType.SERVICE_PROVIDER)
        self.business = BusinessProfile.objects.create(
            owner=self.owner,
            slug="desert-stays",
            business_name="Desert Stays",
            business_types=[BusinessType.ACCOMMODATION, BusinessType.EVENT_ORGANISER],
            city="Swakopmund",
            region="Erongo",
        )
        self.listing = AccommodationListing.objects.create(
            owner=self.owner,
            title="Coastal Lodge",
            region="Erongo",
            city="Swakopmund",
            price_per_night="850.00",
            rating_avg=Decimal("4.80"),
            rating_count=10,
        )
        self.event = Event.objects.create(
            organizer=self.owner,
            business=self.business,
            title="Sunset market",
            venue="Jetty",
            region="Erongo",
            city="Swakopmund",
            starts_at=timezone.now(),
            is_published=True,
            is_free=True,
        )

    def test_business_detail_includes_stats(self):
        res = self.client.get(f"/api/accounts/businesses/{self.business.pk}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["stats"]["listings_count"], 2)
        self.assertEqual(res.data["stats"]["rating_avg"], "4.8")
        self.assertEqual(res.data["stats"]["rating_count"], 10)

    def test_business_listings_returns_aggregated_items(self):
        res = self.client.get(f"/api/accounts/businesses/{self.business.pk}/listings/")
        self.assertEqual(res.status_code, 200)
        kinds = {row["kind"] for row in res.data}
        self.assertIn("stays", kinds)
        self.assertIn("events", kinds)
        stay = next(row for row in res.data if row["kind"] == "stays")
        self.assertEqual(stay["title"], "Coastal Lodge")
        self.assertIn("/accommodation/", stay["href"])

    def test_update_business_accepts_logo_and_cover(self):
        from io import BytesIO

        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        buf = BytesIO()
        Image.new("RGB", (2, 2), color="red").save(buf, format="PNG")
        png = buf.getvalue()
        self.client.force_authenticate(user=self.owner)
        logo = SimpleUploadedFile("logo.png", png, content_type="image/png")
        cover = SimpleUploadedFile("cover.png", png, content_type="image/png")
        res = self.client.patch(
            f"/api/accounts/me/businesses/{self.business.pk}/",
            {"logo": logo, "cover_image": cover},
            format="multipart",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.business.refresh_from_db()
        self.assertTrue(bool(self.business.logo))
        self.assertTrue(bool(self.business.cover_image))


class AdminUserProfileApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="delve_admin", email="admin@test.local", password="pass12345", is_staff=True
        )
        self.target = User.objects.create_user(
            username="inspect_me", email="inspect@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.target).update(
            display_name="Inspect Me",
            bio="Travel blogger",
            user_type=UserType.SERVICE_PROVIDER,
        )
        self.business = BusinessProfile.objects.create(
            owner=self.target,
            slug="inspect-stays",
            business_name="Inspect Stays",
            business_types=[BusinessType.ACCOMMODATION],
            city="Windhoek",
            region="Khomas",
        )
        from reports.models import Report, ReportTargetType
        from social.models import Post

        self.post = Post.objects.create(author=self.target, body="Visible post", is_delvers=True)
        Post.objects.create(author=self.target, body="Hidden post", is_delvers=True, is_hidden=True)
        Report.objects.create(
            reporter=self.admin,
            target_type=ReportTargetType.POST,
            target_id=str(self.post.pk),
            target_label="Visible post",
            reason="spam",
            description="Looks like spam",
        )

    def test_admin_profile_requires_staff(self):
        self.client.force_authenticate(user=self.target)
        res = self.client.get(f"/api/accounts/admin/users/{self.target.pk}/profile/")
        self.assertEqual(res.status_code, 403)

    def test_admin_profile_returns_aggregated_footprint(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f"/api/accounts/admin/users/{self.target.pk}/profile/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["user"]["username"], "inspect_me")
        self.assertEqual(res.data["profile"]["bio"], "Travel blogger")
        self.assertEqual(res.data["stats"]["posts_count"], 1)
        self.assertEqual(res.data["stats"]["posts_hidden_count"], 1)
        self.assertEqual(res.data["stats"]["reports_against_open"], 1)
        self.assertEqual(len(res.data["businesses"]), 1)
        self.assertEqual(res.data["businesses"][0]["business_name"], "Inspect Stays")
        self.assertEqual(len(res.data["recent_posts"]), 2)
        self.assertTrue(any(p["body"] == "Hidden post" and p["is_hidden"] for p in res.data["recent_posts"]))
        self.assertEqual(len(res.data["reports"]), 1)
        self.assertEqual(res.data["bookings_summary"]["as_traveler"], 0)


class PublicAnnouncementTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_inactive_announcement_returns_empty_payload(self):
        from accounts.models import PlatformSettings

        settings_obj = PlatformSettings.load()
        settings_obj.announcement_active = False
        settings_obj.announcement_title = "Hidden"
        settings_obj.announcement_body = "Should not show"
        settings_obj.save()
        res = self.client.get("/api/accounts/announcement/")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["active"])

    def test_active_announcement_is_public(self):
        from accounts.models import PlatformSettings

        settings_obj = PlatformSettings.load()
        settings_obj.announcement_active = True
        settings_obj.announcement_title = "Welcome to DELVE"
        settings_obj.announcement_body = "Explore stays and local tips."
        settings_obj.save()
        res = self.client.get("/api/accounts/announcement/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["active"])
        self.assertEqual(res.data["title"], "Welcome to DELVE")
        self.assertEqual(res.data["body"], "Explore stays and local tips.")

