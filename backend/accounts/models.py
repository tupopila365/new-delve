import secrets
import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    email = models.EmailField(unique=True)

    class Meta:
        ordering = ["-date_joined"]


class UserType(models.TextChoices):
    NORMAL = "normal", "Normal user"
    SERVICE_PROVIDER = "service_provider", "Service provider"


class PostsVisibility(models.TextChoices):
    PUBLIC = "public", "Everyone"
    PRIVATE = "only_me", "Only me"


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    user_type = models.CharField(
        max_length=32,
        choices=UserType.choices,
        default=UserType.NORMAL,
    )
    display_name = models.CharField(max_length=120, blank=True)
    bio = models.TextField(blank=True)
    region = models.CharField(max_length=120, blank=True, help_text="e.g. Windhoek, Swakopmund")
    city = models.CharField(max_length=120, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    country_code = models.CharField(
        max_length=2,
        blank=True,
        help_text="ISO 3166-1 alpha-2; used for region and price display preferences.",
    )
    preferred_currency = models.CharField(
        max_length=3,
        blank=True,
        help_text="ISO 4217; how prices should be shown to this user.",
    )
    email_verified = models.BooleanField(default=False)
    # Privacy settings
    is_private = models.BooleanField(
        default=False,
        help_text="Private accounts hide posts and activity from non-owners.",
    )
    posts_visibility = models.CharField(
        max_length=16,
        choices=PostsVisibility.choices,
        default=PostsVisibility.PUBLIC,
        help_text="Who can see this user's posts.",
    )
    allow_messages = models.BooleanField(
        default=True,
        help_text="Allow other users to send message requests.",
    )
    show_in_search = models.BooleanField(
        default=True,
        help_text="Appear in search results and user discovery.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.display_name or self.user.username

    def save(self, *args, **kwargs):
        if not self.display_name:
            self.display_name = self.user.username
        super().save(*args, **kwargs)


class EmailVerificationToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="email_tokens")
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    def is_expired(self, hours: int = 48) -> bool:
        return self.created_at < timezone.now() - timezone.timedelta(hours=hours)

    @classmethod
    def create_for_user(cls, user: User) -> "EmailVerificationToken":
        cls.objects.filter(user=user, used=False).update(used=True)
        return cls.objects.create(user=user)


class BusinessType(models.TextChoices):
    ACCOMMODATION = "accommodation", "Accommodation"
    TRANSPORT = "transport", "Transport"
    EVENT_ORGANISER = "event_organiser", "Event organiser"
    FOOD_DRINK = "food_drink", "Food & drink"
    GUIDE = "guide", "Guide"
    JOURNEYS = "journeys", "Journeys"
    ASK_LOCALS = "ask_locals", "Ask locals"
    DELVE_US = "delve_us", "Delve us"
    MULTI_PROVIDER = "multi_provider", "Multi-category"


class VerificationStatus(models.TextChoices):
    UNVERIFIED = "unverified", "Unverified"
    PENDING = "pending", "Pending review"
    VERIFIED = "verified", "Verified"
    SUSPENDED = "suspended", "Suspended"
    REJECTED = "rejected", "Rejected"


class BusinessTeamRole(models.TextChoices):
    OWNER = "owner", "Owner"
    MANAGER = "manager", "Manager"
    STAFF = "staff", "Staff"
    VIEWER = "viewer", "Viewer"


class BusinessProfile(models.Model):
    """Public business/provider presence — separate from the personal user profile."""

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="businesses")
    slug = models.SlugField(max_length=80, unique=True)
    business_name = models.CharField(max_length=160)
    business_types = models.JSONField(default=list, blank=True)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.UNVERIFIED,
    )
    description = models.TextField(blank=True)
    tagline = models.CharField(max_length=200, blank=True)
    logo = models.ImageField(upload_to="business_logos/", blank=True, null=True)
    cover_image = models.ImageField(upload_to="business_covers/", blank=True, null=True)
    region = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120, blank=True)
    onboarding_completed = models.BooleanField(default=False)
    transport_modes = models.JSONField(default=list, blank=True)
    verification_notes = models.TextField(
        blank=True,
        help_text="Admin notes on verification decision (shown to provider later).",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["business_name"]

    def __str__(self):
        return self.business_name


class VerificationDocumentType(models.TextChoices):
    NATIONAL_ID = "national_id", "National ID / passport"
    BUSINESS_REGISTRATION = "business_registration", "Business registration"
    TOURISM_LICENSE = "tourism_license", "Tourism / hospitality license"
    DRIVER_LICENSE = "driver_license", "Driver's license"
    VEHICLE_REGISTRATION = "vehicle_registration", "Vehicle registration"
    TRANSPORT_INSURANCE = "transport_insurance", "Transport insurance"
    OPERATING_PERMIT = "operating_permit", "Operating permit"
    TOUR_GUIDE_LICENSE = "tour_guide_license", "Tour guide license"
    FIRST_AID_CERT = "first_aid_cert", "First aid certificate"
    FIRE_SAFETY_CERT = "fire_safety_cert", "Fire safety certificate"
    FOOD_HANDLING_CERT = "food_handling_cert", "Food handling certificate"
    OTHER = "other", "Other supporting document"


class VerificationDocumentStatus(models.TextChoices):
    PENDING = "pending", "Pending review"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class BusinessVerificationDocument(models.Model):
    business = models.ForeignKey(
        BusinessProfile,
        on_delete=models.CASCADE,
        related_name="verification_documents",
    )
    doc_type = models.CharField(max_length=40, choices=VerificationDocumentType.choices)
    file = models.FileField(upload_to="business_verification/")
    status = models.CharField(
        max_length=16,
        choices=VerificationDocumentStatus.choices,
        default=VerificationDocumentStatus.PENDING,
    )
    notes = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.get_doc_type_display()} — {self.business.business_name}"


class BusinessMembership(models.Model):
    """Team access inside a business (owner, manager, staff, viewer)."""

    business = models.ForeignKey(BusinessProfile, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="business_memberships")
    role = models.CharField(max_length=16, choices=BusinessTeamRole.choices, default=BusinessTeamRole.STAFF)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("business", "user")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} @ {self.business.business_name} ({self.role})"


class AdminAuditLog(models.Model):
    """Platform admin actions for accountability and activity feeds."""

    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admin_audit_actions",
    )
    action = models.CharField(max_length=64)
    target_type = models.CharField(max_length=32)
    target_id = models.CharField(max_length=64)
    detail = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} on {self.target_type}:{self.target_id}"


class PlatformBookingNote(models.Model):
    """Internal admin notes on bookings (disputes, support follow-ups)."""

    booking_type = models.CharField(max_length=32)
    booking_id = models.PositiveIntegerField()
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking_admin_notes",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["booking_type", "booking_id"]),
        ]

    def __str__(self):
        return f"{self.booking_type}:{self.booking_id} note"


DEFAULT_FEATURE_FLAGS = {
    "delvers_social": True,
    "new_bookings": True,
    "provider_registration": True,
    "maintenance_mode": False,
}


class PlatformSettings(models.Model):
    """Singleton platform configuration (feature flags, announcements)."""

    singleton_key = models.CharField(max_length=16, unique=True, default="default")
    feature_flags = models.JSONField(default=dict, blank=True)
    announcement_title = models.CharField(max_length=200, blank=True)
    announcement_body = models.TextField(blank=True)
    announcement_active = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="platform_settings_updates",
    )

    class Meta:
        verbose_name_plural = "Platform settings"

    def __str__(self):
        return "Platform settings"

    @classmethod
    def load(cls) -> "PlatformSettings":
        obj, _ = cls.objects.get_or_create(
            singleton_key="default",
            defaults={"feature_flags": DEFAULT_FEATURE_FLAGS.copy()},
        )
        merged = DEFAULT_FEATURE_FLAGS.copy()
        merged.update(obj.feature_flags or {})
        obj.feature_flags = merged
        return obj


def generate_username_suggestion(base: str) -> str:
    return f"{base}_{secrets.token_hex(3)}"
