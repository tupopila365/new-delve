from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accommodation.models import AccommodationBooking, AccommodationListing, BookingStatus
from accounts.models import (
    BusinessMembership,
    BusinessProfile,
    BusinessTeamRole,
    BusinessVerificationDocument,
    Profile,
    User,
    UserType,
    VerificationDocumentStatus,
    VerificationDocumentType,
    VerificationStatus,
)
from events_app.models import Event, EventCategory
from food.models import CuisineType, FoodReservation, FoodVenue
from guides.models import GuideBooking, TourGuideProfile
from social.models import Post
from transport.models import (
    BusOperator,
    BusRoute,
    BusTrip,
    SeatReservation,
    VehicleRentalListing,
)


class Command(BaseCommand):
    help = "Seed demo data for DELVE (idempotent-ish: creates if missing)."

    def handle(self, *args, **options):
        u1, _ = User.objects.get_or_create(
            username="demo_user",
            defaults={"email": "demo@delve.local"},
        )
        if not u1.has_usable_password():
            u1.set_password("demo12345")
            u1.save()
        p1 = u1.profile
        p1.user_type = UserType.NORMAL
        p1.region = "Khomas"
        p1.city = "Windhoek"
        p1.display_name = "Demo Explorer"
        p1.country_code = "NA"
        p1.preferred_currency = "NAD"
        p1.email_verified = True
        p1.save()

        u2, _ = User.objects.get_or_create(
            username="demo_provider",
            defaults={"email": "provider@delve.local"},
        )
        if not u2.has_usable_password():
            u2.set_password("demo12345")
            u2.save()
        p2 = u2.profile
        p2.user_type = UserType.SERVICE_PROVIDER
        p2.region = "Erongo"
        p2.display_name = "Desert Stays"
        p2.country_code = "NA"
        p2.preferred_currency = "NAD"
        p2.email_verified = True
        p2.save()

        if not AccommodationListing.objects.filter(title="Coastal guesthouse").exists():
            AccommodationListing.objects.create(
                owner=u2,
                title="Coastal guesthouse",
                description="Quiet stay minutes from the dunes. Coffee, Wi‑Fi, secure parking.",
                region="Erongo",
                city="Swakopmund",
                price_per_night=950,
                max_guests=4,
                bedrooms=2,
                property_type=AccommodationListing.PropertyType.GUESTHOUSE,
                pet_friendly=True,
                amenities=["wifi", "parking", "kitchen"],
            )

        if not AccommodationListing.objects.filter(title="Independence Ave Hotel").exists():
            AccommodationListing.objects.create(
                owner=u2,
                title="Independence Ave Hotel",
                description="Central Windhoek rooms with breakfast buffet and airport shuttle on request.",
                region="Khomas",
                city="Windhoek",
                price_per_night=620,
                max_guests=2,
                bedrooms=1,
                property_type=AccommodationListing.PropertyType.HOTEL,
                pet_friendly=False,
                amenities=["wifi", "parking", "breakfast", "aircon"],
                rating_avg=4.35,
                rating_count=210,
            )

        if not AccommodationListing.objects.filter(title="Desert Quiver Camp").exists():
            AccommodationListing.objects.create(
                owner=u2,
                title="Desert Quiver Camp",
                description="Glamping under the stars — private deck, shared pool, fire pit.",
                region="Hardap",
                city="Sesriem",
                price_per_night=1180,
                max_guests=2,
                bedrooms=1,
                property_type=AccommodationListing.PropertyType.CAMPING_GLAMPING,
                pet_friendly=False,
                amenities=["wifi", "pool", "parking", "kitchenette"],
                rating_avg=4.75,
                rating_count=44,
            )

        if not AccommodationListing.objects.filter(title="Klein Windhoek B&B").exists():
            AccommodationListing.objects.create(
                owner=u2,
                title="Klein Windhoek B&B",
                description="Three rooms, garden breakfast, friendly house cat on the property.",
                region="Khomas",
                city="Windhoek",
                price_per_night=480,
                max_guests=2,
                bedrooms=1,
                property_type=AccommodationListing.PropertyType.BED_AND_BREAKFAST,
                pet_friendly=True,
                amenities=["wifi", "breakfast", "parking"],
                rating_avg=4.92,
                rating_count=67,
            )

        for inst in AccommodationListing.objects.filter(title="Coastal guesthouse"):
            inst.pet_friendly = True
            inst.save()

        _demo_galleries = {
            "Coastal guesthouse": [
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1590490360182-c33d9a6b35d8?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1611892440504-42a792e56d7d?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=70",
                },
            ],
            "Independence Ave Hotel": [
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1631049307264-da0ec9fad704?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1551218808-94e220e3f1e0?auto=format&fit=crop&w=1200&q=70",
                },
            ],
            "Desert Quiver Camp": [
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1478131143081-c8824962e68b?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1543248939-ff40856f65d2?auto=format&fit=crop&w=1200&q=70",
                },
            ],
            "Klein Windhoek B&B": [
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1568605114967-5810f7d0c869?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1551218808-94e220e3f1e0?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1611892440504-42a792e56d7d?auto=format&fit=crop&w=1200&q=70",
                },
            ],
        }
        for title, gallery in _demo_galleries.items():
            AccommodationListing.objects.filter(title=title).update(media_gallery=gallery)

        _listing_extras = {
            "Coastal guesthouse": {
                "check_in_from": "15:00",
                "check_out_until": "10:30",
                "house_rules": "No smoking inside guest rooms or shared corridors.\nQuiet hours 22:00–07:00; please keep balcony doors closed after 22:00.\nRegistered guests only; visitors by arrangement with the host.\nPets allowed only when the listing is marked pet-friendly — keep dogs leashed in the garden.",
                "cancellation_policy": "Free cancellation until 48 hours before check-in (local time). Within 48 hours, the first night is charged. No-shows are charged for the full booked stay.",
                "faqs": [
                    {
                        "question": "Is breakfast included?",
                        "answer": "Self-catering kitchen is stocked for light breakfast on arrival day; full hot breakfast can be arranged with 24h notice (small fee).",
                    },
                    {
                        "question": "Where can I park?",
                        "answer": "One reserved space per booking behind the property gate. Street parking is also available but not guaranteed.",
                    },
                    {
                        "question": "How do I get keys?",
                        "answer": "You'll receive check-in instructions by SMS/email after booking is confirmed. Late arrivals use the lockbox at the side entrance.",
                    },
                ],
                "guest_reviews": [
                    {
                        "name": "Lina M.",
                        "place": "Germany",
                        "rating": 4.8,
                        "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&h=128&q=80",
                        "body": "Spotless rooms and the host left fresh bread. Short walk to the promenade — we'd return.",
                    },
                    {
                        "name": "Thabo",
                        "place": "South Africa",
                        "rating": 4.7,
                        "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=128&h=128&q=80",
                        "body": "Calm neighbourhood, good Wi‑Fi for work. Kitchen had everything we needed for a week.",
                    },
                ],
                "room_types": [
                    {
                        "name": "Coastal queen suite",
                        "description": "Sea-facing lounge, full kitchen, and a private patio — ideal for families.",
                        "max_guests": 4,
                        "bedrooms": 2,
                        "bed_summary": "1 queen + 2 single beds",
                        "price_per_night": "1100.00",
                        "image": "https://images.unsplash.com/photo-1611892440504-42a792e56d7d?auto=format&fit=crop&w=900&q=70",
                    },
                    {
                        "name": "Garden twin room",
                        "description": "Quiet side of the house, shared garden access, kitchenette.",
                        "max_guests": 2,
                        "bedrooms": 1,
                        "bed_summary": "2 single beds",
                        "price_per_night": "820.00",
                        "image": "https://images.unsplash.com/photo-1590490360182-c33d9a6b35d8?auto=format&fit=crop&w=900&q=70",
                    },
                ],
            },
            "Independence Ave Hotel": {
                "check_in_from": "14:00",
                "check_out_until": "11:00",
                "house_rules": "No parties or events in rooms.\nExtra guests beyond the booking must be registered at reception.\nPool area closes at 21:00.",
                "cancellation_policy": "Flexible: cancel until 18:00 one day before check-in for a full refund of the demo rate. Same-day cancellations forfeit one night.",
                "faqs": [
                    {
                        "question": "Is there airport transport?",
                        "answer": "Shuttle on request — contact reception at least 24 hours before arrival. Subject to vehicle availability.",
                    },
                    {
                        "question": "Do rooms have air conditioning?",
                        "answer": "Yes — all rooms are air conditioned. Please close windows when the AC is running.",
                    },
                ],
                "guest_reviews": [
                    {
                        "name": "Anna K.",
                        "place": "Namibia",
                        "rating": 4.2,
                        "avatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=128&h=128&q=80",
                        "body": "Central and clean. Some street noise on lower floors — ask for a room facing the courtyard. Reception swapped our room within an hour when we asked. Housekeeping was discreet. Breakfast buffet had plenty of choice though queues peaked at 08:30. Gym is small but enough for a treadmill session. Would stay again for the location alone.",
                    },
                ],
                "room_types": [
                    {
                        "name": "Standard king",
                        "description": "High-floor city view, desk, rain shower. Breakfast included.",
                        "max_guests": 2,
                        "bedrooms": 1,
                        "bed_summary": "1 king bed",
                        "price_per_night": "620.00",
                        "image": "https://images.unsplash.com/photo-1631049307264-da0ec9fad704?auto=format&fit=crop&w=900&q=70",
                    },
                    {
                        "name": "Courtyard twin",
                        "description": "Quieter rooms facing the inner courtyard — popular with light sleepers.",
                        "max_guests": 2,
                        "bedrooms": 1,
                        "bed_summary": "2 single beds",
                        "price_per_night": "580.00",
                        "image": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=70",
                    },
                    {
                        "name": "Junior suite",
                        "description": "Separate lounge, sofa bed for kids, double vanity, lounge access.",
                        "max_guests": 4,
                        "bedrooms": 1,
                        "bed_summary": "1 king + sofa bed",
                        "price_per_night": "980.00",
                        "image": "https://images.unsplash.com/photo-1566665797739-1674de7a215a?auto=format&fit=crop&w=900&q=70",
                    },
                ],
            },
            "Desert Quiver Camp": {
                "check_in_from": "15:00",
                "check_out_until": "10:00",
                "house_rules": "No open fires except designated fire pit.\nRespect wildlife — do not feed animals.\nGenerator curfew 22:00–06:00 (battery lights provided).",
                "cancellation_policy": "Within 7 days of arrival, 50% of the stay is retained. Within 48 hours, full stay is charged (desert logistics).",
                "faqs": [
                    {
                        "question": "Is water drinkable?",
                        "answer": "Filtered drinking water is provided in each unit; bring refill bottles. Bottled water is sold on site.",
                    },
                    {
                        "question": "What about sand in the tents?",
                        "answer": "Brush stations at each deck; keep zips closed to keep dust out. We provide a small outdoor mat.",
                    },
                ],
                "guest_reviews": [
                    {
                        "name": "Chris & Sam",
                        "place": "UK",
                        "rating": 4.9,
                        "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=128&h=128&q=80",
                        "body": "Unreal stars at night. Pool was cold but refreshing — exactly what we wanted after dunes.",
                    },
                ],
                "room_types": [
                    {
                        "name": "Quiver chalet (double)",
                        "description": "Private deck, en-suite shower, battery lighting after generator curfew.",
                        "max_guests": 2,
                        "bedrooms": 1,
                        "bed_summary": "1 queen bed",
                        "price_per_night": "1180.00",
                        "image": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=70",
                    },
                    {
                        "name": "Family meru tent",
                        "description": "Two sleeping areas, shared bathroom block steps away — great for kids.",
                        "max_guests": 4,
                        "bedrooms": 1,
                        "bed_summary": "1 queen + 2 camp beds",
                        "price_per_night": "1450.00",
                        "image": "https://images.unsplash.com/photo-1478131143081-c8824962e68b?auto=format&fit=crop&w=900&q=70",
                    },
                ],
            },
            "Klein Windhoek B&B": {
                "check_in_from": "13:00",
                "check_out_until": "11:00",
                "house_rules": "This is a residential area — no loud music outdoors.\nBreakfast is served 07:30–09:30 in the dining room.\nOne cat lives on the property — not in guest rooms.",
                "cancellation_policy": "Free cancellation up to 5 days before check-in. Later cancellations: first two nights retained.",
                "faqs": [
                    {
                        "question": "Is the B&B child-friendly?",
                        "answer": "Yes — travel cot available on request. The garden has a small play corner.",
                    },
                ],
                "guest_reviews": [
                    {
                        "name": "Petra",
                        "place": "Austria",
                        "rating": 5.0,
                        "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&h=128&q=80",
                        "body": "Garden breakfast was a highlight. Hosts were warm and gave great Windhoek tips.",
                    },
                    {
                        "name": "Michael",
                        "place": "USA",
                        "rating": 4.8,
                        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&h=128&q=80",
                        "body": "Quiet street, easy Uber to town. Room was cosy and spotless.",
                    },
                ],
                "room_types": [
                    {
                        "name": "Garden deluxe",
                        "description": "French doors to the garden, rainfall shower, best natural light.",
                        "max_guests": 2,
                        "bedrooms": 1,
                        "bed_summary": "1 king bed",
                        "price_per_night": "520.00",
                        "image": "https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=900&q=70",
                    },
                    {
                        "name": "Cosy standard",
                        "description": "Street-facing, compact but quiet — same breakfast as all rooms.",
                        "max_guests": 2,
                        "bedrooms": 1,
                        "bed_summary": "1 queen bed",
                        "price_per_night": "480.00",
                        "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=70",
                    },
                ],
            },
        }
        for title, patch in _listing_extras.items():
            AccommodationListing.objects.filter(title=title).update(**patch)

        _hilux_features = {
            "description": (
                "Double-cab 4x4 with canopy — handles gravel and washaways with ease. "
                "Ideal for Etosha runs and coastal strips."
            ),
            "pickup_location": "Windhoek CBD — exact street address shared on confirmation.",
            "included_features": [
                "Airport pickup",
                "Full comprehensive insurance",
                "Unlimited kilometres",
                "Child seat on request",
            ],
            "gallery_images": [
                "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=70",
                "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=900&q=70",
                "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=70",
            ],
        }
        if not VehicleRentalListing.objects.filter(title="Toyota Hilux 4x4").exists():
            VehicleRentalListing.objects.create(
                owner=u2,
                title="Toyota Hilux 4x4",
                make="Toyota",
                model="Hilux",
                year=2022,
                transmission="manual",
                seats=5,
                vehicle_type="4x4",
                price_per_day=780,
                region="Khomas",
                city="Windhoek",
                **_hilux_features,
            )
        else:
            VehicleRentalListing.objects.filter(title="Toyota Hilux 4x4").update(**_hilux_features)

        op, _ = BusOperator.objects.get_or_create(owner=u2, name="Namibia Link Coaches", defaults={"region": "Khomas"})
        route, _ = BusRoute.objects.get_or_create(
            operator=op,
            origin="Windhoek",
            destination="Swakopmund",
            defaults={
                "description": "Scenic coastal route.",
                "cover_image": (
                    "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957"
                    "?auto=format&fit=crop&w=900&q=72"
                ),
                "gallery_images": [
                    "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=900&q=72",
                    "https://images.unsplash.com/photo-1519999482648-25049ddd37b1?auto=format&fit=crop&w=900&q=72",
                    "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=900&q=72",
                ],
            },
        )
        BusRoute.objects.filter(pk=route.pk).update(
            cover_image=(
                "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957"
                "?auto=format&fit=crop&w=900&q=72"
            ),
            gallery_images=[
                "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=900&q=72",
                "https://images.unsplash.com/photo-1519999482648-25049ddd37b1?auto=format&fit=crop&w=900&q=72",
                "https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=900&q=72",
            ],
        )
        _trip_amenities = [
            "Air conditioning",
            "Onboard toilet",
            "Luggage hold",
            "USB charging",
        ]
        if not BusTrip.objects.filter(route=route).exists():
            dep = timezone.now() + timedelta(days=1)
            BusTrip.objects.create(
                route=route,
                departs_at=dep,
                arrives_at=dep + timedelta(hours=4),
                price=180,
                total_seats=32,
                amenities=_trip_amenities,
            )
        else:
            BusTrip.objects.filter(route=route).update(amenities=_trip_amenities)

        for trip in BusTrip.objects.filter(route=route):
            for sn in (1, 2, 16):
                SeatReservation.objects.get_or_create(
                    trip=trip,
                    seat_number=sn,
                    defaults={
                        "passenger": u1,
                        "status": BookingStatus.CONFIRMED,
                    },
                )

        Event.objects.update_or_create(
            title="Windhoek Night Market",
            defaults={
                "organizer": u1,
                "description": "Food trucks, live music, local makers.",
                "category": EventCategory.FOOD,
                "starts_at": timezone.now() + timedelta(days=5),
                "venue": "Warehouse district",
                "region": "Khomas",
                "city": "Windhoek",
                "is_free": True,
                "price": "",
                "capacity": 500,
                "is_published": True,
            },
        )

        Event.objects.update_or_create(
            title="Coastal Sunset Picnic",
            defaults={
                "organizer": u2,
                "description": "Golden hour views and chill beats by the sea.",
                "category": EventCategory.MUSIC,
                "starts_at": timezone.now() + timedelta(days=8),
                "venue": "Swakopmund shore",
                "region": "Erongo",
                "city": "Swakopmund",
                "is_free": False,
                "price": "150",
                "ticket_url": "https://example.com/tickets/coastal-sunset",
                "capacity": 200,
                "is_published": True,
            },
        )

        if not FoodVenue.objects.filter(name="Oryx Grill House").exists():
            FoodVenue.objects.create(
                owner=u2,
                name="Oryx Grill House",
                description="Wood-fired grill and local brews.",
                tagline="Fresh local plates, lunch specials, and dinner favourites.",
                popular_dish="Flame-grilled oryx steak",
                cuisine=CuisineType.GRILL,
                region="Khomas",
                city="Windhoek",
                address="123 Independence Ave, Windhoek",
                phone="+264 61 123 4567",
                opening_hours="Mon–Sat 11:00–21:00\nSun 12:00–20:00",
                closes_at="9 PM",
                price_level=2,
                dine_in=True,
                takeaway=True,
                reservations=True,
                is_open=True,
                amenities=["Outdoor seating", "Card accepted", "Local brews"],
                venue_stories=[
                    {
                        "id": "grill-night",
                        "label": "Grill night",
                        "coverSrc": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1080&q=80",
                        "slides": [
                            {
                                "headline": "Fire up Friday",
                                "sub": "Live flame grill from 6pm.",
                                "src": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1080&q=80",
                            }
                        ],
                    }
                ],
                rating_avg=4.55,
                rating_count=210,
                guest_reviews=[
                    {
                        "name": "Amara D.",
                        "place": "Windhoek",
                        "rating": 5,
                        "body": "Best oryx steak in Windhoek. Smoky, juicy, and perfectly seasoned.",
                    }
                ],
            )

        if not TourGuideProfile.objects.filter(user=u2).exists():
            TourGuideProfile.objects.create(
                user=u2,
                headline="Sossusvlei & Namib tours",
                bio="Ten years guiding photographers and families across the desert.",
                languages=["English", "Afrikaans"],
                regions=["Hardap", "Khomas"],
                hourly_rate=450,
                response_hours_typical=2,
                years_guiding=12,
                licensed_guide=True,
                certifications=["First aid certified", "4×4 recovery training"],
                languages_detail=[
                    {"language": "English", "level": "Fluent"},
                    {"language": "Afrikaans", "level": "Fluent"},
                ],
                guest_reviews=[
                    {
                        "name": "Sarah M.",
                        "place": "Cape Town",
                        "rating": 5,
                        "body": "Unforgettable dunes at golden hour — our guide knew every viewpoint.",
                    }
                ],
                tour_packages=[
                    {
                        "id": "dunes-half",
                        "title": "Dunes & deadvlei half-day",
                        "hours": 4,
                        "price": "1800",
                        "photo": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=70",
                        "description": (
                            "Morning run toward Sossusvlei with time on the pans, Deadvlei on foot, "
                            "and a shaded refreshment stop — pace tuned to heat and group fitness."
                        ),
                        "photos": [
                            "https://images.unsplash.com/photo-1543248939-ff40856f65d2?auto=format&fit=crop&w=800&q=70",
                            "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=70",
                        ],
                        "reviews": [
                            {
                                "name": "Marta V.",
                                "place": "Johannesburg",
                                "rating": 5,
                                "body": (
                                    "Deadvlei timing was ideal for photography and the guide paced water "
                                    "breaks thoughtfully."
                                ),
                            },
                            {
                                "name": "Chris D.",
                                "place": "Chicago",
                                "rating": 4.9,
                                "body": "Briefing the evening before matched exactly what we did on the dunes — no surprises.",
                            },
                        ],
                    },
                    {
                        "id": "dunes-full",
                        "title": "Full Namib loop & picnic",
                        "hours": 8,
                        "price": "3200",
                        "photo": "https://images.unsplash.com/photo-1543248939-ff40856f65d2?auto=format&fit=crop&w=800&q=70",
                        "photos": [
                            "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=70",
                            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=70",
                        ],
                        "reviews": [
                            {
                                "name": "Elena R.",
                                "place": "Valencia",
                                "rating": 5,
                                "body": "Long day done right — picnic stop and pacing made the mileage feel manageable.",
                            }
                        ],
                    },
                ],
                portfolio_gallery=[
                    {
                        "src": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=70",
                        "caption": "Sossusvlei at sunrise",
                    }
                ],
                default_meeting_point="Sesriem gate visitor parking — look for the silver Land Cruiser.",
                specialities=["Photography", "Family-friendly", "Nature"],
            )

        feed_posts = [
            (u1, "Weekend craft fair at Grove Mall — local ceramics and coffee.", "Windhoek"),
            (u2, "Free walking tour meetup — Independence Ave, Saturday 9am.", "Khomas"),
            (u2, "New coffee spot near Maerua — quiet tables, good for work.", "Khomas"),
            (u1, "Community garden open day — seedlings, tips, and iced tea.", "Khomas"),
            (u2, "Live jazz at the warehouse district — tickets at the door.", "Khomas"),
            (u1, "Shared taxi etiquette: small notes help, a greeting goes far.", "Khomas"),
        ]
        for author, body, region in feed_posts:
            if not Post.objects.filter(body=body, is_delvers=False).exists():
                Post.objects.create(author=author, body=body, region=region, is_delvers=False)

        delvers_posts = [
            (u2, "Sunset over the dunes — best light at 18:30.", "Swakopmund", "Namibia views"),
            (u1, "Road trip mood: pack water, playlist, and your camera.", "Khomas", "Weekend trips"),
            (u1, "Morning coffee and vetkoek — market side before the heat.", "Windhoek", "Eat local"),
            (u2, "Promenade walk — salt air and slow sunsets.", "Swakopmund", "Coast life"),
            (u1, "Dune ridge at golden hour — no filter needed.", "Hardap", "Namibia views"),
            (u2, "Guesthouse courtyard — shade, tea, and a good book.", "Swakopmund", "Stays we love"),
            (u1, "Windhoek skyline from the ridge — short hike, big view.", "Khomas", "Weekend trips"),
            (u2, "Safari drive pause — elephants at the waterhole.", "Oshikoto", "Wild Namibia"),
            (u1, "Road trip fuel stop views — long roads, good radio.", "Khomas", "On the road"),
            (u1, "Map night: tracing routes for next month — pencil and dreams.", "Windhoek", "Plan slow"),
            (u2, "Lodge pool reflecting the ridge — cool water, hot day.", "Hardap", "Stays we love"),
            (u1, "Street braai smoke and laughter — Friday energy.", "Windhoek", "Eat local"),
            (u2, "Kite season on the lagoon — wide sand, gentle wind.", "Erongo", "Coast life"),
            (u1, "Farm stall melons and homemade bread — worth the detour.", "Khomas", "Eat local"),
            (u1, "Night market lights — kids dancing, vendors calling, warm air.", "Khomas", "Weekend trips"),
            (u2, "Skeleton Coast mist rolling in — jacket weather, big sky.", "Erongo", "Namibia views"),
            (u1, "Back-road shortcut: red dust, cattle grid, smile from a passer-by.", "Khomas", "On the road"),
            (u2, "Deck chairs at dusk — first stars, no rush.", "Hardap", "Stays we love"),
        ]
        for author, body, region, board in delvers_posts:
            if not Post.objects.filter(body=body, is_delvers=True).exists():
                Post.objects.create(
                    author=author,
                    body=body,
                    region=region,
                    delvers_board=board,
                    is_delvers=True,
                )

        # Platform admin
        admin_u, _ = User.objects.get_or_create(
            username="demo_admin",
            defaults={"email": "admin@delve.local", "is_staff": True},
        )
        admin_u.is_staff = True
        if not admin_u.has_usable_password():
            admin_u.set_password("demo12345")
        admin_u.save()
        admin_p = admin_u.profile
        admin_p.display_name = "DELVE Admin"
        admin_p.email_verified = True
        admin_p.save()

        # Stays-only provider (frontend parity)
        stays_u, _ = User.objects.get_or_create(
            username="stays_host",
            defaults={"email": "stays@delve.local"},
        )
        if not stays_u.has_usable_password():
            stays_u.set_password("demo12345")
            stays_u.save()
        stays_p = stays_u.profile
        stays_p.user_type = UserType.SERVICE_PROVIDER
        stays_p.display_name = "Dune Stays Namibia"
        stays_p.region = "Erongo"
        stays_p.city = "Swakopmund"
        stays_p.country_code = "NA"
        stays_p.email_verified = True
        stays_p.save()

        if not AccommodationListing.objects.filter(title="Freesia Hotel", owner=stays_u).exists():
            AccommodationListing.objects.create(
                owner=stays_u,
                title="Freesia Hotel",
                description="Boutique hotel in central Swakopmund with breakfast and secure parking.",
                region="Erongo",
                city="Swakopmund",
                price_per_night=350,
                max_guests=2,
                bedrooms=1,
                property_type=AccommodationListing.PropertyType.HOTEL,
                amenities=["wifi", "parking", "breakfast"],
                rating_avg=4.72,
                rating_count=48,
            )

        coastal = AccommodationListing.objects.filter(title="Coastal guesthouse").first()
        if coastal and coastal.owner_id != stays_u.id:
            pass  # keep demo_provider ownership

        # Business profiles
        biz_specs = [
            (
                "desert-stays",
                u2,
                "Desert Stays",
                ["multi_provider", "accommodation", "guide"],
                "Boutique stays and guided desert experiences across Namibia.",
                "Stays & guided tours across Namibia",
                "Erongo",
                "Swakopmund",
            ),
            (
                "dune-stays-namibia",
                stays_u,
                "Dune Stays Namibia",
                ["accommodation"],
                "Boutique lodges and guesthouses across the Namibian coast.",
                "Coastal lodges & city guesthouses",
                "Erongo",
                "Swakopmund",
            ),
        ]
        for slug, owner, name, types, desc, tagline, region, city in biz_specs:
            biz, created = BusinessProfile.objects.get_or_create(
                slug=slug,
                defaults={
                    "owner": owner,
                    "business_name": name,
                    "business_types": types,
                    "verification_status": VerificationStatus.VERIFIED,
                    "description": desc,
                    "tagline": tagline,
                    "region": region,
                    "city": city,
                },
            )
            if not created:
                biz.verification_status = VerificationStatus.VERIFIED
                biz.save(update_fields=["verification_status", "updated_at"])
            BusinessMembership.objects.get_or_create(
                business=biz,
                user=owner,
                defaults={"role": BusinessTeamRole.OWNER},
            )

        # Transport provider awaiting admin verification (Delve Admin Phase 7)
        transport_u, _ = User.objects.get_or_create(
            username="transport_mgr",
            defaults={"email": "transport@delve.local"},
        )
        if not transport_u.has_usable_password():
            transport_u.set_password("demo12345")
            transport_u.save()
        transport_p = transport_u.profile
        transport_p.user_type = UserType.SERVICE_PROVIDER
        transport_p.display_name = "Namibia Wheels"
        transport_p.region = "Khomas"
        transport_p.city = "Windhoek"
        transport_p.country_code = "NA"
        transport_p.email_verified = True
        transport_p.save()

        transport_biz, _ = BusinessProfile.objects.get_or_create(
            slug="namibia-wheels",
            defaults={
                "owner": transport_u,
                "business_name": "Namibia Wheels",
                "business_types": ["transport"],
                "transport_modes": ["rental", "shared"],
                "verification_status": VerificationStatus.PENDING,
                "description": "4x4 rentals and scheduled coach trips across Namibia.",
                "tagline": "Rentals & shared routes",
                "region": "Khomas",
                "city": "Windhoek",
            },
        )
        if not _:
            transport_biz.owner = transport_u
            transport_biz.business_types = ["transport"]
            transport_biz.transport_modes = ["rental", "shared"]
            transport_biz.verification_status = VerificationStatus.PENDING
            transport_biz.save(
                update_fields=[
                    "owner",
                    "business_types",
                    "transport_modes",
                    "verification_status",
                    "updated_at",
                ]
            )
        BusinessMembership.objects.get_or_create(
            business=transport_biz,
            user=transport_u,
            defaults={"role": BusinessTeamRole.OWNER},
        )

        _transport_doc_specs = [
            (VerificationDocumentType.BUSINESS_REGISTRATION, "https://example.com/docs/nw-registration.pdf"),
            (VerificationDocumentType.OPERATING_PERMIT, "https://example.com/docs/nw-operating-permit.pdf"),
            (VerificationDocumentType.TRANSPORT_INSURANCE, "https://example.com/docs/nw-insurance.pdf"),
            (VerificationDocumentType.VEHICLE_REGISTRATION, "https://example.com/docs/nw-fleet-registration.pdf"),
            (VerificationDocumentType.DRIVER_LICENSE, "https://example.com/docs/nw-fleet-manager-license.pdf"),
        ]
        for doc_type, file_url in _transport_doc_specs:
            BusinessVerificationDocument.objects.get_or_create(
                business=transport_biz,
                doc_type=doc_type,
                defaults={
                    "file": file_url,
                    "status": VerificationDocumentStatus.PENDING,
                },
            )

        if not VehicleRentalListing.objects.filter(owner=transport_u, title="Land Cruiser 4x4").exists():
            VehicleRentalListing.objects.create(
                owner=transport_u,
                title="Land Cruiser 4x4",
                make="Toyota",
                model="Land Cruiser",
                year=2020,
                transmission="automatic",
                seats=7,
                vehicle_type="4x4",
                price_per_day=1200,
                region="Khomas",
                city="Windhoek",
                is_active=True,
            )

        transport_op, _ = BusOperator.objects.get_or_create(
            owner=transport_u,
            name="Namibia Wheels Coaches",
            defaults={"region": "Khomas"},
        )
        transport_route, _ = BusRoute.objects.get_or_create(
            operator=transport_op,
            origin="Windhoek",
            destination="Oshakati",
            defaults={
                "description": "Northern express route.",
                "cover_image": (
                    "https://images.unsplash.com/photo-1570125909232-eb263c188f7e"
                    "?auto=format&fit=crop&w=900&q=72"
                ),
            },
        )
        if not BusTrip.objects.filter(route=transport_route).exists():
            dep = timezone.now() + timedelta(days=2)
            BusTrip.objects.create(
                route=transport_route,
                departs_at=dep,
                arrives_at=dep + timedelta(hours=6),
                price=240,
                total_seats=40,
                amenities=["Air conditioning", "Luggage hold"],
                is_active=True,
            )

        # Food provider awaiting admin verification (Delve Admin Phase 7)
        food_u, _ = User.objects.get_or_create(
            username="food_mgr",
            defaults={"email": "food@delve.local"},
        )
        if not food_u.has_usable_password():
            food_u.set_password("demo12345")
            food_u.save()
        food_p = food_u.profile
        food_p.user_type = UserType.SERVICE_PROVIDER
        food_p.display_name = "Windhoek Kitchen Co"
        food_p.region = "Khomas"
        food_p.city = "Windhoek"
        food_p.country_code = "NA"
        food_p.email_verified = True
        food_p.save()

        food_biz, _ = BusinessProfile.objects.get_or_create(
            slug="windhoek-kitchen-co",
            defaults={
                "owner": food_u,
                "business_name": "Windhoek Kitchen Co",
                "business_types": ["food_drink"],
                "verification_status": VerificationStatus.PENDING,
                "description": "Modern Namibian kitchen with table reservations on DELVE.",
                "tagline": "Seasonal plates & local brews",
                "region": "Khomas",
                "city": "Windhoek",
            },
        )
        if not _:
            food_biz.owner = food_u
            food_biz.business_types = ["food_drink"]
            food_biz.verification_status = VerificationStatus.PENDING
            food_biz.save(
                update_fields=["owner", "business_types", "verification_status", "updated_at"]
            )
        BusinessMembership.objects.get_or_create(
            business=food_biz,
            user=food_u,
            defaults={"role": BusinessTeamRole.OWNER},
        )

        _food_doc_specs = [
            (
                VerificationDocumentType.BUSINESS_REGISTRATION,
                "https://example.com/docs/wkc-registration.pdf",
            ),
            (
                VerificationDocumentType.FOOD_HANDLING_CERT,
                "https://example.com/docs/wkc-food-handling.pdf",
            ),
        ]
        for doc_type, file_url in _food_doc_specs:
            BusinessVerificationDocument.objects.get_or_create(
                business=food_biz,
                doc_type=doc_type,
                defaults={
                    "file": file_url,
                    "status": VerificationDocumentStatus.PENDING,
                },
            )

        savanna_table = FoodVenue.objects.filter(owner=food_u, name="Savanna Table").first()
        if not savanna_table:
            savanna_table = FoodVenue.objects.create(
                owner=food_u,
                name="Savanna Table",
                description="Seasonal Namibian plates in a relaxed downtown setting.",
                tagline="Reserve a table for lunch or dinner",
                cuisine=CuisineType.LOCAL,
                region="Khomas",
                city="Windhoek",
                address="45 Independence Ave, Windhoek",
                phone="+264 61 555 0199",
                price_level=2,
                dine_in=True,
                takeaway=True,
                reservations=True,
                is_open=True,
                is_active=True,
            )

        if not FoodReservation.objects.filter(venue=savanna_table, guest=u1).exists():
            FoodReservation.objects.create(
                venue=savanna_table,
                guest=u1,
                party_size=4,
                reserved_for=timezone.now() + timedelta(days=3),
                status=BookingStatus.PENDING,
                special_requests="Window seat if possible.",
            )

        # Guide provider awaiting admin verification (Delve Admin Phase 6)
        guide_u, _ = User.objects.get_or_create(
            username="guide_mgr",
            defaults={"email": "guide@delve.local"},
        )
        if not guide_u.has_usable_password():
            guide_u.set_password("demo12345")
            guide_u.save()
        guide_p = guide_u.profile
        guide_p.user_type = UserType.SERVICE_PROVIDER
        guide_p.display_name = "Namib Trail Guides"
        guide_p.region = "Erongo"
        guide_p.city = "Swakopmund"
        guide_p.country_code = "NA"
        guide_p.email_verified = True
        guide_p.save()

        guide_biz, _ = BusinessProfile.objects.get_or_create(
            slug="namib-trail-guides",
            defaults={
                "owner": guide_u,
                "business_name": "Namib Trail Guides",
                "business_types": ["guide"],
                "verification_status": VerificationStatus.PENDING,
                "description": "Licensed local guides for dunes, wildlife, and coastal trails.",
                "tagline": "Desert trails with local experts",
                "region": "Erongo",
                "city": "Swakopmund",
            },
        )
        if not _:
            guide_biz.owner = guide_u
            guide_biz.business_types = ["guide"]
            guide_biz.verification_status = VerificationStatus.PENDING
            guide_biz.save(
                update_fields=["owner", "business_types", "verification_status", "updated_at"]
            )
        BusinessMembership.objects.get_or_create(
            business=guide_biz,
            user=guide_u,
            defaults={"role": BusinessTeamRole.OWNER},
        )

        _guide_doc_specs = [
            (
                VerificationDocumentType.BUSINESS_REGISTRATION,
                "https://example.com/docs/ntg-registration.pdf",
            ),
            (
                VerificationDocumentType.TOUR_GUIDE_LICENSE,
                "https://example.com/docs/ntg-guide-license.pdf",
            ),
            (
                VerificationDocumentType.FIRST_AID_CERT,
                "https://example.com/docs/ntg-first-aid.pdf",
            ),
        ]
        for doc_type, file_url in _guide_doc_specs:
            BusinessVerificationDocument.objects.get_or_create(
                business=guide_biz,
                doc_type=doc_type,
                defaults={
                    "file": file_url,
                    "status": VerificationDocumentStatus.PENDING,
                },
            )

        desert_footprints = TourGuideProfile.objects.filter(user=guide_u).first()
        if not desert_footprints:
            desert_footprints = TourGuideProfile.objects.create(
                user=guide_u,
                headline="Desert Footprints Tours",
                bio="Coastal dunes and lagoon walks with a licensed Swakopmund guide.",
                languages=["English", "German"],
                regions=["Erongo"],
                hourly_rate=420,
                response_hours_typical=3,
                years_guiding=6,
                licensed_guide=True,
                certifications=["First aid certified"],
                languages_detail=[
                    {"language": "English", "level": "Fluent"},
                    {"language": "German", "level": "Conversational"},
                ],
                specialities=["Wildlife", "Photography", "City walks"],
                default_meeting_point="Swakopmund Jetty",
                tour_packages=[
                    {
                        "id": "dune-half-day",
                        "title": "Dune half-day",
                        "hours": 4,
                        "price": "2800",
                        "description": "Morning dunes and lagoon viewpoints.",
                    }
                ],
                is_active=True,
            )

        if not GuideBooking.objects.filter(guide=desert_footprints, client=u1).exists():
            from datetime import time as dt_time

            GuideBooking.objects.create(
                guide=desert_footprints,
                client=u1,
                date=(timezone.now() + timedelta(days=4)).date(),
                start_time=dt_time(9, 0),
                duration_hours=4,
                group_size=2,
                package_id="dune-half-day",
                meeting_point="Swakopmund Jetty",
                notes="Prefer sunrise start if possible.",
                total_price="2800.00",
                status="pending",
            )

        # Sample stay bookings for provider inbox
        coastal_listing = AccommodationListing.objects.filter(title="Coastal guesthouse").first()
        if coastal_listing and not AccommodationBooking.objects.filter(
            listing=coastal_listing, guest=u1, check_in="2026-05-10"
        ).exists():
            AccommodationBooking.objects.create(
                listing=coastal_listing,
                guest=u1,
                check_in="2026-05-10",
                check_out="2026-05-13",
                guests=2,
                total_price=2850,
                status=BookingStatus.CONFIRMED,
                mock_payment_ref="mock_seed_coastal_1",
            )
        hotel_listing = AccommodationListing.objects.filter(title="Independence Ave Hotel").first()
        if hotel_listing and not AccommodationBooking.objects.filter(
            listing=hotel_listing, guest=u1, check_in="2026-05-20"
        ).exists():
            AccommodationBooking.objects.create(
                listing=hotel_listing,
                guest=u1,
                check_in="2026-05-20",
                check_out="2026-05-22",
                guests=1,
                total_price=1240,
                status=BookingStatus.PENDING,
            )

        for event in Event.objects.filter(business__isnull=True).select_related("organizer"):
            biz = BusinessProfile.objects.filter(owner=event.organizer).order_by("id").first()
            if biz:
                event.business = biz
                event.save(update_fields=["business"])

        self.stdout.write(
            self.style.SUCCESS(
                "Seed complete. Users: demo_user, demo_provider, stays_host, transport_mgr, food_mgr, guide_mgr, demo_admin — password demo12345."
            )
        )
