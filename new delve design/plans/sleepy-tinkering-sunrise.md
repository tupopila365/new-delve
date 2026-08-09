# Plan: Search & Explore Page

## Context

The spec in `search-explore-ux.md` defines a full Search & Explore experience for Delve. Currently, clicking "Search" (mobile bottom nav) or "Explore" (desktop left sidebar) calls `setActiveNav` but no route branch handles either — the app silently renders the Home feed. This plan wires both nav items to a new `SearchPage` component that covers the pre-search landing and live search results states.

Both "Search" (mobile) and "Explore" (desktop sidebar) point to the same page — they are the same destination with different nav labels.

---

## What to build

### 1. `src/data/searchData.ts`
Typed mock data and interfaces for the search system.

**Interfaces:**
- `SearchResult` — normalized base: `id, resultType, title, subtitle, destination, image, price, currency, priceBasis, rating, reviewCount, verification, sponsored, explanation`
- `DealSearchResult extends SearchResult` — adds `saving, expiry, category`
- `TransportSearchResult extends SearchResult` — adds `transportGroup, transportMode, operator, origin, departure, duration, seatsLeft, bookingMethod`
- `JourneySearchResult extends SearchResult` — adds `creator, stops, transportModes`
- `DelversSearchResult extends SearchResult` — adds `creator avatar/handle, postType`
- `PlaceSearchResult extends SearchResult` — adds `category, openNow`

**Mock arrays:** ~3–4 items per result type (reusing Unsplash image URLs already used in mockData/transportData).

**Autocomplete suggestions array:** ~8 varied suggestions covering places, transport routes, deals, journeys, and creators.

**Popular searches array:** ~8 short labels.

**Suggested destinations array:** ~5 Namibia destinations with images.

---

### 2. `src/pages/SearchPage.tsx`

Single component that handles both the landing state and results state via a local `query` string state.

#### Pre-search landing (query is empty)
Top to bottom:
1. **Search input** — large, full-width pill with magnifier icon and placeholder "Search places, deals, transport, journeys…". Focuses on mount. Has a clear (×) button when there's text.
2. **Recent searches** — horizontal scroll of pill chips (mock: "Swakopmund", "Airport transfer", "Weekend deals"). Each chip fills the search field on tap.
3. **Suggested destinations** — horizontal scroll rail of image cards (destination name overlay). 5 destinations from `searchData`.
4. **Explore by category** — 3×4 grid of icon+label tiles: Places, Deals, Stays, Transport, Food, Activities, Events, Guides, Shops, Journeys, Delvers, Local Q&A.
5. **Popular searches** — horizontal chip strip from `searchData.popularSearches`.
6. **Deals near you** — reuse the existing deal card visual pattern from home (3 cards in a horizontal scroll rail). Data from `mockData.deals`.
7. **Trending Journeys** — 2 journey cards in a horizontal rail from `mockData.journeys`.
8. **Transport shortcuts** — 3 compact chips: "Windhoek → Swakop", "Airport transfers", "Coastal ferry". Tapping fills search.
9. **From Delvers** — 3 `DelversPostSummary` cards (image + creator + caption).

#### Autocomplete dropdown (query is non-empty, not yet submitted)
Absolutely-positioned panel below the search input showing grouped suggestions from `searchData.autocompleteSuggestions` filtered by query string (client-side substring match on mock data). Groups: Recent · Places · Transport · Deals · Journeys. Each row: icon, primary label, secondary context, type badge. Keyboard: arrows to highlight, Enter to set query + show results, Escape to clear.

#### Results state (query submitted / suggestion selected)
1. **Search input** with current query (editable; pressing ×  returns to landing)
2. **Result type tabs** — horizontal scroll: All · Deals · Places · Transport · Food · Activities · Events · Guides · Journeys · Delvers
3. **Results count** — e.g. "14 results for "Swakopmund""
4. **Active filter chips** — shown inline, each dismissible; "Clear all" at end
5. **Sort control** — dropdown pill: Recommended / Price ↑ / Rating / Most reviewed
6. **Result cards** — mixed grid; each card reuses the visual language from Home/Transport (image, type label chip, title, subtitle, price/rating, save button, primary action). Uses mock data filtered by `activeTab`.
7. **No results state** — message + suggestions (clear filters, broaden area, try transport, view deals)
8. **Load more** button

**State logic (all local):**
```
query: string           // the current text
submitted: boolean      // true = show results
activeTab: ResultType   // 'all' | 'deals' | 'places' | 'transport' | ...
sort: SortOption
activeFilters: string[]
showAutocomplete: boolean
```

---

### 3. Wire into `src/App.tsx`

Add two route branches mirroring the Transport pattern (lines 430–479):

```tsx
if (activeNav === 'Search' || activeNav === 'Explore') {
  return (
    <div …>
      <ShimmerStyle />
      {/* shared header */}
      <div className="max-w-[1280px] mx-auto … flex gap-6">
        {/* left sidebar — identical to Transport branch */}
        <aside className="hidden lg:flex …">…</aside>
        <div className="flex-1 min-w-0">
          <SearchPage />
        </div>
      </div>
      {/* mobile bottom nav */}
    </div>
  )
}
```

The left sidebar correctly highlights "Explore" when `activeNav === 'Explore'` and nothing when `activeNav === 'Search'` (since "Search" is mobile-only).

---

## Files to create / modify

| File | Action |
|---|---|
| `src/data/searchData.ts` | Create — typed mock data |
| `src/pages/SearchPage.tsx` | Create — full Search & Explore page |
| `src/App.tsx` | Modify — add Search/Explore route branch (~40 lines, same pattern as Transport branch at line 430) |

Reuse from existing codebase:
- `mockData.deals`, `mockData.journeys`, `mockData.delversPosts` for landing section content
- `transportResults` for transport search results
- `SectionStates.tsx` — `SectionError`, `SectionEmpty`, `Shimmer` for loading/error/empty states
- CSS custom properties (`--bg`, `--surface`, `--primary`, etc.) and `.scroll-rail` utility already in `index.css`
- Syne + DM Sans font stack already wired
- Group color constants (road `#E05C1A`, air `#3B82F6`, water `#06B6D4`) for transport result badges

---

## Verification

1. Click "Search" on the mobile bottom nav → SearchPage landing renders
2. Click "Explore" on the desktop left sidebar → same SearchPage renders, "Explore" highlighted
3. Type in the search field → autocomplete suggestions appear, keyboard nav works
4. Submit a query (Enter or tap suggestion) → results view with tabs and cards
5. Switch result type tabs → cards filter accordingly
6. Clear query (×) → returns to landing
7. Dark mode → no regressions on either landing or results
8. Mobile (≤1024px): left sidebar hidden, bottom nav visible, result tabs scroll horizontally
