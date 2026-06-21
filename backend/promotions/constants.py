from promotions.models import PromotionPlacement, PromotionTargetType

MAX_PROMOTED_HOMEPAGE = 2
MAX_PROMOTED_CATEGORY_SPOTLIGHT = 1
FEATURED_RAIL_LIMIT = 8

PLACEMENT_MAX_SLOTS = {
    PromotionPlacement.HOMEPAGE_STAYS: MAX_PROMOTED_HOMEPAGE,
    PromotionPlacement.HOMEPAGE_GUIDES: MAX_PROMOTED_HOMEPAGE,
    PromotionPlacement.HOMEPAGE_FOOD: MAX_PROMOTED_HOMEPAGE,
    PromotionPlacement.HOMEPAGE_EVENTS: MAX_PROMOTED_HOMEPAGE,
    PromotionPlacement.HOMEPAGE_TRANSPORT: MAX_PROMOTED_HOMEPAGE,
    PromotionPlacement.CATEGORY_SPOTLIGHT: MAX_PROMOTED_CATEGORY_SPOTLIGHT,
    PromotionPlacement.DELVERS_FEED: 2,
    PromotionPlacement.COMMUNITY_FEED: 2,
}

PLACEMENT_TARGET_TYPES: dict[str, list[str]] = {
    PromotionPlacement.HOMEPAGE_STAYS: [PromotionTargetType.ACCOMMODATION],
    PromotionPlacement.HOMEPAGE_GUIDES: [PromotionTargetType.GUIDE],
    PromotionPlacement.HOMEPAGE_FOOD: [PromotionTargetType.FOOD],
    PromotionPlacement.HOMEPAGE_EVENTS: [PromotionTargetType.EVENT],
    PromotionPlacement.HOMEPAGE_TRANSPORT: [PromotionTargetType.VEHICLE],
    PromotionPlacement.CATEGORY_SPOTLIGHT: [
        PromotionTargetType.ACCOMMODATION,
        PromotionTargetType.GUIDE,
        PromotionTargetType.FOOD,
        PromotionTargetType.EVENT,
        PromotionTargetType.VEHICLE,
    ],
    PromotionPlacement.DELVERS_FEED: [
        PromotionTargetType.POST,
        PromotionTargetType.ACCOMMODATION,
        PromotionTargetType.GUIDE,
        PromotionTargetType.FOOD,
        PromotionTargetType.EVENT,
        PromotionTargetType.VEHICLE,
    ],
    PromotionPlacement.COMMUNITY_FEED: [
        PromotionTargetType.POST,
        PromotionTargetType.ACCOMMODATION,
        PromotionTargetType.GUIDE,
        PromotionTargetType.FOOD,
        PromotionTargetType.EVENT,
        PromotionTargetType.VEHICLE,
    ],
}

CATEGORY_SPOTLIGHT_TARGET = {
    "stays": PromotionTargetType.ACCOMMODATION,
    "accommodation": PromotionTargetType.ACCOMMODATION,
    "guides": PromotionTargetType.GUIDE,
    "guide": PromotionTargetType.GUIDE,
    "food": PromotionTargetType.FOOD,
    "events": PromotionTargetType.EVENT,
    "event": PromotionTargetType.EVENT,
    "transport": PromotionTargetType.VEHICLE,
    "vehicle": PromotionTargetType.VEHICLE,
}

# Display-only pricing (offline payment in v1).
PROMOTION_PRICING = [
    {"placement": PromotionPlacement.HOMEPAGE_STAYS, "label": "Homepage — Featured stays", "price_label": "N$2,500 / week", "note": "Up to 2 slots on the stays rail"},
    {"placement": PromotionPlacement.HOMEPAGE_GUIDES, "label": "Homepage — Featured guides", "price_label": "N$2,000 / week", "note": "Up to 2 slots"},
    {"placement": PromotionPlacement.HOMEPAGE_FOOD, "label": "Homepage — Featured food", "price_label": "N$1,800 / week", "note": "Up to 2 slots"},
    {"placement": PromotionPlacement.HOMEPAGE_EVENTS, "label": "Homepage — Featured events", "price_label": "N$1,500 / week", "note": "Up to 2 slots"},
    {"placement": PromotionPlacement.HOMEPAGE_TRANSPORT, "label": "Homepage — Featured transport", "price_label": "N$1,800 / week", "note": "Up to 2 slots"},
    {"placement": PromotionPlacement.CATEGORY_SPOTLIGHT, "label": "Category list hero", "price_label": "N$3,000 / week", "note": "1 hero slot (admin placement)"},
    {"placement": PromotionPlacement.DELVERS_FEED, "label": "Delvers feed — Sponsored", "price_label": "N$1,200 / week", "note": "Positions 3 & 8 in feed"},
    {"placement": PromotionPlacement.COMMUNITY_FEED, "label": "Community feed — Sponsored", "price_label": "N$900 / week", "note": "Positions 3 & 8 (admin only)"},
]
