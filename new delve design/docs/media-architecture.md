# Delve media architecture

## Permanent rule

**Browser → Cloudinary for media files**  
**Browser → Delve API → PostgreSQL for media metadata**

User-uploaded media must never pass through Backend V2 as binary data and must never be stored as Base64, blob, or `Bytes` columns in PostgreSQL.

Static application assets (logos, UI illustrations) may remain bundled with the frontend. This document applies to **user-uploaded** media.

## Flow

1. Traveler selects a file in traveler-web.
2. Local preview via `URL.createObjectURL` (revoked after completion).
3. Frontend requests `POST /api/v2/media/upload-signature` with metadata only.
4. Backend authenticates, authorizes purpose, validates size/format, creates a short-lived `MediaUploadIntent`, and returns a **signed** Cloudinary upload payload (**never** `CLOUDINARY_API_SECRET`).
5. Browser uploads **directly** to Cloudinary (chunked for large videos).
6. Frontend calls `POST /api/v2/media/complete` with Cloudinary result fields + signature.
7. Backend verifies ownership, intent, folder, format, size, and Cloudinary signature; saves `MediaAsset` metadata only.
8. UI loads transformed delivery URLs from Cloudinary CDN via the shared URL builder (`f_auto`, `q_auto`).

## Folder ownership (server-chosen)

Examples:

- `delve/users/{userId}/avatars`
- `delve/users/{userId}/posts`
- `delve/businesses/{businessId}/profiles`
- `delve/businesses/{businessId}/listings/{listingId}`

The frontend must never supply the Cloudinary folder.

## Environment (Backend V2 only)

| Variable | Purpose |
|----------|---------|
| `CLOUDINARY_CLOUD_NAME` | Cloud name |
| `CLOUDINARY_API_KEY` | API key (safe to return in signed upload responses) |
| `CLOUDINARY_API_SECRET` | **Server only** — never in `VITE_*`, responses, or logs |
| `CLOUDINARY_FOLDER_PREFIX` | Default `delve` |
| `CLOUDINARY_UPLOAD_SIGNATURE_TTL_SECONDS` | Default `300` |
| `CLOUDINARY_MAX_VIDEO_BYTES` | Configurable video max (default 500 MB) |
| `CLOUDINARY_WEBHOOK_SECRET` | Optional; defaults to API secret for webhook verify |

Required in staging and production when media uploads are enabled.

## Legacy S3 avatars

Earlier Day 2 work used optional S3-compatible signed PUTs and `TravelerProfile.avatarUrl` / `avatarKey`. Those fields remain readable as a **legacy fallback**. New uploads use Cloudinary + `MediaAsset` only. Do not delete staging avatar URLs without an approved migration.

## Deletion

`DELETE /api/v2/media/:mediaId` marks `DELETION_PENDING`, destroys the Cloudinary asset with server credentials, then marks `DELETED`. Public ID always comes from the authorized DB row.

## Webhooks

`POST /api/v2/webhooks/cloudinary` verifies authenticity on the raw body, is idempotent, and updates processing status. It is not user-authenticated.

## Enforcement

- Automated tests fail if `CLOUDINARY_API_SECRET` appears under traveler/admin frontend sources.
- Backend V2 must not expose multipart media upload endpoints for user content.
- All traveler uploads must go through the shared `src/media` upload helpers.
