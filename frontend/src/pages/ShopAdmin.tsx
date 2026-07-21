import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Check, Pencil, Plus, ShoppingBag, Store } from 'lucide-react'
import { apiFetch, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ShopManageShell } from '../components/shop/ShopManageShell'
import {
  ProviderUiEmpty,
  ProviderUiHeader,
  ProviderUiStats,
} from '../components/provider/ui'
import { ListSkeleton } from '../components/ui'
import { shopCoverSrc, shopPriceLabel } from '../utils/shopDisplay'
import type { ShopProductListing } from '../utils/shopListing'

type SellerChecklistItem = {
  id: string
  label: string
  done: boolean
}

type SellerReadiness = {
  email_verified: boolean
  profile_complete: boolean
  phone_verified: boolean
  payout_details_complete: boolean
  can_publish: boolean
  can_publish_reason?: string
  can_accept_orders: boolean
  can_accept_orders_reason?: string
  can_receive_payout: boolean
  can_receive_payout_reason?: string
  active_listings: number
  max_active_listings: number
  checklist: SellerChecklistItem[]
}

type ShopProfile = {
  display_name?: string
  avatar: string | null
  region?: string
  city?: string
  fulfillment_notes?: string
  phone?: string
  phone_verified?: boolean
  phone_verified_at?: string | null
  payout_method?: string
  payout_account_name?: string
  payout_account_number?: string
  payout_details_set_at?: string | null
  readiness?: SellerReadiness
  updated_at?: string
}

const PAYOUT_METHODS = [
  { value: 'bank', label: 'Bank transfer' },
  { value: 'mobile_money', label: 'Mobile money' },
  { value: 'other', label: 'Other' },
] as const

export function ShopAdmin() {
  const { profile } = useAuth()
  const { canAccessProvider, canManageShop } = useBusinessAccess()
  const base = canAccessProvider ? '/provider/shop' : '/shop/manage'
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profileErr, setProfileErr] = useState<string | null>(null)
  const [setupMsg, setSetupMsg] = useState<string | null>(null)
  const [shopName, setShopName] = useState('')
  const [nameDirty, setNameDirty] = useState(false)
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [fulfillmentNotes, setFulfillmentNotes] = useState('')
  const [detailsDirty, setDetailsDirty] = useState(false)
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [debugCode, setDebugCode] = useState<string | null>(null)
  const [payoutMethod, setPayoutMethod] = useState('')
  const [payoutName, setPayoutName] = useState('')
  const [payoutNumber, setPayoutNumber] = useState('')
  const [payoutDirty, setPayoutDirty] = useState(false)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['provider-shop-products'],
    queryFn: async (): Promise<ShopProductListing[]> => {
      const raw = await apiFetch<unknown>('/api/shop/provider-products/', { auth: true })
      if (Array.isArray(raw)) return raw as ShopProductListing[]
      if (raw && typeof raw === 'object' && Array.isArray((raw as { results?: unknown }).results)) {
        return (raw as { results: ShopProductListing[] }).results
      }
      return []
    },
    enabled: Boolean(profile),
  })

  const { data: shopProfile } = useQuery({
    queryKey: ['shop-provider-profile'],
    enabled: Boolean(profile),
    queryFn: () => apiFetch<ShopProfile>('/api/shop/provider-profile/'),
  })

  useEffect(() => {
    if (!shopProfile) return
    if (!nameDirty) setShopName(shopProfile.display_name ?? '')
    if (!detailsDirty) {
      setRegion(shopProfile.region ?? '')
      setCity(shopProfile.city ?? '')
      setFulfillmentNotes(shopProfile.fulfillment_notes ?? '')
    }
    if (!otpSent) setPhone(shopProfile.phone ?? '')
    if (!payoutDirty) {
      setPayoutMethod(shopProfile.payout_method ?? '')
      setPayoutName(shopProfile.payout_account_name ?? '')
      setPayoutNumber(shopProfile.payout_account_number ?? '')
    }
  }, [shopProfile, nameDirty, detailsDirty, otpSent, payoutDirty])

  const invalidateShop = () => {
    void qc.invalidateQueries({ queryKey: ['shop-provider-profile'] })
    if (profile?.username) {
      void qc.invalidateQueries({ queryKey: ['shop-seller', profile.username] })
    }
  }

  const avatarMut = useMutation({
    mutationFn: async (file: File | null) => {
      const fd = new FormData()
      if (file) {
        fd.append('avatar_upload', file)
      } else {
        fd.append('clear_avatar', 'true')
      }
      return apiFetch<ShopProfile>('/api/shop/provider-profile/', { method: 'PATCH', body: fd })
    },
    onSuccess: () => {
      setProfileErr(null)
      invalidateShop()
    },
    onError: (e) => {
      setProfileErr(e instanceof ApiError ? e.message : 'Could not update photo.')
    },
  })

  const nameMut = useMutation({
    mutationFn: async (display_name: string) => {
      const fd = new FormData()
      fd.append('display_name', display_name.trim())
      return apiFetch<ShopProfile>('/api/shop/provider-profile/', { method: 'PATCH', body: fd })
    },
    onSuccess: (data) => {
      setShopName(data.display_name ?? '')
      setNameDirty(false)
      setProfileErr(null)
      invalidateShop()
    },
    onError: (e) => {
      setProfileErr(e instanceof ApiError ? e.message : 'Could not update shop name.')
    },
  })

  const detailsMut = useMutation({
    mutationFn: async () => {
      return apiFetch<ShopProfile>('/api/shop/provider-profile/', {
        method: 'PATCH',
        body: {
          display_name: shopName.trim(),
          region: region.trim(),
          city: city.trim(),
          fulfillment_notes: fulfillmentNotes.trim(),
        },
      })
    },
    onSuccess: () => {
      setDetailsDirty(false)
      setNameDirty(false)
      setSetupMsg('Shop details saved.')
      setProfileErr(null)
      invalidateShop()
    },
    onError: (e) => {
      setSetupMsg(null)
      setProfileErr(e instanceof ApiError ? e.message : 'Could not save shop details.')
    },
  })

  const requestOtpMut = useMutation({
    mutationFn: async () => {
      return apiFetch<{ detail?: string; debug_code?: string }>(
        '/api/shop/provider-profile/phone/request-otp/',
        { method: 'POST', body: { phone: phone.trim() } },
      )
    },
    onSuccess: (data) => {
      setOtpSent(true)
      setDebugCode(typeof data.debug_code === 'string' ? data.debug_code : null)
      setSetupMsg(data.detail || 'Confirmation code sent to your email.')
      setProfileErr(null)
      invalidateShop()
    },
    onError: (e) => {
      setSetupMsg(null)
      setProfileErr(e instanceof ApiError ? e.message : 'Could not send confirmation code.')
    },
  })

  const verifyOtpMut = useMutation({
    mutationFn: async () => {
      return apiFetch<ShopProfile>('/api/shop/provider-profile/phone/verify/', {
        method: 'POST',
        body: { code: otpCode.trim() },
      })
    },
    onSuccess: () => {
      setOtpSent(false)
      setOtpCode('')
      setDebugCode(null)
      setSetupMsg('Phone verified.')
      setProfileErr(null)
      invalidateShop()
    },
    onError: (e) => {
      setSetupMsg(null)
      setProfileErr(e instanceof ApiError ? e.message : 'Could not verify code.')
    },
  })

  const payoutMut = useMutation({
    mutationFn: async () => {
      return apiFetch<ShopProfile>('/api/shop/provider-profile/', {
        method: 'PATCH',
        body: {
          payout_method: payoutMethod,
          payout_account_name: payoutName.trim(),
          payout_account_number: payoutNumber.trim(),
        },
      })
    },
    onSuccess: () => {
      setPayoutDirty(false)
      setSetupMsg('Payout details saved.')
      setProfileErr(null)
      invalidateShop()
    },
    onError: (e) => {
      setSetupMsg(null)
      setProfileErr(e instanceof ApiError ? e.message : 'Could not save payout details.')
    },
  })

  const readiness = shopProfile?.readiness
  const checklist = readiness?.checklist ?? [
    { id: 'email', label: 'Email verified', done: Boolean(profile?.email_verified) },
    { id: 'profile', label: 'Shop profile complete', done: false },
    { id: 'phone', label: 'Phone verified', done: Boolean(shopProfile?.phone_verified) },
    { id: 'payout', label: 'Payout details saved', done: false },
  ]

  const stats = useMemo(() => {
    return {
      total: products.length,
      published: products.filter((p) => p.is_active).length,
      pickup: products.filter((p) => p.pickup_available).length,
      madeInNamibia: products.filter((p) => p.made_in_namibia).length,
    }
  }, [products])

  if (!profile) return <Navigate to="/login" replace />

  const storefrontHref = `/shop/seller/${encodeURIComponent(profile.username)}`
  const shownName = shopName.trim() || profile.display_name || profile.username
  const phoneVerified = Boolean(shopProfile?.phone_verified || readiness?.phone_verified)

  return (
    <ShopManageShell>
      <ProviderUiHeader
        title="Your shop"
        subtitle="List products yourself — you handle shipping or pickup. Delve holds payment until the order is complete."
        actions={
          <>
            <Link to={storefrontHref} className="shop-manage__btn shop-manage__btn--ghost btn-sm">
              View storefront
            </Link>
            <Link to={`${base}/orders`} className="shop-manage__btn shop-manage__btn--ghost btn-sm">
              Orders
            </Link>
            {canManageShop ? (
              <Link to={`${base}/new`} className="shop-manage__btn shop-manage__btn--primary btn-sm">
                <Plus size={15} strokeWidth={2.25} aria-hidden />
                Add product
              </Link>
            ) : null}
          </>
        }
      />

      <section className="shop-manage__identity">
        <button
          type="button"
          className="shop-manage__avatar-btn"
          onClick={() => canManageShop && fileRef.current?.click()}
          disabled={!canManageShop || avatarMut.isPending}
          aria-label="Change shop photo"
        >
          <span className="shop-manage__avatar" aria-hidden>
            {shopProfile?.avatar ? (
              <img src={shopProfile.avatar} alt="" />
            ) : (
              <Store size={28} strokeWidth={2} />
            )}
          </span>
          {canManageShop ? (
            <span className="shop-manage__avatar-edit">
              <Camera size={14} strokeWidth={2.25} aria-hidden />
            </span>
          ) : null}
        </button>
        <div className="shop-manage__identity-copy">
          <strong>{shownName}</strong>
          <p>Shop photo and name appear on your public storefront only.</p>
          {canManageShop ? (
            <label className="shop-manage__name-field">
              <span>Shop name</span>
              <input
                value={shopName}
                onChange={(e) => {
                  setShopName(e.target.value)
                  setNameDirty(true)
                }}
                placeholder={profile.display_name || profile.username}
                maxLength={120}
              />
            </label>
          ) : null}
          {canManageShop ? (
            <div className="shop-manage__identity-actions">
              {nameDirty ? (
                <button
                  type="button"
                  className="shop-manage__btn shop-manage__btn--primary btn-sm"
                  onClick={() => nameMut.mutate(shopName)}
                  disabled={nameMut.isPending}
                >
                  {nameMut.isPending ? 'Saving…' : 'Save name'}
                </button>
              ) : null}
              {shopProfile?.avatar ? (
                <button
                  type="button"
                  className="shop-manage__link-btn"
                  onClick={() => avatarMut.mutate(null)}
                  disabled={avatarMut.isPending}
                >
                  Remove photo
                </button>
              ) : null}
            </div>
          ) : null}
          {profileErr ? <p className="shop-manage__error">{profileErr}</p> : null}
          {setupMsg && !profileErr ? <p className="shop-manage__ok">{setupMsg}</p> : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) avatarMut.mutate(file)
          }}
        />
      </section>

      {canManageShop ? (
        <section className="shop-manage__setup" aria-labelledby="shop-setup-heading">
          <div className="shop-manage__setup-head">
            <h2 id="shop-setup-heading">Seller setup</h2>
            <p>
              No ID documents. Verify email and finish your shop profile to publish. Verify phone to accept paid
              orders. Add payout details before funds can be released.
            </p>
            {readiness ? (
              <p className="shop-manage__setup-cap">
                Published listings: {readiness.active_listings} / {readiness.max_active_listings}
              </p>
            ) : null}
          </div>

          <ul className="shop-manage__checklist">
            {checklist.map((item) => (
              <li
                key={item.id}
                className={`shop-manage__check${item.done ? ' shop-manage__check--done' : ''}`}
              >
                <span className="shop-manage__check-mark" aria-hidden>
                  {item.done ? <Check size={14} strokeWidth={2.5} /> : null}
                </span>
                <span>{item.label}</span>
                {item.id === 'email' && !item.done ? (
                  <Link to="/verify-email" className="shop-manage__check-link">
                    Verify
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>

          {!readiness?.can_publish && readiness?.can_publish_reason ? (
            <p className="shop-manage__setup-hint">{readiness.can_publish_reason}</p>
          ) : null}
          {readiness?.can_publish && !readiness.can_accept_orders && readiness.can_accept_orders_reason ? (
            <p className="shop-manage__setup-hint">{readiness.can_accept_orders_reason}</p>
          ) : null}

          <div className="shop-manage__setup-grid">
            <label className="shop-manage__name-field">
              <span>Region</span>
              <input
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value)
                  setDetailsDirty(true)
                }}
                placeholder="e.g. Khomas"
                maxLength={120}
              />
            </label>
            <label className="shop-manage__name-field">
              <span>City</span>
              <input
                value={city}
                onChange={(e) => {
                  setCity(e.target.value)
                  setDetailsDirty(true)
                }}
                placeholder="e.g. Windhoek"
                maxLength={120}
              />
            </label>
          </div>
          <label className="shop-manage__name-field">
            <span>How buyers get their items</span>
            <textarea
              className="shop-manage__textarea"
              value={fulfillmentNotes}
              onChange={(e) => {
                setFulfillmentNotes(e.target.value)
                setDetailsDirty(true)
              }}
              placeholder="Pickup spot, shipping areas, lodge drop-off, etc."
              maxLength={400}
              rows={3}
            />
          </label>
          {detailsDirty || nameDirty ? (
            <button
              type="button"
              className="shop-manage__btn shop-manage__btn--primary btn-sm"
              onClick={() => detailsMut.mutate()}
              disabled={detailsMut.isPending}
            >
              {detailsMut.isPending ? 'Saving…' : 'Save shop details'}
            </button>
          ) : null}

          <div className="shop-manage__setup-block">
            <h3>Phone</h3>
            <p className="shop-manage__setup-block-sub">
              {phoneVerified
                ? 'Verified — you can accept paid orders.'
                : 'Required before buyers can pay for your products.'}
            </p>
            <label className="shop-manage__name-field">
              <span>Phone number</span>
              <input
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  setOtpSent(false)
                }}
                placeholder="+264…"
                maxLength={40}
                disabled={phoneVerified && !otpSent}
              />
            </label>
            {!phoneVerified || otpSent ? (
              <div className="shop-manage__identity-actions">
                <button
                  type="button"
                  className="shop-manage__btn shop-manage__btn--ghost btn-sm"
                  onClick={() => requestOtpMut.mutate()}
                  disabled={requestOtpMut.isPending || phone.trim().length < 7}
                >
                  {requestOtpMut.isPending ? 'Sending…' : otpSent ? 'Resend code' : 'Send code'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="shop-manage__link-btn"
                onClick={() => {
                  setOtpSent(false)
                  setPhone(shopProfile?.phone ?? '')
                }}
              >
                Change phone
              </button>
            )}
            {otpSent ? (
              <>
                <label className="shop-manage__name-field">
                  <span>Confirmation code</span>
                  <input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="6-digit code"
                    maxLength={8}
                    inputMode="numeric"
                  />
                </label>
                {debugCode ? (
                  <p className="shop-manage__setup-hint">Debug code: {debugCode}</p>
                ) : null}
                <button
                  type="button"
                  className="shop-manage__btn shop-manage__btn--primary btn-sm"
                  onClick={() => verifyOtpMut.mutate()}
                  disabled={verifyOtpMut.isPending || !otpCode.trim()}
                >
                  {verifyOtpMut.isPending ? 'Verifying…' : 'Confirm phone'}
                </button>
              </>
            ) : null}
          </div>

          <div className="shop-manage__setup-block">
            <h3>Payout</h3>
            <p className="shop-manage__setup-block-sub">
              {readiness?.can_receive_payout
                ? 'Details saved — funds can be released after fulfillment.'
                : 'Required before Delve can release held payment to you.'}
            </p>
            <label className="shop-manage__name-field">
              <span>Method</span>
              <select
                value={payoutMethod}
                onChange={(e) => {
                  setPayoutMethod(e.target.value)
                  setPayoutDirty(true)
                }}
              >
                <option value="">Select…</option>
                {PAYOUT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="shop-manage__name-field">
              <span>Account name</span>
              <input
                value={payoutName}
                onChange={(e) => {
                  setPayoutName(e.target.value)
                  setPayoutDirty(true)
                }}
                maxLength={160}
              />
            </label>
            <label className="shop-manage__name-field">
              <span>Account number</span>
              <input
                value={payoutNumber}
                onChange={(e) => {
                  setPayoutNumber(e.target.value)
                  setPayoutDirty(true)
                }}
                maxLength={80}
              />
            </label>
            {payoutDirty ? (
              <button
                type="button"
                className="shop-manage__btn shop-manage__btn--primary btn-sm"
                onClick={() => payoutMut.mutate()}
                disabled={payoutMut.isPending}
              >
                {payoutMut.isPending ? 'Saving…' : 'Save payout details'}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <ProviderUiStats
        stats={[
          { value: stats.total, label: 'Products' },
          { value: stats.published, label: 'Published' },
          { value: stats.pickup, label: 'Pickup' },
          { value: stats.madeInNamibia, label: 'Made in Namibia' },
        ]}
        columns={4}
      />

      {isLoading ? (
        <ListSkeleton count={4} variant="row" />
      ) : products.length === 0 ? (
        <ProviderUiEmpty
          title="No products yet"
          message="Add your first item so travellers can discover it on Shops."
          action={canManageShop ? { label: 'Add product', to: `${base}/new` } : undefined}
        />
      ) : (
        <div className="shop-manage__products">
          {products.map((product) => (
            <article key={product.id} className="shop-manage__product">
              <Link to={`/shop/${product.id}`} className="shop-manage__product-media">
                <img src={shopCoverSrc(product.cover_image, product.category)} alt="" loading="lazy" />
              </Link>
              <div className="shop-manage__product-body">
                <div className="shop-manage__product-meta">
                  <span className={`shop-manage__chip${product.is_active ? ' shop-manage__chip--solid' : ''}`}>
                    {product.is_active ? 'Published' : 'Draft'}
                  </span>
                  <span className="shop-manage__chip">
                    <ShoppingBag size={11} strokeWidth={2.25} aria-hidden />
                    {product.category_label || product.category}
                  </span>
                </div>
                <h3>{product.name}</h3>
                <p className="shop-manage__product-price">
                  {product.price_label || shopPriceLabel(product.price, product.price_note)}
                </p>
                {canManageShop ? (
                  <div className="shop-manage__product-actions">
                    <Link to={`${base}/${product.id}/edit`} className="shop-manage__btn shop-manage__btn--ghost btn-sm">
                      <Pencil size={14} strokeWidth={2.25} aria-hidden />
                      Edit
                    </Link>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </ShopManageShell>
  )
}
