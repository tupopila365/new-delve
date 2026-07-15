"""Phase 1 — provider guide profile and booking APIs."""

from datetime import time, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import BusinessMembership, BusinessProfile, BusinessTeamRole, UserType
from guides.models import GuideBooking, TourGuideProfile

User = get_user_model()

MINIMAL_JPEG = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c"
    b"\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c"
    b" $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x11\x08\x00\x01"
    b"\x00\x01\x03\x01\"\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x15\x00\x01\x01"
    b"\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xff\xc4\x00"
    b"\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
    b"\xff\xda\x00\x0c\x03\x01\x00\x02\x00\x03\x00\x00\x00\x01\xff\xd9"
)


class ProviderGuideProfileApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="guide_owner",
            email="guide_owner@test.local",
            password="pass12345",
        )
        self.owner.profile.user_type = UserType.SERVICE_PROVIDER
        self.owner.profile.save()

        self.manager = User.objects.create_user(
            username="guide_mgr",
            email="guide_mgr@test.local",
            password="pass12345",
        )
        self.manager.profile.user_type = UserType.SERVICE_PROVIDER
        self.manager.profile.save()

        self.other = User.objects.create_user(
            username="other_guide",
            email="other_guide@test.local",
            password="pass12345",
        )
        self.other.profile.user_type = UserType.SERVICE_PROVIDER
        self.other.profile.save()

        BusinessProfile.objects.create(
            owner=self.owner,
            slug="guide-owner-co",
            business_name="Guide Owner Co",
            business_types=["guide"],
        )
        biz = BusinessProfile.objects.get(owner=self.owner)
        BusinessMembership.objects.create(
            business=biz,
            user=self.manager,
            role=BusinessTeamRole.MANAGER,
        )

    def test_provider_get_profile_null_when_missing(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/guides/provider-profile/")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data)

    def test_provider_can_create_profile(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(
            "/api/guides/provider-profile/",
            {
                "headline": "Windhoek city walks",
                "bio": "Local history and food.",
                "regions": ["Khomas"],
                "languages": ["English", "Afrikaans"],
                "hourly_rate": "450.00",
                "photo": "https://cdn.example/guide.jpg",
                "specialities": ["Culture", "City walks"],
                "tour_packages": [
                    {
                        "id": "half-day",
                        "title": "Half-day city walk",
                        "hours": 4,
                        "price": "1800",
                        "description": "Old town and markets",
                    }
                ],
                "is_active": False,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["headline"], "Windhoek city walks")
        self.assertEqual(res.data["photo"], "https://cdn.example/guide.jpg")
        self.assertEqual(len(res.data["tour_packages"]), 1)
        self.assertFalse(res.data["is_active"])
        guide = TourGuideProfile.objects.get(user=self.owner)
        self.assertEqual(guide.user_id, self.owner.id)
        public = self.client.get(f"/api/guides/profiles/{guide.pk}/")
        self.assertEqual(public.status_code, 404)

        guide.is_active = True
        guide.save(update_fields=["is_active"])
        public = self.client.get(f"/api/guides/profiles/{guide.pk}/")
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.data["photo"], "https://cdn.example/guide.jpg")

    def test_provider_cannot_create_second_profile(self):
        TourGuideProfile.objects.create(
            user=self.owner,
            headline="Existing",
            regions=["Khomas"],
        )
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(
            "/api/guides/provider-profile/",
            {"headline": "Duplicate", "regions": ["Khomas"]},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_provider_can_patch_profile_and_packages(self):
        guide = TourGuideProfile.objects.create(
            user=self.owner,
            headline="Old headline",
            regions=["Khomas"],
            is_active=False,
        )
        self.client.force_authenticate(user=self.owner)
        res = self.client.patch(
            "/api/guides/provider-profile/",
            {
                "headline": "Updated headline",
                "tour_packages": [
                    {
                        "id": "sunset",
                        "title": "Sunset dunes",
                        "description": "Golden hour dunes and viewpoints.",
                        "hours": 3,
                        "price": "2200",
                    }
                ],
                "portfolio_gallery": [{"src": "https://cdn.example/p1.jpg", "caption": "Dunes"}],
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["headline"], "Updated headline")
        self.assertEqual(res.data["tour_packages"][0]["id"], "sunset")
        self.assertEqual(len(res.data["portfolio_gallery"]), 1)
        self.assertTrue(res.data["is_active"])
        guide.refresh_from_db()
        self.assertEqual(guide.headline, "Updated headline")

    def test_provider_can_save_guide_stories(self):
        TourGuideProfile.objects.create(
            user=self.owner,
            headline="Story guide",
            regions=["Khomas"],
            is_active=False,
        )
        self.client.force_authenticate(user=self.owner)
        stories = [
            {
                "id": "trail",
                "label": "Trail moments",
                "coverSrc": "https://cdn.example/trail.jpg",
                "slides": [
                    {
                        "src": "https://cdn.example/trail.jpg",
                        "headline": "Golden hour dunes",
                        "sub": "Best light for photos",
                    }
                ],
            }
        ]
        res = self.client.patch(
            "/api/guides/provider-profile/",
            {"guide_stories": stories, "is_active": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["guide_stories"]), 1)
        self.assertEqual(res.data["guide_stories"][0]["label"], "Trail moments")
        guide = TourGuideProfile.objects.get(user=self.owner)
        self.assertEqual(guide.guide_stories[0]["slides"][0]["headline"], "Golden hour dunes")

        detail = self.client.get(f"/api/guides/profiles/{guide.pk}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(len(detail.data["guide_stories"]), 1)

    def test_provider_can_upload_profile_photo(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        TourGuideProfile.objects.create(
            user=self.owner,
            headline="Photo guide",
            regions=["Khomas"],
        )
        image = SimpleUploadedFile("photo.jpg", MINIMAL_JPEG, content_type="image/jpeg")
        self.client.force_authenticate(user=self.owner)
        res = self.client.patch(
            "/api/guides/provider-profile/",
            {"photo": image},
            format="multipart",
        )
        self.assertEqual(res.status_code, 200)
        guide = TourGuideProfile.objects.get(user=self.owner)
        self.assertTrue(guide.photo)
        self.assertTrue(res.data["photo"])

    def test_provider_can_upload_portfolio_and_package_photos(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        TourGuideProfile.objects.create(
            user=self.owner,
            headline="Media guide",
            regions=["Khomas"],
            tour_packages=[
                {
                    "id": "half-day",
                    "title": "Half-day",
                    "description": "Dunes",
                    "hours": 4,
                    "price": "2000",
                    "photo": None,
                    "photos": [],
                }
            ],
        )
        portfolio = SimpleUploadedFile("p1.jpg", MINIMAL_JPEG, content_type="image/jpeg")
        package_photo = SimpleUploadedFile("pkg.jpg", MINIMAL_JPEG, content_type="image/jpeg")
        package_gallery = SimpleUploadedFile("pkg2.jpg", MINIMAL_JPEG, content_type="image/jpeg")
        self.client.force_authenticate(user=self.owner)
        res = self.client.patch(
            "/api/guides/provider-profile/",
            {
                "portfolio_images": [portfolio],
                "package_id": "half-day",
                "package_photo": package_photo,
                "package_gallery_images": [package_gallery],
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, 200)
        guide = TourGuideProfile.objects.get(user=self.owner)
        portfolio_rows = [p for p in (guide.portfolio_gallery or []) if not p.get("is_profile")]
        self.assertGreaterEqual(len(portfolio_rows), 1)
        pkg = next(p for p in guide.tour_packages if p["id"] == "half-day")
        self.assertTrue(pkg.get("photo"))
        self.assertGreaterEqual(len(pkg.get("photos") or []), 1)

    def test_package_requires_description_and_price(self):
        TourGuideProfile.objects.create(
            user=self.owner,
            headline="Package guide",
            regions=["Khomas"],
        )
        self.client.force_authenticate(user=self.owner)
        res = self.client.patch(
            "/api/guides/provider-profile/",
            {
                "tour_packages": [
                    {"id": "bad", "title": "No price", "hours": 2},
                ]
            },
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_team_manager_can_edit_owner_profile(self):
        TourGuideProfile.objects.create(
            user=self.owner,
            headline="Owner guide",
            regions=["Khomas"],
        )
        self.client.force_authenticate(user=self.manager)
        res = self.client.get("/api/guides/provider-profile/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["headline"], "Owner guide")
        res = self.client.patch(
            "/api/guides/provider-profile/",
            {"headline": "Manager update"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["headline"], "Manager update")

    def test_other_provider_does_not_see_profile(self):
        TourGuideProfile.objects.create(
            user=self.owner,
            headline="Owner guide",
            regions=["Khomas"],
        )
        self.client.force_authenticate(user=self.other)
        res = self.client.get("/api/guides/provider-profile/")
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data)


class ProviderGuideBookingApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="guide_owner",
            email="guide_owner@test.local",
            password="pass12345",
        )
        self.owner.profile.user_type = UserType.SERVICE_PROVIDER
        self.owner.profile.save()
        self.traveler = User.objects.create_user(
            username="traveler",
            email="traveler@test.local",
            password="pass12345",
        )
        self.traveler.profile.email_verified = True
        self.traveler.profile.save()

        self.guide = TourGuideProfile.objects.create(
            user=self.owner,
            headline="Safari guide",
            regions=["Erongo"],
            tour_packages=[
                {
                    "id": "half-day",
                    "title": "Half-day dunes",
                    "hours": 4,
                    "price": "3600",
                }
            ],
            is_active=True,
        )
        self.booking = GuideBooking.objects.create(
            guide=self.guide,
            client=self.traveler,
            date=(timezone.now() + timedelta(days=3)).date(),
            duration_hours=4,
            group_size=2,
            package_id="half-day",
            total_price="3600.00",
            status="pending",
            notes="Preferred language: English\nWe want an early start.",
            meeting_point="Lodge lobby",
            start_time=time(9, 30),
        )

    def test_provider_lists_bookings(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/guides/provider-bookings/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        row = res.data[0]
        self.assertEqual(row["id"], self.booking.pk)
        self.assertEqual(row["package_title"], "Half-day dunes")
        self.assertEqual(row["guest_username"], "traveler")
        self.assertEqual(row["guests"], 2)
        self.assertEqual(row["status"], "pending")
        self.assertEqual(row["notes"], "Preferred language: English\nWe want an early start.")
        self.assertEqual(row["meeting_point"], "Lodge lobby")
        self.assertEqual(row["start_time"], "09:30:00")
        self.assertEqual(row["package_id"], "half-day")

    def test_provider_filters_bookings_by_status(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/guides/provider-bookings/?status=confirmed")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 0)
        res = self.client.get("/api/guides/provider-bookings/?status=pending")
        self.assertEqual(len(res.data), 1)

    def test_provider_can_confirm_and_complete(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(f"/api/guides/provider-bookings/{self.booking.pk}/confirm/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "confirmed")
        res = self.client.post(f"/api/guides/provider-bookings/{self.booking.pk}/complete/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "completed")

    def test_provider_cannot_complete_pending(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(f"/api/guides/provider-bookings/{self.booking.pk}/complete/", {}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_provider_can_cancel_pending(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(f"/api/guides/provider-bookings/{self.booking.pk}/cancel/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], "cancelled")

    def test_traveler_cannot_list_provider_bookings(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.get("/api/guides/provider-bookings/")
        self.assertEqual(res.status_code, 403)
