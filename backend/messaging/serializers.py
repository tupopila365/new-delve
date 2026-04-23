from rest_framework import serializers

from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)

    class Meta:
        model = Message
        fields = ("id", "sender", "sender_username", "body", "read", "created_at")
        read_only_fields = ("sender", "read", "created_at")


class ConversationSerializer(serializers.ModelSerializer):
    participants_detail = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            "id",
            "participants_detail",
            "created_at",
            "updated_at",
            "last_message",
        )
        read_only_fields = fields

    def get_participants_detail(self, obj):
        return [
            {"id": u.id, "username": u.username, "display_name": getattr(u.profile, "display_name", u.username)}
            for u in obj.participants.all()
        ]

    def get_last_message(self, obj):
        m = obj.messages.order_by("-created_at").first()
        if not m:
            return None
        return MessageSerializer(m).data
