# Session privacy — device description and approximate location

## What we store

Each authenticated device session stores:

- A **hashed** refresh token (`tokenHash`). Raw tokens are never stored or returned to the client.
- Normalized device fields derived **on the server** from the request `User-Agent`:
  - browser family and major version
  - operating-system family
  - device category (`desktop` | `phone` | `tablet` | `unknown`)
- Optional approximate location: **city**, **region**, and **country code** only.
- Timestamps: `createdAt`, `lastSeenAt`, `expiresAt`, `revokedAt`, optional `revokedReason`.

## What we do not store or expose

- Raw session / refresh tokens
- Token hashes in API responses
- Complete IP addresses (no long-term IP retention)
- Complete raw user-agent strings in API responses
- Device fingerprints
- GPS coordinates or street-level addresses
- Browser geolocation permission is never requested for session management

## Approximate location provider

Location is **optional** and resolved only from **trusted infrastructure headers** when present, for example:

- Cloudflare: `CF-IPCity`, `CF-Region`, `CF-IPCountry`
- Vercel: `x-vercel-ip-city`, `x-vercel-ip-country-region`, `x-vercel-ip-country`

Lookups run on the server. If no trusted headers are present, location fields stay empty and the UI shows **Location unavailable**. Location failure never blocks session creation.

Set `TRUST_GEO_HEADERS=true` (default in staging/production behind a known edge) to accept these headers. In local development the default is off unless explicitly enabled, so invented locations are never shown.

## Last activity

`lastSeenAt` updates are **throttled** (default once every five minutes per session, configurable via `SESSION_LAST_SEEN_THROTTLE_SECONDS`) so authenticated API traffic does not write to PostgreSQL on every request. Revoked and expired sessions are never updated. Server time is used for all timestamps.

## Refresh token rotation families

Each login starts a `tokenFamilyId`. Refresh rotates by revoking the previous row with reason `rotated` and creating a successor row in the same family. Presenting a previously rotated token is treated as **reuse**: Backend V2 revokes every active session in that family (`reuse_detected`) and rejects the request. Raw tokens are never stored; only SHA-256 hashes are persisted.

## Administrator sessions

- `User.role` is `traveler` or `admin`.
- Traveler sign-in always creates `isAdminSession: false` (Bearer refresh for traveler-web).
- Admin sign-in (`POST /api/v2/admin/auth/login`) requires `role = admin`, creates `isAdminSession: true`, and sets the HttpOnly cookie `delve_admin_session` (configurable). Admin tokens are never stored in localStorage.
- Staging and production **refuse to start** unless `ADMIN_WEB_URL` / `ADMIN_WEB_ORIGIN` use HTTPS, so Secure admin cookies are always available there. Local HTTP development intentionally omits the `Secure` flag.
- Staging/production admin cookies use `SameSite=None; Secure` so a separately hosted admin SPA (for example Vercel) can send them to Backend V2 on Render/Heroku. Local development keeps `SameSite=Lax` without `Secure`. Mutations still require a trusted admin Origin and CSRF.
- Admin session TTL defaults to **8 hours** (`ADMIN_SESSION_TTL_HOURS`) with an inactivity timeout of **30 minutes** (`ADMIN_SESSION_IDLE_TIMEOUT_MINUTES`).
- Cookie-authenticated admin mutations require a trusted `Origin`/`Referer` **and** a double-submit CSRF token (`delve_admin_csrf` cookie + `X-CSRF-Token` header). The token is issued on login and refreshed on `GET /auth/me`; admin-web keeps it in memory only.
- `/api/v2/admin/**` (except admin login) requires a valid admin cookie session whose user still has the admin role. Frontend flags and localStorage cannot grant admin access.
- Removing the admin role revokes admin sessions immediately (`admin_role_removed`).
- Security actions are recorded in append-only `AdminAuditLog`.

## Retention

- Expired or revoked sessions older than `SESSION_RETENTION_DAYS` (default **90**) are eligible for purge.
- Security events older than `SECURITY_EVENT_RETENTION_DAYS` (default **365**) are eligible for purge.
- Purge runs opportunistically from Backend V2 (see `purgeExpiredSessionRecords`).

## Frontend contract

Session list responses include a human-readable description (for example `Chrome on Windows`), optional approximate location text, timestamps, and a server-derived `isCurrent` flag. They never include tokens, hashes, IPs, or raw user-agent strings.
