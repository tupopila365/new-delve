# DELVE stay-detail hierarchy — Phase 4

## Objective

Refine the existing public stay-detail page at `/accommodation/:id` so booking information is immediately visible while DELVE's local, community-led character remains distinctive. This is an in-place production implementation, not a standalone mockup.

## Audience

Travellers comparing and booking Namibian/local stays, especially mobile users who need price, dates, guest count, availability, and total before exploring editorial content.

## Existing application

- React 19 + TypeScript + Vite.
- Main markup: `C:\Users\kauna\Desktop\New Delve\frontend\src\components\accommodation\AccommodationDetailView.tsx`
- Stay styles: `C:\Users\kauna\Desktop\New Delve\frontend\src\components\accommodation\accommodation-detail.css`
- Shared shell: `C:\Users\kauna\Desktop\New Delve\frontend\src\components\journeys\journey-detail.css`
- Global tokens: `C:\Users\kauna\Desktop\New Delve\frontend\src\index.css`
- Existing full booking logic to reuse/adapt: `C:\Users\kauna\Desktop\New Delve\frontend\src\components\accommodation\AccommodationRoomBooking.tsx`
- Existing room picker: `C:\Users\kauna\Desktop\New Delve\frontend\src\components\accommodation\StayRoomPicker.tsx`

Preserve existing data behavior, auth guards, save/like/share/report actions, provider-management links, and deep links. Preserve unrelated user changes.

## Required hierarchy

1. Gallery.
2. Stay name, location, and verified rating. Keep secondary host/action controls subordinate.
3. A compact booking/planning surface with dates, guests, live or clearly pending availability, and total immediately visible. Reuse existing room-booking behavior and URL state where feasible; do not invent fake availability. It may prompt for room selection but the fields/status/price summary must already be visible.
4. Rooms & rates.
5. "Why stay here" containing the description and high-value reasons.
6. Host Highlights.
7. A clearly related "Verified Delvers" area containing Delvers Moments and verified-stay reviews.
8. A compact disclosure group for Amenities, Rules, Location, Host, and FAQ. Use accessible native disclosure semantics and keep FAQ behavior functional. Avoid rendering empty disclosures.

## Aesthetic direction

Quiet field-journal hospitality: warm ivory and bone surfaces, charcoal text, subtle hairline borders, generous but efficient spacing, and exactly one DELVE accent family (use the existing brand violet `#7c3aed` and its transparent tints). Remove the stay page's coral/rosewood and dark-shell styling. Let gallery and listing photography supply almost all other color. Avoid gradients and decorative color noise.

Typography should continue the project's Syne display / DM Sans body pairing. Use strong hierarchy and compact uppercase micro-labels sparingly. Booking information should visually anchor the first viewport without competing with the gallery.

## Responsive behavior

- Desktop: a compact two-column content/booking composition is welcome if it fits the existing shell; the booking surface should be visible without scrolling past editorial sections and may be sticky.
- Mobile: single-column hierarchy in the exact required order. Preserve the sticky booking CTA without duplicating confusing actions.
- Maintain usable focus states, touch targets, semantic headings, and reduced-motion friendliness.

## Memorable element

A restrained "trip ledger" booking panel: calm ivory paper-like surface, clear date/guest cells, an honest availability state, and a bold total—anchored by the single DELVE violet action.

## Image needs

No new images. Reuse real listing/gallery/room imagery already supplied by the application. Do not use external image services.

## Output and validation

Edit the existing application files in place under:
`C:\Users\kauna\Desktop\New Delve\frontend`

Prefer the smallest maintainable change set. Run `npm run typecheck` from `frontend`; run `npm run build` if time permits. Report changed files and how the hierarchy/booking behavior was implemented.
