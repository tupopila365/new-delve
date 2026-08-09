Create the complete Deals experience for the Delve Traveler app.

MANDATORY COMPONENT WORKFLOW

Before designing the final Deals screens:

1. Review the existing Delve foundations and shared component library.
2. Reuse Home, Transport, and Search components wherever possible.
3. Create every missing Deal component on the existing `02 Components` page.
4. Build new components with Auto Layout, semantic variables, named layers, properties, and variants.
5. Extend an existing component when its anatomy is the same.
6. Do not duplicate or detach components.
7. Assemble every final Deals screen from component instances.
8. Support Traveler Light, Traveler Dark, desktop, tablet, and mobile.
9. Add loading, ready, empty, unavailable, expired, error, focused, selected, sponsored, and long-content variants.
10. Do not hardcode colors, spacing, prices, eligibility, or status inside page frames.

PAGE PURPOSE

Deals helps travelers find genuine value across the entire trip.

Use this page heading:

“Find more ways to experience a place for less.”

Supporting copy:

“Compare real deals across stays, transport, food, activities, events, guides, and shops.”

Primary actions:

- Find deals
- Choose a destination

The Deals page must help users understand:

- What the deal includes
- What it costs
- What they save
- Who offers it
- Where it is available
- When it can be used
- Who may qualify
- How to claim or book it
- What restrictions apply

Do not make Deals look like a page filled with promotional banners.

SURFACE MODES

Create every primary frame in:

- Traveler / Light
- Traveler / Dark
- Desktop 1440px
- Tablet 1024px
- Mobile 390px

Theme switching must not reset destination, dates, search, filters, saved deals, eligibility context, or claim progress.

ROUTE

Use `/deals` as the Traveler Deals route.

Do not invent a Deal detail URL structure. Mark the detail route as something Cursor must align with the existing application router.

REUSE EXISTING COMPONENTS

Reuse:

- Traveler header
- Mobile header
- Mobile bottom navigation
- Theme control
- Destination control
- Global search
- Button
- Icon button
- Save button
- Share button
- Filter chip
- Filter drawer
- Mobile filter sheet
- Sort control
- Section header
- Responsive rail
- Base card
- Service card
- Transport card
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
- Sign-in gate
- Toast

NEW DEAL COMPONENTS TO BUILD

Create these reusable component sets:

- `Deal/Card`
- `Deal/Compact card`
- `Deal/Featured card`
- `Deal/Value`
- `Deal/Price`
- `Deal/Savings`
- `Deal/Type label`
- `Deal/Service category`
- `Deal/Eligibility`
- `Deal/Availability`
- `Deal/Expiry`
- `Deal/Trust summary`
- `Deal/Terms summary`
- `Deal/Claim method`
- `Deal/Claim steps`
- `Deal/Restriction list`
- `Deal/Business identity`
- `Deal/Linked service`
- `Deal/Status`
- `Deal/Sponsored disclosure`
- `Deal/Detail hero`
- `Deal/Detail sidebar`
- `Deal/Price breakdown`
- `Deal/Eligibility explanation`
- `Deal/Availability calendar`
- `Deal/Terms panel`
- `Deal/Claim confirmation`
- `Deal/Saved state`
- `Deal/Unavailable state`
- `Deal/Expired state`

DEAL CARD PROPERTIES

Every Deal card must support:

- Light or Dark
- Desktop or Mobile
- Compact or Standard
- Organic or Sponsored
- Saved or Not saved
- Public or Eligibility-based
- Available or Limited
- Scheduled or Active
- Expiring soon
- Expired
- Unavailable
- Loading
- Error
- Missing image
- Long title
- Long business name
- With current price
- With percentage saving
- With fixed saving
- With package price
- With special rate
- Without a reference price

DEAL CATEGORIES

Support deals across:

- Stays
- Car rentals
- Community rides
- Private drivers
- Buses and minibuses
- Airport transfers
- Air transport
- Water transport
- Food & drink
- Activities
- Events
- Guides
- Shops

Transport Deal cards must always show:

- Road, Air, or Water
- Exact transport mode
- Origin and destination where relevant
- Date or availability
- Operator
- Price basis

Examples:

- N$ 700/day
- N$ 240/seat
- N$ 900/transfer
- N$ 2,400/person
- N$ 6,500/charter

Never hide or remove the price basis.

DEAL TYPES

Create reusable presentation for:

- Percentage discount
- Fixed saving
- Special rate
- Local rate
- Resident rate
- Student rate
- Group rate
- Package
- Early booking
- Last minute
- Limited availability
- Free or included extra
- Multi-service bundle

Only show deal types supported by backend data.

Do not infer a deal type from promotional copy.

DEALS LANDING PAGE

Required order:

1. Traveler header
2. Deals purpose and destination search
3. Date or travel-period control
4. Service-category shortcuts
5. Featured deals for the selected place
6. Deals ending soon
7. Easy on the wallet
8. Road, Air, and Water transport deals
9. Stay deals
10. Food and activity deals
11. Journey-related deals
12. New deals
13. Local-rate guidance
14. Trust and pricing guidance
15. Footer or mobile bottom navigation

The first viewport must include:

- Clear Deals purpose
- Destination
- Search
- Category filters
- At least one genuine Deal card
- A visible explanation of price or savings

DEALS SEARCH

Include:

- Destination
- Dates
- Travelers
- Search action

Allow broad queries such as:

- Deals in Swakopmund
- Cheap transport to Walvis Bay
- Weekend stay deals
- Local food offers
- Airport transfer deals
- Flight deals
- Ferry deals
- Family activity offers

CATEGORY SHORTCUTS

Create:

- All deals
- Stays
- Road transport
- Air transport
- Water transport
- Food & drink
- Activities
- Events
- Guides
- Shops

FILTERS

Create reusable filters for:

- Destination
- Dates
- Service category
- Deal type
- Price
- Saving amount
- Saving percentage
- Eligibility
- Available now
- Ending soon
- Verified business
- Free cancellation where confirmed
- Instant booking where supported
- Road, Air, or Water
- Transport mode
- Private or Shared
- One way or Return

Eligibility filters:

- Everyone
- Local
- Resident
- Student
- Age group
- Party size
- Custom eligibility

Only show an eligibility filter if the backend supplies a supported rule.

SORTING

Create:

- Recommended
- Best saving
- Price low to high
- Ending soon
- Newest
- Most saved
- Nearest
- Soonest departure

Only show relevant options for the current result type.

DEAL CARD INFORMATION

Every standard Deal card must include:

- Image
- Deal type
- Deal title
- Business or operator
- Service category
- Destination
- Current price or saving
- Currency
- Price unit
- Eligibility summary
- Availability
- Expiry or book-by date
- Verification context
- Sponsored label where applicable
- Save action
- Primary action

Possible primary actions:

- View deal
- Book this rate
- View listing
- View transport
- Check eligibility
- See full terms
- Message business

Do not use “Claim now” unless the backend supports an actual claim workflow.

PRICE AND SAVINGS RULES

Show:

- Current price
- Currency
- Price basis
- Genuine reference price where available
- Saving amount
- Saving percentage
- Fees where known
- Total where calculable

Never:

- Invent an original price
- Create a crossed-out price without backend evidence
- Calculate savings from incomplete data
- Hide mandatory fees
- Compare incompatible price units
- Use “up to” without a supported maximum
- Present a starting price as a final total

If a reference price is unavailable, show the current special rate without a fake comparison.

ELIGIBILITY

Create clear eligibility presentations for:

- Available to everyone
- May qualify
- Eligible
- Not eligible
- Proof required
- Eligibility unknown
- Sign in to check
- Custom business rule

Use “May qualify” until the backend can confirm the traveler’s eligibility.

The eligibility explanation must show:

- Who the deal is intended for
- What proof may be required
- When proof is checked
- Whether eligibility changes the displayed price
- What happens if the traveler does not qualify

Never expose private profile attributes to a business through the Deal interface.

DEAL DETAIL PAGE

Create one reusable Deal detail template.

Required order:

1. Breadcrumbs
2. Deal media
3. Deal type and value
4. Deal title
5. Business or operator
6. Verification context
7. Destination
8. Current price and savings
9. Price basis
10. Eligibility
11. Availability
12. What is included
13. What is not included
14. How to claim or book
15. Terms and restrictions
16. Cancellation
17. Fees
18. Expiry and travel-use dates
19. Linked service or transport
20. Business information
21. Save and share
22. Similar deals

On desktop, create a sticky Deal summary and action panel.

On mobile, use a sticky bottom action only when it does not hide terms, eligibility, or price context.

DEAL CLAIM OR BOOKING METHODS

Support these backend-controlled methods:

- Direct booking
- Booking request
- Show a code
- Enter a code
- Message business
- Show proof
- External booking
- External ticket
- In-person claim
- Other explicit method

The component must explain the exact method before the user begins.

Do not invent a coupon code, booking provider, external website, or payment flow.

CLAIM FLOW

Create reusable steps for:

1. Review Deal
2. Confirm eligibility
3. Review dates and availability
4. Select linked service or option where required
5. Review price and terms
6. Sign in where required
7. Begin supported booking or claim
8. Confirmation

If the Deal links to Checkout, reuse Checkout entry components rather than designing a separate payment system.

TRANSPORT DEALS

ROAD

Support:

- Rental-car rate
- Community-ride seat offer
- Private-transfer rate
- Bus or minibus seat deal
- Airport-transfer offer

AIR

Support:

- Scheduled-flight fare
- Regional-flight fare
- Charter rate
- Air-taxi offer
- Airport connection package

WATER

Support:

- Ferry fare
- Water-taxi offer
- Passenger-boat rate
- Boat-transfer offer
- Private charter rate

Do not imply live inventory, flight ticketing, flight monitoring, vessel tracking, or operator capability unless supported by the backend or external provider.

SPONSORED DEALS

Sponsored Deals must:

- Keep a persistent “Sponsored” label
- Name the advertiser
- Use the same required price and eligibility clarity
- Follow availability and verification rules
- Never bypass safety or trust requirements
- Never visually imitate an independent traveler recommendation

SAVED DEALS

Create:

- Saved state
- Save loading
- Save successful
- Save failed with rollback
- Signed-out save gate
- Deal expired after being saved
- Deal unavailable after being saved
- Similar active alternatives

STATES TO DESIGN

Create complete Deal states for:

- Loading
- Ready
- No destination
- No results
- Empty category
- Expired
- Scheduled
- Active
- Ending soon
- Limited availability
- Paused
- Unavailable
- Sold out
- Eligibility unknown
- Eligible
- Not eligible
- Proof required
- Price changed
- Terms changed
- Availability changed
- Signed-out
- Offline
- Partial section failure
- Full error
- Sponsored
- External booking handoff

When price, eligibility, terms, or availability changes, interrupt the claim or booking flow and require the user to review the canonical new information.

BACKEND-READY DATA CONTRACT

Use typed mock data passed through component properties.

Do not hardcode Deal information inside visual components and do not invent API endpoint URLs.

Create a normalized `DealSummary` containing:

- id
- sourceType
- dealType
- title
- description
- business
- linkedService
- serviceCategory
- transportGroup
- transportMode
- destination
- image
- currentPrice
- referencePrice
- currency
- priceBasis
- savingAmount
- savingPercentage
- eligibility
- proofRequired
- availability
- startsAt
- endsAt
- bookBy
- useDates
- claimMethod
- terms
- exclusions
- fees
- cancellation
- verification
- sponsored
- status
- updatedAt
- detailPath

Create a complete `DealDetail` extension containing:

- Included items
- Excluded items
- Full terms
- Claim steps
- Linked listing options
- Availability details
- Eligibility explanation
- Price breakdown
- Business details
- Related deals

The backend remains authoritative for:

- Deal existence
- Deal status
- Price
- Reference price
- Currency
- Savings
- Eligibility
- Availability
- Inventory
- Dates
- Terms
- Fees
- Claim method
- Verification
- Sponsored status
- Booking status
- Payment status
- Content visibility

The interface must not silently correct or replace backend Deal values.

FIGMA FRAMES

Create:

- Deals landing — Desktop Light
- Deals landing — Desktop Dark
- Deals landing — Mobile Light
- Deals landing — Mobile Dark
- Deals results — Desktop
- Deals results — Mobile
- Deals filters — Desktop
- Deals filter sheet — Mobile
- Deal detail — Desktop Light
- Deal detail — Desktop Dark
- Deal detail — Mobile Light
- Deal detail — Mobile Dark
- Eligibility explanation
- Claim steps
- Saved deals
- Transport deals
- Sponsored Deal comparison
- Price changed
- Eligibility changed
- Terms changed
- Expired
- Unavailable
- No results
- Loading
- Offline
- Partial failure
- Full error

PROTOTYPE

Prototype:

- Open Deals from Home
- Search a destination
- Change dates
- Select a service category
- Apply and remove filters
- Change sorting
- Open a Deal
- Save and unsave a Deal
- Handle signed-out saving
- Open eligibility explanation
- Open full terms
- Begin claim or booking
- Handle changed price
- Handle changed availability
- Handle expired Deal
- Open linked service
- Open linked Transport
- Handle external booking
- Switch Light and Dark themes
- Retry a failed section

ACCESSIBILITY

Annotate:

- Keyboard order
- Focus states
- Accessible names
- Filter announcements
- Updated result count
- Price and savings reading order
- Currency and price-unit announcements
- Eligibility status
- Expiry and date wording
- Terms access
- Sponsored disclosure
- Save-state announcements
- Error and retry behavior
- Mobile touch targets
- Reduced motion
- Light and Dark contrast
- Status that does not depend on color

BACKEND HANDOFF

Add a Deals section to the existing Backend Handoff page.

Document:

- Component
- Required data
- Current or target backend capability
- Permission requirement
- Eligibility behavior
- Availability behavior
- Price behavior
- Claim method
- Booking relationship
- Loading
- Empty
- Error
- Cache and refresh
- Analytics intent

FINAL ACCEPTANCE

The Deals experience must:

- Be built entirely from reusable components
- Reuse Home, Transport, and Search components
- Add missing Deal components to `02 Components`
- Support Traveler Light and Traveler Dark
- Work at 1440px, 1024px, and 390px
- Make price, savings, eligibility, expiry, and terms understandable
- Cover Road, Air, and Water transport Deals
- Clearly label sponsored content
- Handle loading, empty, expired, unavailable, offline, and error states
- Be ready for backend integration
- Avoid invented endpoints, discounts, eligibility, inventory, or payment behavior
- Keep Delve Purple as the primary interaction color