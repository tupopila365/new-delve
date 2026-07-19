from rest_framework import serializers

from .models import ProductReview
from .review_services import (
    normalize_review_media,
    purchase_order_for,
    sync_product_rating,
)

MAX_REVIEW_MEDIA = 8


class ReviewMediaItemSerializer(serializers.Serializer):
    url = serializers.CharField(max_length=1000)
    kind = serializers.ChoiceField(choices=("image", "video"), default="image")


class ProductReviewCreateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    body = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    media = ReviewMediaItemSerializer(many=True, required=False)

    def validate_media(self, value):
        if value and len(value) > MAX_REVIEW_MEDIA:
            raise serializers.ValidationError(
                f"You can attach up to {MAX_REVIEW_MEDIA} photos or videos."
            )
        cleaned = []
        for item in value or []:
            url = (item.get("url") or "").strip()
            if not url:
                continue
            cleaned.append({"url": url, "kind": item.get("kind", "image")})
        return cleaned

    def validate(self, attrs):
        product = self.context["product"]
        user = self.context["request"].user
        if product.owner_id == user.id:
            raise serializers.ValidationError("You cannot review your own product.")
        if ProductReview.objects.filter(product=product, reviewer=user).exists():
            raise serializers.ValidationError("You already reviewed this product.")
        if purchase_order_for(user, product) is None:
            raise serializers.ValidationError(
                "You can review this product after your purchase is paid or fulfilled."
            )
        return attrs

    def create(self, validated_data):
        product = self.context["product"]
        request = self.context["request"]
        user = request.user
        order = purchase_order_for(user, product)
        review = ProductReview.objects.create(
            product=product,
            reviewer=user,
            order=order,
            rating=validated_data["rating"],
            body=validated_data.get("body", ""),
            media=validated_data.get("media", []),
        )
        sync_product_rating(product)
        return review


class ProductReviewSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()
    verified_purchase = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = (
            "id",
            "name",
            "avatar",
            "rating",
            "body",
            "seller_reply",
            "seller_replied_at",
            "media",
            "verified_purchase",
            "created_at",
        )
        read_only_fields = fields

    def _request(self):
        return self.context.get("request")

    def get_name(self, obj):
        from .review_services import _author_label

        return _author_label(obj.reviewer)

    def get_avatar(self, obj):
        from .review_services import _reviewer_avatar

        return _reviewer_avatar(obj.reviewer, self._request())

    def get_media(self, obj):
        return normalize_review_media(obj.media, self._request())

    def get_verified_purchase(self, obj):
        return obj.order_id is not None
