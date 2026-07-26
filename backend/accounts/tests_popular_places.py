"""Usage-ranked Explore place recommendations + Phase 2 engagement signals."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accommodation.models import AccommodationListing
from accounts.models import ExplorePlacePin, PlaceSignal, PlaceSignalKind, PopularPlace, Profile, UserType
from accounts.popular_places import (
    CHIP_CLICK_WEIGHT,
    LISTING_WEIGHT,
    record_place_signal,
    refresh_popular_places,
)

User = get_user_model()


class RecommendedPlacesApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="place_owner",
            email="place-owner@test.local",
            password="Pass12345!",
        )
        Profile.objects.filter(user=self.owner).update(
            user_type=UserType.SERVICE_PROVIDER,
            email_verified=True,
        )

    def test_requires_country(self):
        res = self.client.get("/api/explore/recommended-places/")
        self.assertEqual(res.status_code, 400)

    def test_ranks_listing_dense_city_first(self):
        for i in range(3):
            AccommodationListing.objects.create(
                owner=self.owner,
                title=f"Windhoek Stay {i}",
                description="x",
                property_type="hotel",
                country_code="NA",
                region="Khomas",
                city="Windhoek",
                price_per_night="500.00",
                is_active=True,
                latitude=-22.56,
                longitude=17.06,
            )
        AccommodationListing.objects.create(
            owner=self.owner,
            title="Coast Stay",
            description="x",
            property_type="guesthouse",
            country_code="NA",
            region="Erongo",
            city="Swakopmund",
            price_per_night="400.00",
            is_active=True,
            latitude=-22.67,
            longitude=14.52,
        )

        written = refresh_popular_places(country="NA")
        self.assertGreater(written, 0)

        res = self.client.get("/api/explore/recommended-places/?country=NA&limit=6")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["country"], "NA")
        places = res.data["places"]
        self.assertGreaterEqual(len(places), 1)
        self.assertEqual(places[0]["label"], "Windhoek")
        self.assertGreater(places[0]["score"], 0)
        self.assertIn("latitude", places[0])
        self.assertIn("longitude", places[0])
        self.assertIn("chip_click_count", places[0])
        self.assertIn("search_count", places[0])
        self.assertIn("is_pinned", places[0])
        self.assertFalse(places[0]["is_pinned"])

        cached = PopularPlace.objects.filter(country_code="NA").order_by("rank")
        self.assertEqual(cached.first().label, "Windhoek")

    def test_falls_back_to_presets_when_empty(self):
        res = self.client.get("/api/explore/recommended-places/?country=NA&limit=3")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["places"]), 3)
        self.assertEqual(res.data["places"][0]["label"], "Windhoek")


class ExplorePlacePinTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="pin_admin",
            email="pin-admin@test.local",
            password="Pass12345!",
            is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_pin_appears_before_usage_ranking(self):
        owner = User.objects.create_user(
            username="pin_owner",
            email="pin-owner@test.local",
            password="Pass12345!",
        )
        Profile.objects.filter(user=owner).update(
            user_type=UserType.SERVICE_PROVIDER,
            email_verified=True,
        )
        for i in range(3):
            AccommodationListing.objects.create(
                owner=owner,
                title=f"Windhoek Stay {i}",
                description="x",
                property_type="hotel",
                country_code="NA",
                region="Khomas",
                city="Windhoek",
                price_per_night="500.00",
                is_active=True,
                latitude=-22.56,
                longitude=17.06,
            )
        refresh_popular_places(country="NA")

        create = self.client.post(
            "/api/accounts/admin/explore-place-pins/",
            {"country": "NA", "label": "Etosha", "is_active": True},
            format="json",
        )
        self.assertEqual(create.status_code, 201)

        res = self.client.get("/api/explore/recommended-places/?country=NA&limit=6")
        self.assertEqual(res.status_code, 200)
        places = res.data["places"]
        self.assertEqual(places[0]["label"], "Etosha")
        self.assertTrue(places[0]["is_pinned"])
        self.assertEqual(places[1]["label"], "Windhoek")
        self.assertFalse(places[1]["is_pinned"])

    def test_max_two_active_pins(self):
        for label in ("Etosha", "Sossusvlei"):
            res = self.client.post(
                "/api/accounts/admin/explore-place-pins/",
                {"country": "NA", "label": label, "is_active": True},
                format="json",
            )
            self.assertEqual(res.status_code, 201)
        third = self.client.post(
            "/api/accounts/admin/explore-place-pins/",
            {"country": "NA", "label": "Swakopmund", "is_active": True},
            format="json",
        )
        self.assertEqual(third.status_code, 400)
        self.assertEqual(ExplorePlacePin.objects.filter(country_code="NA", is_active=True).count(), 2)

    def test_staff_required(self):
        traveller = User.objects.create_user(
            username="pin_traveller",
            email="pin-traveller@test.local",
            password="Pass12345!",
        )
        self.client.force_authenticate(user=traveller)
        res = self.client.get("/api/accounts/admin/explore-place-pins/?country=NA")
        self.assertIn(res.status_code, (403, 401))


class PlaceSignalApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_records_chip_click(self):
        res = self.client.post(
            "/api/explore/place-signals/",
            {"country": "NA", "label": "Swakopmund", "kind": "chip_click"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data.get("ok"))
        self.assertEqual(PlaceSignal.objects.count(), 1)
        sig = PlaceSignal.objects.get()
        self.assertEqual(sig.country_code, "NA")
        self.assertEqual(sig.label, "Swakopmund")
        self.assertEqual(sig.kind, PlaceSignalKind.CHIP_CLICK)

    def test_rejects_bad_kind(self):
        res = self.client.post(
            "/api/explore/place-signals/",
            {"country": "NA", "label": "Windhoek", "kind": "browse"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_ignores_near_me(self):
        res = self.client.post(
            "/api/explore/place-signals/",
            {"country": "NA", "label": "Near me", "kind": "near_point"},
            format="json",
        )
        self.assertEqual(res.status_code, 202)
        self.assertEqual(PlaceSignal.objects.count(), 0)

    def test_signals_boost_rank_over_listings(self):
        """Enough chip clicks can outrank a city with more listings."""
        owner = User.objects.create_user(
            username="sig_owner",
            email="sig-owner@test.local",
            password="Pass12345!",
        )
        Profile.objects.filter(user=owner).update(
            user_type=UserType.SERVICE_PROVIDER,
            email_verified=True,
        )
        for i in range(2):
            AccommodationListing.objects.create(
                owner=owner,
                title=f"Windhoek Stay {i}",
                description="x",
                property_type="hotel",
                country_code="NA",
                region="Khomas",
                city="Windhoek",
                price_per_night="500.00",
                is_active=True,
                latitude=-22.56,
                longitude=17.06,
            )
        AccommodationListing.objects.create(
            owner=owner,
            title="Coast Stay",
            description="x",
            property_type="guesthouse",
            country_code="NA",
            region="Erongo",
            city="Swakopmund",
            price_per_night="400.00",
            is_active=True,
            latitude=-22.67,
            longitude=14.52,
        )
        # Windhoek listings: 2 * 3 = 6. Swakopmund: 1 * 3 = 3.
        # 4 chip clicks on Swakopmund: 4 * 2 = 8 → total 11 > Windhoek 6.
        for _ in range(4):
            record_place_signal(country="NA", label="Swakopmund", kind="chip_click")

        refresh_popular_places(country="NA")
        res = self.client.get("/api/explore/recommended-places/?country=NA&limit=6")
        self.assertEqual(res.status_code, 200)
        places = res.data["places"]
        self.assertEqual(places[0]["label"], "Swakopmund")
        self.assertEqual(places[0]["chip_click_count"], 4)
        self.assertEqual(
            places[0]["score"],
            1 * LISTING_WEIGHT + 4 * CHIP_CLICK_WEIGHT,
        )
