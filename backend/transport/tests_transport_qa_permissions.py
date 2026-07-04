"""Phase 5 — transport Q&A and team permission tests."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import BusinessMembership, BusinessProfile, BusinessTeamRole, Profile, UserType
from transport.models import (
    BusOperator,
    BusRoute,
    BusTrip,
    VehicleQuestion,
    VehicleRentalListing,
)

User = get_user_model()


class TransportQaPermissionTests:
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="tp_qa_owner",
            email="owner@tpqa.local",
            password="pass12345",
        )
        Profile.objects.filter(user=self.owner).update(user_type=UserType.SERVICE_PROVIDER)
        self.business = BusinessProfile.objects.create(
            owner=self.owner,
            slug="tp-qa-co",
            business_name="TP QA Co",
            business_types=["transport"],
            transport_modes=["rental", "shared"],
        )
        self.manager = User.objects.create_user(
            username="tp_qa_manager",
            email="mgr@tpqa.local",
            password="pass12345",
        )
        BusinessMembership.objects.create(
            business=self.business,
            user=self.manager,
            role=BusinessTeamRole.MANAGER,
        )
        self.viewer = User.objects.create_user(
            username="tp_qa_viewer",
            email="viewer@tpqa.local",
            password="pass12345",
        )
        BusinessMembership.objects.create(
            business=self.business,
            user=self.viewer,
            role=BusinessTeamRole.VIEWER,
        )
        self.guest = User.objects.create_user(
            username="tp_qa_guest",
            email="guest@tpqa.local",
            password="pass12345",
        )
        self.vehicle = VehicleRentalListing.objects.create(
            owner=self.owner,
            title="QA Hilux",
            make="Toyota",
            model="Hilux",
            year=2022,
            transmission="manual",
            seats=5,
            vehicle_type="4x4",
            price_per_day="850.00",
            region="Khomas",
            city="Windhoek",
            is_active=True,
        )
        self.operator = BusOperator.objects.create(owner=self.owner, name="QA Coaches", region="Khomas")
        self.route = BusRoute.objects.create(
            operator=self.operator,
            origin="Windhoek",
            destination="Swakopmund",
        )
        self.trip = BusTrip.objects.create(
            route=self.route,
            departs_at=timezone.now() + timedelta(days=3),
            arrives_at=timezone.now() + timedelta(days=3, hours=5),
            price="180.00",
            total_seats=30,
            is_active=True,
        )
        self.vehicle_question = VehicleQuestion.objects.create(
            listing=self.vehicle,
            author=self.guest,
            body="Is insurance included?",
        )


class TransportVehicleQaTests(TransportQaPermissionTests, __import__("django").test.TestCase):
    def test_guest_can_ask_vehicle_question(self):
        self.client.force_authenticate(user=self.guest)
        res = self.client.post(
            f"/api/transport/vehicles/{self.vehicle.id}/questions/",
            {"body": "Can I take it to Sossusvlei?"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)

    def test_manager_can_answer_vehicle_question(self):
        self.client.force_authenticate(user=self.manager)
        res = self.client.post(
            f"/api/transport/questions/{self.vehicle_question.id}/answers/",
            {"body": "Yes — full comprehensive cover is included."},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data["is_official"])

    def test_guest_cannot_answer_vehicle_question(self):
        self.client.force_authenticate(user=self.guest)
        res = self.client.post(
            f"/api/transport/questions/{self.vehicle_question.id}/answers/",
            {"body": "I think so"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_provider_inbox_includes_vehicle_question(self):
        self.client.force_authenticate(user=self.manager)
        res = self.client.get("/api/accounts/provider/listing-questions/")
        self.assertEqual(res.status_code, 200)
        categories = {row["category"] for row in res.data}
        self.assertIn("vehicle", categories)


class TransportBusQaTests(TransportQaPermissionTests, __import__("django").test.TestCase):
    def setUp(self):
        super().setUp()
        from transport.models import BusTripQuestion

        self.bus_question = BusTripQuestion.objects.create(
            trip=self.trip,
            author=self.guest,
            body="Is there a toilet on board?",
        )

    def test_manager_can_answer_bus_question(self):
        self.client.force_authenticate(user=self.manager)
        res = self.client.post(
            f"/api/transport/bus/questions/{self.bus_question.id}/answers/",
            {"body": "Yes — onboard toilet and AC."},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data["is_official"])

    def test_provider_inbox_includes_bus_question(self):
        self.client.force_authenticate(user=self.manager)
        res = self.client.get("/api/accounts/provider/listing-questions/")
        self.assertEqual(res.status_code, 200)
        categories = {row["category"] for row in res.data}
        self.assertIn("bus_trip", categories)


class TransportTeamCrudTests(TransportQaPermissionTests, __import__("django").test.TestCase):
    def test_viewer_cannot_create_vehicle(self):
        self.client.force_authenticate(user=self.viewer)
        res = self.client.post(
            "/api/transport/provider-vehicles/",
            {
                "title": "Blocked Polo",
                "make": "VW",
                "model": "Polo",
                "year": 2020,
                "transmission": "automatic",
                "seats": 5,
                "vehicle_type": "hatchback",
                "price_per_day": "400.00",
                "region": "Khomas",
                "city": "Windhoek",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_manager_can_patch_owner_vehicle(self):
        self.client.force_authenticate(user=self.manager)
        res = self.client.patch(
            f"/api/transport/provider-vehicles/{self.vehicle.id}/",
            {"title": "Manager Updated Hilux"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.title, "Manager Updated Hilux")

    def test_viewer_cannot_patch_bus_trip(self):
        self.client.force_authenticate(user=self.viewer)
        res = self.client.patch(
            f"/api/transport/provider-bus-trips/{self.trip.id}/",
            {"price": "999.00"},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_manager_can_patch_bus_trip(self):
        self.client.force_authenticate(user=self.manager)
        res = self.client.patch(
            f"/api/transport/provider-bus-trips/{self.trip.id}/",
            {"price": "195.00"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.trip.refresh_from_db()
        self.assertEqual(str(self.trip.price), "195.00")

    def test_manager_create_vehicle_owned_by_business_owner(self):
        self.client.force_authenticate(user=self.manager)
        res = self.client.post(
            "/api/transport/provider-vehicles/",
            {
                "title": "Team Polo",
                "make": "VW",
                "model": "Polo",
                "year": 2021,
                "transmission": "automatic",
                "seats": 5,
                "vehicle_type": "hatchback",
                "price_per_day": "420.00",
                "region": "Khomas",
                "city": "Windhoek",
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        created = VehicleRentalListing.objects.get(title="Team Polo")
        self.assertEqual(created.owner_id, self.owner.id)

    def test_manager_create_bus_trip_owned_by_business_owner(self):
        self.client.force_authenticate(user=self.manager)
        departs = timezone.now() + timedelta(days=10)
        arrives = departs + timedelta(hours=6)
        res = self.client.post(
            "/api/transport/provider-bus-trips/",
            {
                "route_detail": {
                    "origin": "Windhoek",
                    "destination": "Walvis Bay",
                    "operator_name": "QA Coaches",
                },
                "departs_at": departs.isoformat(),
                "arrives_at": arrives.isoformat(),
                "total_seats": 28,
                "price": "220.00",
                "amenities": ["Wi-Fi"],
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        trip = BusTrip.objects.get(route__destination="Walvis Bay")
        self.assertEqual(trip.route.operator.owner_id, self.owner.id)
