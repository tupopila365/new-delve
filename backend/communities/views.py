from django.db import transaction
from django.db.models import Count, OuterRef, Q, Subquery
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, Throttled, ValidationError
from rest_framework.response import Response

from config.throttles import MessageSendThrottle

from tags.services import filter_groups_by_tag, group_ids_matching_tag_query, normalize_tag, prefetch_group_tag_slugs

from .access import (
    can_read_group_messages,
    can_view_group,
    filter_groups_for_viewer,
    is_active_member,
    is_group_admin,
    membership_for_user,
)
from .inbox import inbox_groups_for_user, mark_group_read
from .models import (
    CommunityGroup,
    GroupMembership,
    GroupMessage,
    GroupVisibility,
    MembershipRole,
    MembershipStatus,
)
from .membership import add_users_to_group
from .message_actions import (
    can_unsend_message,
    delete_group_message_for_everyone,
    delete_group_message_for_me,
    forward_group_message,
    messages_visible_to_user,
    VISIBLE_MESSAGE_Q,
)
from .message_reactions import reactions_summary_for_messages, toggle_group_message_reaction
from .serializers import (
    GroupAddMembersSerializer,
    GroupCreateSerializer,
    GroupDetailSerializer,
    GroupInboxSerializer,
    GroupListSerializer,
    GroupMemberSerializer,
    GroupMessageCreateSerializer,
    GroupMessageDeleteSerializer,
    GroupMessageForwardSerializer,
    GroupMessageReactSerializer,
    GroupMessageSerializer,
    GroupMemberReviewSerializer,
)

DEFAULT_MESSAGE_PAGE = 50
MAX_MESSAGE_PAGE = 100


def _annotate_groups(qs, user):
    last_msg = (
        GroupMessage.objects.filter(group_id=OuterRef("pk"))
        .filter(VISIBLE_MESSAGE_Q)
        .order_by("-created_at")
    )
    qs = qs.annotate(
        member_count=Count(
            "memberships",
            filter=Q(memberships__status=MembershipStatus.ACTIVE),
            distinct=True,
        ),
        last_message_preview=Subquery(last_msg.values("body")[:1]),
    )
    if user and user.is_authenticated:
        qs = qs.annotate(
            my_status=Subquery(
                GroupMembership.objects.filter(group_id=OuterRef("pk"), user=user).values("status")[:1]
            ),
        )
    return qs


def _paginate_messages(qs, *, before_id=None, limit=DEFAULT_MESSAGE_PAGE):
    limit = max(1, min(int(limit), MAX_MESSAGE_PAGE))
    page_qs = qs.order_by("-created_at")
    if before_id is not None:
        page_qs = page_qs.filter(id__lt=before_id)
    rows = list(page_qs[: limit + 1])
    has_more = len(rows) > limit
    rows = rows[:limit]
    rows.reverse()
    next_before_id = rows[0].id if has_more and rows else None
    return rows, has_more, next_before_id


class CommunityGroupViewSet(viewsets.ModelViewSet):
    lookup_field = "slug"
    lookup_value_regex = r"[^/]+"
    http_method_names = ["get", "post", "head", "options"]

    def get_permissions(self):
        if self.action in (
            "create",
            "join",
            "leave",
            "read",
            "inbox",
            "add_members",
            "pending_members",
            "review_member",
            "message_react",
            "message_delete",
            "message_forward",
            "messages",
            "members",
        ):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return GroupDetailSerializer
        if self.action == "create":
            return GroupCreateSerializer
        return GroupListSerializer

    def get_queryset(self):
        user = self.request.user
        qs = _annotate_groups(CommunityGroup.objects.all(), user if user.is_authenticated else None)

        mine = (self.request.query_params.get("mine") or "").strip().lower()
        if mine in ("1", "true", "yes"):
            if not user.is_authenticated:
                return CommunityGroup.objects.none()
            qs = qs.filter(
                memberships__user=user,
                memberships__status=MembershipStatus.ACTIVE,
            )
        else:
            qs = filter_groups_for_viewer(qs, user if user.is_authenticated else None)

        topic = (self.request.query_params.get("topic") or "").strip().lower()
        if topic:
            qs = qs.filter(topic=topic)

        tag_slug = (self.request.query_params.get("tag") or "").strip()
        q = (self.request.query_params.get("q") or "").strip()
        if not tag_slug and q.startswith("#"):
            tag_slug = normalize_tag(q.lstrip("#"))
            q = ""
        if tag_slug:
            qs = filter_groups_by_tag(qs, tag_slug)

        if q:
            tagged_ids = group_ids_matching_tag_query(q)
            qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q) | Q(pk__in=tagged_ids))

        return qs.distinct().order_by("-last_message_at", "-created_at")

    def get_object(self):
        group = super().get_object()
        if not can_view_group(group, self.request.user):
            raise NotFound()
        return group

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = list(queryset)
        prefetch_group_tag_slugs(page)
        serializer = self.get_serializer(page, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def inbox(self, request):
        rows = inbox_groups_for_user(request.user)
        ser = GroupInboxSerializer(rows, many=True, context=self.get_serializer_context())
        return Response(ser.data)

    def retrieve(self, request, *args, **kwargs):
        group = self.get_object()
        prefetch_group_tag_slugs([group])
        serializer = self.get_serializer(group)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        group = serializer.save()
        group = _annotate_groups(CommunityGroup.objects.filter(pk=group.pk), request.user).first()
        prefetch_group_tag_slugs([group])
        return Response(
            GroupDetailSerializer(group, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def members(self, request, slug=None):
        group = self.get_object()
        if not can_read_group_messages(group, request.user):
            raise PermissionDenied("Join this group to see members.")

        rows = (
            GroupMembership.objects.filter(group=group, status=MembershipStatus.ACTIVE)
            .select_related("user", "user__profile")
            .order_by("-role", "joined_at")
        )
        ser = GroupMemberSerializer(rows, many=True, context={"request": request})
        return Response(ser.data)

    @action(detail=True, methods=["post"], url_path="members/add")
    def add_members(self, request, slug=None):
        group = self.get_object()
        if not is_group_admin(group, request.user):
            raise PermissionDenied("Only group admins can add members.")
        ser = GroupAddMembersSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = add_users_to_group(
            group=group,
            usernames=ser.validated_data["usernames"],
            actor=request.user,
        )
        if not result["added"]:
            raise ValidationError({"detail": "No users were added.", "skipped": result["skipped"]})
        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="members/pending")
    def pending_members(self, request, slug=None):
        group = self.get_object()
        if not is_group_admin(group, request.user):
            raise PermissionDenied("Only group admins can review join requests.")
        rows = (
            GroupMembership.objects.filter(group=group, status=MembershipStatus.PENDING)
            .select_related("user", "user__profile")
            .order_by("joined_at")
        )
        ser = GroupMemberSerializer(rows, many=True, context=self.get_serializer_context())
        return Response(ser.data)

    @action(detail=True, methods=["post"], url_path="members/review")
    def review_member(self, request, slug=None):
        group = self.get_object()
        if not is_group_admin(group, request.user):
            raise PermissionDenied("Only group admins can review join requests.")
        ser = GroupMemberReviewSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user_id = ser.validated_data["user_id"]
        action_name = ser.validated_data["action"]
        membership = GroupMembership.objects.filter(
            group=group,
            user_id=user_id,
            status=MembershipStatus.PENDING,
        ).first()
        if membership is None:
            raise NotFound("Pending request not found.")
        if action_name == "approve":
            membership.status = MembershipStatus.ACTIVE
            membership.joined_at = timezone.now()
            membership.last_read_at = timezone.now()
            membership.save(update_fields=["status", "joined_at", "last_read_at"])
            return Response({"action": "approve", "joined": True})
        membership.delete()
        return Response({"action": "reject", "joined": False})

    @action(detail=True, methods=["post"])
    def join(self, request, slug=None):
        group = self.get_object()
        user = request.user
        existing = membership_for_user(group, user)
        if existing:
            if existing.status == MembershipStatus.ACTIVE:
                return Response({"detail": "already joined", "joined": True, "pending_request": False})
            if existing.status == MembershipStatus.PENDING:
                return Response({"detail": "request pending", "joined": False, "pending_request": True})
        status_value = (
            MembershipStatus.PENDING
            if group.visibility == GroupVisibility.PRIVATE
            else MembershipStatus.ACTIVE
        )
        GroupMembership.objects.create(
            group=group,
            user=user,
            role=MembershipRole.MEMBER,
            status=status_value,
            last_read_at=timezone.now(),
        )
        return Response(
            {
                "joined": status_value == MembershipStatus.ACTIVE,
                "pending_request": status_value == MembershipStatus.PENDING,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def leave(self, request, slug=None):
        group = self.get_object()
        deleted, _ = GroupMembership.objects.filter(group=group, user=request.user).delete()
        if not deleted:
            raise ValidationError({"detail": "not a member"})
        return Response({"left": True})

    @action(detail=True, methods=["post"])
    def read(self, request, slug=None):
        group = self.get_object()
        if not is_active_member(group, request.user):
            raise PermissionDenied("Join this group to read messages.")
        mark_group_read(group, request.user)
        return Response({"marked_read": True})

    @action(detail=True, methods=["get", "post"], url_path="messages")
    def messages(self, request, slug=None):
        group = self.get_object()

        if request.method == "GET":
            if not can_read_group_messages(group, request.user):
                raise PermissionDenied("Join this group to read messages.")

            if request.user.is_authenticated and is_active_member(group, request.user):
                mark_group_read(group, request.user)

            limit_raw = (request.query_params.get("limit") or "").strip()
            try:
                limit = int(limit_raw) if limit_raw else DEFAULT_MESSAGE_PAGE
            except ValueError:
                limit = DEFAULT_MESSAGE_PAGE
            before_raw = (request.query_params.get("before_id") or "").strip()
            before_id = int(before_raw) if before_raw.isdigit() else None

            qs = messages_visible_to_user(group=group, user=request.user).select_related(
                "author",
                "author__profile",
                "reply_to",
                "reply_to__author",
                "forwarded_from",
                "forwarded_from__author",
            )
            rows, has_more, next_before_id = _paginate_messages(qs, before_id=before_id, limit=limit)
            reaction_map = reactions_summary_for_messages(rows, request.user)
            for row in rows:
                row._reactions_summary = reaction_map.get(row.pk, [])
            ser = GroupMessageSerializer(rows, many=True, context={"request": request})
            return Response(
                {
                    "results": ser.data,
                    "has_more": has_more,
                    "next_before_id": next_before_id,
                }
            )

        if request.method == "POST":
            throttle = MessageSendThrottle()
            if not throttle.allow_request(request, self):
                raise Throttled(wait=throttle.wait())
        if not request.user.is_authenticated:
            raise PermissionDenied("Sign in to send messages.")
        if not is_active_member(group, request.user):
            raise PermissionDenied("Join this group to send messages.")

        ser = GroupMessageCreateSerializer(data=request.data, context={"request": request, "group": group})
        ser.is_valid(raise_exception=True)

        with transaction.atomic():
            message = ser.save(group=group, author=request.user)
            CommunityGroup.objects.filter(pk=group.pk).update(
                last_message_at=timezone.now(),
                updated_at=timezone.now(),
            )

        message = GroupMessage.objects.select_related(
            "author",
            "author__profile",
            "reply_to",
            "reply_to__author",
        ).get(pk=message.pk)
        message._reactions_summary = []
        out = GroupMessageSerializer(message, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["post"],
        url_path=r"messages/(?P<message_id>[0-9]+)/react",
    )
    def message_react(self, request, slug=None, message_id=None):
        group = self.get_object()
        if not is_active_member(group, request.user):
            raise PermissionDenied("Join this group to react to messages.")

        message = messages_visible_to_user(group=group, user=request.user).filter(pk=message_id).first()
        if message is None:
            raise NotFound()

        ser = GroupMessageReactSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        reactions = toggle_group_message_reaction(
            message=message,
            user=request.user,
            emoji=ser.validated_data["emoji"],
        )
        return Response({"reactions": reactions})

    @action(
        detail=True,
        methods=["post"],
        url_path=r"messages/(?P<message_id>[0-9]+)/delete",
    )
    def message_delete(self, request, slug=None, message_id=None):
        group = self.get_object()
        if not is_active_member(group, request.user):
            raise PermissionDenied("Join this group to delete messages.")

        message = messages_visible_to_user(group=group, user=request.user).filter(pk=message_id).first()
        if message is None:
            raise NotFound()

        ser = GroupMessageDeleteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        scope = ser.validated_data["scope"]

        if scope == "everyone":
            if not can_unsend_message(message=message, user=request.user):
                raise PermissionDenied("You can only delete your own recent messages for everyone.")
            delete_group_message_for_everyone(message=message, user=request.user)
            message = GroupMessage.objects.select_related(
                "author",
                "author__profile",
                "reply_to",
                "reply_to__author",
                "forwarded_from",
                "forwarded_from__author",
            ).get(pk=message.pk)
            message._reactions_summary = []
            out = GroupMessageSerializer(message, context={"request": request})
            return Response({"scope": "everyone", "message": out.data})

        delete_group_message_for_me(message=message, user=request.user)
        return Response({"scope": "me", "removed": True})

    @action(
        detail=True,
        methods=["post"],
        url_path=r"messages/(?P<message_id>[0-9]+)/forward",
    )
    def message_forward(self, request, slug=None, message_id=None):
        group = self.get_object()
        if not is_active_member(group, request.user):
            raise PermissionDenied("Join this group to forward messages.")

        message = (
            messages_visible_to_user(group=group, user=request.user)
            .filter(pk=message_id, is_hidden=False)
            .select_related("forwarded_from", "forwarded_from__author")
            .first()
        )
        if message is None:
            raise NotFound()
        if message.is_deleted_for_everyone:
            raise ValidationError({"detail": "This message was deleted."})

        ser = GroupMessageForwardSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        target_slug = ser.validated_data["to_group_slug"]
        target_group = CommunityGroup.objects.filter(slug=target_slug).first()
        if target_group is None or not can_view_group(target_group, request.user):
            raise NotFound("Target group not found.")
        if not is_active_member(target_group, request.user):
            raise PermissionDenied("Join the target group to forward messages.")

        try:
            forwarded = forward_group_message(source=message, user=request.user, target_group=target_group)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        forwarded = GroupMessage.objects.select_related(
            "author",
            "author__profile",
            "reply_to",
            "reply_to__author",
            "forwarded_from",
            "forwarded_from__author",
        ).get(pk=forwarded.pk)
        forwarded._reactions_summary = []
        out = GroupMessageSerializer(forwarded, context={"request": request})
        return Response(
            {
                "message": out.data,
                "to_group_slug": target_group.slug,
            },
            status=status.HTTP_201_CREATED,
        )
