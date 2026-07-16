import type { LucideIcon } from 'lucide-react'
import { Bus, Car, Compass, Hotel, ShoppingBag, Utensils } from 'lucide-react'

export type OnboardingServiceType = 'accommodation' | 'transport' | 'food_drink' | 'guide' | 'retail_shop'

export type TransportMode = 'rental' | 'shared'

export type OnboardingStep = 'services' | 'transport_mode' | 'business' | 'documents' | 'complete'

export type ServiceOption = {
  id: OnboardingServiceType
  label: string
  description?: string
  Icon: LucideIcon
  /** Must upload documents before going live */
  requiresVerification: boolean
  /** User can opt in to verification (food & drink) */
  verificationOptional?: boolean
  dashboardRoute: string
}

export const ONBOARDING_SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: 'retail_shop',
    label: 'Shop & makers',
    description: 'Souvenirs, crafts, and travel goods — pickup-first.',
    Icon: ShoppingBag,
    requiresVerification: false,
    verificationOptional: true,
    dashboardRoute: '/provider/shop',
  },
  {
    id: 'food_drink',
    label: 'Food & drink',
    Icon: Utensils,
    requiresVerification: false,
    verificationOptional: true,
    dashboardRoute: '/provider/food',
  },
  {
    id: 'accommodation',
    label: 'Accommodation',
    Icon: Hotel,
    requiresVerification: true,
    dashboardRoute: '/provider/stays',
  },
  {
    id: 'guide',
    label: 'Guides',
    Icon: Compass,
    requiresVerification: true,
    dashboardRoute: '/provider/guides',
  },
  {
    id: 'transport',
    label: 'Transportation',
    description: 'Passenger rentals or shared trips — not merchant cargo or freight.',
    Icon: Car,
    requiresVerification: true,
    dashboardRoute: '/provider/transport',
  },
]

export type TransportModeOption = {
  id: TransportMode
  label: string
  description: string
  Icon: LucideIcon
}

export const TRANSPORT_MODE_OPTIONS: TransportModeOption[] = [
  {
    id: 'rental',
    label: 'Vehicle rentals',
    description: 'Cars, 4×4s, and vans travellers rent by the day.',
    Icon: Car,
  },
  {
    id: 'shared',
    label: 'Shared passenger transport',
    description: 'Buses, shuttles, and seat-based trips people book together.',
    Icon: Bus,
  },
]

export type VerificationDocField = {
  id: string
  label: string
  required: boolean
}

/** Business documents for car-rental operators (not traveller driver's licences). */
export const TRANSPORT_RENTAL_DOCS: VerificationDocField[] = [
  { id: 'business_registration', label: 'Business registration (company / CC)', required: true },
  { id: 'operating_permit', label: 'Car rental operator licence', required: true },
  { id: 'transport_insurance', label: 'Fleet / commercial insurance', required: true },
  { id: 'vehicle_registration', label: 'Fleet vehicle registration', required: true },
  { id: 'tourism_license', label: 'Tourism / transport operator certificate', required: false },
]

/** Business documents for shared passenger operators (buses, shuttles, seat trips). */
export const TRANSPORT_SHARED_DOCS: VerificationDocField[] = [
  { id: 'business_registration', label: 'Business registration (company / CC)', required: true },
  { id: 'operating_permit', label: 'Passenger service operating permit', required: true },
  { id: 'transport_insurance', label: 'Passenger liability insurance', required: true },
  { id: 'vehicle_registration', label: 'Fleet / vehicle registration', required: true },
  { id: 'fire_safety_cert', label: 'Roadworthy / safety certificates (fleet)', required: true },
]

export const VERIFICATION_DOCS_BY_SERVICE: Record<
  Exclude<OnboardingServiceType, 'transport'>,
  VerificationDocField[]
> = {
  accommodation: [
    { id: 'business_registration', label: 'Business registration', required: true },
    { id: 'tourism_license', label: 'Tourism / hospitality license', required: true },
    { id: 'fire_safety_cert', label: 'Fire safety certificate', required: false },
  ],
  guide: [
    { id: 'national_id', label: 'National ID / passport', required: true },
    { id: 'tour_guide_license', label: 'Tour guide license', required: true },
    { id: 'first_aid_cert', label: 'First aid certificate', required: true },
  ],
  food_drink: [
    { id: 'business_registration', label: 'Business registration', required: true },
    { id: 'food_handling_cert', label: 'Food handling certificate', required: false },
  ],
  retail_shop: [
    { id: 'business_registration', label: 'Business registration', required: true },
    { id: 'tourism_license', label: 'Tourism / retail licence', required: false },
  ],
}

export const ONBOARDING_STEPS: { id: OnboardingStep; label: string }[] = [
  { id: 'services', label: 'Services' },
  { id: 'transport_mode', label: 'Transport' },
  { id: 'business', label: 'Business' },
  { id: 'documents', label: 'Verify' },
  { id: 'complete', label: 'Done' },
]

const MANDATORY_VERIFY: OnboardingServiceType[] = ['accommodation', 'transport', 'guide']

export function onboardingStepsFor(services: OnboardingServiceType[]) {
  const steps: { id: OnboardingStep; label: string }[] = [{ id: 'services', label: 'Services' }]
  if (services.includes('transport')) {
    steps.push({ id: 'transport_mode', label: 'Transport' })
  }
  steps.push(
    { id: 'business', label: 'Business' },
    { id: 'documents', label: 'Verify' },
    { id: 'complete', label: 'Done' },
  )
  return steps
}

export function docsForServices(
  services: OnboardingServiceType[],
  opts?: { includeFoodVerification?: boolean; transportModes?: TransportMode[] },
): VerificationDocField[] {
  const seen = new Set<string>()
  const docs: VerificationDocField[] = []

  function addFields(fields: VerificationDocField[]) {
    for (const field of fields) {
      if (!seen.has(field.id)) {
        seen.add(field.id)
        docs.push(field)
      }
    }
  }

  for (const svc of services) {
    if (svc === 'food_drink' && !opts?.includeFoodVerification) continue
    if (svc === 'transport') {
      const modes = opts?.transportModes ?? []
      if (modes.includes('rental')) addFields(TRANSPORT_RENTAL_DOCS)
      if (modes.includes('shared')) addFields(TRANSPORT_SHARED_DOCS)
      continue
    }
    addFields(VERIFICATION_DOCS_BY_SERVICE[svc])
  }
  return docs
}

export function hasMandatoryVerification(services: OnboardingServiceType[]): boolean {
  return services.some((id) => MANDATORY_VERIFY.includes(id))
}

export function servicesRequiringVerification(services: OnboardingServiceType[]): OnboardingServiceType[] {
  return services.filter((id) => MANDATORY_VERIFY.includes(id))
}

export function dashboardModulesForServices(services: OnboardingServiceType[]) {
  return ONBOARDING_SERVICE_OPTIONS.filter((o) => services.includes(o.id))
}

export function needsDocumentStep(
  services: OnboardingServiceType[],
  verifyFood: boolean,
): boolean {
  return hasMandatoryVerification(services) || (services.includes('food_drink') && verifyFood)
}
