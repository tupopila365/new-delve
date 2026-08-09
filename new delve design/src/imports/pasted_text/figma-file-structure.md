FIGMA FILE STRUCTURE

Create the following Figma pages in this exact order.

00 COVER & READ ME

Include:

- Delve Product Design System
- Traveler App — Home
- Draft version
- Delve Purple #8C52FF
- Purpose of the file
- How designers and developers should use the library
- Figma owns visual design and interaction intent
- Cursor owns implementation, routes, backend integration, permissions, and tests

01 FOUNDATIONS

Create reusable variables and styles for:

- Delve Purple color scale
- Traveler Light theme
- Traveler Dark theme
- Semantic status colors
- Typography
- Spacing
- Radius
- Borders
- Elevation
- Icon sizes
- Motion
- Breakpoints
- Content widths
- Focus rings
- Image overlays

Create these variable modes:

- Traveler / Light
- Traveler / Dark

Use semantic variable names:

- `ui/canvas`
- `ui/navigation`
- `ui/surface`
- `ui/surface-subtle`
- `ui/text`
- `ui/text-muted`
- `ui/border`
- `ui/action-primary`
- `ui/action-hover`
- `ui/focus`
- `ui/selected`
- `ui/status-success`
- `ui/status-warning`
- `ui/status-danger`
- `ui/status-information`

Do not apply raw color values directly to page components when a semantic variable exists.

02 COMPONENTS

Create all components as reusable Auto Layout component sets with named layers, component properties, theme modes, responsive behavior, and realistic content.

NAVIGATION COMPONENTS

- `Navigation/Traveler header`
- `Navigation/Mobile header`
- `Navigation/Mobile bottom bar`
- `Navigation/Desktop link`
- `Navigation/Mobile action`
- `Navigation/Logo`
- `Navigation/Destination control`
- `Navigation/Account menu`
- `Navigation/Breadcrumbs`
- `Navigation/Back button`
- `Navigation/Theme control`

Traveler Header properties:

- Desktop or Mobile
- Signed out or Signed in
- Light or Dark
- Transparent or Solid
- Destination selected or Not selected
- Search collapsed or Expanded

Theme Control properties:

- Light
- Dark
- System

ACTION COMPONENTS

- `Action/Button`
- `Action/Icon button`
- `Action/Save button`
- `Action/Share button`
- `Action/Follow button`
- `Action/Link`
- `Action/See all`
- `Action/Floating action`

Button properties:

- Primary
- Secondary
- Ghost
- Destructive
- Disabled
- Loading
- Light theme
- Dark theme
- Icon before
- Icon after
- Full width
- Compact

INPUT COMPONENTS

- `Input/Search`
- `Input/Destination search`
- `Input/Text field`
- `Input/Select`
- `Input/Date picker`
- `Input/Number stepper`
- `Input/Checkbox`
- `Input/Radio`
- `Input/Toggle`
- `Input/Filter chip`
- `Input/Mood chip`
- `Input/Category selector`

Every input must include:

- Default
- Hover
- Focus
- Filled
- Error
- Disabled
- Loading
- Light
- Dark

LAYOUT COMPONENTS

- `Layout/Page container`
- `Layout/Section`
- `Layout/Section header`
- `Layout/Responsive rail`
- `Layout/Card grid`
- `Layout/Sticky mobile action`
- `Layout/Divider`
- `Layout/Editorial media`
- `Layout/Content placeholder`

DISCOVERY COMPONENTS

- `Discovery/Home hero`
- `Discovery/Destination context`
- `Discovery/Service shortcut`
- `Discovery/Service shortcut grid`
- `Discovery/Mood selector`
- `Discovery/Recommendation explanation`
- `Discovery/Location permission prompt`
- `Discovery/Nearby control`

Home Hero properties:

- Light or Dark
- Image or Solid background
- Destination selected or Not selected
- Signed out or Signed in
- Desktop, Tablet, or Mobile

CARD COMPONENTS

Create one shared card foundation before creating specialized cards.

- `Card/Base`
- `Card/Media`
- `Card/Header`
- `Card/Body`
- `Card/Metadata`
- `Card/Actions`
- `Card/Disclosure`

Build these specialized cards from the shared foundation:

- `Card/Service`
- `Card/Deal`
- `Card/Transport`
- `Card/Journey`
- `Card/Delvers post`
- `Card/Local question`
- `Card/Place`
- `Card/Business`
- `Card/Event`
- `Card/Guide`
- `Card/Shop product`

Common card properties:

- Light or Dark
- Horizontal or Vertical
- Desktop or Mobile
- Saved or Not saved
- Organic or Sponsored
- Verified or Unverified
- Available or Unavailable
- Loading
- Error
- Long content
- Missing image

COMMERCE COMPONENTS

- `Commerce/Price`
- `Commerce/Price summary`
- `Commerce/Deal badge`
- `Commerce/Eligibility`
- `Commerce/Availability`
- `Commerce/Booking status`
- `Commerce/Payment status`
- `Commerce/Trust summary`
- `Commerce/Terms link`

Price must support:

- Total
- Per night
- Per day
- Per seat
- Per transfer
- Per person
- Starting from
- Original and discounted price
- Currency
- Unavailable price

TRANSPORT COMPONENTS

- `Transport/Mode selector`
- `Transport/Search`
- `Transport/Result card`
- `Transport/Rental card`
- `Transport/Community ride card`
- `Transport/Private driver card`
- `Transport/Bus trip card`
- `Transport/Airport transfer card`
- `Transport/Route summary`
- `Transport/Seat availability`
- `Transport/Luggage summary`
- `Transport/Verification summary`

Transport mode properties:

- Rental car
- Community ride
- Private driver
- Bus or minibus
- Airport transfer

Always display the price basis and exact transport mode.

COMMUNITY COMPONENTS

- `Community/Creator identity`
- `Community/Avatar`
- `Community/Verification label`
- `Community/Engagement bar`
- `Community/Comment preview`
- `Community/Place link`
- `Community/Linked service`
- `Community/Sponsored disclosure`

JOURNEY COMPONENTS

- `Journey/Route summary`
- `Journey/Duration`
- `Journey/Stop count`
- `Journey/Budget summary`
- `Journey/Transport modes`
- `Journey/Creator`
- `Journey/Save action`

FEEDBACK COMPONENTS

- `Feedback/Skeleton`
- `Feedback/Empty state`
- `Feedback/No results`
- `Feedback/Error state`
- `Feedback/Offline state`
- `Feedback/Permission state`
- `Feedback/Inline message`
- `Feedback/Toast`
- `Feedback/Success state`
- `Feedback/Processing state`

OVERLAY COMPONENTS

- `Overlay/Dialog`
- `Overlay/Bottom sheet`
- `Overlay/Drawer`
- `Overlay/Search overlay`
- `Overlay/Destination picker`
- `Overlay/Filter sheet`
- `Overlay/Sign-in gate`
- `Overlay/Media viewer`

03 PATTERNS & STATES

Create reusable patterns assembled from the components.

Patterns:

- Page header
- Destination search flow
- Horizontal discovery rail
- Responsive card grid
- Signed-out action gate
- Save with loading and rollback
- Section-level loading
- Section-level error and retry
- Empty discovery section
- Offline cached content
- Sponsored content placement
- Recommendation explanation
- Theme switching
- Mobile bottom navigation
- Desktop-to-mobile card conversion
- Partial backend failure
- Price or availability changed
- Location permission denied

For each pattern, show:

- Light theme
- Dark theme
- Desktop
- Mobile
- Loading
- Ready
- Error where relevant

04 TRAVELER APP SHELL

Create the reusable shell used by Home and future Traveler pages.

Desktop shell:

- Traveler header
- Destination context
- Main content container
- Optional breadcrumbs
- Footer

Mobile shell:

- Compact header
- Main content
- Safe-area spacing
- Bottom navigation
- Optional sticky action

Create shell variants for:

- Signed out
- Signed in
- Light
- Dark
- Online
- Offline
- Destination selected
- No destination

The shell must later support:

- Home
- Search
- Deals
- Transport
- Delvers
- Journeys
- Saved
- Account
- Checkout
- Booking details

Do not design these complete pages yet. Only make sure the shell and components can support them.

05 HOME

Create these complete Home frames:

- Desktop 1440 — Light — New visitor
- Desktop 1440 — Dark — New visitor
- Desktop 1440 — Light — Signed in
- Desktop 1440 — Dark — Signed in
- Tablet 1024 — Light
- Tablet 1024 — Dark
- Mobile 390 — Light — New visitor
- Mobile 390 — Dark — New visitor
- Mobile 390 — Light — Signed in
- Mobile 390 — Dark — Signed in

Create separate sections on the Home Figma page for:

- Final designs
- Responsive layouts
- Theme comparison
- Component anatomy
- Loading states
- Empty states
- Error states
- Offline state
- Signed-out action state
- Backend annotations

Home content order:

1. Traveler header
2. Clear Home purpose
3. Destination search
4. Mood shortcuts
5. Explore by service
6. Deals for this place
7. Easy on the wallet
8. Popular nearby
9. From Delvers
10. Journeys to borrow
11. Transport options
12. Ask locals
13. Trust and booking guidance
14. Footer

Use this message prominently:

“Discover your whole trip in one place.”

Supporting text:

“Find stays, transport, food, activities, and real deals. See journeys shared by travelers and plan what fits your time and budget.”

Primary actions:

- Search a place
- Explore nearby

06 HOME PROTOTYPE

Create interactive prototypes for:

- Change destination
- Search a place
- Explore nearby
- Change Light, Dark, or System theme
- Open a category
- Save and unsave a card
- Signed-out save attempt
- Open a deal
- Open a transport result
- Open a Delvers post
- Open a Journey
- Retry a failed section
- Use mobile bottom navigation

Create one desktop prototype and one mobile prototype.

07 BACKEND HANDOFF

Document every Home section’s backend requirements.

Create a handoff table with:

| Home section | Component | Required data | User action | Loading | Empty | Error | Backend authority |
| --- | --- | --- | --- | --- | --- | --- | --- |

Document these backend-ready objects:

- Destination
- User
- Service category
- Deal
- Service listing
- Transport result
- Delvers post
- Journey
- Local question
- Sponsored placement

Clearly identify:

- Mocked data
- Existing backend data
- Target backend capability
- Permission requirement
- Privacy requirement
- Analytics event
- Refresh behavior
- Cache behavior
- Error behavior

The backend remains authoritative for:

- Identity
- Permissions
- Privacy
- Verification
- Prices
- Currency
- Availability
- Deal eligibility
- Sponsored status
- Transport seats
- Booking status
- Payment status
- Content visibility

COMPONENT REUSE RULES

Before creating a new component:

1. Check whether an existing base component can support the design.
2. Add a component property or variant when the anatomy is the same.
3. Create a specialized component only when its information or behavior is meaningfully different.
4. Do not detach component instances in final frames.
5. Bind colors and spacing to variables.
6. Use Auto Layout everywhere practical.
7. Use clear component and layer names.
8. Test long names, large prices, missing images, and translated text.
9. Include Light and Dark modes.
10. Include desktop and mobile resizing behavior.

The final Home page must be assembled from reusable component instances, not one-off groups.