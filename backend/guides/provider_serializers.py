"""Serializers for provider guide dashboard (/api/guides/provider-profile/, provider-bookings/)."""

import uuid

from django.core.files.storage import default_storage
from rest_framework import serializers

from .models import GuideBooking, TourGuideProfile


def _photo_url(obj: TourGuideProfile, request=None) -> str | None:
    if obj.photo:
        url = obj.photo.url
        if request:
            return request.build_absolute_uri(url)
        return url
    for item in obj.portfolio_gallery or []:
        if isinstance(item, dict) and item.get("is_profile") and item.get("src"):
            return str(item["src"])
    return None


def _display_name(user) -> str:
    profile = getattr(user, "profile", None)
    if profile and getattr(profile, "display_name", None):
        return (profile.display_name or "").strip() or user.username
    return user.username


def _package_title(guide: TourGuideProfile, package_id: str) -> str:
    package_id = (package_id or "").strip()
    if not package_id:
        return "Custom tour"
    for pkg in guide.tour_packages or []:
        if not isinstance(pkg, dict):
            continue
        if str(pkg.get("id")) == package_id:
            title = str(pkg.get("title") or "").strip()
            return title or package_id
    return package_id


class ProviderGuideProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    display_name = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    photo_upload = serializers.ImageField(
        write_only=True,
        required=False,
        allow_null=True,
        source="photo",
    )
    photo_url = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    portfolio_gallery = serializers.SerializerMethodField()
    portfolio_gallery_write = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        source="portfolio_gallery",
    )

    class Meta:
        model = TourGuideProfile
        fields = (
            "id",
            "user",
            "username",
            "display_name",
            "headline",
            "bio",
            "languages",
            "regions",
            "hourly_rate",
            "photo",
            "photo_upload",
            "photo_url",
            "rating_avg",
            "rating_count",
            "guest_reviews",
            "response_hours_typical",
            "max_group_size",
            "tour_packages",
            "years_guiding",
            "certifications",
            "licensed_guide",
            "languages_detail",
            "portfolio_gallery",
            "portfolio_gallery_write",
            "guide_stories",
            "default_meeting_point",
            "specialities",
            "is_active",
            "created_at",
        )
        read_only_fields = (
            "id",
            "user",
            "username",
            "display_name",
            "rating_avg",
            "rating_count",
            "created_at",
        )

    def get_display_name(self, obj):
        return _display_name(obj.user)

    def get_photo(self, obj):
        return _photo_url(obj, self.context.get("request"))

    def get_portfolio_gallery(self, obj):
        rows = []
        for item in obj.portfolio_gallery or []:
            if not isinstance(item, dict):
                continue
            if item.get("is_profile"):
                continue
            src = str(item.get("src") or "").strip()
            if not src:
                continue
            entry = {"src": src}
            caption = str(item.get("caption") or "").strip()
            if caption:
                entry["caption"] = caption
            rows.append(entry)
        return rows

    def to_internal_value(self, data):
        if hasattr(data, "copy"):
            data = data.copy()
        else:
            data = dict(data)
        # Frontend sends portfolio_gallery and photo / photo_url.
        if "portfolio_gallery" in data and "portfolio_gallery_write" not in data:
            data["portfolio_gallery_write"] = data.pop("portfolio_gallery")
        if "photo" in data and "photo_url" not in data and "photo_upload" not in data:
            photo = data.get("photo")
            if isinstance(photo, str) or photo is None:
                data.pop("photo")
                data["photo_url"] = "" if photo is None else photo
        return super().to_internal_value(data)

    def _apply_photo_url(self, instance: TourGuideProfile, url: str | None):
        url = (url or "").strip()
        gallery = [
            item
            for item in (instance.portfolio_gallery or [])
            if isinstance(item, dict) and not item.get("is_profile")
        ]
        if url:
            gallery = [{"src": url, "caption": "", "is_profile": True}, *gallery]
        instance.portfolio_gallery = gallery

    def _normalize_portfolio(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Portfolio must be a list.")
        rows = []
        for item in value:
            if not isinstance(item, dict):
                continue
            src = str(item.get("src") or "").strip()
            if not src:
                continue
            entry = {"src": src}
            caption = str(item.get("caption") or "").strip()
            if caption:
                entry["caption"] = caption
            rows.append(entry)
        return rows

    def _store_upload(self, instance: TourGuideProfile, uploaded, *, folder: str) -> str:
        ext = uploaded.name.rsplit(".", 1)[-1] if "." in uploaded.name else "jpg"
        path = default_storage.save(
            f"guides/{folder}/{instance.pk}_{uuid.uuid4().hex}.{ext}",
            uploaded,
        )
        url = default_storage.url(path)
        request = self.context.get("request")
        if request:
            url = request.build_absolute_uri(url)
        return url

    def _apply_portfolio_uploads(self, instance: TourGuideProfile, files):
        if not files:
            return
        gallery = list(instance.portfolio_gallery or [])
        for uploaded in files:
            url = self._store_upload(instance, uploaded, folder="portfolio")
            gallery.append({"src": url, "caption": ""})
        instance.portfolio_gallery = gallery

    def _apply_package_uploads(self, instance: TourGuideProfile, package_id: str, photo_file, gallery_files):
        package_id = (package_id or "").strip()
        if not package_id:
            return
        packages = list(instance.tour_packages or [])
        updated = False
        for i, pkg in enumerate(packages):
            if not isinstance(pkg, dict) or str(pkg.get("id")) != package_id:
                continue
            entry = dict(pkg)
            if photo_file is not None:
                entry["photo"] = self._store_upload(instance, photo_file, folder="packages")
            photos = list(entry.get("photos") or [])
            for uploaded in gallery_files or []:
                photos.append(self._store_upload(instance, uploaded, folder="packages"))
            entry["photos"] = photos
            packages[i] = entry
            updated = True
            break
        if updated:
            instance.tour_packages = packages

    def _finalize_media(self, instance: TourGuideProfile, *, photo_url: str | None = None, had_photo_upload: bool = False):
        update_fields: list[str] = []
        if photo_url is not None and not had_photo_upload:
            self._apply_photo_url(instance, photo_url)
            update_fields.append("portfolio_gallery")
        portfolio_files = self.context.get("portfolio_images") or []
        if portfolio_files:
            self._apply_portfolio_uploads(instance, portfolio_files)
            update_fields.append("portfolio_gallery")
        package_id = str(self.context.get("package_id") or "").strip()
        package_photo = self.context.get("package_photo")
        package_gallery = self.context.get("package_gallery_images") or []
        if package_id and (package_photo is not None or package_gallery):
            self._apply_package_uploads(instance, package_id, package_photo, package_gallery)
            update_fields.append("tour_packages")
        if update_fields:
            instance.save(update_fields=list(dict.fromkeys(update_fields)))

    def validate_tour_packages(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Tour packages must be a list.")
        if len(value) > 20:
            raise serializers.ValidationError("At most 20 tour packages per guide.")
        normalized = []
        seen_ids: set[str] = set()
        for i, pkg in enumerate(value):
            if not isinstance(pkg, dict):
                raise serializers.ValidationError("Each package must be an object.")
            pkg_id = str(pkg.get("id") or "").strip() or f"package-{i + 1}"
            if pkg_id in seen_ids:
                raise serializers.ValidationError(f'Duplicate package id "{pkg_id}".')
            seen_ids.add(pkg_id)
            title = str(pkg.get("title") or "").strip()
            if not title:
                raise serializers.ValidationError("Each package needs a title.")
            description = str(pkg.get("description") or "").strip()
            if not description:
                raise serializers.ValidationError(f'Package "{title}" needs a description.')
            try:
                hours = max(1, int(pkg.get("hours") or 1))
            except (TypeError, ValueError) as exc:
                raise serializers.ValidationError("Package hours must be a number.") from exc
            price = str(pkg.get("price") or "").strip()
            if not price:
                raise serializers.ValidationError(f'Package "{title}" needs a price.')
            entry = {
                "id": pkg_id,
                "title": title,
                "description": description,
                "hours": hours,
                "price": price,
                "photo": (str(pkg.get("photo") or "").strip() or None),
                "photos": [
                    str(p).strip()
                    for p in (pkg.get("photos") or [])
                    if str(p).strip()
                ],
            }
            reviews = pkg.get("reviews")
            if isinstance(reviews, list):
                entry["reviews"] = reviews
            normalized.append(entry)
        return normalized

    def validate_guide_stories(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Guide stories must be a list.")
        if len(value) > 8:
            raise serializers.ValidationError("At most 8 story channels per guide.")

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

    def validate_languages(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Languages must be a list.")
        return [str(item).strip() for item in value if str(item).strip()]

    def validate_regions(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Regions must be a list.")
        return [str(item).strip() for item in value if str(item).strip()]

    def validate_specialities(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Specialities must be a list.")
        return [str(item).strip() for item in value if str(item).strip()]

    def validate_certifications(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Certifications must be a list.")
        return [str(item).strip() for item in value if str(item).strip()]

    def validate_languages_detail(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Language details must be a list.")
        rows = []
        for item in value:
            if not isinstance(item, dict):
                continue
            language = str(item.get("language") or "").strip()
            if not language:
                continue
            rows.append(
                {
                    "language": language,
                    "level": str(item.get("level") or "").strip() or "Fluent",
                }
            )
        return rows

    def create(self, validated_data):
        from accounts.seller_trust import enforce_service_go_live

        user = validated_data.get("user") or self.context["request"].user
        enforce_service_go_live(user=user, wanting_active=bool(validated_data.get("is_active", True)))
        photo_url = validated_data.pop("photo_url", "")
        portfolio = self._normalize_portfolio(validated_data.pop("portfolio_gallery", []))
        validated_data["portfolio_gallery"] = portfolio
        instance = super().create(validated_data)
        self._finalize_media(
            instance,
            photo_url=photo_url if photo_url and not instance.photo else None,
            had_photo_upload=bool(instance.photo),
        )
        return instance

    def update(self, instance, validated_data):
        if "is_active" in validated_data:
            from accounts.seller_trust import enforce_service_go_live

            enforce_service_go_live(
                user=instance.user,
                wanting_active=bool(validated_data.get("is_active")),
            )
        photo_url = validated_data.pop("photo_url", None)
        had_photo_upload = "photo" in validated_data
        if "portfolio_gallery" in validated_data:
            # Preserve profile photo marker when portfolio is replaced.
            profile_entries = [
                item
                for item in (instance.portfolio_gallery or [])
                if isinstance(item, dict) and item.get("is_profile")
            ]
            portfolio = self._normalize_portfolio(validated_data.pop("portfolio_gallery"))
            validated_data["portfolio_gallery"] = [*profile_entries, *portfolio]
        instance = super().update(instance, validated_data)
        if photo_url is not None and not had_photo_upload:
            self._finalize_media(instance, photo_url=photo_url, had_photo_upload=False)
        else:
            self._finalize_media(instance, had_photo_upload=had_photo_upload)
        return instance


class ProviderGuideBookingSerializer(serializers.ModelSerializer):
    package_title = serializers.SerializerMethodField()
    guest_display_name = serializers.SerializerMethodField()
    guest_username = serializers.CharField(source="client.username", read_only=True)
    guests = serializers.IntegerField(source="group_size", read_only=True)
    date = serializers.DateField(read_only=True)
    duration_hours = serializers.IntegerField(read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    status = serializers.CharField(read_only=True)
    start_time = serializers.TimeField(read_only=True, allow_null=True)
    meeting_point = serializers.CharField(read_only=True)
    notes = serializers.CharField(read_only=True)
    package_id = serializers.CharField(read_only=True)
    mock_payment_ref = serializers.CharField(read_only=True)

    class Meta:
        model = GuideBooking
        fields = (
            "id",
            "package_title",
            "package_id",
            "guest_display_name",
            "guest_username",
            "date",
            "start_time",
            "guests",
            "duration_hours",
            "meeting_point",
            "notes",
            "total_price",
            "platform_fee",
            "seller_payout",
            "payout_status",
            "paid_at",
            "payout_released_at",
            "status",
            "mock_payment_ref",
        )

    def get_package_title(self, obj):
        return _package_title(obj.guide, obj.package_id)

    def get_guest_display_name(self, obj):
        return _display_name(obj.client)
