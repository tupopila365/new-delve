/** DELVE transport providers — passenger movement only (not merchant/cargo freight). */



import type { TransportMode } from './providerOnboarding'

import type { MyBusiness } from '../hooks/useBusinessAccess'



export const PASSENGER_TRANSPORT_SCOPE = {

  title: 'Passenger transport only',

  summary:

    'List vehicle rentals, shuttles, and bus seats for people travelling. DELVE does not support merchant freight, cargo delivery, or bulk goods transport.',

  notIncluded: [

    'Merchant or business cargo runs',

    'Freight, parcels, or bulk goods',

    'Water, drinks, or goods-only delivery',

  ],

} as const



export const DEFAULT_PASSENGER_RENTAL_RULES = [

  "Valid driver's license required",

  'Passengers only — no cargo or merchant freight',

  'Return with the same fuel level',

  'No smoking in the vehicle',

]



export const DEFAULT_PASSENGER_BUS_TIPS = [

  'Arrive 20 minutes before departure with your booking reference.',

  'Have your ID ready at boarding.',

  'Seats are for passengers — not cargo or merchant deliveries.',

]



export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {

  rental: 'Vehicle rentals',

  shared: 'Shared passenger transport',

}



/** Resolve which transport modes a business operates (defaults legacy transport businesses to both). */
export function resolveTransportModes(business?: Pick<MyBusiness, 'transport_modes' | 'business_types'>): TransportMode[] {
  if (business?.transport_modes?.length) return business.transport_modes
  if (business?.business_types?.includes('transport')) {
    return ['rental', 'shared']
  }
  return []
}



export function hasRentalTransport(modes: TransportMode[]) {

  return modes.includes('rental')

}



export function hasSharedTransport(modes: TransportMode[]) {

  return modes.includes('shared')

}


