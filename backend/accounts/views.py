import os

from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .business_access import business_permissions
from .models import (
    BusinessMembership,
    BusinessProfile,
    BusinessTeamRole,
    BusinessVerificationDocument,
    EmailVerificationToken,
    User,
    VerificationStatus,
)
from .serializers import (
    BusinessProfileSerializer,
    BusinessVerificationDocumentSerializer,
    CreateBusinessSerializer,
    MyBusinessSerializer,
    ProfileSerializer,
    ProfileUpdateSerializer,
    PublicProfileSerializer,
    RegisterSerializer,
    UpdateMyBusinessSerializer,
)


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    email = serializers.EmailField(write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop(self.username_field, None)

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip().lower()
        password = attrs.get("password")
        if not email:
            raise serializers.ValidationError({"email": "Email is required."})
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist as exc:
            raise serializers.ValidationError({"email": "No account found with this email."}) from exc
        attrs[self.username_field] = user.get_username()
        attrs["password"] = password
        return super().validate(attrs)


class RegisterThrottle(AnonRateThrottle):
    scope = "register"


class LoginThrottle(AnonRateThrottle):
    scope = "login"


class ThrottledTokenView(TokenObtainPairView):
    throttle_classes = [LoginThrottle]
    serializer_class = EmailTokenObtainPairSerializer


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


class BusinessProfileListView(APIView):
    """List businesses — filter by owner username."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        owner = (request.query_params.get("owner") or "").strip()
        qs = BusinessProfile.objects.select_related("owner").all()
        if owner:
            qs = qs.filter(owner__username__iexact=owner)
        return Response(BusinessProfileSerializer(qs, context={"request": request}, many=True).data)


class BusinessProfileDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        business = get_object_or_404(BusinessProfile.objects.select_related("owner"), pk=pk)
        return Response(BusinessProfileSerializer(business, context={"request": request}).data)


class MyBusinessesView(APIView):
    """Businesses the current user owns or is a team member of, with role permissions."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        owned = BusinessProfile.objects.filter(owner=request.user)
        member_ids = BusinessMembership.objects.filter(user=request.user).values_list(
            "business_id", flat=True
        )
        member = BusinessProfile.objects.filter(pk__in=member_ids)
        businesses = (owned | member).distinct().select_related("owner")
        perms_map = {}
        for biz in businesses:
            perms = business_permissions(request.user, biz)
            perms_map[biz.pk] = {"role": perms.pop("role"), "permissions": perms}
        return Response(
            MyBusinessSerializer(
                businesses,
                many=True,
                context={"request": request, "permissions_map": perms_map},
            ).data
        )


def _get_owned_or_managed_business(request, pk: int) -> BusinessProfile:
    business = get_object_or_404(BusinessProfile.objects.select_related("owner"), pk=pk)
    perms = business_permissions(request.user, business)
    if not perms.get("manage_settings"):
        from rest_framework.exceptions import PermissionDenied

        raise PermissionDenied("You cannot manage this business.")
    return business


class CreateMyBusinessView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = request.user.profile
        if profile.user_type != "service_provider":
            return Response(
                {"detail": "Only service providers can create a business profile."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if BusinessProfile.objects.filter(owner=request.user).exists():
            return Response(
                {"detail": "You already have a business profile."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = CreateBusinessSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        business = serializer.save()
        BusinessMembership.objects.get_or_create(
            business=business,
            user=request.user,
            defaults={"role": BusinessTeamRole.OWNER},
        )
        perms = business_permissions(request.user, business)
        perms_map = {
            business.pk: {"role": perms.pop("role"), "permissions": perms},
        }
        return Response(
            MyBusinessSerializer(business, context={"request": request, "permissions_map": perms_map}).data,
            status=status.HTTP_201_CREATED,
        )


class UpdateMyBusinessView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        business = _get_owned_or_managed_business(request, pk)
        serializer = UpdateMyBusinessSerializer(business, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        perms = business_permissions(request.user, business)
        perms_map = {business.pk: {"role": perms.pop("role"), "permissions": perms}}
        return Response(
            MyBusinessSerializer(business, context={"request": request, "permissions_map": perms_map}).data
        )


class MyBusinessDocumentsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        business = _get_owned_or_managed_business(request, pk)
        docs = business.verification_documents.all()
        return Response(
            BusinessVerificationDocumentSerializer(docs, many=True, context={"request": request}).data
        )

    def post(self, request, pk):
        business = _get_owned_or_managed_business(request, pk)
        serializer = BusinessVerificationDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doc = serializer.save(business=business)
        return Response(
            BusinessVerificationDocumentSerializer(doc, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class SubmitBusinessVerificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        business = _get_owned_or_managed_business(request, pk)
        business.onboarding_completed = True
        business.verification_status = VerificationStatus.PENDING
        business.save(update_fields=["onboarding_completed", "verification_status", "updated_at"])
        perms = business_permissions(request.user, business)
        perms_map = {business.pk: {"role": perms.pop("role"), "permissions": perms}}
        return Response(
            MyBusinessSerializer(business, context={"request": request, "permissions_map": perms_map}).data
        )
