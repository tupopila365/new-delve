Create the first production-ready page for the Delve Traveler app: the Home page.

PRODUCT PURPOSE

Delve helps travelers discover and organize their whole trip in one place. Users can find stays, transport, food, activities, events, guides, shops, genuine deals, traveler-created Journeys, and visual recommendations from Delvers.

A new visitor must understand what Delve does within five seconds.

Use this main message:

“Discover your whole trip in one place.”

Supporting text:

“Find stays, transport, food, activities, and real deals. See journeys shared by travelers and plan what fits your time and budget.”

Primary actions:

- Search a place
- Explore nearby

Supporting proof:

“Compare services. Find local value. Learn from real traveler experiences.”

Do not use a vague brand-only slogan or require sign-in before discovery.

VISUAL DIRECTION

Use Delve Purple #8C52FF as the main brand color.

Use #5F2FC9 for primary buttons with white text when stronger contrast is required.

Create two complete semantic themes:

1. Traveler Light
   - Canvas: #F4F1EA
   - Main surface: #FFFFFF
   - Subtle surface: #FAF8F4
   - Primary text: #1A1814
   - Muted text: #6F695F
   - Border: #DDD6CA
   - Primary action: #5F2FC9
   - Focus: #8C52FF

2. Traveler Dark
   - Canvas: #0C0A09
   - Navigation: #12100F
   - Main surface: #1B1816
   - Primary text: #FFFAF2
   - Muted text: #B8ADA3
   - Border: rgba(255,250,242,0.14)
   - Primary action: #8C52FF with a contrast-tested text color
   - Focus: #C7ACFF

Add Light, Dark, and System theme options. The two themes must use the same content order, component structure, and behavior.

Do not recolor or invert travel photography in dark mode.

Use:

- Syne for brand and large editorial headings
- DM Sans for interface text
- Lucide outline icons
- Sentence-case labels
- Tabular numerals for prices and ratings
- 44px minimum touch targets
- Visible keyboard focus
- Delve Purple for links, selected controls, primary actions, save actions, and focus

Avoid generic blue SaaS styling, glassmorphism, neon effects, excessive gradients, emoji icons, oversized pills, and tiny travel cards.

RESPONSIVE FRAMES

Create:

- Desktop Home at 1440px
- Tablet Home at 1024px
- Mobile Home at 390px
- Traveler Light and Traveler Dark versions
- Signed-out and signed-in versions

Maximum desktop content width: 1280px.

Use a 12-column layout on desktop. On mobile, use readable single-column content and horizontal card rails that reveal part of the next card.

GLOBAL HEADER

Desktop header must include:

- Delve wordmark
- Active destination
- Search
- Deals
- Transport
- Delvers
- Journeys
- Saved
- Theme control
- Account or Sign in

Mobile header must include:

- Delve wordmark
- Destination control
- Search
- Theme control
- Account avatar or Sign in

Mobile bottom navigation:

- Home
- Search
- Delvers
- Saved
- Account

Show text labels with icons. Do not rely on icons alone.

HOME PAGE ORDER

1. HERO AND DISCOVERY

Show the Delve purpose immediately.

Include:

- Main heading
- Supporting copy
- Active destination or region
- Search a place action
- Explore nearby action
- Mood shortcuts such as Weekend away, Coast, Family, Nature, Easy on the wallet, and Evenings out

The hero must not be so tall that it hides all useful discovery content below the fold.

If using a background image, add a tested overlay or place text on a solid surface so contrast remains accessible in both themes.

2. EXPLORE BY SERVICE

Create reusable category components for:

- Stays
- Deals
- Food & drink
- Activities
- Guides
- Events
- Transport
- Shops
- Journeys
- Delvers
- Ask locals

Transport must clearly lead to car rentals, rides with drivers, community rides, buses/minibuses, and airport transfers.

Every category needs a Lucide icon and a written label.

3. DEALS FOR THIS PLACE

Create a mixed-service deals rail.

Each deal card must show:

- Image
- Deal title
- Service category
- Business
- Destination
- Current price or saving
- Currency and price unit
- Eligibility summary
- Expiry or relevant date
- Verification context
- Save action
- Clear primary action

Example actions:

- Book this rate
- View listing
- View transport
- See full terms

Never show a crossed-out reference price unless it is supplied by backend data.

Clearly label sponsored deals.

4. EASY ON THE WALLET

Show budget-friendly services and Journeys.

Explain why an item appears here with labels such as:

- Under N$ 800
- Good value this weekend
- Includes transport
- Free cancellation
- Local rate available

Do not claim that something is affordable without showing the basis.

5. POPULAR NEARBY

Create a diverse service rail containing different categories rather than only stays.

Possible cards:

- Stay
- Restaurant
- Activity
- Guide
- Event
- Transport
- Shop

Each card must show service type, place, price basis where relevant, rating context, verification, save action, and availability context.

6. FROM DELVERS

Create visual traveler-content cards.

Each card must include:

- Creator identity
- Image or video
- Place
- Caption preview
- Like
- Comments
- Save
- Share
- Verified experience label when supported
- Linked service, deal, or place

Clearly distinguish:

- Organic traveler content
- Business content
- Sponsored content

Business and sponsored content must have persistent labels.

7. JOURNEYS TO BORROW

Create Journey cards containing:

- Cover image
- Journey title
- Creator
- Route
- Duration
- Number of stops
- Transport modes
- Approximate historical budget
- Save action
- View Journey action

Use the label “Historical trip cost” or “What this traveler spent” so the amount is not mistaken for a currently bookable package.

8. TRANSPORT DISCOVERY

Create a focused transport rail with:

- Rent a vehicle
- Private ride with driver
- Community ride
- Bus or minibus
- Airport transfer

Every card must display the transport mode clearly.

Show price units explicitly:

- N$ 700/day
- N$ 240/seat
- N$ 900/transfer

Do not make these prices look directly equivalent.

Display the exact identity type:

- Rental business
- Community ride host
- Private driver/operator
- Bus operator
- Airport-transfer operator

Do not use one generic verification checkmark for all transport trust claims.

9. ASK LOCALS

Show useful local questions.

Each card includes:

- Question
- Place
- Author
- Time
- Answer status
- Accepted-answer preview where available
- View discussion action

Clearly label unanswered questions.

10. TRUST AND LOCAL BOOKING GUIDANCE

Create a short guidance section explaining:

- Verified businesses
- Local and resident rates
- Deal eligibility
- Secure payment
- Transport safety
- Cancellation terms
- How to contact support

Keep this practical and concise.

11. FOOTER

Include:

- About Delve
- Help and support
- Safety
- Accessibility
- Privacy
- Terms
- List your business
- Community guidelines
- Region
- Currency
- Social links

REUSABLE COMPONENTS

Create reusable components with properties and variants for:

- TravelerHeader
- MobileBottomNavigation
- ThemeControl
- HomeDiscoveryHero
- DestinationContext
- SearchBar
- MoodChip
- ServiceShortcut
- DiscoverySection
- HorizontalRail
- DealCard
- ServiceCard
- TransportCard
- DelversCard
- JourneyCard
- LocalQuestionCard
- TrustGuidance
- SaveButton
- RatingSummary
- VerificationLabel
- SponsoredDisclosure
- PriceSummary
- EmptyState
- ErrorState
- SkeletonCard
- InlineMessage

Components must support:

- Light and Dark themes
- Desktop and mobile sizing
- Loading
- Ready
- Empty
- Error
- Offline
- Signed-out
- Disabled
- Selected
- Focused
- Sponsored
- Permission-required states

BACKEND-READY STRUCTURE

Build the interface so it can connect to the existing Delve backend later.

Do not hardcode data directly inside visual components.

Use typed mock-data objects passed through component properties.

Create clear data interfaces for:

- HomePageData
- DestinationContext
- ServiceCategory
- DealSummary
- ServiceSummary
- TransportSummary
- DelversPostSummary
- JourneySummary
- LocalQuestionSummary
- HomePlacement
- UserSummary

Keep mock data in a separate data layer.

Create a replaceable Home data-service interface that can later call the backend. Do not invent real API endpoint URLs.

The Home page should be able to receive independent results for deals, transport, Delvers, Journeys, questions, and service categories. One failed section must not prevent the rest of Home from loading.

The backend must remain authoritative for:

- Availability
- Price
- Currency
- Deal eligibility
- Verification
- Privacy
- Sponsored status
- Booking status
- Payment status
- Transport seats
- Transport documents
- Content visibility

Do not calculate eligibility, verification, payment success, or final availability only in the interface.

Add clear placeholders for:

- Loading each section independently
- Retrying one failed section
- Refreshing destination-aware content
- Signing in and returning to the selected action
- Saving an item optimistically with rollback on failure
- Opening service, deal, Journey, Delvers, and Transport detail routes

HOME STATES TO DESIGN

Create complete frames or component variants for:

- Loading
- Ready
- New visitor
- Signed-in traveler
- No destination selected
- Sparse destination
- No personalized data
- Offline with cached content
- One failed section
- Full-page error
- Signed-out save attempt
- Empty deals
- Empty transport results
- Sponsored placement
- Light theme
- Dark theme

INTERACTIONS

Prototype:

- Change destination
- Search a place
- Explore nearby
- Change theme
- Select a service category
- Save and unsave a card
- Open a deal
- Open Transport
- Open a Journey
- Open a Delvers post
- Sign in with a return path
- Retry a failed section
- Navigate through mobile bottom navigation

ACCESSIBILITY

Annotate:

- Keyboard tab order
- Visible focus states
- Accessible names
- Button pressed and selected states
- Theme-control labels
- Image alternative-text expectations
- Carousel navigation
- Reduced-motion behavior
- Screen-reader announcements for save, loading, retry, and error
- Color contrast in both themes
- Touch-target sizes
- Status labels that never rely on color alone

DELIVERY

Produce:

- Polished Home frames
- Component sets and variants
- Traveler Light and Traveler Dark variables
- Desktop, tablet, and mobile layouts
- Prototype connections
- Backend-ready data annotations
- Loading, empty, error, offline, and signed-out states
- A short handoff page explaining which data is mocked and what must later come from the backend

Do not design Delve Business or Delve Admin screens in this task. Focus only on the Traveler Home page and the reusable Traveler components required by Home.