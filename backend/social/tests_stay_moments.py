from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accommodation.models import AccommodationBooking, AccommodationListing, BookingStatus
from social.models import Post

User = get_user_model()


class VerifiedStayMomentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.host = User.objects.create_user(
            username="moment_host", email="moment_host@test.local", password="pass12345"
        )
        self.traveller = User.objects.create_user(
            username="moment_guest", email="moment_guest@test.local", password="pass12345"
        )
        self.other = User.objects.create_user(
            username="moment_other", email="moment_other@test.local", password="pass12345"
        )
        self.listing = AccommodationListing.objects.create(
            owner=self.host,
            title="Trust Lodge",
            region="Erongo",
            city="Swakopmund",
            price_per_night="800.00",
        )
        self.other_listing = AccommodationListing.objects.create(
            owner=self.host,
            title="Second Lodge",
            region="Khomas",
            city="Windhoek",
            price_per_night="900.00",
        )
        self.client.force_authenticate(user=self.traveller)

    def booking(self, status, *, user=None, listing=None):
        return AccommodationBooking.objects.create(
            listing=listing or self.listing,
            guest=user or self.traveller,
            check_in=date.today() - timedelta(days=4),
            check_out=date.today() - timedelta(days=2),
            guests=1,
            total_price="1600.00",
            status=status,
        )

    def create_moment(self, **overrides):
        payload = {"body": "A real stay", "is_delvers": True, "listing": self.listing.pk}
        payload.update(overrides)
        return self.client.post("/api/social/posts/", payload, format="json")

    def test_only_checked_out_status_qualifies(self):
        for booking_status in (
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.CANCELLED,
            BookingStatus.EXPIRED,
            BookingStatus.REFUNDED,
        ):
            with self.subTest(status=booking_status):
                AccommodationBooking.objects.all().delete()
                self.booking(booking_status)
                response = self.create_moment()
                self.assertEqual(response.status_code, 400)
                self.assertIn("Complete a stay", str(response.data))

    def test_checked_out_booking_is_attached_and_reusable(self):
        booking = self.booking(BookingStatus.CHECKED_OUT)
        first = self.create_moment()
        second = self.create_moment(body="Another memory")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertTrue(first.data["verified_stay"])
        self.assertEqual(Post.objects.get(pk=first.data["id"]).verified_stay_booking_id, booking.pk)
        self.assertEqual(Post.objects.get(pk=second.data["id"]).verified_stay_booking_id, booking.pk)

    def test_other_users_booking_does_not_qualify(self):
        self.booking(BookingStatus.CHECKED_OUT, user=self.other)
        self.assertEqual(self.create_moment().status_code, 400)

    def test_checked_out_status_before_checkout_date_does_not_qualify(self):
        AccommodationBooking.objects.create(
            listing=self.listing,
            guest=self.traveller,
            check_in=date.today() + timedelta(days=2),
            check_out=date.today() + timedelta(days=4),
            guests=1,
            total_price="1600.00",
            status=BookingStatus.CHECKED_OUT,
        )
        response = self.create_moment()
        self.assertEqual(response.status_code, 400)
        self.assertIn("Complete a stay", str(response.data))

    def test_patch_rechecks_listing_and_unlink_clears_verification(self):
        self.booking(BookingStatus.CHECKED_OUT)
        post_id = self.create_moment().data["id"]
        blocked = self.client.patch(
            f"/api/social/posts/{post_id}/",
            {"listing": self.other_listing.pk},
            format="json",
        )
        self.assertEqual(blocked.status_code, 400)
        unlinked = self.client.patch(
            f"/api/social/posts/{post_id}/",
            {"listing": None},
            format="json",
        )
        self.assertEqual(unlinked.status_code, 200)
        self.assertFalse(unlinked.data["verified_stay"])
        self.assertIsNone(Post.objects.get(pk=post_id).verified_stay_booking_id)

    def test_plain_post_allowed_stay_highlight_and_legacy_host_story_rejected(self):
        plain = self.client.post(
            "/api/social/posts/",
            {"body": "Travel note", "is_delvers": True},
            format="json",
        )
        self.assertEqual(plain.status_code, 201)
        self.assertFalse(plain.data["verified_stay"])
        self.booking(BookingStatus.CHECKED_OUT)
        self.assertEqual(self.create_moment(is_delvers_highlight=True).status_code, 400)

        self.client.force_authenticate(user=self.host)
        legacy = self.client.post(
            "/api/social/posts/",
            {"body": "Provider update", "is_accommodation_story": True},
            format="json",
        )
        self.assertEqual(legacy.status_code, 400)
        self.assertIn("Host Highlights", str(legacy.data))

    def test_legacy_host_story_rows_are_not_exposed_on_public_profiles(self):
        legacy = Post.objects.create(
            author=self.host,
            body="Old provider story",
            is_accommodation_story=True,
            listing=self.listing,
        )
        Post.objects.create(author=self.host, body="Public profile note", is_delvers=True)
        response = self.client.get(f"/api/social/users/{self.host.username}/posts/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(any(row["id"] == legacy.pk for row in response.data))
        self.assertEqual(
            self.client.get("/api/social/accommodation-stories/").status_code,
            404,
        )

    def test_eligibility_and_moments_endpoint_are_verified_only(self):
        url = f"/api/accommodation/listings/{self.listing.pk}/moment-eligibility/"
        self.assertFalse(self.client.get(url).data["eligible"])
        booking = self.booking(BookingStatus.CHECKED_OUT)
        self.assertTrue(self.client.get(url).data["eligible"])
        verified = Post.objects.create(
            author=self.traveller,
            body="Verified",
            is_delvers=True,
            listing=self.listing,
            verified_stay_booking=booking,
        )
        Post.objects.create(
            author=self.traveller,
            body="Legacy unverified",
            is_delvers=True,
            listing=self.listing,
        )
        premature_booking = AccommodationBooking.objects.create(
            listing=self.listing,
            guest=self.traveller,
            check_in=date.today() + timedelta(days=2),
            check_out=date.today() + timedelta(days=4),
            guests=1,
            total_price="1600.00",
            status=BookingStatus.CHECKED_OUT,
        )
        premature = Post.objects.create(
            author=self.traveller,
            body="Not completed yet",
            is_delvers=True,
            listing=self.listing,
            verified_stay_booking=premature_booking,
        )
        moments = self.client.get(f"/api/accommodation/listings/{self.listing.pk}/moments/")
        self.assertEqual([row["id"] for row in moments.data], [verified.pk])
        self.assertNotIn(premature.pk, [row["id"] for row in moments.data])
        self.assertTrue(moments.data[0]["verified_stay"])
