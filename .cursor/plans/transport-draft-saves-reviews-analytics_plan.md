# Transport: draft, saves, seat prefs, analytics, review reply

## Goal

Finish the remaining Transport marketplace gaps: real draft/publish behavior, saved vehicles/trips, persist bus seat preference, provider analytics API, and provider review replies (Transport-scoped).

## Recommended approach (locked)

| Feature | Approach |
|---------|----------|
| **Review reply** | Transport only: `provider_reply` + `provider_replied_at` on `VehicleRentalReview` / `SeatReservationReview` + owner POST. Stay/Food stay unchanged (no existing reply API). |
| **Draft** | Food-style: keep single `is_active` flag; **default `False` on create**; public catalog `is_active=True` only; UI **Draft / Published** (not completeness-as-draft). Completeness % remains a checklist, labeled “Needs info”. |
| **Saves** | Clone Stay/Food: save models + toggle + saved list for vehicles and bus trips; replace localStorage/`useState` stubs. |
| **Seat preference** | Optional `seat_preference` on `SeatReservation` (`any` / `window` / `aisle`); include in booking POST/group create. |
| **Analytics** | Clone Food: `GET /api/transport/provider-analytics/?days=30`; wire `TransportAdmin` (and light ProviderDashboard if already has slots). |

---

## Phase 1 — Backend models + migration

**File:** `backend/transport/models.py` + new migration `0011_…`

1. **Reviews**
   - `VehicleRentalReview.provider_reply` (`TextField`, blank)
   - `VehicleRentalReview.provider_replied_at` (`DateTimeField`, null)
   - Same two fields on `SeatReservationReview`

2. **Draft default**
   - Change `VehicleRentalListing.is_active` and `BusTrip.is_active` **default to `False`**
   - Data migration: leave existing rows as-is (`True` stays published)

3. **Saves**
   - `VehicleRentalSave(listing, user)` unique_together
   - `BusTripSave(trip, user)` unique_together
   - Mirror Food `FoodVenueSave` / Stay `AccommodationListingSave`

4. **Seat preference**
   - `SeatReservation.seat_preference` `CharField(max_length=16, blank=True, default="")`  
     Allowed: `""` / `any` / `window` / `aisle`

---

## Phase 2 — Review reply API

**Files:** `review_serializers.py`, `review_services.py`, `views.py`, `urls.py`, `tests_transport_social.py`

- Include `provider_reply`, `provider_replied_at` in public review serializers / payload (`vehicle_reviews_payload` / `bus_trip_reviews_payload`).
- Actions (owner of listing/trip only):
  - `POST /api/transport/vehicles/{id}/reviews/{review_id}/reply/` body `{ "body": "..." }`
  - `POST /api/transport/bus/trips/{id}/reviews/{review_id}/reply/`
- Overwrite allowed (edit reply); set `provider_replied_at` on write.
- 403 if not owner; 404 if review not on that listing/trip.

**Frontend**

- `useProviderReviews.ts`: map `provider_reply` → `response`; `needsReply = !provider_reply` for Transport rows; keep stable review `id` from API (not index-based).
- `ProviderReviews.tsx`: reply composer for rows with `needsReply` (Transport first; Stay/Food remain read-only unless reply fields appear later).
- Traveller surfaces: if `ListingReviews` / `GuestReviewCard` can show host response, pass through; otherwise show reply only in provider inbox + optionally detail review list (minimal: provider inbox + include in review JSON for future UI).

---

## Phase 3 — Draft / publish UX

**Backend**

- Provider create serializers already expose `is_active`; ensure create without explicit flag → `False`.
- Public ViewSets already filter `is_active=True` — verify after default change.
- Provider list still returns drafts (owner sees unpublished).

**Frontend**

- `VehicleListingForm` / `BusTripListingForm` / cards: labels **Draft** vs **Published** (replace Live/Hidden where that meant publish).
- Keep completeness badge as **“Needs info · N%”** — never call it “Draft %”.
- `TransportAdmin`: publish/unpublish toggle remains `is_active`; empty catalog copy when only drafts exist.

---

## Phase 4 — Saves (backend + frontend)

**Backend** (copy Food/Stay)

- On `VehicleRentalListingViewSet` / `BusTripViewSet`:
  - `POST …/vehicles/{id}/save/` → `{ saved, saves_count }`
  - `GET …/vehicles/saved/`
  - Same for bus trips: `…/bus/trips/{id}/save/`, `…/bus/trips/saved/`
- Annotate list/detail: `saved_by_me`, `saves_count` when authenticated.
- Tests: `tests_transport_saves.py` (mirror `tests_food_saves.py`).

**Frontend**

- Hook `useTransportSave.ts` (or shared engagement) modeled on `useStaySave` / `useFoodEngagement`.
- Wire `VehicleDetail` / `BusTripDetail` / list cards; remove `TransportCardsEnhancer` localStorage keys (optional one-time migrate like Stay).
- `UserDashboard`: saved transport section (`saved-vehicles` / `saved-trips` queries) if stays/food already have saved tabs — match that pattern.

**Mocks:** `mockApi.ts` save maps for vehicles/trips.

---

## Phase 5 — Seat preference

**Backend**

- Accept `seat_preference` on seat reservation create / `_create_group` (apply same preference to all seats in the group, or first row only — apply to every created `SeatReservation` in the batch).
- Include field on traveller + provider booking serializers (read).

**Frontend**

- `BusTripDetail.tsx` booking POST: include `seat_preference: seatPref` alongside `seat_numbers`.
- Provider seat booking inbox: show preference if present.

---

## Phase 6 — Provider analytics

**New files**

- `backend/transport/analytics_services.py` → `provider_transport_analytics(*, owner_ids, days)`
- `backend/transport/analytics_views.py` → `TransportProviderAnalyticsView`
- URL: `GET /api/transport/provider-analytics/?days=30`

**Metrics (Food/Stay-shaped)**

- Window: `days`
- Totals: rental bookings, seat reservations (exclude cancelled), revenue from confirmed (+ paid if useful), saves, reviews
- Per-listing rows (vehicles + trips): bookings, revenue, saves_count, rating_avg, reviews_count
- Promo impressions/clicks if transport targets exist in promotions (include when target type supports transport; else omit cleanly)

**Frontend**

- Hook + monetization section on `TransportAdmin` (replace pure client-side revenue sum where possible; keep attention/todo lists).
- Mock stub in `mockApi.ts`.
- Tests: `tests_transport_analytics.py`.

---

## Implementation order

1. Migration (all model fields in one migration)
2. Draft default + provider/public verify
3. Saves API + frontend + mocks
4. Seat preference persist + POST
5. Analytics service + TransportAdmin
6. Review reply API + ProviderReviews composer
7. Tests for each vertical slice

Saves before analytics so `saves_count` is real. Reply can run in parallel with analytics after migration.

---

## Critical files

| Area | Paths |
|------|--------|
| Models | `backend/transport/models.py`, migration `0011_*` |
| Reviews | `review_serializers.py`, `review_services.py`, `views.py` |
| Saves | `serializers.py`, `views.py`, `urls.py` |
| Analytics | `analytics_services.py`, `analytics_views.py`, `urls.py` |
| Seat | `serializers.py`, `views.py` (`_create_group`) |
| Provider UI | `TransportAdmin.tsx`, listing cards/forms, `ProviderReviews.tsx`, `useProviderReviews.ts` |
| Traveller UI | `VehicleDetail.tsx`, `BusTripDetail.tsx`, `BusTripReserveCard.tsx`, `TransportCardsEnhancer.tsx`, dashboard saved |
| Mocks | `frontend/src/mocks/mockApi.ts` |
| Tests | `tests_transport_saves.py`, `tests_transport_analytics.py`, extend `tests_transport_social.py` / provider tests |

---

## Out of scope

- Stay / Food / Guide review reply (same pattern later if desired)
- Separate `publication_status` enum (avoid dual flags; Food-style is enough)
- Transport likes (saves only unless product asks)
- Real payment rails (mock pay stays as-is)
- Seat map auto-allocate from window/aisle (preference is stored metadata; picker remains explicit seats)

---

## Verification

1. **Draft:** create vehicle/trip → appears Draft in admin, absent from public `/api/transport/vehicles/` until `is_active=true`.
2. **Saves:** toggle on detail → `saved: true`; `GET …/saved/` returns it; survives refresh (Django, `VITE_USE_MOCKS=false`).
3. **Seat pref:** book with Window → reservation row / provider inbox shows `window`.
4. **Analytics:** `GET /api/transport/provider-analytics/?days=30` returns totals + rows; TransportAdmin reflects API.
5. **Reply:** traveller leaves review → provider posts reply → review payload includes `provider_reply`; ProviderReviews “Needs response” clears.
6. **Tests:** `python manage.py test transport.tests_transport_saves transport.tests_transport_analytics transport.tests_transport_social` (plus provider draft create assertion).
