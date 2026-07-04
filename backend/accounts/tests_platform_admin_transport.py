"""Phase 7 — Delve Admin transport verification and marketplace aggregation."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import (
    BusinessProfile,
    BusinessVerificationDocument,
    BusinessType,
    Profile,
    UserType,
    VerificationDocumentStatus,
    VerificationDocumentType,
    VerificationStatus,
)
from transport.models import BusOperator, BusRoute, BusTrip, VehicleRentalListing

User = get_user_model()


class PlatformAdminTransportTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="platform_admin",
            email="admin@test.local",
            password="pass12345",
            is_staff=True,
        )
        Profile.objects.filter(user=self.admin).update(email_verified=True)

        self.provider = User.objects.create_user(
            username="transport_verify",
            email="tv@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.provider).update(user_type=UserType.SERVICE_PROVIDER)
        self.business = BusinessProfile.objects.create(
            owner=self.provider,
            slug="verify-transport",
            business_name="Verify Transport Co",
            business_types=[BusinessType.TRANSPORT],
            transport_modes=["rental", "shared"],
            verification_status=VerificationStatus.PENDING,
            city="Windhoek",
            region="Khomas",
        )
        BusinessVerificationDocument.objects.create(
            business=self.business,
            doc_type=VerificationDocumentType.OPERATING_PERMIT,
            file="https://example.com/permit.pdf",
            status=VerificationDocumentStatus.PENDING,
        )
        self.vehicle = VehicleRentalListing.objects.create(
            owner=self.provider,
            title="Admin Test Hilux",
            make="Toyota",
            model="Hilux",
            year=2021,
            transmission="manual",
            seats=5,
            vehicle_type="4x4",
            price_per_day="800.00",
            region="Khomas",
            city="Windhoek",
            is_active=True,
        )
        operator = BusOperator.objects.create(owner=self.provider, name="Admin Coaches", region="Khomas")
        route = BusRoute.objects.create(operator=operator, origin="Windhoek", destination="Swakopmund")
        self.trip = BusTrip.objects.create(
            route=route,
            departs_at=timezone.now() + timedelta(days=2),
            arrives_at=timezone.now() + timedelta(days=2, hours=4),
            price="180.00",
            total_seats=32,
            is_active=True,
        )

    def test_pending_transport_business_in_admin_queue(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/accounts/admin/businesses/?status=pending")
        self.assertEqual(res.status_code, 200)
        row = next((b for b in res.data if b["id"] == self.business.pk), None)
        self.assertIsNotNone(row)
        self.assertIn("transport", row["business_types"])
        self.assertEqual(row["transport_modes"], ["rental", "shared"])

    def test_transport_documents_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f"/api/accounts/admin/businesses/{self.business.pk}/documents/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["business"]["id"], self.business.pk)
        doc_types = {d["doc_type"] for d in res.data["documents"]}
        self.assertIn("operating_permit", doc_types)

    def test_admin_listings_include_vehicle_and_bus_trip(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/accounts/admin/listings/")
        self.assertEqual(res.status_code, 200)
        types = {row["listing_type"] for row in res.data}
        self.assertIn("vehicle", types)
        self.assertIn("bus_trip", types)
        vehicle_ids = [row["listing_id"] for row in res.data if row["listing_type"] == "vehicle"]
        trip_ids = [row["listing_id"] for row in res.data if row["listing_type"] == "bus_trip"]
        self.assertIn(self.vehicle.pk, vehicle_ids)
        self.assertIn(self.trip.pk, trip_ids)

    def test_overview_counts_vehicles_and_bus_trips(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/accounts/admin/overview/")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.data["listings_transport"], 2)

    def test_verify_transport_business(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(
            f"/api/accounts/admin/businesses/{self.business.pk}/verification/",
            {"verification_status": "verified"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.business.refresh_from_db()
        self.assertEqual(self.business.verification_status, VerificationStatus.VERIFIED)
