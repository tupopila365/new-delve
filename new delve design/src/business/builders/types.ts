export type BuilderMode = 'create' | 'edit' | 'duplicate'
export type AutosaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'offline' | 'error'
export type PublicationStatus =
  | 'draft'
  | 'ready_for_review'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'paused'
  | 'suspended'
  | 'archived'
  | 'scheduled'

export type ListingCategory =
  | 'accommodation'
  | 'restaurant'
  | 'activity'
  | 'event'
  | 'shop'
  | 'local_service'
  | 'transport_service'
  | 'other'

export type TransportModeFamily = 'road' | 'air' | 'water'

export type TransportType =
  | 'car_rental'
  | 'independent_rental'
  | 'community_ride'
  | 'private_driver'
  | 'taxi'
  | 'bus'
  | 'minibus'
  | 'shuttle'
  | 'airport_transfer'
  | 'scheduled_flight'
  | 'regional_flight'
  | 'charter_flight'
  | 'air_taxi'
  | 'helicopter'
  | 'ferry'
  | 'water_taxi'
  | 'passenger_boat'
  | 'boat_transfer'
  | 'private_charter'

export type DealType =
  | 'percentage'
  | 'fixed'
  | 'special_price'
  | 'package'
  | 'early_booking'
  | 'last_minute'
  | 'group'
  | 'multi_night'
  | 'local'
  | 'member'
  | 'promo_code'
  | 'limited_inventory'

export interface BuilderStep {
  id: string
  label: string
  optional?: boolean
}

export interface ValidationItem {
  id: string
  stepId: string
  message: string
  severity: 'error' | 'warning' | 'info'
  field?: string
}

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
  required?: boolean
}

export type BuilderKind = 'listing' | 'deal' | 'transport'

export interface OpenBuilderRequest {
  kind: BuilderKind
  mode?: BuilderMode
  entityId?: string
  /** For transport: start on asset | route | schedule */
  transportFocus?: 'asset' | 'route' | 'schedule'
}
