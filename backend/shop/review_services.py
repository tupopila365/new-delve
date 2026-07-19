"""Buyer reviews (stars, comments, photos/videos) for shop products."""

from __future__ import annotations

from decimal import Decimal

from django.core.files.storage import default_storage

from .models import Order, OrderStatus, ProductReview, ShopProduct

PURCHASED_ORDER_STATUSES = frozenset({OrderStatus.FULFILLED})


def _author_label(user) -> str:
    profile = getattr(user, "profile", None)
    if profile and getattr(profile, "display_name", "").strip():
        return profile.display_name.strip()
    return user.username


def _absolute_media_url(url: str, request=None) -> str:
    text = (url or "").strip()
    if not text:
        return ""
    if text.startswith(("http://", "https://", "data:")):
        return text
    if text.startswith("/") and request:
        return request.build_absolute_uri(text)
    try:
        storage_url = default_storage.url(text)
    except Exception:
        storage_url = text if text.startswith("/") else f"/media/{text.lstrip('/')}"
    if request and storage_url.startswith("/"):
        return request.build_absolute_uri(storage_url)
    return storage_url


def _reviewer_avatar(user, request=None) -> str | None:
    profile = getattr(user, "profile", None)
    avatar = getattr(profile, "avatar", None)
    if avatar:
        try:
            return _absolute_media_url(avatar.url, request)
        except Exception:
            return None
    return None


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
    ratings = list(
        ProductReview.objects.filter(product=product, is_hidden=False).values_list("rating", flat=True)
    )
    if not ratings:
        product.rating_avg = Decimal("0")
        product.rating_count = 0
    else:
        avg = round(sum(ratings) / len(ratings), 2)
        product.rating_avg = Decimal(str(avg))
        product.rating_count = len(ratings)
    product.save(update_fields=["rating_avg", "rating_count", "updated_at"])


def normalize_review_media(raw, request=None) -> list[dict]:
    """Coerce stored review media into [{url, kind}] with absolute urls."""
    out: list[dict] = []
    if not isinstance(raw, list):
        return out
    for item in raw:
        if isinstance(item, str):
            url = item.strip()
            kind = "image"
        elif isinstance(item, dict):
            url = str(item.get("url") or item.get("image") or "").strip()
            kind = "video" if item.get("kind") == "video" else "image"
        else:
            continue
        if not url:
            continue
        out.append({"url": _absolute_media_url(url, request), "kind": kind})
    return out


def _review_row(review: ProductReview, request=None) -> dict:
    return {
        "id": review.pk,
        "name": _author_label(review.reviewer),
        "avatar": _reviewer_avatar(review.reviewer, request),
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

    distribution = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
    for r in rows:
        star = int(r["rating"]) if r["rating"] else 0
        if star in distribution:
            distribution[star] += 1

    user = getattr(request, "user", None)
    return {
        "reviews": rows,
        "rating_avg": float(product.rating_avg or 0),
        "rating_count": product.rating_count or 0,
        "distribution": {str(k): distribution[k] for k in (5, 4, 3, 2, 1)},
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
