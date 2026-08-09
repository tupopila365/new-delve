Paste this into Figma Make after completing the Home library. It adds road, air, and water transport while keeping the design ready for backend integration.

Create the complete Transport experience for the Delve Traveler app.

Use the existing Delve foundations, Traveler app shell, Home components, semantic variables, typography, buttons, inputs, cards, navigation, feedback states, and theme system. Do not recreate components that already exist.

PURPOSE

Transport helps travelers answer:

“How will I move between the airport, town, accommodation, and the places I want to experience?”

Use this page heading:

“Move around with confidence.”

Supporting copy:

“Compare road, air, and water transport. Rent a vehicle, find a verified ride, reserve a bus or flight, arrange an airport transfer, or travel by ferry and boat.”

Primary action:

“Find transport”

SURFACE MODES

Create every primary frame in:

- Traveler / Light
- Traveler / Dark
- Desktop 1440px
- Tablet 1024px
- Mobile 390px

Theme switching must not reset search fields, filters, selected results, passenger details, or booking progress.

TRANSPORT CATEGORIES

Create three primary transport groups.

1. ROAD TRANSPORT

Include:

- Car rental
- Other approved vehicle rentals
- Community shared ride
- Private ride with driver
- Bus
- Minibus
- Shuttle
- Airport transfer
- Intercity transfer

2. AIR TRANSPORT

Include:

- Scheduled commercial flight
- Regional flight
- Charter flight
- Air taxi
- Private transfer flight
- Helicopter transfer where supported
- Airport-to-airport connection

Keep scenic flights and aerial tours under Activities unless they provide genuine point-to-point transport.

Do not imply live airline inventory, real-time fares, flight tracking, seat selection, or ticket issuance unless the backend and transport provider support it.

3. WATER TRANSPORT

Include:

- Ferry
- Water taxi
- Passenger boat
- Boat transfer
- Island transfer
- River transport
- Harbor transfer
- Private boat charter used for transportation

Keep sightseeing cruises, fishing trips, and recreational boat tours under Activities unless they provide genuine point-to-point transportation.

PAGE STRUCTURE

1. TRAVELER HEADER

Reuse:

- Delve logo
- Destination context
- Search
- Deals
- Transport
- Delvers
- Journeys
- Saved
- Theme control
- Account

Transport must appear selected.

2. TRANSPORT HERO

Include:

- “Move around with confidence.”
- Supporting copy
- From
- To
- Departure date
- Return date where relevant
- Travelers
- Search action

Show a compact illustration or travel image involving connected transport modes. Text must remain readable in Light and Dark themes.

3. TRANSPORT GROUP SELECTOR

Create primary tabs:

- All transport
- Road
- Air
- Water

Create secondary mode filters that change with the selected group.

Road filters:

- Rental
- Community ride
- Private driver
- Bus & minibus
- Shuttle
- Airport transfer

Air filters:

- Scheduled flight
- Regional flight
- Charter
- Air taxi
- Helicopter transfer

Water filters:

- Ferry
- Water taxi
- Passenger boat
- Private transfer
- Charter

Every result must retain a visible Road, Air, or Water label and its exact transport mode.

4. ADAPTIVE SEARCH

The search form must change according to transport mode.

Road rental:

- Pickup location
- Return location
- Pickup date and time
- Return date and time
- Driver age only when required
- Vehicle type

Community or private ride:

- Origin
- Destination
- Departure date and time
- Travelers
- Luggage
- Private or shared preference

Bus or minibus:

- Origin
- Destination
- Departure date
- Passengers
- One way or return

Air transport:

- Departure airport
- Arrival airport
- Departure date
- Return date
- Passengers
- Cabin or service type when supported
- One way or return

Water transport:

- Departure port, harbor, jetty, or pickup point
- Arrival point
- Departure date and time
- Passengers
- Luggage
- One way or return
- Private or shared preference where supported

Manual location entry must remain available when location permission is denied.

5. QUICK NEEDS

Create reusable filter shortcuts:

- Airport pickup
- Budget
- Family
- Extra luggage
- Accessible
- Same day
- This week
- Private
- Shared
- 4x4 or gravel
- Intercity
- Island transfer
- Coastal route

Only show accessibility, child-seat, luggage, or assistance capabilities when confirmed by backend data.

6. COMPARISON GUIDANCE

Explain the difference between:

- Renting and driving yourself
- Joining a community ride
- Booking a private driver
- Reserving a scheduled bus seat
- Booking air transport
- Reserving ferry or boat transport

Show price units clearly:

- N$ 700/day
- N$ 240/seat
- N$ 900/transfer
- N$ 2,400/person
- N$ 6,500/charter

Do not present different price units as directly comparable totals.

7. TRANSPORT RESULTS

Create reusable result cards for:

- Car rental
- Community ride
- Private driver
- Bus or minibus
- Airport transfer
- Scheduled flight
- Regional flight
- Charter flight
- Air taxi
- Ferry
- Water taxi
- Passenger boat
- Private boat transfer

COMMON RESULT INFORMATION

Every transport result must include:

- Road, Air, or Water group
- Exact transport mode
- Operator, business, host, or driver
- Origin and destination
- Departure or pickup time
- Arrival time or estimated duration
- Price
- Currency
- Price basis
- Passenger or seat capacity
- Luggage summary
- Availability
- Cancellation summary
- Exact verification wording
- Save action
- Primary action

Possible actions:

- View vehicle
- View ride
- Choose seats
- View flight
- View ferry
- Request transfer
- Check availability

ROAD CARD DETAILS

Car rental:

- Vehicle image
- Make and model
- Vehicle type
- Seats
- Transmission
- Fuel type
- Pickup location
- Daily rate
- Availability
- Rental provider

Community ride:

- Persistent “Community ride” label
- Ride host
- Profile image
- Route
- Departure window
- Vehicle
- Available seats
- Contribution per seat
- Luggage
- Verification scope

Bus or minibus:

- Operator
- Route
- Intermediate stops
- Departure
- Expected arrival
- Available seats
- Amenities
- Luggage rules
- Price per seat

AIR CARD DETAILS

Scheduled or regional flight:

- Airline or operator
- Departure airport code and name
- Arrival airport code and name
- Departure and arrival time
- Duration
- Stops
- Flight reference where supplied
- Baggage allowance
- Fare basis
- Price per traveler
- Availability source

Charter or air taxi:

- Operator
- Aircraft type where permitted
- Origin and destination airports
- Departure window
- Passenger capacity
- Baggage limits
- Total charter or per-person price
- Request or confirmation behavior

Do not display aircraft safety, licensing, or operational claims beyond verified backend information.

WATER CARD DETAILS

Ferry:

- Operator
- Departure port
- Arrival port
- Boarding time
- Departure and arrival
- Passenger availability
- Vehicle allowance where supported
- Luggage policy
- Price per passenger

Water taxi or boat transfer:

- Operator
- Vessel type where permitted
- Pickup point
- Destination
- Departure window
- Passenger capacity
- Luggage limits
- Private or shared
- Total or per-person price

Weather-sensitive services must show operational status and instructions without presenting an unreliable prediction as confirmation.

DETAIL PAGES

Create reusable detail-page templates for:

- Road transport detail
- Air transport detail
- Water transport detail

All detail pages include:

1. Media gallery
2. Transport mode and operator
3. Route summary
4. Schedule
5. Price breakdown
6. Passenger and luggage capacity
7. Availability
8. Verification explanation
9. Terms and cancellation
10. Boarding, pickup, or check-in instructions
11. Accessibility information where confirmed
12. Support and safety
13. Reviews from eligible completed trips
14. Booking or request panel
15. Similar alternatives

ROAD DETAIL ADDITIONS

- Vehicle information
- Driver or host information where appropriate
- Pickup and return rules
- Seat selection for buses
- Rental-document requirements
- Driver assignment only when supported

AIR DETAIL ADDITIONS

- Airport and terminal information
- Check-in cutoff
- Baggage
- Travel-document reminder
- Stops or connections
- Fare conditions
- Ticket or request behavior
- Operator contact after confirmation

WATER DETAIL ADDITIONS

- Port, harbor, or jetty
- Boarding point
- Boarding cutoff
- Vessel information where permitted
- Passenger and vehicle rules
- Luggage
- Weather disruption policy
- Safety instructions
- Operator contact after confirmation

BOOKING AND REQUEST FLOWS

Create separate flows for:

- Car-rental booking review
- Community-ride seat request
- Private-driver request
- Bus seat selection
- Airport-transfer request
- Scheduled-flight booking or external booking handoff
- Charter-flight request
- Ferry passenger selection
- Ferry vehicle selection where supported
- Water-taxi or private-boat request

Do not force every transport mode into one identical booking flow.

Each final review shows:

- Transport mode
- Operator
- Route
- Date and time
- Travelers
- Seats
- Luggage
- Price breakdown
- Currency
- Cancellation terms
- Verification context
- Payment behavior
- Final action

REUSABLE COMPONENTS

Reuse existing Home and Traveler components whenever possible.

Create these additional components:

- `Transport/Group tabs`
- `Transport/Mode selector`
- `Transport/Adaptive search`
- `Transport/Result card`
- `Transport/Mode label`
- `Transport/Route summary`
- `Transport/Schedule`
- `Transport/Operator identity`
- `Transport/Verification summary`
- `Transport/Passenger selector`
- `Transport/Luggage selector`
- `Transport/Availability`
- `Transport/Price basis`
- `Transport/Terms summary`
- `Transport/Status timeline`
- `Transport/Booking review`

Road components:

- `Transport/Road/Rental card`
- `Transport/Road/Community ride card`
- `Transport/Road/Private driver card`
- `Transport/Road/Bus card`
- `Transport/Road/Seat map`
- `Transport/Road/Vehicle summary`

Air components:

- `Transport/Air/Flight card`
- `Transport/Air/Airport summary`
- `Transport/Air/Flight schedule`
- `Transport/Air/Baggage summary`
- `Transport/Air/Fare summary`
- `Transport/Air/Charter request`

Water components:

- `Transport/Water/Ferry card`
- `Transport/Water/Boat transfer card`
- `Transport/Water/Port summary`
- `Transport/Water/Boarding summary`
- `Transport/Water/Vessel summary`
- `Transport/Water/Weather notice`

Design components so Search, Deals, Journeys, Booking, Checkout, Saved, and Account pages can reuse them.

BACKEND-READY DATA CONTRACT

Use typed mock data passed through component properties. Do not hardcode data inside visual components and do not invent endpoint URLs.

Create a normalized `TransportResult` containing:

- id
- transportGroup
- transportMode
- operator
- origin
- destination
- departure
- arrival
- duration
- price
- currency
- priceBasis
- capacity
- availability
- luggage
- accessibility
- verification
- cancellation
- image
- bookingMethod
- sponsored
- status

Create mode-specific extensions:

- RoadTransportResult
- VehicleRentalResult
- CommunityRideResult
- BusTripResult
- AirTransportResult
- ScheduledFlightResult
- CharterFlightResult
- WaterTransportResult
- FerryResult
- BoatTransferResult

The backend remains authoritative for:

- Operator identity
- Driver, aircraft, and vessel permissions
- Verification
- Routes
- Schedules
- Availability
- Seats
- Prices
- Currency
- Baggage and luggage
- Cancellation terms
- Flight, ferry, and trip status
- Booking confirmation
- Payment status
- Refund status
- Sponsored placement
- Content visibility

Clearly label each feature as:

- Current backend capability
- Backend integration required
- Target capability
- External provider required

Do not visually imply that a target capability already works.

STATES

Create complete variants for:

- Loading
- Ready
- No results
- No route
- Sold out
- Seat unavailable
- Price changed
- Schedule changed
- Delayed
- Canceled
- Checking availability
- Payment uncertain
- Location denied
- Offline
- Provider unavailable
- Weather disruption
- Permission required
- External booking handoff
- Error

FIGMA FRAMES

Create:

- Transport overview — Desktop Light
- Transport overview — Desktop Dark
- Transport overview — Mobile Light
- Transport overview — Mobile Dark
- Road results
- Air results
- Water results
- Car-rental detail
- Community-ride detail
- Bus-trip detail and seat map
- Airport-transfer detail
- Scheduled-flight detail
- Charter-flight request
- Ferry detail
- Water-taxi detail
- Road booking review
- Air booking or handoff review
- Water booking review
- Loading, empty, offline, changed-price, delayed, canceled, and error frames

PROTOTYPE

Prototype:

- Switch Road, Air, and Water
- Change transport mode
- Enter From and To
- Change dates and passengers
- Filter results
- Save a result
- Open transport detail
- Select a bus or ferry seat
- Request a community ride
- Request a private transfer
- Review a rental booking
- Review a flight
- Request a charter
- Review a ferry booking
- Switch Light and Dark themes
- Retry failed results
- Handle external booking handoff

ACCESSIBILITY

Annotate:

- Keyboard order
- Focus states
- Screen-reader labels
- Route and schedule reading order
- Seat-map alternatives
- Price-unit announcements
- Delay and cancellation announcements
- Touch targets
- Reduced motion
- Light and Dark contrast
- Status labels that do not rely on color
- Accessible alternatives to maps and visual route diagrams

DELIVERY RULE

Build the final Transport pages entirely from reusable component instances and semantic variables.

Do not detach components in final frames.

Do not invent backend capabilities, live inventory, live tracking, dynamic dispatch, flight monitoring, airline ticketing, vessel tracking, or payment-provider behavior.

When a capability is not currently supported, design the intended experience but label it clearly as requiring backend or external-provider integration.