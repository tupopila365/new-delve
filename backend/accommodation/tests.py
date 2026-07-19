from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Profile, UserType

from .models import (
    AccommodationBooking,
    AccommodationListing,
    AccommodationListingSave,
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
            check_in=today,
            check_out=today + timedelta(days=2),
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
        )
        res = self.client.get(f"/api/accommodation/listings/{self.listing.pk}/moments/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["body"], "Sunset from the deck")
        self.assertEqual(res.data[0]["listing"]["id"], self.listing.pk)


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
        )

    def test_provider_analytics(self):
        self.client.force_authenticate(user=self.host)
        res = self.client.get("/api/accommodation/provider-analytics/?days=30")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["confirmed_bookings"], 1)
        self.assertEqual(res.data["on_platform_revenue"], 2400.0)
        self.assertEqual(len(res.data["listings"]), 1)
        self.assertEqual(res.data["listings"][0]["revenue"], 2400.0)


class AccommodationPhase6HardeningTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.host = User.objects.create_user(
            username="phase6_host", email="phase6_host@test.local", password="pass12345"
        )
        Profile.objects.filter(user=self.host).update(user_type=UserType.SERVICE_PROVIDER)
        self.host.profile.refresh_from_db()
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
