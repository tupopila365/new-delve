from rest_framework import serializers

from config.cloudinary_media import cloudinary_video_delivery_url
from social.video_validation import validate_post_video_file

from .audio_validation import validate_message_audio_file
from .image_validation import validate_message_image_file
from .models import Conversation, Message


class MessageReplySerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    image = serializers.SerializerMethodField()
    video = serializers.SerializerMethodField()
    audio = serializers.SerializerMethodField()
    is_deleted = serializers.SerializerMethodField()

    class Meta:
        model = Message
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


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    image = serializers.SerializerMethodField()
    video = serializers.SerializerMethodField()
    audio = serializers.SerializerMethodField()
    reply_to = serializers.SerializerMethodField()
    forwarded_from = serializers.SerializerMethodField()
    is_deleted = serializers.SerializerMethodField()
    can_unsend = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = (
            "id",
            "sender",
            "sender_username",
            "body",
            "image",
            "video",
            "audio",
            "reply_to",
            "forwarded_from",
            "read",
            "is_automated",
            "is_deleted",
            "can_unsend",
            "created_at",
        )
        read_only_fields = ("sender", "read", "is_automated", "created_at")

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
        return MessageReplySerializer(parent, context=self.context).data

    def get_forwarded_from(self, obj):
        source = getattr(obj, "forwarded_from", None)
        if not source:
            return None
        return MessageReplySerializer(source, context=self.context).data

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


class MessageCreateSerializer(serializers.ModelSerializer):
    reply_to_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Message
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

        if body and len(body) > 2000:
            raise serializers.ValidationError({"body": "Message is too long (max 2000 characters)."})

        conversation = self.context.get("conversation")
        if reply_to_id is not None:
            parent = Message.objects.filter(
                pk=reply_to_id, conversation=conversation, is_hidden=False
            ).first()
            if parent is None:
                raise serializers.ValidationError({"reply_to_id": "Message not found."})
            attrs["reply_to"] = parent

        attrs["body"] = body
        return attrs


class MessageDeleteSerializer(serializers.Serializer):
    scope = serializers.ChoiceField(choices=("me", "everyone"))


class MessageForwardSerializer(serializers.Serializer):
    to_conversation_id = serializers.IntegerField()


def _participant_payload(user, request) -> dict:
    profile = getattr(user, "profile", None)
    display_name = getattr(profile, "display_name", None) or user.username
    avatar = None
    if profile is not None and getattr(profile, "avatar", None):
        url = profile.avatar.url
        avatar = request.build_absolute_uri(url) if request else url
    return {
        "id": user.id,
        "username": user.username,
        "display_name": display_name,
        "avatar": avatar,
    }


class ConversationSerializer(serializers.ModelSerializer):
    participants_detail = serializers.SerializerMethodField()
    other = serializers.SerializerMethodField()
    context = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            "id",
            "pair_key",
            "participants_detail",
            "other",
            "context",
            "created_at",
            "updated_at",
            "last_message",
            "unread_count",
        )
        read_only_fields = fields

    def get_context(self, obj):
        return obj.context_payload()

    def get_participants_detail(self, obj):
        request = self.context.get("request")
        return [_participant_payload(u, request) for u in obj.participants.all()]

    def get_other(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        for user in obj.participants.all():
            if user.id != request.user.id:
                return _participant_payload(user, request)
        return None

    def get_unread_count(self, obj):
        annotated = getattr(obj, "unread_count_ann", None)
        if annotated is not None:
            return int(annotated)
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0
        return obj.messages.filter(read=False).exclude(sender=request.user).count()

    def get_last_message(self, obj):
        mid = getattr(obj, "last_message_id_ann", None)
        if hasattr(obj, "last_message_id_ann"):
            if not mid:
                return None
            return {
                "id": mid,
                "sender": obj.last_message_sender_id_ann,
                "sender_username": obj.last_message_sender_username_ann,
                "body": obj.last_message_body_ann,
                "read": bool(obj.last_message_read_ann),
                "is_automated": bool(getattr(obj, "last_message_is_automated_ann", False)),
                "created_at": obj.last_message_created_ann,
            }
        m = obj.messages.select_related("sender").order_by("-created_at").first()
        if not m:
            return None
        return MessageSerializer(m, context=self.context).data
