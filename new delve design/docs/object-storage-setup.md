# Optional S3-compatible storage (legacy Day 2 avatar path)

> **Deprecated for new uploads.** User media now uses Cloudinary. See [`media-architecture.md`](./media-architecture.md).

`TravelerProfile.avatarUrl` / `avatarKey` may still hold legacy S3 URLs for read fallback until travelers re-upload. New uploads use `POST /api/v2/media/upload-signature` → Cloudinary → `POST /api/v2/media/complete`.

Do not configure S3 for new environments unless you are migrating historical objects.
