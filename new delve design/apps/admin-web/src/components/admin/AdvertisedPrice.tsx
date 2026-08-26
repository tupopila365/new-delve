import { Money } from './Money'

export function AdvertisedPrice({ pricing }: { pricing: { amount: string; currency: string } | null }) {
  if (!pricing) return <span>No advertised price</span>
  return <Money currency={pricing.currency} amount={pricing.amount} />
}
