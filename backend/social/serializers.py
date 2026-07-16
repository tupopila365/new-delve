from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from accommodation.models import AccommodationListing
from accounts.models import UserType
from events_app.models import Event
from food.models import FoodVenue
from guides.models import TourGuideProfile
from transport.models import BusTrip, VehicleRentalListing

from config.cloudinary_media import absolute_media_url, cloudinary_video_delivery_url
from .models import Comment, CommentDislike, CommentHelpful, Fire, Follow, Like, Post, PostKind, PostMedia, Save
from tags.services import extract_hashtags_from_text, linkable_slugs_for_post, MAX_TAGS_PER_CONTENT
from .video_validation import validate_post_upload_keys, validate_post_video_file
from .video_bake_jobs import aggregate_processing_status

User = get_user_model()


class PostAuthorSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source="profile.display_name", read_only=True)
    avatar = serializers.ImageField(source="profile.avatar", read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "display_name", "avatar")


class CommentSerializer(serializers.ModelSerializer):
    author = PostAuthorSerializer(read_only=True)
    helpful_count = serializers.IntegerField(read_only=True, required=False)
    dislike_count = serializers.IntegerField(read_only=True, required=False)
    replies_count = serializers.IntegerField(read_only=True, required=False)
    marked_helpful_by_me = serializers.SerializerMethodField()
    marked_disliked_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = (
            "id",
            "author",
            "parent_id",
            "body",
            "created_at",
            "is_accepted_answer",
            "hearted_by_author",
            "helpful_count",
            "dislike_count",
            "replies_count",
            "marked_helpful_by_me",
            "marked_disliked_by_me",
        )
        read_only_fields = ("author", "created_at", "is_accepted_answer", "hearted_by_author")

    def get_marked_helpful_by_me(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if hasattr(obj, "marked_helpful_by_me"):
            return bool(obj.marked_helpful_by_me)
        return CommentHelpful.objects.filter(comment=obj, user=request.user).exists()

    def get_marked_disliked_by_me(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if hasattr(obj, "marked_disliked_by_me"):
            return bool(obj.marked_disliked_by_me)
        return CommentDislike.objects.filter(comment=obj, user=request.user).exists()


class PostSerializer(serializers.ModelSerializer):
    author = PostAuthorSerializer(read_only=True)
    likes_count = serializers.IntegerField(read_only=True, required=False)
    saves_count = serializers.IntegerField(read_only=True, required=False)
    fires_count = serializers.IntegerField(read_only=True, required=False)
    comments_count = serializers.IntegerField(read_only=True, required=False)
    feed_score = serializers.FloatField(read_only=True, required=False)
    liked_by_me = serializers.SerializerMethodField()
    saved_by_me = serializers.SerializerMethodField()
    fired_by_me = serializers.SerializerMethodField()
    accepted_answer = serializers.SerializerMethodField()
    tag_slugs = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()
    processing_status = serializers.SerializerMethodField()
    processing_error = serializers.SerializerMethodField()
    listing = serializers.PrimaryKeyRelatedField(
        queryset=AccommodationListing.objects.none(),
        required=False,
        allow_null=True,
    )
    event = serializers.PrimaryKeyRelatedField(
        queryset=Event.objects.none(),
        required=False,
        allow_null=True,
    )
    vehicle_listing = serializers.PrimaryKeyRelatedField(
        queryset=VehicleRentalListing.objects.none(),
        required=False,
        allow_null=True,
    )
    bus_trip = serializers.PrimaryKeyRelatedField(
        queryset=BusTrip.objects.none(),
        required=False,
        allow_null=True,
    )
    food_venue = serializers.PrimaryKeyRelatedField(
        queryset=FoodVenue.objects.none(),
        required=False,
        allow_null=True,
    )
    guide_profile = serializers.PrimaryKeyRelatedField(
        queryset=TourGuideProfile.objects.none(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Post
        fields = (
            "id",
            "author",
            "body",
            "region",
            "image",
            "video",
            "media",
            "processing_status",
            "processing_error",
            "delvers_board",
            "is_delvers",
            "is_accommodation_story",
            "is_delvers_highlight",
            "post_kind",
            "place_label",
            "listing",
            "event",
            "vehicle_listing",
            "bus_trip",
            "food_venue",
            "guide_profile",
            "created_at",
            "likes_count",
            "saves_count",
            "fires_count",
            "comments_count",
            "feed_score",
            "liked_by_me",
            "saved_by_me",
            "fired_by_me",
            "accepted_answer",
            "tag_slugs",
        )
        read_only_fields = ("author", "created_at", "processing_status", "processing_error")

    def get_processing_status(self, obj):
        return aggregate_processing_status(obj)

    def get_processing_error(self, obj):
        status = aggregate_processing_status(obj)
        if status != "failed":
            return ""
        if obj.processing_error:
            return obj.processing_error
        for row in obj.media.all():
            if row.processing_status == "failed" and row.processing_error:
                return row.processing_error
        return "Could not finalize video effects."

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        listing_field = self.fields.get("listing")
        event_field = self.fields.get("event")
        vehicle_field = self.fields.get("vehicle_listing")
        bus_trip_field = self.fields.get("bus_trip")
        food_venue_field = self.fields.get("food_venue")
        guide_profile_field = self.fields.get("guide_profile")
        if listing_field is not None:
            if request and request.user.is_authenticated:
                listing_field.queryset = AccommodationListing.objects.all()
            else:
                listing_field.queryset = AccommodationListing.objects.none()
        if event_field is not None:
            if request and request.user.is_authenticated:
                event_field.queryset = Event.objects.filter(is_published=True)
            else:
                event_field.queryset = Event.objects.none()
        if vehicle_field is not None:
            vehicle_field.queryset = VehicleRentalListing.objects.filter(is_active=True)
        if bus_trip_field is not None:
            bus_trip_field.queryset = BusTrip.objects.filter(is_active=True)
        if food_venue_field is not None:
            food_venue_field.queryset = FoodVenue.objects.filter(is_active=True)
        if guide_profile_field is not None:
            guide_profile_field.queryset = TourGuideProfile.objects.filter(is_active=True)

    def validate(self, attrs):
        instance = self.instance
        request = self.context.get("request")

        if instance is None:
            try:
                validate_post_upload_keys(request)
            except DjangoValidationError as exc:
                raise serializers.ValidationError(exc.messages) from exc

        is_acc = attrs.get("is_accommodation_story")
        if is_acc is None:
            is_acc = instance.is_accommodation_story if instance else False

        is_highlight = attrs.get("is_delvers_highlight")
        if is_highlight is None:
            is_highlight = instance.is_delvers_highlight if instance else False

        is_delvers = attrs.get("is_delvers")
        if is_delvers is None:
            is_delvers = instance.is_delvers if instance else False

        post_kind = attrs.get("post_kind")
        if post_kind is None:
            post_kind = instance.post_kind if instance else PostKind.TIP

        image = attrs.get("image")
        if image is None and instance is not None:
            image = instance.image
        video = attrs.get("video")
        if video is None and instance is not None:
            video = instance.video

        # Direct Cloudinary uploads: client sends public_id / URL instead of a file.
        data = getattr(request, "data", None) if request is not None else None
        remote_image = False
        remote_video = False
        if data is not None and instance is None:
            from config.cloudinary_upload import normalize_remote_media_ref

            remote_image = bool(
                normalize_remote_media_ref(
                    data.get("image_public_id") or data.get("image_url"),
                    expect_video=False,
                )
            )
            remote_video = bool(
                normalize_remote_media_ref(
                    data.get("video_public_id") or data.get("video_url"),
                    expect_video=True,
                )
            )

        if image and video:
            raise serializers.ValidationError("Use either an image or a video, not both.")
        if (image or remote_image) and (video or remote_video):
            raise serializers.ValidationError("Use either an image or a video, not both.")
        if remote_image and remote_video:
            raise serializers.ValidationError("Use either an image or a video, not both.")

        if video is not None:
            try:
                validate_post_video_file(video)
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"video": exc.messages}) from exc

        has_media = bool(image or video or remote_image or remote_video)
        if is_delvers and is_acc:
            raise serializers.ValidationError("Accommodation stories cannot be published as Delvers pins.")

        if is_highlight and is_acc:
            raise serializers.ValidationError("Accommodation stories cannot be Delvers highlights.")

        if is_highlight and post_kind == PostKind.QUESTION:
            raise serializers.ValidationError("Ask-locals questions cannot be Delvers highlights.")

        if post_kind == PostKind.QUESTION:
            if is_acc:
                raise serializers.ValidationError("Ask-locals questions cannot be accommodation stories.")
            if is_delvers:
                raise serializers.ValidationError("Ask-locals questions belong on the community feed, not Delvers.")
            body = attrs.get("body")
            if body is None and instance is not None:
                body = instance.body
            if not (body or "").strip():
                raise serializers.ValidationError({"body": "Write your question."})
            attrs["is_delvers"] = False
            attrs["is_accommodation_story"] = False
            attrs["is_delvers_highlight"] = False

        event = attrs.get("event")
        if event is None and instance is not None:
            event = instance.event

        if event and is_acc:
            raise serializers.ValidationError("Accommodation stories cannot link to an event.")
        if event and not is_delvers:
            attrs["is_delvers"] = True

        if is_acc:
            attrs["is_delvers"] = False
            attrs["is_delvers_highlight"] = False
        if is_delvers:
            attrs["is_accommodation_story"] = False
        if is_highlight:
            attrs["is_accommodation_story"] = False
            attrs["is_delvers"] = True
            if not has_media:
                raise serializers.ValidationError("Add a photo or short video for your highlight.")

        if is_acc:
            user = getattr(request, "user", None)
            if not user or not user.is_authenticated:
                raise serializers.ValidationError("Sign in to post an accommodation story.")
            profile = getattr(user, "profile", None)
            if not profile or profile.user_type != UserType.SERVICE_PROVIDER:
                raise serializers.ValidationError("Only hosts and providers can post accommodation stories.")
            if not has_media:
                raise serializers.ValidationError("Add a photo or short video for your story.")

        listing = attrs.get("listing")
        if listing is None and instance is not None:
            listing = instance.listing

        vehicle_listing = attrs.get("vehicle_listing")
        if vehicle_listing is None and instance is not None:
            vehicle_listing = instance.vehicle_listing

        bus_trip = attrs.get("bus_trip")
        if bus_trip is None and instance is not None:
            bus_trip = instance.bus_trip

        food_venue = attrs.get("food_venue")
        if food_venue is None and instance is not None:
            food_venue = instance.food_venue

        guide_profile = attrs.get("guide_profile")
        if guide_profile is None and instance is not None:
            guide_profile = instance.guide_profile

        linked = [
            row
            for row in (listing, event, vehicle_listing, bus_trip, food_venue, guide_profile)
            if row is not None
        ]
        if len(linked) > 1:
            raise serializers.ValidationError(
                "Link one place only (stay, event, vehicle, bus trip, food venue, or guide)."
            )

        if listing is not None and request and request.user.is_authenticated:
            if is_acc and listing.owner_id != request.user.id:
                raise serializers.ValidationError("You can only link stories to your own listings.")

        if (
            listing is not None
            or event is not None
            or vehicle_listing is not None
            or bus_trip is not None
            or food_venue is not None
            or guide_profile is not None
        ) and not is_acc and post_kind != PostKind.QUESTION:
            attrs["is_delvers"] = True

        if event is not None and not event.is_published:
            raise serializers.ValidationError("That event is not available for moments.")
        if vehicle_listing is not None and not vehicle_listing.is_active:
            raise serializers.ValidationError("That vehicle is not available for moments.")
        if bus_trip is not None and not bus_trip.is_active:
            raise serializers.ValidationError("That bus trip is not available for moments.")
        if food_venue is not None and not food_venue.is_active:
            raise serializers.ValidationError("That food venue is not available for moments.")
        if guide_profile is not None and not guide_profile.is_active:
            raise serializers.ValidationError("That guide is not available for moments.")

        # Only travellers who actually attended (completed booking) may share a
        # guide moment. Enforced when the guide tag is being set in this request.
        if attrs.get("guide_profile") is not None:
            from guides.review_services import user_attended_guide

            user = getattr(request, "user", None)
            if not user_attended_guide(user, attrs["guide_profile"]):
                raise serializers.ValidationError(
                    "You can share a moment only after a completed tour with this guide."
                )

        body = attrs.get("body")
        if body is None and instance is not None:
            body = instance.body
        if body:
            tag_slugs = extract_hashtags_from_text(body)
            if len(tag_slugs) > MAX_TAGS_PER_CONTENT:
                raise serializers.ValidationError(
                    {"body": f"Use up to {MAX_TAGS_PER_CONTENT} hashtags per post."}
                )

        return attrs

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get("request")
        if ret.get("image"):
            ret["image"] = absolute_media_url(request, ret["image"])
        if ret.get("video"):
            ret["video"] = absolute_media_url(
                request,
                cloudinary_video_delivery_url(
                    ret["video"],
                    instance.video_trim_start,
                    instance.video_trim_end,
                    grade=getattr(instance, "edit_grade", None),
                ),
            )
        ret.pop("listing", None)
        ret.pop("event", None)
        ret.pop("vehicle_listing", None)
        ret.pop("bus_trip", None)
        ret.pop("food_venue", None)
        ret.pop("guide_profile", None)
        if instance.listing_id:
            ret["listing"] = {"id": instance.listing_id, "title": instance.listing.title}
        else:
            ret["listing"] = None
        if instance.event_id:
            ret["event"] = {"id": instance.event_id, "title": instance.event.title}
        else:
            ret["event"] = None
        if instance.vehicle_listing_id:
            vehicle = instance.vehicle_listing
            title = vehicle.title or f"{vehicle.make} {vehicle.model}"
            ret["vehicle_listing"] = {"id": instance.vehicle_listing_id, "title": title}
        else:
            ret["vehicle_listing"] = None
        if instance.bus_trip_id:
            route = instance.bus_trip.route
            ret["bus_trip"] = {
                "id": instance.bus_trip_id,
                "title": f"{route.origin} → {route.destination}",
            }
        else:
            ret["bus_trip"] = None
        if instance.food_venue_id:
            ret["food_venue"] = {
                "id": instance.food_venue_id,
                "title": instance.food_venue.name,
            }
        else:
            ret["food_venue"] = None
        if instance.guide_profile_id:
            ret["guide_profile"] = {
                "id": instance.guide_profile_id,
                "title": instance.guide_profile.headline,
            }
        else:
            ret["guide_profile"] = None
        return ret

    def get_liked_by_me(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return Like.objects.filter(post=obj, user=request.user).exists()

    def get_saved_by_me(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return Save.objects.filter(post=obj, user=request.user).exists()

    def get_fired_by_me(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return Fire.objects.filter(post=obj, user=request.user).exists()

    def get_accepted_answer(self, obj):
        if obj.post_kind != PostKind.QUESTION:
            return None
        accepted = getattr(obj, "accepted_comments", None)
        if accepted is not None:
            comment = accepted[0] if accepted else None
        else:
            comment = (
                obj.comments.filter(is_hidden=False, is_accepted_answer=True)
                .select_related("author", "author__profile")
                .first()
            )
        if not comment:
            return None
        return CommentSerializer(comment, context=self.context).data

    def get_tag_slugs(self, obj):
        if hasattr(obj, "_prefetched_tag_slugs"):
            return obj._prefetched_tag_slugs
        return linkable_slugs_for_post(obj)

    def get_media(self, obj):
        """Ordered carousel slides. Falls back to the single image/video for
        legacy posts that predate PostMedia."""
        request = self.context.get("request")

        def build_url(field_value, is_video, trim_start=None, trim_end=None, grade=None):
            if not field_value:
                return None
            url = field_value.url
            if is_video:
                url = cloudinary_video_delivery_url(url, trim_start, trim_end, grade=grade)
            return absolute_media_url(request, url)

        rows = list(obj.media.all())
        slides = []
        if rows:
            for row in rows:
                image_url = build_url(row.image, False)
                video_url = build_url(
                    row.video,
                    True,
                    row.video_trim_start,
                    row.video_trim_end,
                    grade=getattr(row, "edit_grade", None),
                )
                if not image_url and not video_url:
                    continue
                slides.append(
                    {
                        "order": row.order,
                        "kind": "video" if video_url else "image",
                        "image": image_url,
                        "video": video_url,
                    }
                )
        if slides:
            return slides

        image_url = build_url(obj.image, False)
        video_url = build_url(
            obj.video,
            True,
            obj.video_trim_start,
            obj.video_trim_end,
            grade=getattr(obj, "edit_grade", None),
        )
        if not image_url and not video_url:
            return []
        return [
            {
                "order": 0,
                "kind": "video" if video_url else "image",
                "image": image_url,
                "video": video_url,
            }
        ]

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)


class FollowSerializer(serializers.ModelSerializer):
    following = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Follow
        fields = ("id", "following", "created_at")
        read_only_fields = ("created_at",)

    def create(self, validated_data):
        validated_data["follower"] = self.context["request"].user
        return super().create(validated_data)


class UserSummarySerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source="profile.display_name", read_only=True)
    avatar = serializers.ImageField(source="profile.avatar", read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "display_name", "avatar")
