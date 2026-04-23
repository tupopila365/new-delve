from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer


class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Conversation.objects.filter(participants=self.request.user)
            .prefetch_related("participants", "participants__profile")
            .order_by("-updated_at")
        )

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        conv = self.get_object()
        if not conv.participants.filter(id=request.user.id).exists():
            return Response({"detail": "Forbidden"}, status=403)
        if request.method == "GET":
            qs = conv.messages.select_related("sender").order_by("created_at")
            return Response(MessageSerializer(qs, many=True).data)
        body = request.data.get("body", "").strip()
        if not body:
            return Response({"detail": "body required"}, status=400)
        Message.objects.create(conversation=conv, sender=request.user, body=body)
        Conversation.objects.filter(pk=conv.pk).update(updated_at=timezone.now())
        return Response({"detail": "sent"}, status=status.HTTP_201_CREATED)


class StartOrGetConversationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        other_id = request.data.get("user_id")
        try:
            other_id = int(other_id)
        except (TypeError, ValueError):
            return Response({"detail": "invalid user_id"}, status=400)
        if other_id == request.user.id:
            return Response({"detail": "invalid user_id"}, status=400)
        from django.contrib.auth import get_user_model

        User = get_user_model()
        if not User.objects.filter(pk=other_id).exists():
            return Response({"detail": "user not found"}, status=404)
        qs = Conversation.objects.filter(participants=request.user)
        for c in qs:
            if c.participants.filter(id=other_id).exists():
                return Response(ConversationSerializer(c, context={"request": request}).data)
        conv = Conversation.objects.create()
        conv.participants.add(request.user_id, other_id)
        return Response(ConversationSerializer(conv, context={"request": request}).data)
