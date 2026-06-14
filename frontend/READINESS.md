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
| **Admin** | Django `is_staff` on user | `/admin` routes; non-staff see “Admin access required” |

Frontend role checks are **UI only** — real authorization is enforced by the Django API.

## Routes checklist (smoke test)

### Public discovery
- `/` — Home
- `/search` — Global search (min 2 characters)
- `/accommodation`, `/food`, `/guides`, `/events`, `/transport`, `/journeys`, `/community`, `/delvers`

### Detail
- `/accommodation/:id`, `/food/:id`, `/guides/:id`, `/events/:id`
- `/transport/vehicle/:id`, `/transport/bus/:id`, `/journeys/:id`, `/posts/:id`
- `/u/:username`, `/business/:id`

### Traveller (sign in required for most)
- `/dashboard`, `/account`, `/settings`, `/messages`, `/messages/:id`
- `/create`, `/delvers/new`, `/journeys/new`, `/events/new`

### Provider (business profile required)
- `/provider`, `/provider/listings`, `/provider/bookings`, `/provider/reviews`
- `/provider/stays`, `/provider/guides`, `/provider/transport`, `/provider/food`

### Admin (`is_staff`)
- `/admin`, `/admin/users`, `/admin/businesses`, `/admin/bookings`

### Auth
- `/login`, `/register`, `/verify-email`

## Demo / mock features (safe for beta)

These use **demo or local data** — clearly not production payments or destructive admin actions:

| Area | Behaviour |
|------|-----------|
| Provider dashboard bookings table | Demo rows from `providerData.ts` when no API owner match |
| Guides / Transport / Food category admin | Mock listings & reservations for UI testing |
| Community Q&A | Local/demo questions; “Post question” is preview-only |
| Journeys created via `/journeys/new` | Saved to `localStorage` (`delve_user_trips_v1`) |
| Platform admin bookings page | Demo table (not live API) |
| Admin “Verifications / Reports / Analytics” nav | Links to overview anchors — preview only |
| Stay provider **Refund** button | Disabled during beta; label shows “(beta)” |
| Guide / vehicle / bus **practice payment** | Simulated request flow, not real charges |

## Known limitations

- **Payments**: No real card processing; booking flows submit practice requests.
- **Refunds / suspend / bulk admin actions**: Placeholders or disabled where backend is incomplete.
- **Community**: Not fully wired to moderation API.
- **Saved places** on dashboard: Placeholder until saved-items API is unified.
- **Search “Journeys” chip**: Removed until search API returns journey results.
- **PWA / bundle size**: Main JS chunk ~870 KB — acceptable for beta; code-splitting is a post-beta improvement.
- **Frontend permissions**: Hiding nav items ≠ security; always validate on the server.

## Beta testing checklist

### Traveller tester

1. Create an account (Explorer) and verify email if prompted.
2. Search DELVE for “Windhoek” or “Swakopmund”.
3. Open a stay, food venue, guide, event, and transport listing.
4. Try save/share on a detail page (logged in).
5. Browse `/journeys` and open a journey detail.
6. Ask a question on `/community` (preview form).
7. Create a Delvers post (`/delvers/new` or `/create`).
8. Create a journey (`/journeys/new`) — should appear on your profile.
9. Open `/dashboard`, `/account`, `/settings`.
10. Note: anything confusing, broken, or that looks like a dead end.

### Provider tester

1. Sign in as service provider (or team member with business access).
2. Open `/provider` — see overview or “need a business profile” gate.
3. Visit Listings, Bookings, Reviews.
4. Open each category: Stays, Guides, Transport, Food & drink.
5. Confirm demo/mock labels are understandable.
6. Try a booking status action on Stays (not Refund).
7. Open public business profile from sidebar.

### Admin tester

1. Sign in as `is_staff` user.
2. Open `/admin` overview.
3. Browse Users, Businesses, Bookings.
4. Confirm non-admin account does **not** see Platform admin in profile menu.
5. Note pending verifications/reports as preview-only.

### What to record

- Where you got confused or clicked next unexpectedly.
- Blank screens, infinite loading, or raw error text.
- What you expected vs what happened.
- Flows you would not trust with real money or data.

## Build status (Stage 9)

- `npm run build` — **passes** (TypeScript + Vite production build)
- `npm run lint` — warnings only on hook deps in list pages; no blocking errors in core paths

## Recommended next steps (post–Stage 9)

1. Wire provider category admin mocks to live APIs where endpoints exist.
2. E2E smoke script (e.g. Playwright) for the route checklist above.
3. Unified saved-items and community APIs.
4. Real payment provider integration behind feature flags.
5. Split large CSS bundle / lazy-load admin and provider shells.
