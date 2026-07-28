# DELVE Phase 2 — Availability-aware stay search

## Objective

Implement the production frontend for DELVE's stay listing page so travellers search with one clear primary control:

**Destination · Dates · Guests**

The target audience is a traveller deciding where to stay. The result page must make availability, remaining inventory, per-night price, and exact selected-date total truthful before the traveller opens a property.

This is an existing React/Vite application. Modify the real application in:

`C:\Users\kauna\Desktop\New Delve\frontend`

Do not create a standalone mockup.

## Existing system references

- Design system: `C:\Users\kauna\Desktop\New Delve\frontend\src\design-system.md`
- Stay list page: `C:\Users\kauna\Desktop\New Delve\frontend\src\pages\AccommodationList.tsx`
- Existing keyword/location search: `C:\Users\kauna\Desktop\New Delve\frontend\src\components\explore\MarketSearchBar.tsx`
- Stay card: `C:\Users\kauna\Desktop\New Delve\frontend\src\components\accommodation\AccommodationListingCard.tsx`
- List styling: `C:\Users\kauna\Desktop\New Delve\frontend\src\components\accommodation\stay-list.css`
- Card styling: `C:\Users\kauna\Desktop\New Delve\frontend\src\components\accommodation\AccommodationListingCard.css`
- Booking utilities/components: `C:\Users\kauna\Desktop\New Delve\frontend\src\components\booking`
- Mock API: `C:\Users\kauna\Desktop\New Delve\frontend\src\mocks\mockApi.ts`

Preserve unrelated existing edits in the workspace.

## Backend contract already implemented

Use:

`GET /api/accommodation/listings/search/?search={destination}&check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=N`

Static filters and `ordering` may be included.

Response:

```ts
type StaySearchResponse = {
  query: {
    destination: string
    check_in: string
    check_out: string
    guests: number
    nights: number
  }
  count: number
  sold_out_count: number
  results: AccommodationCardListing[]
}
```

Each result includes top-level:

```ts
availability_searched: true
available_room_count: number
total_room_count: number
lowest_available_room_price: string
total_price: string
search_nights: number
limited_availability: boolean
sold_out_room_types_count: number
availability_status: 'available' | 'limited'
availability_message: string
```

Only available properties appear in `results`. The backend applies price filters and price ordering to computed available-room prices.

## Interaction and content structure

1. Replace the current keyword-only primary search composition with a calm, unified stay-search bar:
   - Destination field, retaining the useful existing destination/location behavior where practical.
   - Check-in date.
   - Check-out date.
   - Guests selector/input.
   - One coral Search button.
2. Use draft vs applied search state:
   - Do not make availability requests while dates are incomplete.
   - Submit only when both dates are valid and guests are at least 1.
   - Check-in cannot be before today; checkout must be after check-in.
   - Show concise inline validation, not alerts.
3. When a dated search is applied:
   - Call the new `/listings/search/` endpoint and adapt to its envelope.
   - Show a short summary such as “8 available stays · 3 unavailable stays hidden”.
   - Cards show exact total for the selected stay (for example “N$ 2,460 total · 3 nights”).
   - Secondary price is the backend `lowest_available_room_price` (for example “N$ 820/night”).
   - Show `availability_message`; limited inventory must be visually noticeable but not alarmist.
   - Preserve `check_in`, `check_out`, and `guests` in the property link query string.
   - Price sorting must use the availability-aware fields/endpoint ordering.
   - Saved-only mode during a dated search must not fall back to static inventory; filter the dated results by `saved_by_me` or otherwise preserve truthful availability.
4. Before dates are applied:
   - Discovery may continue using the existing plain list endpoint and existing discovery rails.
   - Do not present the static property price as confirmed availability. Use restrained copy such as “Add dates to check availability” on cards.
5. Empty dated search:
   - Explain that no properties are available for those dates/guest count.
   - Offer a clear action to adjust dates, not a generic network-error message.
6. Keep secondary filters available but visually subordinate to the primary search.
7. Update mock API parity for `/api/accommodation/listings/search/`:
   - Validate complete/future date range and guests.
   - Return the response envelope.
   - Exclude sold-out/non-live properties.
   - Compute remaining room units from mock bookings and room quantities.
   - Use room/date pricing where mock data supports it.
   - Include truthful total and limited-availability fields.

## Aesthetic direction

Quiet, confident accommodation marketplace. Warm ivory background, charcoal typography, white/ivory surfaces, one restrained coral action color. Photography provides most of the page's color.

Avoid a colorful dashboard feeling. The primary search should feel like one composed object rather than several unrelated filters. Use fine dividers, generous spacing, and strong information hierarchy.

## Typography direction

Use the application's existing typography and tokens. The heading can retain its editorial travel character, while form labels and availability facts should be compact, highly legible, and functional. Do not introduce new remote fonts.

## Color direction

Follow the existing DELVE tokens in `design-system.md`:

- Warm ivory page background.
- Charcoal primary text and muted secondary text.
- Coral only for the main Search action and essential focus states.
- Nature/success color may be used sparingly for “available”.
- Limited inventory should use a muted warm neutral/amber treatment, not bright red.

## Memorable element

The unified Destination · Dates · Guests bar should be the page's signature: a single calm “trip sentence” that immediately communicates how to search and, after submission, transitions naturally into a concise availability summary.

## Responsive behavior

- Desktop: four-part horizontal composed search object.
- Mobile: a compact stacked or two-row composition with full-width Search button; no clipped labels or horizontal overflow.
- Inputs must have accessible labels, keyboard focus, and useful minimum dates.
- Cards must remain readable at narrow widths and total price must not wrap into ambiguity.

## Image needs

No new imagery is required. Reuse existing listing photography and fallback assets. Do not add external image-service URLs.

## Scope boundaries

- Do not redesign unrelated pages.
- Do not remove existing secondary filters, map/list toggle, Host Highlights, or saving behavior unless required for truthful dated results.
- Do not edit backend files; the backend contract is already implemented.
- Run the most relevant frontend validation available and report any pre-existing failures separately.
