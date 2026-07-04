"""Business profile transport listing aggregation (Phase 4)."""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import BusinessProfile, BusinessType, Profile, UserType
from transport.models import (
    BusOperator,
    BusRoute,
    BusTrip,
    VehicleRentalListing,
)

User = get_user_model()


class BusinessTransportListingsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="transport_biz",
            email="tb@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.owner).update(user_type=UserType.SERVICE_PROVIDER)
        self.rental_business = BusinessProfile.objects.create(
            owner=self.owner,
            slug="rental-only",
            business_name="Rental Only Co",
            business_types=[BusinessType.TRANSPORT],
            transport_modes=["rental"],
            city="Windhoek",
            region="Khomas",
        )
        self.shared_business = BusinessProfile.objects.create(
            owner=self.owner,
            slug="shared-only",
            business_name="Shared Only Co",
            business_types=[BusinessType.TRANSPORT],
            transport_modes=["shared"],
            city="Windhoek",
            region="Khomas",
        )
        self.full_business = BusinessProfile.objects.create(
            owner=self.owner,
            slug="full-transport",
            business_name="Full Transport Co",
            business_types=[BusinessType.TRANSPORT],
            transport_modes=["rental", "shared"],
            city="Windhoek",
            region="Khomas",
        )
        self.vehicle = VehicleRentalListing.objects.create(
            owner=self.owner,
            title="Toyota Hilux",
            make="Toyota",
            model="Hilux",
            year=2022,
            transmission="manual",
            seats=5,
            vehicle_type="4x4",
            price_per_day="850.00",
            region="Khomas",
            city="Windhoek",
            gallery_images=["https://example.com/hilux.jpg"],
            is_active=True,
        )
        self.operator = BusOperator.objects.create(
            owner=self.owner,
            name="Namibia Link",
            region="Khomas",
        )
        self.route = BusRoute.objects.create(
            operator=self.operator,
            origin="Windhoek",
            destination="Swakopmund",
            cover_image="https://example.com/bus.jpg",
        )
        self.trip = BusTrip.objects.create(
            route=self.route,
            departs_at=timezone.now() + timedelta(days=2),
            arrives_at=timezone.now() + timedelta(days=2, hours=5),
            price=Decimal("180.00"),
            total_seats=32,
            is_active=True,
        )
        BusTrip.objects.create(
            route=self.route,
            departs_at=timezone.now() - timedelta(days=2),
            arrives_at=timezone.now() - timedelta(days=2) + timedelta(hours=5),
            price=Decimal("180.00"),
            total_seats=32,
            is_active=True,
        )

    def test_rental_only_business_lists_vehicles_not_bus_trips(self):
        res = self.client.get(f"/api/accounts/businesses/{self.rental_business.pk}/listings/")
        self.assertEqual(res.status_code, 200)
        kinds = {row.get("transport_mode") for row in res.data if row["kind"] == "transport"}
        self.assertEqual(kinds, {"rental"})
        vehicle = next(row for row in res.data if row.get("transport_mode") == "rental")
        self.assertEqual(vehicle["title"], "Toyota Hilux")
        self.assertEqual(vehicle["image"], "https://example.com/hilux.jpg")
        self.assertIn("/transport/vehicle/", vehicle["href"])

    def test_shared_only_business_lists_bus_trips_not_vehicles(self):
        res = self.client.get(f"/api/accounts/businesses/{self.shared_business.pk}/listings/")
        self.assertEqual(res.status_code, 200)
        transport_rows = [row for row in res.data if row["kind"] == "transport"]
        self.assertEqual(len(transport_rows), 1)
        self.assertEqual(transport_rows[0]["transport_mode"], "shared")
        self.assertEqual(transport_rows[0]["title"], "Windhoek → Swakopmund")
        self.assertIn("/transport/bus/", transport_rows[0]["href"])
        self.assertEqual(transport_rows[0]["image"], "https://example.com/bus.jpg")

    def test_full_transport_business_stats_include_both(self):
        res = self.client.get(f"/api/accounts/businesses/{self.full_business.pk}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["stats"]["listings_count"], 2)

    def test_full_transport_business_lists_rental_and_shared(self):
        res = self.client.get(f"/api/accounts/businesses/{self.full_business.pk}/listings/")
        self.assertEqual(res.status_code, 200)
        modes = {row.get("transport_mode") for row in res.data if row["kind"] == "transport"}
        self.assertEqual(modes, {"rental", "shared"})
