from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import BusinessProfile, Profile, UserType, VerificationStatus

from .models import (
    AccommodationBooking,
    AccommodationListing,
    AccommodationListingSave,
    AccommodationRoomType,
    BookingStatus,
)

User = get_user_model()


class AccommodationListingSaveTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.host = User.objects.create_user(
            username="stay_host", email="stay_host@test.local", password="pass12345"
        )
        self.traveler = User.objects.create_user(
            username="traveler", email="traveler@test.local", password="pass12345"
        )
        self.listing = AccommodationListing.objects.create(
            owner=self.host,
            title="Coastal Lodge",
            region="Erongo",
            city="Swakopmund",
            price_per_night="850.00",
        )

    def test_save_toggle_and_saved_list(self):
        self.client.force_authenticate(user=self.traveler)

        save_url = f"/api/accommodation/listings/{self.listing.pk}/save/"
        res = self.client.post(save_url)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["saved"])
        self.assertEqual(res.data["saves_count"], 1)
        self.assertTrue(
            AccommodationListingSave.objects.filter(listing=self.listing, user=self.traveler).exists()
        )

        detail = self.client.get(f"/api/accommodation/listings/{self.listing.pk}/")
        self.assertEqual(detail.status_code, 200)
        self.assertTrue(detail.data["saved_by_me"])
        self.assertEqual(detail.data["saves_count"], 1)

        saved_list = self.client.get("/api/accommodation/listings/saved/")
        self.assertEqual(saved_list.status_code, 200)
        self.assertEqual(len(saved_list.data), 1)
        self.assertEqual(saved_list.data[0]["id"], self.listing.pk)

        unsave = self.client.post(save_url)
        self.assertEqual(unsave.status_code, 200)
        self.assertFalse(unsave.data["saved"])
        self.assertEqual(unsave.data["saves_count"], 0)

        saved_empty = self.client.get("/api/accommodation/listings/saved/")
        self.assertEqual(len(saved_empty.data), 0)

    def test_save_requires_auth(self):
        res = self.client.post(f"/api/accommodation/listings/{self.listing.pk}/save/")
        self.assertEqual(res.status_code, 401)


class AccommodationPhase3SocialTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.host = User.objects.create_user(
            username="phase3_host", email="phase3_host@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.host).update(user_type=UserType.SERVICE_PROVIDER)
        self.host.profile.refresh_from_db()
        self.traveler = User.objects.create_user(
            username="phase3_guest", email="phase3_guest@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.traveler).update(email_verified=True)
        self.traveler.profile.refresh_from_db()
        self.listing = AccommodationListing.objects.create(
            owner=self.host,
            title="Safari Lodge",
            region="Khomas",
            city="Windhoek",
            price_per_night="1200.00",
            guest_reviews=[{"name": "Seed Guest", "place": "Windhoek", "rating": 4, "body": "Lovely pool."}],
        )
        today = date.today()
        self.booking = AccommodationBooking.objects.create(
            listing=self.listing,
            guest=self.traveler,
            check_in=today - timedelta(days=2),
            check_out=today,
            guests=2,
            total_price="2400.00",
            status=BookingStatus.CHECKED_OUT,
        )

    def test_review_after_checked_out_booking(self):
        self.client.force_authenticate(user=self.traveler)
        review_url = f"/api/accommodation/bookings/{self.booking.pk}/review/"
        res = self.client.post(review_url, {"rating": 5, "body": "Excellent stay."}, format="json")
        self.assertEqual(res.status_code, 201)

        reviews_url = f"/api/accommodation/listings/{self.listing.pk}/reviews/"
        payload = self.client.get(reviews_url)
        self.assertEqual(payload.status_code, 200)
        self.assertEqual(payload.data["rating_count"], 2)
        self.assertTrue(any(r.get("source") == "traveler" for r in payload.data["reviews"]))

        self.listing.refresh_from_db()
        self.assertEqual(self.listing.rating_count, 2)

        dup = self.client.post(review_url, {"rating": 4, "body": "Again"}, format="json")
        self.assertEqual(dup.status_code, 400)

        bookings = self.client.get("/api/accommodation/bookings/")
        self.assertTrue(bookings.data[0]["has_review"])

    def test_listing_moments(self):
        from social.models import Post

        Post.objects.create(
            author=self.traveler,
            body="Sunset from the deck",
            region="Khomas",
            is_delvers=True,
            listing=self.listing,
            verified_stay_booking=self.booking,
        )
        res = self.client.get(f"/api/accommodation/listings/{self.listing.pk}/moments/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["body"], "Sunset from the deck")
        self.assertEqual(res.data[0]["listing"]["id"], self.listing.pk)
        self.assertTrue(res.data[0]["verified_stay"])


class AccommodationPhase4BookingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.host = User.objects.create_user(
            username="phase4_host", email="phase4_host@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.host).update(user_type=UserType.SERVICE_PROVIDER)
        self.traveler = User.objects.create_user(
            username="phase4_guest", email="phase4_guest@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.traveler).update(email_verified=True)
        self.traveler.profile.refresh_from_db()
        self.listing = AccommodationListing.objects.create(
            owner=self.host,
            title="River Camp",
            region="Kavango",
            city="Rundu",
            price_per_night="650.00",
        )
        today = date.today()
        AccommodationBooking.objects.create(
            listing=self.listing,
            guest=self.traveler,
            check_in=today + timedelta(days=10),
            check_out=today + timedelta(days=12),
            guests=2,
            total_price="1300.00",
            status=BookingStatus.CONFIRMED,
        )

    def test_availability_rejects_overlap(self):
        today = date.today()
        url = (
            f"/api/accommodation/listings/{self.listing.pk}/availability/"
            f"?check_in={(today + timedelta(days=11)).isoformat()}"
            f"&check_out={(today + timedelta(days=13)).isoformat()}&guests=2"
        )
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["available"])
        self.assertTrue(len(res.data["blocked_ranges"]) >= 1)

    def test_create_booking_rejects_overlap(self):
        self.client.force_authenticate(user=self.traveler)
        today = date.today()
        payload = {
            "listing": self.listing.pk,
            "check_in": (today + timedelta(days=10)).isoformat(),
            "check_out": (today + timedelta(days=13)).isoformat(),
            "guests": 2,
        }
        res = self.client.post("/api/accommodation/bookings/", payload, format="json")
        self.assertEqual(res.status_code, 400)

    def test_mock_pay_requires_host_confirmation(self):
        today = date.today()
        pending = AccommodationBooking.objects.create(
            listing=self.listing,
            guest=self.traveler,
            check_in=today + timedelta(days=20),
            check_out=today + timedelta(days=22),
            guests=1,
            total_price="1300.00",
            status=BookingStatus.PENDING,
        )
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(f"/api/accommodation/bookings/{pending.pk}/mock_pay/", {}, format="json")
        self.assertEqual(res.status_code, 400)

        pending.status = BookingStatus.CONFIRMED
        pending.save(update_fields=["status"])
        paid = self.client.post(f"/api/accommodation/bookings/{pending.pk}/mock_pay/", {}, format="json")
        self.assertEqual(paid.status_code, 200)
        self.assertTrue(paid.data["mock_payment_ref"])


class AccommodationPhase5MonetizationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.host = User.objects.create_user(
            username="phase5_host", email="phase5_host@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.host).update(user_type=UserType.SERVICE_PROVIDER)
        self.host.profile.refresh_from_db()
        self.listing = AccommodationListing.objects.create(
            owner=self.host,
            title="Safari Lodge",
            region="Khomas",
            city="Windhoek",
            price_per_night="1200.00",
        )
        today = date.today()
        AccommodationBooking.objects.create(
            listing=self.listing,
            guest=User.objects.create_user(username="payguest", email="payguest@test.local", password="x"),
            check_in=today,
            check_out=today + timedelta(days=2),
            guests=2,
            total_price="2400.00",
            status=BookingStatus.CONFIRMED,
            mock_payment_ref="mock_phase5_paid",
            paid_at=timezone.now(),
        )

    def test_provider_analytics(self):
        self.client.force_authenticate(user=self.host)
        res = self.client.get("/api/accommodation/provider-analytics/?days=30")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["confirmed_bookings"], 1)
        self.assertEqual(res.data["on_platform_revenue"], 2400.0)
        self.assertEqual(len(res.data["listings"]), 1)
        self.assertEqual(res.data["listings"][0]["revenue"], 2400.0)


class AccommodationPageViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.host = User.objects.create_user(
            username="view_host", email="view_host@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.host).update(user_type=UserType.SERVICE_PROVIDER)
        self.host.profile.refresh_from_db()
        self.guest = User.objects.create_user(
            username="view_guest", email="view_guest@test.local", password="pass12345"
        )
        self.listing = AccommodationListing.objects.create(
            owner=self.host,
            title="View Lodge",
            region="Khomas",
            city="Windhoek",
            price_per_night="800.00",
        )

    def test_record_listing_and_room_views(self):
        from .models import AccommodationPageView

        url = f"/api/accommodation/listings/{self.listing.pk}/record-view/"
        anon = self.client.post(url, {}, format="json")
        self.assertEqual(anon.status_code, 200)
        self.assertTrue(anon.data["recorded"])
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.views_count, 1)

        self.client.force_authenticate(user=self.guest)
        room = self.client.post(url, {"room_name": "Deluxe"}, format="json")
        self.assertEqual(room.status_code, 200)
        self.assertTrue(room.data["recorded"])
        self.assertEqual(AccommodationPageView.objects.filter(listing=self.listing).count(), 2)
        self.assertEqual(
            AccommodationPageView.objects.filter(listing=self.listing, room_name="Deluxe").count(),
            1,
        )
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.views_count, 1)

    def test_owner_views_are_skipped(self):
        url = f"/api/accommodation/listings/{self.listing.pk}/record-view/"
        self.client.force_authenticate(user=self.host)
        res = self.client.post(url, {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["recorded"])
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.views_count, 0)

    def test_provider_analytics_includes_views(self):
        from .view_tracking import record_accommodation_page_view

        record_accommodation_page_view(listing=self.listing, viewer=self.guest)
        record_accommodation_page_view(listing=self.listing, viewer=self.guest, room_name="Suite")
        self.client.force_authenticate(user=self.host)
        res = self.client.get("/api/accommodation/provider-analytics/?days=30")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["total_listing_views"], 1)
        self.assertEqual(res.data["total_room_views"], 1)
        self.assertEqual(res.data["total_views"], 2)
        self.assertEqual(res.data["listings"][0]["listing_views"], 1)
        self.assertEqual(res.data["listings"][0]["room_views"], 1)
        self.assertEqual(res.data["listings"][0]["rooms"][0]["name"], "Suite")


class AccommodationPhase6HardeningTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.host = User.objects.create_user(
            username="phase6_host", email="phase6_host@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.host).update(user_type=UserType.SERVICE_PROVIDER)
        self.host.profile.refresh_from_db()
        self.business = BusinessProfile.objects.create(
            owner=self.host,
            slug="phase6-stays",
            business_name="Phase 6 Stays",
            business_types=["accommodation"],
            verification_status=VerificationStatus.VERIFIED,
        )
        self.other_host = User.objects.create_user(
            username="phase6_other", email="phase6_other@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.other_host).update(user_type=UserType.SERVICE_PROVIDER)
        self.other_host.profile.refresh_from_db()
        self.traveler = User.objects.create_user(
            username="phase6_guest", email="phase6_guest@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.traveler).update(email_verified=True)
        self.traveler.profile.refresh_from_db()
        self.listing = AccommodationListing.objects.create(
            owner=self.host,
            business=self.business,
            title="Dune Camp",
            region="Hardap",
            city="Sesriem",
            price_per_night="900.00",
        )
        today = date.today()
        self.booking = AccommodationBooking.objects.create(
            listing=self.listing,
            guest=self.traveler,
            check_in=today + timedelta(days=5),
            check_out=today + timedelta(days=7),
            guests=2,
            room_type_name="Safari tent",
            total_price="1800.00",
            status=BookingStatus.PENDING,
        )

    def test_provider_sees_own_bookings_only(self):
        self.client.force_authenticate(user=self.host)
        res = self.client.get("/api/accommodation/provider-bookings/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["id"], self.booking.pk)
        scoped = self.client.get(
            f"/api/accommodation/provider-bookings/?business={self.business.pk}"
        )
        self.assertEqual(scoped.status_code, 200)
        self.assertEqual([row["id"] for row in scoped.data], [self.booking.pk])
        invalid = self.client.get("/api/accommodation/provider-bookings/?business=not-an-id")
        self.assertEqual(invalid.status_code, 400)

        self.client.force_authenticate(user=self.other_host)
        empty = self.client.get("/api/accommodation/provider-bookings/")
        self.assertEqual(empty.status_code, 200)
        self.assertEqual(len(empty.data), 0)

    def test_like_toggle(self):
        self.client.force_authenticate(user=self.traveler)
        url = f"/api/accommodation/listings/{self.listing.pk}/like/"
        liked = self.client.post(url)
        self.assertEqual(liked.status_code, 200)
        self.assertTrue(liked.data["liked"])
        self.assertEqual(liked.data["likes_count"], 1)

        unliked = self.client.post(url)
        self.assertEqual(unliked.status_code, 200)
        self.assertFalse(unliked.data["liked"])
        self.assertEqual(unliked.data["likes_count"], 0)

    def test_traveler_cancel_booking(self):
        self.client.force_authenticate(user=self.traveler)
        res = self.client.post(f"/api/accommodation/bookings/{self.booking.pk}/cancel/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], BookingStatus.CANCELLED)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.CANCELLED)

    def test_provider_listing_crud(self):
        self.client.force_authenticate(user=self.host)
        cover = "https://cdn.example/stay-cover.jpg"
        create = self.client.post(
            "/api/accommodation/provider-listings/",
            {
                "title": "New Lodge",
                "region": "Erongo",
                "city": "Swakopmund",
                "price_per_night": "750.00",
                "property_type": "lodge",
                "cover_image": cover,
            },
            format="json",
        )
        self.assertEqual(create.status_code, 201)
        listing_id = create.data["id"]
        self.assertEqual(create.data["cover_image"], cover)
        self.assertIn("owner_display_name", create.data)
        self.assertIn("owner_avatar", create.data)

        public = self.client.get(f"/api/accommodation/listings/{listing_id}/")
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.data["cover_image"], cover)

        update = self.client.patch(
            f"/api/accommodation/provider-listings/{listing_id}/",
            {"title": "Renamed Lodge"},
            format="json",
        )
        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.data["title"], "Renamed Lodge")

        self.client.force_authenticate(user=self.other_host)
        forbidden = self.client.patch(
            f"/api/accommodation/provider-listings/{listing_id}/",
            {"title": "Hijacked"},
            format="json",
        )
        self.assertIn(forbidden.status_code, (403, 404))

    def test_stay_admin_full_listing_room_preview_and_booking_flow(self):
        """Cover the provider flow exercised by the Stay Admin pages."""
        self.client.force_authenticate(user=self.host)
        room = {
            "name": "Garden Suite",
            "description": "Private suite facing the garden.",
            "max_guests": 2,
            "bedrooms": 1,
            "bed_summary": "1 queen bed",
            "price_per_night": "950.00",
            "badges": ["Breakfast included"],
            "featured": True,
            "image": "https://cdn.example/garden-suite.jpg",
            "images": ["https://cdn.example/garden-suite.jpg"],
        }
        create = self.client.post(
            "/api/accommodation/provider-listings/",
            {
                "title": "Admin Flow Lodge",
                "description": "A complete stay used to verify the provider workflow.",
                "property_type": "lodge",
                "region": "Erongo",
                "city": "Swakopmund",
                "price_per_night": "800.00",
                "max_guests": 4,
                "bedrooms": 2,
                "cover_image": "https://cdn.example/admin-flow-cover.jpg",
                "room_types": [room],
                "is_active": False,
            },
            format="json",
        )
        self.assertEqual(create.status_code, 201)
        listing_id = create.data["id"]
        self.assertEqual(create.data["room_types"][0]["name"], "Garden Suite")

        # Editing property-only fields must preserve rooms managed on their own pages.
        edit = self.client.patch(
            f"/api/accommodation/provider-listings/{listing_id}/",
            {
                "title": "Admin Flow Lodge & Suites",
                "description": "Updated property description.",
            },
            format="json",
        )
        self.assertEqual(edit.status_code, 200)
        self.assertEqual(edit.data["title"], "Admin Flow Lodge & Suites")
        self.assertEqual(len(edit.data["room_types"]), 1)

        second_room = {
            "name": "Family Loft",
            "description": "Two-level family room.",
            "max_guests": 4,
            "bedrooms": 2,
            "bed_summary": "1 queen bed and 2 single beds",
            "price_per_night": "1350.00",
            "badges": [],
            "featured": False,
            "image": "",
            "images": [],
        }
        add_room = self.client.patch(
            f"/api/accommodation/provider-listings/{listing_id}/",
            {"room_types": [room, second_room]},
            format="json",
        )
        self.assertEqual(add_room.status_code, 200)
        self.assertEqual(
            [row["name"] for row in add_room.data["room_types"]],
            ["Garden Suite", "Family Loft"],
        )

        edited_room = {**second_room, "name": "Family Loft Deluxe", "price_per_night": "1450.00"}
        edit_room = self.client.patch(
            f"/api/accommodation/provider-listings/{listing_id}/",
            {"room_types": [room, edited_room]},
            format="json",
        )
        self.assertEqual(edit_room.status_code, 200)
        self.assertEqual(edit_room.data["room_types"][1]["name"], "Family Loft Deluxe")
        self.assertEqual(edit_room.data["room_types"][1]["price_per_night"], "1450.00")

        remove_room = self.client.patch(
            f"/api/accommodation/provider-listings/{listing_id}/",
            {"room_types": [edited_room]},
            format="json",
        )
        self.assertEqual(remove_room.status_code, 200)
        self.assertEqual(len(remove_room.data["room_types"]), 1)
        self.assertEqual(remove_room.data["room_types"][0]["name"], "Family Loft Deluxe")

        # Drafts remain private, while the authenticated provider preview can
        # render the same data in the traveller-facing layout.
        provider_preview = self.client.get(
            f"/api/accommodation/provider-listings/{listing_id}/"
        )
        self.assertEqual(provider_preview.status_code, 200)
        self.assertEqual(provider_preview.data["title"], "Admin Flow Lodge & Suites")
        self.assertEqual(provider_preview.data["room_types"][0]["name"], "Family Loft Deluxe")

        self.client.force_authenticate(user=None)
        hidden_draft = self.client.get(f"/api/accommodation/listings/{listing_id}/")
        self.assertEqual(hidden_draft.status_code, 404)

        self.client.force_authenticate(user=self.host)
        publish = self.client.patch(
            f"/api/accommodation/provider-listings/{listing_id}/",
            {"is_active": True},
            format="json",
        )
        self.assertEqual(publish.status_code, 200)
        self.assertTrue(publish.data["is_active"])

        self.client.force_authenticate(user=None)
        public_preview = self.client.get(f"/api/accommodation/listings/{listing_id}/")
        self.assertEqual(public_preview.status_code, 200)
        self.assertEqual(public_preview.data["title"], "Admin Flow Lodge & Suites")

        # A traveller can book that room and the provider can receive and manage it.
        self.client.force_authenticate(user=self.traveler)
        check_in = date.today() + timedelta(days=30)
        check_out = check_in + timedelta(days=3)
        booking = self.client.post(
            "/api/accommodation/bookings/",
            {
                "listing": listing_id,
                "check_in": check_in.isoformat(),
                "check_out": check_out.isoformat(),
                "guests": 3,
                "room_type_name": "Family Loft Deluxe",
                "special_requests": "Late arrival after 20:00.",
            },
            format="json",
        )
        self.assertEqual(booking.status_code, 201)
        booking_id = booking.data["id"]
        self.assertEqual(booking.data["status"], BookingStatus.PENDING)
        self.assertEqual(booking.data["room_type_name"], "Family Loft Deluxe")
        self.assertEqual(booking.data["total_price"], "4350.00")

        self.client.force_authenticate(user=self.host)
        inbox = self.client.get("/api/accommodation/provider-bookings/?status=pending")
        self.assertEqual(inbox.status_code, 200)
        received = next(row for row in inbox.data if row["id"] == booking_id)
        self.assertEqual(received["room_type_name"], "Family Loft Deluxe")
        self.assertEqual(received["special_requests"], "Late arrival after 20:00.")

        confirmed = self.client.post(
            f"/api/accommodation/provider-bookings/{booking_id}/confirm/",
            {},
            format="json",
        )
        self.assertEqual(confirmed.status_code, 200)
        self.assertEqual(confirmed.data["status"], BookingStatus.CONFIRMED)

        self.client.force_authenticate(user=self.traveler)
        traveler_booking = self.client.get(f"/api/accommodation/bookings/{booking_id}/")
        self.assertEqual(traveler_booking.status_code, 200)
        self.assertEqual(traveler_booking.data["status"], BookingStatus.CONFIRMED)

    def test_multiple_properties_stable_room_inventory_and_calendar(self):
        self.client.force_authenticate(user=self.host)
        business = BusinessProfile.objects.get(owner=self.host, slug="phase6-stays")
        property_ids = []
        for title in ("North Lodge", "South Guesthouse"):
            response = self.client.post(
                "/api/accommodation/provider-listings/",
                {
                    "business": business.id,
                    "title": title,
                    "description": f"{title} description.",
                    "property_type": "lodge",
                    "region": "Erongo",
                    "city": "Swakopmund",
                    "price_per_night": "1000.00",
                    "max_guests": 4,
                    "bedrooms": 2,
                    "is_active": True,
                },
                format="json",
            )
            self.assertEqual(response.status_code, 201)
            property_ids.append(response.data["id"])

        properties = self.client.get(
            f"/api/accommodation/provider-listings/?business={business.id}"
        )
        self.assertEqual(properties.status_code, 200)
        self.assertEqual(
            {row["title"] for row in properties.data},
            {"Dune Camp", "North Lodge", "South Guesthouse"},
        )

        listing_id = property_ids[0]
        room_create = self.client.post(
            f"/api/accommodation/provider-listings/{listing_id}/rooms/",
            {
                "name": "Deluxe Room",
                "description": "Interchangeable deluxe inventory.",
                "quantity_available": 2,
                "max_guests": 2,
                "bedrooms": 1,
                "bed_summary": "1 king bed",
                "price_per_night": "1200.00",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(room_create.status_code, 201)
        room_id = room_create.data["id"]
        self.assertEqual(room_create.data["quantity_available"], 2)

        check_in = date.today() + timedelta(days=45)
        check_out = check_in + timedelta(days=2)
        self.client.force_authenticate(user=self.traveler)
        first = self.client.post(
            "/api/accommodation/bookings/",
            {
                "listing": listing_id,
                "room_type": room_id,
                "check_in": check_in.isoformat(),
                "check_out": check_out.isoformat(),
                "guests": 2,
            },
            format="json",
        )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.data["room_type"], room_id)
        self.assertEqual(first.data["room_type_name"], "Deluxe Room")

        self.client.force_authenticate(user=self.host)
        renamed = self.client.patch(
            f"/api/accommodation/provider-listings/{listing_id}/rooms/{room_id}/",
            {"name": "Deluxe King"},
            format="json",
        )
        self.assertEqual(renamed.status_code, 200)
        self.assertEqual(renamed.data["id"], room_id)

        self.client.force_authenticate(user=self.traveler)
        second = self.client.post(
            "/api/accommodation/bookings/",
            {
                "listing": listing_id,
                "room_type": room_id,
                "check_in": check_in.isoformat(),
                "check_out": check_out.isoformat(),
                "guests": 1,
            },
            format="json",
        )
        self.assertEqual(second.status_code, 201)
        self.assertEqual(second.data["room_type"], room_id)
        self.assertEqual(second.data["room_type_name"], "Deluxe King")

        sold_out = self.client.post(
            "/api/accommodation/bookings/",
            {
                "listing": listing_id,
                "room_type": room_id,
                "check_in": check_in.isoformat(),
                "check_out": check_out.isoformat(),
                "guests": 1,
            },
            format="json",
        )
        self.assertEqual(sold_out.status_code, 400)

        first_detail = self.client.get(f"/api/accommodation/bookings/{first.data['id']}/")
        self.assertEqual(first_detail.data["room_type"], room_id)
        self.assertEqual(first_detail.data["room_type_name"], "Deluxe Room")

        calendar_date = check_out + timedelta(days=5)
        self.client.force_authenticate(user=self.host)
        calendar = self.client.put(
            f"/api/accommodation/provider-listings/{listing_id}/calendar/",
            {
                "room_type": room_id,
                "date": calendar_date.isoformat(),
                "is_available": False,
                "note": "Maintenance",
            },
            format="json",
        )
        self.assertEqual(calendar.status_code, 200)

        self.client.force_authenticate(user=self.traveler)
        unavailable = self.client.get(
            f"/api/accommodation/listings/{listing_id}/availability/"
            f"?room_type={room_id}&check_in={calendar_date.isoformat()}"
            f"&check_out={(calendar_date + timedelta(days=1)).isoformat()}&guests=1"
        )
        self.assertEqual(unavailable.status_code, 200)
        self.assertFalse(unavailable.data["available"])

        self.client.force_authenticate(user=self.host)
        protected_delete = self.client.delete(
            f"/api/accommodation/provider-listings/{listing_id}/rooms/{room_id}/"
        )
        self.assertEqual(protected_delete.status_code, 409)
        deactivate = self.client.patch(
            f"/api/accommodation/provider-listings/{listing_id}/rooms/{room_id}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(deactivate.status_code, 200)
        self.assertFalse(deactivate.data["is_active"])

    def test_pending_hold_expires_releases_inventory_and_preserves_snapshots(self):
        check_in = date.today() + timedelta(days=80)
        check_out = check_in + timedelta(days=2)
        created_after = timezone.now()
        self.client.force_authenticate(user=self.traveler)
        first = self.client.post(
            "/api/accommodation/bookings/",
            {
                "listing": self.listing.id,
                "check_in": check_in.isoformat(),
                "check_out": check_out.isoformat(),
                "guests": 2,
            },
            format="json",
        )
        self.assertEqual(first.status_code, 201)
        first_booking = AccommodationBooking.objects.get(pk=first.data["id"])
        self.assertGreater(
            first_booking.hold_expires_at,
            created_after + timedelta(hours=23),
        )
        self.assertLess(
            first_booking.hold_expires_at,
            created_after + timedelta(hours=25),
        )
        self.assertEqual(first.data["listing_title_snapshot"], "Dune Camp")
        self.assertEqual(first.data["room_snapshot"]["price_per_night"], "900.00")
        self.assertEqual(
            first.data["nightly_price_snapshot"],
            [
                {"date": check_in.isoformat(), "price": "900.00"},
                {
                    "date": (check_in + timedelta(days=1)).isoformat(),
                    "price": "900.00",
                },
            ],
        )

        self.listing.title = "Renamed Dune Camp"
        self.listing.price_per_night = "1400.00"
        self.listing.save(update_fields=["title", "price_per_night"])
        detail = self.client.get(f"/api/accommodation/bookings/{first_booking.id}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["listing_title"], "Dune Camp")
        self.assertEqual(detail.data["total_price"], "1800.00")
        self.assertEqual(detail.data["room_snapshot"]["price_per_night"], "900.00")

        AccommodationBooking.objects.filter(pk=first_booking.pk).update(
            hold_expires_at=timezone.now() - timedelta(seconds=1)
        )
        availability = self.client.get(
            f"/api/accommodation/listings/{self.listing.id}/availability/"
            f"?check_in={check_in.isoformat()}&check_out={check_out.isoformat()}&guests=2"
        )
        self.assertEqual(availability.status_code, 200)
        self.assertTrue(availability.data["available"])

        replacement = self.client.post(
            "/api/accommodation/bookings/",
            {
                "listing": self.listing.id,
                "check_in": check_in.isoformat(),
                "check_out": check_out.isoformat(),
                "guests": 2,
            },
            format="json",
        )
        self.assertEqual(replacement.status_code, 201)
        first_booking.refresh_from_db()
        self.assertEqual(first_booking.status, BookingStatus.EXPIRED)
        self.assertIsNotNone(first_booking.expired_at)

        cancelled = self.client.post(
            f"/api/accommodation/bookings/{replacement.data['id']}/cancel/",
            {},
            format="json",
        )
        self.assertEqual(cancelled.status_code, 200)
        after_cancel = self.client.post(
            "/api/accommodation/bookings/",
            {
                "listing": self.listing.id,
                "check_in": check_in.isoformat(),
                "check_out": check_out.isoformat(),
                "guests": 1,
            },
            format="json",
        )
        self.assertEqual(after_cancel.status_code, 201)

    def test_confirmation_sets_payment_deadline_and_payment_makes_hold_permanent(self):
        check_in = date.today() + timedelta(days=90)
        check_out = check_in + timedelta(days=1)
        self.client.force_authenticate(user=self.traveler)
        requested = self.client.post(
            "/api/accommodation/bookings/",
            {
                "listing": self.listing.id,
                "check_in": check_in.isoformat(),
                "check_out": check_out.isoformat(),
                "guests": 1,
            },
            format="json",
        )
        self.assertEqual(requested.status_code, 201)
        booking_id = requested.data["id"]

        confirmed_after = timezone.now()
        self.client.force_authenticate(user=self.host)
        confirmed = self.client.post(
            f"/api/accommodation/provider-bookings/{booking_id}/confirm/",
            {},
            format="json",
        )
        self.assertEqual(confirmed.status_code, 200)
        payment_deadline = AccommodationBooking.objects.get(pk=booking_id).hold_expires_at
        self.assertGreater(payment_deadline, confirmed_after + timedelta(minutes=29))
        self.assertLess(payment_deadline, confirmed_after + timedelta(minutes=31))

        self.client.force_authenticate(user=self.traveler)
        paid = self.client.post(
            f"/api/accommodation/bookings/{booking_id}/mock_pay/",
            {},
            format="json",
        )
        self.assertEqual(paid.status_code, 200)
        paid_booking = AccommodationBooking.objects.get(pk=booking_id)
        self.assertIsNotNone(paid_booking.paid_at)
        self.assertIsNone(paid_booking.hold_expires_at)

    def test_expired_request_cannot_be_confirmed(self):
        check_in = date.today() + timedelta(days=100)
        check_out = check_in + timedelta(days=1)
        self.client.force_authenticate(user=self.traveler)
        requested = self.client.post(
            "/api/accommodation/bookings/",
            {
                "listing": self.listing.id,
                "check_in": check_in.isoformat(),
                "check_out": check_out.isoformat(),
                "guests": 1,
            },
            format="json",
        )
        self.assertEqual(requested.status_code, 201)
        AccommodationBooking.objects.filter(pk=requested.data["id"]).update(
            hold_expires_at=timezone.now() - timedelta(seconds=1)
        )

        self.client.force_authenticate(user=self.host)
        confirm = self.client.post(
            f"/api/accommodation/provider-bookings/{requested.data['id']}/confirm/",
            {},
            format="json",
        )
        self.assertEqual(confirm.status_code, 409)
        booking = AccommodationBooking.objects.get(pk=requested.data["id"])
        self.assertEqual(booking.status, BookingStatus.EXPIRED)

    def test_booking_rechecks_inventory_inside_creation_transaction(self):
        check_in = date.today() + timedelta(days=110)
        check_out = check_in + timedelta(days=1)
        before = AccommodationBooking.objects.count()
        self.client.force_authenticate(user=self.traveler)
        with patch(
            "accommodation.serializers.find_overlapping_booking",
            side_effect=[None, self.booking],
        ) as overlap_check:
            response = self.client.post(
                "/api/accommodation/bookings/",
                {
                    "listing": self.listing.id,
                    "check_in": check_in.isoformat(),
                    "check_out": check_out.isoformat(),
                    "guests": 1,
                },
                format="json",
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(overlap_check.call_count, 2)
        self.assertEqual(AccommodationBooking.objects.count(), before)

    def test_publication_status_tracks_verification_and_visibility(self):
        self.client.force_authenticate(user=self.host)
        detail_url = f"/api/accommodation/provider-listings/{self.listing.pk}/"

        live = self.client.get(detail_url)
        self.assertEqual(live.status_code, 200)
        self.assertEqual(live.data["publication_status"], "live")
        self.assertEqual(live.data["publication_status_label"], "Live")
        self.client.force_authenticate(user=None)
        self.assertEqual(
            self.client.get(f"/api/accommodation/listings/{self.listing.pk}/").status_code,
            200,
        )

        self.business.verification_status = VerificationStatus.PENDING
        self.business.save(update_fields=["verification_status"])
        self.client.force_authenticate(user=self.host)
        pending = self.client.get(detail_url)
        self.assertEqual(pending.data["publication_status"], "pending_verification")
        self.client.force_authenticate(user=None)
        self.assertEqual(
            self.client.get(f"/api/accommodation/listings/{self.listing.pk}/").status_code,
            404,
        )

        self.business.verification_status = VerificationStatus.SUSPENDED
        self.business.save(update_fields=["verification_status"])
        self.client.force_authenticate(user=self.host)
        suspended = self.client.get(detail_url)
        self.assertEqual(suspended.data["publication_status"], "suspended")
        self.client.force_authenticate(user=None)
        self.assertEqual(
            self.client.get(f"/api/accommodation/listings/{self.listing.pk}/").status_code,
            404,
        )

        self.business.verification_status = VerificationStatus.VERIFIED
        self.business.save(update_fields=["verification_status"])
        self.listing.is_active = False
        self.listing.save(update_fields=["is_active"])
        self.client.force_authenticate(user=self.host)
        draft = self.client.get(detail_url)
        self.assertEqual(draft.data["publication_status"], "draft")
        self.client.force_authenticate(user=None)
        self.assertEqual(
            self.client.get(f"/api/accommodation/listings/{self.listing.pk}/").status_code,
            404,
        )

    def test_provider_analytics_includes_occupancy_rooms_and_expiring_alerts(self):
        room = AccommodationRoomType.objects.create(
            listing=self.listing,
            name="Desert suite",
            quantity_available=2,
            max_guests=2,
            bedrooms=1,
            price_per_night="900.00",
        )
        today = date.today()
        completed = AccommodationBooking.objects.create(
            listing=self.listing,
            room_type=room,
            room_type_name=room.name,
            guest=self.traveler,
            check_in=today - timedelta(days=2),
            check_out=today,
            guests=2,
            total_price="1800.00",
            nightly_price_snapshot=[
                {"date": (today - timedelta(days=2)).isoformat(), "price": "900.00"},
                {"date": (today - timedelta(days=1)).isoformat(), "price": "900.00"},
            ],
            status=BookingStatus.CHECKED_OUT,
            mock_payment_ref="mock_analytics_paid",
            paid_at=timezone.now(),
        )
        expiring = AccommodationBooking.objects.create(
            listing=self.listing,
            room_type=room,
            room_type_name=room.name,
            guest=self.traveler,
            check_in=today + timedelta(days=15),
            check_out=today + timedelta(days=16),
            guests=1,
            total_price="900.00",
            status=BookingStatus.PENDING,
            hold_expires_at=timezone.now() + timedelta(minutes=45),
        )

        self.client.force_authenticate(user=self.host)
        response = self.client.get(
            f"/api/accommodation/provider-analytics/?days=30&business={self.business.pk}"
        )
        self.assertEqual(response.status_code, 200)
        self.assertGreater(response.data["occupancy_rate"], 0)
        self.assertEqual(response.data["occupied_room_nights"], 2)
        self.assertEqual(len(response.data["occupancy_revenue_trend"]), 30)
        room_row = next(
            row for row in response.data["room_performance"] if row["room_id"] == room.pk
        )
        self.assertEqual(room_row["bookings"], 1)
        self.assertEqual(room_row["booked_nights"], 2)
        self.assertEqual(room_row["revenue"], 1800.0)
        self.assertTrue(
            any(row["id"] == expiring.pk for row in response.data["expiring_requests"])
        )
        self.assertTrue(
            any(row["revenue"] == 900.0 for row in response.data["occupancy_revenue_trend"])
        )
        self.assertEqual(completed.room_type_id, room.pk)
