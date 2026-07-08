from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import serializers

from config.cloudinary_media import cloudinary_video_delivery_url
from messaging.audio_validation import validate_message_audio_file
from messaging.image_validation import validate_message_image_file
from social.video_validation import validate_post_video_file

from tags.services import MAX_TAGS_PER_CONTENT, linkable_slugs_for_group, sync_group_tags

from .access import is_active_member, membership_for_user
from .membership import add_users_to_group, normalize_username, parse_username_list
from .tags_input import parse_group_tag_input
from .models import (
    CommunityGroup,
    GroupMembership,
    GroupMessage,
    GroupMessageReaction,
    GroupTopic,
    GroupVisibility,
    MembershipRole,
    MembershipStatus,
)
from .message_reactions import (
    ALLOWED_GROUP_MESSAGE_EMOJIS,
    normalize_group_message_emoji,
    reactions_summary_for_messages,
)

User = get_user_model()


def unique_group_slug(name: str) -> str:
    base = slugify(name)[:60] or "group"
    slug = base
    suffix = 2
    while CommunityGroup.objects.filter(slug=slug).exists():
        slug = f"{base}-{suffix}"[:80]
        suffix += 1
    return slug


class GroupAuthorSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source="profile.display_name", read_only=True)
    avatar = serializers.ImageField(source="profile.avatar", read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "display_name", "avatar")


class GroupMessageReplySerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="author.username", read_only=True)
    image = serializers.SerializerMethodField()
    video = serializers.SerializerMethodField()
    audio = serializers.SerializerMethodField()
    is_deleted = serializers.SerializerMethodField()

    class Meta:
        model = GroupMessage
        fields = ("id", "sender_username", "body", "image", "video", "audio", "is_deleted")

    def _media_url(self, field):
        if not field:
            return None
        request = self.context.get("request")
        url = field.url
        return request.build_absolute_uri(url) if request else url

    def get_image(self, obj):
        if obj.is_deleted_for_everyone:
            return None
        return self._media_url(obj.image)

    def get_video(self, obj):
        if obj.is_deleted_for_everyone:
            return None
        return cloudinary_video_delivery_url(self._media_url(obj.video))

    def get_audio(self, obj):
        if obj.is_deleted_for_everyone:
            return None
        return self._media_url(obj.audio)

    def get_is_deleted(self, obj):
        return obj.is_deleted_for_everyone

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.is_deleted_for_everyone:
            data["body"] = ""
        return data


class GroupMessageSerializer(serializers.ModelSerializer):
    author = GroupAuthorSerializer(read_only=True)
    sender_username = serializers.CharField(source="author.username", read_only=True)
    image = serializers.SerializerMethodField()
    video = serializers.SerializerMethodField()
    audio = serializers.SerializerMethodField()
    reply_to = serializers.SerializerMethodField()
    forwarded_from = serializers.SerializerMethodField()
    reactions = serializers.SerializerMethodField()
    is_deleted = serializers.SerializerMethodField()
    can_unsend = serializers.SerializerMethodField()

    class Meta:
        model = GroupMessage
        fields = (
            "id",
            "author",
            "sender_username",
            "body",
            "image",
            "video",
            "audio",
            "reply_to",
            "forwarded_from",
            "reactions",
            "is_deleted",
            "can_unsend",
            "created_at",
        )
        read_only_fields = ("author", "created_at")

    def _media_url(self, field):
        if not field:
            return None
        request = self.context.get("request")
        url = field.url
        return request.build_absolute_uri(url) if request else url

    def get_image(self, obj):
        if obj.is_deleted_for_everyone:
            return None
        return self._media_url(obj.image)

    def get_video(self, obj):
        if obj.is_deleted_for_everyone:
            return None
        return cloudinary_video_delivery_url(self._media_url(obj.video))

    def get_audio(self, obj):
        if obj.is_deleted_for_everyone:
            return None
        return self._media_url(obj.audio)

    def get_reply_to(self, obj):
        parent = getattr(obj, "reply_to", None)
        if not parent:
            return None
        return GroupMessageReplySerializer(parent, context=self.context).data

    def get_forwarded_from(self, obj):
        source = getattr(obj, "forwarded_from", None)
        if not source:
            return None
        return GroupMessageReplySerializer(source, context=self.context).data

    def get_reactions(self, obj):
        if obj.is_deleted_for_everyone:
            return []
        cached = getattr(obj, "_reactions_summary", None)
        if cached is not None:
            return cached
        return []

    def get_is_deleted(self, obj):
        return obj.is_deleted_for_everyone

    def get_can_unsend(self, obj):
        from .message_actions import can_unsend_message

        request = self.context.get("request")
        user = getattr(request, "user", None)
        return can_unsend_message(message=obj, user=user)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.is_deleted_for_everyone:
            data["body"] = ""
        return data


class GroupMessageCreateSerializer(serializers.ModelSerializer):
    reply_to_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = GroupMessage
        fields = ("body", "image", "video", "audio", "reply_to_id")

    def validate(self, attrs):
        body = (attrs.get("body") or "").strip()
        image = attrs.get("image")
        video = attrs.get("video")
        audio = attrs.get("audio")
        reply_to_id = attrs.pop("reply_to_id", None)

        media_count = sum(1 for item in (image, video, audio) if item is not None)
        if not body and media_count == 0:
            raise serializers.ValidationError("Add a message, photo, video, or voice note.")

        if media_count > 1:
            raise serializers.ValidationError("Use one attachment at a time.")

        if video is not None:
            try:
                validate_post_video_file(video)
            except Exception as exc:
                raise serializers.ValidationError({"video": getattr(exc, "messages", [str(exc)])}) from exc

        if image is not None:
            try:
                validate_message_image_file(image)
            except Exception as exc:
                raise serializers.ValidationError({"image": getattr(exc, "messages", [str(exc)])}) from exc

        if audio is not None:
            try:
                validate_message_audio_file(audio)
            except Exception as exc:
                raise serializers.ValidationError({"audio": getattr(exc, "messages", [str(exc)])}) from exc

        if body and len(body) > 4000:
            raise serializers.ValidationError({"body": "Message is too long."})

        group = self.context.get("group")
        if reply_to_id is not None:
            parent = GroupMessage.objects.filter(pk=reply_to_id, group=group, is_hidden=False).first()
            if parent is None:
                raise serializers.ValidationError({"reply_to_id": "Message not found."})
            attrs["reply_to"] = parent

        attrs["body"] = body
        return attrs


class GroupMessageReactSerializer(serializers.Serializer):
    emoji = serializers.CharField()

    def validate_emoji(self, value):
        normalized = normalize_group_message_emoji(value)
        if not normalized:
            raise serializers.ValidationError(
                f"Use one of: {' '.join(ALLOWED_GROUP_MESSAGE_EMOJIS)}"
            )
        return normalized


class GroupMessageDeleteSerializer(serializers.Serializer):
    scope = serializers.ChoiceField(choices=("me", "everyone"))


class GroupMessageForwardSerializer(serializers.Serializer):
    to_group_slug = serializers.SlugField()


class GroupMemberReviewSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    action = serializers.ChoiceField(choices=("approve", "reject"))


class GroupMemberRoleSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=MembershipRole.choices)


class GroupMemberSerializer(serializers.ModelSerializer):
    user = GroupAuthorSerializer(read_only=True)

    class Meta:
        model = GroupMembership
        fields = ("user", "role", "joined_at")


class GroupListSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True)
    last_message_preview = serializers.CharField(read_only=True, allow_null=True)
    last_active_at = serializers.DateTimeField(source="last_message_at", read_only=True, allow_null=True)
    cover_src = serializers.SerializerMethodField()
    joined = serializers.SerializerMethodField()
    pending_request = serializers.SerializerMethodField()
    tag_slugs = serializers.SerializerMethodField()

    class Meta:
        model = CommunityGroup
        fields = (
            "id",
            "slug",
            "name",
            "description",
            "topic",
            "visibility",
            "member_count",
            "last_message_preview",
            "last_active_at",
            "cover_src",
            "joined",
            "pending_request",
            "tag_slugs",
            "created_at",
        )

    def get_cover_src(self, obj):
        if not obj.cover_image:
            return None
        request = self.context.get("request")
        url = obj.cover_image.url
        return request.build_absolute_uri(url) if request else url

    def _membership(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        return membership_for_user(obj, request.user)

    def get_joined(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        status = getattr(obj, "my_status", None)
        if status is not None:
            return status == MembershipStatus.ACTIVE
        return is_active_member(obj, request.user)

    def get_pending_request(self, obj):
        row = self._membership(obj)
        return row is not None and row.status == MembershipStatus.PENDING

    def get_tag_slugs(self, obj):
        if hasattr(obj, "_prefetched_tag_slugs"):
            return obj._prefetched_tag_slugs
        return linkable_slugs_for_group(obj)


class GroupDetailSerializer(GroupListSerializer):
    created_by = GroupAuthorSerializer(read_only=True)
    my_role = serializers.SerializerMethodField()

    class Meta(GroupListSerializer.Meta):
        fields = GroupListSerializer.Meta.fields + ("created_by", "my_role")

    def get_my_role(self, obj):
        row = self._membership(obj)
        if not row or row.status != MembershipStatus.ACTIVE:
            return None
        return row.role


class GroupInboxSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(source="member_count_ann", read_only=True)
    cover_src = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = CommunityGroup
        fields = (
            "id",
            "slug",
            "name",
            "cover_src",
            "member_count",
            "last_message",
            "updated_at",
            "unread_count",
        )

    def get_cover_src(self, obj):
        if not obj.cover_image:
            return None
        request = self.context.get("request")
        url = obj.cover_image.url
        return request.build_absolute_uri(url) if request else url

    def _preview_body(self, obj) -> str:
        body = (getattr(obj, "last_message_body_ann", None) or "").strip()
        if body:
            return body[:200]
        if getattr(obj, "last_message_has_video_ann", None):
            return "[Video]"
        if getattr(obj, "last_message_has_image_ann", None):
            return "[Photo]"
        return ""

    def get_last_message(self, obj):
        created = getattr(obj, "last_message_created_ann", None)
        if not created:
            return None
        sender = getattr(obj, "last_message_sender_username_ann", None)
        if not sender:
            return None
        return {
            "body": self._preview_body(obj),
            "sender_username": sender,
            "created_at": created,
        }

    def get_updated_at(self, obj):
        if obj.last_message_at:
            return obj.last_message_at
        return obj.created_at

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0
        baseline = getattr(obj, "membership_last_read_ann", None) or getattr(
            obj, "membership_joined_ann", None
        )
        if not baseline:
            return 0
        return (
            GroupMessage.objects.filter(
                group_id=obj.pk,
                created_at__gt=baseline,
                is_hidden=False,
            )
            .exclude(author_id=request.user.pk)
            .count()
        )


class GroupCreateSerializer(serializers.ModelSerializer):
    member_usernames = serializers.CharField(required=False, allow_blank=True, write_only=True)
    tags = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = CommunityGroup
        fields = ("name", "description", "topic", "visibility", "cover_image", "member_usernames", "tags")

    def validate_name(self, value):
        cleaned = (value or "").strip()
        if len(cleaned) < 2:
            raise serializers.ValidationError("Name is too short.")
        return cleaned

    def validate_topic(self, value):
        if value not in GroupTopic.values:
            raise serializers.ValidationError("Invalid topic.")
        return value

    def validate_visibility(self, value):
        if value not in GroupVisibility.values:
            raise serializers.ValidationError("Invalid visibility.")
        return value

    def validate_tags(self, value):
        slugs = parse_group_tag_input(value)
        if len(slugs) > MAX_TAGS_PER_CONTENT:
            raise serializers.ValidationError(f"Use up to {MAX_TAGS_PER_CONTENT} tags per group.")
        return value

    def create(self, validated_data):
        request = self.context["request"]
        raw_members = validated_data.pop("member_usernames", "")
        raw_tags = validated_data.pop("tags", "")
        group = CommunityGroup.objects.create(
            slug=unique_group_slug(validated_data["name"]),
            created_by=request.user,
            **validated_data,
        )
        GroupMembership.objects.create(
            group=group,
            user=request.user,
            role=MembershipRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            last_read_at=timezone.now(),
        )
        usernames = parse_username_list(raw_members)
        if usernames:
            add_users_to_group(group=group, usernames=usernames, actor=request.user)
        tag_slugs = parse_group_tag_input(raw_tags)
        if tag_slugs:
            sync_group_tags(group, tag_slugs)
        return group


class GroupAddMembersSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, allow_blank=True)
    usernames = serializers.ListField(child=serializers.CharField(), required=False, allow_empty=True)

    def validate(self, attrs):
        single = normalize_username(attrs.get("username") or "")
        many = parse_username_list(attrs.get("usernames") or [])
        if single:
            many = parse_username_list([single, *many])
        if not many:
            raise serializers.ValidationError("Provide at least one username.")
        attrs["usernames"] = many
        return attrs
