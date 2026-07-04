"""Food venue model parity and provider dashboard API tests."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import UserType
from food.models import CuisineType, FoodVenue

User = get_user_model()


class FoodVenueDetailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="food_owner",
            email="food_owner@test.local",
            password="pass12345",
        )
        self.owner.profile.user_type = UserType.SERVICE_PROVIDER
        self.owner.profile.save()
        self.venue = FoodVenue.objects.create(
            owner=self.owner,
            name="River Cafe",
            description="Riverside brunch.",
            tagline="Coffee with a view",
            popular_dish="Eggs benedict",
            cuisine=CuisineType.CAFE,
            region="Khomas",
            city="Windhoek",
            phone="+264 61 000 1111",
            dine_in=True,
            takeaway=True,
            is_open=True,
            amenities=["Wi‑Fi"],
        )

    def test_public_detail_includes_extended_fields(self):
        res = self.client.get(f"/api/food/venues/{self.venue.pk}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["tagline"], "Coffee with a view")
        self.assertEqual(res.data["popular_dish"], "Eggs benedict")
        self.assertTrue(res.data["takeaway"])
        self.assertEqual(res.data["amenities"], ["Wi‑Fi"])
        self.assertEqual(res.data["owner_username"], "food_owner")


MINIMAL_JPEG = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c"
    b"\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c"
    b" $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x11\x08\x00\x01"
    b"\x00\x01\x03\x01\"\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x15\x00\x01\x01"
    b"\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xff\xc4\x00"
    b"\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
    b"\xff\xda\x00\x0c\x03\x01\x00\x02\x00\x03\x00\x00\x00\x01\xff\xd9"
)


class ProviderFoodVenueApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="food_owner",
            email="food_owner@test.local",
            password="pass12345",
        )
        self.owner.profile.user_type = UserType.SERVICE_PROVIDER
        self.owner.profile.save()
        self.other = User.objects.create_user(
            username="other_provider",
            email="other@test.local",
            password="pass12345",
        )
        self.other.profile.user_type = UserType.SERVICE_PROVIDER
        self.other.profile.save()
        self.venue = FoodVenue.objects.create(
            owner=self.owner,
            name="Existing Venue",
            region="Khomas",
            city="Windhoek",
            is_active=False,
        )

    def test_provider_lists_own_venues_including_inactive(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.get("/api/food/provider-venues/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["name"], "Existing Venue")
        self.assertFalse(res.data[0]["is_active"])

    def test_provider_can_create_venue(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.post(
            "/api/food/provider-venues/",
            {
                "name": "New Spot",
                "description": "Tacos and tunes",
                "cuisine": CuisineType.LOCAL,
                "region": "Erongo",
                "city": "Swakopmund",
                "price_level": 2,
                "tagline": "Beach tacos",
                "dine_in": True,
                "cover_image_url": "https://cdn.example/food.jpg",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["name"], "New Spot")
        self.assertEqual(res.data["tagline"], "Beach tacos")
        venue = FoodVenue.objects.get(pk=res.data["id"])
        self.assertTrue(venue.photos)
        self.assertEqual(venue.photos[0]["image"], "https://cdn.example/food.jpg")

    def test_provider_can_patch_own_venue(self):
        self.client.force_authenticate(user=self.owner)
        res = self.client.patch(
            f"/api/food/provider-venues/{self.venue.pk}/",
            {"tagline": "Updated tagline", "reservations": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["tagline"], "Updated tagline")
        self.assertTrue(res.data["reservations"])

    def test_other_provider_cannot_patch_venue(self):
        self.client.force_authenticate(user=self.other)
        res = self.client.patch(
            f"/api/food/provider-venues/{self.venue.pk}/",
            {"tagline": "Hijacked"},
            format="json",
        )
        self.assertEqual(res.status_code, 404)

    def test_provider_can_save_venue_stories(self):
        self.client.force_authenticate(user=self.owner)
        stories = [
            {
                "id": "specials",
                "label": "Weekend specials",
                "coverSrc": "https://cdn.example/specials.jpg",
                "slides": [
                    {
                        "src": "https://cdn.example/specials.jpg",
                        "headline": "Two-for-one tapas",
                        "sub": "Fridays from 5pm",
                    }
                ],
            }
        ]
        res = self.client.patch(
            f"/api/food/provider-venues/{self.venue.pk}/",
            {"venue_stories": stories, "is_active": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["venue_stories"]), 1)
        self.assertEqual(res.data["venue_stories"][0]["label"], "Weekend specials")
        self.venue.refresh_from_db()
        self.assertEqual(self.venue.venue_stories[0]["slides"][0]["headline"], "Two-for-one tapas")

        detail = self.client.get(f"/api/food/venues/{self.venue.pk}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(len(detail.data["venue_stories"]), 1)

    def test_provider_can_upload_cover_image(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        image = SimpleUploadedFile("cover.jpg", MINIMAL_JPEG, content_type="image/jpeg")
        self.client.force_authenticate(user=self.owner)
        res = self.client.patch(
            f"/api/food/provider-venues/{self.venue.pk}/",
            {"cover_image": image},
            format="multipart",
        )
        self.assertEqual(res.status_code, 200)
        self.venue.refresh_from_db()
        self.assertTrue(self.venue.cover_image)
        self.assertTrue(self.venue.photos)
        self.assertTrue(self.venue.photos[0].get("is_cover"))

    def test_provider_can_upload_gallery_images(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        f1 = SimpleUploadedFile("g1.jpg", MINIMAL_JPEG, content_type="image/jpeg")
        f2 = SimpleUploadedFile("g2.jpg", MINIMAL_JPEG, content_type="image/jpeg")
        self.client.force_authenticate(user=self.owner)
        res = self.client.patch(
            f"/api/food/provider-venues/{self.venue.pk}/",
            {"gallery_images": [f1, f2]},
            format="multipart",
        )
        self.assertEqual(res.status_code, 200)
        self.venue.refresh_from_db()
        self.assertGreaterEqual(len(self.venue.photos), 2)
