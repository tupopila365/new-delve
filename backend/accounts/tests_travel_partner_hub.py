from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from accounts.models import BusinessProfile, Profile, TravelOffer, UserType, VerificationStatus

User = get_user_model()


class TravelPartnerHubTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="hub_owner", email="hub@example.com", password="pass12345")
        Profile.objects.update_or_create(
            user=self.owner,
            defaults={"user_type": UserType.SERVICE_PROVIDER},
        )
        self.business = BusinessProfile.objects.create(
            owner=self.owner,
            slug="hub-stays",
            business_name="Hub Stays",
            business_types=["accommodation"],
            verification_status=VerificationStatus.VERIFIED,
            description="Lodges across the region.",
            tagline="Accessible stays",
            showcase_as_partner=True,
            how_we_help="SADC rates and clear package trips so travel feels attainable.",
            community_impact="We hire locally and support nearby schools.",
            region="Erongo",
            city="Swakopmund",
        )

    def test_public_profile_includes_hub_fields_and_active_offers(self):
        TravelOffer.objects.create(
            business=self.business,
            title="SADC resident rate",
            summary="Half-price midweek stays for SADC passport holders.",
            offer_kind="eligibility",
            eligibility="sadc",
            price_label="50% off",
            categories=["stays"],
            details="Midweek lodge nights at half the published rack rate.",
            how_to_claim="Message the provider before booking and mention SADC rate.",
            proof_required="Valid SADC passport at check-in",
            terms_note="Sunday–Thursday only. Public holidays excluded.",
            cover_image="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=70",
            gallery_images=[
                {
                    "src": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=70",
                    "kind": "image",
                },
                {
                    "src": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=70",
                    "kind": "image",
                },
            ],
            is_active=True,
        )
        TravelOffer.objects.create(
            business=self.business,
            title="Hidden deal",
            offer_kind="discount",
            eligibility="everyone",
            price_label="10% off",
            is_active=False,
        )
        res = self.client.get(f"/api/accounts/businesses/{self.business.pk}/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["showcase_as_partner"])
        self.assertIn("SADC rates", res.data["how_we_help"])
        self.assertEqual(len(res.data["travel_offers"]), 1)
        self.assertEqual(res.data["travel_offers"][0]["title"], "SADC resident rate")
        self.assertEqual(res.data["travel_offers"][0]["eligibility_display"], "SADC residents")
        self.assertIn("Message the provider", res.data["travel_offers"][0]["how_to_claim"])
        self.assertEqual(res.data["travel_offers"][0]["proof_required"], "Valid SADC passport at check-in")
        self.assertTrue(res.data["travel_offers"][0]["cover_image"])
        self.assertEqual(len(res.data["travel_offers"][0]["gallery_images"]), 2)

        offer_id = res.data["travel_offers"][0]["id"]
        detail = self.client.get(f"/api/accounts/businesses/{self.business.pk}/offers/{offer_id}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["title"], "SADC resident rate")
        self.assertEqual(detail.data["business"]["business_name"], "Hub Stays")
        self.assertEqual(detail.data["business"]["owner_username"], "hub_owner")

        hidden = TravelOffer.objects.get(title="Hidden deal")
        hidden_res = self.client.get(f"/api/accounts/businesses/{self.business.pk}/offers/{hidden.pk}/")
        self.assertEqual(hidden_res.status_code, 404)

    def test_expired_offer_hidden_from_public(self):
        from datetime import date, timedelta

        TravelOffer.objects.create(
            business=self.business,
            title="Expired deal",
            offer_kind="discount",
            eligibility="everyone",
            price_label="15% off",
            is_active=True,
            ends_on=date.today() - timedelta(days=1),
        )
        res = self.client.get(f"/api/accounts/businesses/{self.business.pk}/")
        self.assertEqual(res.status_code, 200)
        titles = [o["title"] for o in res.data["travel_offers"]]
        self.assertNotIn("Expired deal", titles)

    def test_non_manager_cannot_manage_offers(self):
        stranger = User.objects.create_user(username="stranger", email="stranger@example.com", password="pass12345")
        self.client.force_authenticate(stranger)
        create = self.client.post(
            f"/api/accounts/me/businesses/{self.business.pk}/offers/",
            {"title": "Nope", "offer_kind": "discount", "eligibility": "everyone"},
            format="json",
        )
        self.assertEqual(create.status_code, 403)

    def test_rejects_invalid_cover_url(self):
        self.client.force_authenticate(self.owner)
        create = self.client.post(
            f"/api/accounts/me/businesses/{self.business.pk}/offers/",
            {
                "title": "Bad media",
                "offer_kind": "discount",
                "eligibility": "everyone",
                "cover_image": "javascript:alert(1)",
            },
            format="json",
        )
        self.assertEqual(create.status_code, 400)

    def test_provider_can_crud_offers(self):
        self.client.force_authenticate(self.owner)
        create = self.client.post(
            f"/api/accounts/me/businesses/{self.business.pk}/offers/",
            {
                "title": "Student weekend",
                "summary": "December student package.",
                "offer_kind": "package",
                "eligibility": "student",
                "price_label": "From N$1,200",
                "categories": ["stays", "guides"],
            },
            format="json",
        )
        self.assertEqual(create.status_code, 201)
        offer_id = create.data["id"]

        patch = self.client.patch(
            f"/api/accounts/me/businesses/{self.business.pk}/offers/{offer_id}/",
            {"price_label": "From N$990"},
            format="json",
        )
        self.assertEqual(patch.status_code, 200)
        self.assertEqual(patch.data["price_label"], "From N$990")

        hub = self.client.patch(
            f"/api/accounts/me/businesses/{self.business.pk}/",
            {"how_we_help": "Updated help copy."},
            format="json",
        )
        self.assertEqual(hub.status_code, 200)
        self.assertEqual(hub.data["how_we_help"], "Updated help copy.")

        delete = self.client.delete(f"/api/accounts/me/businesses/{self.business.pk}/offers/{offer_id}/")
        self.assertEqual(delete.status_code, 204)
        self.assertFalse(TravelOffer.objects.filter(pk=offer_id).exists())

    def test_partners_list_filter(self):
        other = User.objects.create_user(username="plain_biz", email="plain@example.com", password="pass12345")
        Profile.objects.update_or_create(user=other, defaults={"user_type": UserType.SERVICE_PROVIDER})
        BusinessProfile.objects.create(
            owner=other,
            slug="plain-stays",
            business_name="Plain Stays",
            business_types=["accommodation"],
        )
        partners = self.client.get("/api/accounts/businesses/?partners=1")
        self.assertEqual(partners.status_code, 200)
        names = [row["business_name"] for row in partners.data]
        self.assertIn("Hub Stays", names)
        self.assertNotIn("Plain Stays", names)
