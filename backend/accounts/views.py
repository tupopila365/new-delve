import os

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from config.throttles import (
    AccountDeleteThrottle,
    PasswordResetConfirmThrottle,
    PasswordResetThrottle,
    ResendVerificationThrottle,
)
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .verification_email import VERIFICATION_SENT_MESSAGE, can_resend_verification, send_verification_email

from .business_access import business_permissions
from .platform_audit import log_admin_action
from .platform_intelligence import anonymize_user_account
from .models import (
    BusinessMembership,
    BusinessProfile,
    BusinessTeamRole,
    BusinessVerificationDocument,
    EmailVerificationToken,
    PasswordResetToken,
    Profile,
    User,
    UserType,
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
    email = serializers.EmailField(write_only=True, required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop(self.username_field, None)
        self.fields["username"] = serializers.CharField(write_only=True, required=False)

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip().lower()
        username = (attrs.get("username") or "").strip()
        password = attrs.get("password")
        if email and username:
            raise serializers.ValidationError({"detail": "Provide email or username, not both."})
        if not email and not username:
            raise serializers.ValidationError({"detail": "Email or username is required."})
        if email:
            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist as exc:
                raise serializers.ValidationError({"email": "No account found with this email."}) from exc
        else:
            try:
                user = User.objects.get(username__iexact=username)
            except User.DoesNotExist as exc:
                raise serializers.ValidationError({"username": "No account found with this username."}) from exc
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
        send_verification_email(user)
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
        refresh = RefreshToken.for_user(t.user)
        return Response(
            {
                "detail": "Email verified.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }
        )


class ResendVerificationView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ResendVerificationThrottle]

    def post(self, request):
        if request.user.is_authenticated:
            profile = request.user.profile
            profile.refresh_from_db()
            if profile.email_verified:
                return Response({"detail": "Email is already verified."})
            if not can_resend_verification(request.user):
                return Response({"detail": VERIFICATION_SENT_MESSAGE})
            send_verification_email(request.user)
            return Response({"detail": "Verification email sent."})

        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"detail": "email is required."}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email__iexact=email).first()
        if user and can_resend_verification(user):
            send_verification_email(user)
        return Response({"detail": VERIFICATION_SENT_MESSAGE})


PASSWORD_RESET_SENT_MESSAGE = "If an account exists, we sent reset instructions."


def _can_request_password_reset(user: User) -> bool:
    if not user.is_active:
        return False
    if user.is_staff:
        return False
    if user.username.startswith("deleted_"):
        return False
    return True


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"detail": "email is required."}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email__iexact=email).first()
        if user and _can_request_password_reset(user):
            token = PasswordResetToken.create_for_user(user)
            frontend = os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")
            link = f"{frontend}/reset-password?token={token.token}"
            send_mail(
                subject="Reset your DELVE password",
                message=(
                    f"Hi {user.username},\n\n"
                    f"Reset your password: {link}\n\n"
                    f"This link expires in 1 hour.\n\n"
                    f"Token: {token.token}"
                ),
                from_email=None,
                recipient_list=[user.email],
                fail_silently=True,
            )
        return Response({"detail": PASSWORD_RESET_SENT_MESSAGE})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetConfirmThrottle]

    def post(self, request):
        from uuid import UUID

        raw = request.data.get("token")
        new_password = request.data.get("new_password") or ""
        if not raw or not new_password:
            return Response(
                {"detail": "token and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            UUID(str(raw))
        except ValueError:
            return Response({"detail": "invalid token"}, status=status.HTTP_400_BAD_REQUEST)
        t = PasswordResetToken.objects.filter(token=raw, used=False).select_related("user").first()
        if not t or t.is_expired():
            return Response({"detail": "invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)
        user = t.user
        if not _can_request_password_reset(user):
            return Response({"detail": "invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(new_password, user)
        except ValidationError as exc:
            return Response({"detail": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save(update_fields=["password"])
        t.used = True
        t.save(update_fields=["used"])
        return Response({"detail": "Password updated."})


class MeView(generics.RetrieveAPIView):
    serializer_class = ProfileSerializer

    def get_object(self):
        return self.request.user.profile


class BecomeProviderView(APIView):
    """Upgrade a traveller account to service provider and start business onboarding."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = Profile.objects.get(user_id=request.user.id)
        if profile.user_type == UserType.SERVICE_PROVIDER:
            return Response(
                {"detail": "Already a service provider."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile.user_type = UserType.SERVICE_PROVIDER
        profile.save(update_fields=["user_type", "updated_at"])
        return Response(ProfileSerializer(profile).data)


class ProfileUpdateView(generics.UpdateAPIView):
    serializer_class = ProfileUpdateSerializer
    http_method_names = ["patch"]

    def get_object(self):
        return self.request.user.profile


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current = (request.data.get("current_password") or "").strip()
        new_password = request.data.get("new_password") or ""
        if not current or not new_password:
            return Response(
                {"detail": "current_password and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = request.user
        if not user.check_password(current):
            return Response(
                {"detail": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(new_password, user)
        except ValidationError as exc:
            return Response({"detail": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated."})


class SelfDeleteAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AccountDeleteThrottle]

    def post(self, request):
        user = request.user
        confirm = (request.data.get("confirm_username") or "").strip()
        current_password = (request.data.get("current_password") or "").strip()

        if user.username.startswith("deleted_"):
            return Response({"detail": "Account is already deleted."}, status=status.HTTP_400_BAD_REQUEST)
        if confirm != user.username:
            return Response(
                {"detail": "confirm_username must match your username exactly."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not current_password:
            return Response(
                {"detail": "current_password is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not user.check_password(current_password):
            return Response(
                {"detail": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            original_username = user.username
            anonymize_user_account(user, actor=request.user, self_initiated=True)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        log_admin_action(
            actor=request.user,
            action="user_self_delete",
            target_type="user",
            target_id=user.pk,
            detail=f"Self-deleted @{original_username} — PII anonymized",
        )
        return Response(
            {
                "detail": "Account deleted. Personal data anonymized; booking records retained without PII.",
                "username": user.username,
            }
        )


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


class BusinessListingsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        business = get_object_or_404(BusinessProfile.objects.select_related("owner"), pk=pk)
        from accounts.business_listings import business_listings

        return Response(business_listings(business, request=request))


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
        profile = Profile.objects.get(user_id=request.user.id)
        if profile.user_type != UserType.SERVICE_PROVIDER:
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
