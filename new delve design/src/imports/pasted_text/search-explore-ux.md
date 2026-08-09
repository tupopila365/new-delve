Create the Search & Explore experience for the Delve Traveler app.

MANDATORY COMPONENT RULE

Before designing the final screens:

1. Review the existing Delve foundations and components.
2. Reuse existing components wherever their anatomy and behavior match.
3. Create missing components as reusable Auto Layout component sets.
4. Add variants or properties instead of duplicating components.
5. Build every final screen from component instances.
6. Do not detach components in final frames.
7. Bind colors, spacing, typography, radius, borders, and states to semantic variables.
8. Every new component must support Traveler Light, Traveler Dark, desktop, and mobile.
9. Add loading, empty, error, disabled, focus, selected, and long-content variants.
10. Place all new components on the existing `02 Components` Figma page before using them in final screens.

PURPOSE

Search & Explore helps travelers find:

- Places
- Deals
- Stays
- Road transport
- Air transport
- Water transport
- Food & drink
- Activities
- Events
- Guides
- Shops
- Journeys
- Delvers posts
- Local questions
- Businesses

Use this page heading:

“Find your next experience.”

Supporting copy:

“Search places, services, transport, deals, and journeys across Delve.”

Search must work for a broad query such as:

- Swakopmund
- Weekend near Windhoek
- Cheap transport to Walvis Bay
- Flights to Cape Town
- Ferry or boat transfer
- Family stay
- Local food
- Airport transfer
- Community ride
- Things to do this weekend

Do not make users select a category before searching.

SURFACE MODES

Create:

- Traveler / Light
- Traveler / Dark
- Desktop 1440px
- Tablet 1024px
- Mobile 390px

Theme changes must not reset the query, selected filters, destination, results, scroll position, or saved items.

REUSE EXISTING COMPONENTS

Reuse these components from Home and Transport:

- Traveler header
- Mobile header
- Mobile bottom navigation
- Theme control
- Destination control
- Search input
- Button
- Icon button
- Save button
- Filter chip
- Mood chip
- Section header
- Responsive rail
- Base card
- Service card
- Deal card
- Transport card
- Journey card
- Delvers card
- Place card
- Business card
- Price
- Rating
- Verification label
- Sponsored disclosure
- Skeleton
- Empty state
- Error state
- Offline state
- Dialog
- Drawer
- Bottom sheet

If an existing component needs a search-specific property, extend it instead of creating a duplicate.

NEW REUSABLE COMPONENTS TO BUILD

Create these components on the `02 Components` page:

SEARCH COMPONENTS

- `Search/Global search`
- `Search/Autocomplete panel`
- `Search/Suggestion row`
- `Search/Recent search`
- `Search/Trending search`
- `Search/Query correction`
- `Search/Search history item`
- `Search/Clear history action`
- `Search/Voice action placeholder` only if supported
- `Search/Location suggestion`

Global Search properties:

- Empty
- Typing
- Loading suggestions
- Suggestions available
- No suggestions
- Error
- Focused
- Desktop
- Mobile
- Light
- Dark

FILTER COMPONENTS

- `Search/Filter bar`
- `Search/Active filter`
- `Search/Filter group`
- `Search/Filter drawer`
- `Search/Filter bottom sheet`
- `Search/Sort control`
- `Search/Price range`
- `Search/Date filter`
- `Search/Rating filter`
- `Search/Availability filter`
- `Search/Transport mode filter`
- `Search/Deal filter`
- `Search/Accessibility filter`
- `Search/Clear filters`

RESULT COMPONENTS

- `Search/Results header`
- `Search/Results count`
- `Search/Result type tabs`
- `Search/Result group`
- `Search/Result row`
- `Search/Result card`
- `Search/Recommended alternative`
- `Search/Map toggle`
- `Search/List toggle`
- `Search/Pagination`
- `Search/Load more`
- `Search/Partial error`

Result Type tabs:

- All
- Deals
- Places
- Stays
- Transport
- Food
- Activities
- Events
- Guides
- Shops
- Journeys
- Delvers

Create responsive behavior so the tabs scroll horizontally on compact screens.

SEARCH LANDING PAGE

Before the user searches, show:

1. Traveler header
2. Main search field
3. Active destination
4. Recent searches
5. Suggested destinations
6. Explore by service
7. Popular searches
8. Deals near the active destination
9. Trending Journeys
10. Useful Transport shortcuts
11. From Delvers
12. Mobile bottom navigation

Use Home components wherever possible.

AUTOCOMPLETE EXPERIENCE

When a user types, group suggestions by:

- Places
- Deals
- Services
- Transport routes
- Businesses
- Journeys
- Delvers creators
- Recent searches

Every suggestion includes:

- Icon or image
- Primary label
- Secondary context
- Result type
- Destination where useful
- Keyboard-selected state

Examples:

- Swakopmund — Place
- Windhoek to Walvis Bay — Transport route
- Airport transfer in Windhoek — Transport
- Weekend coast deals — Deals
- Desert roads to the coast — Journey
- Etosha Horizon Safaris — Business

Support:

- Keyboard arrows
- Enter to select
- Escape to close
- Clear search
- Screen-reader result count
- No-suggestion state
- Corrected query suggestion

SEARCH RESULTS PAGE

Required order:

1. Traveler header
2. Search field with current query
3. Active destination
4. Result type tabs
5. Results count and explanation
6. Active filters
7. Sort control
8. Results
9. Related or alternative searches
10. Pagination or Load more
11. Footer or mobile navigation

For a mixed query, prioritize relevance while preserving category diversity.

Do not allow one business, category, creator, or sponsor to dominate the first results.

DEALS IN SEARCH

Deals must be a first-class result type.

Deal results show:

- Deal title
- Service type
- Business
- Destination
- Current price or saving
- Currency
- Price unit
- Eligibility
- Availability
- Expiry
- Verification context
- Full terms link
- Save action
- Claim or booking action

Sponsored deals must remain labeled.

TRANSPORT IN SEARCH

Transport results must show:

- Road, Air, or Water
- Exact transport mode
- Operator, business, host, or driver
- Origin and destination
- Date and time
- Duration
- Availability
- Seats or passenger capacity
- Luggage
- Price and currency
- Price basis
- Verification scope
- Primary action

Transport filters:

Road:

- Car rental
- Community ride
- Private driver
- Bus or minibus
- Shuttle
- Airport transfer

Air:

- Scheduled flight
- Regional flight
- Charter
- Air taxi
- Helicopter transfer

Water:

- Ferry
- Water taxi
- Passenger boat
- Private boat transfer
- Charter

Never hide the price unit. Keep per day, per seat, per traveler, per transfer, and total charter prices distinct.

FILTERS

Common filters:

- Destination
- Dates
- Price
- Rating
- Available now
- Deals available
- Verified
- Accessibility
- Open now where supported
- Free cancellation where confirmed

Transport filters:

- Road, Air, or Water
- Exact mode
- Origin
- Destination
- Departure time
- Seats
- Luggage
- Direct or stops
- Private or shared

Stay filters:

- Property type
- Guests
- Rooms
- Price per night
- Amenities

Food filters:

- Cuisine
- Dietary support
- Price level
- Open now
- Reservation support

Activity and event filters:

- Date
- Duration
- Age suitability
- Indoor or outdoor
- Price

Only show a filter when the backend supplies reliable data for it.

SORT OPTIONS

Create:

- Recommended
- Price low to high
- Rating
- Most reviewed
- Soonest departure
- Nearest
- Newest
- Best deal

Only display sorting options that make sense for the selected result type.

RESULT CARD SYSTEM

Build all search result cards from `Card/Base`.

Use shared slots:

- Media
- Type label
- Title
- Supporting context
- Location or route
- Price
- Rating
- Verification
- Availability
- Disclosure
- Save
- Primary action

Specialized results may add mode-specific information without breaking the shared card structure.

MAP AND LIST

Create a List/Map toggle only for results with verified coordinate data.

Map results must:

- Synchronize selection with result cards
- Use accessible numbered markers
- Provide a complete list alternative
- Work in Light and Dark themes
- Avoid hiding prices or disclosures
- Never be the only way to understand results

Label Map as requiring backend coordinates where unavailable.

RECOMMENDATION EXPLANATIONS

Show short explanations such as:

- Near Swakopmund
- Matches your dates
- Good value this weekend
- Because you saved coast trips
- Available for four travelers
- Similar to your search
- Broader-region result

Do not expose private profile attributes.

STATES TO DESIGN

Create complete frames and component variants for:

- Search landing
- Typing
- Suggestions loading
- Suggestions ready
- No suggestions
- Results loading
- Mixed results
- Category results
- No results
- Corrected query
- Broader-area results
- Partial category failure
- Full error
- Offline cached results
- Location permission denied
- Signed-out save attempt
- Empty destination
- Price changed
- Availability changed
- Sold out
- Sponsored result
- Permission-restricted result

NO RESULTS EXPERIENCE

Preserve the user’s query and filters.

Show:

- “We couldn’t find an exact match.”
- Edit destination
- Change dates
- Clear selected filters
- Search a broader area
- Try another transport mode
- View nearby deals
- Explore popular categories

Do not replace the user’s query without explanation.

BACKEND-READY DATA

Use typed mock data and a replaceable search-service interface.

Do not invent real API endpoint URLs.

Create a normalized `SearchResult` containing:

- id
- resultType
- serviceCategory
- title
- subtitle
- destination
- image
- price
- currency
- priceBasis
- rating
- reviewCount
- verification
- availability
- sponsored
- explanation
- detailPath

Create specialized extensions for:

- DealSearchResult
- PlaceSearchResult
- ServiceSearchResult
- TransportSearchResult
- JourneySearchResult
- DelversSearchResult
- BusinessSearchResult

Create search request data containing:

- query
- destination
- dates
- resultType
- filters
- sort
- page
- pageSize

The backend remains authoritative for:

- Search results
- Ranking
- Availability
- Price
- Currency
- Verification
- Deal eligibility
- Sponsored status
- Privacy
- Content visibility
- Coordinates
- Booking state
- Transport seats
- Result counts

Support independent category failures so one broken result source does not remove healthy search results.

FIGMA FRAMES

Create:

- Search landing — Desktop Light
- Search landing — Desktop Dark
- Search landing — Mobile Light
- Search landing — Mobile Dark
- Autocomplete — Desktop
- Autocomplete — Mobile
- Mixed results — Desktop Light
- Mixed results — Desktop Dark
- Mixed results — Mobile Light
- Mixed results — Mobile Dark
- Deals results
- Transport results
- Places results
- Journeys results
- Delvers results
- Filter drawer
- Mobile filter sheet
- Map and List comparison
- Loading
- No suggestions
- No results
- Corrected query
- Partial failure
- Offline
- Full error

PROTOTYPE

Prototype:

- Open Search from Home
- Type a query
- Navigate suggestions with keyboard
- Select a suggestion
- Change destination
- Change result type
- Apply filters
- Remove active filters
- Change sorting
- Open filter sheet
- Switch List and Map
- Save a result
- Handle signed-out save
- Open a Deal
- Open a Transport result
- Open a Journey
- Open a Delvers result
- Load more results
- Retry a failed category
- Switch Light and Dark themes

HANDOFF

Add a Search & Explore section to the existing Backend Handoff page.

For every search section document:

- Component
- Required data
- Existing or target backend capability
- Query parameters
- Loading behavior
- Empty behavior
- Error behavior
- Permission behavior
- Analytics intent
- Cache and refresh behavior

FINAL ACCEPTANCE

The Search & Explore screens must:

- Be assembled entirely from reusable components
- Reuse Home and Transport components
- Add missing components to the shared component library
- Support Traveler Light and Dark
- Work at 1440px, 1024px, and 390px
- Show complete loading, empty, error, offline, and signed-out states
- Be ready for backend integration
- Avoid invented API endpoints or unsupported data
- Keep Delve Purple as the primary interaction color
- Make Deals, Road transport, Air transport, and Water transport easy to discover