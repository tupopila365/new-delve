"""Serializers for provider food dashboard (/api/food/provider-venues/)."""



import uuid



from django.core.files.storage import default_storage

from rest_framework import serializers



from .models import FoodVenue

from .serializers import _cover_image_url





class ProviderFoodVenueSerializer(serializers.ModelSerializer):

    owner_username = serializers.CharField(source="owner.username", read_only=True)

    cover_image = serializers.SerializerMethodField()

    cover_image_upload = serializers.ImageField(

        write_only=True,

        required=False,

        allow_null=True,

        source="cover_image",

    )

    cover_image_url = serializers.CharField(write_only=True, required=False, allow_blank=True)



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

            "phone",

            "website",

            "opening_hours",

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

            "cover_image_upload",

            "cover_image_url",

            "rating_avg",

            "rating_count",

            "is_active",

            "created_at",

        )

        read_only_fields = ("id", "owner_username", "rating_avg", "rating_count", "created_at")



    def get_cover_image(self, obj):

        return _cover_image_url(obj, self.context.get("request"))



    def _gallery_files(self):

        return self.context.get("gallery_images") or []



    def _apply_cover_url(self, instance: FoodVenue, url: str):

        url = (url or "").strip()

        if not url:

            return

        photos = list(instance.photos or [])

        if photos and isinstance(photos[0], dict) and photos[0].get("image") == url:

            return

        cover_entry = {

            "id": instance.pk * 100 + 1,

            "image": url,

            "caption": f"{instance.name} cover",

            "category": "food",

            "is_cover": True,

        }

        rest = [p for p in photos if not (isinstance(p, dict) and p.get("is_cover"))]

        instance.photos = [cover_entry, *rest]



    def _sync_cover_photo_from_field(self, instance: FoodVenue):

        if not instance.cover_image:

            return

        request = self.context.get("request")

        url = _cover_image_url(instance, request)

        if not url:

            return

        self._apply_cover_url(instance, url)



    def _apply_gallery_uploads(self, instance: FoodVenue, files):

        if not files:

            return

        request = self.context.get("request")

        photos = list(instance.photos or [])

        for uploaded in files:

            ext = uploaded.name.rsplit(".", 1)[-1] if "." in uploaded.name else "jpg"

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

                    "caption": "",

                    "category": "food",

                    "is_cover": False,

                }

            )

        instance.photos = photos



    def _finalize_media(self, instance: FoodVenue, *, cover_url: str | None = None):

        update_fields: list[str] = []

        if cover_url is not None:

            self._apply_cover_url(instance, cover_url)

            update_fields.append("photos")

        if instance.cover_image:

            self._sync_cover_photo_from_field(instance)

            update_fields.append("photos")

        gallery_files = self._gallery_files()

        if gallery_files:

            self._apply_gallery_uploads(instance, gallery_files)

            update_fields.append("photos")

        if update_fields:

            instance.save(update_fields=list(dict.fromkeys(update_fields)))



    def create(self, validated_data):

        cover_url = validated_data.pop("cover_image_url", "")

        instance = super().create(validated_data)

        self._finalize_media(instance, cover_url=cover_url if cover_url and not instance.cover_image else None)

        return instance



    def update(self, instance, validated_data):

        cover_url = validated_data.pop("cover_image_url", None)

        had_cover_upload = "cover_image" in validated_data

        instance = super().update(instance, validated_data)

        if cover_url is not None and not had_cover_upload:

            self._finalize_media(instance, cover_url=cover_url)

        else:

            self._finalize_media(instance)

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

                        f'Slide {j + 1} in "{label}" needs an image URL and headline.'

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

