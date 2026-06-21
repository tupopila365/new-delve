"""Seed promotion product catalog."""

from promotions.models import PromotionPlacement, PromotionProduct

PLACEMENT_VERTICAL = {
    PromotionPlacement.HOMEPAGE_STAYS: "Stays",
    PromotionPlacement.HOMEPAGE_GUIDES: "Guides",
    PromotionPlacement.HOMEPAGE_FOOD: "Food",
    PromotionPlacement.HOMEPAGE_EVENTS: "Events",
    PromotionPlacement.HOMEPAGE_TRANSPORT: "Transport",
    PromotionPlacement.DELVERS_FEED: "Delvers feed",
}

# price_cents per 7-day package (NAD)
PLACEMENT_PRICE_CENTS = {
    PromotionPlacement.HOMEPAGE_STAYS: 250_000,
    PromotionPlacement.HOMEPAGE_GUIDES: 200_000,
    PromotionPlacement.HOMEPAGE_FOOD: 180_000,
    PromotionPlacement.HOMEPAGE_EVENTS: 150_000,
    PromotionPlacement.HOMEPAGE_TRANSPORT: 180_000,
    PromotionPlacement.DELVERS_FEED: 120_000,
}

PROVIDER_PRODUCT_PLACEMENTS = [
    PromotionPlacement.HOMEPAGE_STAYS,
    PromotionPlacement.HOMEPAGE_GUIDES,
    PromotionPlacement.HOMEPAGE_FOOD,
    PromotionPlacement.HOMEPAGE_EVENTS,
    PromotionPlacement.HOMEPAGE_TRANSPORT,
    PromotionPlacement.DELVERS_FEED,
]

REGION_VARIANTS = ["", "Khomas", "Erongo"]


def product_name(*, placement: str, duration_days: int, region: str) -> str:
    vertical = PLACEMENT_VERTICAL.get(placement, placement)
    region_label = region or "National"
    if placement == PromotionPlacement.DELVERS_FEED:
        return f"Sponsored {duration_days} days — Delvers feed — {region_label}"
    return f"Homepage featured {duration_days} days — {vertical} — {region_label}"


def seed_promotion_products() -> int:
    created = 0
    duration_days = 7
    for placement in PROVIDER_PRODUCT_PLACEMENTS:
        for region in REGION_VARIANTS:
            slug_region = region.lower().replace(" ", "-") if region else "national"
            slug = f"{placement}_{duration_days}d_{slug_region}"
            name = product_name(placement=placement, duration_days=duration_days, region=region)
            price_cents = PLACEMENT_PRICE_CENTS.get(placement, 150_000)
            _, was_created = PromotionProduct.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "placement": placement,
                    "region": region,
                    "duration_days": duration_days,
                    "price_cents": price_cents,
                    "currency": "NAD",
                    "is_active": True,
                },
            )
            if was_created:
                created += 1
    return created
