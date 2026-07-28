# Remove Host Highlights from stays

## Objective

Remove the Host Highlights feature from the stays experience in both places requested by the user:

1. The public stay-detail page.
2. Stay Admin/provider stay management.

This is a stay-specific feature removal. Do not remove or change Highlights used by food, guides, transport, journeys, or other verticals.

## Public stay-detail requirements

- Remove the entire Host Highlights section from `AccommodationDetailView`.
- Remove all stay-detail imports, state/computation, props, and owner-management callbacks that exist only for Host Highlights.
- Remove the provider deep link from `AccommodationDetail.tsx` (`tab=highlights&listing=...`) and the related `manageHighlightsHref` prop.
- Keep the surrounding order clean: Why stay here should flow directly into Verified Delvers.
- Remove stay-detail CSS that only styles Host Highlights if it is now unused.

## Stay Admin requirements

- Remove the “Host Highlights” tab from `StaysAdmin`.
- Remove the StayHighlightsPanel rendering and import.
- Remove per-listing “Host Highlights” management buttons/callbacks from StayListingCard and StaysAdmin.
- Remove Host Highlights from stay completion/module-status labels and any stay-admin guidance text.
- If a stale URL arrives with `?tab=highlights` or a listing-specific highlights deep link, safely fall back to the main stays/listings tab rather than rendering a blank state.
- Remove/update stay-specific provider analytics copy that directs users to manage Host Highlights in Stay Admin.

## Code cleanup

- Remove the stay-only `StayHighlightsPanel` export and component file if no references remain.
- Remove stay-only highlight utilities such as `stayStoriesUtils.ts` only if they become unused.
- Do not delete persisted backend/API fields or user data in this task. This is a frontend feature removal, not a destructive data migration.
- Do not remove shared generic highlight infrastructure used by other verticals.
- Preserve unrelated worktree changes.

## Design and content behavior

- Preserve the current ivory/charcoal/violet stay-detail design.
- Do not otherwise redesign the public page or Stay Admin.
- No new imagery or replacement section is needed.

## Validation

- Search the frontend for remaining stay-specific “Host Highlights”, `tab=highlights`, and `manageHighlightsHref` references.
- Run targeted ESLint on changed TSX files.
- Run `git diff --check`.
- Report exact changed/deleted files and any intentionally retained generic highlight infrastructure.
