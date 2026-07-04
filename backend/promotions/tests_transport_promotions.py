"""Phase 6 — bus trip promotion targets."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import BusinessMembership, BusinessProfile, BusinessTeamRole, Profile, UserType
from promotions.models import PromotionCampaign, PromotionPlacement, PromotionStatus, PromotionTargetType
from transport.models import BusOperator, BusRoute, BusTrip, VehicleRentalListing

User = get_user_model()


class BusTripPromotionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.provider = User.objects.create_user(
            username="bus_promo_owner",
            email="buspromo@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.provider).update(user_type=UserType.SERVICE_PROVIDER)
        self.provider.profile.refresh_from_db()
        BusinessProfile.objects.create(
            owner=self.provider,
            slug="bus-promo-co",
            business_name="Bus Promo Co",
            business_types=["transport"],
            transport_modes=["shared"],
        )
        self.manager = User.objects.create_user(
            username="bus_promo_mgr",
            email="busmgr@test.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.manager).update(user_type=UserType.SERVICE_PROVIDER)
        self.manager.profile.refresh_from_db()
        biz = BusinessProfile.objects.get(owner=self.provider)
        BusinessMembership.objects.create(business=biz, user=self.manager, role=BusinessTeamRole.MANAGER)

        self.operator = BusOperator.objects.create(owner=self.provider, name="Promo Coaches", region="Khomas")
        self.route = BusRoute.objects.create(
            operator=self.operator,
            origin="Windhoek",
            destination="Walvis Bay",
            cover_image="https://example.com/bus.jpg",
        )
        self.trip = BusTrip.objects.create(
            route=self.route,
            departs_at=timezone.now() + timedelta(days=2),
            arrives_at=timezone.now() + timedelta(days=2, hours=4),
            price="200.00",
            total_seats=40,
            is_active=True,
        )
        self.vehicle = VehicleRentalListing.objects.create(
            owner=self.provider,
            title="Promo SUV",
            make="Toyota",
            model="Fortuner",
            year=2021,
            transmission="automatic",
            seats=7,
            vehicle_type="SUV",
            price_per_day="900.00",
            region="Khomas",
            city="Windhoek",
            is_active=True,
        )
        now = timezone.now()
        PromotionCampaign.objects.create(
            placement=PromotionPlacement.HOMEPAGE_TRANSPORT,
            target_type=PromotionTargetType.BUS_TRIP,
            target_id=str(self.trip.pk),
            target_label=f"{self.route.origin} → {self.route.destination}",
            starts_at=now - timedelta(hours=1),
            ends_at=now + timedelta(days=7),
            status=PromotionStatus.ACTIVE,
            priority=10,
        )

    def test_provider_listings_include_bus_trips(self):
        self.client.force_authenticate(user=self.provider)
        res = self.client.get("/api/promotions/provider/listings/")
        self.assertEqual(res.status_code, 200)
        types = {row["target_type"] for row in res.data}
        self.assertIn(PromotionTargetType.BUS_TRIP, types)
        bus_rows = [row for row in res.data if row["target_type"] == PromotionTargetType.BUS_TRIP]
        self.assertTrue(any(row["target_id"] == str(self.trip.pk) for row in bus_rows))

    def test_team_manager_can_list_bus_trip_for_promotions(self):
        self.client.force_authenticate(user=self.manager)
        res = self.client.get("/api/promotions/provider/listings/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(
            any(
                row["target_type"] == PromotionTargetType.BUS_TRIP and row["target_id"] == str(self.trip.pk)
                for row in res.data
            )
        )

    def test_validate_bus_trip_target(self):
        from promotions.services import validate_target_listing

        ok, label, err = validate_target_listing(PromotionTargetType.BUS_TRIP, str(self.trip.pk))
        self.assertTrue(ok)
        self.assertIn("Windhoek", label)
        self.assertEqual(err, "")

    def test_featured_transport_includes_promoted_bus_trip(self):
        res = self.client.get("/api/promotions/featured/transport/")
        self.assertEqual(res.status_code, 200)
        trip_ids = [row["id"] for row in res.data if row.get("route_detail")]
        self.assertIn(self.trip.pk, trip_ids)
        promoted = next(row for row in res.data if row.get("id") == self.trip.pk)
        self.assertTrue(promoted.get("is_featured_partner"))

    def test_homepage_transport_allows_bus_trip_target_type(self):
        from promotions.services import allowed_target_types_for_placement

        types = allowed_target_types_for_placement(PromotionPlacement.HOMEPAGE_TRANSPORT)
        self.assertIn(PromotionTargetType.BUS_TRIP, types)
        self.assertIn(PromotionTargetType.VEHICLE, types)
