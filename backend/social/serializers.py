from django.contrib.auth import get_user_model
from rest_framework import serializers

from accommodation.models import AccommodationListing
from accounts.models import UserType

from .models import Comment, Follow, Like, Post, Save

User = get_user_model()


class PostAuthorSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source="profile.display_name", read_only=True)
    avatar = serializers.ImageField(source="profile.avatar", read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "display_name", "avatar")


class CommentSerializer(serializers.ModelSerializer):
    author = PostAuthorSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ("id", "author", "body", "created_at")
        read_only_fields = ("author", "created_at")


class PostSerializer(serializers.ModelSerializer):
    author = PostAuthorSerializer(read_only=True)
    likes_count = serializers.IntegerField(read_only=True, required=False)
    saves_count = serializers.IntegerField(read_only=True, required=False)
    comments_count = serializers.IntegerField(read_only=True, required=False)
    feed_score = serializers.FloatField(read_only=True, required=False)
    liked_by_me = serializers.SerializerMethodField()
    saved_by_me = serializers.SerializerMethodField()
    listing = serializers.PrimaryKeyRelatedField(
        queryset=AccommodationListing.objects.none(),
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
            "delvers_board",
            "is_delvers",
            "is_accommodation_story",
            "listing",
            "created_at",
            "likes_count",
            "saves_count",
            "comments_count",
            "feed_score",
            "liked_by_me",
            "saved_by_me",
        )
        read_only_fields = ("author", "created_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        listing_field = self.fields.get("listing")
        if listing_field is not None:
            if request and request.user.is_authenticated:
                listing_field.queryset = AccommodationListing.objects.filter(owner=request.user)
            else:
                listing_field.queryset = AccommodationListing.objects.none()

    def validate(self, attrs):
        instance = self.instance
        request = self.context.get("request")

        is_acc = attrs.get("is_accommodation_story")
        if is_acc is None:
            is_acc = instance.is_accommodation_story if instance else False

        is_delvers = attrs.get("is_delvers")
        if is_delvers is None:
            is_delvers = instance.is_delvers if instance else False

        image = attrs.get("image")
        if image is None and instance is not None:
            image = instance.image
        video = attrs.get("video")
        if video is None and instance is not None:
            video = instance.video

        if image and video:
            raise serializers.ValidationError("Use either an image or a video, not both.")

        if is_delvers and is_acc:
            raise serializers.ValidationError("Accommodation stories cannot be published as Delvers pins.")
        if is_acc:
            attrs["is_delvers"] = False
        if is_delvers:
            attrs["is_accommodation_story"] = False

        if is_acc:
            user = getattr(request, "user", None)
            if not user or not user.is_authenticated:
                raise serializers.ValidationError("Sign in to post an accommodation story.")
            profile = getattr(user, "profile", None)
            if not profile or profile.user_type != UserType.SERVICE_PROVIDER:
                raise serializers.ValidationError("Only hosts and providers can post accommodation stories.")
            if not image and not video:
                raise serializers.ValidationError("Add a photo or short video for your story.")

        listing = attrs.get("listing")
        if listing is not None and request and request.user.is_authenticated:
            if listing.owner_id != request.user.id:
                raise serializers.ValidationError("You can only link stories to your own listings.")

        return attrs

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret.pop("listing", None)
        if instance.listing_id:
            ret["listing"] = {"id": instance.listing_id, "title": instance.listing.title}
        else:
            ret["listing"] = None
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
