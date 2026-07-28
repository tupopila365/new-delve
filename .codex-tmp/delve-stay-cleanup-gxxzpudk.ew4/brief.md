# DELVE stay-detail cleanup — approved iteration

## Objective

Refine the existing `/accommodation/:id` page using the user-approved discussion. The current page is too narrow on desktop, repeats actions and information, nests too many bordered cards, and gives weak visual hierarchy. Make it calmer, wider, clearer, and booking-led without losing DELVE's local character.

This is an in-place application edit. Preserve unrelated worktree changes and existing data/auth/booking behavior.

## Primary files

- `C:\Users\kauna\Desktop\New Delve\frontend\src\components\accommodation\AccommodationDetailView.tsx`
- `C:\Users\kauna\Desktop\New Delve\frontend\src\components\accommodation\AccommodationRoomBooking.tsx`
- `C:\Users\kauna\Desktop\New Delve\frontend\src\components\accommodation\accommodation-detail.css`
- Shared design tokens: `C:\Users\kauna\Desktop\New Delve\frontend\src\index.css`

Use supporting stay/listing files only when necessary.

## Approved action cleanup

- Remove the heart/like action from the stay-detail UI entirely. Do not change backend like behavior.
- Keep exactly one Share action: the gallery overlay action.
- Keep exactly one Save action: the gallery overlay bookmark.
- Remove the lower action strip below the host/title area.
- Do not show duplicate lower bookmark/share actions.
- Move Directions into the Location disclosure/card rather than the header action strip.
- Preserve reporting/safety capability but move Report beside the host content or another quiet secondary location; it must not compete with Message.
- Keep Message near the host row, but visually secondary rather than a dominant booking CTA.

## Information cleanup

- Title area: property type, name, location, verified rating.
- Secondary host row underneath.
- Remove duplicated facts: no price fact when price is in booking; no region fact when location is beside the title; no second rating fact when verified rating is beside the title.
- Facts should retain only useful accommodation capacity details such as guests and bedrooms.
- Verification badges should remain small and subordinate.

## Responsive structure

- Widen the desktop ivory canvas to approximately 1080–1180px.
- Gallery remains full-width at the top.
- Below identity/host, use a desktop two-column composition:
  - Main column: Rooms & rates, Why stay here, Host Highlights, Verified Delvers, disclosures.
  - Right column: compact booking panel.
- Booking panel can remain visible in the first desktop viewport, but do not make a tall full-width ledger sticky over content.
- Mobile returns to a single column with booking immediately after identity/host and before Rooms & rates.
- Preserve the mobile bottom booking bar, but it should contain price and one clear CTA only.

## Booking panel

- Remove the visible “Trip ledger” label and “Request this room” micro-label.
- Heading: “Plan your stay.”
- Clearly show selected room and nightly price.
- Compact fields: Dates and Guests.
- Initial date wording: “Add dates.”
- After dates exist: “Edit dates.”
- Initial CTA: “Check availability” (not “Select dates”).
- When availability/booking state permits, retain the existing request-to-book behavior.
- Continue to show honest availability and totals only from real booking calculations. Before dates, total may read “Add dates”; never invent a number.
- Compress Deals & discounts into a subtle secondary disclosure/link within the booking panel. Avoid a large nested bordered box and avoid navy/blue pills; use only violet/neutral treatments.
- Reduce helper-copy volume and nested surfaces.

## Content and styling improvements

- Aesthetic: quiet editorial hospitality / field journal.
- Warm ivory and bone surfaces, charcoal text, hairline neutral borders, one DELVE violet accent family.
- No coral, navy, gradients, or decorative color noise.
- Use Syne only for the page title and major section headings; DM Sans for controls, metadata, and body copy.
- Use one consistent radius system and fewer cards. Avoid card-inside-card presentation.
- Room cards should fill the main column in a balanced two-column grid on desktop and a usable horizontal or stacked mobile layout. Keep one obvious selection control; “View room” may remain a quiet text link.
- “Why stay here” should be an open editorial section, not another heavy card.
- Host Highlights should not leave a large blank area around a tiny/broken media tile. Use a compact, properly sized layout and suppress unusable empty presentation.
- Verified Delvers needs strong text contrast and compact moments/review composition; remove oversized blank areas.
- Disclosures remain native accessible details/summary rows with clear focus and expanded states.
- Photography supplies nearly all non-violet color.

## Content order

1. Gallery with Back, Share, Save.
2. Name, location, verified rating.
3. Short host row with secondary Message.
4. Desktop: main/booking split. Mobile: booking first.
5. Rooms & rates.
6. Why stay here.
7. Host Highlights.
8. Verified Delvers.
9. Amenities, Rules, Location, Host, FAQ disclosures.

## Image needs

No new images. Reuse existing listing, room, story, host, and review media. Do not use external image services.

## Validation

- Keep the implementation focused.
- Run targeted ESLint for modified TSX files and `git diff --check`.
- The repository-wide typecheck has known unrelated failures; report only whether new errors appear in modified files if it is run.
- Provide exact changed files and any remaining preview limitation.
