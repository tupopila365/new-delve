import { useQuery } from '@tanstack/react-query'
import { Ban, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react'
import { apiFetch } from '../../api/client'
import './seller-trust-badges.css'

export type SellerTrustBadge = {
  id: string
  label: string
  variant?: 'default' | 'success' | 'urgency'
}

export type SellerTrustSnapshot = {
  seller_user_id: number
  seller_username: string
  business_id: number | null
  business_name: string
  business_verified: boolean
  verification_status: string
  fulfillment_completed: number
  fulfillment_total: number
  fulfillment_rate: number | null
  disputes_total: number
  dispute_rate: number | null
  cancels_total?: number
  cancel_sample?: number
  cancel_rate?: number | null
  min_sample: number
  badges: SellerTrustBadge[]
}

type Props = {
  /** Prefer username when mounting on listing/product pages. */
  username?: string
  /** Prefer businessId on business profile pages. */
  businessId?: number
  className?: string
  compact?: boolean
  /** Hide badge ids already shown elsewhere (e.g. hero Verified chip). */
  omitIds?: string[]
}

function badgeIcon(id: string) {
  if (id === 'verified') return ShieldCheck
  if (id.startsWith('disputes')) return ShieldAlert
  if (id.startsWith('cancel')) return Ban
  return Sparkles
}

export function SellerTrustBadges({
  username,
  businessId,
  className = '',
  compact = false,
  omitIds = [],
}: Props) {
  const enabled = Boolean(username?.trim()) || Number.isFinite(businessId)

  const { data, isError } = useQuery({
    queryKey: ['seller-trust', username || '', businessId ?? null],
    queryFn: () => {
      if (businessId != null && Number.isFinite(businessId)) {
        return apiFetch<SellerTrustSnapshot>(`/api/accounts/businesses/${businessId}/trust/`, {
          auth: false,
        })
      }
      return apiFetch<SellerTrustSnapshot>(
        `/api/accounts/sellers/${encodeURIComponent(username!.trim())}/trust/`,
        { auth: false },
      )
    },
    enabled,
    staleTime: 60_000,
  })

  const badges = (data?.badges ?? []).filter((b) => !omitIds.includes(b.id))
  if (!enabled || isError || badges.length === 0) return null

  return (
    <div
      className={`seller-trust${compact ? ' seller-trust--compact' : ''} ${className}`.trim()}
      aria-label="Seller trust"
    >
      {badges.map((badge) => {
        const Icon = badgeIcon(badge.id)
        const variant = badge.variant || 'default'
        return (
          <span
            key={badge.id}
            className={`seller-trust__chip seller-trust__chip--${variant}`}
          >
            <Icon size={compact ? 12 : 14} strokeWidth={2.25} aria-hidden />
            {badge.label}
          </span>
        )
      })}
    </div>
  )
}
