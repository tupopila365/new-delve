# Restore “From Delvers” and separate verified reviews

## Objective

Restore the visible “From Delvers” community section on the public stay-detail page. Separate traveller moments from verified written reviews so the page distinguishes community character from booking trust.

Host Highlights must remain removed from the public stay detail, Stay Admin, and all previously removed stay-management entry points.

## Required content order

Within the existing main column:

1. Rooms & rates
2. Why stay here
3. From Delvers
4. Verified stay reviews
5. Amenities, Rules, Location, Host, FAQ disclosures

Do not reintroduce Host Highlights between these sections.

## From Delvers

- Render the existing `ListingDelversMoments` content as its own visible section titled exactly “From Delvers”.
- Preserve its “See all” behavior and moment cards/media.
- Keep a compact, warm empty state when no moments exist: travellers can share a moment after a completed stay.
- Do not label these moments as reviews.

## Verified reviews

- Render `ListingReviews` in a separate section titled “Verified stay reviews”.
- Retain the “Completed stays only” trust cue, verified rating, review count, review cards, empty state, and See all behavior.
- Avoid duplicate visible headings such as an outer “Verified stay reviews” plus an inner generic “Reviews”. If necessary, add a safe optional title prop to the shared component while preserving its existing default for all other consumers.
- Keep gold only for rating stars and the current cream/charcoal/clay listing-matched palette everywhere else.

## Styling

- Continue the consolidated stay-detail design in `accommodation-detail.css`.
- From Delvers may be an open editorial/community surface or a restrained white card, but it must be visually distinct from the trust-focused verified reviews card.
- Verified reviews should use the white listing-card surface, neutral border, readable charcoal text, and subtle shadow.
- Preserve all responsive behavior, contrast fixes, focus states, and mobile spacing.

## Scope constraints

- Public stay-detail page only, plus a minimal shared `ListingReviews` prop only if needed to avoid duplicate headings.
- Do not change booking, rooms, gallery, host, disclosures, APIs, data, Stay Admin, or other verticals.
- Do not restore any stay Highlights components, imports, tabs, routes, or CSS.
- No new imagery.

## Validation

- Confirm “From Delvers” and “Verified stay reviews” both render as separate sections.
- Confirm Host Highlights has no stay-detail or Stay Admin references.
- Check populated and empty moments/reviews states.
- Check desktop and mobile spacing/order.
- Run targeted ESLint for changed TSX files and `git diff --check`.
