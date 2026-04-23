import os

from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import EmailVerificationToken, User
from .serializers import (
    ProfileSerializer,
    ProfileUpdateSerializer,
    PublicProfileSerializer,
    RegisterSerializer,
)


class RegisterThrottle(AnonRateThrottle):
    scope = "register"


class LoginThrottle(AnonRateThrottle):
    scope = "login"


class ThrottledTokenView(TokenObtainPairView):
    throttle_classes = [LoginThrottle]


class CheckUsernameView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response(
                {"available": False, "detail": "Query must be at least 2 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        taken = User.objects.filter(username__iexact=q).exists()
        return Response({"available": not taken, "username": q})


class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer
    throttle_classes = [RegisterThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token = EmailVerificationToken.create_for_user(user)
        frontend = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
        link = f"{frontend}/verify-email?token={token.token}"
        send_mail(
            subject="Verify your DELVE account",
            message=f"Hi {user.username},\n\nVerify your email: {link}\n\nToken: {token.token}",
            from_email=None,
            recipient_list=[user.email],
            fail_silently=True,
        )
        return Response(
            {
                "detail": "Account created. Check your email (or console in dev) to verify.",
                "user_id": user.id,
                "username": user.username,
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from uuid import UUID

        raw = request.data.get("token")
        if not raw:
            return Response({"detail": "token required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            UUID(str(raw))
        except ValueError:
            return Response({"detail": "invalid token"}, status=status.HTTP_400_BAD_REQUEST)
        t = EmailVerificationToken.objects.filter(token=raw, used=False).select_related("user").first()
        if not t or t.is_expired():
            return Response({"detail": "invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)
        t.used = True
        t.save(update_fields=["used"])
        profile = t.user.profile
        profile.email_verified = True
        profile.save(update_fields=["email_verified"])
        return Response({"detail": "Email verified."})


class MeView(generics.RetrieveAPIView):
    serializer_class = ProfileSerializer

    def get_object(self):
        return self.request.user.profile


class ProfileUpdateView(generics.UpdateAPIView):
    serializer_class = ProfileUpdateSerializer
    http_method_names = ["patch"]

    def get_object(self):
        return self.request.user.profile


class PublicProfileView(APIView):
    """Lookup profile by username (case-insensitive)."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        user = get_object_or_404(User.objects.select_related("profile"), username__iexact=username)
        return Response(PublicProfileSerializer(user.profile, context={"request": request}).data)
