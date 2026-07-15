from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import BusinessProfile, Profile, UserType
from events_app.models import (
    Event,
    EventBooking,
    EventBookingStatus,
    EventLike,
    EventSave,
)

User = get_user_model()


class EventApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organizer = User.objects.create_user(
            username="organizer",
            email="organizer@example.com",
            password="pass12345",
        )
        Profile.objects.filter(user=self.organizer).update(user_type=UserType.SERVICE_PROVIDER)
        self.organizer.profile.refresh_from_db()
        self.business = BusinessProfile.objects.create(
            owner=self.organizer,
            slug="test-events-co",
            business_name="Test Events Co",
            business_types=["event_organiser"],
        )
        self.traveler = User.objects.create_user(
            username="traveler",
            email="traveler@example.com",
            password="pass12345",
        )
        Profile.objects.filter(user=self.traveler).update(user_type=UserType.NORMAL)
        self.event = Event.objects.create(
            organizer=self.organizer,
            business=self.business,
            title="Test Gig",
            starts_at=timezone.now() + timezone.timedelta(days=2),
            region="Khomas",
            city="Windhoek",
            is_free=True,
            is_published=True,
        )

    def test_list_includes_engagement_fields(self):
        EventLike.objects.create(event=self.event, user=self.traveler)
        self.client.force_authenticate(self.traveler)
        res = self.client.get("/api/events/")
        self.assertEqual(res.status_code, 200)
        row = next(item for item in res.data if item["id"] == self.event.id)
        self.assertEqual(row["likes_count"], 1)
        self.assertTrue(row["liked_by_me"])

    def test_like_toggle(self):
        self.client.force_authenticate(self.traveler)
        res = self.client.post(f"/api/events/{self.event.id}/like/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["liked"])
        self.assertEqual(res.data["likes_count"], 1)
        res = self.client.post(f"/api/events/{self.event.id}/like/")
        self.assertFalse(res.data["liked"])
        self.assertEqual(res.data["likes_count"], 0)

    def test_save_toggle(self):
        self.client.force_authenticate(self.traveler)
        res = self.client.post(f"/api/events/{self.event.id}/save/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["saved"])
        self.assertEqual(EventSave.objects.filter(event=self.event).count(), 1)

    def test_filter_by_business(self):
        res = self.client.get(f"/api/events/?business={self.business.id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_create_event_with_video_cover(self):
        self.client.force_authenticate(self.organizer)
        starts = (timezone.now() + timezone.timedelta(days=4)).isoformat()
        res = self.client.post(
            "/api/events/",
            {
                "title": "Video cover night",
                "category": "music",
                "starts_at": starts,
                "region": "Khomas",
                "city": "Windhoek",
                "is_free": "true",
                "is_published": "true",
                "cover_image": "https://res.cloudinary.com/demo/video/upload/sample.mp4",
                "cover_kind": "video",
                "gallery_images": "[]",
                "event_stories": "[]",
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["cover_kind"], "video")
        self.assertIn("sample.mp4", res.data["cover_image"])
        event = Event.objects.get(id=res.data["id"])
        self.assertEqual(event.cover_kind, "video")

    def test_create_event_with_long_cloudinary_video_cover_url(self):
        self.client.force_authenticate(self.organizer)
        starts = (timezone.now() + timezone.timedelta(days=6)).isoformat()
        long_url = (
            "https://res.cloudinary.com/delve-production-cloud/video/upload/"
            "c_limit,w_1080/v1712345678/posts/videos/"
            + ("a" * 80)
            + ".mp4"
        )
        self.assertGreater(len(long_url), 100)
        res = self.client.post(
            "/api/events/",
            {
                "title": "Long URL video cover",
                "category": "music",
                "starts_at": starts,
                "is_free": "true",
                "is_published": "true",
                "cover_image": long_url,
                "cover_kind": "video",
                "gallery_images": "[]",
                "event_stories": "[]",
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["cover_kind"], "video")
        self.assertEqual(res.data["cover_image"], long_url)

    def test_cover_kind_inferred_from_video_url(self):
        self.client.force_authenticate(self.organizer)
        starts = (timezone.now() + timezone.timedelta(days=5)).isoformat()
        res = self.client.post(
            "/api/events/",
            {
                "title": "Inferred video cover",
                "category": "music",
                "starts_at": starts,
                "is_free": "true",
                "is_published": "true",
                "cover_image": "https://cdn.example.com/clips/opener.webm",
                "gallery_images": "[]",
                "event_stories": "[]",
            },
            format="multipart",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["cover_kind"], "video")

    def test_related_events_endpoint(self):
        sibling = Event.objects.create(
            organizer=self.organizer,
            business=self.business,
            title="Related culture night",
            category=self.event.category or "culture",
            city="Windhoek",
            starts_at=timezone.now() + timezone.timedelta(days=3),
            is_free=True,
            is_published=True,
        )
        res = self.client.get(f"/api/events/{self.event.id}/related/")
        self.assertEqual(res.status_code, 200)
        ids = [row["id"] for row in res.data]
        self.assertIn(sibling.id, ids)
        self.assertNotIn(self.event.id, ids)

    def test_category_follow_toggle_and_feed_boost(self):
        music = Event.objects.create(
            organizer=self.organizer,
            business=self.business,
            title="Late night jazz",
            category="music",
            starts_at=timezone.now() + timezone.timedelta(days=5),
            is_free=True,
            is_published=True,
        )
        culture = Event.objects.create(
            organizer=self.organizer,
            business=self.business,
            title="Gallery walk",
            category="culture",
            starts_at=timezone.now() + timezone.timedelta(days=1),
            is_free=True,
            is_published=True,
        )
        self.client.force_authenticate(self.traveler)
        res = self.client.post("/api/events/categories/music/follow/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["following"])
        res = self.client.get("/api/events/category-follows/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("music", res.data["categories"])
        res = self.client.get("/api/events/")
        self.assertEqual(res.status_code, 200)
        ids = [row["id"] for row in res.data]
        self.assertLess(ids.index(music.id), ids.index(culture.id))
        res = self.client.post("/api/events/categories/music/follow/")
        self.assertFalse(res.data["following"])

    def test_organizer_can_save_event_stories(self):
        stories = [
            {
                "id": "vibe",
                "label": "The vibe",
                "coverSrc": "https://cdn.example/vibe.jpg",
                "slides": [
                    {
                        "src": "https://cdn.example/vibe.jpg",
                        "headline": "Opening night energy",
                        "sub": "Doors at 7pm",
                    }
                ],
            }
        ]
        self.client.force_authenticate(user=self.organizer)
        res = self.client.patch(
            f"/api/events/{self.event.id}/",
            {"event_stories": stories},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["event_stories"]), 1)
        self.assertEqual(res.data["event_stories"][0]["label"], "The vibe")
        self.event.refresh_from_db()
        self.assertEqual(self.event.event_stories[0]["slides"][0]["headline"], "Opening night energy")

        self.client.force_authenticate(user=None)
        detail = self.client.get(f"/api/events/{self.event.id}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(len(detail.data["event_stories"]), 1)

    def test_when_free_filter(self):
        res = self.client.get("/api/events/?when=free")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(all(row["is_free"] for row in res.data))

    def test_create_assigns_business(self):
        self.client.force_authenticate(self.organizer)
        res = self.client.post(
            "/api/events/",
            {
                "title": "New Market",
                "category": "food",
                "starts_at": (timezone.now() + timezone.timedelta(days=5)).isoformat(),
                "region": "Khomas",
                "is_published": True,
                "is_free": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["business"], self.business.id)

    def test_traveler_cannot_create_event(self):
        self.client.force_authenticate(self.traveler)
        res = self.client.post(
            "/api/events/",
            {
                "title": "Unauthorized",
                "category": "music",
                "starts_at": (timezone.now() + timezone.timedelta(days=3)).isoformat(),
                "region": "Khomas",
                "is_published": True,
                "is_free": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_rsvp_free_event(self):
        self.client.force_authenticate(self.traveler)
        res = self.client.post(f"/api/events/{self.event.id}/rsvp/", {"tickets": 2}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["status"], EventBookingStatus.CONFIRMED)
        self.assertEqual(res.data["tickets"], 2)
        detail = self.client.get(f"/api/events/{self.event.id}/")
        self.assertTrue(detail.data["attending_by_me"])

    def test_my_bookings_list(self):
        EventBooking.objects.create(
            event=self.event,
            attendee=self.traveler,
            tickets=1,
            status=EventBookingStatus.CONFIRMED,
            booking_ref="EVT-TEST1234",
        )
        self.client.force_authenticate(self.traveler)
        res = self.client.get("/api/events/bookings/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_provider_bookings_list(self):
        EventBooking.objects.create(
            event=self.event,
            attendee=self.traveler,
            tickets=1,
            status=EventBookingStatus.CONFIRMED,
            booking_ref="EVT-TEST5678",
        )
        self.client.force_authenticate(self.organizer)
        res = self.client.get("/api/events/provider-bookings/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)


class EventPhase3Tests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organizer = User.objects.create_user(
            username="org3",
            email="org3@example.com",
            password="pass12345",
        )
        Profile.objects.filter(user=self.organizer).update(user_type=UserType.SERVICE_PROVIDER)
        self.organizer.profile.refresh_from_db()
        self.business = BusinessProfile.objects.create(
            owner=self.organizer,
            slug="phase3-events",
            business_name="Phase3 Events",
            business_types=["event_organiser"],
        )
        self.traveler = User.objects.create_user(
            username="guest3",
            email="guest3@example.com",
            password="pass12345",
        )
        Profile.objects.filter(user=self.traveler).update(user_type=UserType.NORMAL)
        self.event = Event.objects.create(
            organizer=self.organizer,
            business=self.business,
            title="Phase3 Fest",
            starts_at=timezone.now() + timezone.timedelta(days=2),
            region="Khomas",
            city="Windhoek",
            is_free=True,
            is_published=True,
        )
        self.booking = EventBooking.objects.create(
            event=self.event,
            attendee=self.traveler,
            tickets=1,
            status=EventBookingStatus.CONFIRMED,
            booking_ref="EVT-PHASE3A",
        )
        from events_app.booking_utils import ensure_check_in_token

        ensure_check_in_token(self.booking)

    def test_event_questions_and_answers(self):
        self.client.force_authenticate(self.traveler)
        res = self.client.post(
            f"/api/events/{self.event.id}/questions/",
            {"body": "Is parking available?"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        qid = res.data["id"]
        self.client.force_authenticate(self.organizer)
        res = self.client.post(
            f"/api/events/questions/{qid}/answers/",
            {"body": "Yes, street parking nearby."},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data["is_official"])
        res = self.client.get(f"/api/events/{self.event.id}/questions/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["replies_count"], 1)
        res = self.client.get(f"/api/events/{self.event.id}/comments/?parent={qid}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_ticket_and_self_check_in(self):
        self.client.force_authenticate(self.traveler)
        res = self.client.get(f"/api/events/bookings/{self.booking.id}/ticket/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("qr_payload", res.data)
        token = res.data["check_in_token"]
        res = self.client.post(
            f"/api/events/bookings/{self.booking.id}/self_check_in/",
            {"token": token},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], EventBookingStatus.CHECKED_IN)

    def test_post_attendance_review(self):
        self.booking.status = EventBookingStatus.CHECKED_IN
        self.booking.save(update_fields=["status"])
        self.client.force_authenticate(self.traveler)
        res = self.client.post(
            f"/api/events/bookings/{self.booking.id}/review/",
            {"rating": 5, "body": "Great vibe"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        res = self.client.get(f"/api/events/{self.event.id}/reviews/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["rating_count"], 1)
        self.assertEqual(res.data["rating_avg"], 5.0)

    def test_provider_check_in(self):
        self.client.force_authenticate(self.organizer)
        res = self.client.post(f"/api/events/provider-bookings/{self.booking.id}/check_in/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["status"], EventBookingStatus.CHECKED_IN)

    def test_event_moments(self):
        from social.models import Post

        Post.objects.create(
            author=self.traveler,
            body="What a night!",
            region="Khomas",
            is_delvers=True,
            event=self.event,
        )
        res = self.client.get(f"/api/events/{self.event.id}/moments/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]["body"], "What a night!")


class EventPhase4Tests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organizer = User.objects.create_user(
            username="org4",
            email="org4@example.com",
            password="pass12345",
        )
        Profile.objects.filter(user=self.organizer).update(user_type=UserType.SERVICE_PROVIDER)
        self.organizer.profile.refresh_from_db()
        self.business = BusinessProfile.objects.create(
            owner=self.organizer,
            slug="phase4-events",
            business_name="Phase4 Events",
            business_types=["event_organiser"],
        )
        self.traveler = User.objects.create_user(
            username="guest4",
            email="guest4@example.com",
            password="pass12345",
        )
        Profile.objects.filter(user=self.traveler).update(user_type=UserType.NORMAL, email_verified=True)
        self.traveler.profile.refresh_from_db()
        self.paid_event = Event.objects.create(
            organizer=self.organizer,
            business=self.business,
            title="Paid Night",
            starts_at=timezone.now() + timezone.timedelta(days=3),
            region="Khomas",
            is_free=False,
            price="100",
            is_published=True,
        )
        self.external_event = Event.objects.create(
            organizer=self.organizer,
            business=self.business,
            title="External Tickets",
            starts_at=timezone.now() + timezone.timedelta(days=4),
            region="Khomas",
            is_free=False,
            price="80",
            ticket_url="https://tickets.example.com/show",
            is_published=True,
        )

    def test_paid_on_platform_rsvp_pending_and_mock_pay(self):
        self.client.force_authenticate(self.traveler)
        res = self.client.post(f"/api/events/{self.paid_event.id}/rsvp/", {"tickets": 2}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["status"], EventBookingStatus.PENDING)
        self.assertEqual(str(res.data["total_price"]), "200.00")
        bid = res.data["id"]
        self.traveler = User.objects.get(pk=self.traveler.pk)
        self.client.force_authenticate(self.traveler)
        res = self.client.post(f"/api/events/bookings/{bid}/mock_pay/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["booking"]["status"], EventBookingStatus.CONFIRMED)
        self.assertTrue(res.data["mock_payment_ref"].startswith("mock_"))

    def test_external_ticket_click_tracking(self):
        res = self.client.post(f"/api/events/{self.external_event.id}/track_ticket_click/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["clicks"], 1)
        self.external_event.refresh_from_db()
        self.assertEqual(self.external_event.external_ticket_clicks, 1)

    def test_external_rsvp_is_free_confirmed(self):
        self.client.force_authenticate(self.traveler)
        res = self.client.post(f"/api/events/{self.external_event.id}/rsvp/", {"tickets": 1}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["status"], EventBookingStatus.CONFIRMED)
        self.assertIsNone(res.data["total_price"])

    def test_create_recurring_template_via_api(self):
        self.client.force_authenticate(self.organizer)
        res = self.client.post(
            "/api/events/templates/",
            {
                "title": "Friday Night Live",
                "category": "music",
                "is_free": False,
                "price": "120",
                "ticket_url": "https://tickets.example.com/friday",
                "default_start_time": "20:00:00",
                "default_duration_minutes": 180,
                "recurrence": "weekly",
                "weekday": 4,
                "venue": "The Warehouse",
                "city": "Windhoek",
                "region": "Khomas",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["title"], "Friday Night Live")
        self.assertEqual(res.data["ticket_url"], "https://tickets.example.com/friday")

    def test_recurring_template_spawn(self):
        from events_app.models import EventRecurrenceTemplate

        template = EventRecurrenceTemplate.objects.create(
            organizer=self.organizer,
            business=self.business,
            title="Weekly Market",
            is_free=False,
            price="50",
            ticket_url="https://tickets.example.com/market",
            default_start_time=timezone.localtime().time().replace(hour=10, minute=0),
            recurrence="weekly",
            weekday=5,
        )
        self.client.force_authenticate(self.organizer)
        res = self.client.post(f"/api/events/templates/{template.id}/spawn/", {}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["title"], "Weekly Market")
        self.assertEqual(res.data["ticket_url"], "https://tickets.example.com/market")
        self.assertEqual(res.data["ticketing_mode"], "external")

    def test_provider_monetization_analytics(self):
        EventBooking.objects.create(
            event=self.paid_event,
            attendee=self.traveler,
            tickets=1,
            total_price="100.00",
            status=EventBookingStatus.CONFIRMED,
            booking_ref="EVT-PHASE4X",
        )
        self.external_event.external_ticket_clicks = 5
        self.external_event.save(update_fields=["external_ticket_clicks"])
        self.client.force_authenticate(self.organizer)
        res = self.client.get("/api/events/provider_analytics/?days=30")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.data["on_platform_revenue"], 100.0)
        self.assertGreaterEqual(res.data["external_ticket_clicks"], 5)
