"""Phase 7 — Delve Admin food verification and marketplace aggregation."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accommodation.models import BookingStatus
from accounts.models import (
    BusinessProfile,
    BusinessVerificationDocument,
    Profile,
    UserType,
    VerificationDocumentStatus,
    VerificationDocumentType,
    VerificationStatus,
)
from food.models import CuisineType, FoodReservation, FoodVenue

User = get_user_model()


class PlatformAdminFoodTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="platform_admin_food",
            email="admin_food@test.local",
            password="pass12345",
            is_staff=True,
        )
        Profile.objects.filter(user=self.admin).update(email_verified=True)

        self.provider = User.objects.create_user(
            username="food_verify",
            email="fv_food@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.provider).update(user_type=UserType.SERVICE_PROVIDER)
        self.business = BusinessProfile.objects.create(
            owner=self.provider,
            slug="verify-food",
            business_name="Verify Food Co",
            business_types=["food_drink"],
            verification_status=VerificationStatus.PENDING,
            city="Windhoek",
            region="Khomas",
        )
        BusinessVerificationDocument.objects.create(
            business=self.business,
            doc_type=VerificationDocumentType.BUSINESS_REGISTRATION,
            file="https://example.com/registration.pdf",
            status=VerificationDocumentStatus.PENDING,
        )
        BusinessVerificationDocument.objects.create(
            business=self.business,
            doc_type=VerificationDocumentType.FOOD_HANDLING_CERT,
            file="https://example.com/food-cert.pdf",
            status=VerificationDocumentStatus.PENDING,
        )
        self.venue = FoodVenue.objects.create(
            owner=self.provider,
            name="Admin Test Bistro",
            cuisine=CuisineType.GRILL,
            region="Khomas",
            city="Windhoek",
            reservations=True,
            is_active=True,
        )
        self.traveler = User.objects.create_user(
            username="food_booking_guest",
            email="food_booking_guest@test.local",
            password="pass12345",
        )
        self.reservation = FoodReservation.objects.create(
            venue=self.venue,
            guest=self.traveler,
            party_size=3,
            reserved_for=timezone.now() + timedelta(days=2),
            status=BookingStatus.PENDING,
        )

    def test_pending_food_business_in_admin_queue(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/accounts/admin/businesses/?status=pending")
        self.assertEqual(res.status_code, 200)
        row = next((b for b in res.data if b["id"] == self.business.pk), None)
        self.assertIsNotNone(row)
        self.assertIn("food_drink", row["business_types"])

    def test_food_documents_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f"/api/accounts/admin/businesses/{self.business.pk}/documents/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["business"]["id"], self.business.pk)
        doc_types = {d["doc_type"] for d in res.data["documents"]}
        self.assertIn("business_registration", doc_types)
        self.assertIn("food_handling_cert", doc_types)

    def test_admin_listings_include_food(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/accounts/admin/listings/")
        self.assertEqual(res.status_code, 200)
        food_ids = [row["listing_id"] for row in res.data if row["listing_type"] == "food"]
        self.assertIn(self.venue.pk, food_ids)

    def test_overview_counts_food_listings_and_bookings(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/accounts/admin/overview/")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.data["listings_food"], 1)
        self.assertGreaterEqual(res.data["bookings_food"], 1)

    def test_verify_food_business(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f"/api/accounts/admin/businesses/{self.business.pk}/verification/",
            {"verification_status": "verified"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.business.refresh_from_db()
        self.assertEqual(self.business.verification_status, VerificationStatus.VERIFIED)
