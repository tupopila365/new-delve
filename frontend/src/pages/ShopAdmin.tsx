import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Pencil, Plus, ShoppingBag, Store } from 'lucide-react'
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

type ShopProfile = {
  display_name?: string
  avatar: string | null
  updated_at?: string
}

export function ShopAdmin() {
  const { profile } = useAuth()
  const { canAccessProvider, canManageShop } = useBusinessAccess()
  const base = canAccessProvider ? '/provider/shop' : '/shop/manage'
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profileErr, setProfileErr] = useState<string | null>(null)
  const [shopName, setShopName] = useState('')
  const [nameDirty, setNameDirty] = useState(false)

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
    if (!shopProfile || nameDirty) return
    setShopName(shopProfile.display_name ?? '')
  }, [shopProfile, nameDirty])

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
      void qc.invalidateQueries({ queryKey: ['shop-provider-profile'] })
      if (profile?.username) {
        void qc.invalidateQueries({ queryKey: ['shop-seller', profile.username] })
      }
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
      void qc.invalidateQueries({ queryKey: ['shop-provider-profile'] })
      if (profile?.username) {
        void qc.invalidateQueries({ queryKey: ['shop-seller', profile.username] })
      }
    },
    onError: (e) => {
      setProfileErr(e instanceof ApiError ? e.message : 'Could not update shop name.')
    },
  })

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
