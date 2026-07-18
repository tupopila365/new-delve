import { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, ShoppingBag } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ProviderAccessGate } from '../components/provider'
import {
  ProviderUiEmpty,
  ProviderUiHeader,
  ProviderUiPage,
  ProviderUiStats,
} from '../components/provider/ui'
import { ListSkeleton } from '../components/ui'
import { shopCoverSrc, shopPriceLabel } from '../utils/shopDisplay'
import type { ShopProductListing } from '../utils/shopListing'

export function ShopAdmin() {
  const { profile } = useAuth()
  const { canAccessProvider, canManageListings, isViewerOnly } = useBusinessAccess()

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
    enabled: Boolean(profile && canAccessProvider),
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

  if (!canAccessProvider) {
    return (
      <ProviderUiPage>
        <ProviderAccessGate />
      </ProviderUiPage>
    )
  }

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title="Shop"
        subtitle="List crafts, souvenirs, and travel goods travellers can pick up or message you to order."
        actions={
          <>
            <Link to="/provider/shop/orders" className="btn btn-secondary btn-sm">
              Orders
            </Link>
            {canManageListings && !isViewerOnly ? (
              <Link to="/provider/shop/new" className="btn btn-primary btn-sm">
                <Plus size={15} strokeWidth={2.25} aria-hidden />
                Add product
              </Link>
            ) : null}
          </>
        }
      />

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
          message="Add your first item so travellers can discover it on Shops and your business profile."
          action={
            canManageListings && !isViewerOnly ? { label: 'Add product', to: '/provider/shop/new' } : undefined
          }
        />
      ) : (
        <div className="adm-section">
          <div className="adm-list adm-list--cards">
            {products.map((product) => (
              <article key={product.id} className="adm-card adm-card--listing">
                <Link to={`/shop/${product.id}`} className="adm-card__media">
                  <img src={shopCoverSrc(product.cover_image, product.category)} alt="" loading="lazy" />
                </Link>
                <div className="adm-card__body">
                  <div className="adm-card__meta">
                    <span className="adm-card__chip">{product.is_active ? 'Published' : 'Draft'}</span>
                    <span className="adm-card__chip">
                      <ShoppingBag size={12} strokeWidth={2.25} aria-hidden />
                      {product.category_label || product.category}
                    </span>
                  </div>
                  <h3>{product.name}</h3>
                  <p>{product.price_label || shopPriceLabel(product.price, product.price_note)}</p>
                  {canManageListings && !isViewerOnly ? (
                    <Link to={`/provider/shop/${product.id}/edit`} className="btn btn-secondary btn-sm">
                      <Pencil size={14} strokeWidth={2.25} aria-hidden />
                      Edit
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </ProviderUiPage>
  )
}
