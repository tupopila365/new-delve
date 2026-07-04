"""Phase 6 — Delve Admin guide verification and marketplace aggregation."""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import (
    BusinessProfile,
    BusinessVerificationDocument,
    Profile,
    UserType,
    VerificationDocumentStatus,
    VerificationDocumentType,
    VerificationStatus,
)
from guides.models import GuideBooking, TourGuideProfile

User = get_user_model()


class PlatformAdminGuideTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="platform_admin_guide",
            email="admin_guide@test.local",
            password="pass12345",
            is_staff=True,
        )
        Profile.objects.filter(user=self.admin).update(email_verified=True)

        self.provider = User.objects.create_user(
            username="guide_verify",
            email="gv_guide@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.provider).update(user_type=UserType.SERVICE_PROVIDER)
        self.business = BusinessProfile.objects.create(
            owner=self.provider,
            slug="verify-guide",
            business_name="Verify Guide Co",
            business_types=["guide"],
            verification_status=VerificationStatus.PENDING,
            city="Swakopmund",
            region="Erongo",
        )
        BusinessVerificationDocument.objects.create(
            business=self.business,
            doc_type=VerificationDocumentType.BUSINESS_REGISTRATION,
            file="https://example.com/registration.pdf",
            status=VerificationDocumentStatus.PENDING,
        )
        BusinessVerificationDocument.objects.create(
            business=self.business,
            doc_type=VerificationDocumentType.TOUR_GUIDE_LICENSE,
            file="https://example.com/guide-license.pdf",
            status=VerificationDocumentStatus.PENDING,
        )
        BusinessVerificationDocument.objects.create(
            business=self.business,
            doc_type=VerificationDocumentType.FIRST_AID_CERT,
            file="https://example.com/first-aid.pdf",
            status=VerificationDocumentStatus.PENDING,
        )
        self.guide = TourGuideProfile.objects.create(
            user=self.provider,
            headline="Admin Test Guide",
            regions=["Erongo"],
            hourly_rate=Decimal("400.00"),
            licensed_guide=True,
            is_active=True,
        )
        self.traveler = User.objects.create_user(
            username="guide_booking_guest",
            email="guide_booking_guest@test.local",
            password="pass12345",
        )
        self.booking = GuideBooking.objects.create(
            guide=self.guide,
            client=self.traveler,
            date=(timezone.now() + timedelta(days=2)).date(),
            duration_hours=4,
            group_size=2,
            total_price="1600.00",
            status="pending",
        )

    def test_pending_guide_business_in_admin_queue(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/accounts/admin/businesses/?status=pending")
        self.assertEqual(res.status_code, 200)
        row = next((b for b in res.data if b["id"] == self.business.pk), None)
        self.assertIsNotNone(row)
        self.assertIn("guide", row["business_types"])

    def test_guide_documents_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f"/api/accounts/admin/businesses/{self.business.pk}/documents/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["business"]["id"], self.business.pk)
        doc_types = {d["doc_type"] for d in res.data["documents"]}
        self.assertIn("business_registration", doc_types)
        self.assertIn("tour_guide_license", doc_types)
        self.assertIn("first_aid_cert", doc_types)

    def test_admin_listings_include_guide(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/accounts/admin/listings/")
        self.assertEqual(res.status_code, 200)
        guide_ids = [row["listing_id"] for row in res.data if row["listing_type"] == "guide"]
        self.assertIn(self.guide.pk, guide_ids)

    def test_overview_counts_guide_listings_and_bookings(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/accounts/admin/overview/")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.data["listings_guides"], 1)
        self.assertGreaterEqual(res.data["bookings_guides"], 1)

    def test_verify_guide_business(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f"/api/accounts/admin/businesses/{self.business.pk}/verification/",
            {"verification_status": "verified"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.business.refresh_from_db()
        self.assertEqual(self.business.verification_status, VerificationStatus.VERIFIED)
