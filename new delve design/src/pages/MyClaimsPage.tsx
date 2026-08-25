import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Building2, Tag } from 'lucide-react'
import type { DealClaimDto } from '@delve/contracts'
import { fetchMyDealClaims } from '../api/dealClient'
import { getStoredAccessToken } from '../api/authClient'
import { SectionEmpty, SectionError, SkeletonCard } from '../components/SectionStates'
import { formatMoney } from '../lib/formatMoney'

type Bucket = 'active' | 'redeemed' | 'expired' | 'cancelled'

function bucketOf(claim: DealClaimDto): Bucket {
  if (claim.status === 'REDEEMED') return 'redeemed'
  if (claim.status === 'CANCELLED') return 'cancelled'
  if (claim.status === 'EXPIRED') return 'expired'
  return 'active'
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ClaimDetail({
  claim,
  onBack,
  onOpenDeal,
  onOpenBusiness,
}: {
  claim: DealClaimDto
  onBack: () => void
  onOpenDeal?: (dealId: string) => void
  onOpenBusiness?: (slug: string) => void
}) {
  const redeemed = claim.status === 'REDEEMED'
  return (
    <div className="pb-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold"
        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
      >
        <ArrowLeft size={16} />
        Back to my claims
      </button>
      <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--primary)' }}>
        {claim.discountSummarySnapshot}
      </p>
      <h1 className="font-display text-2xl font-extrabold m-0 mb-2" style={{ color: 'var(--fg)' }}>
        {claim.titleSnapshot}
      </h1>
      {claim.deal?.business && (
        <p className="text-sm m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
          {claim.deal.business.name}
        </p>
      )}
      <div className="rounded-2xl px-4 py-4 mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs m-0 mb-1" style={{ color: 'var(--fg-muted)' }}>
          Claim code
        </p>
        <p className="text-lg font-mono font-bold m-0" style={{ color: 'var(--fg)' }}>
          {claim.code}
        </p>
        <p className="text-sm font-semibold m-0 mt-3" style={{ color: redeemed ? '#0F8A52' : 'var(--fg)' }}>
          {redeemed ? 'REDEEMED ✓' : claim.status}
        </p>
        {redeemed && claim.redeemedAt && (
          <p className="text-xs m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
            Redeemed {formatWhen(claim.redeemedAt)}
          </p>
        )}
      </div>
      <dl className="m-0 text-sm space-y-2">
        <div>
          <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            Discount
          </dt>
          <dd className="m-0 font-semibold">{claim.discountSummarySnapshot}</dd>
        </div>
        {claim.originalPriceSnapshot != null && (
          <div>
            <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              Original price
            </dt>
            <dd className="m-0">{formatMoney(claim.currencySnapshot, claim.originalPriceSnapshot)}</dd>
          </div>
        )}
        {claim.dealPriceSnapshot != null && (
          <div>
            <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              Deal price
            </dt>
            <dd className="m-0">{formatMoney(claim.currencySnapshot, claim.dealPriceSnapshot)}</dd>
          </div>
        )}
        {claim.savingAmountSnapshot != null && (
          <div>
            <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              You save
            </dt>
            <dd className="m-0">{formatMoney(claim.currencySnapshot, claim.savingAmountSnapshot)}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            Currency
          </dt>
          <dd className="m-0">{claim.currencySnapshot}</dd>
        </div>
        {claim.termsSnapshot && (
          <div>
            <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              Terms
            </dt>
            <dd className="m-0">{claim.termsSnapshot}</dd>
          </div>
        )}
        {claim.eligibilitySnapshot && (
          <div>
            <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              Restrictions
            </dt>
            <dd className="m-0">{claim.eligibilitySnapshot}</dd>
          </div>
        )}
        {claim.redemptionInstructionsSnapshot && (
          <div>
            <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              Redemption instructions
            </dt>
            <dd className="m-0">{claim.redemptionInstructionsSnapshot}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            Claimed
          </dt>
          <dd className="m-0">{formatWhen(claim.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            Valid until
          </dt>
          <dd className="m-0">{formatDay(claim.expiresAt)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2 mt-4">
        {onOpenDeal && (
          <button
            type="button"
            onClick={() => onOpenDeal(claim.dealId)}
            className="rounded-xl px-3 py-2 text-sm font-semibold"
            style={{ background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            View Deal
          </button>
        )}
        {onOpenBusiness && claim.deal?.business.slug && (
          <button
            type="button"
            onClick={() => onOpenBusiness(claim.deal!.business.slug)}
            className="rounded-xl px-3 py-2 text-sm font-semibold inline-flex items-center gap-1"
            style={{ background: 'var(--surface)', color: 'var(--fg)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            <Building2 size={14} />
            View Business
          </button>
        )}
      </div>
    </div>
  )
}

export default function MyClaimsPage({
  onOpenDeal,
  onOpenBusiness,
}: {
  onOpenDeal?: (dealId: string) => void
  onOpenBusiness?: (slug: string) => void
}) {
  const signedIn = Boolean(getStoredAccessToken())
  const [claims, setClaims] = useState<DealClaimDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Bucket>('active')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!signedIn) {
      setLoading(false)
      setClaims([])
      return
    }
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const rows = await fetchMyDealClaims()
        if (!cancelled) setClaims(rows)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load claims')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [signedIn, reloadKey])

  const visible = useMemo(() => claims.filter(c => bucketOf(c) === filter), [claims, filter])
  const selected = claims.find(c => c.id === selectedId) ?? null

  if (!signedIn) {
    return (
      <SectionEmpty
        icon={<Tag size={20} />}
        title="Sign in to see claimed deals"
        body="Your claim codes and redemption history will appear here after you sign in."
      />
    )
  }

  if (selected) {
    return (
      <ClaimDetail
        claim={selected}
        onBack={() => setSelectedId(null)}
        onOpenDeal={onOpenDeal}
        onOpenBusiness={onOpenBusiness}
      />
    )
  }

  return (
    <div>
      <h2 className="font-display text-lg font-extrabold m-0 mb-3" style={{ color: 'var(--fg)' }}>
        My claims
      </h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {(['active', 'redeemed', 'expired', 'cancelled'] as const).map(id => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold capitalize"
            style={{
              background: filter === id ? 'var(--primary)' : 'var(--surface)',
              color: filter === id ? '#fff' : 'var(--fg)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            {id}
          </button>
        ))}
      </div>
      {loading ? (
        <SkeletonCard />
      ) : error ? (
        <SectionError onRetry={() => setReloadKey(k => k + 1)} />
      ) : visible.length === 0 ? (
        <SectionEmpty
          icon={<Tag size={20} />}
          title={filter === 'active' ? 'No active claims' : `No ${filter} claims`}
          body="Claim a live deal from Discover, then show the code at the business to redeem."
        />
      ) : (
        <ul className="m-0 p-0 list-none space-y-2">
          {visible.map(claim => (
            <li key={claim.id}>
              <button
                type="button"
                onClick={() => setSelectedId(claim.id)}
                className="w-full text-left rounded-2xl px-4 py-3"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                <p className="text-xs font-semibold m-0 mb-1 inline-flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                  <Tag size={12} />
                  {claim.discountSummarySnapshot}
                </p>
                <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
                  {claim.titleSnapshot}
                </p>
                <p className="text-xs m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
                  {claim.deal?.business.name ?? 'Business'}
                </p>
                <p className="text-xs font-mono m-0 mt-2">Claim code: {claim.code}</p>
                <p className="text-xs m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
                  Valid until: {formatDay(claim.expiresAt)}
                </p>
                <p className="text-xs font-semibold m-0 mt-1">
                  STATUS: {claim.status === 'REDEEMED' ? 'REDEEMED ✓' : claim.status === 'PENDING' || claim.status === 'CONFIRMED' ? 'CLAIMED' : claim.status}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
