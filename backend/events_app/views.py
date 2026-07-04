import uuid
from datetime import timedelta

import django_filters
from django.db.models import Count, Exists, F, OuterRef, Q, Sum
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.business_access import provider_listing_owner_ids, user_can_manage_booking_for_listing
from accounts.permissions import IsEmailVerified, IsProviderOrBusinessMember, IsServiceProvider
from messaging.booking_automation import notify_booking_confirmed

from .access import manageable_organizer_ids, user_can_manage_event, user_can_manage_event_template
from .booking_serializers import (
    EventBookingSerializer,
    EventRsvpCreateSerializer,
    ProviderEventBookingSerializer,
    ProviderEventBookingStatusSerializer,
)
from .booking_utils import apply_booking_status
from .models import Event, EventAnswer, EventBooking, EventBookingStatus, EventLike, EventQuestion, EventReview, EventSave
from .qa_serializers import (
    EventAnswerCreateSerializer,
    EventQuestionCreateSerializer,
    EventQuestionSerializer,
    EventReviewCreateSerializer,
    EventReviewSerializer,
)
from .serializers import EventSerializer
from .template_serializers import EventRecurrenceTemplateSerializer, EventTemplateSpawnSerializer
from .analytics_services import provider_event_monetization_analytics
from .models import EventRecurrenceTemplate


class EventFilter(django_filters.FilterSet):
    from_date = django_filters.IsoDateTimeFilter(field_name="starts_at", lookup_expr="gte")
    to_date = django_filters.IsoDateTimeFilter(field_name="starts_at", lookup_expr="lte")
    organizer = django_filters.CharFilter(field_name="organizer__username", lookup_expr="iexact")
    when = django_filters.CharFilter(method="filter_when")
    business = django_filters.CharFilter(method="filter_business")

    class Meta:
        model = Event
        fields = ["category", "region", "city", "is_published", "is_free", "organizer"]

    def filter_when(self, queryset, name, value):
        value = (value or "").strip().lower()
        if not value:
            return queryset

        if value == "free":
            return queryset.filter(is_free=True)

        now = timezone.localtime()
        if value == "today":
            return queryset.filter(starts_at__date=now.date())

        if value == "weekend":
            # Match frontend: upcoming Sat 00:00 through Mon 00:00 (exclusive).
            day = now.weekday()  # Mon=0 … Sun=6
            days_until_sat = (5 - day + 7) % 7
            sat = (now + timedelta(days=days_until_sat)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            mon = sat + timedelta(days=2)
            return queryset.filter(starts_at__gte=sat, starts_at__lt=mon)

        return queryset

    def filter_business(self, queryset, name, value):
        value = (value or "").strip()
        if not value:
            return queryset
        if value.isdigit():
            return queryset.filter(business_id=int(value))
        return queryset.filter(business__slug__iexact=value)


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    filterset_class = EventFilter
    search_fields = ("title", "description", "venue", "region", "city")
    ordering_fields = ("starts_at", "created_at")
    ordering = ["starts_at"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsServiceProvider()]
        if self.action in ("like", "save", "rsvp"):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        user = self.request.user
        base = Event.objects.select_related(
            "organizer",
            "organizer__profile",
            "business",
        )

        if self.action in ("update", "partial_update", "destroy"):
            if not user.is_authenticated:
                return base.none()
            owner_ids = manageable_organizer_ids(user)
            return base.filter(
                Q(organizer_id__in=owner_ids)
                | Q(business__owner_id__in=owner_ids)
                | Q(business__memberships__user=user)
            ).distinct()

        mine = self.request.query_params.get("mine", "").strip().lower() in ("1", "true", "yes")
        if mine and user.is_authenticated:
            owner_ids = provider_listing_owner_ids(user)
            qs = base.filter(
                Q(organizer_id__in=owner_ids)
                | Q(business__owner_id__in=owner_ids)
                | Q(business__memberships__user=user)
            ).distinct()
            return self._annotate_engagement(qs)

        business_param = self.request.query_params.get("business", "").strip()
        if business_param:
            if business_param.isdigit():
                base = base.filter(business_id=int(business_param), is_published=True)
            else:
                base = base.filter(business__slug__iexact=business_param, is_published=True)
            return self._annotate_engagement(base)

        if self.action == "retrieve" and user.is_authenticated:
            qs = base.filter(Q(is_published=True) | Q(organizer=user))
            return self._annotate_engagement(qs)

        qs = base.filter(is_published=True)
        return self._annotate_engagement(qs)

    def _annotate_engagement(self, queryset):
        user = self.request.user
        qs = queryset.annotate(
            likes_count=Count("user_likes", distinct=True),
            saves_count=Count("user_saves", distinct=True),
            rsvp_count=Sum(
                "bookings__tickets",
                filter=Q(
                    bookings__status__in=[
                        EventBookingStatus.PENDING,
                        EventBookingStatus.CONFIRMED,
                        EventBookingStatus.CHECKED_IN,
                    ]
                ),
            ),
        )
        if user.is_authenticated:
            qs = qs.annotate(
                liked_by_me=Exists(
                    EventLike.objects.filter(event_id=OuterRef("pk"), user_id=user.id)
                ),
                saved_by_me=Exists(
                    EventSave.objects.filter(event_id=OuterRef("pk"), user_id=user.id)
                ),
                attending_by_me=Exists(
                    EventBooking.objects.filter(
                        event_id=OuterRef("pk"),
                        attendee_id=user.id,
                    ).exclude(status=EventBookingStatus.CANCELLED)
                ),
            )
        return qs

    def perform_update(self, serializer):
        event = self.get_object()
        if not user_can_manage_event(self.request.user, event):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You do not have permission to edit this event.")
        serializer.save()

    def perform_destroy(self, instance):
        if not user_can_manage_event(self.request.user, instance):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You do not have permission to delete this event.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def like(self, request, pk=None):
        event = self.get_object()
        like_obj, created = EventLike.objects.get_or_create(event=event, user=request.user)
        if not created:
            like_obj.delete()
            liked = False
        else:
            liked = True
        likes_count = EventLike.objects.filter(event=event).count()
        return Response({"liked": liked, "likes_count": likes_count})

    @action(detail=True, methods=["post"])
    def save(self, request, pk=None):
        event = self.get_object()
        save_obj, created = EventSave.objects.get_or_create(event=event, user=request.user)
        if not created:
            save_obj.delete()
            saved = False
        else:
            saved = True
        saves_count = EventSave.objects.filter(event=event).count()
        return Response({"saved": saved, "saves_count": saves_count})

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsEmailVerified])
    def rsvp(self, request, pk=None):
        event = self.get_object()
        if not event.is_published:
            return Response({"detail": "Event is not available for RSVP."}, status=status.HTTP_400_BAD_REQUEST)
        ser = EventRsvpCreateSerializer(data=request.data, context={"request": request, "event": event})
        ser.is_valid(raise_exception=True)
        booking = ser.save()
        return Response(EventBookingSerializer(booking).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def moments(self, request, pk=None):
        from social.models import Post
        from social.serializers import PostSerializer

        event = self.get_object()
        posts = (
            Post.objects.filter(event=event, is_delvers=True, is_hidden=False)
            .select_related("author", "author__profile")
            .order_by("-created_at")[:24]
        )
        ser = PostSerializer(posts, many=True, context={"request": request})
        return Response(ser.data)

    @action(detail=True, methods=["get", "post"])
    def questions(self, request, pk=None):
        event = self.get_object()
        if request.method == "GET":
            qs = (
                EventQuestion.objects.filter(event=event, is_hidden=False)
                .select_related("author", "author__profile")
                .prefetch_related("answers", "answers__author", "answers__author__profile")
                .order_by("-created_at")[:50]
            )
            return Response(EventQuestionSerializer(qs, many=True).data)
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
        ser = EventQuestionCreateSerializer(data=request.data, context={"request": request, "event": event})
        ser.is_valid(raise_exception=True)
        question = ser.save()
        return Response(EventQuestionSerializer(question).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def reviews(self, request, pk=None):
        event = self.get_object()
        qs = EventReview.objects.filter(event=event).select_related("reviewer", "reviewer__profile")[:50]
        rows = EventReviewSerializer(qs, many=True).data
        if rows:
            avg = sum(r["rating"] for r in rows) / len(rows)
        else:
            avg = 0
        return Response({"reviews": rows, "rating_avg": round(avg, 2), "rating_count": len(rows)})

    @action(detail=True, methods=["post"], permission_classes=[permissions.AllowAny])
    def track_ticket_click(self, request, pk=None):
        event = self.get_object()
        if not (event.ticket_url or "").strip():
            return Response({"detail": "No external ticket link."}, status=status.HTTP_400_BAD_REQUEST)
        Event.objects.filter(pk=event.pk).update(external_ticket_clicks=F("external_ticket_clicks") + 1)
        event.refresh_from_db(fields=["external_ticket_clicks"])
        return Response({"clicks": event.external_ticket_clicks})

    @action(detail=True, methods=["get"], permission_classes=[permissions.AllowAny])
    def ticket_redirect(self, request, pk=None):
        event = self.get_object()
        url = (event.ticket_url or "").strip()
        if not url:
            return Response({"detail": "No ticket link."}, status=status.HTTP_404_NOT_FOUND)
        Event.objects.filter(pk=event.pk).update(external_ticket_clicks=F("external_ticket_clicks") + 1)
        from django.http import HttpResponseRedirect

        return HttpResponseRedirect(url)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated, IsProviderOrBusinessMember])
    def provider_analytics(self, request):
        days_raw = request.query_params.get("days", "30")
        try:
            days = max(1, min(365, int(days_raw)))
        except (TypeError, ValueError):
            days = 30
        owner_ids = provider_listing_owner_ids(request.user)
        payload = provider_event_monetization_analytics(owner_ids=owner_ids, days=days)
        return Response(payload)


class EventBookingViewSet(viewsets.ReadOnlyModelViewSet):
    """Traveler RSVPs — list and manage own event bookings."""

    serializer_class = EventBookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            EventBooking.objects.filter(attendee=self.request.user)
            .select_related("event", "event__organizer", "event__organizer__profile")
            .prefetch_related("review")
            .order_by("-created_at")
        )

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        if booking.status in (EventBookingStatus.CANCELLED, EventBookingStatus.REFUNDED):
            return Response({"detail": "Booking already cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        booking.status = EventBookingStatus.CANCELLED
        booking.save(update_fields=["status"])
        return Response(EventBookingSerializer(booking).data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsEmailVerified])
    def mock_pay(self, request, pk=None):
        booking = self.get_object()
        if booking.status != EventBookingStatus.PENDING:
            return Response({"detail": "Booking not payable."}, status=status.HTTP_400_BAD_REQUEST)
        apply_booking_status(booking, EventBookingStatus.CONFIRMED)
        booking.mock_payment_ref = f"mock_{uuid.uuid4().hex[:16]}"
        booking.save(update_fields=["mock_payment_ref"])
        return Response(
            {
                "detail": "Payment successful (mock).",
                "status": booking.status,
                "mock_payment_ref": booking.mock_payment_ref,
                "booking": EventBookingSerializer(booking).data,
            }
        )

    @action(detail=True, methods=["get"])
    def ticket(self, request, pk=None):
        booking = self.get_object()
        if booking.status not in (
            EventBookingStatus.CONFIRMED,
            EventBookingStatus.CHECKED_IN,
            EventBookingStatus.PENDING,
        ):
            return Response({"detail": "No active ticket for this booking."}, status=status.HTTP_400_BAD_REQUEST)
        if not booking.check_in_token and booking.status in (
            EventBookingStatus.CONFIRMED,
            EventBookingStatus.CHECKED_IN,
        ):
            from .booking_utils import ensure_check_in_token

            ensure_check_in_token(booking)
        qr_payload = f"delve:event-checkin:{booking.booking_ref}:{booking.check_in_token}"
        return Response(
            {
                "booking_ref": booking.booking_ref,
                "check_in_token": booking.check_in_token,
                "qr_payload": qr_payload,
                "status": booking.status,
                "tickets": booking.tickets,
                "event_title": booking.event.title,
                "event_starts_at": booking.event.starts_at,
            }
        )

    @action(detail=True, methods=["post"])
    def self_check_in(self, request, pk=None):
        booking = self.get_object()
        token = (request.data.get("token") or "").strip()
        if booking.status != EventBookingStatus.CONFIRMED:
            return Response({"detail": "Booking is not eligible for check-in."}, status=status.HTTP_400_BAD_REQUEST)
        if not token or token != booking.check_in_token:
            return Response({"detail": "Invalid check-in token."}, status=status.HTTP_400_BAD_REQUEST)
        apply_booking_status(booking, EventBookingStatus.CHECKED_IN)
        return Response(EventBookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        booking = self.get_object()
        ser = EventReviewCreateSerializer(data=request.data, context={"request": request, "booking": booking})
        ser.is_valid(raise_exception=True)
        review = ser.save()
        return Response(EventReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class EventProviderBookingViewSet(viewsets.ReadOnlyModelViewSet):
    """Provider inbox — RSVPs for events the user manages."""

    serializer_class = ProviderEventBookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]

    def get_queryset(self):
        owner_ids = provider_listing_owner_ids(self.request.user)
        qs = (
            EventBooking.objects.select_related(
                "event",
                "event__organizer",
                "attendee",
                "attendee__profile",
            )
            .filter(event__organizer_id__in=owner_ids)
            .order_by("-created_at")
        )
        status_filter = (self.request.query_params.get("status") or "").strip()
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def _transition(self, request, pk, target_status):
        booking = self.get_object()
        if not user_can_manage_booking_for_listing(request.user, booking.event.organizer_id):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        ser = ProviderEventBookingStatusSerializer(
            data={"status": target_status},
            context={"booking": booking},
        )
        ser.is_valid(raise_exception=True)
        apply_booking_status(booking, target_status)
        if target_status == EventBookingStatus.CONFIRMED:
            notify_booking_confirmed(
                provider=booking.event.organizer,
                guest=booking.attendee,
                booking_type="booking_event",
                booking_id=booking.pk,
                context_label=booking.event.title,
            )
        return Response(ProviderEventBookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        return self._transition(request, pk, EventBookingStatus.CONFIRMED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._transition(request, pk, EventBookingStatus.CANCELLED)

    @action(detail=True, methods=["post"])
    def check_in(self, request, pk=None):
        return self._transition(request, pk, EventBookingStatus.CHECKED_IN)

    @action(detail=True, methods=["post"])
    def refund(self, request, pk=None):
        return self._transition(request, pk, EventBookingStatus.REFUNDED)


class EventQuestionAnswerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        question = EventQuestion.objects.select_related("event").filter(pk=pk, is_hidden=False).first()
        if not question:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = EventAnswerCreateSerializer(data=request.data, context={"request": request, "question": question})
        ser.is_valid(raise_exception=True)
        answer = ser.save()
        from .qa_serializers import EventAnswerSerializer

        return Response(EventAnswerSerializer(answer).data, status=status.HTTP_201_CREATED)


class EventRecurrenceTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = EventRecurrenceTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        owner_ids = provider_listing_owner_ids(user)
        return EventRecurrenceTemplate.objects.filter(
            Q(organizer_id__in=owner_ids)
            | Q(business__owner_id__in=owner_ids)
            | Q(business__memberships__user=user)
        ).distinct()

    def perform_update(self, serializer):
        template = self.get_object()
        if not user_can_manage_event_template(self.request.user, template):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You do not have permission to edit this template.")
        serializer.save()

    def perform_destroy(self, instance):
        if not user_can_manage_event_template(self.request.user, instance):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You do not have permission to delete this template.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def spawn(self, request, pk=None):
        template = self.get_object()
        if not user_can_manage_event_template(request.user, template):
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        ser = EventTemplateSpawnSerializer(data=request.data, context={"template": template, "request": request})
        ser.is_valid(raise_exception=True)
        event = ser.save()
        return Response(EventSerializer(event, context={"request": request}).data, status=status.HTTP_201_CREATED)
