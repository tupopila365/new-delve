// ─── Base types ───────────────────────────────────────────────────────────

export type TransportGroup = 'road' | 'air' | 'water'
export type BookingMethod = 'instant' | 'request' | 'external' | 'on-arrival'

export interface TransportResult {
  id: string
  transportGroup: TransportGroup
  transportMode: string
  operator: string
  operatorType: string
  operatorAvatar?: string
  operatorRating?: { rating: number; reviews: number }
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
  airport: string
  dropoffZones: string[]
  vehicleClass: string
  meetAndGreet: boolean
  flightTracking: boolean
  baseFare: string
}

// ─── Air extensions ───────────────────────────────────────────────────────

export interface RegionalFlightResult extends TransportResult {
  transportMode: 'Regional flight' | 'Scheduled flight'
  flightNumber: string
  aircraft: string
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
