Create the complete Service & Listing Detail experience for the Delve Traveler app.

MANDATORY COMPONENT WORKFLOW

Before creating final screens:

1. Review the existing Delve foundations and component library.
2. Reuse components from Home, Transport, Search, and Deals.
3. Create missing components on the existing `02 Components` page.
4. Use Auto Layout, semantic variables, named layers, component properties, and variants.
5. Extend existing components when their structure is similar.
6. Do not duplicate or detach components.
7. Assemble every final detail page from component instances.
8. Support Traveler Light, Traveler Dark, desktop, tablet, and mobile.
9. Add loading, ready, unavailable, error, focused, selected, and long-content variants.
10. Do not hardcode data inside final page frames.

PURPOSE

The Service & Listing Detail page helps travelers decide:

- What is being offered?
- Who provides it?
- Where is it?
- When is it available?
- What does it cost?
- Is there a Deal?
- What is included?
- What restrictions apply?
- Can I trust it?
- How do I book, request, reserve, or purchase it?

Create one shared detail-page system with category-specific variants.

SUPPORTED DETAIL TYPES

Create variants for:

- Stay
- Food & drink
- Activity
- Guide
- Event
- Shop product
- Car rental
- Community ride
- Private driver
- Bus or minibus
- Airport transfer
- Air transport
- Water transport

Transport variants must reuse the Transport detail components already created. Do not create a second unrelated Transport system.

SURFACE MODES

Create all primary detail frames in:

- Traveler / Light
- Traveler / Dark
- Desktop 1440px
- Tablet 1024px
- Mobile 390px

Changing themes must not reset:

- Selected dates
- Travelers
- Quantity
- Selected option
- Saved state
- Deal eligibility
- Booking progress
- Open information sections

PAGE ROUTES

Treat detail routes as backend and router-controlled.

Do not invent final route patterns. Add a handoff annotation stating that Cursor must connect each detail variant to the existing Delve routes and stable identifiers.

REUSE EXISTING COMPONENTS

Reuse:

- Traveler header
- Mobile header
- Mobile bottom navigation
- Theme control
- Breadcrumbs
- Back button
- Button
- Icon button
- Save button
- Share button
- Search
- Destination control
- Base card
- Service card
- Deal card
- Transport card
- Business card
- Creator identity
- Price
- Price basis
- Rating
- Verification label
- Sponsored disclosure
- Availability
- Eligibility
- Terms summary
- Skeleton
- Empty state
- Error state
- Offline state
- Dialog
- Drawer
- Bottom sheet
- Sign-in gate
- Toast

NEW SHARED DETAIL COMPONENTS

Create:

- `Detail/Page shell`
- `Detail/Header`
- `Detail/Media gallery`
- `Detail/Media thumbnail`
- `Detail/Media viewer`
- `Detail/Title block`
- `Detail/Category label`
- `Detail/Entity identity`
- `Detail/Verification summary`
- `Detail/Trust panel`
- `Detail/Location summary`
- `Detail/Map preview`
- `Detail/Route summary`
- `Detail/Highlights`
- `Detail/Description`
- `Detail/Read more`
- `Detail/Feature list`
- `Detail/Included list`
- `Detail/Excluded list`
- `Detail/Availability panel`
- `Detail/Option selector`
- `Detail/Date selector`
- `Detail/Traveler selector`
- `Detail/Quantity selector`
- `Detail/Price summary`
- `Detail/Deal callout`
- `Detail/Eligibility callout`
- `Detail/Booking panel`
- `Detail/Sticky mobile action`
- `Detail/Terms panel`
- `Detail/Cancellation panel`
- `Detail/Safety panel`
- `Detail/Accessibility panel`
- `Detail/Reviews summary`
- `Detail/Review card`
- `Detail/Reviews list`
- `Detail/Question card`
- `Detail/Questions list`
- `Detail/Ask question`
- `Detail/Business summary`
- `Detail/Related results`
- `Detail/Unavailable panel`
- `Detail/Changed information alert`

COMMON PAGE ORDER

Use this shared hierarchy:

1. Traveler header
2. Breadcrumbs or mobile back action
3. Media gallery
4. Service category
5. Title
6. Destination or route
7. Rating and review context
8. Business, operator, seller, host, or guide
9. Verification summary
10. Save and share
11. Highlights
12. Description
13. Price
14. Availability
15. Active Deal where applicable
16. Category-specific options
17. What is included
18. What is not included
19. Location, route, or meeting point
20. Terms and cancellation
21. Safety and accessibility
22. Reviews
23. Questions
24. Provider information
25. Similar services
26. Booking, request, reservation, or purchase action

On desktop, use a main content area and a sticky decision panel.

On mobile, use a sticky bottom action only when it does not hide important price, eligibility, terms, or availability information.

PRIMARY ACTIONS

Use an action that matches the actual backend workflow:

- Check availability
- Reserve
- Request booking
- Book now
- Choose a room
- Choose seats
- Request a ride
- Request transfer
- Buy ticket
- Add to cart
- Message business
- External booking

Do not use “Book now” when the backend only supports a request or message.

Do not create a payment action on the detail page unless the supported flow goes directly to Checkout.

MEDIA GALLERY

Create:

- Desktop gallery
- Mobile carousel
- Full-screen viewer
- Image count
- Video support where available
- Keyboard controls
- Swipe controls
- Missing-media fallback
- Loading state
- Failed-media state

Do not crop media in a way that hides important listing, vehicle, aircraft, vessel, room, product, or accessibility information.

STAY VARIANT

Add reusable components for:

- `Stay/Property summary`
- `Stay/Room option`
- `Stay/Amenity list`
- `Stay/House rules`
- `Stay/Check-in summary`
- `Stay/Sleeping arrangement`

Show:

- Property type
- Room options
- Guests
- Bedrooms and beds where relevant
- Amenities
- Check-in and check-out
- Availability
- Price per night
- Number of nights
- Fees
- Total
- Cancellation
- Location
- Host or business

Do not present a starting price as the final stay total.

FOOD & DRINK VARIANT

Add:

- `Food/Cuisine summary`
- `Food/Menu preview`
- `Food/Popular dish`
- `Food/Opening hours`
- `Food/Dietary support`
- `Food/Reservation panel`

Show:

- Cuisine
- Price level
- Opening hours
- Address
- Menu or sample items
- Dietary information
- Reservation support
- Pickup or delivery only when supported
- Business identity
- Reviews

Do not claim allergy safety or dietary certification without verified data.

ACTIVITY VARIANT

Add:

- `Activity/Duration`
- `Activity/Meeting point`
- `Activity/Schedule`
- `Activity/Requirements`
- `Activity/Inclusions`
- `Activity/Participant option`

Show:

- Activity type
- Duration
- Date and time
- Meeting point
- Group size
- Age guidance
- Fitness or skill requirements
- Included items
- Excluded items
- What to bring
- Accessibility where confirmed
- Price per person or group
- Cancellation

GUIDE VARIANT

Add:

- `Guide/Profile summary`
- `Guide/Language list`
- `Guide/Package option`
- `Guide/Availability`
- `Guide/Experience summary`

Show:

- Guide identity
- Profile image
- Languages
- Areas covered
- Experience
- Tour packages
- Duration
- Group size
- Availability
- Price basis
- Verification
- Completed-trip reviews
- Message or booking request

EVENT VARIANT

Add:

- `Event/Date summary`
- `Event/Venue`
- `Event/Ticket option`
- `Event/Schedule`
- `Event/Age guidance`

Show:

- Event title
- Organizer
- Venue
- Date and time
- Doors or check-in time
- Ticket options
- Availability
- Age restrictions
- Accessibility
- Refund or cancellation terms
- Price per ticket
- External ticketing only when supported

SHOP PRODUCT VARIANT

Add:

- `Shop/Product option`
- `Shop/Variant selector`
- `Shop/Stock status`
- `Shop/Quantity selector`
- `Shop/Fulfillment summary`
- `Shop/Seller summary`

Show:

- Product
- Seller
- Images
- Price
- Variants
- Stock
- Quantity
- Pickup, lodge delivery, or shipping where supported
- Delivery or pickup estimate
- Return terms
- Add to cart

Do not show unavailable fulfillment choices.

TRANSPORT VARIANTS

Reuse the existing Transport components for:

- Road transport
- Air transport
- Water transport

Shared Transport detail content:

- Exact transport mode
- Operator, business, driver, or ride host
- Origin and destination
- Departure and arrival
- Duration
- Availability
- Seats or capacity
- Luggage
- Price and price basis
- Verification scope
- Cancellation
- Booking or request action

Road additions:

- Vehicle
- Pickup
- Driver or host
- Route
- Stops
- Seat selection where supported

Air additions:

- Airports
- Flight or charter schedule
- Stops
- Baggage
- Fare basis
- Check-in guidance
- External-provider handoff where required

Water additions:

- Ports, harbor, or jetty
- Boarding time
- Vessel information where permitted
- Luggage
- Passenger or vehicle allowance
- Weather disruption policy

DEAL INTEGRATION

Create a reusable Deal callout that shows:

- Deal type
- Current price
- Reference price where supported
- Saving
- Eligibility
- Availability
- Expiry
- Terms link
- Apply or select action

The active Deal must not replace the normal price without explanation.

If a Deal expires or becomes unavailable:

- Preserve the selected service
- Explain the change
- Show the current canonical price
- Require review before continuing
- Suggest other active Deals where available

PRICE PANEL

Create reusable price presentations for:

- Per night
- Per day
- Per person
- Per seat
- Per ticket
- Per transfer
- Per hour
- Per item
- Total package
- Starting from
- Request quote

Show:

- Base price
- Quantity or duration
- Deal
- Fees
- Total
- Currency
- Price basis

Never invent fees, discounts, totals, or reference prices.

AVAILABILITY

Create:

- Available
- Limited
- Unavailable
- Sold out
- Request required
- Schedule unavailable
- Date required
- Checking
- Changed
- Offline

Availability must come from the backend.

REVIEWS

Create:

- Rating summary
- Rating distribution
- Review card
- Verified completed-activity label
- Business response
- Review filtering
- Load more
- No reviews
- Reviews unavailable

Do not imply that every review comes from a completed booking unless the backend confirms it.

QUESTIONS

Create:

- Question
- Answer
- Accepted answer
- Business answer
- Ask question
- Sign-in gate
- No questions
- Loading
- Error

Clearly distinguish community answers from official business answers.

TRUST AND VERIFICATION

Do not use one generic checkmark for every trust concept.

Support labels such as:

- Business verified
- Identity verified
- Operator verified
- Driver documents reviewed
- Vehicle documents reviewed
- Completed booking
- Listing reviewed
- Information not verified

Each label must open or connect to a short explanation.

BACKEND-READY DATA CONTRACT

Use typed mock data passed through component properties.

Do not invent API endpoint URLs.

Create a normalized `ListingSummary` containing:

- id
- listingType
- serviceCategory
- title
- subtitle
- business
- destination
- image
- rating
- reviewCount
- price
- currency
- priceBasis
- availability
- verification
- activeDeal
- sponsored
- detailPath

Create a `ListingDetail` containing:

- summary
- media
- description
- highlights
- features
- options
- availability
- pricing
- activeDeals
- included
- excluded
- location
- route
- schedule
- requirements
- accessibility
- terms
- cancellation
- safety
- reviews
- questions
- provider
- relatedListings
- bookingMethod

Create category extensions:

- StayListingDetail
- FoodListingDetail
- ActivityListingDetail
- GuideListingDetail
- EventListingDetail
- ShopProductDetail
- RoadTransportDetail
- AirTransportDetail
- WaterTransportDetail

The backend remains authoritative for:

- Listing identity
- Listing type
- Business or operator
- Verification
- Availability
- Inventory
- Price
- Currency
- Fees
- Deals
- Eligibility
- Schedules
- Seats
- Stock
- Terms
- Cancellation
- Reviews
- Questions
- Booking method
- Payment status
- Content visibility

STATES TO DESIGN

Create:

- Loading
- Ready
- Missing media
- Unavailable
- Sold out
- Paused
- Hidden
- Deleted or removed
- Price changed
- Deal expired
- Availability changed
- Option unavailable
- Signed-out booking attempt
- Permission restricted
- Offline
- Partial section failure
- Full error
- External booking handoff

FIGMA FRAMES

Create:

- Shared detail anatomy
- Stay detail — Desktop Light
- Stay detail — Desktop Dark
- Stay detail — Mobile Light
- Stay detail — Mobile Dark
- Food detail
- Activity detail
- Guide detail
- Event detail
- Shop product detail
- Car-rental detail using shared Transport components
- Community-ride detail
- Bus-trip detail
- Air-transport detail
- Water-transport detail
- Active Deal detail
- No Deal
- Price changed
- Availability changed
- Unavailable
- Loading
- Offline
- Partial failure
- Full error

PROTOTYPE

Prototype:

- Open a result from Search
- Open a result from Deals
- Browse media
- Save and unsave
- Share
- Select dates
- Select travelers
- Select a room, package, ticket, seat, or product variant
- Check availability
- Open Deal eligibility
- Open full terms
- Read reviews
- Ask a question
- Open provider profile
- Begin the supported booking action
- Handle signed-out booking
- Handle changed price
- Handle expired Deal
- Switch Light and Dark themes
- Retry a failed section

ACCESSIBILITY

Annotate:

- Heading order
- Keyboard focus
- Media-gallery controls
- Image alternative text
- Price reading order
- Availability announcements
- Option-selection announcements
- Deal and eligibility status
- Review semantics
- Form labels
- Sticky-action behavior
- Touch targets
- Reduced motion
- Light and Dark contrast
- Status labels that do not rely on color

BACKEND HANDOFF

Add Service & Listing Detail to the Backend Handoff page.

For each category document:

- Reused components
- New components
- Required fields
- Existing backend capability
- Target backend capability
- Booking method
- Permission behavior
- Availability behavior
- Price behavior
- Deal behavior
- Loading
- Empty
- Error
- Cache and refresh
- Analytics intent

FINAL ACCEPTANCE

The detail system must:

- Use reusable component instances
- Reuse Home, Transport, Search, and Deals components
- Add missing components to `02 Components`
- Support all required service categories
- Support Traveler Light and Traveler Dark
- Work at 1440px, 1024px, and 390px
- Make price, availability, trust, Deals, and the next action clear
- Use the correct category-specific action
- Handle loading, unavailable, offline, changed-price, and error states
- Be ready for backend integration
- Avoid invented routes, endpoints, prices, availability, verification, or payment behavior
- Keep Delve Purple as the primary interaction color