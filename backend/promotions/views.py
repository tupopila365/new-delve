from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from rest_framework import permissions, serializers, status

from rest_framework.response import Response

from rest_framework.views import APIView



from accounts.permissions import IsListingManager, IsPlatformAdmin, IsProviderOrBusinessMember
from accounts.business_access import user_has_listing_manager_access

from accounts.platform_audit import log_admin_action
from promotions.constants import PLACEMENT_TARGET_TYPES, PROMOTION_PRICING

from promotions.models import (
    DEFAULT_PARTNER_LABEL,

    PaymentStatus,

    PromotionCampaign,

    PromotionPlacement,

    PromotionProduct,

    PromotionStatus,

    PromotionTargetType,

)
from promotions.analytics_services import (
    admin_promotion_analytics,
    campaign_metrics,
    provider_promotion_analytics,
    record_promotion_event,
)
from promotions.payment_services import (
    build_receipt,
    calculate_refund,
    cancel_with_refund,
    complete_mock_payment,
    format_money,
)

from promotions.provider_services import (
    PROVIDER_PLACEMENT_VALUES,
    list_provider_listings,
    provider_owns_target,
)
from promotions.services import (
    allowed_target_types_for_placement,
    category_spotlight,
    default_campaign_label,
    featured_for_placement,
    placement_conflict_summary,
    validate_target_listing,
)





class PromotionCampaignSerializer(serializers.ModelSerializer):

    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default=None)
    requested_by_username = serializers.CharField(source="requested_by.username", read_only=True, default=None)
    reviewed_by_username = serializers.CharField(source="reviewed_by.username", read_only=True, default=None)

    placement_label = serializers.CharField(source="get_placement_display", read_only=True)

    target_type_label = serializers.CharField(source="get_target_type_display", read_only=True)

    status_label = serializers.CharField(source="get_status_display", read_only=True)

    is_live = serializers.SerializerMethodField()
    product_id = serializers.IntegerField(source="product.id", read_only=True, default=None)
    product_name = serializers.CharField(source="product.name", read_only=True, default=None)
    amount_display = serializers.SerializerMethodField()
    payment_status_label = serializers.CharField(source="get_payment_status_display", read_only=True)
    can_pay = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    refund_preview = serializers.SerializerMethodField()
    metrics = serializers.SerializerMethodField()



    class Meta:

        model = PromotionCampaign

        fields = (

            "id",

            "placement",

            "placement_label",

            "target_type",

            "target_type_label",

            "target_id",

            "target_label",

            "region",

            "starts_at",

            "ends_at",

            "status",

            "status_label",

            "is_live",

            "priority",

            "label",

            "admin_notes",

            "provider_notes",

            "rejection_reason",

            "created_by_username",

            "requested_by_username",

            "reviewed_by_username",

            "reviewed_at",

            "product_id",

            "product_name",

            "amount_cents",

            "amount_display",

            "currency",

            "payment_status",

            "payment_status_label",

            "payment_provider",

            "payment_ref",

            "receipt_number",

            "paid_at",

            "refunded_at",

            "refund_amount_cents",

            "refund_reason",

            "can_pay",

            "can_cancel",

            "refund_preview",

            "impressions",

            "clicks",

            "listing_opens",

            "metrics",

            "created_at",

            "updated_at",

        )

        read_only_fields = ("id", "created_by_username", "created_at", "updated_at")



    def get_is_live(self, obj) -> bool:

        if obj.status in (
            PromotionStatus.REQUESTED,
            PromotionStatus.REJECTED,
            PromotionStatus.CANCELLED,
            PromotionStatus.PENDING_PAYMENT,
            PromotionStatus.REFUNDED,
        ):

            return False

        obj.refresh_status()

        return obj.status == PromotionStatus.ACTIVE



    def get_amount_display(self, obj) -> str:

        if not obj.amount_cents:

            return ""

        return format_money(obj.amount_cents, obj.currency or "NAD")



    def get_can_pay(self, obj) -> bool:

        return obj.status == PromotionStatus.PENDING_PAYMENT and obj.payment_status == PaymentStatus.PENDING



    def get_can_cancel(self, obj) -> bool:

        return obj.status in (PromotionStatus.PENDING_PAYMENT, PromotionStatus.SCHEDULED, PromotionStatus.ACTIVE)



    def get_refund_preview(self, obj) -> dict:

        cents, note = calculate_refund(obj)

        return {"amount_cents": cents, "amount_display": format_money(cents, obj.currency or "NAD") if cents else "", "note": note}



    def get_metrics(self, obj) -> dict:

        return campaign_metrics(obj)





class PromotionCampaignCreateSerializer(serializers.ModelSerializer):

    class Meta:

        model = PromotionCampaign

        fields = (

            "placement",

            "target_type",

            "target_id",

            "target_label",

            "region",

            "starts_at",

            "ends_at",

            "priority",

            "label",

            "admin_notes",

        )



    def validate(self, attrs):

        if attrs["ends_at"] <= attrs["starts_at"]:

            raise serializers.ValidationError({"ends_at": "End must be after start."})



        placement = attrs.get("placement") or getattr(self.instance, "placement", "")

        target_type = attrs.get("target_type") or getattr(self.instance, "target_type", "")

        allowed = allowed_target_types_for_placement(placement)

        if allowed and target_type not in allowed:

            raise serializers.ValidationError(

                {"target_type": f"Target type not allowed for {placement}. Allowed: {', '.join(allowed)}"}

            )



        ok, label, err = validate_target_listing(
            target_type,
            str(attrs.get("target_id", "")),
            placement=placement,
        )

        if not ok:

            raise serializers.ValidationError({"target_id": err})

        if not attrs.get("target_label"):

            attrs["target_label"] = label



        label = (attrs.get("label") or "").strip()

        attrs["label"] = label or default_campaign_label(placement)



        conflict = placement_conflict_summary(

            placement=placement,

            starts_at=attrs["starts_at"],

            ends_at=attrs["ends_at"],

            region=(attrs.get("region") or "").strip(),

            exclude_id=getattr(self.instance, "pk", None),

            target_type=target_type if placement == PromotionPlacement.CATEGORY_SPOTLIGHT else None,

        )

        if conflict["has_conflict"]:

            raise serializers.ValidationError({"non_field_errors": conflict["warnings"]})



        return attrs





class ProviderPromotionRequestSerializer(serializers.ModelSerializer):

    class Meta:

        model = PromotionCampaign

        fields = (

            "placement",

            "target_type",

            "target_id",

            "target_label",

            "region",

            "starts_at",

            "ends_at",

            "provider_notes",

        )



    def validate(self, attrs):

        if attrs["ends_at"] <= attrs["starts_at"]:

            raise serializers.ValidationError({"ends_at": "End must be after start."})



        placement = attrs["placement"]

        if placement not in PROVIDER_PLACEMENT_VALUES:

            raise serializers.ValidationError({"placement": "This placement is not available for self-serve requests."})



        target_type = attrs["target_type"]

        allowed = allowed_target_types_for_placement(placement)

        if allowed and target_type not in allowed:

            raise serializers.ValidationError(

                {"target_type": f"Target type not allowed for {placement}. Allowed: {', '.join(allowed)}"}

            )



        user = self.context["request"].user

        if not provider_owns_target(user, target_type, str(attrs.get("target_id", ""))):

            raise serializers.ValidationError({"target_id": "You can only promote listings you own."})



        ok, label, err = validate_target_listing(

            target_type,

            str(attrs.get("target_id", "")),

            placement=placement,

        )

        if not ok:

            raise serializers.ValidationError({"target_id": err})

        if not attrs.get("target_label"):

            attrs["target_label"] = label



        attrs["label"] = default_campaign_label(placement)

        return attrs





def _request_region(request) -> str:

    region = (request.query_params.get("region") or "").strip()

    if not region and request.user.is_authenticated:

        profile = getattr(request.user, "profile", None)

        region = (getattr(profile, "region", None) or "").strip()

    return region





class PlatformPromotionsView(APIView):

    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]



    def get(self, request):

        qs = PromotionCampaign.objects.select_related(
            "created_by", "requested_by", "reviewed_by"
        ).order_by("-starts_at")

        status_filter = (request.query_params.get("status") or "").strip()

        placement = (request.query_params.get("placement") or "").strip()

        if status_filter:

            qs = qs.filter(status=status_filter)

        if placement:

            qs = qs.filter(placement=placement)

        for row in qs[:200]:

            if row.status in (
                PromotionStatus.CANCELLED,
                PromotionStatus.REJECTED,
                PromotionStatus.REQUESTED,
                PromotionStatus.PENDING_PAYMENT,
                PromotionStatus.REFUNDED,
            ):

                continue

            row.refresh_status()

            row.save(update_fields=["status", "updated_at"])

        return Response(PromotionCampaignSerializer(qs[:200], many=True).data)



    def post(self, request):

        ser = PromotionCampaignCreateSerializer(data=request.data)

        ser.is_valid(raise_exception=True)

        campaign = ser.save(created_by=request.user)

        log_admin_action(

            actor=request.user,

            action="promotion_create",

            target_type="promotion",

            target_id=campaign.pk,

            detail=f"{campaign.placement} — {campaign.target_type}:{campaign.target_id}",

        )

        return Response(PromotionCampaignSerializer(campaign).data, status=status.HTTP_201_CREATED)





class PlatformPromotionConflictsView(APIView):

    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]



    def get(self, request):

        placement = (request.query_params.get("placement") or "").strip()

        starts_at = request.query_params.get("starts_at")

        ends_at = request.query_params.get("ends_at")

        if not placement or not starts_at or not ends_at:

            return Response({"detail": "placement, starts_at, and ends_at are required."}, status=400)

        from django.utils.dateparse import parse_datetime



        start = parse_datetime(starts_at)

        end = parse_datetime(ends_at)

        if not start or not end:

            return Response({"detail": "Invalid datetime."}, status=400)

        target_type = (request.query_params.get("target_type") or "").strip() or None

        if placement != PromotionPlacement.CATEGORY_SPOTLIGHT:

            target_type = None

        return Response(

            placement_conflict_summary(

                placement=placement,

                starts_at=start,

                ends_at=end,

                region=(request.query_params.get("region") or "").strip(),

                exclude_id=int(request.query_params.get("exclude_id") or 0) or None,

                target_type=target_type,

            )

        )





class PlatformPromotionDetailView(APIView):

    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]



    def patch(self, request, pk):

        campaign = PromotionCampaign.objects.filter(pk=pk).first()

        if not campaign:

            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)



        if request.data.get("approve"):

            if campaign.status != PromotionStatus.REQUESTED:

                return Response({"detail": "Only requested campaigns can be approved."}, status=400)

            conflict = placement_conflict_summary(

                placement=campaign.placement,

                starts_at=campaign.starts_at,

                ends_at=campaign.ends_at,

                region=(campaign.region or "").strip(),

                exclude_id=campaign.pk,

                target_type=campaign.target_type if campaign.placement == PromotionPlacement.CATEGORY_SPOTLIGHT else None,

            )

            if conflict["has_conflict"]:

                return Response({"non_field_errors": conflict["warnings"]}, status=400)

            campaign.status = PromotionStatus.SCHEDULED

            campaign.reviewed_by = request.user

            campaign.reviewed_at = timezone.now()

            campaign.rejection_reason = ""

            campaign.save()

            log_admin_action(

                actor=request.user,

                action="promotion_approve",

                target_type="promotion",

                target_id=campaign.pk,

                detail=campaign.target_label or f"{campaign.target_type}:{campaign.target_id}",

            )

            return Response(PromotionCampaignSerializer(campaign).data)



        if request.data.get("reject"):

            if campaign.status != PromotionStatus.REQUESTED:

                return Response({"detail": "Only requested campaigns can be rejected."}, status=400)

            reason = (request.data.get("rejection_reason") or "").strip()

            if not reason:

                return Response({"detail": "rejection_reason is required."}, status=400)

            campaign.status = PromotionStatus.REJECTED

            campaign.rejection_reason = reason

            campaign.reviewed_by = request.user

            campaign.reviewed_at = timezone.now()

            campaign.save(update_fields=["status", "rejection_reason", "reviewed_by", "reviewed_at", "updated_at"])

            log_admin_action(

                actor=request.user,

                action="promotion_reject",

                target_type="promotion",

                target_id=campaign.pk,

                detail=reason,

            )

            return Response(PromotionCampaignSerializer(campaign).data)



        if request.data.get("cancel") or request.data.get("status") == PromotionStatus.CANCELLED:

            campaign.status = PromotionStatus.CANCELLED

            campaign.save(update_fields=["status", "updated_at"])

            log_admin_action(

                actor=request.user,

                action="promotion_cancel",

                target_type="promotion",

                target_id=campaign.pk,

                detail=campaign.target_label or f"{campaign.target_type}:{campaign.target_id}",

            )

            return Response(PromotionCampaignSerializer(campaign).data)



        ser = PromotionCampaignCreateSerializer(campaign, data=request.data, partial=True)

        ser.is_valid(raise_exception=True)

        campaign = ser.save()

        log_admin_action(

            actor=request.user,

            action="promotion_update",

            target_type="promotion",

            target_id=campaign.pk,

            detail=campaign.target_label or "",

        )

        return Response(PromotionCampaignSerializer(campaign).data)





class FeaturedPlacementView(APIView):

    permission_classes = [permissions.AllowAny]

    placement: str = ""



    def get(self, request):
        limit_raw = (request.query_params.get("limit") or "").strip()
        try:
            limit = min(max(int(limit_raw), 1), 20) if limit_raw else None
        except ValueError:
            limit = None
        kwargs = {
            "region": _request_region(request),
            "user": request.user,
        }
        if limit is not None:
            kwargs["limit"] = limit
        return Response(featured_for_placement(self.placement, **kwargs))






class FeaturedStaysView(FeaturedPlacementView):

    placement = PromotionPlacement.HOMEPAGE_STAYS





class FeaturedGuidesView(FeaturedPlacementView):

    placement = PromotionPlacement.HOMEPAGE_GUIDES





class FeaturedFoodView(FeaturedPlacementView):

    placement = PromotionPlacement.HOMEPAGE_FOOD





class FeaturedEventsView(FeaturedPlacementView):

    placement = PromotionPlacement.HOMEPAGE_EVENTS





class FeaturedTransportView(FeaturedPlacementView):

    placement = PromotionPlacement.HOMEPAGE_TRANSPORT





class CategorySpotlightView(APIView):

    permission_classes = [permissions.AllowAny]



    def get(self, request, category: str):

        return Response(category_spotlight(category=category, region=_request_region(request), user=request.user))





class PlatformPromotionMetaView(APIView):

    """Placement options and allowed target types for admin UI."""



    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]



    def get(self, request):

        placements = [

            {"value": choice.value, "label": choice.label, "max_slots": 1 if choice.value == PromotionPlacement.CATEGORY_SPOTLIGHT else 2}

            for choice in PromotionPlacement

        ]

        return Response({"placements": placements, "target_types_by_placement": PLACEMENT_TARGET_TYPES})





class ProviderPromotionListingsView(APIView):

    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]



    def get(self, request):

        return Response(list_provider_listings(request.user))





class ProviderPromotionsView(APIView):

    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]



    def get(self, request):

        qs = PromotionCampaign.objects.filter(
            Q(requested_by=request.user) | Q(created_by=request.user, product__isnull=False)
        ).select_related("requested_by", "reviewed_by", "product").order_by("-created_at")

        return Response(PromotionCampaignSerializer(qs, many=True).data)





class ProviderPromotionRequestView(APIView):

    permission_classes = [permissions.IsAuthenticated, IsListingManager]



    def post(self, request):

        ser = ProviderPromotionRequestSerializer(data=request.data, context={"request": request})

        ser.is_valid(raise_exception=True)

        campaign = ser.save(

            status=PromotionStatus.REQUESTED,

            requested_by=request.user,

            created_by=request.user,

        )

        return Response(PromotionCampaignSerializer(campaign).data, status=status.HTTP_201_CREATED)





class PromotionPricingView(APIView):

    permission_classes = [permissions.AllowAny]



    def get(self, request):

        return Response({"pricing": PROMOTION_PRICING, "note": "Legacy display pricing — use /products/ for purchasable packages."})





class PromotionProductSerializer(serializers.ModelSerializer):

    placement_label = serializers.CharField(source="get_placement_display", read_only=True)

    price_display = serializers.SerializerMethodField()



    class Meta:

        model = PromotionProduct

        fields = (
            "id",
            "slug",
            "name",
            "placement",
            "placement_label",
            "region",
            "duration_days",
            "price_cents",
            "price_display",
            "currency",
        )



    def get_price_display(self, obj) -> str:

        return format_money(obj.price_cents, obj.currency)





class PromotionProductsView(APIView):

    permission_classes = [permissions.AllowAny]



    def get(self, request):

        qs = PromotionProduct.objects.filter(is_active=True).order_by("placement", "region")

        placement = (request.query_params.get("placement") or "").strip()

        region = (request.query_params.get("region") or "").strip()

        if placement:

            qs = qs.filter(placement=placement)

        if region:

            qs = qs.filter(Q(region="") | Q(region__iexact=region))

        return Response(PromotionProductSerializer(qs, many=True).data)





class PromotionPurchaseSerializer(serializers.Serializer):

    product_id = serializers.IntegerField()

    target_type = serializers.CharField()

    target_id = serializers.CharField()

    target_label = serializers.CharField(required=False, allow_blank=True)

    starts_at = serializers.DateTimeField()

    provider_notes = serializers.CharField(required=False, allow_blank=True)



    def validate(self, attrs):

        product = PromotionProduct.objects.filter(pk=attrs["product_id"], is_active=True).first()

        if not product:

            raise serializers.ValidationError({"product_id": "Product not found or inactive."})

        if product.placement not in PROVIDER_PLACEMENT_VALUES:

            raise serializers.ValidationError({"product_id": "Product not available for self-serve purchase."})



        user = self.context["request"].user

        target_type = attrs["target_type"]

        target_id = str(attrs["target_id"])

        if not provider_owns_target(user, target_type, target_id):

            raise serializers.ValidationError({"target_id": "You can only promote listings you own."})



        allowed = allowed_target_types_for_placement(product.placement)

        if allowed and target_type not in allowed:

            raise serializers.ValidationError({"target_type": "Target type not allowed for this product."})



        ok, label, err = validate_target_listing(target_type, target_id, placement=product.placement)

        if not ok:

            raise serializers.ValidationError({"target_id": err})

        if not attrs.get("target_label"):

            attrs["target_label"] = label



        starts_at = attrs["starts_at"]

        if starts_at < timezone.now():

            raise serializers.ValidationError({"starts_at": "Start must be in the future."})



        attrs["product"] = product

        attrs["ends_at"] = starts_at + timedelta(days=product.duration_days)

        attrs["region"] = product.region

        return attrs





class PromotionPurchaseView(APIView):

    permission_classes = [permissions.IsAuthenticated, IsListingManager]



    def post(self, request):

        ser = PromotionPurchaseSerializer(data=request.data, context={"request": request})

        ser.is_valid(raise_exception=True)

        product = ser.validated_data["product"]

        campaign = PromotionCampaign.objects.create(

            product=product,

            placement=product.placement,

            target_type=ser.validated_data["target_type"],

            target_id=str(ser.validated_data["target_id"]),

            target_label=ser.validated_data["target_label"],

            region=product.region,

            starts_at=ser.validated_data["starts_at"],

            ends_at=ser.validated_data["ends_at"],

            status=PromotionStatus.PENDING_PAYMENT,

            payment_status=PaymentStatus.PENDING,

            amount_cents=product.price_cents,

            currency=product.currency,

            label=default_campaign_label(product.placement),

            provider_notes=(ser.validated_data.get("provider_notes") or "").strip(),

            created_by=request.user,

            requested_by=request.user,

        )

        return Response(PromotionCampaignSerializer(campaign).data, status=status.HTTP_201_CREATED)





class ProviderPromotionCampaignView(APIView):

    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]



    def _owned(self, request, pk):

        return PromotionCampaign.objects.filter(pk=pk).filter(

            Q(requested_by=request.user) | Q(created_by=request.user)

        ).select_related("product").first()



    def get(self, request, pk):

        campaign = self._owned(request, pk)

        if not campaign:

            return Response({"detail": "Not found."}, status=404)

        return Response(PromotionCampaignSerializer(campaign).data)



    def post(self, request, pk):

        if not user_has_listing_manager_access(request.user):

            return Response({"detail": "Listing management access required."}, status=403)

        campaign = self._owned(request, pk)

        if not campaign:

            return Response({"detail": "Not found."}, status=404)



        action = (request.data.get("action") or "").strip()

        if action == "mock_pay":

            try:

                campaign = complete_mock_payment(campaign, actor=request.user)

            except PermissionError:

                return Response({"detail": "Forbidden."}, status=403)

            except ValueError as exc:

                return Response({"detail": str(exc)}, status=400)

            return Response(

                {

                    "campaign": PromotionCampaignSerializer(campaign).data,

                    "receipt": build_receipt(campaign),

                    "detail": "Payment successful (mock).",

                }

            )



        if action == "cancel":

            reason = (request.data.get("reason") or "").strip()

            try:

                campaign, refund_cents, refund_note = cancel_with_refund(campaign, actor=request.user, reason=reason)

            except PermissionError:

                return Response({"detail": "Forbidden."}, status=403)

            except ValueError as exc:

                return Response({"detail": str(exc)}, status=400)

            return Response(

                {

                    "campaign": PromotionCampaignSerializer(campaign).data,

                    "refund_amount_cents": refund_cents,

                    "refund_amount_display": format_money(refund_cents, campaign.currency) if refund_cents else "",

                    "refund_note": refund_note,

                }

            )



        return Response({"detail": "Unknown action."}, status=400)





class ProviderPromotionReceiptView(APIView):

    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]



    def get(self, request, pk):

        campaign = PromotionCampaign.objects.filter(pk=pk).filter(

            Q(requested_by=request.user) | Q(created_by=request.user)

        ).select_related("product").first()

        if not campaign:

            return Response({"detail": "Not found."}, status=404)

        if campaign.payment_status != PaymentStatus.PAID:

            return Response({"detail": "Receipt available after payment."}, status=400)

        return Response(build_receipt(campaign))





class PromotionTrackView(APIView):

    permission_classes = [permissions.AllowAny]



    def post(self, request):

        promotion_id = request.data.get("promotion_id")

        event = (request.data.get("event") or "").strip().lower()

        if not promotion_id or not event:

            return Response({"detail": "promotion_id and event are required."}, status=400)

        try:

            pid = int(promotion_id)

        except (TypeError, ValueError):

            return Response({"detail": "Invalid promotion_id."}, status=400)

        if event not in ("impression", "click", "open"):

            return Response({"detail": "Invalid event."}, status=400)

        if not record_promotion_event(pid, event):

            return Response({"detail": "Campaign not found or not trackable."}, status=404)

        return Response({"ok": True})





class PlatformPromotionAnalyticsView(APIView):

    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]



    def get(self, request):

        days = int(request.query_params.get("days") or 30)

        return Response(admin_promotion_analytics(days=days))





class ProviderPromotionAnalyticsView(APIView):

    permission_classes = [permissions.IsAuthenticated, IsProviderOrBusinessMember]



    def get(self, request):

        return Response(provider_promotion_analytics(request.user))


