"""Aggregated admin view of a platform user — social, commercial, and moderation footprint."""

from __future__ import annotations

from django.db.models import Q

from accommodation.models import AccommodationBooking
from accounts.models import AdminAuditLog, BusinessProfile, Profile
from guides.models import GuideBooking, TourGuideProfile
from reports.models import Report, ReportStatus, ReportTargetType
from reports.serializers import ReportAdminSerializer
from social.models import Comment, Follow, Post
from transport.models import SeatReservation, VehicleRentalBooking

OPEN_REPORT_STATUSES = [
    ReportStatus.NEW,
    ReportStatus.UNDER_REVIEW,
    ReportStatus.ESCALATED,
]


def _serialize_user(user) -> dict:
    profile = getattr(user, "profile", None)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "user_type": getattr(profile, "user_type", "normal"),
        "display_name": getattr(profile, "display_name", ""),
        "date_joined": user.date_joined.isoformat(),
        "email_verified": getattr(profile, "email_verified", False),
        "region": getattr(profile, "region", ""),
        "city": getattr(profile, "city", ""),
    }


def _absolute_media_url(request, field) -> str | None:
    if not field:
        return None
    url = field.url if hasattr(field, "url") else str(field)
    if request and url.startswith("/"):
        return request.build_absolute_uri(url)
    return url


def _user_report_filter(user):
    post_ids = [str(pk) for pk in Post.objects.filter(author=user).values_list("pk", flat=True)]
    comment_ids = [str(pk) for pk in Comment.objects.filter(author=user).values_list("pk", flat=True)]
    clauses = Q(target_type=ReportTargetType.USER, target_id=str(user.pk))
    if post_ids:
        clauses |= Q(target_type=ReportTargetType.POST, target_id__in=post_ids)
    if comment_ids:
        clauses |= Q(target_type=ReportTargetType.COMMENT, target_id__in=comment_ids)
    return clauses


def _profile_stats(profile: Profile) -> dict:
    user = profile.user
    posts_qs = Post.objects.filter(author=user)
    media_q = Q(image__isnull=False) | Q(video__isnull=False)
    open_reports = Report.objects.filter(status__in=OPEN_REPORT_STATUSES).filter(_user_report_filter(user)).count()
    return {
        "posts_count": posts_qs.filter(is_hidden=False).count(),
        "posts_hidden_count": posts_qs.filter(is_hidden=True).count(),
        "photos_count": posts_qs.filter(is_hidden=False).filter(media_q).count(),
        "followers_count": Follow.objects.filter(following=user).count(),
        "following_count": Follow.objects.filter(follower=user).count(),
        "reports_against_open": open_reports,
        "businesses_count": BusinessProfile.objects.filter(owner=user).count(),
    }


def _bookings_summary(user) -> dict:
    as_traveler = (
        AccommodationBooking.objects.filter(guest=user).count()
        + GuideBooking.objects.filter(client=user).count()
        + VehicleRentalBooking.objects.filter(renter=user).count()
        + SeatReservation.objects.filter(passenger=user).count()
    )
    as_provider = (
        AccommodationBooking.objects.filter(listing__owner=user).count()
        + GuideBooking.objects.filter(guide__user=user).count()
        + VehicleRentalBooking.objects.filter(listing__owner=user).count()
    )
    return {"as_traveler": as_traveler, "as_provider": as_provider}


def _serialize_admin_post(post: Post, request) -> dict:
    from social.serializers import PostSerializer

    data = PostSerializer(post, context={"request": request}).data
    data["is_hidden"] = post.is_hidden
    data["moderation_reason"] = post.moderation_reason or ""
    return data


def _serialize_business(business: BusinessProfile, request) -> dict:
    from accounts.serializers import BusinessProfileSerializer

    return BusinessProfileSerializer(business, context={"request": request}).data


def _serialize_guide(guide: TourGuideProfile | None) -> dict | None:
    if not guide:
        return None
    return {
        "id": guide.pk,
        "headline": guide.headline,
        "is_active": guide.is_active,
        "rating_avg": str(guide.rating_avg),
        "rating_count": guide.rating_count,
        "regions": guide.regions or [],
    }


def _serialize_moderation_actions(user) -> list[dict]:
    entries = (
        AdminAuditLog.objects.filter(target_type="user", target_id=str(user.pk))
        .select_related("actor")
        .order_by("-created_at")[:20]
    )
    from accounts.platform_audit import ACTION_LABELS

    return [
        {
            "id": entry.pk,
            "action": entry.action,
            "action_label": ACTION_LABELS.get(entry.action, entry.action.replace("_", " ")),
            "detail": entry.detail,
            "actor_username": entry.actor.username if entry.actor else None,
            "created_at": entry.created_at.isoformat(),
        }
        for entry in entries
    ]


def build_admin_user_profile(user, request, *, recent_posts_limit: int = 12) -> dict:
    profile = user.profile
    recent_posts = (
        Post.objects.filter(author=user)
        .select_related("author", "author__profile")
        .order_by("-created_at")[:recent_posts_limit]
    )
    reports_qs = (
        Report.objects.filter(_user_report_filter(user))
        .select_related("reporter", "resolved_by")
        .order_by("-created_at")[:15]
    )
    businesses = BusinessProfile.objects.filter(owner=user).order_by("business_name")

    guide = TourGuideProfile.objects.filter(user=user).first()

    return {
        "user": _serialize_user(user),
        "profile": {
            "display_name": profile.display_name,
            "bio": profile.bio,
            "avatar": _absolute_media_url(request, profile.avatar),
            "user_type": profile.user_type,
            "region": profile.region,
            "city": profile.city,
            "email_verified": profile.email_verified,
            "is_private": profile.is_private,
            "posts_visibility": profile.posts_visibility,
            "allow_messages": profile.allow_messages,
            "show_in_search": profile.show_in_search,
        },
        "stats": _profile_stats(profile),
        "businesses": [_serialize_business(b, request) for b in businesses],
        "guide_profile": _serialize_guide(guide),
        "recent_posts": [_serialize_admin_post(p, request) for p in recent_posts],
        "reports": ReportAdminSerializer(reports_qs, many=True).data,
        "moderation_actions": _serialize_moderation_actions(user),
        "bookings_summary": _bookings_summary(user),
    }
