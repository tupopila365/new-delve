export type TransportMode = 'rental' | 'shared'

const MODE_LABELS: Record<TransportMode, string> = {
  rental: 'Vehicle rentals',
  shared: 'Shared passenger trips',
}

const RENTAL_DOCS = [
  'Business registration',
  'Car rental operator licence',
  'Fleet / commercial insurance',
  'Fleet vehicle registration',
]

const SHARED_DOCS = [
  'Business registration',
  'Passenger service operating permit',
  'Passenger liability insurance',
  'Fleet / vehicle registration',
  'Roadworthy / safety certificates',
]

export function transportModeLabel(mode: string): string {
  return MODE_LABELS[mode as TransportMode] ?? mode
}

export function expectedTransportDocHints(modes: string[] | undefined): string[] {
  const set = new Set<string>()
  const normalized = (modes ?? []).filter((m): m is TransportMode => m === 'rental' || m === 'shared')
  if (normalized.length === 0) {
    RENTAL_DOCS.forEach((d) => set.add(d))
    SHARED_DOCS.forEach((d) => set.add(d))
    return [...set]
  }
  if (normalized.includes('rental')) RENTAL_DOCS.forEach((d) => set.add(d))
  if (normalized.includes('shared')) SHARED_DOCS.forEach((d) => set.add(d))
  return [...set]
}

export function isTransportBusiness(businessTypes: string[] | undefined): boolean {
  return (businessTypes ?? []).includes('transport')
}
