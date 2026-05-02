from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accommodation.models import AccommodationListing, BookingStatus
from accounts.models import Profile, User, UserType
from events_app.models import Event, EventCategory
from food.models import CuisineType, FoodVenue
from guides.models import TourGuideProfile
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
                    "src": "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "video",
                    "src": "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
                },
            ],
            "Independence Ave Hotel": [
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "video",
                    "src": "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
                },
            ],
            "Desert Quiver Camp": [
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=70",
                },
            ],
            "Klein Windhoek B&B": [
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "image",
                    "src": "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=70",
                },
                {
                    "kind": "video",
                    "src": "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
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

        if not Event.objects.filter(title="Windhoek Night Market").exists():
            Event.objects.create(
                organizer=u1,
                title="Windhoek Night Market",
                description="Food trucks, live music, local makers.",
                category=EventCategory.FOOD,
                starts_at=timezone.now() + timedelta(days=5),
                venue="Warehouse district",
                region="Khomas",
                city="Windhoek",
            )

        if not FoodVenue.objects.filter(name="Oryx Grill House").exists():
            FoodVenue.objects.create(
                owner=u2,
                name="Oryx Grill House",
                description="Wood-fired grill and local brews.",
                cuisine=CuisineType.GRILL,
                region="Khomas",
                city="Windhoek",
                price_level=2,
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
                    {"id": "dunes-half", "title": "Dunes & deadvlei half-day", "hours": 4, "price": "1800"},
                    {"id": "dunes-full", "title": "Full Namib loop & picnic", "hours": 8, "price": "3200"},
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

        self.stdout.write(self.style.SUCCESS("Seed complete. Users: demo_user / demo12345, demo_provider / demo12345 (email verified)."))
