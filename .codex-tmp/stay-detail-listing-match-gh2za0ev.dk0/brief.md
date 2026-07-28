# Stay Detail Visual Redesign — match current stay listing

## Objective

Restyle only the public stay-detail page to match the current stay-listing system: warm cream canvas, white cards, charcoal typography, muted clay accents, and semantic colors used sparingly. Preserve the existing gallery, booking flow, rooms, Verified Delvers, disclosures, responsive order, and all data behavior.

This is an in-place production change in:
`C:\Users\kauna\Desktop\New Delve\frontend`

## Source of truth

- Current listing palette/layout: `frontend/src/components/accommodation/stay-list.css`, especially the “Phase 2: quiet, availability-first marketplace” layer.
- Current listing cards: `frontend/src/components/accommodation/AccommodationListingCard.css`, especially the “Availability-first card treatment” layer.
- Detail structure: `frontend/src/components/accommodation/AccommodationDetailView.tsx`.
- Detail styles to consolidate: `frontend/src/components/accommodation/accommodation-detail.css`.
- Booking base styles: `frontend/src/components/accommodation/accommodation-room.css`.

Preserve unrelated worktree changes. Host Highlights were intentionally removed from stays and must not be reintroduced.

## Required palette

Match the current listing tokens exactly:

- Page canvas: `#f5efe5`
- Primary surfaces: `#fffdf8`
- Primary text: `#292522`
- Secondary text: `#746c66`
- Neutral hairline: `rgba(48, 39, 33, 0.12)`
- Clay accent: `#c96f5e`
- Clay hover: `#b95f50`
- Clay tint: `#fae5df`
- Subtle shadow: `0 10px 28px rgba(52, 39, 29, 0.06)`
- Stronger hover/booking shadow: `0 16px 38px rgba(52, 39, 29, 0.10)`

Green is allowed only for verified/available states; amber/gold only for limited availability and ratings; red only for genuine errors. Remove decorative violet, navy, gradients, coral variants outside the single canonical clay accent, and unrelated colored pills.

## CSS consolidation

`accommodation-detail.css` currently contains multiple historical dark/coral/violet/cleanup layers. Replace them with one coherent stay-detail stylesheet; do not append another override block.

- Preserve structural selectors still used by `AccommodationDetailView`, `AccommodationRoomBooking`, `StayRoomPicker`, `StayHostCard`, reviews, location, and disclosures.
- Delete superseded declarations and duplicate selector generations.
- Scope the theme under `.acc-detail-page` and set the relevant shared booking/listing CSS variables there so `accommodation-room.css` cannot leak dark defaults.
- Set the page/app shell background to the same listing canvas when the detail page is active.
- Keep reduced-motion and responsive rules.

## Layout and component treatment

- Keep the current `1180px` desktop composition: full-width gallery, then main content plus a `340–360px` booking sidebar.
- Keep mobile booking-first ordering and one sticky booking CTA.
- Gallery: 22px radius, neutral fallback surface, charcoal translucent overlay controls, no decorative gradients.
- Identity/host: open canvas, charcoal title, muted metadata, neutral capacity facts. Property type may use a small clay tint. Verification may remain semantic green.
- Booking panel: white surface, 22px radius, subtle border/shadow, clay primary CTA/focus/selected states. Prices are charcoal. Deals remain a quiet neutral disclosure.
- Rooms: match listing card treatment—white surface, 22px radius, subtle shadow, image-led, compact metadata, neutral facts, clay selection state, green/amber availability only.
- “Why stay here”: open editorial section with neutral chips and minimal borders.
- Verified Delvers: neutral white surface with readable charcoal/muted text; gold only for rating stars. Preserve the previous contrast fix.
- Disclosures: simple divider rows, charcoal headings, muted content, clay focus/expanded indicator.
- Mobile bar: warm white surface, charcoal price, clay CTA, no extra colored icons.

Use Syne for the page title and major section headings; DM Sans for controls, metadata, and body content.

## Scope constraints

- Do not modify the stay-listing page or its CSS.
- Do not modify Stay Admin, APIs, backend, data types, or booking calculations.
- Do not change the content order or remove existing stay-detail functionality.
- No new images; reuse listing/gallery/room/host/review media.

## Required validation

- Inspect at 1440px, 1024px, 390px, and 375px.
- Check rooms selected/unselected, deals open/closed, empty/filled dates, availability success/limited/error, reviews present/empty, and missing images.
- Confirm no white-on-cream text and no decorative violet, navy, legacy dark, or extra coral styling remains in the rendered detail.
- Confirm keyboard focus, contrast, touch targets, reduced motion, and mobile booking bar.
- Run targeted ESLint for any changed TSX files and `git diff --check`.
- Report exact changed files, visual screenshots if preview works, and any preview limitation.
