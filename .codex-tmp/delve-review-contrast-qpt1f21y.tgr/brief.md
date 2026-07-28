# Stay-detail review contrast fix

## Objective

Fix the unreadable white Reviews heading and rating summary shown on the warm ivory Verified Delvers surface. This is a surgical contrast correction in the existing stay-detail design; do not change layout, spacing, content order, or component behavior.

## Evidence

The user screenshot shows “Reviews”, the star, “5.0”, and “1 review” rendered nearly white on an ivory background.

## Requirements

- Trace the inherited dark-theme review selectors and override the complete review header/summary cluster within `.acc-detail-page`.
- Use the existing Phase 4 palette:
  - charcoal `#292621` for headings, rating value, and primary review text;
  - muted charcoal `#625d55` for counts/secondary labels;
  - DELVE violet `#7c3aed` only where an accent is appropriate;
  - a warm gold may remain only for semantic rating stars if that is already the review convention.
- Ensure readable contrast for the Reviews title, star icon, numeric rating, review count, reviewer name/place/body, empty state, and “See all” control.
- Cover hover/focus states so no white-on-ivory regression remains.
- Keep changes limited to `frontend/src/components/accommodation/accommodation-detail.css` unless a selector cannot be fixed safely without a tiny component change.
- Do not alter any unrelated user work.

## Typography and aesthetic

Preserve the existing Syne major-heading / DM Sans body typography and quiet ivory/charcoal/violet hospitality direction.

## Images

No image changes.

## Validation

Run `git diff --check`. If a TSX file changes, run targeted ESLint for that file. Report exact selectors/files changed.
