# DELVE Stay Admin + Social Consolidation — Implementation Brief

## Objective

Finish the existing DELVE implementation so the product presents exactly two stay-social concepts:

- **Host Highlights**: provider-controlled media about rooms, facilities, and location.
- **Delvers Moments**: authentic traveller posts attached to completed stays and visibly marked **Verified stay**.

Strengthen the provider Stay Admin into a useful operational workspace using the backend functionality already implemented.

## Audience and visual direction

Audience: independent property owners and small lodging teams who need quick operational confidence, not a generic enterprise dashboard.

Preserve DELVE’s current visual language and frontend conventions: purple/ink palette, rounded editorial surfaces, existing `prov-ui` and `stay-` classes, mobile-first behavior, and the current React/TypeScript architecture. Make the admin feel calm, distinctive, and information-rich. Avoid a generic SaaS template, excessive gradients, decorative hero copy, or disconnected mock data.

No generated raster imagery is needed. Charts should be lightweight SVG/CSS and use real API data.

## Required social changes

1. Rename legacy frontend component/file names that still say “stories” when they mean Host Highlights:
   - `components/HostStoriesRow.tsx` -> Host Highlights equivalent.
   - `components/provider/stays/StayStoriesPanel.tsx` -> Host Highlights equivalent.
   Update imports/exports and visible copy.
2. Keep the compatibility redirect at `/accommodation/stories/new`, but do not expose a separate host-story creation system.
3. Remove dormant `hostStory` / `host_story` frontend composer and publish-queue branches if they are no longer used. Keep general post/highlight functionality intact.
4. Show **Verified stay** on the primary `/delvers` feed card in `pages/DelversSocial.tsx` and in the profile/detail overlay in `components/profile/ProfilePostViewer.tsx` whenever `post.verified_stay` is true. Reuse the badge visual already used by `IgPostCard` or listing moment surfaces.
5. Do not weaken the completed-booking enforcement already implemented server-side and in the composer preflight.

## Stay Admin structure

Enhance `pages/StaysAdmin.tsx` and its existing components:

1. Add a concise operations overview above the tabs:
   - KPI cards for occupancy, revenue, bookings, and views.
   - A 30-day occupancy and revenue chart using `occupancy_revenue_trend`.
   - A room performance comparison using `room_performance`.
   - A prominent “Needs attention” alert for `expiring_requests`, linking to the relevant booking/request.
2. Preserve the existing Listings / Bookings / Host Highlights / Reviews information architecture.
3. Replace read-only listing review fetching with the existing provider review hooks:
   - `hooks/useProviderReviews.ts`
   - provider reply mutation for accommodation reviews.
   Provide inline reply/edit-reply behavior in the Stay Admin Reviews tab.
4. Expand listing readiness from a short summary into a useful preview checklist. Reuse `listingCompleteness()` and show completed/missing items without making cards unwieldy.
5. Type and display the backend’s four exact publication states:
   - `draft` / Draft
   - `pending_verification` / Pending verification
   - `live` / Live
   - `suspended` / Suspended
6. Scope provider listing, booking, and analytics requests to the active Stay business when an active business id exists.

## Calendar and pricing editor

Upgrade `pages/StayAvailabilityPage.tsx` into a real month calendar:

- Month previous/next controls and a seven-column grid.
- Show each date’s base or override price, closed/open status, and booked/available occupancy where it can be derived.
- Merge provider booking data with listing room inventory and override data client-side.
- Clicking/selecting a date should populate the existing editor.
- Support property-wide or room-specific overrides, availability toggle, quantity, custom price, minimum stay, notes, save, and reset.
- Preserve accessibility, clear labels, keyboard-friendly buttons, and responsive behavior.

Backend routes already available:

- `GET /api/accommodation/provider-listings/`
- `GET /api/accommodation/provider-bookings/?business={id}`
- `GET /api/accommodation/provider-analytics/?days=30&business={id}`
- `GET /api/accommodation/provider-listings/{id}/calendar/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`
- `PUT /api/accommodation/provider-listings/{id}/calendar/`

Analytics response additions:

- `occupancy_rate`
- `occupied_room_nights`
- `available_room_nights`
- `occupancy_revenue_trend[]` with `date`, `occupied_room_nights`, `available_room_nights`, `occupancy_rate`, `revenue`
- `room_performance[]` with listing/room identity, units, bookings, booked nights, available room nights, revenue, occupancy rate
- `expiring_requests[]` with booking/listing/guest/status/expiry/minutes remaining

Listing response additions:

- `verification_status`
- `publication_status`
- `publication_status_label`

## Constraints

- Work only in the existing frontend source under `C:\Users\kauna\Desktop\New Delve\frontend\src`.
- Preserve unrelated user changes.
- Follow established hooks, API utilities, and styling conventions.
- Do not introduce a new component library or dependency.
- Keep TypeScript strict enough for the existing build and avoid `any` where a small local type is practical.
- Run targeted lint/build checks for files you change if time allows.
