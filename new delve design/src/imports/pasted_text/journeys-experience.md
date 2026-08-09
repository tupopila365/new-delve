Create the complete Journeys experience for the Delve Traveler app.

MANDATORY COMPONENT WORKFLOW

Before creating final Journey screens:

1. Review the existing Delve foundations and component library.
2. Reuse components from Home, Transport, Search, Deals, Service Detail, Booking, Checkout, and Confirmation.
3. Create missing Journey components on the existing `02 Components` page.
4. Use Auto Layout, semantic variables, named layers, component properties, and variants.
5. Extend existing components when their anatomy and behavior match.
6. Do not duplicate or detach components.
7. Assemble every final Journey screen from reusable component instances.
8. Support Traveler Light, Traveler Dark, desktop, tablet, and mobile.
9. Create loading, ready, empty, draft, private, unavailable, processing, offline, and error variants.
10. Keep all content replaceable so Cursor can connect the design to the existing backend.

PURPOSE

Journeys helps travelers:

- Discover real trips shared by other travelers
- Understand routes and stops
- Learn what another traveler spent
- Find transport between places
- Save useful Journeys
- Add booked services to a Journey
- Build their own Journey
- Share photos, highlights, and reflections
- Connect Journeys to Delvers
- Discover active Deals related to a route

Use this page heading:

“What people are travelling”

Supporting copy:

“Discover real routes, useful stops, travel costs, and stories shared by Delvers.”

Primary actions:

- Find a route
- Share your Journey

SURFACE MODES

Create every primary frame in:

- Traveler / Light
- Traveler / Dark
- Desktop 1440px
- Tablet 1024px
- Mobile 390px

Changing themes must not reset:

- Selected discovery mode
- Search
- Destination
- Filters
- Saved state
- Creation progress
- Draft content
- Ordered stops
- Budget entries
- Visibility choice

ROUTES

Use these route concepts:

- `/journeys`
- Journey detail
- Create Journey
- Edit Journey

Cursor must align final detail, create, and edit routes with the existing application router. Do not invent permanent URL patterns.

JOURNEY DISCOVERY PAGE

Required order:

1. Traveler header
2. Journey purpose
3. Find a route search
4. Discovery modes
5. Recent Journey stories
6. Active Journey creators
7. Budget-friendly Journeys
8. Weekend Journeys
9. Destination or route collections
10. Recent and Popular Journey results
11. Share your Journey action
12. Footer or mobile navigation

DISCOVERY MODES

Create reusable tabs:

- For you
- Weekend
- Coast
- Nature
- Budget
- Saved

Create sort options:

- Recommended
- Recent
- Popular
- Lowest historical cost
- Shortest duration
- Most saved

Do not describe a Journey as affordable without showing its historical cost basis.

FIND A ROUTE

Create search fields for:

- Starting place
- Destination
- Countries or regions
- Duration
- Transport mode
- Budget range
- Travel style
- Date or season where available

Suggested searches:

- Windhoek to Swakopmund
- Weekend near the coast
- Road trip through Namibia
- Budget trip to Etosha
- Journey using buses
- Airport to city routes
- Water travel
- Family Journey
- Solo Journey

RECENT JOURNEY STORIES

Create story-style rings using the shared highlight components.

Story sources may be:

- Journey
- Creator
- Destination
- Route
- Stop

Do not make private Journey content visible through story previews.

ACTIVE CREATORS

Show:

- Avatar
- Display name
- Username
- Travel focus
- Recent Journey
- Follow state
- Verification context where applicable

Do not show private account information.

REUSE EXISTING COMPONENTS

Reuse:

- Traveler header
- Mobile header
- Mobile bottom navigation
- Theme control
- Destination control
- Search
- Tabs
- Filter chip
- Filter drawer
- Sort control
- Button
- Icon button
- Save
- Share
- Follow
- Avatar
- Creator identity
- Base card
- Deal card
- Service card
- Transport card
- Place card
- Media gallery
- Rating
- Verification label
- Price
- Price basis
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
- Comments components

NEW JOURNEY COMPONENTS TO BUILD

Create:

- `Journey/Card`
- `Journey/Compact card`
- `Journey/Featured card`
- `Journey/Story ring`
- `Journey/Creator summary`
- `Journey/Route summary`
- `Journey/Route ribbon`
- `Journey/Route map`
- `Journey/Facts`
- `Journey/Transport modes`
- `Journey/Duration`
- `Journey/Stop count`
- `Journey/Budget summary`
- `Journey/Historical cost label`
- `Journey/Visibility label`
- `Journey/Tag`
- `Journey/Engagement`
- `Journey/Detail hero`
- `Journey/Stop card`
- `Journey/Stop connector`
- `Journey/Day section`
- `Journey/Diary entry`
- `Journey/Highlight`
- `Journey/Reflection`
- `Journey/Takeaway`
- `Journey/Budget breakdown`
- `Journey/Budget category`
- `Journey/Linked service`
- `Journey/Active Deal`
- `Journey/Unavailable service`
- `Journey/Comments section`
- `Journey/Related Journeys`
- `Journey/Add booking`
- `Journey/Share to Delvers`
- `Journey/Publish status`

JOURNEY CARD

Every Journey card includes:

- Cover image
- Journey title
- Creator
- Starting place
- Destination
- Route summary
- Duration
- Number of stops
- Transport modes
- Historical trip cost
- Currency
- Travel style
- Save action
- View Journey action
- Visibility where relevant

Card variants:

- Standard
- Featured
- Compact
- Saved
- Own Journey
- Draft
- Private
- Public
- Loading
- Unavailable
- Missing image
- Long route
- Long title
- Light
- Dark
- Desktop
- Mobile

HISTORICAL COST LANGUAGE

Use:

- “What this traveler spent”
- “Historical trip cost”
- “Approximate cost from this Journey”

Do not use:

- “Current package price”
- “Book this entire Journey”
- “Guaranteed trip cost”

Historical Journey costs must remain unchanged when a linked service changes its current price.

JOURNEY DETAIL PAGE

Use this required order:

1. Hero gallery
2. Creator identity
3. Journey title
4. Route
5. Engagement actions
6. Journey facts
7. Route ribbon
8. Along-the-way highlights
9. Day-by-day diary
10. Reflections
11. Budget breakdown
12. Main takeaway
13. Comments
14. More from this creator
15. Similar Journeys

JOURNEY HERO

Show:

- Cover image or gallery
- Journey title
- Starting place and destination
- Creator
- Save
- Share
- Edit for the owner
- Visibility for the owner
- Published date
- Last updated where useful

Do not show Edit controls to visitors.

JOURNEY FACTS

Create reusable facts for:

- Days
- Stops
- Countries or regions
- Party type
- Transport modes
- Historical cost
- Currency
- Travel style
- Season or dates
- Views
- Saves

Avoid overwhelming the header with unnecessary metadata.

ROUTE RIBBON

Show ordered stops clearly.

Each stop contains:

- Stop number
- Place
- Arrival or Journey day
- Duration
- Transport to the next stop
- Short highlight
- Linked service where present

Create:

- Desktop horizontal or mapped route
- Mobile vertical route
- Keyboard-readable ordered list
- Screen-reader alternative
- Missing-location state
- Long-route state

The route must remain understandable without a visual map.

ALONG-THE-WAY HIGHLIGHTS

Show:

- Images or videos
- Place
- Short caption
- Journey day
- Linked service
- Delvers post connection
- Active Deal where relevant

A current Deal must be shown separately from the historical Journey cost.

Use language such as:

“Active Deal available now”

Do not imply that the creator received or used the current Deal unless the Journey data confirms it.

DAY-BY-DAY DIARY

Create:

- Journey day heading
- Date or relative day
- Stops
- Media
- Diary text
- Linked services
- Transport
- Cost entries
- Highlights
- Reflections

Support:

- Day with one stop
- Day with multiple stops
- Travel-only day
- Missing media
- Long text
- Unavailable linked service
- Active Deal
- Offline cached content

REFLECTIONS

Create reusable reflection types:

- What worked
- What surprised me
- What I would change
- Worth the cost
- Travel tip
- Accessibility note
- Safety note
- Local insight

Do not hide critical reflections because a business is linked.

Businesses cannot edit traveler-owned reflections.

BUDGET BREAKDOWN

Create categories for:

- Stays
- Road transport
- Air transport
- Water transport
- Food & drink
- Activities
- Events
- Guides
- Shopping
- Fees
- Other

Show:

- Category
- Historical amount
- Currency
- Notes
- Total
- Per-person amount where supplied

Do not convert currencies without a supported conversion source and recorded rate context.

MAIN TAKEAWAY

Create a visually distinct but concise section:

“What I would tell another traveler”

Support:

- Short takeaway
- Long takeaway
- No takeaway
- Owner editing
- Visitor reading

COMMENTS

Reuse existing comment components.

Support:

- Comment
- Reply
- Thread
- Like
- Creator heart
- Report
- Delete own comment
- Loading
- Empty
- Error
- Signed-out gate

Respect Journey and account privacy.

LINKED SERVICES

Allow Journey stops to link to:

- Stay
- Food venue
- Activity
- Event
- Guide
- Shop
- Car rental
- Community ride
- Private driver
- Bus or minibus
- Airport transfer
- Air transport
- Water transport
- Business
- Deal

Linked service components show:

- Historical Journey context
- Current service availability
- Current price only when retrieved
- Active Deal
- Service unavailable
- Service removed

Do not change historical Journey cost when current price or availability changes.

CREATE JOURNEY FLOW

Create a four-step Journey wizard:

1. Basics
2. Stops
3. Budget
4. Details

Use a reusable wizard shell.

Create components:

- `Journey Form/Wizard shell`
- `Journey Form/Progress`
- `Journey Form/Autosave status`
- `Journey Form/Validation summary`
- `Journey Form/Preview`
- `Journey Form/Publish action`
- `Journey Form/Save draft`

STEP 1: BASICS

Include:

- Journey title
- Summary
- Cover media
- Start date
- End date
- Duration
- Countries or regions
- Party type
- Transport modes
- Travel-style tags
- Visibility

Visibility:

- Public
- Private
- Draft

Only show visibility options supported by the backend.

STEP 2: STOPS

Create:

- Add stop
- Remove stop
- Reorder stop
- Stop number
- Place search
- Arrival day
- Duration
- Transport to next stop
- Linked service
- Highlights
- Notes

Create accessible reorder controls:

- Move up
- Move down
- Position announcement

Do not make drag-and-drop the only reordering method.

Allow links to:

- Existing booking
- Service listing
- Transport result
- Deal
- Place

Do not allow free-form links that bypass Delve’s supported object types.

STEP 3: BUDGET

Create:

- Currency
- Add cost
- Cost category
- Amount
- Per-person or Total
- Journey day
- Linked stop
- Note
- Budget total

Support:

- No budget
- Partial budget
- Complete budget
- Invalid amount
- Unsupported currency
- Multiple cost categories

Use decimal-friendly money presentation.

STEP 4: DETAILS

Create:

- Day-by-day entries
- Media
- Captions
- Highlights
- Reflections
- Main takeaway
- Delvers sharing
- Preview
- Publish

Allow the creator to choose whether a Journey highlight is also shared to Delvers.

Explain that sharing to Delvers creates a linked social entry without transferring Journey ownership.

DRAFT AND AUTOSAVE

Create states:

- Saving
- Saved
- Save failed
- Offline draft
- Conflict detected
- Older version
- Unsaved changes
- Publishing
- Published
- Publish failed

Do not imply autosave exists unless Cursor connects it to supported storage or backend behavior.

Use explicit Save draft when necessary.

EDIT JOURNEY

Create owner-only actions:

- Edit
- Change cover
- Reorder stops
- Update diary
- Update budget
- Change visibility
- Share to Delvers
- Delete Journey

Deletion must:

- Name the Journey
- Explain the consequence
- Require confirmation
- Wait for backend success
- Explain whether linked Delvers posts remain or are removed according to policy

DELVERS INTEGRATION

Create:

- Share whole Journey
- Share one stop
- Share one highlight
- Share one reflection

A Delvers entry must show:

- Journey title
- Linked stop or highlight
- Creator
- Place
- Journey link
- Visibility-compatible content

Private and draft Journeys must never leak into public Delvers feeds, search, story rings, profiles, or related content.

DEALS INTEGRATION

Show an active Deal beside a linked service.

Clearly separate:

- Historical Journey price
- Current service price
- Active Deal
- Deal eligibility
- Deal expiry

Use:

“This Deal is available now and was not necessarily part of the original Journey.”

SAVED JOURNEYS

Create:

- Save
- Saved
- Save loading
- Save failed with rollback
- Signed-out save gate
- Saved Journey updated
- Saved Journey made private
- Saved Journey removed
- Similar Journey alternative

PRIVACY

Support:

- Public
- Private
- Draft
- Removed
- Hidden by moderation
- Unavailable

Apply visibility consistently across:

- Discovery
- Search
- Detail
- Creator profile
- Saved
- Similar Journeys
- Delvers shares
- Linked-service surfaces

BACKEND-READY DATA CONTRACT

Use typed mock data passed through component properties.

Do not invent endpoint URLs.

Create a normalized `JourneySummary` containing:

- id
- title
- summary
- creator
- coverMedia
- startPlace
- endPlace
- countries
- durationDays
- stopCount
- transportModes
- historicalCost
- currency
- partyType
- tags
- visibility
- publishedAt
- updatedAt
- saves
- views
- detailPath

Create `JourneyDetail` containing:

- summary
- media
- stops
- days
- highlights
- reflections
- budget
- takeaway
- comments
- creatorJourneys
- similarJourneys
- linkedServices
- activeDeals
- engagement
- permissions

Create `JourneyStop` containing:

- id
- order
- place
- arrivalDay
- duration
- transportToNext
- notes
- media
- highlights
- linkedObjects
- historicalCosts

Create `JourneyBudgetEntry` containing:

- id
- category
- amount
- currency
- amountType
- day
- stopId
- note

The backend remains authoritative for:

- Journey identity
- Ownership
- Visibility
- Editing permissions
- Ordered stops
- Media state
- Historical costs
- Linked objects
- Current service availability
- Current Deals
- Comments
- Moderation
- Saves
- Engagement
- Publishing status

STATES TO DESIGN

Create:

- Discovery loading
- Discovery ready
- No Journeys
- No route results
- Saved empty
- Detail loading
- Detail unavailable
- Private
- Draft
- Removed
- Offline
- Partial failure
- Media processing
- Media failed
- Service unavailable
- Deal expired
- Create loading
- Draft saving
- Draft saved
- Save failed
- Publishing
- Published
- Publish failed
- Permission restricted
- Full error

FIGMA FRAMES

Create:

- Journey discovery — Desktop Light
- Journey discovery — Desktop Dark
- Journey discovery — Mobile Light
- Journey discovery — Mobile Dark
- For you
- Weekend
- Coast
- Nature
- Budget
- Saved
- Route search
- Journey detail — Desktop Light
- Journey detail — Desktop Dark
- Journey detail — Mobile Light
- Journey detail — Mobile Dark
- Long route
- Active Deal at a stop
- Unavailable linked service
- Comments
- Create Journey — Basics
- Create Journey — Stops
- Create Journey — Budget
- Create Journey — Details
- Journey preview
- Save draft
- Publishing
- Publish failed
- Edit Journey
- Delete confirmation
- Share to Delvers
- Private Journey
- Empty
- Offline
- Full error

PROTOTYPE

Prototype:

- Open Journeys from Home
- Search a route
- Change discovery mode
- Save a Journey
- Open Journey detail
- Navigate route stops
- Open linked service
- Open active Deal
- Read diary entries
- Expand budget
- Add a comment
- Open creator profile
- Start creating a Journey
- Add and reorder stops
- Link a booking or service
- Add budget entries
- Add reflections
- Preview Journey
- Save draft
- Publish
- Share to Delvers
- Change visibility
- Edit Journey
- Switch Light and Dark themes

ACCESSIBILITY

Annotate:

- Heading order
- Keyboard order
- Route reading order
- Stop reorder controls
- Map alternative
- Media controls
- Historical-cost language
- Deal distinction
- Visibility announcements
- Save announcements
- Comment semantics
- Wizard progress
- Validation summary
- Focus after step changes
- Publishing status
- Touch targets
- Reduced motion
- Light and Dark contrast
- Status not dependent on color

BACKEND HANDOFF

Add Journeys to the existing Backend Handoff page.

Document:

- Reused components
- New components
- Required fields
- Existing backend capability
- Target capability
- Ownership
- Visibility
- Route and stop ordering
- Media publishing
- Historical costs
- Linked services
- Deals
- Delvers sharing
- Comments
- Moderation
- Save and engagement behavior
- Draft behavior
- Publishing
- Offline and cache behavior
- Error recovery
- Analytics intent

FINAL ACCEPTANCE

The Journeys experience must:

- Use reusable component instances
- Reuse the existing Delve library
- Add missing Journey components to `02 Components`
- Support discovery, detail, creation, editing, saving, and sharing
- Support Road, Air, and Water transport
- Keep historical costs separate from current prices and Deals
- Protect private and draft Journeys
- Support Traveler Light and Traveler Dark
- Work at 1440px, 1024px, and 390px
- Handle loading, empty, private, processing, offline, and error states
- Be ready for backend integration
- Avoid invented endpoints, prices, availability, permissions, or publishing behavior
- Keep Delve Purple as the primary interaction color