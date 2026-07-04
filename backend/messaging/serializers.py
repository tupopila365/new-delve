from rest_framework import serializers

from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)

    class Meta:
        model = Message
        fields = ("id", "sender", "sender_username", "body", "read", "is_automated", "created_at")
        read_only_fields = ("sender", "read", "is_automated", "created_at")


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
        return MessageSerializer(m).data
