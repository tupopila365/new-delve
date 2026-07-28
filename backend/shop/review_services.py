"""Buyer reviews (stars, comments, photos/videos) for shop products."""

from __future__ import annotations

from common.review_aggregates import (
    apply_rating_aggregate,
    normalize_review_media,
    rating_distribution,
)
from common.user_display import display_name_or_username, profile_avatar_url

from .models import Order, OrderStatus, ProductReview, ShopProduct

PURCHASED_ORDER_STATUSES = frozenset({OrderStatus.FULFILLED})

__all__ = [
    "normalize_review_media",
    "product_reviews_payload",
    "purchase_order_for",
    "sync_product_rating",
    "user_can_review_product",
]


def purchase_order_for(user, product: ShopProduct) -> Order | None:
    """Most recent fulfilled order in which the user bought this product."""
    if not user or not user.is_authenticated:
        return None
    return (
        Order.objects.filter(
            buyer=user,
            status__in=PURCHASED_ORDER_STATUSES,
            items__product=product,
        )
        .order_by("-created_at")
        .first()
    )


def user_can_review_product(user, product: ShopProduct) -> bool:
    if not user or not user.is_authenticated:
        return False
    if product.owner_id == user.id:
        return False
    if ProductReview.objects.filter(product=product, reviewer=user).exists():
        return False
    return purchase_order_for(user, product) is not None


def sync_product_rating(product: ShopProduct) -> None:
    ratings = ProductReview.objects.filter(product=product, is_hidden=False).values_list(
        "rating", flat=True
    )
    apply_rating_aggregate(product, ratings, update_fields=["updated_at"])


def _review_row(review: ProductReview, request=None) -> dict:
    return {
        "id": review.pk,
        "name": display_name_or_username(review.reviewer),
        "avatar": profile_avatar_url(review.reviewer, request),
        "rating": review.rating,
        "body": review.body,
        "seller_reply": (review.seller_reply or "").strip(),
        "seller_replied_at": (
            review.seller_replied_at.isoformat() if review.seller_replied_at else ""
        ),
        "media": normalize_review_media(review.media, request),
        "verified_purchase": review.order_id is not None,
        "created_at": review.created_at.isoformat(),
    }


def product_reviews_payload(product: ShopProduct, request=None) -> dict:
    reviews = (
        ProductReview.objects.filter(product=product, is_hidden=False)
        .select_related("reviewer", "reviewer__profile")
        .order_by("-created_at")[:100]
    )
    rows = [_review_row(r, request) for r in reviews]

    user = getattr(request, "user", None)
    return {
        "reviews": rows,
        "rating_avg": float(product.rating_avg or 0),
        "rating_count": product.rating_count or 0,
        "distribution": rating_distribution(r["rating"] for r in rows),
        "can_review": user_can_review_product(user, product),
        "has_reviewed": bool(
            user
            and getattr(user, "is_authenticated", False)
            and ProductReview.objects.filter(product=product, reviewer=user).exists()
        ),
        "is_owner": bool(
            user
            and getattr(user, "is_authenticated", False)
            and product.owner_id == user.id
        ),
    }
