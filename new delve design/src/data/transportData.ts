// ─── Base types ───────────────────────────────────────────────────────────

export type TransportGroup = 'road' | 'air' | 'water'
export type BookingMethod = 'instant' | 'request' | 'external' | 'on-arrival'

export interface TransportResult {
  id: string
  transportGroup: TransportGroup
  transportMode: string
  operator: string
  operatorType: string
  origin: string
  destination: string
  departure: string
  arrival: string
  duration: string
  price: string
  currency: string
  priceBasis: string
  capacity: number
  seatsLeft?: number
  luggage: string
  accessibility: string | null
  verification: { verified: boolean; label: string }
  cancellation: string
  image: string
  bookingMethod: BookingMethod
  sponsored: boolean
  status: 'available' | 'sold-out' | 'on-request' | 'delayed' | 'canceled'
}

// ─── Road extensions ──────────────────────────────────────────────────────

export interface VehicleRentalResult extends TransportResult {
  transportMode: 'Car rental'
  vehicle: { make: string; model: string; type: string; seats: number; transmission: string; fuel: string }
  pickupLocation: string
  dailyRate: string
  provider: string
}

export interface CommunityRideResult extends TransportResult {
  transportMode: 'Community ride'
  host: { name: string; avatar: string }
  vehicle: string
  departureWindow: string
  contributionPerSeat: string
  private: boolean
}

export interface BusTripResult extends TransportResult {
  transportMode: 'Bus' | 'Minibus' | 'Shuttle'
  stops: string[]
  amenities: string[]
  luggageRules: string
  pricePerSeat: string
}

export interface PrivateDriverResult extends TransportResult {
  transportMode: 'Private driver'
  driver: { name: string; avatar: string; rating: number; trips: number }
  vehicle: string
}

export interface AirportTransferResult extends TransportResult {
  transportMode: 'Airport transfer'
  provider: string
  vehicleType: string
  meetAndGreet: boolean
}

// ─── Air extensions ───────────────────────────────────────────────────────

export interface ScheduledFlightResult extends TransportResult {
  transportMode: 'Scheduled flight' | 'Regional flight'
  airline: string
  flightRef?: string
  departureAirport: { code: string; name: string }
  arrivalAirport: { code: string; name: string }
  stops: number
  baggage: string
  fareBasis: string
  pricePerTraveler: string
  availabilitySource: 'backend' | 'external-provider'
}

export interface CharterFlightResult extends TransportResult {
  transportMode: 'Charter flight' | 'Air taxi'
  aircraftType?: string
  passengerCapacity: number
  departureWindow: string
  totalCharterPrice: string
  confirmationBehavior: 'request' | 'instant'
}

// ─── Water extensions ─────────────────────────────────────────────────────

export interface FerryResult extends TransportResult {
  transportMode: 'Ferry'
  departurePort: string
  arrivalPort: string
  boardingTime: string
  vehicleAllowance: boolean
  luggagePolicy: string
  pricePerPassenger: string
}

export interface BoatTransferResult extends TransportResult {
  transportMode: 'Water taxi' | 'Passenger boat' | 'Private boat transfer'
  vesselType?: string
  pickupPoint: string
  departureWindow: string
  isPrivate: boolean
  pricePerPerson?: string
  totalPrice?: string
  weatherSensitive: boolean
}

// ─── Mock data ────────────────────────────────────────────────────────────

export const transportResults: TransportResult[] = [
  // ── Road ──
  {
    id: 'r1',
    transportGroup: 'road',
    transportMode: 'Car rental',
    operator: 'Namibia Car Hire Co.',
    operatorType: 'Rental business',
    origin: 'Windhoek CBD',
    destination: 'Swakopmund',
    departure: 'Flexible pickup',
    arrival: 'Return by agreed date',
    duration: 'N/A',
    price: '700',
    currency: 'N$',
    priceBasis: 'day',
    capacity: 5,
    luggage: '2 large bags',
    accessibility: null,
    verification: { verified: true, label: 'Registered rental business' },
    cancellation: 'Free cancellation up to 24 hrs',
    image: 'https://images.unsplash.com/photo-1772289093180-43894a9fc09d?w=700&h=420&fit=crop&auto=format',
    bookingMethod: 'instant',
    sponsored: false,
    status: 'available',
  } as VehicleRentalResult & { vehicle: any; pickupLocation: string; dailyRate: string; provider: string },
  {
    id: 'r2',
    transportGroup: 'road',
    transportMode: 'Community ride',
    operator: 'Selma K.',
    operatorType: 'Community ride host',
    origin: 'Windhoek, Kleine Kuppe',
    destination: 'Swakopmund',
    departure: 'Sat 9 Aug · 06:00',
    arrival: 'Est. 09:30',
    duration: '~3h 30m',
    price: '240',
    currency: 'N$',
    priceBasis: 'seat',
    capacity: 4,
    seatsLeft: 2,
    luggage: '1 bag per seat',
    accessibility: null,
    verification: { verified: false, label: 'Community listing — unverified' },
    cancellation: 'Discuss with host',
    image: 'https://images.unsplash.com/photo-1510060662584-0fdbad3a0a5a?w=700&h=420&fit=crop&auto=format',
    bookingMethod: 'request',
    sponsored: false,
    status: 'available',
  } as CommunityRideResult & { host: any; vehicle: string; departureWindow: string; contributionPerSeat: string; private: boolean },
  {
    id: 'r3',
    transportGroup: 'road',
    transportMode: 'Private driver',
    operator: 'Johannes M.',
    operatorType: 'Private driver/operator',
    origin: 'Windhoek',
    destination: 'Swakopmund',
    departure: 'By arrangement',
    arrival: 'Est. 3 – 4 hrs',
    duration: '3 – 4 hrs',
    price: '1 200',
    currency: 'N$',
    priceBasis: 'trip',
    capacity: 4,
    luggage: '3 large bags',
    accessibility: null,
    verification: { verified: true, label: 'Driver identity confirmed' },
    cancellation: 'Free cancellation 12 hrs before',
    image: 'https://images.unsplash.com/photo-1678038541432-a5b25b41591e?w=700&h=420&fit=crop&auto=format',
    bookingMethod: 'request',
    sponsored: false,
    status: 'available',
  } as PrivateDriverResult & { driver: any; vehicle: string },
  {
    id: 'r4',
    transportGroup: 'road',
    transportMode: 'Bus',
    operator: 'Intercape Namibia',
    operatorType: 'Bus operator',
    origin: 'Windhoek Bus Terminal',
    destination: 'Swakopmund Bus Terminal',
    departure: 'Daily · 07:00',
    arrival: '11:00',
    duration: '4h',
    price: '380',
    currency: 'N$',
    priceBasis: 'seat',
    capacity: 52,
    seatsLeft: 14,
    luggage: '1 checked bag, 1 carry-on',
    accessibility: 'Wheelchair-accessible boarding available',
    verification: { verified: true, label: 'Licensed bus operator' },
    cancellation: 'Non-refundable. Change fee applies.',
    image: 'https://images.unsplash.com/photo-1635858780418-2eeb9e75768f?w=700&h=420&fit=crop&auto=format',
    bookingMethod: 'instant',
    sponsored: false,
    status: 'available',
  } as BusTripResult & { stops: string[]; amenities: string[]; luggageRules: string; pricePerSeat: string },
  {
    id: 'r5',
    transportGroup: 'road',
    transportMode: 'Airport transfer',
    operator: 'SwiftShuttle NM',
    operatorType: 'Airport-transfer operator',
    origin: 'Hosea Kutako International Airport',
    destination: 'Swakopmund — your accommodation',
    departure: 'Your flight arrival',
    arrival: 'Est. 3 hrs after pickup',
    duration: '~3 hrs',
    price: '900',
    currency: 'N$',
    priceBasis: 'transfer',
    capacity: 4,
    luggage: '2 large bags per person',
    accessibility: null,
    verification: { verified: true, label: 'Registered transfer operator' },
    cancellation: 'Free cancellation 24 hrs before',
    image: 'https://images.unsplash.com/photo-1678038541432-a5b25b41591e?w=700&h=420&fit=crop&auto=format',
    bookingMethod: 'request',
    sponsored: false,
    status: 'available',
  } as AirportTransferResult & { provider: string; vehicleType: string; meetAndGreet: boolean },

  // ── Air ──
  {
    id: 'a1',
    transportGroup: 'air',
    transportMode: 'Regional flight',
    operator: 'Westair Aviation',
    operatorType: 'Regional airline',
    origin: 'Windhoek (WDH)',
    destination: 'Swakopmund (SWP)',
    departure: 'Mon 11 Aug · 08:15',
    arrival: '09:05',
    duration: '50 min',
    price: '2 400',
    currency: 'N$',
    priceBasis: 'person',
    capacity: 18,
    seatsLeft: 6,
    luggage: '15 kg checked + 5 kg cabin',
    accessibility: null,
    verification: { verified: true, label: 'Licensed airline — backend integration required for live inventory' },
    cancellation: 'Fare conditions apply. Check at booking.',
    image: 'https://images.unsplash.com/photo-1695302938665-1853a2c35994?w=700&h=420&fit=crop&auto=format',
    bookingMethod: 'external',
    sponsored: false,
    status: 'available',
  } as ScheduledFlightResult & { airline: string; departureAirport: any; arrivalAirport: any; stops: number; baggage: string; fareBasis: string; pricePerTraveler: string; availabilitySource: string },
  {
    id: 'a2',
    transportGroup: 'air',
    transportMode: 'Charter flight',
    operator: 'Namibia Air Charter',
    operatorType: 'Charter operator',
    origin: 'Eros Airport, Windhoek',
    destination: 'Sossusvlei Airstrip',
    departure: 'By arrangement',
    arrival: 'Est. 1 hr 20 min after departure',
    duration: '~1h 20m',
    price: '6 500',
    currency: 'N$',
    priceBasis: 'charter',
    capacity: 6,
    luggage: '15 kg soft bag per person',
    accessibility: null,
    verification: { verified: true, label: 'Charter operator — backend integration required' },
    cancellation: 'See operator terms',
    image: 'https://images.unsplash.com/photo-1695302938630-929b584ae6f2?w=700&h=420&fit=crop&auto=format',
    bookingMethod: 'request',
    sponsored: false,
    status: 'on-request',
  } as CharterFlightResult & { aircraftType?: string; passengerCapacity: number; departureWindow: string; totalCharterPrice: string; confirmationBehavior: string },

  // ── Water ──
  {
    id: 'w1',
    transportGroup: 'water',
    transportMode: 'Ferry',
    operator: 'Walvis Bay Ferry Services',
    operatorType: 'Ferry operator',
    origin: 'Walvis Bay Harbour',
    destination: 'Pelican Point',
    departure: 'Daily · 09:00',
    arrival: '10:30',
    duration: '1h 30m',
    price: '320',
    currency: 'N$',
    priceBasis: 'person',
    capacity: 80,
    seatsLeft: 22,
    luggage: '1 bag per person',
    accessibility: null,
    verification: { verified: true, label: 'Licensed ferry operator' },
    cancellation: 'Full refund 24 hrs before departure',
    image: 'https://images.unsplash.com/photo-1678666701965-51d6fd32695b?w=700&h=420&fit=crop&auto=format',
    bookingMethod: 'instant',
    sponsored: false,
    status: 'available',
  } as FerryResult & { departurePort: string; arrivalPort: string; boardingTime: string; vehicleAllowance: boolean; luggagePolicy: string; pricePerPassenger: string },
  {
    id: 'w2',
    transportGroup: 'water',
    transportMode: 'Water taxi',
    operator: 'Swakop Bay Transfers',
    operatorType: 'Water taxi operator',
    origin: 'Swakopmund Jetty',
    destination: 'Pelican Point',
    departure: 'On demand · 07:00 – 16:00',
    arrival: 'Est. 45 min',
    duration: '~45 min',
    price: '450',
    currency: 'N$',
    priceBasis: 'person',
    capacity: 8,
    seatsLeft: 5,
    luggage: 'Small daypack only',
    accessibility: null,
    verification: { verified: false, label: 'Community listing — unverified' },
    cancellation: 'Discuss with operator',
    image: 'https://images.unsplash.com/photo-1544632688-712e150321a5?w=700&h=420&fit=crop&auto=format',
    bookingMethod: 'request',
    sponsored: false,
    status: 'available',
  } as BoatTransferResult & { vesselType?: string; pickupPoint: string; departureWindow: string; isPrivate: boolean; pricePerPerson?: string; weatherSensitive: boolean },
]

// ─── Mode filter config ───────────────────────────────────────────────────

export const modeFilters: Record<string, string[]> = {
  all: ['All modes', 'Rental', 'Community ride', 'Private driver', 'Bus & minibus', 'Airport transfer', 'Flight', 'Charter', 'Ferry', 'Water taxi'],
  road: ['All road', 'Rental', 'Community ride', 'Private driver', 'Bus & minibus', 'Shuttle', 'Airport transfer'],
  air: ['All air', 'Scheduled flight', 'Regional flight', 'Charter', 'Air taxi', 'Helicopter transfer'],
  water: ['All water', 'Ferry', 'Water taxi', 'Passenger boat', 'Private transfer', 'Charter'],
}

export const quickNeeds = [
  'Airport pickup', 'Budget', 'Family', 'Extra luggage', 'Accessible',
  'Same day', 'This week', 'Private', 'Shared', '4x4 / gravel',
  'Intercity', 'Coastal route',
]
