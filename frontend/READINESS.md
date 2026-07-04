# DELVE Frontend — Beta Readiness Guide

Practical notes for running, testing, and onboarding beta users. UI polish is Stage 8; this document covers **product readiness** (Stage 9).

## Quick start

```bash
# Backend (separate terminal — see backend README)
cd backend && python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev          # http://localhost:5173
npm run build        # production bundle → dist/
npm run lint         # ESLint
npx tsc --noEmit     # typecheck without emit
```

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `''` (same origin) | Django API base URL, e.g. `http://127.0.0.1:8000` |
| `VITE_USE_MOCKS` | `true` in `.env.development` | When `true`, some paths use mock API responses |
| `VITE_ADMIN_APP_URL` | `http://localhost:5174` | Delve Admin console URL for staff handoff from `/admin` |

Create `frontend/.env.local` for local overrides (do not commit secrets):

```
VITE_API_URL=http://127.0.0.1:8000
VITE_USE_MOCKS=false
```

Tokens are stored in `localStorage` (`delve_access`, `delve_refresh`). No API keys belong in frontend source.

## Roles to test

| Role | How to get it | What to verify |
|------|---------------|----------------|
| **Logged-out visitor** | Use incognito | Public browse, search, detail pages; sign-in prompts on protected actions |
| **Traveller** | Register as “Explorer” | Dashboard, profile, create flows, messages, bookings |
| **Provider** | Register as “Service provider” + seed business | `/provider`, category admin, listings/bookings (API or demo) |
| **Admin** | Django `is_staff` on user | Traveller `/admin` redirects to Delve Admin (`:5174`); non-staff see access gate |

Frontend role checks are **UI only** — real authorization is enforced by the Django API.

## Routes checklist (smoke test)

### Public discovery
- `/` — Home
- `/search` — Global search (min 2 characters)
- `/accommodation`, `/food`, `/guides`, `/events`, `/transport`, `/journeys`, `/community`, `/delvers`

### Detail
- `/accommodation/:id`, `/food/:id`, `/guides/:id`, `/events/:id`
- `/transport/vehicle/:id`, `/transport/bus/:id`, `/journeys/:id`, `/delvers/posts/:id`
- `/u/:username`, `/business/:id`

### Traveller (sign in required for most)
- `/dashboard`, `/account`, `/settings`, `/messages`, `/messages/:id`
- `/create`, `/delvers/new`, `/journeys/new`, `/events/new`

### Provider (business profile required)
- `/provider`, `/provider/listings`, `/provider/bookings`, `/provider/reviews`
- `/provider/stays`, `/provider/guides`, `/provider/transport`, `/provider/food`

### Admin (`is_staff`)
- Traveller app `/admin/*` → redirects to **Delve Admin** console (`http://localhost:5174/admin/...`)
- Delve Admin: dashboard, users, verifications, email queue, moderation, bookings, analytics

### Auth
- `/login`, `/register`, `/verify-email`
- `/forgot-password`, `/reset-password` (logged-out password reset)

### Messaging & people discovery (live API)
- `/messages` → **New message** → search by name or `@username` (`GET /api/messaging/people/`)
- `/search` → **People** chip → profile results with `can_message` when signed in
- `/u/:username` → **Message** → `POST /api/messaging/start/`
- `/provider/messages` → **Message a guest** → scoped guest list (`?context=provider`)
- `/provider/messages/settings` → **Automated welcome** + provider quick-reply shortcuts (`GET/PATCH /api/messaging/provider-settings/`)
- Settings → Privacy → **Appear in search** / **Allow message requests** affect discovery

**Provider automated welcome:** When enabled, the provider’s custom message is sent once per **new** thread when a traveller starts the chat (`POST /api/messaging/start/`). Travellers see it as a real message labelled “Automated · Provider”. Only service providers can configure this — travellers never get suggestion chips or automated sends.

**Production:** `VITE_USE_MOCKS=false` and `VITE_API_URL` pointing at the Django API. People search is rate-limited to **30 requests/minute** per signed-in user.

## Demo / mock features (safe for beta)

These use **demo or local data** — clearly not production payments or destructive admin actions:

| Area | Behaviour |
|------|-----------|
| Provider dashboard bookings table | Demo rows from `providerData.ts` when no API owner match |
| Guides / Transport / Food category admin | Mock listings & reservations for UI testing |
| Community Q&A | Live feed from `/api/social/feed/`; posts also appear on `/community` |
| Messaging people search | Live on API; mock mirrors behaviour when `VITE_USE_MOCKS=true` |
| Journeys created via `/journeys/new` | Saved to `localStorage` (`delve_user_trips_v1`) |
| Stay provider **Refund** button | Disabled during beta; label shows “(beta)” |
| Guide / vehicle / bus **practice payment** | Simulated request flow, not real charges |

## Known limitations

- **Payments**: No real card processing; booking flows submit practice requests.
- **Refunds / suspend / bulk admin actions**: Placeholders or disabled where backend is incomplete.
- **Community**: Wired to social feed API; moderation uses admin content tools.
- **Saved places** on dashboard: Placeholder until saved-items API is unified.
- **Search “Journeys” chip**: Removed until search API returns journey results.
- **People discovery (compose)**: Requires live API (`GET /api/messaging/people/`). Set `VITE_USE_MOCKS=false` in production.
- **Provider guest compose**: Uses `?context=provider` — only guests with bookings or existing threads.
- **PWA / bundle size**: Main JS chunk ~870 KB — acceptable for beta; code-splitting is a post-beta improvement.
- **Frontend permissions**: Hiding nav items ≠ security; always validate on the server.
- **Music on posts**: Not supported — users upload **image or video only** (video may include its own captured audio track). No user-uploaded audio files.
- **Licensed music library**: Out of scope for beta.

## Account lifecycle (Phases 10–11)

| Flow | Where | Notes |
|------|--------|--------|
| Change password (signed in) | Settings → Account | Requires current password |
| Forgot password | `/forgot-password` | Email link → `/reset-password?token=…` |
| Delete account | Settings → Account → Danger zone | Type username + password; anonymizes PII, hides posts |

## Beta testing checklist

### Traveller tester

1. Create an account (Explorer) and verify email if prompted.
2. Search DELVE for “Windhoek” or “Swakopmund”.
3. Open a stay, food venue, guide, event, and transport listing.
4. Try save/share on a detail page (logged in).
5. Browse `/journeys` and open a journey detail.
6. Ask a question on `/community` or post to the feed from `/create`.
7. Create a Delvers post (`/create/post`, `/stories/new` for highlights, or `/delvers`).
8. Create a journey (`/journeys/new`) — should appear on your profile.
9. Open `/dashboard`, `/account`, `/settings` (try password change; account delete is under Danger zone).
10. Note: anything confusing, broken, or that looks like a dead end.

### Messaging & discovery (Phases A–F)

Run with **`VITE_USE_MOCKS=false`** and a seeded backend (`python manage.py seed_delve`).

1. **Compose search** — `/messages` → New message → search a known username (e.g. `slys`). Expect results or “No people found”, not a load error.
2. **Search page** — `/search?q=<name>` → People chip. Failed API should show Retry, not fake “No results”.
3. **Profile → Message** — `/u/:username` → Message. Should open or create a thread.
4. **Privacy: allow messages off** — In Settings, disable “Allow message requests”. Another account should not see a Message button on search; compose/start should return 403.
5. **Privacy: hidden from search** — Disable “Appear in search”. User should not appear in `/search` or traveller compose; provider guest compose may still list them if they have a booking.
6. **Block** — Block a user from message settings. They should disappear from compose search; starting a thread should fail.
7. **Provider guest scope** — As a provider with bookings, `/provider/messages` → Message a guest. Only booked guests and recent chat partners should appear.
8. **Provider automated welcome** — As provider, enable welcome at `/provider/messages/settings`. As traveller, message that provider for the first time — automated welcome should appear in the thread (not fake UI placeholders).

Backend smoke (optional): `python manage.py test messaging.tests_discovery_smoke messaging.tests_provider_messaging`

### Provider tester

1. Sign in as service provider (or team member with business access).
2. Open `/provider` — see overview or “need a business profile” gate.
3. Visit Listings, Bookings, Reviews.
4. Open each category: Stays, Guides, Transport, Food & drink.
5. Confirm demo/mock labels are understandable.
6. Try a booking status action on Stays (not Refund).
7. Open public business profile from sidebar.

### Admin tester

1. Sign in as `is_staff` user (e.g. `admin@delve.local` after `seed_delve`).
2. From the traveller app, open **Delve Admin console** in Account or profile menu — should land on `http://localhost:5174`.
3. Or visit `/admin` on the traveller app — should redirect to Delve Admin (deep link e.g. `/admin/users` → `/admin/users`).
4. In Delve Admin: Dashboard, Users, Verifications, Email verification, Reports, Moderation.
5. Confirm non-admin account does **not** see admin links in profile menu.
6. Confirm staff promote/suspend actions appear in Activity feed (audit log).

### What to record

- Where you got confused or clicked next unexpectedly.
- Blank screens, infinite loading, or raw error text.
- What you expected vs what happened.
- Flows you would not trust with real money or data.

## Build status (Stage 9 + Phases 8–18)

- `npm run build` — **passes** (TypeScript + Vite production build)
- `npm run lint` — warnings only on hook deps in list pages; no blocking errors in core paths
- Backend `manage.py test` — **100+ tests** including Delvers cohesion smoke (feed, profile, moments, moderation hide) and messaging discovery smoke (`messaging.tests_discovery_smoke`)
- Mock API (`VITE_USE_MOCKS=true`) — password reset, account delete, audio rejection on post create; messaging people search mirrors live rules including provider guest scope

### Delvers terminology (Phase 18)

- **Highlights** — short photo/video collections on `/delvers` (creator rings at top)
- **Stay stories** — host-only reels on the Stays page (`/provider/stays` → host story flow)
- Post permalinks: `/delvers/posts/:id`

## Recommended next steps (post–Stage 9)

1. Wire provider category admin mocks to live APIs where endpoints exist.
2. E2E smoke script (e.g. Playwright) for the route checklist above.
3. Unified saved-items and community APIs.
4. Real payment provider integration behind feature flags.
5. Split large CSS bundle / lazy-load admin and provider shells.
6. Licensed music library (server-hosted tracks only — still no user uploads).
