"""Serializers for provider food dashboard (/api/food/provider-venues/)."""

import uuid

from django.core.files.storage import default_storage
from rest_framework import serializers

from common.gallery_media import media_url_kind

from .hours_utils import apply_schedule_fields, normalize_schedule
from .models import FoodVenue
from .serializers import _absolute_media_url, _cover_image_url, _cover_kind_for


def _file_media_kind(uploaded) -> str:
    content_type = (getattr(uploaded, "content_type", "") or "").lower()
    name = (getattr(uploaded, "name", "") or "").lower()
    ext = name.rsplit(".", 1)[-1] if "." in name else ""
    if content_type.startswith("video/") or ext in {"mp4", "webm", "mov", "m4v"}:
        return "video"
    return "image"


class ProviderFoodVenueSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    cover_image = serializers.SerializerMethodField()
    cover_kind = serializers.SerializerMethodField()
    cover_image_upload = serializers.FileField(
        write_only=True,
        required=False,
        allow_null=True,
    )
    cover_image_url = serializers.CharField(write_only=True, required=False, allow_blank=True)
    # Write-only alias — model `cover_kind` is exposed read-only via SerializerMethodField.
    cover_kind_in = serializers.ChoiceField(
        choices=[("image", "Image"), ("video", "Video")],
        write_only=True,
        required=False,
    )

    class Meta:
        model = FoodVenue
        fields = (
            "id",
            "owner_username",
            "name",
            "description",
            "tagline",
            "popular_dish",
            "cuisine",
            "region",
            "city",
            "address",
            "latitude",
            "longitude",
            "google_place_id",
            "formatted_address",
            "phone",
            "website",
            "opening_hours",
            "opening_hours_json",
            "closes_at",
            "price_level",
            "dine_in",
            "takeaway",
            "delivery",
            "reservations",
            "is_open",
            "amenities",
            "photos",
            "venue_stories",
            "cover_image",
            "cover_kind",
            "cover_image_upload",
            "cover_image_url",
            "cover_kind_in",
            "rating_avg",
            "rating_count",
            "is_active",
            "created_at",
        )
        read_only_fields = (
            "id",
            "owner_username",
            "cover_kind",
            "rating_avg",
            "rating_count",
            "created_at",
        )

    def get_cover_image(self, obj):
        return _cover_image_url(obj, self.context.get("request"))

    def get_cover_kind(self, obj):
        return _cover_kind_for(obj)

    def _gallery_files(self):
        return self.context.get("gallery_images") or []

    def _apply_cover_url(self, instance: FoodVenue, url: str, *, kind: str | None = None):
        url = (url or "").strip()
        if not url:
            return
        resolved_kind = kind if kind in ("image", "video") else media_url_kind(url)
        photos = list(instance.photos or [])
        if (
            photos
            and isinstance(photos[0], dict)
            and photos[0].get("image") == url
            and photos[0].get("kind") == resolved_kind
        ):
            return
        cover_entry = {
            "id": instance.pk * 100 + 1,
            "image": url,
            "kind": resolved_kind,
            "caption": f"{instance.name} cover",
            "category": "food",
            "is_cover": True,
        }
        rest = [p for p in photos if not (isinstance(p, dict) and p.get("is_cover"))]
        instance.photos = [cover_entry, *rest]

    def _store_cover_upload(self, instance: FoodVenue, uploaded) -> str:
        ext = uploaded.name.rsplit(".", 1)[-1] if "." in uploaded.name else "bin"
        kind = _file_media_kind(uploaded)
        path = default_storage.save(
            f"food/covers/{instance.pk}_{uuid.uuid4().hex}.{ext}",
            uploaded,
        )
        url = default_storage.url(path)
        request = self.context.get("request")
        if request:
            url = request.build_absolute_uri(url)
        instance.cover_image = url
        instance.cover_kind = kind
        instance.save(update_fields=["cover_image", "cover_kind"])
        self._apply_cover_url(instance, url, kind=kind)
        return url

    def _apply_cover_url_field(self, instance: FoodVenue, cover_url: str, *, kind: str | None = None):
        url = (cover_url or "").strip()
        if not url:
            return
        resolved_kind = kind if kind in ("image", "video") else media_url_kind(url)
        absolute = _absolute_media_url(url, self.context.get("request")) or url
        instance.cover_image = absolute
        instance.cover_kind = resolved_kind
        instance.save(update_fields=["cover_image", "cover_kind"])
        self._apply_cover_url(instance, absolute, kind=resolved_kind)

    def _apply_gallery_uploads(self, instance: FoodVenue, files):
        if not files:
            return
        request = self.context.get("request")
        photos = list(instance.photos or [])
        for uploaded in files:
            ext = uploaded.name.rsplit(".", 1)[-1] if "." in uploaded.name else "jpg"
            kind = _file_media_kind(uploaded)
            path = default_storage.save(
                f"food/gallery/{instance.pk}_{uuid.uuid4().hex}.{ext}",
                uploaded,
            )
            url = default_storage.url(path)
            if request:
                url = request.build_absolute_uri(url)
            photos.append(
                {
                    "id": instance.pk * 100 + len(photos) + 1,
                    "image": url,
                    "kind": kind,
                    "caption": "",
                    "category": "food",
                    "is_cover": False,
                }
            )
        instance.photos = photos

    def _finalize_media(
        self,
        instance: FoodVenue,
        *,
        cover_url: str | None = None,
        cover_upload=None,
        cover_kind: str | None = None,
    ):
        update_fields: list[str] = []
        if cover_upload is not None:
            self._store_cover_upload(instance, cover_upload)
            update_fields.append("photos")
        elif cover_url is not None:
            self._apply_cover_url_field(instance, cover_url, kind=cover_kind)
            update_fields.append("photos")
        elif (instance.cover_image or "").strip():
            self._apply_cover_url(
                instance,
                _cover_image_url(instance, self.context.get("request")) or str(instance.cover_image),
                kind=cover_kind or instance.cover_kind,
            )
            update_fields.append("photos")

        gallery_files = self._gallery_files()
        if gallery_files:
            self._apply_gallery_uploads(instance, gallery_files)
            update_fields.append("photos")

        if update_fields:
            instance.save(update_fields=list(dict.fromkeys(update_fields)))

    def validate_opening_hours_json(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Opening hours must be a list of day entries.")
        return normalize_schedule(value)

    def _apply_opening_hours_json(self, instance, schedule):
        if schedule is None:
            return
        apply_schedule_fields(instance, schedule)

    def create(self, validated_data):
        cover_url = validated_data.pop("cover_image_url", "")
        cover_upload = validated_data.pop("cover_image_upload", None)
        cover_kind = validated_data.pop("cover_kind_in", None)
        schedule = validated_data.pop("opening_hours_json", None)

        instance = super().create(validated_data)

        if schedule is not None:
            self._apply_opening_hours_json(instance, schedule)
            instance.save(update_fields=["opening_hours_json", "opening_hours", "closes_at"])

        self._finalize_media(
            instance,
            cover_url=cover_url if cover_url and not cover_upload else None,
            cover_upload=cover_upload,
            cover_kind=cover_kind,
        )
        return instance

    def update(self, instance, validated_data):
        cover_url = validated_data.pop("cover_image_url", None)
        cover_upload = validated_data.pop("cover_image_upload", None)
        cover_kind = validated_data.pop("cover_kind_in", None)
        schedule = validated_data.pop("opening_hours_json", None)

        # Prefer cover_kind / kind from photos JSON when client sends Delvers-style URL payload.
        photos = validated_data.get("photos")
        if cover_kind is None and isinstance(photos, list):
            for entry in photos:
                if isinstance(entry, dict) and entry.get("is_cover"):
                    kind = entry.get("kind")
                    if kind in ("image", "video"):
                        cover_kind = kind
                    break

        instance = super().update(instance, validated_data)

        if schedule is not None:
            self._apply_opening_hours_json(instance, schedule)
            instance.save(update_fields=["opening_hours_json", "opening_hours", "closes_at"])

        if cover_upload is not None:
            self._finalize_media(instance, cover_upload=cover_upload, cover_kind=cover_kind)
        elif cover_url is not None:
            self._finalize_media(instance, cover_url=cover_url, cover_kind=cover_kind)
        else:
            # Photos JSON may include is_cover remote URL (Cloudinary) without a separate cover field.
            cover_from_photos = None
            kind_from_photos = cover_kind
            for entry in instance.photos or []:
                if isinstance(entry, dict) and entry.get("is_cover") and entry.get("image"):
                    cover_from_photos = str(entry.get("image") or "").strip()
                    if entry.get("kind") in ("image", "video"):
                        kind_from_photos = entry["kind"]
                    break
            if cover_from_photos:
                self._finalize_media(
                    instance,
                    cover_url=cover_from_photos,
                    cover_kind=kind_from_photos,
                )
            else:
                self._finalize_media(instance, cover_kind=cover_kind)
        return instance

    def validate_amenities(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Amenities must be a list of strings.")
        return [str(item).strip() for item in value if str(item).strip()]

    def validate_photos(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Photos must be a list.")
        return value

    def validate_venue_stories(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Venue stories must be a list.")
        if len(value) > 8:
            raise serializers.ValidationError("At most 8 story channels per venue.")

        normalized = []
        for i, channel in enumerate(value):
            if not isinstance(channel, dict):
                raise serializers.ValidationError("Each story channel must be an object.")
            label = str(channel.get("label") or "").strip()
            if not label:
                raise serializers.ValidationError("Each story channel needs a label.")
            slides_raw = channel.get("slides")
            if not isinstance(slides_raw, list) or not slides_raw:
                raise serializers.ValidationError(f'Channel "{label}" needs at least one slide.')
            if len(slides_raw) > 12:
                raise serializers.ValidationError(f'Channel "{label}" has too many slides (max 12).')

            channel_id = str(channel.get("id") or "").strip() or f"channel-{i + 1}"
            slides = []
            for j, slide in enumerate(slides_raw):
                if not isinstance(slide, dict):
                    raise serializers.ValidationError(f'Slide {j + 1} in "{label}" must be an object.')
                src = str(slide.get("src") or "").strip()
                headline = str(slide.get("headline") or "").strip()
                if not src or not headline:
                    raise serializers.ValidationError(
                        f'Slide {j + 1} in "{label}" needs a photo or video and a caption.'
                    )
                kind = slide.get("kind")
                entry = {
                    "id": str(slide.get("id") or "").strip() or f"{channel_id}-{j + 1}",
                    "kind": kind if kind in ("image", "video") else "image",
                    "src": src,
                    "headline": headline,
                    "sub": str(slide.get("sub") or "").strip(),
                }
                duration = slide.get("durationMs")
                if isinstance(duration, (int, float)) and duration > 0:
                    entry["durationMs"] = int(duration)
                slides.append(entry)

            cover = str(channel.get("coverSrc") or "").strip() or slides[0]["src"]
            normalized.append(
                {
                    "id": channel_id,
                    "label": label,
                    "coverSrc": cover,
                    "slides": slides,
                }
            )
        return normalized
