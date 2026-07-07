from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.db.models import Count, OuterRef, Q, Subquery
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, Throttled, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.profile_access import can_message
from config.throttles import MessageSendThrottle, MessageStartThrottle, MessagingPeopleSearchThrottle

from .message_actions import (
    delete_message_for_everyone,
    delete_message_for_me,
    forward_message,
    messages_visible_to_user,
)
from .models import (
    CONTEXT_TYPES,
    Conversation,
    MAX_AUTO_WELCOME_BODY,
    Message,
    MessageBlock,
    make_pair_key,
    resolve_context_label,
)
from .provider_messaging import (
    get_or_create_provider_messaging_settings,
    normalize_quick_replies,
    resolve_provider_messaging_access,
    resolve_settings_for_read,
    send_provider_auto_welcome_if_needed,
    serialize_provider_messaging_settings_response,
    validate_provider_messaging_settings,
)
from .serializers import (
    ConversationSerializer,
    MessageCreateSerializer,
    MessageDeleteSerializer,
    MessageForwardSerializer,
    MessageSerializer,
)

TYPING_TTL_SECONDS = 4

User = get_user_model()

DEFAULT_MESSAGE_PAGE = 50
MAX_MESSAGE_PAGE = 100


def can_unsend_message_for_request(*, message: Message, user) -> bool:
    from .message_actions import can_unsend_message

    return can_unsend_message(message=message, user=user)


def _conversations_for_user(user):
    """List/detail queryset with unread + last-message annotations (no N+1)."""
    last_msg = Message.objects.filter(conversation_id=OuterRef("pk")).order_by("-created_at")
    return (
        Conversation.objects.filter(participants=user)
        .annotate(
            unread_count_ann=Count(
                "messages",
                filter=Q(messages__read=False) & ~Q(messages__sender_id=user.pk),
                distinct=True,
            ),
            last_message_id_ann=Subquery(last_msg.values("id")[:1]),
            last_message_body_ann=Subquery(last_msg.values("body")[:1]),
            last_message_sender_id_ann=Subquery(last_msg.values("sender_id")[:1]),
            last_message_sender_username_ann=Subquery(last_msg.values("sender__username")[:1]),
            last_message_created_ann=Subquery(last_msg.values("created_at")[:1]),
            last_message_read_ann=Subquery(last_msg.values("read")[:1]),
            last_message_is_automated_ann=Subquery(last_msg.values("is_automated")[:1]),
        )
        .prefetch_related("participants", "participants__profile")
        .order_by("-updated_at")
    )


def _mark_conversation_read(conversation, user) -> int:
    return (
        Message.objects.filter(conversation=conversation, read=False)
        .exclude(sender=user)
        .update(read=True)
    )


def _paginate_messages(qs, *, before_id=None, limit=DEFAULT_MESSAGE_PAGE):
    limit = max(1, min(int(limit), MAX_MESSAGE_PAGE))
    page_qs = qs.order_by("-created_at")
    if before_id is not None:
        page_qs = page_qs.filter(id__lt=before_id)
    rows = list(page_qs[: limit + 1])
    has_more = len(rows) > limit
    rows = rows[:limit]
    rows.reverse()  # chronological for the client
    next_before_id = rows[0].id if has_more and rows else None
    return rows, has_more, next_before_id


def _resolve_other_user(data):
    """Resolve recipient from user_id and/or username."""
    username = (data.get("username") or "").strip()
    user_id = data.get("user_id")

    if username:
        other = User.objects.select_related("profile").filter(username__iexact=username).first()
        if not other:
            return None, Response({"detail": "user not found"}, status=404)
        return other, None

    try:
        other_id = int(user_id)
    except (TypeError, ValueError):
        return None, Response({"detail": "user_id or username required"}, status=400)

    other = User.objects.select_related("profile").filter(pk=other_id).first()
    if not other:
        return None, Response({"detail": "user not found"}, status=404)
    return other, None


def _apply_context(conversation: Conversation, data) -> Conversation:
    """Attach or refresh marketplace context on a thread (latest wins)."""
    context_type = (data.get("context_type") or "").strip().lower()
    if not context_type or context_type not in CONTEXT_TYPES:
        return conversation

    context_id = data.get("context_id")
    try:
        context_id = int(context_id) if context_id is not None and context_id != "" else None
    except (TypeError, ValueError):
        context_id = None

    label = resolve_context_label(
        context_type,
        context_id,
        fallback=(data.get("context_label") or ""),
    )
    Conversation.objects.filter(pk=conversation.pk).update(
        context_type=context_type,
        context_id=context_id,
        context_label=label,
    )
    conversation.context_type = context_type
    conversation.context_id = context_id
    conversation.context_label = label
    return conversation


class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return _conversations_for_user(self.request.user)

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        conv = self.get_object()
        if not conv.participants.filter(id=request.user.id).exists():
            return Response({"detail": "Forbidden"}, status=403)
        if request.method == "POST":
            throttle = MessageSendThrottle()
            if not throttle.allow_request(request, self):
                raise Throttled(wait=throttle.wait())
        if request.method == "GET":
            before_raw = request.query_params.get("before_id")
            before_id = None
            if before_raw not in (None, ""):
                try:
                    before_id = int(before_raw)
                except (TypeError, ValueError):
                    return Response({"detail": "invalid before_id"}, status=400)
            try:
                limit = int(request.query_params.get("limit") or DEFAULT_MESSAGE_PAGE)
            except (TypeError, ValueError):
                limit = DEFAULT_MESSAGE_PAGE
            qs = messages_visible_to_user(conversation=conv, user=request.user).select_related(
                "sender",
                "reply_to",
                "reply_to__sender",
                "forwarded_from",
                "forwarded_from__sender",
            )
            rows, has_more, next_before_id = _paginate_messages(qs, before_id=before_id, limit=limit)
            return Response(
                {
                    "results": MessageSerializer(rows, many=True, context={"request": request}).data,
                    "has_more": has_more,
                    "next_before_id": next_before_id,
                }
            )
        other = conv.participants.exclude(id=request.user.id).first()
        if other and not can_message(request.user, other):
            return Response({"detail": "You cannot message this user."}, status=403)
        ser = MessageCreateSerializer(data=request.data, context={"request": request, "conversation": conv})
        ser.is_valid(raise_exception=True)
        msg = ser.save(conversation=conv, sender=request.user)
        Conversation.objects.filter(pk=conv.pk).update(updated_at=timezone.now())
        msg = Message.objects.select_related(
            "sender",
            "reply_to",
            "reply_to__sender",
            "forwarded_from",
            "forwarded_from__sender",
        ).get(pk=msg.pk)
        return Response(MessageSerializer(msg, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["post"],
        url_path=r"messages/(?P<message_id>[0-9]+)/delete",
    )
    def message_delete(self, request, pk=None, message_id=None):
        conv = self.get_object()
        if not conv.participants.filter(id=request.user.id).exists():
            return Response({"detail": "Forbidden"}, status=403)

        message = messages_visible_to_user(conversation=conv, user=request.user).filter(pk=message_id).first()
        if message is None:
            raise NotFound()

        ser = MessageDeleteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        scope = ser.validated_data["scope"]

        if scope == "everyone":
            if not can_unsend_message_for_request(message=message, user=request.user):
                raise PermissionDenied("You can only delete your own recent messages for everyone.")
            delete_message_for_everyone(message=message, user=request.user)
            message = Message.objects.select_related(
                "sender",
                "reply_to",
                "reply_to__sender",
                "forwarded_from",
                "forwarded_from__sender",
            ).get(pk=message.pk)
            return Response(
                {
                    "scope": scope,
                    "message": MessageSerializer(message, context={"request": request}).data,
                }
            )

        delete_message_for_me(message=message, user=request.user)
        return Response({"scope": scope, "removed": True})

    @action(
        detail=True,
        methods=["post"],
        url_path=r"messages/(?P<message_id>[0-9]+)/forward",
    )
    def message_forward(self, request, pk=None, message_id=None):
        conv = self.get_object()
        if not conv.participants.filter(id=request.user.id).exists():
            return Response({"detail": "Forbidden"}, status=403)

        message = (
            messages_visible_to_user(conversation=conv, user=request.user)
            .filter(pk=message_id)
            .select_related("forwarded_from", "forwarded_from__sender")
            .first()
        )
        if message is None:
            raise NotFound()
        if message.is_deleted_for_everyone:
            raise ValidationError({"detail": "This message was deleted."})

        ser = MessageForwardSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        target_id = ser.validated_data["to_conversation_id"]

        target_conv = Conversation.objects.filter(pk=target_id, participants=request.user).first()
        if target_conv is None:
            raise PermissionDenied("Conversation not found.")

        try:
            forwarded = forward_message(source=message, user=request.user, target_conversation=target_conv)
        except PermissionError as exc:
            raise PermissionDenied(str(exc)) from exc
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        forwarded = Message.objects.select_related(
            "sender",
            "reply_to",
            "reply_to__sender",
            "forwarded_from",
            "forwarded_from__sender",
        ).get(pk=forwarded.pk)
        return Response(
            {
                "message": MessageSerializer(forwarded, context={"request": request}).data,
                "to_conversation_id": target_conv.pk,
            }
        )

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, pk=None):
        conv = self.get_object()
        if not conv.participants.filter(id=request.user.id).exists():
            return Response({"detail": "Forbidden"}, status=403)
        marked = _mark_conversation_read(conv, request.user)
        return Response({"marked_read": marked})

    @action(detail=True, methods=["get", "post"], url_path="typing")
    def typing(self, request, pk=None):
        conv = self.get_object()
        if not conv.participants.filter(id=request.user.id).exists():
            return Response({"detail": "Forbidden"}, status=403)
        if request.method == "POST":
            cache.set(
                f"messaging:typing:{conv.pk}:{request.user.pk}",
                request.user.username,
                timeout=TYPING_TTL_SECONDS,
            )
            return Response({"ok": True})
        typing_users = []
        for user in conv.participants.exclude(id=request.user.id):
            username = cache.get(f"messaging:typing:{conv.pk}:{user.pk}")
            if username:
                typing_users.append({"id": user.id, "username": username})
        return Response({"typing": typing_users})


def _serialize_messaging_person(user, request) -> dict:
    profile = user.profile
    avatar = None
    if profile.avatar:
        avatar = request.build_absolute_uri(profile.avatar.url)
    return {
        "id": user.id,
        "username": user.username,
        "display_name": profile.display_name or user.username,
        "avatar": avatar,
        "city": profile.city or "",
        "region": profile.region or "",
    }


def _provider_principal_user_ids(user) -> set[int]:
    """Listing/booking owners whose guests this user may message as a provider."""
    from accounts.models import BusinessMembership

    ids = {user.pk}
    ids.update(
        BusinessMembership.objects.filter(user=user).values_list("business__owner_id", flat=True)
    )
    return ids


def _provider_guest_user_ids(user) -> set[int]:
    """Guest user IDs with bookings on this provider's listings, guides, venues, or transport."""
    principal_ids = _provider_principal_user_ids(user)
    guest_ids: set[int] = set()

    from accommodation.models import AccommodationBooking
    from food.models import FoodReservation
    from guides.models import GuideBooking
    from transport.models import SeatReservation, VehicleRentalBooking

    guest_ids.update(
        AccommodationBooking.objects.filter(listing__owner_id__in=principal_ids).values_list(
            "guest_id", flat=True
        )
    )
    guest_ids.update(
        GuideBooking.objects.filter(guide__user_id__in=principal_ids).values_list("client_id", flat=True)
    )
    guest_ids.update(
        VehicleRentalBooking.objects.filter(listing__owner_id__in=principal_ids).values_list(
            "renter_id", flat=True
        )
    )
    guest_ids.update(
        SeatReservation.objects.filter(trip__route__operator__owner_id__in=principal_ids).values_list(
            "passenger_id", flat=True
        )
    )
    guest_ids.update(
        FoodReservation.objects.filter(venue__owner_id__in=principal_ids).values_list("guest_id", flat=True)
    )
    guest_ids.discard(user.pk)
    return guest_ids


def _messageable_users_queryset(viewer, *, provider_context: bool = False):
    """Users the viewer may discover for a new message thread."""
    qs = (
        User.objects.filter(is_active=True, profile__allow_messages=True)
        .exclude(pk=viewer.pk)
        .exclude(
            Q(messaging_blocks_received__blocker=viewer) | Q(messaging_blocks_created__blocked=viewer)
        )
        .select_related("profile")
        .distinct()
    )
    if provider_context:
        allowed_ids = _provider_guest_user_ids(viewer) | set(_recent_conversation_partner_ids(viewer))
        qs = qs.filter(pk__in=allowed_ids)
    else:
        qs = qs.filter(profile__show_in_search=True)
    return qs


def _people_search_rank(q_lower: str, user) -> tuple[int, str]:
    username = user.username.lower()
    display = (user.profile.display_name or "").lower()
    if username == q_lower:
        return (0, username)
    if username.startswith(q_lower):
        return (1, username)
    if q_lower in username:
        return (2, username)
    if q_lower in display:
        return (3, username)
    return (4, username)


def _recent_conversation_partner_ids(viewer, *, limit: int = 20) -> list[int]:
    partner_ids: list[int] = []
    seen: set[int] = set()
    conversations = (
        Conversation.objects.filter(participants=viewer)
        .prefetch_related("participants")
        .order_by("-updated_at")[:limit]
    )
    for conv in conversations:
        for participant in conv.participants.all():
            if participant.pk == viewer.pk or participant.pk in seen:
                continue
            if not can_message(viewer, participant):
                continue
            seen.add(participant.pk)
            partner_ids.append(participant.pk)
            break
    return partner_ids


class MessagingPeopleSearchView(APIView):
    """Search messageable users for the new-message compose sheet."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [MessagingPeopleSearchThrottle]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        try:
            limit = int(request.query_params.get("limit") or (20 if q else 12))
        except (TypeError, ValueError):
            limit = 20 if q else 12
        limit = max(1, min(limit, 25))

        context = (request.query_params.get("context") or "").strip().lower()
        provider_context = context == "provider"
        base = _messageable_users_queryset(request.user, provider_context=provider_context)

        if q:
            q_lower = q.lower()
            rows = list(
                base.filter(
                    Q(username__icontains=q)
                    | Q(profile__display_name__icontains=q)
                    | Q(profile__city__icontains=q)
                    | Q(profile__region__icontains=q)
                )[:100]
            )
            rows.sort(key=lambda user: _people_search_rank(q_lower, user))
            rows = rows[:limit]
        else:
            recent_ids = _recent_conversation_partner_ids(request.user)
            recent_map = {user.pk: user for user in base.filter(pk__in=recent_ids)}
            rows = [recent_map[pk] for pk in recent_ids if pk in recent_map]
            if len(rows) < limit:
                exclude = {user.pk for user in rows}
                filler = (
                    base.exclude(pk__in=exclude)
                    .order_by("username")[: limit - len(rows)]
                )
                rows.extend(filler)

        return Response({"results": [_serialize_messaging_person(user, request) for user in rows]})


class StartOrGetConversationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [MessageStartThrottle]

    def post(self, request):
        other, err = _resolve_other_user(request.data)
        if err is not None:
            return err
        if other.id == request.user.id:
            return Response({"detail": "invalid user_id"}, status=400)
        if not can_message(request.user, other):
            return Response(
                {"detail": "You cannot message this user."},
                status=403,
            )

        pair_key = make_pair_key(request.user.id, other.id)
        existing = Conversation.objects.filter(pair_key=pair_key).first()
        if existing is None:
            # Legacy threads created before pair_key.
            existing = (
                Conversation.objects.filter(participants=request.user)
                .filter(participants=other)
                .filter(Q(pair_key__isnull=True) | Q(pair_key=""))
                .distinct()
                .first()
            )
            if existing is not None and not existing.pair_key:
                Conversation.objects.filter(pk=existing.pk).update(pair_key=pair_key)
                existing.pair_key = pair_key

        if existing is not None:
            _apply_context(existing, request.data)
            conv = _conversations_for_user(request.user).filter(pk=existing.pk).first() or existing
            return Response(ConversationSerializer(conv, context={"request": request}).data)

        try:
            with transaction.atomic():
                conv = Conversation.objects.create(pair_key=pair_key)
                conv.participants.add(request.user.id, other.id)
                _apply_context(conv, request.data)
                send_provider_auto_welcome_if_needed(
                    conv,
                    request.user,
                    other,
                    start_data=request.data,
                )
        except IntegrityError:
            conv = Conversation.objects.filter(pair_key=pair_key).first()
            if conv is None:
                raise

        _apply_context(conv, request.data)
        conv = _conversations_for_user(request.user).filter(pk=conv.pk).first() or conv
        return Response(ConversationSerializer(conv, context={"request": request}).data)


class ProviderMessagingSettingsView(APIView):
    """Automated welcome and quick replies for providers and business managers."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        access, err = resolve_provider_messaging_access(
            request.user,
            request.query_params.get("business_id"),
        )
        if err:
            return err
        row, inherits = resolve_settings_for_read(access)
        return Response(serialize_provider_messaging_settings_response(row, access, inherits_account_default=inherits))

    def patch(self, request):
        access, err = resolve_provider_messaging_access(
            request.user,
            request.query_params.get("business_id"),
        )
        if err:
            return err
        row = get_or_create_provider_messaging_settings(access.owner, business=access.business)
        data = request.data
        if "auto_welcome_enabled" in data:
            row.auto_welcome_enabled = bool(data["auto_welcome_enabled"])
        if "auto_welcome_body" in data:
            body = str(data["auto_welcome_body"] or "").strip()
            row.auto_welcome_body = body[:MAX_AUTO_WELCOME_BODY]
        if "booking_confirmed_enabled" in data:
            row.booking_confirmed_enabled = bool(data["booking_confirmed_enabled"])
        if "booking_confirmed_body" in data:
            body = str(data["booking_confirmed_body"] or "").strip()
            row.booking_confirmed_body = body[:MAX_AUTO_WELCOME_BODY]
        if "quick_replies_enabled" in data:
            row.quick_replies_enabled = bool(data["quick_replies_enabled"])
        if "quick_replies" in data:
            row.quick_replies = normalize_quick_replies(data["quick_replies"])
        err = validate_provider_messaging_settings(row)
        if err:
            return Response({"detail": err}, status=400)
        row.save()
        return Response(
            serialize_provider_messaging_settings_response(row, access, inherits_account_default=False)
        )


class UnreadCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from communities.inbox import total_group_unread_for_user

        dm_unread = (
            Message.objects.filter(
                conversation__participants=request.user,
                read=False,
            )
            .exclude(sender=request.user)
            .count()
        )
        group_unread = total_group_unread_for_user(request.user)
        return Response({"unread": dm_unread + group_unread, "dm": dm_unread, "groups": group_unread})


class MessageBlockListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rows = (
            MessageBlock.objects.filter(blocker=request.user)
            .select_related("blocked", "blocked__profile")
            .order_by("-created_at")
        )
        return Response(
            [
                {
                    "id": row.blocked_id,
                    "username": row.blocked.username,
                    "display_name": getattr(row.blocked.profile, "display_name", row.blocked.username),
                    "created_at": row.created_at,
                }
                for row in rows
            ]
        )

    def post(self, request):
        other, err = _resolve_other_user(request.data)
        if err is not None:
            return err
        if other.id == request.user.id:
            return Response({"detail": "invalid user_id"}, status=400)
        block, created = MessageBlock.objects.get_or_create(blocker=request.user, blocked=other)
        return Response(
            {
                "id": other.id,
                "username": other.username,
                "display_name": getattr(other.profile, "display_name", other.username),
                "created_at": block.created_at,
                "created": created,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class MessageBlockDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, user_id: int):
        deleted, _ = MessageBlock.objects.filter(blocker=request.user, blocked_id=user_id).delete()
        if not deleted:
            return Response({"detail": "Not found"}, status=404)
        return Response(status=status.HTTP_204_NO_CONTENT)
