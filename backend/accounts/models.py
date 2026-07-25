import secrets
import uuid
from django.conf import settings
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
    birth_year = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Birth year for account age verification and soft deal eligibility.",
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
    no_face_mode = models.BooleanField(
        default=False,
        help_text=(
            "No Face mode hides social surfaces (feeds, stories, other people's faces) "
            "and keeps only discovery/utility. Opt-in; default is the full social app."
        ),
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


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_reset_tokens")
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    def is_expired(self, hours: int = 1) -> bool:
        return self.created_at < timezone.now() - timezone.timedelta(hours=hours)

    @classmethod
    def create_for_user(cls, user: User) -> "PasswordResetToken":
        cls.objects.filter(user=user, used=False).update(used=True)
        return cls.objects.create(user=user)


class BusinessType(models.TextChoices):
    ACCOMMODATION = "accommodation", "Accommodation"
    TRANSPORT = "transport", "Transport"
    EVENT_ORGANISER = "event_organiser", "Event organiser"
    FOOD_DRINK = "food_drink", "Foodies"
    RETAIL_SHOP = "retail_shop", "Retail & shop"
    ACTIVITY = "activity", "Activities and Leisure"
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
    # Travel partner / organization hub — showcase how this business makes travel attainable.
    showcase_as_partner = models.BooleanField(
        default=False,
        help_text="Show this business as a travel partner hub (org-style page with deals & community).",
    )
    how_we_help = models.TextField(
        blank=True,
        help_text="How this business makes travel easier or more accessible.",
    )
    community_impact = models.TextField(
        blank=True,
        help_text="What this business brings to the community / place.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["business_name"]

    def __str__(self):
        return self.business_name


class TravelOfferKind(models.TextChoices):
    ELIGIBILITY = "eligibility", "Eligibility rate"
    DISCOUNT = "discount", "Discount"
    PACKAGE = "package", "Package / trip"


class TravelOfferEligibility(models.TextChoices):
    EVERYONE = "everyone", "Everyone"
    SADC = "sadc", "SADC residents"
    STUDENT = "student", "Students"
    LOCAL = "local", "Local / regional residents"
    CUSTOM = "custom", "Custom"


class TravelOffer(models.Model):
    """Accessible travel deal published by a business (resident rates, packages, discounts)."""

    business = models.ForeignKey(
        BusinessProfile,
        on_delete=models.CASCADE,
        related_name="travel_offers",
    )
    title = models.CharField(max_length=160)
    summary = models.TextField(blank=True)
    offer_kind = models.CharField(
        max_length=20,
        choices=TravelOfferKind.choices,
        default=TravelOfferKind.DISCOUNT,
    )
    eligibility = models.CharField(
        max_length=20,
        choices=TravelOfferEligibility.choices,
        default=TravelOfferEligibility.EVERYONE,
    )
    eligibility_label = models.CharField(
        max_length=120,
        blank=True,
        help_text="Optional override, e.g. 'SADC passport holders'.",
    )
    min_age = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Minimum traveller age for this offer (inclusive).",
    )
    max_age = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Maximum traveller age for this offer (inclusive). e.g. 24 → Under 25.",
    )
    min_party_size = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Minimum group / party size required.",
    )
    max_party_size = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Maximum group / party size allowed.",
    )
    price_label = models.CharField(
        max_length=80,
        blank=True,
        help_text="Human-readable deal, e.g. '50% off' or 'From N$1,200'.",
    )
    categories = models.JSONField(
        default=list,
        blank=True,
        help_text="Service categories this offer applies to, e.g. ['stays','food'].",
    )
    details = models.TextField(
        blank=True,
        help_text="Longer explanation of what this offer includes.",
    )
    how_to_claim = models.TextField(
        blank=True,
        help_text="How travellers sign up or claim this rate / package.",
    )
    proof_required = models.CharField(
        max_length=240,
        blank=True,
        help_text="What proof is needed, e.g. 'Valid SADC passport at check-in'.",
    )
    terms_note = models.TextField(
        blank=True,
        help_text="Optional terms, blackout dates, or fine print.",
    )
    cover_image = models.TextField(
        blank=True,
        help_text="Hero media URL (image or video) shown on the offer detail page.",
    )
    gallery_images = models.JSONField(
        default=list,
        blank=True,
        help_text="Extra media items: list of URL strings or {src, kind} objects.",
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    starts_on = models.DateField(null=True, blank=True)
    ends_on = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.title} — {self.business.business_name}"


class ListingSaleVertical(models.TextChoices):
    STAYS = "stays", "Stays"
    FOOD = "food", "Food"
    GUIDES = "guides", "Guides"
    TRANSPORT = "transport", "Transport"
    EVENTS = "events", "Events"
    SHOP = "shop", "Shop"
    ACTIVITIES = "activities", "Activities and Leisure"


class ListingSale(models.Model):
    """Listing-level sale / discount (Phase 2) — shows as a Sale badge on that listing."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listing_sales",
    )
    vertical = models.CharField(max_length=20, choices=ListingSaleVertical.choices)
    listing_id = models.PositiveIntegerField()
    title = models.CharField(max_length=160, default="On sale")
    badge = models.CharField(
        max_length=40,
        blank=True,
        help_text="Short pill, e.g. 'Sale' or '−20%'. Defaults from price fields.",
    )
    price_label = models.CharField(
        max_length=80,
        blank=True,
        help_text="Human deal label, e.g. '−20%' or 'From N$800'.",
    )
    sale_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    compare_at_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Strike-through 'was' price when higher than sale_price.",
    )
    how_to_claim = models.TextField(
        blank=True,
        help_text="How travellers unlock this listing sale.",
    )
    proof_required = models.CharField(max_length=240, blank=True)
    terms_note = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    starts_on = models.DateField(null=True, blank=True)
    ends_on = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["vertical", "listing_id"],
                name="listing_sale_vertical_listing_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["vertical", "listing_id", "is_active"], name="listing_sale_lookup_idx"),
            models.Index(fields=["owner", "vertical"], name="listing_sale_owner_idx"),
        ]

    def __str__(self):
        return f"{self.vertical}:{self.listing_id} — {self.title}"


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


class MarketplaceDispute(models.Model):
    """Buyer-opened case against a shop order or service booking (Phase 3)."""

    class Source(models.TextChoices):
        SHOP = "shop", "Shop order"
        ACCOMMODATION = "accommodation", "Stay"
        GUIDE = "guide", "Guide"
        VEHICLE = "vehicle", "Vehicle rental"
        BUS_SEAT = "bus_seat", "Bus seat"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        UNDER_REVIEW = "under_review", "Under review"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    class Reason(models.TextChoices):
        NOT_RECEIVED = "not_received", "Not received / no-show"
        NOT_AS_DESCRIBED = "not_as_described", "Not as described"
        DAMAGED = "damaged", "Damaged / poor condition"
        WRONG_ITEM = "wrong_item", "Wrong item / booking"
        CANCELLED_BY_SELLER = "cancelled_by_seller", "Seller cancelled"
        OTHER = "other", "Other"

    class Resolution(models.TextChoices):
        REFUND_BUYER = "refund_buyer", "Refund buyer"
        RELEASE_SELLER = "release_seller", "Release to seller"
        PARTIAL = "partial", "Partial / other"
        DISMISSED = "dismissed", "Dismissed"

    source = models.CharField(max_length=32, choices=Source.choices, db_index=True)
    record_id = models.PositiveIntegerField(db_index=True)
    opener = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="marketplace_disputes_opened",
    )
    seller = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="marketplace_disputes_as_seller",
    )
    reason = models.CharField(max_length=40, choices=Reason.choices, default=Reason.OTHER)
    body = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    resolution = models.CharField(
        max_length=32,
        choices=Resolution.choices,
        blank=True,
        default="",
    )
    resolution_note = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="marketplace_disputes_resolved",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["source", "record_id"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self):
        return f"dispute {self.source}:{self.record_id} ({self.status})"


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
